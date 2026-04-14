import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { processAssetTaskDirectly } from "@/lib/asset-processor";

export const maxDuration = 300; // 5 minutes per batch

/**
 * Asset Processing Background Worker
 *
 * 鍚庡彴澶勭悊璧勪骇鏂囨湰鎻愬彇鍜屽垎鍧椾换鍔? * 鐢?Vercel Cron 瀹氭椂璋冪敤锛氭瘡鍒嗛挓鎵ц涓€娆? *
 * 閲嶈锛歏ercel Cron Jobs 鍙彂閫?GET 璇锋眰锛屽繀椤诲鍑?GET handler
 */
export async function GET(req: NextRequest) {
  // 楠岃瘉 cron secret
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    // Find pending tasks
    const tasks = await db.assetProcessQueue.findMany({
      where: {
        status: { in: ["pending", "extracting", "chunking"] },
      },
      orderBy: [
        { createdAt: "asc" }, // Process oldest first
      ],
      take: 5, // Process up to 5 assets per run
    });

    if (tasks.length === 0) {
      return NextResponse.json({
        message: "No pending asset processing tasks",
        processed: 0,
      });
    }

    let totalProcessed = 0;
    const results: Array<{ taskId: string; status: string; error?: string }> = [];

    for (const task of tasks) {
      const result = await processAssetTaskDirectly(task.id);
      results.push({
        taskId: result.taskId,
        status: result.success ? "completed" : "failed",
        error: result.error,
      });
      if (result.success) {
        totalProcessed++;
      }
    }

    return NextResponse.json({
      message: `Processed ${totalProcessed} assets`,
      tasks: results,
      totalProcessed,
    });
  } catch (err) {
    console.error("[asset-process] Critical error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Critical error"
    }, { status: 500 });
  }
}

