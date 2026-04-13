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
import type { Prisma } from '@prisma/client';
import { PeopleDataLabsAdapter } from './adapters/pdl';
import { enrichCandidateWithExa } from './exa-enrich';
import { safeFetch } from '@/lib/ssrf';

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
      phone?: string; // 2026-04-07: 新增电话字段
    }>;
    companyContacts?: {
      emails?: string[];
      phones?: string[];
      linkedInUrls?: string[];
    };
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

type DecisionMakerContact = {
  name: string;
  title: string;
  linkedIn?: string;
  email?: string;
  emailConfidence?: number;
  phone?: string;
};

// ==================== 搜索工具封装 ====================

interface SearchResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
}

interface ExaSearchApiResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
}

interface ExaSearchApiResponse {
  results?: ExaSearchApiResult[];
}

interface TavilySearchApiResult {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilySearchApiResponse {
  results?: TavilySearchApiResult[];
}

interface WebsiteContactPoints {
  emails: string[];
  phones: string[];
  linkedInUrls: string[];
}

interface GooglePlacesIdentityEnrichment {
  placeId: string;
  name?: string;
  website?: string;
  phone?: string;
  address?: string;
  description?: string;
  googleMapsUrl?: string;
  rawSnapshot: Record<string, unknown>;
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
    const data = await response.json() as ExaSearchApiResponse;
    return (data.results || []).map((r) => ({
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
    const data = await response.json() as TavilySearchApiResponse;
    return (data.results || []).map((r) => ({
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

function normalizeCompanyDomain(domainOrUrl: string | undefined): string | null {
  if (!domainOrUrl) return null;

  try {
    const url = new URL(domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function extractGooglePlaceId(value: string | undefined | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const directMatch = trimmed.match(/[?&]q=place_id:([^&]+)/i);
  if (directMatch?.[1]) {
    return decodeURIComponent(directMatch[1]);
  }

  const placeIdMatch = trimmed.match(/place_id:([^&]+)/i);
  if (placeIdMatch?.[1]) {
    return decodeURIComponent(placeIdMatch[1]);
  }

  // Google place_id 通常是较长的稳定 ID，保留为兜底解析。
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function resolveGooglePlaceId(candidate: {
  externalId: string;
  sourceUrl?: string | null;
  rawData?: unknown;
  source?: { code?: string | null } | null;
}): string | null {
  const rawData =
    candidate.rawData && typeof candidate.rawData === 'object'
      ? (candidate.rawData as Record<string, unknown>)
      : undefined;

  const possibleValues = [
    candidate.externalId,
    candidate.sourceUrl,
    typeof rawData?.place_id === 'string' ? rawData.place_id : undefined,
    typeof rawData?.placeId === 'string' ? rawData.placeId : undefined,
    typeof rawData?.google_place_id === 'string' ? rawData.google_place_id : undefined,
    typeof rawData?.googleMapsUrl === 'string' ? rawData.googleMapsUrl : undefined,
    typeof rawData?.url === 'string' ? rawData.url : undefined,
  ];

  for (const value of possibleValues) {
    const placeId = extractGooglePlaceId(value);
    if (placeId) {
      return placeId;
    }
  }

  if (candidate.source?.code === 'google_places') {
    return extractGooglePlaceId(candidate.externalId);
  }

  return null;
}

async function enrichFromGooglePlacesIdentity(candidate: {
  externalId: string;
  displayName: string;
  sourceUrl?: string | null;
  rawData?: unknown;
  source?: { code?: string | null } | null;
}): Promise<GooglePlacesIdentityEnrichment | null> {
  const placeId = resolveGooglePlaceId(candidate);
  if (!placeId) return null;

  try {
    const { GooglePlacesAdapter } = await import('./adapters/google-places');
    const adapter = new GooglePlacesAdapter({} as never);
    const details = await adapter.getDetails(placeId);

    if (!details) return null;

    const googleMapsUrl = typeof details.additionalInfo?.googleMapsUrl === 'string'
      ? details.additionalInfo.googleMapsUrl
      : undefined;

    return {
      placeId,
      name: details.name,
      website: details.website,
      phone: details.phone,
      address: details.address,
      description: details.description,
      googleMapsUrl,
      rawSnapshot: {
        googlePlaces: {
          enrichedAt: new Date().toISOString(),
          placeId,
          name: details.name,
          website: details.website,
          phone: details.phone,
          address: details.address,
          description: details.description,
          googleMapsUrl,
        },
      },
    };
  } catch (error) {
    console.warn('[RadarIntelligence] Google Places identity lookup failed:', error);
    return null;
  }
}

function normalizeLinkedInUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .map((value) => value.trim())
    )
  );
}

function mergeDecisionMakers(
  base: DecisionMakerContact[],
  incoming: DecisionMakerContact[]
) {
  const merged = [...base];

  for (const candidate of incoming) {
    const key = candidate.name.trim().toLowerCase();
    if (!key) continue;

    const existing = merged.find((item) => item.name.trim().toLowerCase() === key);
    if (existing) {
      existing.title = existing.title || candidate.title;
      existing.email = existing.email || candidate.email;
      existing.emailConfidence = existing.emailConfidence || candidate.emailConfidence;
      existing.phone = existing.phone || candidate.phone;
      existing.linkedIn = existing.linkedIn || candidate.linkedIn;
      continue;
    }

    merged.push(candidate);
  }

  return merged;
}

async function searchContactsWithPDL(domain: string): Promise<DecisionMakerContact[]> {
  if (!process.env.PDL_API_KEY) {
    return [];
  }

  try {
    const adapter = new PeopleDataLabsAdapter({});
    const contacts = await adapter.searchByCompany(domain, {
      seniority: ['owner', 'founder', 'c_suite', 'director', 'manager'],
      limit: 10,
    });

    return contacts
      .filter((contact) => contact.displayName && contact.contactRole)
      .map((contact) => {
        const rawLinkedIn =
          contact.rawData &&
          typeof contact.rawData === 'object' &&
          typeof (contact.rawData as Record<string, unknown>).linkedin_url === 'string'
            ? (contact.rawData as Record<string, string>).linkedin_url
            : undefined;

        return {
          name: contact.displayName,
          title: contact.contactRole || 'Unknown',
          email: contact.email,
          phone: contact.phone,
          linkedIn: normalizeLinkedInUrl(rawLinkedIn) || undefined,
          emailConfidence: contact.email ? 90 : undefined,
        };
      });
  } catch (error) {
    console.warn('[RadarIntelligence] PDL search failed:', error);
    return [];
  }
}

function extractEmails(text: string): string[] {
  return uniqueNonEmpty(text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []);
}

function extractPhones(text: string): string[] {
  return uniqueNonEmpty(
    text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g) || []
  );
}

function extractLinkedInUrls(text: string): string[] {
  return uniqueNonEmpty(
    text.match(/https?:\/\/(?:[\w-]+\.)?linkedin\.com\/[^\s"'<>]+/gi) || []
  );
}

async function scanWebsiteContactPoints(website: string): Promise<WebsiteContactPoints> {
  let baseUrl: URL;

  try {
    baseUrl = new URL(website.startsWith('http') ? website : `https://${website}`);
  } catch {
    return { emails: [], phones: [], linkedInUrls: [] };
  }

  const targets = [
    baseUrl.toString(),
    new URL('/contact', baseUrl).toString(),
    new URL('/contact-us', baseUrl).toString(),
    new URL('/about', baseUrl).toString(),
    new URL('/team', baseUrl).toString(),
  ];

  const pages = await Promise.allSettled(
    targets.map(async (url) => {
      const response = await safeFetch(url, {
        headers: {
          'User-Agent': 'VertaxRadarBot/1.0 (+https://vertax.com)',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        return '';
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return '';
      }

      const html = await response.text();
      return html.slice(0, 120_000);
    })
  );

  const texts = pages
    .filter((page): page is PromiseFulfilledResult<string> => page.status === 'fulfilled')
    .map((page) => page.value);

  return {
    emails: uniqueNonEmpty(texts.flatMap(extractEmails)),
    phones: uniqueNonEmpty(texts.flatMap(extractPhones)),
    linkedInUrls: uniqueNonEmpty(texts.flatMap(extractLinkedInUrls)),
  };
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
 * 从文本中提取电话号码（简单正则）
 */
function extractPhone(text: string): string | null {
  // 匹配国际电话号码格式
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : null;
}

/**
 * 获取联系人并尝试补全邮箱和电话
 */
async function searchContacts(companyName: string, domain?: string): Promise<IntelligenceData['contacts']> {
  const query = `"${companyName}" decision makers leadership "LinkedIn" contact information`;
  const searchResults = await unifiedSearch(query, 'auto', 10);
  const normalizedDomain = normalizeCompanyDomain(domain);
  let pdlContacts: DecisionMakerContact[] = [];
  if (normalizedDomain) {
    pdlContacts = await searchContactsWithPDL(normalizedDomain);
  }

  if (searchResults.length === 0) {
    return pdlContacts.length > 0 ? { decisionMakers: pdlContacts } : undefined;
  }

  const context = searchResults.map(r => `${r.title}\n${r.text?.slice(0, 500)}`).join('\n\n');

  try {
    const aiResponse = await chatCompletion([
      {
        role: 'system',
        content: `提取决策者信息（姓名、职位、LinkedIn、邮箱、电话）。尽可能提取所有可用的联系方式。JSON：{"decisionMakers": [{"name": "...", "title": "...", "linkedIn": "...", "email": "...", "phone": "..."}]}`
      },
      { role: 'user', content: context }
    ], { model: 'qwen-plus', temperature: 0.1 });

    const parsed = JSON.parse(aiResponse.content.trim().replace(/```json|```/g, ''));
    let makers = parsed.decisionMakers || [];

    if (pdlContacts.length > 0) {
      makers = mergeDecisionMakers(makers, pdlContacts);
    }

    // 如果有域名，尝试用 Hunter.io 查找邮箱
    if (normalizedDomain && makers.length > 0) {
      console.log(`[RadarEnrich] Finding emails for ${makers.length} contacts of ${companyName} via Hunter.io...`);
      for (const person of makers) {
        // 只查找还没有邮箱的联系人
        if (!person.email) {
          const hResult = await hunterFindEmail(normalizedDomain, person.name);
          if (hResult.email) {
            person.email = hResult.email;
            person.emailConfidence = hResult.confidence;
          }
        }
        // 如果还没有电话，尝试从上下文中提取
        if (!person.phone) {
          const personContext = searchResults.find(r => r.text?.includes(person.name))?.text || '';
          if (personContext) {
            const phone = extractPhone(personContext);
            if (phone) {
              person.phone = phone;
            }
          }
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
    include: {
      source: {
        select: { code: true },
      },
    },
  });

  if (!candidate) return { candidateId, success: false, data: {}, errors: ['Not found'] };

  const companyName = candidate.displayName;
  const googlePlacesEnrichResult = await enrichFromGooglePlacesIdentity(candidate);
  let exaEnrichResult:
    | Awaited<ReturnType<typeof enrichCandidateWithExa>>
    | null = null;

  if (
    process.env.EXA_API_KEY &&
    (options?.includeContacts !== false ||
      !candidate.website ||
      !candidate.description ||
      !candidate.linkedInUrl)
  ) {
    try {
      exaEnrichResult = await enrichCandidateWithExa(
        companyName,
        candidate.country || null,
        candidate.industry || null
      );
    } catch (error) {
      errors.push(`Exa enrich: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const workingWebsite =
    candidate.website ||
    googlePlacesEnrichResult?.website ||
    exaEnrichResult?.website ||
    undefined;
  const domain = normalizeCompanyDomain(workingWebsite) || undefined;

  const tasks: Promise<unknown>[] = [];

  if (options?.includeFunding !== false) {
    tasks.push(searchFunding(companyName).then(d => { if (d) intelligence.funding = d; }).catch(e => errors.push(`Funding: ${e.message}`)));
  }
  if (options?.includeNews !== false) {
    tasks.push(searchNews(companyName).then(d => { if (d) intelligence.news = d; }).catch(e => errors.push(`News: ${e.message}`)));
  }
  if (options?.includeContacts !== false) {
    tasks.push(searchContacts(companyName, domain).then(d => { if (d) intelligence.contacts = d; }).catch(e => errors.push(`Contacts: ${e.message}`)));
    if (workingWebsite) {
      tasks.push(
        scanWebsiteContactPoints(workingWebsite)
          .then((contacts) => {
            if (!intelligence.contacts) intelligence.contacts = {};
            intelligence.contacts.companyContacts = contacts;
          })
          .catch((e) => errors.push(`Website contacts: ${e.message}`))
      );
    }
  }

  await Promise.allSettled(tasks);

  const hasBaseEnrichment = Boolean(
    googlePlacesEnrichResult?.website ||
      googlePlacesEnrichResult?.phone ||
      googlePlacesEnrichResult?.address ||
      googlePlacesEnrichResult?.description ||
    exaEnrichResult?.website ||
      exaEnrichResult?.email ||
      exaEnrichResult?.linkedInUrl ||
      exaEnrichResult?.description
  );

  if (Object.keys(intelligence).length > 0 || hasBaseEnrichment) {
    // 尝试从决策者联系人中提取邮箱和电话
    const foundEmail = intelligence.contacts?.decisionMakers?.find(m => m.email)?.email;
    const foundPhone = intelligence.contacts?.decisionMakers?.find(m => m.phone)?.phone;
    const companyEmail = intelligence.contacts?.companyContacts?.emails?.[0];
    const companyPhone = intelligence.contacts?.companyContacts?.phones?.[0];
    const linkedInUrl =
      intelligence.contacts?.decisionMakers?.find((m) => m.linkedIn)?.linkedIn ||
      intelligence.contacts?.companyContacts?.linkedInUrls?.[0] ||
      exaEnrichResult?.linkedInUrl;
    
    const updateData: Record<string, unknown> = {
      enrichedAt: new Date(),
      // 优先使用 Hunter.io 找到的邮箱，如果没有则保持原有值
      ...((foundEmail || companyEmail || exaEnrichResult?.email) &&
        !candidate.email && { email: foundEmail || companyEmail || exaEnrichResult?.email }),
      // 回填电话（如果有）
      ...((foundPhone || companyPhone || googlePlacesEnrichResult?.phone) &&
        !candidate.phone && { phone: foundPhone || companyPhone || googlePlacesEnrichResult?.phone }),
      ...(workingWebsite && !candidate.website && { website: workingWebsite }),
      ...(googlePlacesEnrichResult?.address && !candidate.address && { address: googlePlacesEnrichResult.address }),
      ...(googlePlacesEnrichResult?.description && !candidate.description && { description: googlePlacesEnrichResult.description }),
      ...(exaEnrichResult?.description && !candidate.description && { description: exaEnrichResult.description }),
      ...(linkedInUrl && !candidate.linkedInUrl && { linkedInUrl }),
      rawData: {
        ...(candidate.rawData as object || {}),
        ...(googlePlacesEnrichResult?.rawSnapshot || {}),
        ...(exaEnrichResult?.rawSnapshot || {}),
        intelligence,
      } as object,
    };
    
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: updateData,
    });
  }

  return {
    candidateId,
    success: Object.keys(intelligence).length > 0 || hasBaseEnrichment,
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
    // 提取联系方式
    const foundEmail = enrichment.data.contacts?.decisionMakers?.find(m => m.email)?.email;
    const foundPhone = enrichment.data.contacts?.decisionMakers?.find(m => m.phone)?.phone;
    
    // 获取候选当前状态
    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
      select: { email: true, phone: true }
    });

    const aiRelevancePayload = {
      ...enrichment.data,
      signalScores: signals,
    } as unknown as Prisma.InputJsonValue;
    
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        matchScore: signals.overallScore, // 覆盖原始匹配分
        // 回填邮箱和电话（如果之前没有）
        ...(foundEmail && !candidate?.email && { email: foundEmail }),
        ...(foundPhone && !candidate?.phone && { phone: foundPhone }),
        aiRelevance: aiRelevancePayload,
      },
    });
  }
  return { enrichment, signals };
}
