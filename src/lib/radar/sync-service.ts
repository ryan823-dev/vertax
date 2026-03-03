// ==================== Radar Sync Service ====================
// 发现任务执行服务

import { prisma } from '@/lib/prisma';
import { 
  getAdapter, 
  ensureAdaptersInitialized,
  type RadarSearchQuery,
  type NormalizedCandidate,
} from './adapters';
import type { RadarTask, RadarSource, RadarCandidate } from '@/generated/prisma/client';

// ==================== 类型定义 ====================

export interface SyncResult {
  success: boolean;
  taskId: string;
  stats: {
    fetched: number;
    created: number;
    duplicates: number;
    errors: string[];
    duration: number;
  };
}

export interface TaskConfig {
  tenantId: string;
  sourceId: string;
  queryConfig: RadarSearchQuery;
  targetingRef?: {
    segmentId?: string;
    personaId?: string;
    specVersionId?: string;
  };
  triggeredBy: string;
  name?: string;
}

// ==================== 创建任务 ====================

export async function createRadarTask(config: TaskConfig): Promise<RadarTask> {
  ensureAdaptersInitialized();
  
  const task = await prisma.radarTask.create({
    data: {
      tenantId: config.tenantId,
      name: config.name,
      sourceId: config.sourceId,
      queryConfig: config.queryConfig as object,
      targetingRef: config.targetingRef as object,
      triggeredBy: config.triggeredBy,
      status: 'PENDING',
    },
  });
  
  // 记录 Activity
  await prisma.activity.create({
    data: {
      tenantId: config.tenantId,
      userId: config.triggeredBy,
      action: 'radar_task_created',
      entityType: 'RadarTask',
      entityId: task.id,
      eventCategory: 'radar',
      context: {
        sourceId: config.sourceId,
        queryConfig: config.queryConfig,
      } as object,
    },
  });
  
  return task;
}

// ==================== 执行任务 ====================

export async function runRadarTask(taskId: string): Promise<SyncResult> {
  ensureAdaptersInitialized();
  
  const startTime = Date.now();
  
  // 获取任务和数据源
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
    include: { source: true },
  });
  
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  
  if (task.status !== 'PENDING') {
    throw new Error(`Task is not in PENDING status: ${task.status}`);
  }
  
  // 更新状态为运行中
  await prisma.radarTask.update({
    where: { id: taskId },
    data: { 
      status: 'RUNNING', 
      startedAt: new Date(),
      cancelToken: `cancel_${taskId}_${Date.now()}`,
    },
  });

  const stats = {
    fetched: 0,
    created: 0,
    duplicates: 0,
    errors: [] as string[],
    duration: 0,
  };

  try {
    const adapter = getAdapter(task.source.code, task.source.adapterConfig as Record<string, unknown>);
    const query = task.queryConfig as RadarSearchQuery;
    
    // 检查取消状态的函数
    const checkCancelled = async (): Promise<boolean> => {
      const t = await prisma.radarTask.findUnique({ 
        where: { id: taskId },
        select: { status: true },
      });
      return t?.status === 'CANCELLED';
    };

    let page = 0;
    let hasMore = true;

    while (hasMore) {
      // 检查是否被取消
      if (await checkCancelled()) {
        stats.errors.push('Task was cancelled');
        break;
      }

      // 执行搜索
      const result = await adapter.search({ ...query, page });
      stats.fetched += result.items.length;

      // 处理每个候选
      for (const item of result.items) {
        try {
          await processCandidate(task, item, stats);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          stats.errors.push(`Failed to process candidate: ${errMsg}`);
        }
      }

      hasMore = result.hasMore;
      page = result.nextPage ?? page + 1;

      // 速率限制
      await sleep(1000);
      
      // 防止无限循环
      if (page > 100) break;
    }

    stats.duration = Date.now() - startTime;

    // 更新任务状态
    await prisma.radarTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        stats: stats as object,
      },
    });

    // 记录 Activity
    await prisma.activity.create({
      data: {
        tenantId: task.tenantId,
        userId: task.triggeredBy,
        action: 'radar_task_completed',
        entityType: 'RadarTask',
        entityId: taskId,
        eventCategory: 'radar',
        context: {
          stats,
          source: task.source.name,
        } as object,
      },
    });

    return { success: true, taskId, stats };
  } catch (error) {
    stats.duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    stats.errors.push(errorMessage);

    await prisma.radarTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage,
        stats: stats as object,
      },
    });

    return { success: false, taskId, stats };
  }
}

// ==================== 处理单个候选 ====================

async function processCandidate(
  task: RadarTask & { source: RadarSource },
  item: NormalizedCandidate,
  stats: { created: number; duplicates: number; errors: string[] }
): Promise<void> {
  // 检查是否已存在
  const existing = await prisma.radarCandidate.findUnique({
    where: {
      sourceId_externalId: {
        sourceId: task.sourceId,
        externalId: item.externalId,
      },
    },
  });

  if (existing) {
    stats.duplicates++;
    return;
  }

  // 计算过期时间
  const expireAt = task.source.ttlDays
    ? new Date(Date.now() + task.source.ttlDays * 24 * 60 * 60 * 1000)
    : undefined;

  // 创建候选记录
  await prisma.radarCandidate.create({
    data: {
      tenantId: task.tenantId,
      sourceId: task.sourceId,
      taskId: task.id,
      candidateType: item.candidateType,
      externalId: item.externalId,
      sourceUrl: item.sourceUrl,
      displayName: item.displayName,
      description: item.description,
      
      // 公司字段
      website: item.website,
      phone: item.phone,
      email: item.email,
      address: item.address,
      country: item.country,
      city: item.city,
      industry: item.industry,
      companySize: item.companySize,
      
      // 机会字段
      deadline: item.deadline,
      estimatedValue: item.estimatedValue,
      currency: item.currency,
      buyerName: item.buyerName,
      buyerCountry: item.buyerCountry,
      buyerType: item.buyerType,
      categoryCode: item.categoryCode,
      categoryName: item.categoryName,
      
      // 匹配信息
      matchExplain: item.matchExplain as object,
      
      // TTL 策略
      rawData: task.source.storagePolicy !== 'ID_ONLY' ? item.rawData as object : undefined,
      expireAt,
      
      status: 'NEW',
    },
  });

  stats.created++;
}

// ==================== 取消任务 ====================

export async function cancelRadarTask(taskId: string, userId: string): Promise<void> {
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
  });
  
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  
  if (task.status !== 'RUNNING' && task.status !== 'PENDING') {
    throw new Error(`Cannot cancel task in status: ${task.status}`);
  }
  
  await prisma.radarTask.update({
    where: { id: taskId },
    data: { 
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });
  
  await prisma.activity.create({
    data: {
      tenantId: task.tenantId,
      userId,
      action: 'radar_task_cancelled',
      entityType: 'RadarTask',
      entityId: taskId,
      eventCategory: 'radar',
    },
  });
}

// ==================== 清理过期候选 ====================

export async function cleanupExpiredCandidates(): Promise<number> {
  const result = await prisma.radarCandidate.deleteMany({
    where: {
      expireAt: {
        lt: new Date(),
      },
      status: {
        not: 'IMPORTED',  // 不删除已导入的
      },
    },
  });
  
  return result.count;
}

// ==================== 工具函数 ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
