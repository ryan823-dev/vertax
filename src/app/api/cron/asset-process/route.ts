import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processAssetTaskDirectly } from "@/lib/asset-processor";

export const maxDuration = 300; // 5 minutes per batch

/**
 * Asset Processing Background Worker
 *
 * 后台处理资产文本提取和分块任务
 * 由 Vercel Cron 定时调用：每分钟执行一次
 *
 * 重要：Vercel Cron Jobs 只发送 GET 请求，必须导出 GET handler
 */
export async function GET(req: NextRequest) {
  // 验证 cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
