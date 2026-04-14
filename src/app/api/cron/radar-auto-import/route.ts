/**
 * Cron: automatically import qualified A/B company candidates into Prospect.
 *
 * This bridges qualification and contact enrichment so fresh supply keeps
 * moving without manual list work.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/actions/notifications';
import { ensureCronAuthorized } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { importCandidateToProspectForTenant } from '@/lib/radar/prospect-import';

const MAX_RUN_SECONDS = 50;
const MAX_BATCH_SIZE = 80;
const CHUNK_SIZE = 8;

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  const stats = {
    processed: 0,
    imported: 0,
    queuedForEnrichment: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const candidates = await prisma.radarCandidate.findMany({
      where: {
        candidateType: 'COMPANY',
        status: 'QUALIFIED',
        qualifyTier: { in: ['A', 'B'] },
        importedAt: null,
      },
      take: MAX_BATCH_SIZE,
      orderBy: [
        { qualifyTier: 'asc' },
        { qualifiedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        ...stats,
        message: 'No qualified candidates to import',
      });
    }

    const notifyMap = new Map<string, { imported: number; queued: number }>();

    for (let index = 0; index < candidates.length; index += CHUNK_SIZE) {
      if (Date.now() >= deadline) {
        stats.skipped += candidates.length - index;
        break;
      }

      const chunk = candidates.slice(index, index + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((candidate) =>
          importCandidateToProspectForTenant(candidate.id, {
            tenantId: candidate.tenantId,
            importedBy: 'cron:auto-import',
          }),
        ),
      );

      results.forEach((result, offset) => {
        const candidate = chunk[offset];
        stats.processed++;

        if (result.status === 'fulfilled') {
          stats.imported++;
          if (result.value.queuedForEnrichment) {
            stats.queuedForEnrichment++;
          }

          const current = notifyMap.get(candidate.tenantId) || { imported: 0, queued: 0 };
          current.imported += 1;
          if (result.value.queuedForEnrichment) {
            current.queued += 1;
          }
          notifyMap.set(candidate.tenantId, current);
          return;
        }

        stats.failed++;
        stats.errors.push(
          `${candidate.id}: ${result.reason instanceof Error ? result.reason.message : 'Import failed'}`,
        );
      });
    }

    await Promise.allSettled(
      Array.from(notifyMap.entries()).map(([tenantId, value]) =>
        createNotification({
          tenantId,
          type: 'system',
          title: `Radar auto-imported ${value.imported} new prospects`,
          body:
            value.queued > 0
              ? `${value.queued} prospects were queued for contact enrichment.`
              : 'This batch is now available in the prospect workspace.',
          actionUrl: '/customer/radar/prospects',
        }).catch(() => undefined),
      ),
    );

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[radar-auto-import] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
