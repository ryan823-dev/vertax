import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateStorageKey, generatePresignedPutUrl } from "@/lib/oss";
import { detectFileCategory, getFileExtension } from "@/lib/utils/file-utils";
import { extractTextFromAsset } from "@/lib/utils/text-extract";
import { splitTextIntoChunks } from "@/lib/utils/chunk-utils";
import { after } from "next/server";

// 扫描件 PDF 走 OCR（DashScope qwen-long），全流程约 22s。
// ⚠️ Vercel Hobby 计划硬性上限 10s，after() 回调会被强杀导致处理卡在 "processing"。
// 升级 Vercel Pro ($20/月) 后 maxDuration=60 才会生效。
// 升级入口：https://vercel.com/ryan-moores-projects-37ce5eff/~/settings/billing
export const maxDuration = 60;

/**
 * POST /api/assets/upload
 * 前端上传会话创建 + 确认，使用 NextAuth session 鉴权
 */

// 创建上传会话
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId as string;
    const userId = session.user.id as string;

    const body = await request.json();
    const { files, action } = body as {
      action?: string;
      files?: Array<{ originalName: string; mimeType: string; fileSize: number; folderId?: string }>;
      assetId?: string;
    };

    // 确认上传完成 + 自动触发文本处理
    if (action === "confirm") {
      const { assetId } = body as { assetId: string };
      const asset = await db.asset.update({
        where: { id: assetId, tenantId },
        data: { status: "active", metadata: { processingStatus: "processing" } },
      });

      // 用 after() 在响应发出后继续执行 OCR（最长 maxDuration=60s）
      after(async () => {
        await triggerProcessingAsync(assetId, asset.storageKey, asset.mimeType, tenantId, userId);
      });

      return NextResponse.json({ ok: true, asset: { id: asset.id, status: asset.status } });
    }

    // 创建上传会话
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const sessions = await Promise.all(
      files.map(async (file) => {
        const storageKey = generateStorageKey(tenantId, file.originalName);
        const extension = getFileExtension(file.originalName);
        const fileCategory = detectFileCategory(file.mimeType, extension);

        const asset = await db.asset.create({
          data: {
            tenantId,
            uploadedById: userId,
            folderId: file.folderId || null,
            originalName: file.originalName,
            storageKey,
            mimeType: file.mimeType,
            fileSize: BigInt(file.fileSize),
            extension,
            fileCategory,
            purpose: [],
            tags: [],
            title: file.originalName,
            status: "uploading",
          },
        });

        const presignedUrl = await generatePresignedPutUrl(
          storageKey,
          file.mimeType,
          file.fileSize
        );

        return {
          assetId: asset.id,
          presignedUrl,
          storageKey,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        };
      })
    );

    return NextResponse.json({ ok: true, sessions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/assets/upload] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 异步处理文本提取，不阻塞上传响应
async function triggerProcessingAsync(
  assetId: string,
  storageKey: string,
  mimeType: string,
  tenantId: string,
  userId: string
) {
  try {
    // 标记为处理中
    await db.asset.update({
      where: { id: assetId },
      data: { metadata: { processingStatus: "processing" } },
    });

    const text = await extractTextFromAsset(storageKey, mimeType);

    // 不支持的格式直接标记 ready（跳过知识引擎）
    if (!text || text.startsWith("[")) {
      await db.asset.update({
        where: { id: assetId },
        data: {
          metadata: {
            processingStatus: "ready",
            processedAt: new Date().toISOString(),
            chunkCount: 0,
            skipReason: text || "unsupported format",
          },
        },
      });
      return;
    }

    const chunks = splitTextIntoChunks(text);

    await db.assetChunk.deleteMany({ where: { assetId } });

    if (chunks.length > 0) {
      await db.assetChunk.createMany({
        data: chunks.map((chunk) => ({
          tenantId,
          assetId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          tokenCount: chunk.tokenCount,
        })),
      });
    }

    await db.asset.update({
      where: { id: assetId },
      data: {
        metadata: {
          processingStatus: "ready",
          processedAt: new Date().toISOString(),
          chunkCount: chunks.length,
        },
      },
    });
  } catch (err) {
    console.error("[triggerProcessingAsync] error:", err);
    await db.asset.update({
      where: { id: assetId },
      data: {
        metadata: {
          processingStatus: "failed",
          processingError: err instanceof Error ? err.message : "处理失败",
        },
      },
    }).catch(() => {});
  }
}
