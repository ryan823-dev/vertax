/**
 * 内容增长流水线状态计算
 * 
 * 五步流程：主题集群 → 内容简报 → 内容草稿 → 证据校验 → 发布包
 * 统一封装所有口径与阈值
 */

import { prisma } from '@/lib/prisma';

// ============================================
// 类型定义
// ============================================

export type StepStatus = 'DONE' | 'IN_PROGRESS' | 'BLOCKED';

export interface StepState {
  key: string;
  label: string;
  status: StepStatus;
  blocker?: string;
  href: string;
  count?: number;
}

export interface GrowthPipelineCounts {
  // TopicCluster
  topicClusterExists: boolean;
  topicClusterVersion: number;
  topicClusterUpdatedAt: Date | null;
  clustersCount: number;
  contentMapCount: number;
  
  // ContentBrief (30天内)
  briefsTotal: number;
  briefsDraft: number;
  briefsReady: number;
  briefsInProgress: number;
  briefsDone: number;
  
  // ContentDraft / SeoContent (30天内)
  draftsTotal: number;
  draftsPublished: number;
  draftsPending: number;
  
  // Evidence / ClaimsVerification
  evidenceCount: number;
  missingProofCount: number;
  
  // PublishPack (30天内)
  publishPacksTotal: number;
  publishPacksPending: number;
  publishPacksPublished: number;
  
  // Knowledge Engine status
  knowledgeCompleteness: number; // 0-100
  hasCompanyProfile: boolean;
  hasPersonas: boolean;
  hasEvidence: boolean;
  
  // Meta
  lastUpdatedAt: Date | null;
}

export interface PrimaryCTA {
  label: string;
  href: string;
  action?: string;
  disabled: boolean;
  disabledReason?: string;
}

export interface GrowthPipelineStatus {
  steps: StepState[];
  counts: GrowthPipelineCounts;
  currentStep: number;
  primaryCTA: PrimaryCTA;
}

// ============================================
// 配置常量
// ============================================

/** 统计时间窗口（天） */
const STATS_WINDOW_DAYS = 30;

/** 步骤定义 */
const STEP_CONFIG = [
  { key: 'topics', label: '主题集群', href: '/c/marketing/topics' },
  { key: 'briefs', label: '内容简报', href: '/c/marketing/briefs' },
  { key: 'drafts', label: '内容草稿', href: '/c/marketing/contents' },
  { key: 'verify', label: '证据校验', href: '/c/marketing/contents' },
  { key: 'publish', label: '发布包', href: '/c/marketing/strategy' },
] as const;

// ============================================
// 主函数
// ============================================

/**
 * 获取内容增长流水线状态
 */
export async function getGrowthPipelineStatus(tenantId: string): Promise<GrowthPipelineStatus> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // 并行获取所有计数
  const [
    topicClusterResult,
    briefsStats,
    draftsStats,
    evidenceStats,
    publishPacksStats,
    knowledgeStatus,
  ] = await Promise.all([
    // TopicCluster (从 ArtifactVersion 获取)
    getTopicClusterStats(tenantId),
    // ContentBrief 统计
    getBriefsStats(tenantId, thirtyDaysAgo),
    // SeoContent 统计
    getDraftsStats(tenantId, thirtyDaysAgo),
    // Evidence 统计
    getEvidenceStats(tenantId),
    // PublishPack 统计 (从 ArtifactVersion 获取)
    getPublishPacksStats(tenantId, thirtyDaysAgo),
    // 知识引擎完成度
    getKnowledgeStatus(tenantId),
  ]);

  // 构建 counts
  const counts: GrowthPipelineCounts = {
    topicClusterExists: topicClusterResult.exists,
    topicClusterVersion: topicClusterResult.version,
    topicClusterUpdatedAt: topicClusterResult.updatedAt,
    clustersCount: topicClusterResult.clustersCount,
    contentMapCount: topicClusterResult.contentMapCount,
    
    briefsTotal: briefsStats.total,
    briefsDraft: briefsStats.draft,
    briefsReady: briefsStats.ready,
    briefsInProgress: briefsStats.inProgress,
    briefsDone: briefsStats.done,
    
    draftsTotal: draftsStats.total,
    draftsPublished: draftsStats.published,
    draftsPending: draftsStats.pending,
    
    evidenceCount: evidenceStats.total,
    missingProofCount: evidenceStats.missingProof,
    
    publishPacksTotal: publishPacksStats.total,
    publishPacksPending: publishPacksStats.pending,
    publishPacksPublished: publishPacksStats.published,
    
    knowledgeCompleteness: knowledgeStatus.completeness,
    hasCompanyProfile: knowledgeStatus.hasCompanyProfile,
    hasPersonas: knowledgeStatus.hasPersonas,
    hasEvidence: knowledgeStatus.hasEvidence,
    
    lastUpdatedAt: topicClusterResult.updatedAt || briefsStats.lastUpdatedAt,
  };

  // 计算每一步状态
  const steps = calculateSteps(counts);

  // 确定当前步骤
  const currentStep = getCurrentStep(steps);

  // 生成主 CTA
  const primaryCTA = getPrimaryCTA(steps, currentStep, counts);

  return { steps, counts, currentStep, primaryCTA };
}

// ============================================
// 辅助函数
// ============================================

interface TopicClusterStats {
  exists: boolean;
  version: number;
  updatedAt: Date | null;
  clustersCount: number;
  contentMapCount: number;
}

async function getTopicClusterStats(tenantId: string): Promise<TopicClusterStats> {
  const latestVersion = await prisma.artifactVersion.findFirst({
    where: {
      tenantId,
      entityType: 'TopicCluster',
    },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      content: true,
      createdAt: true,
    },
  });

  if (!latestVersion) {
    return {
      exists: false,
      version: 0,
      updatedAt: null,
      clustersCount: 0,
      contentMapCount: 0,
    };
  }

  // 解析 content 获取 cluster 数量
  let clustersCount = 0;
  let contentMapCount = 0;
  
  try {
    const content = latestVersion.content as { topicCluster?: { clusters?: Array<{ contentMap?: unknown[] }> } };
    const clusters = content?.topicCluster?.clusters || [];
    clustersCount = clusters.length;
    contentMapCount = clusters.reduce((sum, c) => sum + (c.contentMap?.length || 0), 0);
  } catch {
    // ignore parsing errors
  }

  return {
    exists: true,
    version: latestVersion.version,
    updatedAt: latestVersion.createdAt,
    clustersCount,
    contentMapCount,
  };
}

interface BriefsStats {
  total: number;
  draft: number;
  ready: number;
  inProgress: number;
  done: number;
  lastUpdatedAt: Date | null;
}

async function getBriefsStats(tenantId: string, since: Date): Promise<BriefsStats> {
  const briefs = await prisma.contentBrief.findMany({
    where: {
      tenantId,
      deletedAt: null,
      createdAt: { gte: since },
    },
    select: {
      status: true,
      updatedAt: true,
    },
  });

  const stats: BriefsStats = {
    total: briefs.length,
    draft: 0,
    ready: 0,
    inProgress: 0,
    done: 0,
    lastUpdatedAt: null,
  };

  for (const brief of briefs) {
    switch (brief.status) {
      case 'draft': stats.draft++; break;
      case 'ready': stats.ready++; break;
      case 'in_progress': stats.inProgress++; break;
      case 'done': stats.done++; break;
    }
    if (!stats.lastUpdatedAt || brief.updatedAt > stats.lastUpdatedAt) {
      stats.lastUpdatedAt = brief.updatedAt;
    }
  }

  return stats;
}

interface DraftsStats {
  total: number;
  published: number;
  pending: number;
}

async function getDraftsStats(tenantId: string, since: Date): Promise<DraftsStats> {
  const [total, published] = await Promise.all([
    prisma.seoContent.count({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: since },
      },
    }),
    prisma.seoContent.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'published',
        createdAt: { gte: since },
      },
    }),
  ]);

  return {
    total,
    published,
    pending: total - published,
  };
}

interface EvidenceStats {
  total: number;
  missingProof: number;
}

async function getEvidenceStats(tenantId: string): Promise<EvidenceStats> {
  const total = await prisma.evidence.count({
    where: {
      tenantId,
      deletedAt: null,
    },
  });

  // TODO: 实现 ClaimsVerification 检查
  // 暂时假设没有缺证据的情况
  return {
    total,
    missingProof: 0,
  };
}

interface PublishPacksStats {
  total: number;
  pending: number;
  published: number;
}

async function getPublishPacksStats(tenantId: string, since: Date): Promise<PublishPacksStats> {
  const packs = await prisma.artifactVersion.findMany({
    where: {
      tenantId,
      entityType: 'PublishPack',
      createdAt: { gte: since },
    },
    select: {
      status: true,
    },
  });

  return {
    total: packs.length,
    pending: packs.filter(p => p.status !== 'approved').length,
    published: packs.filter(p => p.status === 'approved').length,
  };
}

interface KnowledgeStatus {
  completeness: number;
  hasCompanyProfile: boolean;
  hasPersonas: boolean;
  hasEvidence: boolean;
}

async function getKnowledgeStatus(tenantId: string): Promise<KnowledgeStatus> {
  const [companyProfile, personasCount, evidenceCount] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        companyName: true,
        companyIntro: true,
        coreProducts: true,
      },
    }),
    prisma.persona.count({ where: { tenantId } }),
    prisma.evidence.count({ where: { tenantId, deletedAt: null } }),
  ]);

  const hasCompanyProfile = !!(
    companyProfile?.companyName ||
    companyProfile?.companyIntro ||
    (Array.isArray(companyProfile?.coreProducts) && (companyProfile.coreProducts as unknown[]).length > 0)
  );
  const hasPersonas = personasCount > 0;
  const hasEvidence = evidenceCount > 0;

  // 计算完成度
  let completeness = 0;
  if (hasCompanyProfile) completeness += 40;
  if (hasPersonas) completeness += 30;
  if (hasEvidence) completeness += 30;

  return {
    completeness,
    hasCompanyProfile,
    hasPersonas,
    hasEvidence,
  };
}

function calculateSteps(counts: GrowthPipelineCounts): StepState[] {
  const steps: StepState[] = [];

  // Step 1: 主题集群
  // DONE: 存在 TopicCluster ArtifactVersion >= 1
  let step1Status: StepStatus;
  let step1Blocker: string | undefined;
  
  if (counts.topicClusterExists && counts.topicClusterVersion >= 1) {
    step1Status = 'DONE';
  } else {
    step1Status = 'IN_PROGRESS';
    step1Blocker = '请生成主题集群以开始内容规划';
  }
  
  steps.push({
    key: STEP_CONFIG[0].key,
    label: STEP_CONFIG[0].label,
    status: step1Status,
    blocker: step1Blocker,
    href: STEP_CONFIG[0].href,
    count: counts.clustersCount,
  });

  // Step 2: 内容简报
  // DONE: 存在 ContentBrief >= 1（最近30天）
  let step2Status: StepStatus;
  let step2Blocker: string | undefined;
  
  if (step1Status !== 'DONE') {
    step2Status = 'BLOCKED';
    step2Blocker = '请先完成主题集群';
  } else if (counts.briefsTotal >= 1) {
    step2Status = 'DONE';
  } else {
    step2Status = 'IN_PROGRESS';
    step2Blocker = '请基于主题集群生成内容简报';
  }
  
  steps.push({
    key: STEP_CONFIG[1].key,
    label: STEP_CONFIG[1].label,
    status: step2Status,
    blocker: step2Blocker,
    href: STEP_CONFIG[1].href,
    count: counts.briefsTotal,
  });

  // Step 3: 内容草稿
  // DONE: 存在 ContentDraft/ContentPiece >= 1（最近30天）
  let step3Status: StepStatus;
  let step3Blocker: string | undefined;
  
  if (step2Status === 'BLOCKED') {
    step3Status = 'BLOCKED';
    step3Blocker = '请先完成内容简报';
  } else if (counts.draftsTotal >= 1) {
    step3Status = 'DONE';
  } else if (counts.briefsReady > 0 || counts.briefsDone > 0) {
    step3Status = 'IN_PROGRESS';
    step3Blocker = `有 ${counts.briefsReady + counts.briefsDone} 个简报待生成草稿`;
  } else {
    step3Status = 'IN_PROGRESS';
    step3Blocker = '请基于简报生成内容草稿';
  }
  
  steps.push({
    key: STEP_CONFIG[2].key,
    label: STEP_CONFIG[2].label,
    status: step3Status,
    blocker: step3Blocker,
    href: STEP_CONFIG[2].href,
    count: counts.draftsTotal,
  });

  // Step 4: 证据校验
  // DONE: 存在 ClaimsVerification >= 1 且 missingProof=0（最近30天）
  let step4Status: StepStatus;
  let step4Blocker: string | undefined;
  
  if (step3Status === 'BLOCKED') {
    step4Status = 'BLOCKED';
    step4Blocker = '请先完成内容草稿';
  } else if (counts.missingProofCount === 0 && counts.draftsTotal > 0) {
    step4Status = 'DONE';
  } else if (counts.missingProofCount > 0) {
    step4Status = 'IN_PROGRESS';
    step4Blocker = `${counts.missingProofCount} 条内容缺少证据支撑`;
  } else {
    step4Status = 'IN_PROGRESS';
    step4Blocker = '请校验内容证据引用';
  }
  
  steps.push({
    key: STEP_CONFIG[3].key,
    label: STEP_CONFIG[3].label,
    status: step4Status,
    blocker: step4Blocker,
    href: STEP_CONFIG[3].href,
    count: counts.evidenceCount,
  });

  // Step 5: 发布包
  // DONE: 存在 PublishPack >= 1（最近30天）
  let step5Status: StepStatus;
  let step5Blocker: string | undefined;
  
  if (step4Status === 'BLOCKED') {
    step5Status = 'BLOCKED';
    step5Blocker = '请先完成证据校验';
  } else if (counts.publishPacksPublished >= 1) {
    step5Status = 'DONE';
  } else if (counts.publishPacksPending > 0) {
    step5Status = 'IN_PROGRESS';
    step5Blocker = `${counts.publishPacksPending} 个发布包待审核`;
  } else if (counts.draftsPublished > 0) {
    step5Status = 'IN_PROGRESS';
    step5Blocker = '请创建发布包';
  } else {
    step5Status = 'IN_PROGRESS';
    step5Blocker = '请发布内容到目标渠道';
  }
  
  steps.push({
    key: STEP_CONFIG[4].key,
    label: STEP_CONFIG[4].label,
    status: step5Status,
    blocker: step5Blocker,
    href: STEP_CONFIG[4].href,
    count: counts.publishPacksTotal,
  });

  return steps;
}

function getCurrentStep(steps: StepState[]): number {
  // 找到第一个非 DONE 的步骤
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status !== 'DONE') {
      return i + 1;
    }
  }
  // 全部完成，返回最后一步
  return steps.length;
}

function getPrimaryCTA(
  steps: StepState[], 
  currentStep: number, 
  counts: GrowthPipelineCounts
): PrimaryCTA {
  const step = steps[currentStep - 1];
  
  // 根据当前步骤生成 CTA
  switch (step.key) {
    case 'topics':
      if (!counts.topicClusterExists) {
        return {
          label: '生成主题集群',
          href: '/c/marketing/topics',
          action: 'generate',
          disabled: false,
        };
      }
      return {
        label: '批量生成简报',
        href: '/c/marketing/briefs',
        action: 'batch_brief',
        disabled: false,
      };
      
    case 'briefs':
      if (counts.briefsTotal === 0) {
        return {
          label: '生成内容简报',
          href: '/c/marketing/briefs',
          action: 'create_brief',
          disabled: step.status === 'BLOCKED',
          disabledReason: step.blocker,
        };
      }
      return {
        label: `处理简报 (${counts.briefsReady + counts.briefsDraft})`,
        href: '/c/marketing/briefs',
        disabled: false,
      };
      
    case 'drafts':
      if (counts.briefsReady > 0) {
        return {
          label: `生成草稿 (${counts.briefsReady})`,
          href: '/c/marketing/contents',
          action: 'generate_draft',
          disabled: step.status === 'BLOCKED',
          disabledReason: step.blocker,
        };
      }
      return {
        label: '查看内容列表',
        href: '/c/marketing/contents',
        disabled: false,
      };
      
    case 'verify':
      if (counts.missingProofCount > 0) {
        return {
          label: `校验证据 (${counts.missingProofCount})`,
          href: '/c/marketing/contents',
          action: 'verify_claims',
          disabled: step.status === 'BLOCKED',
          disabledReason: step.blocker,
        };
      }
      return {
        label: '查看内容',
        href: '/c/marketing/contents',
        disabled: false,
      };
      
    case 'publish':
      if (counts.publishPacksPending > 0) {
        return {
          label: `审核发布包 (${counts.publishPacksPending})`,
          href: '/c/marketing/strategy',
          disabled: false,
        };
      }
      return {
        label: '创建发布包',
        href: '/c/marketing/strategy',
        action: 'create_pack',
        disabled: step.status === 'BLOCKED',
        disabledReason: step.blocker,
      };
      
    default:
      return {
        label: '开始内容增长',
        href: '/c/marketing/topics',
        disabled: false,
      };
  }
}

// ============================================
// 导出步骤配置
// ============================================

export const GROWTH_PIPELINE_STEPS = STEP_CONFIG;
export { STATS_WINDOW_DAYS };
