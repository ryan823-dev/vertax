/**
 * 排除反馈学习模块
 *
 * 当用户手动排除候选时，AI 分析该候选的特征，
 * 提炼出可复用的排除规则写回 RadarSearchProfile.exclusionRules，
 * 让 Stage 1 规则过滤在后续直接拦截同类公司。
 */

import { prisma } from '@/lib/prisma';
import { chatCompletion } from '@/lib/ai-client';

interface ExclusionRules {
  negativeKeywords?: string[];
  excludedCompanies?: string[];
  excludedIndustries?: string[];
  excludedPatterns?: string[];
}

/**
 * 将单个公司名加入排除列表（快速反馈，无需 AI）
 */
export async function appendExcludedCompany(
  profileId: string,
  displayName: string,
): Promise<void> {
  try {
    const profile = await prisma.radarSearchProfile.findUnique({
      where: { id: profileId },
      select: { exclusionRules: true },
    });

    const rules = (profile?.exclusionRules as ExclusionRules) || {};
    const existing = rules.excludedCompanies || [];
    const MAX = 300;
    if (existing.length >= MAX) return;

    await prisma.radarSearchProfile.update({
      where: { id: profileId },
      data: {
        exclusionRules: {
          ...rules,
          excludedCompanies: [...new Set([...existing, displayName])].slice(0, MAX),
        } as object,
      },
    });
  } catch {
    // 静默失败，不阻断主流程
  }
}

/**
 * AI 深度模式提炼
 *
 * 分析近期被排除的候选，提炼行业/关键词/描述性模式，
 * 追加到 exclusionRules.negativeKeywords / excludedIndustries / excludedPatterns
 */
export async function learnExclusionPattern(
  tenantId: string,
  profileId: string,
): Promise<void> {
  try {
    // 查询最近 20 个被排除的候选（用于模式分析）
    const excluded = await prisma.radarCandidate.findMany({
      where: {
        tenantId,
        status: 'EXCLUDED',
        sourceId: { not: undefined },
      },
      select: {
        displayName: true,
        industry: true,
        description: true,
        aiSummary: true,
        qualifyReason: true,
      },
      orderBy: { qualifiedAt: 'desc' },
      take: 20,
    });

    if (excluded.length < 3) return; // 样本不足，等数据积累

    const summaries = excluded
      .map(c =>
        `公司：${c.displayName}，行业：${c.industry || '未知'}，描述：${(c.description || c.aiSummary || '').slice(0, 150)}，排除原因：${c.qualifyReason || '不符合要求'}`
      )
      .join('\n');

    const aiResp = await chatCompletion(
      [
        {
          role: 'system',
          content: `你是一个 B2B 销售策略分析师。分析下面这批被排除的潜在客户，提炼共同特征，输出可以用于自动过滤的规则。

只返回 JSON，格式如下：
{
  "negativeKeywords": ["关键词1", "关键词2"],
  "excludedIndustries": ["行业1"],
  "excludedPatterns": ["描述性规则1（如：规模过小、无采购能力的个人工作室）"]
}

规则要求：
- negativeKeywords：出现在公司名或描述中就直接排除的词（不超过10个）
- excludedIndustries：行业标签（不超过5个）
- excludedPatterns：自然语言描述的共性特征（不超过3条）
- 只提炼高置信度的规律，宁缺毋滥`,
        },
        { role: 'user', content: summaries },
      ],
      { model: 'qwen-plus', temperature: 0.1 }
    );

    const cleaned = aiResp.content.trim().replace(/^```json\s*/m, '').replace(/```\s*$/m, '');
    const pattern = JSON.parse(cleaned) as {
      negativeKeywords?: string[];
      excludedIndustries?: string[];
      excludedPatterns?: string[];
    };

    // 合并写回
    const profile = await prisma.radarSearchProfile.findUnique({
      where: { id: profileId },
      select: { exclusionRules: true },
    });

    const existing = (profile?.exclusionRules as ExclusionRules) || {};

    const merged: ExclusionRules = {
      ...existing,
      negativeKeywords: dedupe([
        ...(existing.negativeKeywords || []),
        ...(pattern.negativeKeywords || []),
      ], 50),
      excludedIndustries: dedupe([
        ...(existing.excludedIndustries || []),
        ...(pattern.excludedIndustries || []),
      ], 20),
      excludedPatterns: dedupe([
        ...(existing.excludedPatterns || []),
        ...(pattern.excludedPatterns || []),
      ], 10),
    };

    await prisma.radarSearchProfile.update({
      where: { id: profileId },
      data: { exclusionRules: merged as object },
    });

    console.log(`[ExclusionLearner] Updated profile ${profileId}: +${pattern.negativeKeywords?.length || 0} keywords, +${pattern.excludedIndustries?.length || 0} industries`);
  } catch (err) {
    console.error('[ExclusionLearner] Pattern extraction failed:', err);
    // 静默失败
  }
}

function dedupe(arr: string[], max: number): string[] {
  return [...new Set(arr)].slice(0, max);
}
