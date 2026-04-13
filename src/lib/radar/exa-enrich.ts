/**
 * Exa-based 候选丰富化
 *
 * 对 QUALIFIED 状态且缺少 website/email 的候选，
 * 通过 Exa 搜索补全联系方式、公司描述、LinkedIn。
 *
 * 调用方：/api/cron/radar-enrich 第二阶段
 */

import { resolveApiKey } from '@/lib/services/api-key-resolver';

const EXA_API_URL = "https://api.exa.ai/search";

interface ExaSearchResult {
  id: string;
  url: string;
  title: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
}

interface EnrichResult {
  website?: string;
  email?: string;
  linkedInUrl?: string;
  description?: string;
  /** 原始搜索结果快照，写入 rawData.exaEnrich */
  rawSnapshot?: Record<string, unknown>;
}

async function exaSearch(query: string, numResults = 3): Promise<ExaSearchResult[]> {
  const apiKey = await resolveApiKey('exa');
  if (!apiKey) throw new Error("EXA_API_KEY not set");

  const res = await fetch(EXA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults,
      type: "neural",
      useAutoprompt: true,
      contents: { text: { maxCharacters: 800 } },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Exa search failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as ExaSearchResponse;
  return data.results ?? [];
}

/** 从文本中提取 email（简单正则） */
function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : undefined;
}

/** 从结果列表中找官网（排除社媒和目录站） */
function pickWebsite(results: ExaSearchResult[], companyName: string): string | undefined {
  const excluded = [
    "linkedin.com", "facebook.com", "twitter.com", "instagram.com",
    "youtube.com", "crunchbase.com", "bloomberg.com", "reuters.com",
    "glassdoor.com", "indeed.com", "yelp.com", "yellowpages.com",
    "dnb.com", "zoominfo.com", "apollo.io",
  ];
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      if (excluded.some(e => host.includes(e))) continue;
      // 官网通常包含公司名的一部分
      const namePart = companyName.toLowerCase().split(/\s+/)[0];
      if (namePart && host.includes(namePart)) return r.url.split(/[?#]/)[0];
    } catch {
      // invalid URL, skip
    }
  }
  // fallback: first non-excluded result
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname;
      if (!excluded.some(e => host.includes(e))) return r.url.split(/[?#]/)[0];
    } catch { /* skip */ }
  }
  return undefined;
}

/** 从结果中找 LinkedIn 公司页 */
function pickLinkedIn(results: ExaSearchResult[]): string | undefined {
  for (const r of results) {
    if (r.url.includes("linkedin.com/company/")) {
      return r.url.split(/[?#]/)[0];
    }
  }
  return undefined;
}

/**
 * 用 Exa 丰富化单个候选公司
 * @param companyName 公司显示名
 * @param country 国家（可选，提高精准度）
 * @param industry 行业（可选）
 */
export async function enrichCandidateWithExa(
  companyName: string,
  country?: string | null,
  industry?: string | null
): Promise<EnrichResult> {
  const locationHint = country ? ` ${country}` : "";
  const industryHint = industry ? ` ${industry}` : "";

  // 搜索1：官网 + 联系方式
  const contactQuery = `${companyName}${locationHint}${industryHint} official website contact email`;
  // 搜索2：LinkedIn 公司页
  const linkedInQuery = `site:linkedin.com/company ${companyName}${locationHint}`;

  const [contactResults, linkedInResults] = await Promise.allSettled([
    exaSearch(contactQuery, 5),
    exaSearch(linkedInQuery, 3),
  ]);

  const contacts = contactResults.status === "fulfilled" ? contactResults.value : [];
  const linkedIns = linkedInResults.status === "fulfilled" ? linkedInResults.value : [];

  const result: EnrichResult = {};

  // 官网
  result.website = pickWebsite(contacts, companyName);

  // LinkedIn
  result.linkedInUrl = pickLinkedIn([...linkedIns, ...contacts]);

  // Email：从搜索结果文本中提取
  for (const r of contacts) {
    const text = r.text ?? r.highlights?.join(" ") ?? "";
    const email = extractEmail(text);
    if (email) {
      result.email = email;
      break;
    }
  }

  // 描述：取第一条结果的摘要
  if (contacts[0]?.text) {
    result.description = contacts[0].text.slice(0, 400).trim();
  }

  // 原始快照（写入 rawData）
  result.rawSnapshot = {
    exaEnrich: {
      enrichedAt: new Date().toISOString(),
      contactResults: contacts.map(r => ({ url: r.url, title: r.title, score: r.score })),
      linkedInResults: linkedIns.map(r => ({ url: r.url, title: r.title })),
    },
  };

  return result;
}
