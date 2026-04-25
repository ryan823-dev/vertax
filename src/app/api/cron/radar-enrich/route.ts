/**
 * Cron: 闆疯揪璇︽儏琛ュ叏 & 鎯呮姤涓板瘜鍖?
 * 
 * 姣?6 灏忔椂鎵ц涓€娆?(vercel.json: 0 *\/6 * * *)
 * 瀵?status=ENRICHING 鐨勫€欓€夎繘琛屾繁搴︿赴瀵屻€? * 
 * 2026-04-01 澧炲己锛? * - 缁撳悎鍘熷閫傞厤鍣?getDetails() 涓庨€氱敤鐨?Intelligence Enricher
 * - 寮曞叆鍏紑璇佹嵁 fallback 涓庤仈绯绘柟寮忚ˉ鍏?
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from '@/lib/prisma';
import { getAdapter, ensureAdaptersInitialized } from '@/lib/radar/adapters';
import { enrichWithSignalScore } from '@/lib/radar/intelligence-enricher';

const MAX_RUN_SECONDS = 55; // Vercel Hobby max is 60s, leave buffer
const MAX_BATCH_SIZE = 10;  // 娣卞害涓板瘜鑰楁椂杈冮暱锛屽噺灏忔壒娆?
export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  ensureAdaptersInitialized();

  const stats = {
    processed: 0,
    adapterEnriched: 0,
    intelligenceEnriched: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Pull the oldest ENRICHING candidates first so stalled items keep moving.
    const candidates = await prisma.radarCandidate.findMany({
      where: { status: 'ENRICHING' },
      include: { source: true },
      take: MAX_BATCH_SIZE,
      orderBy: { updatedAt: 'asc' },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, ...stats, message: 'No ENRICHING candidates' });
    }

    for (const candidate of candidates) {
      if (Date.now() >= deadline) {
        stats.skipped++;
        continue;
      }

      console.log(`[RadarEnrich] Enriching candidate: ${candidate.displayName} (${candidate.id})`);
      
      try {
        // 1. 灏濊瘯鍘熷閫傞厤鍣ㄧ殑 getDetails (姣斿浠?Google Places 鎷跨數璇?璇︽儏)
        try {
          const adapter = getAdapter(
            candidate.source.code,
            candidate.source.adapterConfig as Record<string, unknown>
          );
          if (adapter.getDetails) {
            const details = await adapter.getDetails(candidate.externalId);
            if (details) {
              await prisma.radarCandidate.update({
                where: { id: candidate.id },
                data: {
                  phone: details.phone || candidate.phone,
                  email: details.email || candidate.email,
                  website: details.website || candidate.website,
                  address: details.address || candidate.address,
                  description: details.description || candidate.description,
                },
              });
              stats.adapterEnriched++;
            }
          }
        } catch {
          console.warn(`[RadarEnrich] Adapter getDetails failed for ${candidate.id}, continuing to intelligence enrich...`);
        }

        // 2. 娣卞害鎯呮姤涓板瘜锛氬叕寮€璇佹嵁 + OSINT checkpoint + 鍙€夌殑鍚庣画琛ュ叏
        const enrichResult = await enrichWithSignalScore(candidate.id);
        if (enrichResult.enrichment.success) {
          stats.intelligenceEnriched++;
        }

        // 3. 鏍囪涓?QUALIFIED
        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: { status: 'QUALIFIED' },
        });

        stats.processed++;
      } catch (error) {
        console.error(`[RadarEnrich] Failed to enrich candidate ${candidate.id}:`, error);
        stats.failed++;
        stats.errors.push(`${candidate.displayName}: ${error instanceof Error ? error.message : 'Unknown'}`);
        
        // 鎶ラ敊涔熻娴佽浆鐘舵€侊紝閬垮厤鍗℃
        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: { status: 'QUALIFIED' },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[radar-enrich] Fatal Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

