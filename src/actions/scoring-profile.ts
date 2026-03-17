'use server';

/**
 * 目标客户画像评分配置 - Server Actions
 *
 * 允许用户自定义评分规则，替代硬编码的评分逻辑
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { ScoringProfile, ScoringSignal, ExclusionSignal } from '@/types/scoring-profile';
import { DEFAULT_SCORING_PROFILE } from '@/types/scoring-profile';

const SCORING_KEY = 'scoringProfile';

/**
 * 获取评分配置
 *
 * 优先级：ICPSegment.criteria > 默认配置
 */
export async function getScoringProfile(segmentId?: string): Promise<ScoringProfile> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  // 如果指定了 segmentId，从该 segment 读取配置
  if (segmentId) {
    const segment = await prisma.iCPSegment.findFirst({
      where: { id: segmentId, tenantId: session.user.tenantId },
      select: { criteria: true },
    });

    if (segment?.criteria) {
      const criteria = segment.criteria as Record<string, unknown>;
      if (criteria[SCORING_KEY]) {
        return criteria[SCORING_KEY] as ScoringProfile;
      }
    }
  }

  // 否则从第一个 segment 读取，或返回默认配置
  const firstSegment = await prisma.iCPSegment.findFirst({
    where: { tenantId: session.user.tenantId },
    select: { criteria: true },
    orderBy: { order: 'asc' },
  });

  if (firstSegment?.criteria) {
    const criteria = firstSegment.criteria as Record<string, unknown>;
    if (criteria[SCORING_KEY]) {
      return criteria[SCORING_KEY] as ScoringProfile;
    }
  }

  return DEFAULT_SCORING_PROFILE;
}

/**
 * 保存评分配置
 *
 * 保存到指定的 ICPSegment.criteria 中
 */
export async function saveScoringProfile(
  profile: ScoringProfile,
  segmentId?: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId;

  // 确定目标 segment
  let targetSegmentId = segmentId;

  if (!targetSegmentId) {
    // 查找或创建默认 segment
    let segment = await prisma.iCPSegment.findFirst({
      where: { tenantId },
      orderBy: { order: 'asc' },
    });

    if (!segment) {
      // 创建默认 segment
      segment = await prisma.iCPSegment.create({
        data: {
          tenantId,
          name: '目标客户画像',
          description: '系统默认的目标客户细分',
          criteria: {},
        },
      });
    }

    targetSegmentId = segment.id;
  }

  // 验证 segment 归属
  const segment = await prisma.iCPSegment.findFirst({
    where: { id: targetSegmentId, tenantId },
    select: { criteria: true },
  });

  if (!segment) {
    throw new Error('Segment not found');
  }

  // 验证配置有效性
  const validation = validateScoringProfile(profile);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  // 更新 criteria
  const existingCriteria = (segment.criteria as Record<string, unknown>) || {};
  const updatedCriteria = {
    ...existingCriteria,
    [SCORING_KEY]: {
      ...profile,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.id,
    },
  };

  await prisma.iCPSegment.update({
    where: { id: targetSegmentId },
    data: { criteria: updatedCriteria as unknown as Record<string, never> },
  });

  // 同时更新关联的 RadarSearchProfile 的 negativeKeywords
  await syncToRadarSearchProfile(tenantId, profile);

  return { success: true, message: '评分配置已保存' };
}

/**
 * 添加正向信号
 */
export async function addPositiveSignal(
  signal: Omit<ScoringSignal, 'id'>,
  segmentId?: string
): Promise<{ success: boolean; signal?: ScoringSignal; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  const newSignal: ScoringSignal = {
    ...signal,
    id: `signal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  profile.positiveSignals.push(newSignal);

  const result = await saveScoringProfile(profile, segmentId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, signal: newSignal };
}

/**
 * 更新正向信号
 */
export async function updatePositiveSignal(
  signalId: string,
  updates: Partial<ScoringSignal>,
  segmentId?: string
): Promise<{ success: boolean; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  const index = profile.positiveSignals.findIndex(s => s.id === signalId);
  if (index === -1) {
    return { success: false, message: '信号未找到' };
  }

  profile.positiveSignals[index] = {
    ...profile.positiveSignals[index],
    ...updates,
  };

  const result = await saveScoringProfile(profile, segmentId);
  return { success: result.success, message: result.message };
}

/**
 * 删除正向信号
 */
export async function deletePositiveSignal(
  signalId: string,
  segmentId?: string
): Promise<{ success: boolean; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  profile.positiveSignals = profile.positiveSignals.filter(s => s.id !== signalId);

  const result = await saveScoringProfile(profile, segmentId);
  return { success: result.success, message: result.message };
}

/**
 * 添加负向信号
 */
export async function addNegativeSignal(
  signal: Omit<ExclusionSignal, 'id'>,
  segmentId?: string
): Promise<{ success: boolean; signal?: ExclusionSignal; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  const newSignal: ExclusionSignal = {
    ...signal,
    id: `exclude-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  profile.negativeSignals.push(newSignal);

  const result = await saveScoringProfile(profile, segmentId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, signal: newSignal };
}

/**
 * 更新负向信号
 */
export async function updateNegativeSignal(
  signalId: string,
  updates: Partial<ExclusionSignal>,
  segmentId?: string
): Promise<{ success: boolean; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  const index = profile.negativeSignals.findIndex(s => s.id === signalId);
  if (index === -1) {
    return { success: false, message: '信号未找到' };
  }

  profile.negativeSignals[index] = {
    ...profile.negativeSignals[index],
    ...updates,
  };

  const result = await saveScoringProfile(profile, segmentId);
  return { success: result.success, message: result.message };
}

/**
 * 删除负向信号
 */
export async function deleteNegativeSignal(
  signalId: string,
  segmentId?: string
): Promise<{ success: boolean; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  profile.negativeSignals = profile.negativeSignals.filter(s => s.id !== signalId);

  const result = await saveScoringProfile(profile, segmentId);
  return { success: result.success, message: result.message };
}

/**
 * 更新阈值配置
 */
export async function updateThresholds(
  thresholds: { tierA?: number; tierB?: number },
  segmentId?: string
): Promise<{ success: boolean; message?: string }> {
  const profile = await getScoringProfile(segmentId);

  if (thresholds.tierA !== undefined) {
    profile.thresholds.tierA = thresholds.tierA;
  }
  if (thresholds.tierB !== undefined) {
    profile.thresholds.tierB = thresholds.tierB;
  }

  // 验证：tierA >= tierB
  if (profile.thresholds.tierA < profile.thresholds.tierB) {
    return { success: false, message: 'A级阈值必须大于等于B级阈值' };
  }

  const result = await saveScoringProfile(profile, segmentId);
  return { success: result.success, message: result.message };
}

/**
 * 重置为默认配置
 */
export async function resetScoringProfile(
  segmentId?: string
): Promise<{ success: boolean; message: string }> {
  return saveScoringProfile(DEFAULT_SCORING_PROFILE, segmentId);
}

/**
 * 应用预设模板
 */
export async function applyScoringTemplate(
  templateId: string,
  segmentId?: string
): Promise<{ success: boolean; message: string }> {
  const { SCORING_TEMPLATES } = await import('@/types/scoring-profile');

  const template = SCORING_TEMPLATES[templateId];
  if (!template) {
    return { success: false, message: '模板未找到' };
  }

  return saveScoringProfile(template.profile, segmentId);
}

// ==================== Helper Functions ====================

/**
 * 验证评分配置有效性
 */
function validateScoringProfile(profile: ScoringProfile): { valid: boolean; message: string } {
  if (!profile.positiveSignals || !Array.isArray(profile.positiveSignals)) {
    return { valid: false, message: '正向信号配置无效' };
  }

  if (!profile.negativeSignals || !Array.isArray(profile.negativeSignals)) {
    return { valid: false, message: '负向信号配置无效' };
  }

  // 检查权重范围
  for (const signal of profile.positiveSignals) {
    if (signal.weight < 0 || signal.weight > 20) {
      return { valid: false, message: `信号"${signal.name}"的权重必须在 0-20 之间` };
    }
    if (!signal.keywords || signal.keywords.length === 0) {
      return { valid: false, message: `信号"${signal.name}"必须包含至少一个关键词` };
    }
  }

  // 检查阈值
  if (profile.thresholds.tierA < profile.thresholds.tierB) {
    return { valid: false, message: 'A级阈值必须大于等于B级阈值' };
  }

  return { valid: true, message: '' };
}

/**
 * 同步到 RadarSearchProfile
 *
 * 将负向关键词同步到扫描配置中
 */
async function syncToRadarSearchProfile(
  tenantId: string,
  profile: ScoringProfile
): Promise<void> {
  try {
    // 收集所有负向关键词
    const negativeKeywords = profile.negativeSignals.flatMap(s => s.keywords);

    // 更新所有活跃的 RadarSearchProfile
    await prisma.radarSearchProfile.updateMany({
      where: { tenantId, isActive: true },
      data: {
        negativeKeywords,
      },
    });
  } catch (error) {
    console.error('[syncToRadarSearchProfile] Error:', error);
    // 静默失败，不影响主流程
  }
}