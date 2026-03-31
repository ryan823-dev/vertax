/**
 * 获客雷达情报丰富化模块
 *
 * Phase 2: 使用 funding-tracker, news-intelligence, linkedin-research skills 的能力
 * 为候选公司丰富情报数据，提升评估准确性
 */

import { prisma } from '@/lib/prisma';
import { chatCompletion } from '@/lib/ai-client';
import type { DeepQualifyCandidate } from './deep-qualify';

// ==================== 类型定义 ====================

export interface IntelligenceData {
  // 融资信息
  funding?: {
    totalRaised?: string;
    latestRound?: string;
    latestRoundDate?: string;
    valuation?: string;
    leadInvestors?: string[];
    recentNews?: string;
  };

  // 新闻动态
  news?: {
    recentHeadlines?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    keyThemes?: string[];
    lastNewsDate?: string;
  };

  // LinkedIn 联系人
  contacts?: {
    decisionMakers?: Array<{
      name: string;
      title: string;
      linkedIn?: string;
    }>;
  };

  // 竞品关系
  competitors?: {
    directCompetitors?: string[];
    marketPosition?: string;
  };
}

export interface EnrichmentResult {
  candidateId: string;
  success: boolean;
  data: IntelligenceData;
  errors: string[];
}

export interface BatchEnrichmentResult {
  results: EnrichmentResult[];
  totalEnriched: number;
  totalFailed: number;
}

// ==================== Exa Search 工具 ====================

interface ExaSearchResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
}

/**
 * 使用 Exa 搜索获取融资信息
 */
async function searchFunding(companyName: string): Promise<IntelligenceData['funding']> {
  const query = `"${companyName}" funding raised investment`;
  const searchResults = await exaSearch(query, 'news', 10);

  if (searchResults.length === 0) {
    return undefined;
  }

  // 解析融资信息
  const fundingData: IntelligenceData['funding'] = {
    recentNews: searchResults
      .slice(0, 3)
      .map(r => r.title)
      .filter(Boolean)
      .join('; '),
  };

  // 使用 AI 提取结构化数据
  const context = searchResults
    .map(r => `Title: ${r.title}\nDate: ${r.publishedDate}\nContent: ${r.text?.slice(0, 500)}`)
    .join('\n\n');

  try {
    const aiResponse = await chatCompletion(
      [
        {
          role: 'system',
          content: `从以下搜索结果中提取融资信息。返回 JSON 格式：
{
  "totalRaised": "总融资额，如 $100M",
  "latestRound": "最新轮次，如 Series B",
  "latestRoundDate": "日期，如 2024",
  "valuation": "估值，如 $1B",
  "leadInvestors": ["投资者1", "投资者2"]
}
如果信息不完整，只返回能确定的字段。`
        },
        {
          role: 'user',
          content: context
        }
      ],
      {
        model: 'qwen-plus',
        temperature: 0.1,
        maxTokens: 500,
      }
    );

    const parsed = JSON.parse(aiResponse.content.trim());
    return { ...parsed, recentNews: fundingData.recentNews };
  } catch {
    return fundingData;
  }
}

/**
 * 使用 Exa 搜索获取新闻动态
 */
async function searchNews(companyName: string): Promise<IntelligenceData['news']> {
  const query = `"${companyName}" news company`;
  const searchResults = await exaSearch(query, 'news', 15);

  if (searchResults.length === 0) {
    return undefined;
  }

  const headlines = searchResults
    .map(r => r.title)
    .filter(Boolean) as string[];

  const dates = searchResults
    .map(r => r.publishedDate)
    .filter(Boolean) as string[];

  // 使用 AI 判断情绪
  const content = searchResults
    .slice(0, 5)
    .map(r => r.text?.slice(0, 300))
    .filter(Boolean)
    .join('\n\n');

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let themes: string[] = [];

  try {
    const aiResponse = await chatCompletion(
      [
        {
          role: 'system',
          content: `分析以下新闻内容的情绪和主题。
返回 JSON 格式：
{
  "sentiment": "positive|neutral|negative",
  "themes": ["主题1", "主题2"]
}
情绪判断：
- positive: 增长、成功、积极指标
- negative: 下滑、争议、负面指标
- neutral: 中立报道、事实性内容`
        },
        {
          role: 'user',
          content: content.slice(0, 2000)
        }
      ],
      {
        model: 'qwen-plus',
        temperature: 0.1,
        maxTokens: 300,
      }
    );

    const parsed = JSON.parse(aiResponse.content.trim());
    sentiment = parsed.sentiment || 'neutral';
    themes = parsed.themes || [];
  } catch {
    // AI 解析失败，使用默认 neutral
  }

  return {
    recentHeadlines: headlines.slice(0, 10),
    sentiment,
    keyThemes: themes.slice(0, 5),
    lastNewsDate: dates[0],
  };
}

/**
 * 使用 Exa 搜索获取 LinkedIn 联系人
 */
async function searchContacts(companyName: string): Promise<IntelligenceData['contacts']> {
  const query = `"${companyName}" "LinkedIn" OR "CEO" OR "VP" OR "Director" team leadership`;
  const searchResults = await exaSearch(query, 'auto', 15);

  if (searchResults.length === 0) {
    return undefined;
  }

  // 提取可能的联系人信息
  const context = searchResults
    .map(r => `${r.title}\n${r.text?.slice(0, 300)}`)
    .join('\n\n');

  try {
    const aiResponse = await chatCompletion(
      [
        {
          role: 'system',
          content: `从以下搜索结果中提取决策者信息。
返回 JSON 格式：
{
  "decisionMakers": [
    {"name": "姓名", "title": "职位", "linkedIn": "URL如果有"}
  ]
}
只返回明确能识别的决策者，最多5人。`
        },
        {
          role: 'user',
          content: context.slice(0, 3000)
        }
      ],
      {
        model: 'qwen-plus',
        temperature: 0.1,
        maxTokens: 500,
      }
    );

    const parsed = JSON.parse(aiResponse.content.trim());
    return { decisionMakers: parsed.decisionMakers || [] };
  } catch {
    return undefined;
  }
}

/**
 * 使用 Exa 搜索竞品信息
 */
async function searchCompetitors(companyName: string): Promise<IntelligenceData['competitors']> {
  const query = `"${companyName}" competitors alternatives`;
  const searchResults = await exaSearch(query, 'auto', 10);

  if (searchResults.length === 0) {
    return undefined;
  }

  const context = searchResults
    .map(r => `${r.title}\n${r.text?.slice(0, 200)}`)
    .join('\n\n');

  try {
    const aiResponse = await chatCompletion(
      [
        {
          role: 'system',
          content: `从以下搜索结果中提取竞品信息。
返回 JSON 格式：
{
  "directCompetitors": ["竞品1", "竞品2"],
  "marketPosition": "一句话描述市场定位"
}
只返回能确定的竞品名称。`
        },
        {
          role: 'user',
          content: context.slice(0, 2000)
        }
      ],
      {
        model: 'qwen-plus',
        temperature: 0.1,
        maxTokens: 300,
      }
    );

    const parsed = JSON.parse(aiResponse.content.trim());
    return {
      directCompetitors: parsed.directCompetitors || [],
      marketPosition: parsed.marketPosition,
    };
  } catch {
    return undefined;
  }
}

/**
 * Exa 搜索封装
 */
async function exaSearch(
  query: string,
  type: 'news' | 'auto' = 'auto',
  numResults: number = 10
): Promise<ExaSearchResult[]> {
  try {
    // 检查是否有 Exa API
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      console.log('[RadarIntelligence] No EXA_API_KEY configured');
      return [];
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: type === 'news' ? 'news' : 'auto',
        category: type === 'news' ? undefined : 'company',
        contents: {
          text: true,
          summary: true,
        },
      }),
    });

    if (!response.ok) {
      console.error('[RadarIntelligence] Exa API error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((r: {
      title?: string;
      url?: string;
      publishedDate?: string;
      text?: string;
    }) => ({
      title: r.title,
      url: r.url,
      publishedDate: r.publishedDate,
      text: r.text,
    }));
  } catch (error) {
    console.error('[RadarIntelligence] Exa search failed:', error);
    return [];
  }
}

// ==================== 核心函数 ====================

/**
 * 丰富单个候选的情报数据
 */
export async function enrichCandidateIntelligence(
  candidateId: string,
  options?: {
    includeFunding?: boolean;
    includeNews?: boolean;
    includeContacts?: boolean;
    includeCompetitors?: boolean;
  }
): Promise<EnrichmentResult> {
  const errors: string[] = [];
  const intelligence: IntelligenceData = {};

  // 获取候选信息
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    return {
      candidateId,
      success: false,
      data: {},
      errors: ['Candidate not found'],
    };
  }

  const companyName = candidate.displayName;
  const website = candidate.website;

  // 默认启用所有增强
  const opts = {
    includeFunding: options?.includeFunding ?? true,
    includeNews: options?.includeNews ?? true,
    includeContacts: options?.includeContacts ?? true,
    includeCompetitors: options?.includeCompetitors ?? false,
  };

  // 并行执行各项搜索
  const tasks: Promise<unknown>[] = [];

  if (opts.includeFunding) {
    tasks.push(
      searchFunding(companyName)
        .then(data => {
          if (data) intelligence.funding = data;
        })
        .catch(e => errors.push(`Funding: ${e.message}`))
    );
  }

  if (opts.includeNews) {
    tasks.push(
      searchNews(companyName)
        .then(data => {
          if (data) intelligence.news = data;
        })
        .catch(e => errors.push(`News: ${e.message}`))
    );
  }

  if (opts.includeContacts) {
    tasks.push(
      searchContacts(companyName)
        .then(data => {
          if (data) intelligence.contacts = data;
        })
        .catch(e => errors.push(`Contacts: ${e.message}`))
    );
  }

  if (opts.includeCompetitors) {
    tasks.push(
      searchCompetitors(companyName)
        .then(data => {
          if (data) intelligence.competitors = data;
        })
        .catch(e => errors.push(`Competitors: ${e.message}`))
    );
  }

  await Promise.allSettled(tasks);

  // 如果有网站，尝试补充搜索
  if (website && Object.keys(intelligence).length === 0) {
    const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const domainResults = await exaSearch(domain, 'auto', 5);

    if (domainResults.length > 0) {
      intelligence.news = {
        recentHeadlines: domainResults.map(r => r.title).filter(Boolean) as string[],
      };
    }
  }

  // 保存到数据库
  if (Object.keys(intelligence).length > 0) {
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        enrichedAt: new Date(),
        rawData: {
          ...(candidate.rawData as object || {}),
          intelligence,
        } as object,
      },
    });
  }

  return {
    candidateId,
    success: Object.keys(intelligence).length > 0,
    data: intelligence,
    errors,
  };
}

/**
 * 批量丰富候选情报
 */
export async function enrichCandidatesIntelligence(
  candidateIds: string[],
  options?: {
    includeFunding?: boolean;
    includeNews?: boolean;
    includeContacts?: boolean;
    includeCompetitors?: boolean;
    concurrency?: number;
  }
): Promise<BatchEnrichmentResult> {
  const concurrency = options?.concurrency || 5;
  const results: EnrichmentResult[] = [];
  let totalEnriched = 0;
  let totalFailed = 0;

  // 分批处理
  for (let i = 0; i < candidateIds.length; i += concurrency) {
    const batch = candidateIds.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(id => enrichCandidateIntelligence(id, options))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          totalEnriched++;
        } else {
          totalFailed++;
        }
      } else {
        totalFailed++;
        results.push({
          candidateId: 'unknown',
          success: false,
          data: {},
          errors: [result.reason?.message || 'Unknown error'],
        });
      }
    }
  }

  return {
    results,
    totalEnriched,
    totalFailed,
  };
}

// ==================== 信号评分 ====================

export interface SignalScore {
  fundingSignal: number;      // 0-100, 融资后通常有采购需求
  newsSignal: number;         // 0-100, 新闻活跃度
  timingSignal: number;       // 0-100, 接触时机成熟度
  contactSignal: number;      // 0-100, 决策者信息完整度
  overallScore: number;       // 综合评分
}

/**
 * 从情报数据计算信号评分
 */
export function calculateSignalScores(intelligence: IntelligenceData): SignalScore {
  let fundingSignal = 0;
  let newsSignal = 50; // 默认中等
  let timingSignal = 50;
  let contactSignal = 0;

  // 融资信号
  if (intelligence.funding) {
    const f = intelligence.funding;
    if (f.latestRound) {
      // 近期融资 +30
      fundingSignal += 30;
    }
    if (f.valuation) {
      // 有估值说明是成长型公司 +20
      fundingSignal += 20;
    }
    if (f.leadInvestors && f.leadInvestors.length > 0) {
      // 有知名投资者 +20
      fundingSignal += 20;
    }
    if (f.recentNews) {
      // 有融资相关新闻 +30
      fundingSignal += 30;
    }
  }

  // 新闻信号
  if (intelligence.news) {
    const n = intelligence.news;
    if (n.sentiment === 'positive') {
      newsSignal = 80;
    } else if (n.sentiment === 'negative') {
      newsSignal = 40;
    }

    // 新闻数量越多越活跃
    if (n.recentHeadlines && n.recentHeadlines.length > 5) {
      newsSignal += 10;
    }
  }

  // 时机信号：基于融资和新闻综合判断
  timingSignal = Math.min(100, (fundingSignal + newsSignal) / 2);

  // 联系人信号
  if (intelligence.contacts?.decisionMakers) {
    const contacts = intelligence.contacts.decisionMakers;
    contactSignal = Math.min(100, contacts.length * 25);
  }

  const overallScore = Math.round(
    (fundingSignal * 0.3 + newsSignal * 0.2 + timingSignal * 0.25 + contactSignal * 0.25)
  );

  return {
    fundingSignal: Math.min(100, fundingSignal),
    newsSignal: Math.min(100, newsSignal),
    timingSignal: Math.min(100, timingSignal),
    contactSignal: Math.min(100, contactSignal),
    overallScore,
  };
}

/**
 * 丰富候选并计算信号评分
 */
export async function enrichWithSignalScore(
  candidateId: string,
  options?: Parameters<typeof enrichCandidateIntelligence>[1]
): Promise<{
  enrichment: EnrichmentResult;
  signals: SignalScore;
}> {
  const enrichment = await enrichCandidateIntelligence(candidateId, options);
  const signals = calculateSignalScores(enrichment.data);

  // 更新数据库中的信号评分
  if (enrichment.success) {
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        aiRelevance: {
          ...(enrichment.data as object),
          signalScores: signals,
        } as object,
      },
    });
  }

  return { enrichment, signals };
}
