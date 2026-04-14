/**
 * Cron: persist daily radar metrics/workspace snapshots for each active tenant.
 *
 * The same day row is refreshed on each run so trend charts stay stable while
 * ranking and feedback learning remain auditable over time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import {
  getCurrentRadarDayKey,
  persistRadarDailySnapshotForTenant,
} from '@/lib/radar/daily-workspace';

const MAX_RUN_SECONDS = 50;
const CRON_NAME = 'radar-daily-snapshot';

export const runtime = 'nodejs';
export const maxDuration = 60;

function logCronEvent(event: string, payload: Record<string, unknown>) {
  console.info(`[${CRON_NAME}] ${JSON.stringify({ event, ...payload })}`);
}

async function createCronNotification(params: {
  tenantId: string;
  title: string;
  body: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        type: 'system',
        title: params.title,
        body: params.body,
        actionUrl: '/customer/radar/daily',
      },
    });
  } catch (error) {
    console.warn(`[${CRON_NAME}] notification_failed`, error);
  }
}

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const runId = `rds_${Date.now()}`;
  const startedAt = new Date();
  const dayKey = getCurrentRadarDayKey();
  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  const stats = {
    runId,
    dayKey,
    startedAt: startedAt.toISOString(),
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    logCronEvent('started', {
      runId,
      dayKey,
      maxRunSeconds: MAX_RUN_SECONDS,
    });

    const tenants = await prisma.tenant.findMany({
      where: {
        status: 'active',
        deletedAt: null,
      },
      select: { id: true, slug: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const tenantResults: Array<Record<string, unknown>> = [];

    for (const tenant of tenants) {
      if (Date.now() >= deadline) {
        stats.skipped += 1;
        const skippedResult = {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          status: 'skipped',
          reason: 'deadline_exceeded',
        };
        tenantResults.push(skippedResult);
        logCronEvent('tenant_skipped', {
          runId,
          dayKey,
          ...skippedResult,
        });
        await createCronNotification({
          tenantId: tenant.id,
          title: 'Daily radar snapshot delayed',
          body: `Daily radar snapshot for ${dayKey} was skipped because the cron run reached its time budget.`,
        });
        continue;
      }

      stats.processed += 1;
      const tenantStartedAt = Date.now();

      try {
        const result = await persistRadarDailySnapshotForTenant(tenant.id, dayKey);
        stats.succeeded += 1;
        const tenantResult = {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          status: 'succeeded',
          durationMs: Date.now() - tenantStartedAt,
          rawCandidates: result.metrics.rawCandidates,
          importedProspects: result.metrics.importedProspects,
          readyNowCount: result.workspaceSummary.readyNowCount,
        };
        tenantResults.push(tenantResult);
        logCronEvent('tenant_succeeded', {
          runId,
          dayKey,
          ...tenantResult,
        });
      } catch (error) {
        stats.failed += 1;
        const message = error instanceof Error ? error.message : 'Snapshot failed';
        const tenantResult = {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          status: 'failed',
          durationMs: Date.now() - tenantStartedAt,
          error: message,
        };
        tenantResults.push(tenantResult);
        stats.errors.push(`${tenant.slug}: ${message}`);
        logCronEvent('tenant_failed', {
          runId,
          dayKey,
          ...tenantResult,
        });
        await createCronNotification({
          tenantId: tenant.id,
          title: 'Daily radar snapshot failed',
          body: `Daily radar snapshot for ${dayKey} failed: ${message}`,
        });
      }
    }

    const completedAt = new Date();
    const response = {
      ok: true,
      ...stats,
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      tenantResults,
    };

    logCronEvent('completed', response);
    return NextResponse.json(response);
  } catch (error) {
    logCronEvent('fatal', {
      runId,
      dayKey,
      message: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
