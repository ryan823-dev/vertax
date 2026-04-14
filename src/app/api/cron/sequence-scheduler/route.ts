import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { processScheduledEmails } from "@/lib/outreach/email-sequence";

// ==================== 搴忓垪璋冨害 Cron ====================

/**
 * GET /api/cron/sequence-scheduler
 *
 * 澶勭悊寰呭彂閫佺殑搴忓垪閭欢
 * 搴旈厤缃负姣?-15鍒嗛挓鎵ц涓€娆? */
export async function GET(request: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const startTime = Date.now();

    // 澶勭悊搴忓垪閭欢
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
