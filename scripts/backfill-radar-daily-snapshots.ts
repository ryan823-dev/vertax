import 'dotenv/config';

import { prisma } from '../src/lib/prisma';
import {
  buildRadarDayKeyRange,
  getCurrentRadarDayKey,
  persistRadarDailyMetricsSnapshotForTenant,
  persistRadarDailySnapshotForTenant,
} from '../src/lib/radar/daily-workspace';

type Options = {
  tenantSlugs: string[];
  fromDayKey?: string;
  toDayKey?: string;
  days?: number;
  includeTodayFull: boolean;
  dryRun: boolean;
};

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatDayKey(date: Date) {
  return dayKeyFormatter.format(date);
}

function getArgValue(args: string[], name: string) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = args.findIndex((arg) => arg === name);
  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
}

function hasFlag(args: string[], name: string) {
  return args.includes(name);
}

function parseArgs(args: string[]): Options {
  const tenantArg = getArgValue(args, '--tenant');
  const fromDayKey = getArgValue(args, '--from');
  const toDayKey = getArgValue(args, '--to');
  const daysValue = getArgValue(args, '--days');

  return {
    tenantSlugs: tenantArg
      ? tenantArg.split(',').map((value) => value.trim()).filter(Boolean)
      : [],
    fromDayKey,
    toDayKey,
    days: daysValue ? Number(daysValue) : undefined,
    includeTodayFull: !hasFlag(args, '--metrics-only-today'),
    dryRun: hasFlag(args, '--dry-run'),
  };
}

function getRangeFromOptions(options: Options) {
  const todayKey = getCurrentRadarDayKey();
  const toDayKey = options.toDayKey || todayKey;

  if (options.fromDayKey) {
    return {
      todayKey,
      dayKeys: buildRadarDayKeyRange(options.fromDayKey, toDayKey),
    };
  }

  const normalizedDays = Math.max(1, options.days ?? 7);
  const toDate = new Date(`${toDayKey}T00:00:00+08:00`);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (normalizedDays - 1));

  const fromDayKey = formatDayKey(fromDate);
  return {
    todayKey,
    dayKeys: buildRadarDayKeyRange(fromDayKey, toDayKey),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { todayKey, dayKeys } = getRangeFromOptions(options);

  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      ...(options.tenantSlugs.length > 0
        ? {
            slug: {
              in: options.tenantSlugs,
            },
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (tenants.length === 0) {
    throw new Error('No active tenants matched the requested scope');
  }

  console.log('[radar-daily-backfill] starting');
  console.log(
    JSON.stringify(
      {
        tenantSlugs: tenants.map((tenant) => tenant.slug),
        dayKeys,
        dryRun: options.dryRun,
        includeTodayFull: options.includeTodayFull,
        note: 'Historical backfill refreshes metric columns only. Workspace summary and feedback summary are fully refreshed only for the current day.',
      },
      null,
      2,
    ),
  );

  const results: Array<Record<string, unknown>> = [];

  for (const tenant of tenants) {
    for (const dayKey of dayKeys) {
      const mode = options.includeTodayFull && dayKey === todayKey ? 'full' : 'metrics-only';

      if (options.dryRun) {
        results.push({
          tenantSlug: tenant.slug,
          dayKey,
          mode,
          dryRun: true,
        });
        continue;
      }

      const startedAt = Date.now();
      const snapshot = mode === 'full'
        ? await persistRadarDailySnapshotForTenant(tenant.id, dayKey)
        : await persistRadarDailyMetricsSnapshotForTenant(tenant.id, dayKey);

      results.push({
        tenantSlug: tenant.slug,
        dayKey,
        mode,
        durationMs: Date.now() - startedAt,
        rawCandidates: snapshot.metrics.rawCandidates,
        qualifiedCompanies: snapshot.metrics.qualifiedCompanies,
        importedProspects: snapshot.metrics.importedProspects,
        contactsAdded: snapshot.metrics.contactsAdded,
        readyCompanies: snapshot.metrics.readyCompanies,
      });
    }
  }

  console.log('[radar-daily-backfill] completed');
  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error('[radar-daily-backfill] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
