/**
 * 意图信号追踪服务
 *
 * 追踪外联邮件打开/点击，识别高意向客户
 *
 * 功能：
 * - 邮件打开追踪
 * - 链接点击追踪
 * - 官网访客识别（IP反查公司）
 * - 意图评分计算
 * - 高意向自动提醒
 */

import { prisma } from '@/lib/prisma';

// ==================== 类型定义 ====================

export type SignalType =
  | 'email_open'      // 邮件打开
  | 'email_click'     // 链接点击
  | 'website_visit'   // 网站访问
  | 'pricing_view'    // 定价页访问
  | 'demo_request';   // 演示请求

export interface IntentSignalInput {
  tenantId: string;
  candidateId?: string;
  companyId?: string;
  contactId?: string;
  signalType: SignalType;
  intensity?: number;
  score?: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  page?: string;
  referrer?: string;
  occurredAt?: Date;
}

export interface IntentScore {
  candidateId?: string;
  companyId?: string;
  totalScore: number;
  scoreLevel: 'low' | 'medium' | 'high' | 'critical';
  signalCount: number;
  recentSignals: number; // 7天内
  topSignals: Array<{
    type: string;
    score: number;
    occurredAt: Date;
  }>;
  recommendedAction?: string;
}

// 信号类型默认分数
const SIGNAL_SCORES: Record<SignalType, { intensity: number; score: number }> = {
  email_open: { intensity: 0.3, score: 10 },
  email_click: { intensity: 0.6, score: 25 },
  website_visit: { intensity: 0.3, score: 10 },
  pricing_view: { intensity: 0.7, score: 30 },
  demo_request: { intensity: 0.9, score: 50 },
};

// ==================== 核心功能 ====================

/**
 * 记录意图信号
 */
export async function trackIntentSignal(input: IntentSignalInput): Promise<string | null> {
  try {
    const signalConfig = SIGNAL_SCORES[input.signalType] || { intensity: 0.5, score: 15 };

    const signal = await prisma.intentSignal.create({
      data: {
        tenantId: input.tenantId,
        candidateId: input.candidateId,
        companyId: input.companyId,
        contactId: input.contactId,
        signalType: input.signalType,
        intensity: input.intensity ?? signalConfig.intensity,
        score: input.score ?? signalConfig.score,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        page: input.page,
        referrer: input.referrer,
        occurredAt: input.occurredAt || new Date(),
      },
    });

    // 高意向信号触发提醒
    if (signal.score >= 30) {
      await createIntentAlert(input.tenantId, {
        candidateId: input.candidateId,
        companyId: input.companyId,
        signalType: input.signalType,
        score: signal.score,
      });
    }

    return signal.id;
  } catch (error) {
    console.error('[IntentTracking] trackIntentSignal error:', error);
    return null;
  }
}

/**
 * 批量记录邮件打开事件（来自Resend webhook）
 */
export async function trackEmailOpens(
  tenantId: string,
  events: Array<{
    emailId: string;
    candidateId?: string;
    companyId?: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }>
): Promise<number> {
  let tracked = 0;

  for (const event of events) {
    const id = await trackIntentSignal({
      tenantId,
      candidateId: event.candidateId,
      companyId: event.companyId,
      signalType: 'email_open',
      metadata: { emailId: event.emailId },
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      occurredAt: event.timestamp,
    });

    if (id) tracked++;
  }

  return tracked;
}

/**
 * 批量记录链接点击事件
 */
export async function trackEmailClicks(
  tenantId: string,
  events: Array<{
    emailId: string;
    candidateId?: string;
    companyId?: string;
    link: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }>
): Promise<number> {
  let tracked = 0;

  for (const event of events) {
    const id = await trackIntentSignal({
      tenantId,
      candidateId: event.candidateId,
      companyId: event.companyId,
      signalType: 'email_click',
      metadata: { emailId: event.emailId, link: event.link },
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      occurredAt: event.timestamp,
    });

    if (id) tracked++;
  }

  return tracked;
}

/**
 * 计算意图评分
 */
export async function calculateIntentScore(
  tenantId: string,
  options: { candidateId?: string; companyId?: string; days?: number }
): Promise<IntentScore | null> {
  const { candidateId, companyId, days = 30 } = options;

  if (!candidateId && !companyId) {
    return null;
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: { tenantId: string; occurredAt: { gte: Date }; candidateId?: string; companyId?: string } = {
      tenantId,
      occurredAt: { gte: startDate },
    };

    if (candidateId) where.candidateId = candidateId;
    if (companyId) where.companyId = companyId;

    const signals = await prisma.intentSignal.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
    });

    if (signals.length === 0) {
      return {
        candidateId,
        companyId,
        totalScore: 0,
        scoreLevel: 'low',
        signalCount: 0,
        recentSignals: 0,
        topSignals: [],
        recommendedAction: '继续培育',
      };
    }

    // 计算加权分数（时间衰减）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalScore = 0;
    let recentSignals = 0;
    const topSignals: Array<{ type: string; score: number; occurredAt: Date }> = [];

    for (const signal of signals) {
      // 时间衰减：越近的信号权重越高
      const daysSinceSignal = (Date.now() - signal.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.max(0.5, 1 - daysSinceSignal / days);

      const weightedScore = Math.round(signal.score * signal.intensity * timeWeight);
      totalScore += weightedScore;

      if (signal.occurredAt >= sevenDaysAgo) {
        recentSignals++;
      }

      topSignals.push({
        type: signal.signalType,
        score: weightedScore,
        occurredAt: signal.occurredAt,
      });
    }

    // 取前5个信号
    topSignals.sort((a, b) => b.score - a.score);
    const top5Signals = topSignals.slice(0, 5);

    // 确定评分等级
    let scoreLevel: 'low' | 'medium' | 'high' | 'critical';
    let recommendedAction: string;

    if (totalScore >= 100) {
      scoreLevel = 'critical';
      recommendedAction = '立即跟进！高购买意向';
    } else if (totalScore >= 50) {
      scoreLevel = 'high';
      recommendedAction = '优先跟进（24小时内）';
    } else if (totalScore >= 25) {
      scoreLevel = 'medium';
      recommendedAction = '本周安排跟进';
    } else {
      scoreLevel = 'low';
      recommendedAction = '继续培育';
    }

    return {
      candidateId,
      companyId,
      totalScore,
      scoreLevel,
      signalCount: signals.length,
      recentSignals,
      topSignals: top5Signals,
      recommendedAction,
    };
  } catch (error) {
    console.error('[IntentTracking] calculateIntentScore error:', error);
    return null;
  }
}

/**
 * 获取高意向候选列表
 */
export async function getHighIntentCandidates(
  tenantId: string,
  options?: { minScore?: number; limit?: number }
): Promise<Array<{
  candidateId: string;
  companyName: string;
  totalScore: number;
  scoreLevel: string;
  recentSignals: number;
  lastSignalAt: Date;
}>> {
  const { minScore = 25, limit = 20 } = options || {};

  try {
    // 聚合查询每个候选的意图分数
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signals = await prisma.intentSignal.findMany({
      where: {
        tenantId,
        candidateId: { not: null },
        occurredAt: { gte: thirtyDaysAgo },
      },
      select: {
        candidateId: true,
        score: true,
        intensity: true,
        occurredAt: true,
      },
    });

    // 按候选聚合
    const candidateScores = new Map<string, { totalScore: number; recentSignals: number; lastSignalAt: Date }>();

    for (const signal of signals) {
      if (!signal.candidateId) continue;

      const existing = candidateScores.get(signal.candidateId) || {
        totalScore: 0,
        recentSignals: 0,
        lastSignalAt: signal.occurredAt,
      };

      const daysSinceSignal = (Date.now() - signal.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.max(0.5, 1 - daysSinceSignal / 30);
      const weightedScore = Math.round(signal.score * signal.intensity * timeWeight);

      existing.totalScore += weightedScore;
      existing.lastSignalAt = signal.occurredAt > existing.lastSignalAt ? signal.occurredAt : existing.lastSignalAt;

      if (daysSinceSignal <= 7) {
        existing.recentSignals++;
      }

      candidateScores.set(signal.candidateId, existing);
    }

    // 筛选高意向候选
    const highIntentCandidates = Array.from(candidateScores.entries())
      .filter(([, data]) => data.totalScore >= minScore)
      .map(([candidateId, data]) => ({
        candidateId,
        totalScore: data.totalScore,
        recentSignals: data.recentSignals,
        lastSignalAt: data.lastSignalAt,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);

    // 获取公司名称
    if (highIntentCandidates.length === 0) {
      return [];
    }

    const candidates = await prisma.radarCandidate.findMany({
      where: {
        id: { in: highIntentCandidates.map(c => c.candidateId) },
      },
      select: { id: true, displayName: true },
    });

    const candidateMap = new Map(candidates.map(c => [c.id, c.displayName]));

    return highIntentCandidates.map(c => ({
      candidateId: c.candidateId,
      companyName: candidateMap.get(c.candidateId) || 'Unknown',
      totalScore: c.totalScore,
      scoreLevel: c.totalScore >= 100 ? 'critical' : c.totalScore >= 50 ? 'high' : 'medium',
      recentSignals: c.recentSignals,
      lastSignalAt: c.lastSignalAt,
    }));
  } catch (error) {
    console.error('[IntentTracking] getHighIntentCandidates error:', error);
    return [];
  }
}

/**
 * 获取意图信号时间线
 */
export async function getIntentTimeline(
  tenantId: string,
  options?: {
    candidateId?: string;
    companyId?: string;
    days?: number;
    limit?: number;
  }
): Promise<Array<{
  id: string;
  type: string;
  score: number;
  intensity: number;
  occurredAt: Date;
  page?: string;
  metadata?: Record<string, unknown>;
}>> {
  const { candidateId, companyId, days = 30, limit = 50 } = options || {};

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: { tenantId: string; occurredAt: { gte: Date }; candidateId?: string; companyId?: string } = {
      tenantId,
      occurredAt: { gte: startDate },
    };

    if (candidateId) where.candidateId = candidateId;
    if (companyId) where.companyId = companyId;

    const signals = await prisma.intentSignal.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return signals.map(signal => ({
      id: signal.id,
      type: signal.signalType,
      score: signal.score,
      intensity: signal.intensity,
      occurredAt: signal.occurredAt,
      page: signal.page || undefined,
      metadata: signal.metadata as Record<string, unknown> | undefined,
    }));
  } catch (error) {
    console.error('[IntentTracking] getIntentTimeline error:', error);
    return [];
  }
}

// ==================== 内部函数 ====================

/**
 * 创建意图提醒
 */
async function createIntentAlert(
  tenantId: string,
  data: {
    candidateId?: string;
    companyId?: string;
    signalType: string;
    score: number;
  }
): Promise<void> {
  try {
    // 获取候选信息
    let companyName = 'Unknown';
    if (data.candidateId) {
      const candidate = await prisma.radarCandidate.findUnique({
        where: { id: data.candidateId },
        select: { displayName: true },
      });
      if (candidate) companyName = candidate.displayName;
    }

    // 存储到候选的metadata中，由前端轮询获取
    if (data.candidateId) {
      await prisma.radarCandidate.update({
        where: { id: data.candidateId },
        data: {
          matchExplain: {
            alert: {
              type: data.signalType,
              score: data.score,
              message: `${companyName} 表现出高意向行为: ${data.signalType}`,
              createdAt: new Date().toISOString(),
            },
          },
        },
      });
    }
  } catch (error) {
    console.error('[IntentTracking] createIntentAlert error:', error);
  }
}