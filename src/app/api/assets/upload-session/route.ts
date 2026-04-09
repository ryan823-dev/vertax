import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateStorageKey, generatePresignedPutUrl } from "@/lib/oss";
import { detectFileCategory } from "@/lib/utils/file-utils";
import {
  MAX_FILE_SIZE,
  MAX_BATCH_SIZE,
  getFileSizeLimitLabel,
} from "@/lib/config/knowledge-engine";

/**
 * POST /api/assets/upload-session
 * 创建上传会话，返回 OSS 预签名 URL
 * 
 * 用于知识引擎等外部系统调用
 */
export async function POST(request: NextRequest) {
  try {
    // 验证 API Key 或 Token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    
    // 验证 token 并获取租户信息
    // 这里使用简单的 API Key 验证，后续可以改为 JWT
    const apiKey = await db.apiKey.findFirst({
      where: {
        key: token,
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const tenantId = apiKey.tenantId;

    // 解析请求体
    const body = await request.json();
    const { files } = body as {
      files: Array<{
        name: string;
        mimeType: string;
        size: number;
      }>;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // 验证文件数量限制
    if (files.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} files per request` },
        { status: 400 }
      );
    }

    // 为每个文件创建上传会话
    const sessions = await Promise.all(
      files.map(async (file) => {
        // 验证文件大小 (可配置的限制)
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File ${file.name} exceeds ${getFileSizeLimitLabel()} limit`);
        }

        // 生成存储路径
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        const storageKey = generateStorageKey(tenantId, file.name);

        // 检测文件类型
        const fileCategory = detectFileCategory(file.mimeType, extension);

        // 创建 Asset 记录（状态为 uploading）
        // 对于 API 上传，使用租户的第一个用户作为 uploadedBy
        const tenantUser = await db.user.findFirst({
          where: { tenantId },
        });

        if (!tenantUser) {
          throw new Error("No user found for tenant");
        }

        const asset = await db.asset.create({
          data: {
            tenantId,
            uploadedById: tenantUser.id,
            originalName: file.name,
            storageKey,
            mimeType: file.mimeType,
            fileSize: BigInt(file.size),
            extension,
            fileCategory,
            title: file.name.replace(/\.[^/.]+$/, ""), // 使用文件名（不含扩展名）作为标题
            status: "uploading",
            purpose: ["knowledge"], // 标记来源
          },
        });

        // 生成预签名 URL
        const uploadUrl = await generatePresignedPutUrl(
          storageKey,
          file.mimeType
        );

        return {
          assetId: asset.id,
          uploadUrl,
          storageKey,
          expiresIn: 3600, // 1 小时
        };
      })
    );

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Upload session creation failed:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
