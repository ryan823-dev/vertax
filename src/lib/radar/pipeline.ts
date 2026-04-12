/**
 * 获客雷达流水线状态计算
 * 
 * 五步流程：画像与规则 → 数据源与渠道 → 持续扫描运行 → 候选分层 → 导入线索与外联
 * 统一封装所有口径与阈值，后续好改
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
}

export interface RadarPipelineCounts {
  // Profiles & Sources
  profilesActiveCount: number;       // isActive = true 的搜索配置数
  sourcesConfiguredCount: number;    // 全部配置的数据源数量
  
  // Candidates 7-day metrics
  candidatesNew7d: number;           // 过去7天新增候选
  candidatesQualifiedAB7d: number;   // 过去7天 QUALIFIED + tier=A/B
  candidatesImported7d: number;      // 过去7天 IMPORTED
  candidatesEnriching: number;       // 当前 ENRICHING 状态
  
  // Scan status
  lastScanAt: Date | null;           // 最近一次扫描时间
  lastErrorBrief: string | null;     // 最近错误摘要
  
  // Approval & Pending
  pendingReviewCount: number;        // 待审核(NEW)数量
  pendingApprovalsCount: number;     // REVIEWING 状态数量
  enrichPendingCount: number;        // 等待详情补全数量
  
  // Targeting Spec
  targetingSpecExists: boolean;      // 是否有画像规则
  targetingSpecFresh: boolean;       // 是否在30天内更新
  targetingSpecUpdatedAt: Date | null;
  
  // OutreachPack
  outreachPackGenerated7d: number;   // 7天内生成外联包数量
  
  // Meta
  lastUpdatedAt: Date | null;
}

export interface PrimaryCTA {
  label: string;
  href: string;
  disabled: boolean;
  disabledReason?: string;
}

export interface RadarPipelineStatus {
  steps: StepState[];
  counts: RadarPipelineCounts;
  currentStep: number;               // 1-5，当前应该关注的步骤
  primaryCTA: PrimaryCTA;
  errors: string[];                  // 近期扫描错误列表
}

// ============================================
// 配置常量
// ============================================

/** TargetingSpec 新鲜度（天） */
const TARGETING_SPEC_FRESHNESS_DAYS = 30;

/** 扫描活跃阈值（小时） */
const SCAN_ACTIVE_HOURS = 24;

/** 统计时间窗口（天） */
const STATS_WINDOW_DAYS = 7;

/** 步骤定义 */
const STEP_CONFIG = [
  { key: 'targeting', label: '画像与规则', href: '/customer/knowledge/profiles' },
  { key: 'sources', label: '数据源与渠道', href: '/customer/radar/channels' },
  { key: 'scheduler', label: '持续扫描运行', href: '/customer/radar/tasks' },
  { key: 'qualify', label: '候选分层', href: '/customer/radar/candidates' },
  { key: 'import', label: '导入线索与外联', href: '/customer/radar/prospects' },
] as const;

// ============================================
// 主函数
// ============================================

/**
 * 获取获客雷达流水线状态
 */
export async function getRadarPipelineStatus(tenantId: string): Promise<RadarPipelineStatus> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - TARGETING_SPEC_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - SCAN_ACTIVE_HOURS * 60 * 60 * 1000);

  // 并行获取所有计数
  const [
    profilesResult,
    sourcesCount,
    candidatesStats,
    scanCursors,
    companyProfile,
    personasCount,
    recentErrors,
    outreachPack7d,
  ] = await Promise.all([
    // 搜索配置统计
    getProfilesStats(tenantId),
    // 可用数据源数量
    prisma.radarSource.count({
      where: {
        OR: [
          { tenantId: null },  // 系统公共源
          { tenantId },        // 租户私有源
        ],
        isEnabled: true,
      },
    }),
    // 候选统计
    getCandidatesStats(tenantId, sevenDaysAgo),
    // 扫描游标（获取最近扫描时间）
    prisma.radarScanCursor.findMany({
      where: {
        profileId: {
          in: await getActiveProfileIds(tenantId),
        },
      },
      orderBy: { lastScanAt: 'desc' },
      take: 10,
    }),
    // 企业档案（作为 TargetingSpec 的来源）
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        id: true,
        targetIndustries: true,
        targetRegions: true,
        buyerPersonas: true,
        updatedAt: true,
      },
    }),
    // Persona 数量
    prisma.persona.count({
      where: { tenantId },
    }),
    // 近期扫描错误
    getRecentErrors(tenantId),
    // 7天内发送的外联邮件数（OutreachRecord）
    prisma.outreachRecord.count({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  // 计算 TargetingSpec 状态
  const hasTargetingSpec = !!(
    companyProfile &&
    (
      (Array.isArray(companyProfile.targetIndustries) && (companyProfile.targetIndustries as unknown[]).length > 0) ||
      (Array.isArray(companyProfile.targetRegions) && (companyProfile.targetRegions as unknown[]).length > 0) ||
      personasCount > 0
    )
  );
  
  const targetingSpecFresh = companyProfile?.updatedAt 
    ? companyProfile.updatedAt > thirtyDaysAgo 
    : false;

  // 最近扫描时间
  const lastScanAt = scanCursors.length > 0 
    ? scanCursors.reduce((latest, cursor) => {
        if (!cursor.lastScanAt) return latest;
        return !latest || cursor.lastScanAt > latest ? cursor.lastScanAt : latest;
      }, null as Date | null)
    : null;

  // 扫描是否活跃
  const scanActive = lastScanAt ? lastScanAt > twentyFourHoursAgo : false;

  // 构建 counts
  const counts: RadarPipelineCounts = {
    profilesActiveCount: profilesResult.activeCount,
    sourcesConfiguredCount: sourcesCount,
    candidatesNew7d: candidatesStats.new7d,
    candidatesQualifiedAB7d: candidatesStats.qualifiedAB7d,
    candidatesImported7d: candidatesStats.imported7d,
    candidatesEnriching: candidatesStats.enriching,
    lastScanAt,
    lastErrorBrief: recentErrors.length > 0 ? recentErrors[0] : null,
    pendingReviewCount: candidatesStats.pendingReview,
    pendingApprovalsCount: candidatesStats.reviewing,
    enrichPendingCount: candidatesStats.enriching,
    targetingSpecExists: hasTargetingSpec,
    targetingSpecFresh,
    targetingSpecUpdatedAt: companyProfile?.updatedAt || null,
    outreachPackGenerated7d: outreachPack7d,
    lastUpdatedAt: lastScanAt,
  };

  // 计算每一步状态
  const steps = calculateSteps(counts, profilesResult, scanActive);

  // 确定当前步骤
  const currentStep = getCurrentStep(steps);

  // 生成主 CTA
  const primaryCTA = getPrimaryCTA(steps, currentStep, counts);

  return { steps, counts, currentStep, primaryCTA, errors: recentErrors };
}

// ============================================
// 辅助函数
// ============================================

interface ProfilesStats {
  activeCount: number;
  hasSourcesConfigured: boolean;
  hasScheduled: boolean;
}

async function getProfilesStats(tenantId: string): Promise<ProfilesStats> {
  const profiles = await prisma.radarSearchProfile.findMany({
    where: { tenantId },
    select: {
      id: true,
      isActive: true,
      sourceIds: true,
      nextRunAt: true,
    },
  });

  const activeCount = profiles.filter(p => p.isActive).length;
  const hasSourcesConfigured = profiles.some(p => p.sourceIds.length > 0);
  const hasScheduled = profiles.some(p => p.isActive && p.nextRunAt !== null);

  return { activeCount, hasSourcesConfigured, hasScheduled };
}

async function getActiveProfileIds(tenantId: string): Promise<string[]> {
  const profiles = await prisma.radarSearchProfile.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
  });
  return profiles.map(p => p.id);
}

interface CandidatesStats {
  new7d: number;
  qualifiedAB7d: number;
  imported7d: number;
  enriching: number;
  pendingReview: number;
  reviewing: number;
}

async function getCandidatesStats(tenantId: string, since: Date): Promise<CandidatesStats> {
  // 并行查询各类统计
  const [new7d, qualifiedAB7d, imported7d, enriching, pendingReview, reviewing] = await Promise.all([
    // 7天内新增
    prisma.radarCandidate.count({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
    }),
    // 7天内 QUALIFIED + tier A/B
    prisma.radarCandidate.count({
      where: {
        tenantId,
        status: 'QUALIFIED',
        qualifyTier: { in: ['A', 'B'] },
        qualifiedAt: { gte: since },
      },
    }),
    // 7天内 IMPORTED
    prisma.radarCandidate.count({
      where: {
        tenantId,
        status: 'IMPORTED',
        importedAt: { gte: since },
      },
    }),
    // 当前 ENRICHING
    prisma.radarCandidate.count({
      where: {
        tenantId,
        status: 'ENRICHING',
      },
    }),
    // NEW 状态待审核
    prisma.radarCandidate.count({
      where: {
        tenantId,
        status: 'NEW',
      },
    }),
    // REVIEWING 状态
    prisma.radarCandidate.count({
      where: {
        tenantId,
        status: 'REVIEWING',
      },
    }),
  ]);

  return { new7d, qualifiedAB7d, imported7d, enriching, pendingReview, reviewing };
}

async function getRecentErrors(tenantId: string): Promise<string[]> {
  // 从 RadarScanCursor 获取近期错误
  const cursorsWithErrors = await prisma.radarScanCursor.findMany({
    where: {
      profileId: {
        in: await getActiveProfileIds(tenantId),
      },
      lastError: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { lastError: true },
  });

  return cursorsWithErrors
    .map(c => c.lastError)
    .filter((e): e is string => e !== null);
}

function calculateSteps(
  counts: RadarPipelineCounts, 
  profilesResult: ProfilesStats,
  scanActive: boolean
): StepState[] {
  const steps: StepState[] = [];

  // Step 1: 画像与规则 (TargetingSpec)
  // DONE: 有有效画像且30天内更新
  // IN_PROGRESS: 有画像但超30天
  // BLOCKED: 无画像
  let step1Status: StepStatus;
  let step1Blocker: string | undefined;
  
  if (counts.targetingSpecExists && counts.targetingSpecFresh) {
    step1Status = 'DONE';
  } else if (counts.targetingSpecExists && !counts.targetingSpecFresh) {
    step1Status = 'IN_PROGRESS';
    step1Blocker = '画像已超过30天未更新，建议同步最新知识';
  } else {
    step1Status = 'BLOCKED';
    step1Blocker = '请先在知识引擎中生成买家画像';
  }
  
  steps.push({
    key: STEP_CONFIG[0].key,
    label: STEP_CONFIG[0].label,
    status: step1Status,
    blocker: step1Blocker,
    href: STEP_CONFIG[0].href,
  });

  // Step 2: 数据源与渠道 (Profile × Source)
  // DONE: 有激活的 Profile 且配置了 sourceIds >= 1
  // IN_PROGRESS: 有 Profile 但没配置源
  // BLOCKED: 无 Profile 或 Step1 未完成
  let step2Status: StepStatus;
  let step2Blocker: string | undefined;
  
  if (profilesResult.activeCount >= 1) {
    step2Status = 'DONE';
  } else if (step1Status === 'BLOCKED') {
    step2Status = 'BLOCKED';
    step2Blocker = '请先完成画像配置';
  } else if (profilesResult.activeCount === 0) {
    step2Status = 'IN_PROGRESS';
    step2Blocker = '请创建并激活搜索配置';
  } else if (!profilesResult.hasSourcesConfigured) {
    step2Status = 'IN_PROGRESS';
    step2Blocker = '请为搜索配置选择数据源';
  } else {
    step2Status = 'IN_PROGRESS';
  }
  
  steps.push({
    key: STEP_CONFIG[1].key,
    label: STEP_CONFIG[1].label,
    status: step2Status,
    blocker: step2Blocker,
    href: STEP_CONFIG[1].href,
  });

  // Step 3: 持续扫描运行 (Scheduler)
  // DONE: nextRunAt 有值 且 lastScanAt 在24小时内
  // IN_PROGRESS: 已配置但未运行或运行超时
  // BLOCKED: Step2 未完成
  let step3Status: StepStatus;
  let step3Blocker: string | undefined;
  
  if (step2Status !== 'DONE') {
    step3Status = 'BLOCKED';
    step3Blocker = '请先配置数据源与渠道';
  } else if (profilesResult.hasScheduled && scanActive) {
    step3Status = 'DONE';
  } else if (profilesResult.hasScheduled && !scanActive) {
    step3Status = 'IN_PROGRESS';
    step3Blocker = '扫描已超过24小时未运行';
  } else {
    step3Status = 'IN_PROGRESS';
    step3Blocker = '请启用定时扫描';
  }
  
  steps.push({
    key: STEP_CONFIG[2].key,
    label: STEP_CONFIG[2].label,
    status: step3Status,
    blocker: step3Blocker,
    href: STEP_CONFIG[2].href,
  });

  // Step 4: 候选分层 (Qualify)
  // DONE: 7天内有 QUALIFIED (tier A/B) >= 1
  // IN_PROGRESS: 有候选但未分层
  // BLOCKED: 无候选或 Step3 未完成
  let step4Status: StepStatus;
  let step4Blocker: string | undefined;
  
  if (step3Status === 'BLOCKED') {
    step4Status = 'BLOCKED';
    step4Blocker = '请先启动扫描任务';
  } else if (counts.candidatesQualifiedAB7d >= 1) {
    step4Status = 'DONE';
  } else if (counts.candidatesNew7d > 0 || counts.pendingReviewCount > 0) {
    step4Status = 'IN_PROGRESS';
    step4Blocker = `有 ${counts.pendingReviewCount} 个候选待分层`;
  } else {
    step4Status = 'IN_PROGRESS';
    step4Blocker = '等待扫描发现新候选';
  }
  
  steps.push({
    key: STEP_CONFIG[3].key,
    label: STEP_CONFIG[3].label,
    status: step4Status,
    blocker: step4Blocker,
    href: STEP_CONFIG[3].href,
  });

  // Step 5: 导入线索与外联 (Import)
  // DONE: 7天内 IMPORTED >= 1 OR 生成过 OutreachPack
  // IN_PROGRESS: 有 QUALIFIED 但未导入
  // BLOCKED: 无 QUALIFIED 或 Step4 未完成
  let step5Status: StepStatus;
  let step5Blocker: string | undefined;
  
  if (step4Status === 'BLOCKED') {
    step5Status = 'BLOCKED';
    step5Blocker = '请先完成候选分层';
  } else if (counts.candidatesImported7d >= 1 || counts.outreachPackGenerated7d >= 1) {
    step5Status = 'DONE';
  } else if (counts.candidatesQualifiedAB7d > 0) {
    step5Status = 'IN_PROGRESS';
    step5Blocker = `有 ${counts.candidatesQualifiedAB7d} 个高质量候选可导入`;
  } else {
    step5Status = 'IN_PROGRESS';
    step5Blocker = '等待候选分层完成';
  }
  
  steps.push({
    key: STEP_CONFIG[4].key,
    label: STEP_CONFIG[4].label,
    status: step5Status,
    blocker: step5Blocker,
    href: STEP_CONFIG[4].href,
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
  counts: RadarPipelineCounts
): PrimaryCTA {
  const step = steps[currentStep - 1];
  
  // 根据当前步骤生成 CTA
  switch (step.key) {
    case 'targeting':
      if (step.status === 'BLOCKED') {
        return {
          label: '生成买家画像',
          href: '/customer/knowledge/profiles',
          disabled: false,
        };
      }
      return {
        label: '同步最新画像',
        href: '/customer/knowledge/profiles',
        disabled: false,
      };
      
    case 'sources':
      if (counts.profilesActiveCount === 0) {
        return {
          label: '创建搜索配置',
          href: '/customer/radar/tasks',
          disabled: step.status === 'BLOCKED',
          disabledReason: step.blocker,
        };
      }
      return {
        label: '配置数据源',
        href: '/customer/radar/channels',
        disabled: step.status === 'BLOCKED',
        disabledReason: step.blocker,
      };
      
    case 'scheduler':
      return {
        label: '启动扫描',
        href: '/customer/radar/tasks',
        disabled: step.status === 'BLOCKED',
        disabledReason: step.blocker,
      };
      
    case 'qualify':
      if (counts.pendingReviewCount > 0) {
        return {
          label: `分层候选 (${counts.pendingReviewCount})`,
          href: '/customer/radar/candidates?status=NEW',
          disabled: false,
        };
      }
      return {
        label: '查看候选池',
        href: '/customer/radar/candidates',
        disabled: step.status === 'BLOCKED',
        disabledReason: step.blocker,
      };
      
    case 'import':
      if (counts.candidatesQualifiedAB7d > 0) {
        return {
          label: `导入线索 (${counts.candidatesQualifiedAB7d})`,
          href: '/customer/radar/candidates?status=QUALIFIED&tier=A,B',
          disabled: false,
        };
      }
      return {
        label: '查看线索库',
        href: '/customer/radar/prospects',
        disabled: step.status === 'BLOCKED',
        disabledReason: step.blocker,
      };
      
    default:
      return {
        label: '开始获客',
        href: '/customer/radar',
        disabled: false,
      };
  }
}

// ============================================
// 导出步骤配置（供 Stepper 组件使用）
// ============================================

export const RADAR_PIPELINE_STEPS = STEP_CONFIG;
export { 
  TARGETING_SPEC_FRESHNESS_DAYS, 
  SCAN_ACTIVE_HOURS, 
  STATS_WINDOW_DAYS 
};
