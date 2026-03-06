import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/assets/status?assetId=xxx
 * 查询单个资产的处理状态（前端轮询用）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId as string;
    const assetId = request.nextUrl.searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    const asset = await db.asset.findFirst({
      where: { id: assetId, tenantId },
      select: {
        id: true,
        status: true,
        metadata: true,
        _count: { select: { chunks: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const meta = (asset.metadata ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      id: asset.id,
      status: asset.status,
      processingStatus: meta.processingStatus ?? "pending",
      chunkCount: (meta.chunkCount as number) ?? asset._count.chunks,
      processedAt: meta.processedAt ?? null,
      skipReason: meta.skipReason ?? null,
      processingError: meta.processingError ?? null,
    });
  } catch (err) {
    console.error("[/api/assets/status]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
