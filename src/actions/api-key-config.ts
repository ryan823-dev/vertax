/**
 * 统一API密钥管理（Tower后台）
 *
 * 管理所有数据源的API密钥，支持：
 * - 集中配置
 * - 使用量追踪
 * - 配额管理
 */

'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { isPlatformAdmin } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

// ==================== 类型定义 ====================

export type ApiService =
  | 'google_places'
  | 'apollo'
  | 'skrapp'
  | 'hunter'
  | 'brave_search'
  | 'firecrawl'
  | 'dashscope'
  | 'deepseek'
  | 'resend';

export interface ApiKeyConfigData {
  service: ApiService;
  apiKey: string;
  apiSecret?: string;
  monthlyLimit?: number;
  notes?: string;
}

async function requirePlatformAdmin() {
  const session = await auth();

  if (
    !session?.user ||
    !isPlatformAdmin({
      permissions: (session.user.permissions as string[]) ?? [],
      roleName: session.user.roleName ?? '',
    })
  ) {
    throw new Error('Unauthorized');
  }
}

// ==================== 查询功能 ====================

/**
 * 获取所有API配置
 */
export async function getApiKeyConfigs(): Promise<Array<{
  id: string;
  service: string;
  isEnabled: boolean;
  lastUsedAt: Date | null;
  monthlyLimit: number | null;
  currentUsage: number;
  usageResetAt: Date | null;
  notes: string | null;
}>> {
  await requirePlatformAdmin();

  const configs = await prisma.apiKeyConfig.findMany({
    select: {
      id: true,
      service: true,
      isEnabled: true,
      lastUsedAt: true,
      monthlyLimit: true,
      currentUsage: true,
      usageResetAt: true,
      notes: true,
    },
    orderBy: { service: 'asc' },
  });

  return configs;
}

/**
 * 获取单个API配置
 */
export async function getApiKeyConfig(service: ApiService): Promise<{
  id: string;
  service: string;
  apiKey: string;
  apiSecret: string | null;
  isEnabled: boolean;
  lastUsedAt: Date | null;
  monthlyLimit: number | null;
  currentUsage: number;
  usageResetAt: Date | null;
  notes: string | null;
} | null> {
  await requirePlatformAdmin();

  const config = await prisma.apiKeyConfig.findUnique({
    where: { service },
  });

  if (!config) return null;

  return {
    id: config.id,
    service: config.service,
    apiKey: config.apiKey || '',
    apiSecret: config.apiSecret,
    isEnabled: config.isEnabled,
    lastUsedAt: config.lastUsedAt,
    monthlyLimit: config.monthlyLimit,
    currentUsage: config.currentUsage,
    usageResetAt: config.usageResetAt,
    notes: config.notes,
  };
}

// ==================== 管理功能 ====================

/**
 * 创建或更新API密钥配置
 */
export async function upsertApiKeyConfig(data: ApiKeyConfigData): Promise<{ success: boolean; message: string }> {
  await requirePlatformAdmin();

  try {
    await prisma.apiKeyConfig.upsert({
      where: { service: data.service },
      create: {
        service: data.service,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        monthlyLimit: data.monthlyLimit,
        notes: data.notes,
        isEnabled: true,
      },
      update: {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        monthlyLimit: data.monthlyLimit,
        notes: data.notes,
      },
    });

    revalidatePath('/admin/api-keys');

    return { success: true, message: 'API配置已保存' };
  } catch (error) {
    console.error('[ApiKey] upsertApiKeyConfig error:', error);
    return { success: false, message: '保存失败' };
  }
}

/**
 * 启用/禁用API
 */
export async function toggleApiKey(service: ApiService, isEnabled: boolean): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin();

  try {
    await prisma.apiKeyConfig.update({
      where: { service },
      data: { isEnabled },
    });

    revalidatePath('/admin/api-keys');

    return { success: true };
  } catch (error) {
    console.error('[toggleApiKey] Error:', error);
    return { success: false, error: 'Failed to toggle API key' };
  }
}

/**
 * 重置使用量
 */
export async function resetApiUsage(service: ApiService): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin();

  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.apiKeyConfig.update({
      where: { service },
      data: {
        currentUsage: 0,
        usageResetAt: nextMonth,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[resetApiUsage] Error:', error);
    return { success: false, error: 'Failed to reset API usage' };
  }
}

/**
 * 批量重置所有使用量
 */
export async function resetAllApiUsage(): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin();

  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.apiKeyConfig.updateMany({
      data: {
        currentUsage: 0,
        usageResetAt: nextMonth,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[resetAllApiUsage] Error:', error);
    return { success: false, error: 'Failed to reset all API usage' };
  }
}

// ==================== 成本统计 ====================

/**
 * 获取API调用统计
 */
export async function getApiUsageStats(days: number = 30): Promise<{
  byService: Array<{
    service: string;
    totalCalls: number;
    successRate: number;
    totalCost: number;
  }>;
  dailyCalls: Array<{
    date: string;
    calls: number;
    cost: number;
  }>;
  totalCost: number;
}> {
  await requirePlatformAdmin();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 按服务聚合
  const byServiceRaw = await prisma.apiCallLog.groupBy({
    by: ['service'],
    where: { createdAt: { gte: startDate } },
    _count: { id: true },
    _sum: { cost: true },
  });

  // 获取成功数
  const successByService = await prisma.apiCallLog.groupBy({
    by: ['service'],
    where: {
      createdAt: { gte: startDate },
      success: true,
    },
    _count: { id: true },
  });

  const successMap = new Map(successByService.map(s => [s.service, s._count.id]));

  const byService = byServiceRaw.map(s => ({
    service: s.service,
    totalCalls: s._count.id,
    successRate: s._count.id > 0 ? (successMap.get(s.service) || 0) / s._count.id : 0,
    totalCost: s._sum.cost || 0,
  }));

  // 按日期聚合
  const dailyCallsRaw = await prisma.$queryRaw<Array<{ date: Date; calls: bigint; cost: number }>>`
    SELECT
      DATE("createdAt") as date,
      COUNT(*) as calls,
      COALESCE(SUM(cost), 0) as cost
    FROM api_call_logs
    WHERE "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  `;

  const dailyCalls = dailyCallsRaw.map(d => ({
    date: d.date.toISOString().split('T')[0],
    calls: Number(d.calls),
    cost: d.cost,
  }));

  const totalCost = byService.reduce((sum, s) => sum + s.totalCost, 0);

  return { byService, dailyCalls, totalCost };
}

/**
 * 获取最近的API调用日志
 */
export async function getRecentApiLogs(limit: number = 100): Promise<Array<{
  id: string;
  service: string;
  operation: string;
  cost: number;
  success: boolean;
  errorCode: string | null;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}>> {
  await requirePlatformAdmin();

  const logs = await prisma.apiCallLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return logs.map(log => ({
    id: log.id,
    service: log.service,
    operation: log.operation,
    cost: log.cost,
    success: log.success,
    errorCode: log.errorCode,
    createdAt: log.createdAt,
    metadata: log.metadata as Record<string, unknown> | null,
  }));
}
