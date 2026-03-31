/**
 * 内容增长流水线状态计算
 *
 * 七步流程：主题集群 → 内容简报 → 内容草稿 → 证据校验 → 发布包 → SEO/AEO 检测 → GEO 监控
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

  // SEO/AEO 健康度 (0-100)
  seoHealthScore: number;
  aeoScore: number;
  contentsWithSchema: number;
  contentsWithFaq: number;
  contentsOptimized: number;

  // GEO 引用监控
  geoMentionCount: number;
  geoEnginesTracked: number;
  geoLastCheckedAt: Date | null;

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
  { key: 'topics',      label: '主题集群',   href: '/customer/marketing/topics' },
  { key: 'briefs',      label: '内容简报',   href: '/customer/marketing/briefs' },
  { key: 'drafts',      label: '内容草稿',   href: '/customer/marketing/contents' },
  { key: 'verify',      label: '证据校验',   href: '/customer/marketing/contents' },
  { key: 'publish',     label: '发布推送',   href: '/customer/marketing/strategy' },
  { key: 'seo-aeo',     label: 'SEO/AEO',   href: '/customer/marketing/seo-aeo' },
  { key: 'geo',         label: 'GEO 中心',  href: '/customer/marketing/geo-center' },
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
    seoAeoStats,
  ] = await Promise.all([
    getTopicClusterStats(tenantId),
    getBriefsStats(tenantId, thirtyDaysAgo),
    getDraftsStats(tenantId, thirtyDaysAgo),
    getEvidenceStats(tenantId),
    getPublishPacksStats(tenantId, thirtyDaysAgo),
    getKnowledgeStatus(tenantId),
    getSeoAeoStats(tenantId),
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

    seoHealthScore: seoAeoStats.seoHealthScore,
    aeoScore: seoAeoStats.aeoScore,
    contentsWithSchema: seoAeoStats.contentsWithSchema,
    contentsWithFaq: seoAeoStats.contentsWithFaq,
    contentsOptimized: seoAeoStats.contentsOptimized,

    // GEO: 暂无持久化数据，初始为 0；后续接入 GeoMention 表
    geoMentionCount: 0,
    geoEnginesTracked: 4, // ChatGPT / Claude / Perplexity / Gemini
    geoLastCheckedAt: null,

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
    return { exists: false, version: 0, updatedAt: null, clustersCount: 0, contentMapCount: 0 };
  }

  let clustersCount = 0;
  let contentMapCount = 0;

  try {
    const content = latestVersion.content as { topicCluster?: { clusters?: Array<{ contentMap?: unknown[] }> } };
    const clusters = content?.topicCluster?.clusters || [];
    clustersCount = clusters.length;
    contentMapCount = clusters.reduce((sum, c) => sum + (c.contentMap?.length || 0), 0);
  } catch (error) {
    console.debug('[getTopicClusterStats] Parse error:', String(error));
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
    where: { tenantId, deletedAt: null, createdAt: { gte: since } },
    select: { status: true, updatedAt: true },
  });

  const stats: BriefsStats = { total: briefs.length, draft: 0, ready: 0, inProgress: 0, done: 0, lastUpdatedAt: null };

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
    prisma.seoContent.count({ where: { tenantId, deletedAt: null, createdAt: { gte: since } } }),
    prisma.seoContent.count({ where: { tenantId, deletedAt: null, status: 'published', createdAt: { gte: since } } }),
  ]);

  return { total, published, pending: total - published };
}

interface EvidenceStats {
  total: number;
  missingProof: number;
}

async function getEvidenceStats(tenantId: string): Promise<EvidenceStats> {
  const total = await prisma.evidence.count({ where: { tenantId, deletedAt: null } });
  // TODO: implement ClaimsVerification check
  return { total, missingProof: 0 };
}

interface PublishPacksStats {
  total: number;
  pending: number;
  published: number;
}

async function getPublishPacksStats(tenantId: string, since: Date): Promise<PublishPacksStats> {
  const packs = await prisma.artifactVersion.findMany({
    where: { tenantId, entityType: 'PublishPack', createdAt: { gte: since } },
    select: { status: true },
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
      select: { companyName: true, companyIntro: true, coreProducts: true },
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

  let completeness = 0;
  if (hasCompanyProfile) completeness += 40;
  if (hasPersonas) completeness += 30;
  if (hasEvidence) completeness += 30;

  return { completeness, hasCompanyProfile, hasPersonas, hasEvidence };
}

interface SeoAeoStats {
  seoHealthScore: number;
  aeoScore: number;
  contentsWithSchema: number;
  contentsWithFaq: number;
  contentsOptimized: number;
}

async function getSeoAeoStats(tenantId: string): Promise<SeoAeoStats> {
  // Derive SEO/AEO health from SeoContent metadata fields
  const contents = await prisma.seoContent.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      metaTitle: true,
      metaDescription: true,
      keywords: true,
      status: true,
    },
  });

  const total = contents.length;
  if (total === 0) {
    return { seoHealthScore: 0, aeoScore: 0, contentsWithSchema: 0, contentsWithFaq: 0, contentsOptimized: 0 };
  }

  // Contents with basic SEO metadata = "has schema proxy"
  const contentsWithSchema = contents.filter(c => c.metaTitle && c.metaDescription).length;
  // Contents with keywords array = "has FAQ proxy"
  const contentsWithFaq = contents.filter(c => Array.isArray(c.keywords) && (c.keywords as string[]).length >= 3).length;
  // Published + has meta = optimized
  const contentsOptimized = contents.filter(c => c.status === 'published' && c.metaTitle && c.metaDescription).length;

  const seoHealthScore = Math.round((contentsWithSchema / total) * 100);
  const aeoScore = Math.round((contentsWithFaq / total) * 100);

  return { seoHealthScore, aeoScore, contentsWithSchema, contentsWithFaq, contentsOptimized };
}

// ============================================
// 流水线步骤计算
// ============================================

function calculateSteps(counts: GrowthPipelineCounts): StepState[] {
  const steps: StepState[] = [];

  // Step 1: 主题集群
  let step1Status: StepStatus;
  let step1Blocker: string | undefined;
  if (counts.topicClusterExists && counts.topicClusterVersion >= 1) {
    step1Status = 'DONE';
  } else {
    step1Status = 'IN_PROGRESS';
    step1Blocker = '请生成主题集群以开始内容规划';
  }
  steps.push({ key: STEP_CONFIG[0].key, label: STEP_CONFIG[0].label, status: step1Status, blocker: step1Blocker, href: STEP_CONFIG[0].href, count: counts.clustersCount });

  // Step 2: 内容简报
  let step2Status: StepStatus;
  let step2Blocker: string | undefined;
  if (step1Status !== 'DONE') {
    step2Status = 'BLOCKED'; step2Blocker = '请先完成主题集群';
  } else if (counts.briefsTotal >= 1) {
    step2Status = 'DONE';
  } else {
    step2Status = 'IN_PROGRESS'; step2Blocker = '请基于主题集群生成内容简报';
  }
  steps.push({ key: STEP_CONFIG[1].key, label: STEP_CONFIG[1].label, status: step2Status, blocker: step2Blocker, href: STEP_CONFIG[1].href, count: counts.briefsTotal });

  // Step 3: 内容草稿
  let step3Status: StepStatus;
  let step3Blocker: string | undefined;
  if (step2Status === 'BLOCKED') {
    step3Status = 'BLOCKED'; step3Blocker = '请先完成内容简报';
  } else if (counts.draftsTotal >= 1) {
    step3Status = 'DONE';
  } else if (counts.briefsReady > 0 || counts.briefsDone > 0) {
    step3Status = 'IN_PROGRESS'; step3Blocker = `有 ${counts.briefsReady + counts.briefsDone} 个简报待生成草稿`;
  } else {
    step3Status = 'IN_PROGRESS'; step3Blocker = '请基于简报生成内容草稿';
  }
  steps.push({ key: STEP_CONFIG[2].key, label: STEP_CONFIG[2].label, status: step3Status, blocker: step3Blocker, href: STEP_CONFIG[2].href, count: counts.draftsTotal });

  // Step 4: 证据校验
  let step4Status: StepStatus;
  let step4Blocker: string | undefined;
  if (step3Status === 'BLOCKED') {
    step4Status = 'BLOCKED'; step4Blocker = '请先完成内容草稿';
  } else if (counts.missingProofCount === 0 && counts.draftsTotal > 0) {
    step4Status = 'DONE';
  } else if (counts.missingProofCount > 0) {
    step4Status = 'IN_PROGRESS'; step4Blocker = `${counts.missingProofCount} 条内容缺少证据支撑`;
  } else {
    step4Status = 'IN_PROGRESS'; step4Blocker = '请校验内容证据引用';
  }
  steps.push({ key: STEP_CONFIG[3].key, label: STEP_CONFIG[3].label, status: step4Status, blocker: step4Blocker, href: STEP_CONFIG[3].href, count: counts.evidenceCount });

  // Step 5: 发布推送
  let step5Status: StepStatus;
  let step5Blocker: string | undefined;
  if (step4Status === 'BLOCKED') {
    step5Status = 'BLOCKED'; step5Blocker = '请先完成证据校验';
  } else if (counts.publishPacksPublished >= 1) {
    step5Status = 'DONE';
  } else if (counts.publishPacksPending > 0) {
    step5Status = 'IN_PROGRESS'; step5Blocker = `${counts.publishPacksPending} 个发布包待审核`;
  } else if (counts.draftsPublished > 0) {
    step5Status = 'IN_PROGRESS'; step5Blocker = '请创建发布包';
  } else {
    step5Status = 'IN_PROGRESS'; step5Blocker = '请发布内容到目标渠道';
  }
  steps.push({ key: STEP_CONFIG[4].key, label: STEP_CONFIG[4].label, status: step5Status, blocker: step5Blocker, href: STEP_CONFIG[4].href, count: counts.publishPacksTotal });

  // Step 6: SEO/AEO 检测
  let step6Status: StepStatus;
  let step6Blocker: string | undefined;
  if (step5Status === 'BLOCKED') {
    step6Status = 'BLOCKED'; step6Blocker = '请先完成发布推送';
  } else if (counts.draftsTotal === 0) {
    step6Status = 'BLOCKED'; step6Blocker = '暂无内容可检测';
  } else if (counts.seoHealthScore >= 80 && counts.aeoScore >= 60) {
    step6Status = 'DONE';
  } else {
    step6Status = 'IN_PROGRESS';
    step6Blocker = counts.seoHealthScore < 80
      ? `SEO 健康度 ${counts.seoHealthScore}%，建议优化元数据`
      : `AEO 评分 ${counts.aeoScore}%，建议添加 FAQ 和语义三元组`;
  }
  steps.push({ key: STEP_CONFIG[5].key, label: STEP_CONFIG[5].label, status: step6Status, blocker: step6Blocker, href: STEP_CONFIG[5].href, count: counts.contentsOptimized });

  // Step 7: GEO 监控
  let step7Status: StepStatus;
  let step7Blocker: string | undefined;
  if (step6Status === 'BLOCKED') {
    step7Status = 'BLOCKED'; step7Blocker = '请先完成 SEO/AEO 检测';
  } else if (counts.geoMentionCount > 0) {
    step7Status = 'DONE';
  } else {
    step7Status = 'IN_PROGRESS';
    step7Blocker = counts.geoLastCheckedAt ? '尚未检测到 AI 引用，继续优化内容质量' : '开始追踪品牌在 AI 引擎中的引用情况';
  }
  steps.push({ key: STEP_CONFIG[6].key, label: STEP_CONFIG[6].label, status: step7Status, blocker: step7Blocker, href: STEP_CONFIG[6].href, count: counts.geoMentionCount });

  return steps;
}

function getCurrentStep(steps: StepState[]): number {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status !== 'DONE') return i + 1;
  }
  return steps.length;
}

function getPrimaryCTA(
  steps: StepState[],
  currentStep: number,
  counts: GrowthPipelineCounts
): PrimaryCTA {
  const step = steps[currentStep - 1];

  switch (step.key) {
    case 'topics':
      return counts.topicClusterExists
        ? { label: '批量生成简报', href: '/customer/marketing/briefs', action: 'batch_brief', disabled: false }
        : { label: '生成主题集群', href: '/customer/marketing/topics', action: 'generate', disabled: false };

    case 'briefs':
      return counts.briefsTotal === 0
        ? { label: '生成内容简报', href: '/customer/marketing/briefs', action: 'create_brief', disabled: step.status === 'BLOCKED', disabledReason: step.blocker }
        : { label: `处理简报 (${counts.briefsReady + counts.briefsDraft})`, href: '/customer/marketing/briefs', disabled: false };

    case 'drafts':
      return counts.briefsReady > 0
        ? { label: `生成草稿 (${counts.briefsReady})`, href: '/customer/marketing/contents', action: 'generate_draft', disabled: step.status === 'BLOCKED', disabledReason: step.blocker }
        : { label: '查看内容列表', href: '/customer/marketing/contents', disabled: false };

    case 'verify':
      return counts.missingProofCount > 0
        ? { label: `校验证据 (${counts.missingProofCount})`, href: '/customer/marketing/contents', action: 'verify_claims', disabled: step.status === 'BLOCKED', disabledReason: step.blocker }
        : { label: '查看内容', href: '/customer/marketing/contents', disabled: false };

    case 'publish':
      return counts.publishPacksPending > 0
        ? { label: `审核发布包 (${counts.publishPacksPending})`, href: '/customer/marketing/strategy', disabled: false }
        : { label: '创建发布包', href: '/customer/marketing/strategy', action: 'create_pack', disabled: step.status === 'BLOCKED', disabledReason: step.blocker };

    case 'seo-aeo':
      return { label: 'SEO/AEO 内容检测', href: '/customer/marketing/seo-aeo', action: 'run_audit', disabled: step.status === 'BLOCKED', disabledReason: step.blocker };

    case 'geo':
      return { label: 'GEO 发布中心', href: '/customer/marketing/geo-center', action: 'check_citations', disabled: step.status === 'BLOCKED', disabledReason: step.blocker };

    default:
      return { label: '开始内容增长', href: '/customer/marketing/topics', disabled: false };
  }
}

// ============================================
// 导出步骤配置
// ============================================

export const GROWTH_PIPELINE_STEPS = STEP_CONFIG;
export { STATS_WINDOW_DAYS };
