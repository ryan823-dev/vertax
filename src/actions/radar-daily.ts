'use server';

import { auth } from '@/lib/auth';
import {
  getDailySupplyMetricsForTenant,
  getRadarDailyWorkspaceForTenant,
} from '@/lib/radar/daily-workspace';
import type {
  DailySupplyMetricsData,
  RadarDailyWorkspaceData,
} from '@/lib/radar/daily-workspace';

function requireTenantId(session: { user?: { tenantId?: string | null } } | null) {
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  return session.user.tenantId;
}

export type {
  DailyMetricPoint,
  DailySupplyMetricsData,
  DailyWorkspaceContact,
  DailyWorkspaceItem,
  RadarDailyWorkspaceData,
} from '@/lib/radar/daily-workspace';

export async function getDailySupplyMetrics(days?: number): Promise<DailySupplyMetricsData> {
  const session = await auth();
  const tenantId = requireTenantId(session);
  return getDailySupplyMetricsForTenant(tenantId, days);
}

export async function getRadarDailyWorkspace(limit?: number): Promise<RadarDailyWorkspaceData> {
  const session = await auth();
  const tenantId = requireTenantId(session);
  return getRadarDailyWorkspaceForTenant(tenantId, limit);
}
