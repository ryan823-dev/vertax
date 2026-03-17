/**
 * Cron: 雷达 AI 合格化
 * 
 * 每 15 分钟执行一次，对 status=NEW 的候选批量执行 AI 合格化。
 * 按 profileId 分组（条款D），使用正确的 TargetingSpec。
 * 包含 Feedback Loop（条款F）。
 * 
 * 配置 vercel.json cron: every 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdapterRegistration, ensureAdaptersInitialized } from '@/lib/radar/adapters';

const MAX_RUN_SECONDS = 50;
const MAX_BATCH_SIZE = 50;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  ensureAdaptersInitialized();

  const stats = {
    processed: 0,
    qualified: 0,
    excluded: 0,
    enriching: 0,
    errors: [] as string[],
  };

  try {
    // 条款D: 查询 NEW 候选，按 profileId 分组
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

    // 对每组执行合格化
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

        // 简化合格化逻辑（不依赖 Skill Runner，直接基于规则）
        // 后续可升级为 executeSkill(RADAR_QUALIFY_ACCOUNTS)
        for (const candidate of batch) {
          if (Date.now() >= deadline) break;

          try {
            // 使用配置化评分逻辑
            const tier = await scoreCandidate(candidate, {
              ...profile,
              tenantId: candidate.tenantId,
            });

            if (tier === 'excluded') {
              await prisma.radarCandidate.update({
                where: { id: candidate.id },
                data: {
                  status: 'EXCLUDED',
                  qualifyTier: 'excluded',
                  qualifyReason: 'Auto-qualify: below threshold',
                  qualifiedAt: new Date(),
                  qualifiedBy: 'scheduler',
                },
              });
              stats.excluded++;

              // Feedback Loop: 记录排除原因
              await appendExclusionRule(profileId, candidate.displayName, candidate.industry);
            } else {
              // 判断是否需要 enrich（缺关键联系方式）
              const shouldEnrich = needsEnrichment(candidate) &&
                candidate.source.storagePolicy !== 'ID_ONLY';

              const adapterReg = getAdapterRegistration(candidate.source.code);
              const supportsDetails = adapterReg?.features?.supportsDetails ?? false;

              // 如果需要enrich且adapter支持，进入ENRICHING
              // 否则直接QUALIFIED
              const finalEnrich = shouldEnrich && supportsDetails;

              await prisma.radarCandidate.update({
                where: { id: candidate.id },
                data: {
                  status: finalEnrich ? 'ENRICHING' : 'QUALIFIED',
                  qualifyTier: tier,
                  qualifyReason: finalEnrich
                    ? `Auto-qualify: tier ${tier}, needs enrichment`
                    : `Auto-qualify: tier ${tier}`,
                  qualifiedAt: new Date(),
                  qualifiedBy: 'scheduler',
                },
              });

              if (finalEnrich) {
                stats.enriching++;
              } else {
                stats.qualified++;
              }
            }
            stats.processed++;
          } catch (candidateError) {
            stats.errors.push(
              `Candidate ${candidate.id}: ${candidateError instanceof Error ? candidateError.message : 'Unknown'}`
            );
          }
        }
      } catch (groupError) {
        stats.errors.push(
          `Profile ${profileId}: ${groupError instanceof Error ? groupError.message : 'Unknown'}`
        );
      }
    }

    console.log(
      `[radar-qualify] Processed ${stats.processed}, ` +
      `qualified: ${stats.qualified}, excluded: ${stats.excluded}, enriching: ${stats.enriching}`
    );

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[radar-qualify] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// ==================== 评分逻辑 ====================

import type { ScoringProfile } from '@/types/scoring-profile';
import { DEFAULT_SCORING_PROFILE } from '@/types/scoring-profile';

// 缓存评分配置（避免频繁查询数据库）
let scoringProfileCache: { profile: ScoringProfile; tenantId: string; expiresAt: number } | null = null;

/**
 * 获取评分配置
 *
 * 优先从 ICPSegment 读取用户自定义配置，否则使用默认配置
 */
async function getScoringConfig(tenantId: string): Promise<ScoringProfile> {
  // 检查缓存（5分钟有效）
  if (scoringProfileCache &&
      scoringProfileCache.tenantId === tenantId &&
      scoringProfileCache.expiresAt > Date.now()) {
    return scoringProfileCache.profile;
  }

  try {
    // 从第一个 ICPSegment 读取配置
    const segment = await prisma.iCPSegment.findFirst({
      where: { tenantId },
      select: { criteria: true },
      orderBy: { order: 'asc' },
    });

    if (segment?.criteria) {
      const criteria = segment.criteria as Record<string, unknown>;
      if (criteria.scoringProfile) {
        const profile = criteria.scoringProfile as ScoringProfile;
        // 更新缓存
        scoringProfileCache = {
          profile,
          tenantId,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟
        };
        return profile;
      }
    }
  } catch (error) {
    console.error('[getScoringConfig] Error:', error);
  }

  return DEFAULT_SCORING_PROFILE;
}

/**
 * 评分逻辑 v3 - 配置化版本
 *
 * 使用用户自定义的评分规则，而非硬编码
 * 支持基于信号来源的加分
 */
async function scoreCandidate(
  candidate: {
    displayName: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    country?: string | null;
    industry?: string | null;
    matchScore?: number | null;
    description?: string | null;
    matchExplain?: { channel?: string } | null;
  },
  profile: { targetCountries: string[]; industryCodes: string[]; exclusionRules: unknown; tenantId: string }
): Promise<'A' | 'B' | 'C' | 'excluded'> {
  // 获取评分配置
  const config = await getScoringConfig(profile.tenantId);

  // 合并名称和描述进行分析
  const text = `${candidate.displayName} ${candidate.description || ''}`.toLowerCase();

  // ========== 负向信号检查（排除） ==========
  for (const signal of config.negativeSignals) {
    const matched = signal.keywords.some(kw => text.includes(kw.toLowerCase()));
    if (matched) {
      return 'excluded';
    }
  }

  // ========== 正向信号评分 ==========
  let score = config.baseScore;

  for (const signal of config.positiveSignals) {
    const matched = signal.keywords.some(kw => text.includes(kw.toLowerCase()));
    if (matched) {
      score += signal.weight;
    }
  }

  // ========== 联系方式完整性 ==========
  if (candidate.website) score += config.contactScoring.hasWebsite;
  if (candidate.phone) score += config.contactScoring.hasPhone;
  if (candidate.email) score += config.contactScoring.hasEmail;

  // ========== 信号来源加分 ==========
  const channel = candidate.matchExplain?.channel;
  if (channel && config.channelScoring) {
    const channelScore = config.channelScoring[channel as keyof typeof config.channelScoring];
    if (channelScore) {
      score += channelScore;
    }
  }

  // ========== 目标国家匹配 ==========
  if (candidate.country && profile.targetCountries.length > 0) {
    const normalizedCountry = candidate.country.toUpperCase();
    const matched = profile.targetCountries.some(tc => {
      const tcUpper = tc.toUpperCase();
      return normalizedCountry.includes(tcUpper) ||
             tcUpper.includes(normalizedCountry.slice(0, 2)) ||
             normalizedCountry.startsWith(tcUpper);
    });
    if (matched) score += config.targetCountryBonus;
  }

  // ========== 已有匹配分数 ==========
  if (candidate.matchScore) score += Math.round(candidate.matchScore * 10);

  // ========== 排除规则检查 ==========
  const rules = (profile.exclusionRules as { excludedCompanies?: string[] }) || {};
  if (rules.excludedCompanies?.length) {
    const nameLower = candidate.displayName.toLowerCase();
    if (rules.excludedCompanies.some(excluded =>
      nameLower === excluded.toLowerCase() ||
      nameLower.includes(excluded.toLowerCase())
    )) {
      return 'excluded';
    }
  }

  // ========== 层级判定 ==========
  if (score >= config.thresholds.tierA) return 'A';   // 优质客户
  if (score >= config.thresholds.tierB) return 'B';   // 潜力客户
  return 'C';                                          // 一般客户
}

/**
 * 判断候选是否需要enrichment
 */
function needsEnrichment(candidate: {
  website?: string | null;
  phone?: string | null;
}): boolean {
  return !candidate.website && !candidate.phone;
}

// ==================== Feedback Loop ====================
// 注意：已禁用恶性关键词排除，只保留公司名排除（用于去重）

async function appendExclusionRule(
  profileId: string,
  displayName: string,
  industry?: string | null
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

    // 限制排除规则总数（防止无限增长）
    const MAX_EXCLUSIONS = 200;
    if (existingComp.length >= MAX_EXCLUSIONS) return;

    // 只添加公司名，不拆分关键词（避免恶性排除）
    await prisma.radarSearchProfile.update({
      where: { id: profileId },
      data: {
        exclusionRules: {
          // 清空恶性关键词列表
          negativeKeywords: [],
          // 只保留公司名排除
          excludedCompanies: [...new Set([...existingComp, displayName])].slice(0, MAX_EXCLUSIONS),
        } as object,
      },
    });
  } catch {
    // 静默失败，不影响主流程
  }
}
