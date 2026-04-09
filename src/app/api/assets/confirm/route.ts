import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getObjectInfo } from "@/lib/oss";

/**
 * POST /api/assets/confirm
 * 确认上传完成，更新资产状态
 */
export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    
    const apiKey = await db.apiKey.findFirst({
      where: {
        key: token,
        isActive: true,
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
    const { assetId, metadata } = body as {
      assetId: string;
      metadata?: Record<string, unknown>;
    };

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    // 查找 asset
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        tenantId,
        status: "uploading",
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found or already confirmed" },
        { status: 404 }
      );
    }

    // 验证文件是否已上传到 OSS
    const ossMetadata = await getObjectInfo(asset.storageKey);
    if (!ossMetadata) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 400 }
      );
    }

    // 更新 asset 状态
    const updatedAsset = await db.asset.update({
      where: { id: assetId },
      data: {
        status: "active",
        fileSize: BigInt(ossMetadata.contentLength),
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: updatedAsset.id,
        originalName: updatedAsset.originalName,
        storageKey: updatedAsset.storageKey,
        mimeType: updatedAsset.mimeType,
        fileSize: Number(updatedAsset.fileSize),
        fileCategory: updatedAsset.fileCategory,
        status: updatedAsset.status,
        createdAt: updatedAsset.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Upload confirmation failed:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
