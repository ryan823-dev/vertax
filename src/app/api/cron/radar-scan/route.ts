/**
 * Cron: 闆疯揪鎸佺画鎵弿
 * 
 * 姣?5 鍒嗛挓鎵ц涓€娆★紝鏌ヨ鍒版湡鐨?RadarSearchProfile锛? * 閫氳繃涔愯閿佷簤鎶㈠悗鎵ц澧為噺鎵弿銆? * 
 * 閰嶇疆 vercel.json cron: every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { runScheduledScans } from '@/lib/radar/scan-scheduler';

export async function GET(req: NextRequest) {
  // 楠岃瘉 cron secret
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const result = await runScheduledScans();

    console.log(
      `[radar-scan] Processed ${result.profilesProcessed} profiles, ` +
      `new: ${result.totalNew}, dup: ${result.totalDuplicates}, ` +
      `duration: ${result.totalDuration}ms`
    );

    return NextResponse.json({
      ok: true,
      profilesProcessed: result.profilesProcessed,
      totalNew: result.totalNew,
      totalDuplicates: result.totalDuplicates,
      totalDuration: result.totalDuration,
      profiles: result.profiles.map(p => ({
        name: p.name,
        sources: p.sources.map(s => ({
          code: s.sourceCode,
          created: s.result.created,
          duplicates: s.result.duplicates,
          exhausted: s.result.exhausted,
        })),
        error: p.error,
      })),
      errors: result.errors,
    });
  } catch (error) {
    console.error('[radar-scan] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

