'use server';

// ==================== Radar V2 Server Actions ====================
// 新版获客雷达系统 - 多渠道发现 + 招标聚合

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireDecider } from '@/lib/permissions';
import {
  validateRadarQuery,
  validateCandidateCreate,
  validateProfileCreate,
  ValidationError,
} from '@/lib/validation';
import type {
  Prisma,
  ChannelType,
  CandidateStatus,
  CandidateType,
  RadarSource,
  RadarTask,
  RadarCandidate,
  ProspectCompany,
  Opportunity,
} from '@prisma/client';
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
  // 验证输入
  if (!input.sourceId) {
    throw new ValidationError('sourceId is required');
  }

  // 验证查询配置
  const validatedQuery = validateRadarQuery(input.queryConfig);

  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  return createRadarTask({
    tenantId: session.user.tenantId,
    sourceId: input.sourceId,
    name: input.name,
    queryConfig: validatedQuery,
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

  // 排除时异步触发：快速记录公司名 + AI 模式提炼
  if (tier === 'excluded') {
    const tenantId = session.user.tenantId;
    void (async () => {
      try {
        const { appendExcludedCompany, learnExclusionPattern } = await import(
          '@/lib/radar/exclusion-learner'
        );
        // 1. 立即把公司名追加到 excludedCompanies
        if (candidate.profileId) {
          await appendExcludedCompany(candidate.profileId, candidate.displayName);
        }
        // 2. 每 5 次排除触发一次 AI 模式提炼（节省 token）
        const excludedCount = await prisma.radarCandidate.count({
          where: { tenantId, status: 'EXCLUDED' },
        });
        if (excludedCount % 5 === 0 && candidate.profileId) {
          await learnExclusionPattern(tenantId, candidate.profileId);
        }
      } catch {
        // 静默失败
      }
    })();
  }

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
  // 验证输入
  if (!candidateIds || candidateIds.length === 0) {
    throw new ValidationError('candidateIds is required');
  }
  if (candidateIds.length > 100) {
    throw new ValidationError('Maximum 100 candidates per batch');
  }

  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of candidateIds) {
    try {
      if (targetType === 'company') {
        await importCandidateToCompanyV2(id);
      } else {
        await importCandidateToOpportunityV2(id);
      }
      imported++;
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[importCandidatesBatchV2] Failed to import ${id}:`, msg);
      errors.push(`${id}: ${msg}`);
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

// ==================== RadarSearchProfile 管理 ====================

export interface RadarSearchProfileData {
  id: string;
  name: string;
  description: string | null;
  segmentId: string | null;
  personaId: string | null;
  keywords: Record<string, string[]>;
  negativeKeywords: string[] | null;
  targetCountries: string[];
  targetRegions: string[];
  industryCodes: string[];
  categoryFilters: string[];
  enabledChannels: string[];
  sourceIds: string[];
  isActive: boolean;
  scheduleRule: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  lockToken: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  maxRunSeconds: number;
  autoQualify: boolean;
  autoEnrich: boolean;
  runStats: {
    totalRuns?: number;
    totalNew?: number;
    lastError?: string;
    avgDurationMs?: number;
  } | null;
  exclusionRules: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  // 关联
  segment?: { id: string; name: string } | null;
  persona?: { id: string; name: string } | null;
  _count?: { cursors: number };
}

export interface CreateRadarSearchProfileInput {
  name: string;
  description?: string;
  segmentId?: string;
  personaId?: string;
  keywords?: Record<string, string[]>;
  negativeKeywords?: string[];
  targetCountries?: string[];
  targetRegions?: string[];
  industryCodes?: string[];
  categoryFilters?: string[];
  enabledChannels?: string[];
  sourceIds?: string[];
  scheduleRule?: string;
  maxRunSeconds?: number;
  autoQualify?: boolean;
  autoEnrich?: boolean;
  // 新增：精准定位字段
  targetCustomerType?: string[];      // 目标客户类型：manufacturer, distributor, service_provider, retailer
  businessScenario?: string;          // 业务场景描述：我卖什么，客户需要什么
  exampleCustomers?: string[];        // 示例目标客户
  myProduct?: string;                 // 我的产品/服务
}

/**
 * 获取扫描计划列表
 */
export async function getRadarSearchProfiles(options?: {
  isActive?: boolean;
  limit?: number;
}): Promise<RadarSearchProfileData[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  
  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }
  
  const profiles = await prisma.radarSearchProfile.findMany({
    where,
    orderBy: [
      { isActive: 'desc' },
      { nextRunAt: 'asc' },
      { createdAt: 'desc' },
    ],
    take: options?.limit || 100,
  });
  
  // 获取关联的 segment 和 persona
  const segmentIds = profiles.map(p => p.segmentId).filter(Boolean) as string[];
  const personaIds = profiles.map(p => p.personaId).filter(Boolean) as string[];
  
  const [segments, personas, cursorCounts] = await Promise.all([
    segmentIds.length > 0 
      ? prisma.iCPSegment.findMany({ where: { id: { in: segmentIds } }, select: { id: true, name: true } })
      : [],
    personaIds.length > 0
      ? prisma.persona.findMany({ where: { id: { in: personaIds } }, select: { id: true, name: true } })
      : [],
    prisma.radarScanCursor.groupBy({
      by: ['profileId'],
      where: { profileId: { in: profiles.map(p => p.id) } },
      _count: true,
    }),
  ]);
  
  const segmentMap = new Map(segments.map(s => [s.id, s]));
  const personaMap = new Map(personas.map(p => [p.id, p]));
  const cursorCountMap = new Map(cursorCounts.map(c => [c.profileId, c._count]));
  
  return profiles.map(p => ({
    ...p,
    keywords: (p.keywords || {}) as Record<string, string[]>,
    negativeKeywords: p.negativeKeywords as string[] | null,
    enabledChannels: p.enabledChannels as string[],
    runStats: p.runStats as RadarSearchProfileData['runStats'],
    exclusionRules: p.exclusionRules as Record<string, unknown> | null,
    segment: p.segmentId ? segmentMap.get(p.segmentId) || null : null,
    persona: p.personaId ? personaMap.get(p.personaId) || null : null,
    _count: { cursors: cursorCountMap.get(p.id) || 0 },
  }));
}

/**
 * 获取单个扫描计划
 */
export async function getRadarSearchProfile(profileId: string): Promise<RadarSearchProfileData | null> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const profile = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!profile || profile.tenantId !== session.user.tenantId) {
    return null;
  }
  
  // 获取关联数据
  const [segment, persona, cursorCount] = await Promise.all([
    profile.segmentId ? prisma.iCPSegment.findUnique({ where: { id: profile.segmentId }, select: { id: true, name: true } }) : null,
    profile.personaId ? prisma.persona.findUnique({ where: { id: profile.personaId }, select: { id: true, name: true } }) : null,
    prisma.radarScanCursor.count({ where: { profileId } }),
  ]);
  
  return {
    ...profile,
    keywords: (profile.keywords || {}) as Record<string, string[]>,
    negativeKeywords: profile.negativeKeywords as string[] | null,
    enabledChannels: profile.enabledChannels as string[],
    runStats: profile.runStats as RadarSearchProfileData['runStats'],
    exclusionRules: profile.exclusionRules as Record<string, unknown> | null,
    segment,
    persona,
    _count: { cursors: cursorCount },
  };
}

/**
 * 创建扫描计划
 */
export async function createRadarSearchProfile(input: CreateRadarSearchProfileInput): Promise<RadarSearchProfileData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  // 计算初始 nextRunAt
  let nextRunAt: Date | null = null;
  if (input.scheduleRule) {
    try {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(input.scheduleRule);
      nextRunAt = interval.next().toDate();
    } catch (error) {
      console.warn('[createRadarSearchProfile] Invalid cron expression, using default:', error);
      nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }
  
  const profile = await prisma.radarSearchProfile.create({
    data: {
      tenantId: session.user.tenantId,
      name: input.name,
      description: input.description,
      segmentId: input.segmentId,
      personaId: input.personaId,
      keywords: (input.keywords || { en: [] }) as Prisma.InputJsonValue,
      negativeKeywords: input.negativeKeywords as Prisma.InputJsonValue,
      targetCountries: input.targetCountries || [],
      targetRegions: input.targetRegions || [],
      industryCodes: input.industryCodes || [],
      categoryFilters: input.categoryFilters || [],
      enabledChannels: (input.enabledChannels || []) as never[],
      sourceIds: input.sourceIds || [],
      scheduleRule: input.scheduleRule || '0 6 * * *',
      maxRunSeconds: input.maxRunSeconds || 45,
      autoQualify: input.autoQualify ?? true,
      autoEnrich: input.autoEnrich ?? false,
      nextRunAt,
      isActive: true,
    },
  });
  
  return {
    ...profile,
    keywords: (profile.keywords || {}) as Record<string, string[]>,
    negativeKeywords: profile.negativeKeywords as string[] | null,
    enabledChannels: profile.enabledChannels as string[],
    runStats: null,
    exclusionRules: null,
    segment: null,
    persona: null,
    _count: { cursors: 0 },
  };
}

/**
 * 更新扫描计划
 */
export async function updateRadarSearchProfile(
  profileId: string,
  input: Partial<CreateRadarSearchProfileInput> & { isActive?: boolean }
): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  // 修改 scheduleRule 需要决策者权限
  if (input.scheduleRule !== undefined) {
    const roleCheck = requireDecider(session);
    if (!roleCheck.authorized) {
      throw new Error(roleCheck.error);
    }
  }
  
  const existing = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!existing || existing.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  const data: Record<string, unknown> = {};
  
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.segmentId !== undefined) data.segmentId = input.segmentId;
  if (input.personaId !== undefined) data.personaId = input.personaId;
  if (input.keywords !== undefined) data.keywords = input.keywords as Prisma.InputJsonValue;
  if (input.negativeKeywords !== undefined) data.negativeKeywords = input.negativeKeywords as Prisma.InputJsonValue;
  if (input.targetCountries !== undefined) data.targetCountries = input.targetCountries;
  if (input.targetRegions !== undefined) data.targetRegions = input.targetRegions;
  if (input.industryCodes !== undefined) data.industryCodes = input.industryCodes;
  if (input.categoryFilters !== undefined) data.categoryFilters = input.categoryFilters;
  if (input.enabledChannels !== undefined) data.enabledChannels = input.enabledChannels as never[];
  if (input.sourceIds !== undefined) data.sourceIds = input.sourceIds;
  if (input.maxRunSeconds !== undefined) data.maxRunSeconds = input.maxRunSeconds;
  if (input.autoQualify !== undefined) data.autoQualify = input.autoQualify;
  if (input.autoEnrich !== undefined) data.autoEnrich = input.autoEnrich;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  
  // 如果修改了 scheduleRule，重新计算 nextRunAt
  if (input.scheduleRule !== undefined) {
    data.scheduleRule = input.scheduleRule;
    try {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(input.scheduleRule);
      data.nextRunAt = interval.next().toDate();
    } catch (error) {
      console.warn('[updateRadarSearchProfile] Invalid cron expression, using default:', error);
      data.nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }
  
  await prisma.radarSearchProfile.update({
    where: { id: profileId },
    data,
  });
}

/**
 * 切换扫描计划启用状态
 */
export async function toggleRadarSearchProfileActive(profileId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const existing = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!existing || existing.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  const newActive = !existing.isActive;
  
  // 如果重新启用，计算新的 nextRunAt
  let nextRunAt = existing.nextRunAt;
  if (newActive && !existing.nextRunAt) {
    try {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(existing.scheduleRule);
      nextRunAt = interval.next().toDate();
    } catch (error) {
      console.warn('[toggleRadarProfile] Invalid cron expression, using default:', error);
      nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }
  
  await prisma.radarSearchProfile.update({
    where: { id: profileId },
    data: { 
      isActive: newActive,
      nextRunAt: newActive ? nextRunAt : null,
      // 清除锁状态
      lockToken: null,
      lockedAt: null,
      lockedBy: null,
    },
  });
  
  return newActive;
}

/**
 * 删除扫描计划
 */
export async function deleteRadarSearchProfile(profileId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }
  
  const existing = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!existing || existing.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  // 先删除关联的游标
  await prisma.radarScanCursor.deleteMany({
    where: { profileId },
  });
  
  await prisma.radarSearchProfile.delete({
    where: { id: profileId },
  });
}

/**
 * 获取扫描计划的游标状态
 */
export async function getRadarSearchProfileCursors(profileId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const profile = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!profile || profile.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  const cursors = await prisma.radarScanCursor.findMany({
    where: { profileId },
    orderBy: { lastScanAt: 'desc' },
  });
  
  // 获取 source 名称
  const sourceIds = cursors.map(c => c.sourceId);
  const sources = await prisma.radarSource.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, name: true, code: true },
  });
  const sourceMap = new Map(sources.map(s => [s.id, s]));
  
  return cursors.map(c => ({
    ...c,
    cursorState: c.cursorState as Record<string, unknown>,
    source: sourceMap.get(c.sourceId) || null,
  }));
}

/**
 * 手动触发扫描
 */
export async function triggerRadarSearchProfileScan(profileId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const profile = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!profile || profile.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  // 检查是否已被锁定
  if (profile.lockToken && profile.lockedAt) {
    const lockAge = Date.now() - profile.lockedAt.getTime();
    if (lockAge < 5 * 60 * 1000) {
      return { success: false, message: '扫描正在进行中，请稍后再试' };
    }
  }
  
  // 设置 nextRunAt 为现在，让调度器立即拾取
  await prisma.radarSearchProfile.update({
    where: { id: profileId },
    data: { 
      nextRunAt: new Date(),
      isActive: true,
    },
  });
  
  return { success: true, message: '已触发扫描，调度器将在下一个周期执行' };
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
