import { NextResponse } from "next/server";
import { generateHealthReport } from "@/lib/radar/health-monitor";

export const dynamic = "force-dynamic";

/**
 * GET /api/radar/health
 *
 * 获取获客雷达健康状态
 */
export async function GET() {
  try {
    const report = await generateHealthReport();

    return NextResponse.json({
      ok: true,
      ...report,
    });
  } catch (error) {
    console.error("[RadarHealth] Error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
