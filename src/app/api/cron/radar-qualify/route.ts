/**
 * Cron: 雷达双阶段合格化
 *
 * Stage 1（规则快筛，0 token）: 排除词 + 负向信号 + 排除规则 → 快速淘汰明显不匹配的候选
 * Stage 2（AI 深度评估）: 对通过 Stage 1 的候选，基于 CompanyProfile + ICP 深度判断匹配度
 *
 * 设计原则：
 * - Stage 1 宁可多放过，不可多排除（假阳性交给 Stage 2 处理）
 * - Stage 2 基于"我们的产品 vs 客户需求"做深度匹配
 * - AI 调用失败时降级为 C 类，不阻塞流程
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from '@/lib/prisma';
import { ensureAdaptersInitialized } from '@/lib/radar/adapters';
import { Prisma } from '@prisma/client';
import {
  deepQualifyBatch,
  applyDeepQualifyResults,
  type DeepQualifyCandidate,
} from '@/lib/radar/deep-qualify';

import type { ScoringProfile } from '@/types/scoring-profile';
import { DEFAULT_SCORING_PROFILE } from '@/types/scoring-profile';

const MAX_RUN_SECONDS = 50;
const MAX_BATCH_SIZE = 50;
const AI_BATCH_SIZE = 10; // AI 每批处理的候选数量

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  ensureAdaptersInitialized();

  const stats = {
    // Stage 1
    stage1_processed: 0,
    stage1_excluded: 0,
    stage1_passed: 0,
    // Stage 2
    stage2_processed: 0,
    stage2_tierA: 0,
    stage2_tierB: 0,
    stage2_tierC: 0,
    stage2_excluded: 0,
    stage2_enriching: 0,
    stage2_tokensUsed: 0,
    // Overall
    errors: [] as string[],
  };

  try {
    // 查询 NEW 候选，按 profileId 分组
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await prisma.radarCandidate.findMany({
      where: {
        status: 'NEW',
        profileId: { not: null },
        createdAt: { gt: twentyFourHoursAgo },
      },
      include: { source: true },
      take: MAX_BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, ...stats, message: 'No NEW candidates' });
    }

    // 按 profileId 分组
    const grouped = new Map<string, typeof candidates>();
    for (const c of candidates) {
      const pid = c.profileId!;
      if (!grouped.has(pid)) grouped.set(pid, []);
      grouped.get(pid)!.push(c);
    }

    for (const [profileId, batch] of grouped) {
      if (Date.now() >= deadline) {
        stats.errors.push('Timeout reached');
        break;
      }

      try {
        const profile = await prisma.radarSearchProfile.findUnique({
          where: { id: profileId },
        });
        if (!profile) continue;

        const tenantId = batch[0].tenantId;

        // ==================== Stage 1: 规则快筛 ====================
        const scoringConfig = await getScoringConfig(tenantId);
        const stage1Passed: typeof candidates = [];

        for (const candidate of batch) {
          if (Date.now() >= deadline) break;

          const exclusionResult = stage1RuleFilter(candidate, {
            ...profile,
            tenantId,
          }, scoringConfig);

          stats.stage1_processed++;

          if (exclusionResult.excluded) {
            // 直接排除，不消耗 AI token
            await prisma.radarCandidate.update({
              where: { id: candidate.id },
              data: {
                status: 'EXCLUDED',
                qualifyTier: 'excluded',
                qualifyReason: `Stage 1: ${exclusionResult.reason}`,
                qualifiedAt: new Date(),
                qualifiedBy: 'rule-filter',
              },
            });
            stats.stage1_excluded++;

            await appendExclusionRule(profileId, candidate.displayName);
          } else {
            stage1Passed.push(candidate);
            stats.stage1_passed++;
          }
        }

        // ==================== Stage 2: AI 深度评估 ====================
        if (stage1Passed.length > 0 && Date.now() < deadline) {
          // 将候选转换为 AI 评估格式
          const aiCandidates: DeepQualifyCandidate[] = stage1Passed.map(c => ({
            id: c.id,
            displayName: c.displayName,
            website: c.website,
            description: c.description,
            industry: c.industry,
            country: c.country,
            city: c.city,
            companySize: c.companySize,
            sourceUrl: c.sourceUrl,
            sourceChannel: (c.matchExplain as Record<string, unknown>)?.channel as string || c.source.channelType,
            matchExplain: c.matchExplain as Record<string, unknown> | null,
          }));

          // 分批调用 AI（每批 AI_BATCH_SIZE 个）
          for (let i = 0; i < aiCandidates.length; i += AI_BATCH_SIZE) {
            if (Date.now() >= deadline) {
              stats.errors.push('Timeout reached during Stage 2');
              break;
            }

            const aiBatch = aiCandidates.slice(i, i + AI_BATCH_SIZE);

            const aiResult = await deepQualifyBatch(tenantId, aiBatch);
            stats.stage2_tokensUsed += aiResult.tokensUsed;
            stats.errors.push(...aiResult.errors);

            // 统计
            for (const r of aiResult.results) {
              stats.stage2_processed++;
              if (r.tier === 'A') stats.stage2_tierA++;
              else if (r.tier === 'B') stats.stage2_tierB++;
              else if (r.tier === 'C') stats.stage2_tierC++;
              else if (r.tier === 'excluded') stats.stage2_excluded++;
            }

            // 写回数据库
            const applyResult = await applyDeepQualifyResults(aiResult.results, profileId);
            stats.stage2_enriching += applyResult.updated; // candidates entering ENRICHING or QUALIFIED
            stats.errors.push(...applyResult.errors);
          }
        }
      } catch (groupError) {
        stats.errors.push(
          `Profile ${profileId}: ${groupError instanceof Error ? groupError.message : 'Unknown'}`
        );
      }
    }

    console.log(
      `[radar-qualify] Stage 1: ${stats.stage1_processed} processed (${stats.stage1_excluded} excluded, ${stats.stage1_passed} passed) | ` +
      `Stage 2: ${stats.stage2_processed} processed (A:${stats.stage2_tierA} B:${stats.stage2_tierB} C:${stats.stage2_tierC} excluded:${stats.stage2_excluded}) | ` +
      `Tokens: ${stats.stage2_tokensUsed}`
    );

    // 发现新 Tier A 候选时发送通知
    if (stats.stage2_tierA > 0) {
      // n：取第一个候选的 tenantId
      const notifyTenantIds = [...new Set(candidates.map(c => c.tenantId))];
      for (const tid of notifyTenantIds) {
        try {
          await (prisma as unknown as Record<string, { create: (args: unknown) => Promise<unknown> }>).notification.create({
            data: {
              tenantId: tid,
              type: 'tier_a_lead',
              title: `获客雷达：新增 ${stats.stage2_tierA} 个清单 A 级候选`,
              body: `AI 深度评估发现 ${stats.stage2_tierA} 个高匹配目标企业，建议优先为其生成个性化外联话术。`,
              actionUrl: '/customer/radar/prospects',
            },
          });
        } catch {
          // no-op
        }
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[radar-qualify] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// ==================== Stage 1: 规则快筛 ====================

interface Stage1Result {
  excluded: boolean;
  reason: string;
}

/**
 * Stage 1 快速筛选：只淘汰"明显不匹配"的候选
 * 设计原则：宁可放过，不可错杀
 */
function stage1RuleFilter(
  candidate: {
    displayName: string;
    website?: string | null;
    description?: string | null;
    matchExplain?: Prisma.JsonValue | null;
  },
  profile: {
    exclusionRules: unknown;
    tenantId: string;
  },
  config: ScoringProfile,
): Stage1Result {
  const text = `${candidate.displayName} ${candidate.description || ''}`.toLowerCase();

  // 1. 负向信号检查（命中即排除）
  for (const signal of config.negativeSignals) {
    const matchCount = signal.keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    // 需要命中多个关键词才排除（降低误杀率）
    if (matchCount >= 2) {
      return { excluded: true, reason: `负向信号: ${signal.name} (${matchCount} keywords matched)` };
    }
    // 单个关键词命中但非常精确（如完整匹配公司类型词）
    if (matchCount === 1) {
      const matched = signal.keywords.find(kw => text.includes(kw.toLowerCase()))!;
      // 只在候选名称中精确包含该关键词时才排除
      if (candidate.displayName.toLowerCase().includes(matched.toLowerCase())) {
        return { excluded: true, reason: `负向信号: ${signal.name} (name match: "${matched}")` };
      }
    }
  }

  // 2. 排除规则检查（已排除的公司名）
  const rules = (profile.exclusionRules as { excludedCompanies?: string[] }) || {};
  if (rules.excludedCompanies?.length) {
    const nameLower = candidate.displayName.toLowerCase();
    const matched = rules.excludedCompanies.find(excluded =>
      nameLower === excluded.toLowerCase() ||
      nameLower.includes(excluded.toLowerCase())
    );
    if (matched) {
      return { excluded: true, reason: `排除名单: "${matched}"` };
    }
  }

  // Stage 1 通过
  return { excluded: false, reason: '' };
}

// ==================== 评分配置加载 ====================

let scoringProfileCache: { profile: ScoringProfile; tenantId: string; expiresAt: number } | null = null;

async function getScoringConfig(tenantId: string): Promise<ScoringProfile> {
  if (scoringProfileCache &&
      scoringProfileCache.tenantId === tenantId &&
      scoringProfileCache.expiresAt > Date.now()) {
    return scoringProfileCache.profile;
  }

  try {
    const segment = await prisma.iCPSegment.findFirst({
      where: { tenantId },
      select: { criteria: true },
      orderBy: { order: 'asc' },
    });

    if (segment?.criteria) {
      const criteria = segment.criteria as Record<string, unknown>;
      if (criteria.scoringProfile) {
        const profile = criteria.scoringProfile as ScoringProfile;
        scoringProfileCache = {
          profile,
          tenantId,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };
        return profile;
      }
    }
  } catch (error) {
    console.error('[getScoringConfig] Error:', error);
  }

  return DEFAULT_SCORING_PROFILE;
}

// ==================== Feedback Loop ====================

async function appendExclusionRule(
  profileId: string,
  displayName: string,
): Promise<void> {
  try {
    const profile = await prisma.radarSearchProfile.findUnique({
      where: { id: profileId },
      select: { exclusionRules: true },
    });

    const existingRules = (profile?.exclusionRules as {
      negativeKeywords?: string[];
      excludedCompanies?: string[];
    }) || {};

    const existingComp = existingRules.excludedCompanies || [];
    const MAX_EXCLUSIONS = 200;
    if (existingComp.length >= MAX_EXCLUSIONS) return;

    await prisma.radarSearchProfile.update({
      where: { id: profileId },
      data: {
        exclusionRules: {
          ...existingRules,
          excludedCompanies: [...new Set([...existingComp, displayName])].slice(0, MAX_EXCLUSIONS),
        } as object,
      },
    });
  } catch {
    // 静默失败
  }
}

