import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * 保存浏览器端处理后的文本和分块
 * POST /api/assets/process-text
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId, text, chunks, processor } = await req.json();

    if (!assetId || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 验证资产所有权
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        tenantId: session.user.tenantId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // 删除旧的 chunks（重新处理场景）
    await db.assetChunk.deleteMany({
      where: { assetId },
    });

    // 批量写入 chunks
    if (chunks && chunks.length > 0) {
      const CHUNK_BATCH_SIZE = 100;
      for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
        const batch = chunks.slice(i, i + CHUNK_BATCH_SIZE);
        await db.assetChunk.createMany({
          data: batch.map((chunk: any) => ({
            tenantId: session.user.tenantId,
            assetId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            charStart: chunk.charStart,
            charEnd: chunk.charEnd,
            tokenCount: chunk.tokenCount,
          })),
        });
      }
    }

    // 更新资产状态
    const completedAt = new Date().toISOString();
    await db.asset.update({
      where: { id: assetId },
      data: {
        metadata: {
          processingStatus: "ready",
          chunkCount: chunks?.length || 0,
          processedAt: completedAt,
          textLength: text.length,
          processor,
        },
      },
    });

    return NextResponse.json({
      success: true,
      assetId,
      chunkCount: chunks?.length || 0,
      textLength: text.length,
    });
  } catch (error) {
    console.error("[process-text] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}