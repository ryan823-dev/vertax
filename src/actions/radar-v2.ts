'use server';

// ==================== Radar V2 Server Actions ====================
// 新版获客雷达系统 - 多渠道发现 + 招标聚合

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { 
  createRadarTask, 
  runRadarTask, 
  cancelRadarTask,
  cleanupExpiredCandidates,
} from '@/lib/radar/sync-service';
import {
  ensureAdaptersInitialized,
  listAdapterRegistrations,
  listAdaptersByChannel,
  getAdapterRegistration,
  getAdapter,
} from '@/lib/radar/adapters/registry';
import type { RadarSearchQuery } from '@/lib/radar/adapters/types';
import type { 
  RadarSource, 
  RadarTask, 
  RadarCandidate,
  ProspectCompany,
  Opportunity,
} from '@/generated/prisma/client';
import type {
  ChannelType,
  CandidateStatus,
  CandidateType,
} from '@/generated/prisma/enums';

// ==================== 类型导出 ====================

export type RadarSourceData = RadarSource;
export type RadarTaskData = RadarTask;
export type RadarCandidateData = RadarCandidate;
export type ProspectCompanyData = ProspectCompany;
export type OpportunityData = Opportunity;

export interface SyncResultData {
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

export interface RadarStatsData {
  totalCandidates: number;
  newCandidates: number;
  qualifiedCandidates: number;
  importedCandidates: number;
  opportunities: number;
  companies: number;
  runningTasks: number;
}

// ==================== 数据源管理 ====================

/**
 * 获取所有数据源
 */
export async function getRadarSourcesV2(channelType?: ChannelType): Promise<RadarSource[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  ensureAdaptersInitialized();
  
  const where: Record<string, unknown> = {
    OR: [
      { tenantId: session.user.tenantId },
      { tenantId: null }, // 系统级公共源
    ],
  };
  
  if (channelType) {
    where.channelType = channelType;
  }
  
  return prisma.radarSource.findMany({
    where,
    orderBy: [
      { isOfficial: 'desc' },
      { channelType: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * 获取可用的适配器列表
 */
export async function getAvailableAdaptersV2(channelType?: string) {
  ensureAdaptersInitialized();
  
  if (channelType) {
    return listAdaptersByChannel(channelType);
  }
  return listAdapterRegistrations();
}

/**
 * 获取适配器详情
 */
export async function getAdapterInfoV2(code: string) {
  ensureAdaptersInitialized();
  return getAdapterRegistration(code);
}

/**
 * 检查数据源健康状态
 */
export async function checkSourceHealthV2(sourceId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  ensureAdaptersInitialized();
  
  const source = await prisma.radarSource.findUnique({
    where: { id: sourceId },
  });
  
  if (!source) throw new Error('Source not found');
  
  const adapter = getAdapter(source.code, source.adapterConfig as Record<string, unknown>);
  const health = await adapter.healthCheck();
  
  // 更新数据源状态
  await prisma.radarSource.update({
    where: { id: sourceId },
    data: {
      syncStats: {
        ...(source.syncStats as object || {}),
        lastHealthCheck: new Date().toISOString(),
        healthy: health.healthy,
        latency: health.latency,
        error: health.error,
      },
    },
  });
  
  return health;
}

/**
 * 初始化系统数据源（首次使用时调用）
 */
export async function initializeSystemSourcesV2() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  ensureAdaptersInitialized();
  
  const registrations = listAdapterRegistrations();
  const created: RadarSource[] = [];
  
  for (const reg of registrations) {
    // 检查是否已存在
    const existing = await prisma.radarSource.findUnique({
      where: { code: reg.code },
    });
    
    if (!existing) {
      const source = await prisma.radarSource.create({
        data: {
          tenantId: null, // 系统级
          channelType: reg.channelType,
          name: reg.name,
          code: reg.code,
          description: reg.description,
          websiteUrl: reg.websiteUrl,
          countries: reg.countries || [],
          regions: reg.regions || [],
          adapterType: reg.adapterType,
          adapterConfig: reg.defaultConfig as Prisma.InputJsonValue,
          isOfficial: reg.isOfficial,
          termsUrl: reg.termsUrl,
          storagePolicy: reg.storagePolicy,
          ttlDays: reg.ttlDays,
          attributionRequired: reg.attributionRequired,
          rateLimit: reg.features.rateLimit as Prisma.InputJsonValue,
          isEnabled: true,
        },
      });
      created.push(source);
    }
  }
  
  return created;
}

// ==================== 发现任务管理 ====================

/**
 * 创建发现任务
 */
export async function createDiscoveryTaskV2(input: {
  sourceId: string;
  name?: string;
  queryConfig: RadarSearchQuery;
  targetingRef?: {
    segmentId?: string;
    personaId?: string;
    specVersionId?: string;
  };
}): Promise<RadarTask> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  return createRadarTask({
    tenantId: session.user.tenantId,
    sourceId: input.sourceId,
    name: input.name,
    queryConfig: input.queryConfig,
    targetingRef: input.targetingRef,
    triggeredBy: session.user.id,
  });
}

/**
 * 运行发现任务
 */
export async function runDiscoveryTaskV2(taskId: string): Promise<SyncResultData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  // 验证任务属于当前租户
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
  });
  
  if (!task || task.tenantId !== session.user.tenantId) {
    throw new Error('Task not found');
  }
  
  return runRadarTask(taskId);
}

/**
 * 取消发现任务
 */
export async function cancelDiscoveryTaskV2(taskId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
  });
  
  if (!task || task.tenantId !== session.user.tenantId) {
    throw new Error('Task not found');
  }
  
  return cancelRadarTask(taskId, session.user.id);
}

/**
 * 获取任务列表
 */
export async function getDiscoveryTasksV2(options?: {
  sourceId?: string;
  status?: string;
  limit?: number;
}): Promise<Array<RadarTask & { source: RadarSource }>> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  
  if (options?.sourceId) {
    where.sourceId = options.sourceId;
  }
  if (options?.status) {
    where.status = options.status;
  }
  
  return prisma.radarTask.findMany({
    where,
    include: { source: true },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
  });
}

/**
 * 获取任务详情
 */
export async function getDiscoveryTaskV2(taskId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
    include: { source: true },
  });
  
  if (task && task.tenantId !== session.user.tenantId) {
    return null;
  }
  
  return task;
}

// ==================== 候选池管理 ====================

/**
 * 获取候选列表
 */
export async function getCandidatesV2(options?: {
  candidateType?: CandidateType;
  status?: CandidateStatus;
  sourceId?: string;
  qualifyTier?: string;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  country?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ candidates: Array<RadarCandidate & { source: RadarSource }>; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  
  if (options?.candidateType) {
    where.candidateType = options.candidateType;
  }
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.sourceId) {
    where.sourceId = options.sourceId;
  }
  if (options?.qualifyTier) {
    where.qualifyTier = options.qualifyTier;
  }
  if (options?.hasPhone) {
    where.phone = { not: null };
  }
  if (options?.hasWebsite) {
    where.website = { not: null };
  }
  if (options?.country) {
    where.OR = [
      { country: options.country },
      { buyerCountry: options.country },
    ];
  }
  if (options?.search) {
    where.OR = [
      { displayName: { contains: options.search, mode: 'insensitive' } },
      { buyerName: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const [candidates, total] = await Promise.all([
    prisma.radarCandidate.findMany({
      where,
      include: { source: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.radarCandidate.count({ where }),
  ]);
  
  return { candidates, total };
}

/**
 * 获取候选详情
 */
export async function getCandidateV2(candidateId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true, task: true },
  });
  
  if (candidate && candidate.tenantId !== session.user.tenantId) {
    return null;
  }
  
  return candidate;
}

/**
 * 合格化候选（分层）
 */
export async function qualifyCandidateV2(
  candidateId: string,
  tier: 'A' | 'B' | 'C' | 'excluded',
  reason?: string
): Promise<RadarCandidate> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
  });
  
  if (!candidate || candidate.tenantId !== session.user.tenantId) {
    throw new Error('Candidate not found');
  }
  
  const updated = await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: tier === 'excluded' ? 'EXCLUDED' : 'QUALIFIED',
      qualifyTier: tier,
      qualifyReason: reason,
      qualifiedAt: new Date(),
      qualifiedBy: session.user.id,
    },
  });
  
  // 记录 Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidate_qualified',
      entityType: 'RadarCandidate',
      entityId: candidateId,
      eventCategory: 'radar',
      context: { tier, reason } as object,
    },
  });
  
  return updated;
}

/**
 * 批量合格化
 */
export async function qualifyCandidatesBatchV2(
  candidateIds: string[],
  tier: 'A' | 'B' | 'C' | 'excluded',
  reason?: string
): Promise<number> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const result = await prisma.radarCandidate.updateMany({
    where: {
      id: { in: candidateIds },
      tenantId: session.user.tenantId,
    },
    data: {
      status: tier === 'excluded' ? 'EXCLUDED' : 'QUALIFIED',
      qualifyTier: tier,
      qualifyReason: reason,
      qualifiedAt: new Date(),
      qualifiedBy: session.user.id,
    },
  });
  
  // 记录 Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidates_batch_qualified',
      entityType: 'RadarCandidate',
      entityId: candidateIds.join(','),
      eventCategory: 'radar',
      context: { count: result.count, tier, reason } as object,
    },
  });
  
  return result.count;
}

// ==================== 导入线索库 ====================

/**
 * 导入候选到 ProspectCompany
 */
export async function importCandidateToCompanyV2(
  candidateId: string
): Promise<ProspectCompany> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true },
  });
  
  if (!candidate || candidate.tenantId !== session.user.tenantId) {
    throw new Error('Candidate not found');
  }
  
  // 创建 ProspectCompany
  const company = await prisma.prospectCompany.create({
    data: {
      tenantId: session.user.tenantId,
      name: candidate.buyerName || candidate.displayName,
      website: candidate.website,
      phone: candidate.phone,
      email: candidate.email,
      address: candidate.address,
      country: candidate.buyerCountry || candidate.country,
      city: candidate.city,
      industry: candidate.industry,
      companySize: candidate.companySize,
      description: candidate.description,
      tier: candidate.qualifyTier,
      sourceType: candidate.source.channelType.toLowerCase(),
      sourceCandidateId: candidateId,
      sourceUrl: candidate.sourceUrl,
      status: 'new',
    },
  });
  
  // 更新候选状态
  await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: 'IMPORTED',
      importedToType: 'ProspectCompany',
      importedToId: company.id,
      importedAt: new Date(),
      importedBy: session.user.id,
    },
  });
  
  // 记录 Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidate_imported_company',
      entityType: 'ProspectCompany',
      entityId: company.id,
      eventCategory: 'radar',
      context: { candidateId, companyName: company.name } as object,
    },
  });
  
  return company;
}

/**
 * 导入候选到 Opportunity
 */
export async function importCandidateToOpportunityV2(
  candidateId: string,
  companyId?: string
): Promise<Opportunity> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true },
  });
  
  if (!candidate || candidate.tenantId !== session.user.tenantId) {
    throw new Error('Candidate not found');
  }
  
  if (candidate.candidateType !== 'OPPORTUNITY') {
    throw new Error('Candidate is not an opportunity');
  }
  
  // 创建 Opportunity
  const opportunity = await prisma.opportunity.create({
    data: {
      tenantId: session.user.tenantId,
      companyId,
      sourceType: 'tender',
      sourceCandidateId: candidateId,
      sourceUrl: candidate.sourceUrl,
      title: candidate.displayName,
      description: candidate.description,
      deadline: candidate.deadline,
      estimatedValue: candidate.estimatedValue,
      currency: candidate.currency,
      categoryCode: candidate.categoryCode,
      categoryName: candidate.categoryName,
      stage: 'IDENTIFIED',
    },
  });
  
  // 更新候选状态
  await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: 'IMPORTED',
      importedToType: 'Opportunity',
      importedToId: opportunity.id,
      importedAt: new Date(),
      importedBy: session.user.id,
    },
  });
  
  // 记录 Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidate_imported_opportunity',
      entityType: 'Opportunity',
      entityId: opportunity.id,
      eventCategory: 'radar',
      context: { candidateId, title: opportunity.title } as object,
    },
  });
  
  return opportunity;
}

/**
 * 批量导入
 */
export async function importCandidatesBatchV2(
  candidateIds: string[],
  targetType: 'company' | 'opportunity'
): Promise<{ imported: number; failed: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  let imported = 0;
  let failed = 0;
  
  for (const id of candidateIds) {
    try {
      if (targetType === 'company') {
        await importCandidateToCompanyV2(id);
      } else {
        await importCandidateToOpportunityV2(id);
      }
      imported++;
    } catch {
      failed++;
    }
  }
  
  return { imported, failed };
}

// ==================== ProspectCompany 管理 ====================

/**
 * 获取线索公司列表
 */
export async function getProspectCompaniesV2(options?: {
  status?: string;
  tier?: string;
  industry?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ companies: ProspectCompany[]; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };
  
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.tier) {
    where.tier = options.tier;
  }
  if (options?.industry) {
    where.industry = { contains: options.industry, mode: 'insensitive' };
  }
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const [companies, total] = await Promise.all([
    prisma.prospectCompany.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.prospectCompany.count({ where }),
  ]);
  
  return { companies, total };
}

// ==================== Opportunity 管理 ====================

/**
 * 获取机会列表
 */
export async function getOpportunitiesV2(options?: {
  stage?: string;
  companyId?: string;
  hasDeadline?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ opportunities: Array<Opportunity & { company: ProspectCompany | null }>; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };
  
  if (options?.stage) {
    where.stage = options.stage;
  }
  if (options?.companyId) {
    where.companyId = options.companyId;
  }
  if (options?.hasDeadline) {
    where.deadline = { not: null };
  }
  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: { company: true },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.opportunity.count({ where }),
  ]);
  
  return { opportunities, total };
}

/**
 * 更新机会阶段
 */
export async function updateOpportunityStageV2(
  opportunityId: string,
  stage: string,
  notes?: string
): Promise<Opportunity> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  
  if (!opportunity || opportunity.tenantId !== session.user.tenantId) {
    throw new Error('Opportunity not found');
  }
  
  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      stage: stage as Opportunity['stage'],
      notes: notes ? `${opportunity.notes || ''}\n\n${new Date().toISOString()}: ${notes}` : opportunity.notes,
      ...(stage === 'WON' ? { wonAt: new Date() } : {}),
      ...(stage === 'LOST' ? { lostAt: new Date() } : {}),
    },
  });
  
  // 记录 Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'opportunity_stage_updated',
      entityType: 'Opportunity',
      entityId: opportunityId,
      eventCategory: 'radar',
      context: { previousStage: opportunity.stage, newStage: stage, notes } as object,
    },
  });
  
  return updated;
}

// ==================== 统计 ====================

/**
 * 获取雷达统计
 */
export async function getRadarStatsV2(): Promise<RadarStatsData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const tenantId = session.user.tenantId;
  
  const [
    totalCandidates,
    newCandidates,
    qualifiedCandidates,
    importedCandidates,
    opportunities,
    companies,
    runningTasks,
  ] = await Promise.all([
    prisma.radarCandidate.count({ where: { tenantId } }),
    prisma.radarCandidate.count({ where: { tenantId, status: 'NEW' } }),
    prisma.radarCandidate.count({ where: { tenantId, status: 'QUALIFIED' } }),
    prisma.radarCandidate.count({ where: { tenantId, status: 'IMPORTED' } }),
    prisma.radarCandidate.count({ where: { tenantId, candidateType: 'OPPORTUNITY' } }),
    prisma.prospectCompany.count({ where: { tenantId, deletedAt: null } }),
    prisma.radarTask.count({ where: { tenantId, status: 'RUNNING' } }),
  ]);
  
  return {
    totalCandidates,
    newCandidates,
    qualifiedCandidates,
    importedCandidates,
    opportunities,
    companies,
    runningTasks,
  };
}

// ==================== 清理 ====================

/**
 * 清理过期候选
 */
export async function cleanupExpiredV2(): Promise<number> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  return cleanupExpiredCandidates();
}
