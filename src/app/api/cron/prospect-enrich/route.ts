/**
 * Cron: enrich imported Tier A/B prospects with decision-maker contacts.
 *
 * This queue retries failures after a cooling period and rechecks empty
 * results later so the pipeline can keep filling contact gaps over time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/actions/notifications';
import { ensureCronAuthorized } from '@/lib/cron-auth';
import { db } from '@/lib/db';
import { enrichProspectCompany } from '@/lib/radar/enrich-pipeline';

const MAX_BATCH_SIZE = 18;
const MAX_RUN_SECONDS = 50;
const CONCURRENCY = 3;
const FAILED_RETRY_HOURS = 6;
const EMPTY_RETRY_HOURS = 24;

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  const stats = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const failedRetryAt = new Date(Date.now() - FAILED_RETRY_HOURS * 60 * 60 * 1000);
    const emptyRetryAt = new Date(Date.now() - EMPTY_RETRY_HOURS * 60 * 60 * 1000);

    const prospects = await db.prospectCompany.findMany({
      where: {
        deletedAt: null,
        tier: { in: ['A', 'B'] },
        contacts: {
          none: { deletedAt: null },
        },
        OR: [
          { enrichmentStatus: null },
          { enrichmentStatus: 'PENDING' },
          {
            enrichmentStatus: 'FAILED',
            OR: [
              { lastEnrichedAt: null },
              { lastEnrichedAt: { lte: failedRetryAt } },
            ],
          },
          {
            enrichmentStatus: 'COMPLETED',
            OR: [
              { lastEnrichedAt: null },
              { lastEnrichedAt: { lte: emptyRetryAt } },
            ],
          },
        ],
      },
      take: MAX_BATCH_SIZE,
      orderBy: [
        { tier: 'asc' },
        { lastEnrichedAt: { sort: 'asc', nulls: 'first' } as { sort: 'asc'; nulls: 'first' } },
      ],
    });

    if (prospects.length === 0) {
      return NextResponse.json({ ok: true, message: 'No prospects to enrich' });
    }

    for (let index = 0; index < prospects.length; index += CONCURRENCY) {
      if (Date.now() >= deadline) {
        stats.skipped += prospects.length - index;
        break;
      }

      const chunk = prospects.slice(index, index + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map(async (company) => {
          console.log(`[ProspectEnrich] Enriching: ${company.name} (${company.id})`);
          const result = await enrichProspectCompany(company.id);
          return { company, result };
        }),
      );

      for (const settled of results) {
        stats.processed++;

        if (settled.status === 'fulfilled') {
          const { company, result } = settled.value;
          if (result.success) {
            stats.success++;

            if (result.personCount && result.personCount > 0) {
              await createNotification({
                tenantId: company.tenantId,
                type: 'tier_a_lead',
                title: `线索已富化：${company.name}`,
                body: `AI found ${result.personCount} new decision-maker contacts for ${company.name}.`,
                actionUrl: `/customer/radar/prospects?id=${company.id}`,
              }).catch(() => undefined);
            }
          } else {
            stats.failed++;
            stats.errors.push(`${company.name}: ${result.error}`);
          }
        } else {
          stats.failed++;
          stats.errors.push(
            settled.reason instanceof Error ? settled.reason.message : 'Unknown enrichment error',
          );
        }
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error('[prospect-enrich] Fatal Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
