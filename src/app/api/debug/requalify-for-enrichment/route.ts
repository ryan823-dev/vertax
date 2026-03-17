import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdapterRegistration, ensureAdaptersInitialized } from '@/lib/radar/adapters';

export const maxDuration = 60;

/**
 * 重新评估QUALIFIED候选，将缺数据的放入ENRICHING
 * GET /api/debug/requalify-for-enrichment?secret=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  ensureAdaptersInitialized();

  try {
    // 查找所有QUALIFIED但缺website和phone的候选
    const candidates = await prisma.radarCandidate.findMany({
      where: {
        status: 'QUALIFIED',
        website: null,
        phone: null,
      },
      include: { source: true },
    });

    let enrichingCount = 0;
    let skippedCount = 0;

    for (const candidate of candidates) {
      const adapterReg = getAdapterRegistration(candidate.source.code);
      const supportsDetails = adapterReg?.features?.supportsDetails ?? false;

      if (supportsDetails && candidate.source.storagePolicy !== 'ID_ONLY') {
        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: {
            status: 'ENRICHING',
            qualifyReason: `${candidate.qualifyReason || ''} (moved to enrichment)`,
          },
        });
        enrichingCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalCandidates: candidates.length,
      movedToEnriching: enrichingCount,
      skipped: skippedCount,
      message: `${enrichingCount} 个候选已进入ENRICHING队列`,
    });
  } catch (error) {
    console.error('[requalify-for-enrichment] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
