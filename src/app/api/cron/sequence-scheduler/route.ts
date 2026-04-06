import { NextRequest, NextResponse } from "next/server";
import { processScheduledEmails } from "@/lib/outreach/email-sequence";

// ==================== 序列调度 Cron ====================

/**
 * GET /api/cron/sequence-scheduler
 *
 * 处理待发送的序列邮件
 * 应配置为每5-15分钟执行一次
 */
export async function GET(request: NextRequest) {
  // 验证 cron secret（防止未授权访问）
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // 安全修复：如果 CRON_SECRET 未设置或不匹配，都拒绝访问
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();

    // 处理序列邮件
    const result = await processScheduledEmails();

    const duration = Date.now() - startTime;

    console.log(`[SequenceScheduler] Processed: ${result.processed}, Sent: ${result.sent}, Errors: ${result.errors}, Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      errors: result.errors,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SequenceScheduler] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
