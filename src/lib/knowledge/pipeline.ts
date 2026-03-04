/**
 * 知识引擎流水线状态计算
 * 
 * 统一封装所有口径与阈值，后续好改
 * 不改数据库结构；复用现有模型/字段
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

export interface PipelineCounts {
  // Assets
  assetsTotal: number;
  assetsProcessing: number;
  assetsParsed: number;      // status = 'active' 且有 chunks
  assetsFailed: number;
  // Evidence
  evidenceCount: number;
  // Company Profile
  companyProfileExists: boolean;
  companyProfileHasContent: boolean;
  // Personas & Guidelines
  personasCount: number;
  guidelinesCount: number;
  // Meta
  lastUpdatedAt: Date | null;
}

export interface PipelineStatus {
  steps: StepState[];
  counts: PipelineCounts;
  currentStep: number; // 1-5，当前应该关注的步骤
}

// ============================================
// 配置常量
// ============================================

/** 证据数量达标阈值 */
const EVIDENCE_THRESHOLD = 3;

/** 步骤定义 */
const STEP_CONFIG = [
  { key: 'upload', label: '上传资料', href: '/c/knowledge/assets' },
  { key: 'parse', label: '解析入库', href: '/c/knowledge/assets' },
  { key: 'evidence', label: '抽取证据', href: '/c/knowledge/evidence' },
  { key: 'profile', label: '生成企业档案', href: '/c/knowledge/company' },
  { key: 'persona', label: '更新画像/规范', href: '/c/knowledge/profiles' },
] as const;

// ============================================
// 主函数
// ============================================

/**
 * 获取知识引擎流水线状态
 */
export async function getKnowledgePipelineStatus(tenantId: string): Promise<PipelineStatus> {
  // 并行获取所有计数
  const [
    assetsResult,
    evidenceCount,
    companyProfile,
    personasCount,
    guidelinesCount,
    lastActivity,
  ] = await Promise.all([
    // 素材统计（按状态分组）
    getAssetCounts(tenantId),
    // 证据数量
    prisma.evidence.count({
      where: { tenantId, deletedAt: null },
    }),
    // 企业档案
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        id: true,
        companyName: true,
        companyIntro: true,
        coreProducts: true,
        updatedAt: true,
      },
    }),
    // Persona 数量
    prisma.persona.count({
      where: { tenantId },
    }),
    // Guideline 数量
    prisma.brandGuideline.count({
      where: { tenantId },
    }),
    // 最近更新时间
    getLastUpdatedAt(tenantId),
  ]);

  // 构建 counts
  const counts: PipelineCounts = {
    assetsTotal: assetsResult.total,
    assetsProcessing: assetsResult.processing,
    assetsParsed: assetsResult.parsed,
    assetsFailed: assetsResult.failed,
    evidenceCount,
    companyProfileExists: !!companyProfile,
    companyProfileHasContent: !!(
      companyProfile?.companyName ||
      companyProfile?.companyIntro ||
      (Array.isArray(companyProfile?.coreProducts) && 
       (companyProfile.coreProducts as unknown[]).length > 0)
    ),
    personasCount,
    guidelinesCount,
    lastUpdatedAt: lastActivity,
  };

  // 计算每一步状态
  const steps = calculateSteps(counts);

  // 确定当前步骤
  const currentStep = getCurrentStep(steps);

  return { steps, counts, currentStep };
}

// ============================================
// 辅助函数
// ============================================

interface AssetCounts {
  total: number;
  processing: number;
  parsed: number;
  failed: number;
}

async function getAssetCounts(tenantId: string): Promise<AssetCounts> {
  // 获取所有素材
  const assets = await prisma.asset.findMany({
    where: { 
      tenantId, 
      deletedAt: null,
      fileCategory: 'document', // 只统计文档类
    },
    select: {
      id: true,
      status: true,
      _count: {
        select: { chunks: true },
      },
    },
  });

  const total = assets.length;
  let processing = 0;
  let parsed = 0;
  let failed = 0;

  for (const asset of assets) {
    // 有 chunks 的视为已解析
    if (asset._count.chunks > 0) {
      parsed++;
    } else if (asset.status === 'uploading') {
      processing++;
    } else if (asset.status === 'active' && asset._count.chunks === 0) {
      // active 但没有 chunks，可能是待处理或失败
      // 这里暂时算作 processing（后续可根据具体业务细化）
      processing++;
    }
    // 注意：Asset 模型没有明确的 failed 状态
    // 如果有 metadata 字段记录处理错误，可以在这里检查
  }

  return { total, processing, parsed, failed };
}

async function getLastUpdatedAt(tenantId: string): Promise<Date | null> {
  // 获取各个实体的最后更新时间
  const [latestAsset, latestEvidence, profile, latestGuideline, latestPersona] = await Promise.all([
    prisma.asset.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.evidence.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: { updatedAt: true },
    }),
    prisma.brandGuideline.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.persona.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);

  const dates = [
    latestAsset?.updatedAt,
    latestEvidence?.updatedAt,
    profile?.updatedAt,
    latestGuideline?.updatedAt,
    latestPersona?.updatedAt,
  ].filter(Boolean) as Date[];

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

function calculateSteps(counts: PipelineCounts): StepState[] {
  const steps: StepState[] = [];

  // Step 1: 上传资料
  const step1Status: StepStatus = counts.assetsTotal >= 1 ? 'DONE' : 'IN_PROGRESS';
  steps.push({
    key: STEP_CONFIG[0].key,
    label: STEP_CONFIG[0].label,
    status: step1Status,
    href: STEP_CONFIG[0].href,
  });

  // Step 2: 解析入库
  let step2Status: StepStatus;
  let step2Blocker: string | undefined;
  
  if (counts.assetsParsed >= 1) {
    step2Status = 'DONE';
  } else if (counts.assetsTotal === 0) {
    step2Status = 'BLOCKED';
    step2Blocker = '请先上传资料';
  } else if (counts.assetsProcessing > 0) {
    step2Status = 'IN_PROGRESS';
  } else if (counts.assetsFailed === counts.assetsTotal && counts.assetsTotal > 0) {
    step2Status = 'BLOCKED';
    step2Blocker = '解析失败，请重试或重新上传';
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

  // Step 3: 抽取证据
  let step3Status: StepStatus;
  let step3Blocker: string | undefined;
  
  if (counts.evidenceCount >= EVIDENCE_THRESHOLD) {
    step3Status = 'DONE';
  } else if (counts.assetsParsed === 0) {
    step3Status = 'BLOCKED';
    step3Blocker = '请先完成资料解析';
  } else {
    step3Status = 'IN_PROGRESS';
  }
  
  steps.push({
    key: STEP_CONFIG[2].key,
    label: STEP_CONFIG[2].label,
    status: step3Status,
    blocker: step3Blocker,
    href: STEP_CONFIG[2].href,
  });

  // Step 4: 生成企业档案
  let step4Status: StepStatus;
  let step4Blocker: string | undefined;
  
  if (counts.companyProfileHasContent) {
    step4Status = 'DONE';
  } else if (counts.assetsParsed === 0 && counts.evidenceCount === 0) {
    step4Status = 'BLOCKED';
    step4Blocker = '请先上传资料或抽取证据';
  } else {
    step4Status = 'IN_PROGRESS';
  }
  
  steps.push({
    key: STEP_CONFIG[3].key,
    label: STEP_CONFIG[3].label,
    status: step4Status,
    blocker: step4Blocker,
    href: STEP_CONFIG[3].href,
  });

  // Step 5: 更新画像/规范
  let step5Status: StepStatus;
  let step5Blocker: string | undefined;
  
  if (counts.personasCount >= 1 || counts.guidelinesCount >= 1) {
    step5Status = 'DONE';
  } else if (!counts.companyProfileHasContent) {
    step5Status = 'BLOCKED';
    step5Blocker = '请先生成企业档案';
  } else {
    step5Status = 'IN_PROGRESS';
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

// ============================================
// 导出步骤配置（供 Stepper 组件使用）
// ============================================

export const PIPELINE_STEPS = STEP_CONFIG;
export { EVIDENCE_THRESHOLD };
