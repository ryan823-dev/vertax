/**
 * Cron: 鎺ㄩ€佽秴鏃舵鏌? *
 * 姣忓皬鏃舵墽琛屼竴娆★紝灏?status=PENDING 涓斿凡杩?timeoutAt 鐨?PushRecord 鏍囪涓?TIMEOUT銆? */

import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const now = new Date();

    const result = await prisma.pushRecord.updateMany({
      where: {
        status: "PENDING",
        timeoutAt: { lt: now },
      },
      data: { status: "TIMEOUT" },
    });

    console.log(`[push-timeout] Marked ${result.count} records as TIMEOUT`);
    return NextResponse.json({ processed: result.count });
  } catch (error) {
    console.error("[push-timeout] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

