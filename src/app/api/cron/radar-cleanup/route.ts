/**
 * Cron: 闆疯揪娓呯悊
 * 
 * 姣忔棩鍑屾櫒 2 鐐规墽琛岋細
 * 1. 娓呯悊杩囨湡鍊欓€夛紙TTL锛? * 2. 閲婃斁姝婚攣鐨?RadarSearchProfile
 * 
 * 閰嶇疆 vercel.json cron: 0 2 * * *
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from '@/lib/prisma';
import { cleanupExpiredCandidates } from '@/lib/radar/sync-service';

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const stats = {
    expiredCandidates: 0,
    releasedLocks: 0,
    errors: [] as string[],
  };

  try {
    stats.expiredCandidates = await cleanupExpiredCandidates();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lockResult = await prisma.radarSearchProfile.updateMany({
      where: {
        lockToken: { not: null },
        lockedAt: { lt: oneHourAgo },
      },
      data: {
        lockToken: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
    stats.releasedLocks = lockResult.count;

    console.log(
      `[radar-cleanup] Expired candidates: ${stats.expiredCandidates}, ` +
      `released locks: ${stats.releasedLocks}`
    );

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[radar-cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

