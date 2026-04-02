/**
 * 获客雷达情报丰富化模块
 *
 * Phase 2: 使用 funding-tracker, news-intelligence, linkedin-research skills 的能力
 * 为候选公司丰富情报数据，提升评估准确性
 * 
 * 2026-04-01 增强：
 * - 集成 Hunter.io 自动查找联系人邮箱
 * - 集成 Tavily AI 搜索作为 Exa 的补充/备份
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
      email?: string; // 2026-04-01: 新增邮箱字段
      emailConfidence?: number;
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

// ==================== 搜索工具封装 ====================

interface SearchResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
}

/**
 * 统一搜索封装：优先使用 Exa，若失败或无结果则尝试 Tavily
 */
async function unifiedSearch(
  query: string, 
  type: 'news' | 'auto' = 'auto', 
  numResults: number = 10
): Promise<SearchResult[]> {
  // 1. 尝试 Exa
  let results = await exaSearch(query, type, numResults);
  
  // 2. 如果 Exa 没结果且有 Tavily Key，尝试 Tavily
  if (results.length === 0 && process.env.TAVILY_API_KEY) {
    console.log(`[RadarEnrich] Exa returned no results for "${query}", trying Tavily...`);
    results = await tavilySearch(query, numResults);
  }
  
  return results;
}

/**
 * Exa 搜索实现
 */
async function exaSearch(
  query: string,
  type: 'news' | 'auto' = 'auto',
  numResults: number = 10
): Promise<SearchResult[]> {
  try {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return [];

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
        contents: { text: true, summary: true },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: any) => ({
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

/**
 * Tavily 搜索实现
 */
async function tavilySearch(query: string, numResults: number = 5): Promise<SearchResult[]> {
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: numResults,
        search_depth: "advanced",
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      text: r.content,
    }));
  } catch (error) {
    console.error('[RadarIntelligence] Tavily search failed:', error);
    return [];
  }
}

// ==================== Hunter.io 工具 ====================

/**
 * 使用 Hunter.io 查找个人邮箱
 */
async function hunterFindEmail(domain: string, fullName: string): Promise<{ email: string | null; confidence: number }> {
  try {
    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey || !domain) return { email: null, confidence: 0 };

    // 简单拆分姓名
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    const params = new URLSearchParams({
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey,
    });

    const response = await fetch(`https://api.hunter.io/v2/email-finder?${params}`);
    if (!response.ok) return { email: null, confidence: 0 };

    const data = await response.json();
    return {
      email: data.data?.email || null,
      confidence: data.data?.score || 0
    };
  } catch {
    return { email: null, confidence: 0 };
  }
}

// ==================== 业务逻辑函数 ====================

/**
 * 获取融资信息
 */
async function searchFunding(companyName: string): Promise<IntelligenceData['funding']> {
  const query = `"${companyName}" funding raised investment round`;
  const searchResults = await unifiedSearch(query, 'news', 10);

  if (searchResults.length === 0) return undefined;

  const context = searchResults
    .map(r => `Title: ${r.title}\nDate: ${r.publishedDate}\nContent: ${r.text?.slice(0, 500)}`)
    .join('\n\n');

  try {
    const aiResponse = await chatCompletion([
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
      { role: 'user', content: context }
    ], { model: 'qwen-plus', temperature: 0.1 });

    const parsed = JSON.parse(aiResponse.content.trim().replace(/```json|```/g, ''));
    return { 
      ...parsed, 
      recentNews: searchResults.slice(0, 2).map(r => r.title).join('; ') 
    };
  } catch {
    return { recentNews: searchResults[0].title };
  }
}

/**
 * 获取新闻动态
 */
async function searchNews(companyName: string): Promise<IntelligenceData['news']> {
  const query = `"${companyName}" latest business news developments`;
  const searchResults = await unifiedSearch(query, 'news', 10);

  if (searchResults.length === 0) return undefined;

  const content = searchResults.slice(0, 5).map(r => r.text?.slice(0, 300)).join('\n\n');

  try {
    const aiResponse = await chatCompletion([
      {
        role: 'system',
        content: `分析以下新闻内容的情绪和主题。返回 JSON：{"sentiment": "positive|neutral|negative", "themes": ["主题1"]}`
      },
      { role: 'user', content: content }
    ], { model: 'qwen-plus', temperature: 0.1 });

    const parsed = JSON.parse(aiResponse.content.trim().replace(/```json|```/g, ''));
    return {
      recentHeadlines: searchResults.map(r => r.title).filter(Boolean) as string[],
      sentiment: parsed.sentiment || 'neutral',
      keyThemes: parsed.themes || [],
      lastNewsDate: searchResults[0].publishedDate,
    };
  } catch {
    return { recentHeadlines: searchResults.slice(0, 3).map(r => r.title).filter(Boolean) as string[] };
  }
}

/**
 * 获取联系人并尝试补全邮箱
 */
async function searchContacts(companyName: string, domain?: string): Promise<IntelligenceData['contacts']> {
  const query = `"${companyName}" decision makers leadership "LinkedIn"`;
  const searchResults = await unifiedSearch(query, 'auto', 10);

  if (searchResults.length === 0) return undefined;

  const context = searchResults.map(r => `${r.title}\n${r.text?.slice(0, 300)}`).join('\n\n');

  try {
    const aiResponse = await chatCompletion([
      {
        role: 'system',
        content: `提取决策者信息（姓名、职位、LinkedIn）。JSON：{"decisionMakers": [{"name": "...", "title": "...", "linkedIn": "..."}]}`
      },
      { role: 'user', content: context }
    ], { model: 'qwen-plus', temperature: 0.1 });

    const parsed = JSON.parse(aiResponse.content.trim().replace(/```json|```/g, ''));
    const makers = parsed.decisionMakers || [];

    // 如果有域名，尝试用 Hunter.io 查找邮箱
    if (domain && makers.length > 0) {
      console.log(`[RadarEnrich] Finding emails for ${makers.length} contacts of ${companyName} via Hunter.io...`);
      for (const person of makers) {
        const hResult = await hunterFindEmail(domain, person.name);
        if (hResult.email) {
          person.email = hResult.email;
          person.emailConfidence = hResult.confidence;
        }
      }
    }

    return { decisionMakers: makers };
  } catch {
    return undefined;
  }
}

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

  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) return { candidateId, success: false, data: {}, errors: ['Not found'] };

  const companyName = candidate.displayName;
  const domain = candidate.website ? candidate.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : undefined;

  const tasks: Promise<unknown>[] = [];

  if (options?.includeFunding !== false) {
    tasks.push(searchFunding(companyName).then(d => { if (d) intelligence.funding = d; }).catch(e => errors.push(`Funding: ${e.message}`)));
  }
  if (options?.includeNews !== false) {
    tasks.push(searchNews(companyName).then(d => { if (d) intelligence.news = d; }).catch(e => errors.push(`News: ${e.message}`)));
  }
  if (options?.includeContacts !== false) {
    tasks.push(searchContacts(companyName, domain).then(d => { if (d) intelligence.contacts = d; }).catch(e => errors.push(`Contacts: ${e.message}`)));
  }

  await Promise.allSettled(tasks);

  if (Object.keys(intelligence).length > 0) {
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        enrichedAt: new Date(),
        // 尝试提取第一个发现的有效邮箱/网站回填主表
        email: candidate.email || intelligence.contacts?.decisionMakers?.find(m => m.email)?.email,
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

export interface SignalScore {
  fundingSignal: number;
  newsSignal: number;
  timingSignal: number;
  contactSignal: number;
  overallScore: number;
}

/**
 * 信号评分计算
 */
export function calculateSignalScores(intelligence: IntelligenceData): SignalScore {
  let funding = 0, news = 50, timing = 50, contact = 0;

  if (intelligence.funding) {
    if (intelligence.funding.latestRound) funding += 40;
    if (intelligence.funding.valuation) funding += 30;
    if (intelligence.funding.leadInvestors?.length) funding += 30;
  }

  if (intelligence.news) {
    if (intelligence.news.sentiment === 'positive') news = 80;
    else if (intelligence.news.sentiment === 'negative') news = 30;
    if ((intelligence.news.recentHeadlines?.length || 0) > 3) news += 10;
  }

  timing = Math.round((funding + news) / 2);

  if (intelligence.contacts?.decisionMakers?.length) {
    contact = Math.min(100, intelligence.contacts.decisionMakers.length * 25);
    // 如果有邮箱，联系人分数翻倍
    if (intelligence.contacts.decisionMakers.some(m => m.email)) contact = Math.min(100, contact + 30);
  }

  const overall = Math.round(funding * 0.3 + news * 0.2 + timing * 0.2 + contact * 0.3);

  return {
    fundingSignal: Math.min(100, funding),
    newsSignal: Math.min(100, news),
    timingSignal: Math.min(100, timing),
    contactSignal: Math.min(100, contact),
    overallScore: overall,
  };
}

/**
 * 快捷调用：丰富 + 评分
 */
export async function enrichWithSignalScore(candidateId: string) {
  const enrichment = await enrichCandidateIntelligence(candidateId);
  const signals = calculateSignalScores(enrichment.data);

  if (enrichment.success) {
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        matchScore: signals.overallScore, // 覆盖原始匹配分
        aiRelevance: {
          ...(enrichment.data as any),
          signalScores: signals,
        } as any,
      },
    });
  }
  return { enrichment, signals };
}
