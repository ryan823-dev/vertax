// ==================== Brave Search Adapter ====================
// Brave Search API 适配器，用于 AI 辅助公司发现

import type { 
  RadarAdapter, 
  RadarSearchQuery, 
  RadarSearchResult, 
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';
import { chatCompletion } from '@/lib/ai-client';
import { getCountryDisplayName } from '../country-utils';

// ==================== Brave Search API 类型 ====================

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  is_source_local?: boolean;
  is_source_both?: boolean;
  extra_snippets?: string[];
  deep_results?: {
    buttons?: Array<{ text: string; url: string }>;
    links?: Array<{ title: string; url: string }>;
  };
}

interface BraveWebResponse {
  web?: {
    results: BraveSearchResult[];
  };
  query?: {
    original: string;
  };
}

interface ParsedCompany {
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  country?: string;
  city?: string;
  sourceUrl: string;
  confidence: number;
  signals: string[];
}

function extractJsonPayload(content: string): string {
  const trimmed = content.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const jsonStart = withoutFences.indexOf('{');
  const jsonEnd = withoutFences.lastIndexOf('}');

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return withoutFences.slice(jsonStart, jsonEnd + 1);
  }

  return withoutFences;
}

// ==================== Brave Search 适配器 ====================

export class BraveSearchAdapter implements RadarAdapter {
  readonly sourceCode = 'brave_search';
  readonly channelType = 'DIRECTORY' as const;  // 用于发现公司目录
  
  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: false,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 30,
    rateLimit: { requests: 15, windowMs: 60000 }, // Brave free tier: 15 req/min
  };

  private apiKey: string;
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || process.env.BRAVE_SEARCH_API_KEY || '';
    this.timeout = config.timeout || 30000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Brave Search API key not configured');
    }
    
    // 生成搜索查询
    const searchQueries = this.generateSearchQueries(query);
    
    // 游标支持：从上次的 queryIndex 继续
    const startIndex = query.cursor?.queryIndex ?? 0;
    const queriesToRun = searchQueries.slice(startIndex, startIndex + 3);
    
    // 执行搜索
    const allResults: BraveSearchResult[] = [];
    for (const sq of queriesToRun) {
      const results = await this.executeSearch(sq, query.countries?.[0]);
      allResults.push(...results);
      // 速率限制
      if (queriesToRun.length > 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // AI 解析提取公司信息
    const companies = await this.parseCompanies(allResults, query);
    
    // 转换为标准候选
    const items = companies.map(c => this.normalizeCompany(c));
    
    const duration = Date.now() - startTime;
    const nextQueryIndex = startIndex + queriesToRun.length;
    const allExhausted = nextQueryIndex >= searchQueries.length;
    
    return {
      items,
      total: items.length,
      hasMore: !allExhausted,
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration,
      },
      // 持续扫描游标
      nextCursor: allExhausted ? undefined : { queryIndex: nextQueryIndex },
      isExhausted: allExhausted,
    };
  }

  /**
   * 生成多角度搜索查询
   */
  private generateSearchQueries(query: RadarSearchQuery): string[] {
    const queries: string[] = [];
    const keywords = query.keywords?.join(' ') || '';
    const industries = query.targetIndustries || [];
    const countries = query.countries || [];
    const companyTypes = query.companyTypes || [];
    
    // 基础查询：关键词 + 公司类型
    if (keywords) {
      const typeStr = companyTypes.includes('manufacturer') ? 'manufacturer factory' : 
                      companyTypes.includes('distributor') ? 'supplier distributor' : 
                      'company';
      queries.push(`${keywords} ${typeStr}`);
    }
    
    // 行业 + 地区查询
    if (industries.length && countries.length) {
      const countryName = getCountryDisplayName(countries[0]) || countries[0];
      queries.push(`${industries[0]} companies in ${countryName}`);
    }
    
    // B2B 目录查询
    if (keywords) {
      queries.push(`${keywords} B2B suppliers directory`);
    }
    
    // 展会/协会查询（高质量来源）
    if (industries.length) {
      queries.push(`${industries[0]} manufacturers association members`);
    }
    
    return queries.length > 0 ? queries : ['industrial manufacturers'];
  }

  /**
   * 执行 Brave Search
   */
  private async executeSearch(query: string, country?: string): Promise<BraveSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: '20',
      result_filter: 'web',
      search_lang: 'en',
      safesearch: 'off',
    });
    
    if (country) {
      params.set('country', country.toLowerCase());
    }
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
    }
    
    const data: BraveWebResponse = await response.json();
    return data.web?.results || [];
  }

  /**
   * AI 解析搜索结果提取公司信息
   */
  private async parseCompanies(
    results: BraveSearchResult[], 
    query: RadarSearchQuery
  ): Promise<ParsedCompany[]> {
    if (results.length === 0) return [];
    
    const systemPrompt = `你是B2B公司研究专家。分析搜索结果，识别其中的目标公司（制造商、供应商、分销商等），提取公司信息。

输出要求：
1. 只提取真实的公司/企业，排除新闻、文章、论坛
2. 提取公司名称、网站、行业、国家/城市、简要描述
3. 评估匹配置信度（0-1）和匹配信号
4. 优先关注：官网、B2B平台企业页、协会会员、行业目录

输出严格的 JSON 格式：
{
  "companies": [
    {
      "name": "公司名称",
      "website": "https://...",
      "description": "公司简介",
      "industry": "行业",
      "country": "ISO 3166-1 alpha-2 country code if known, otherwise empty string",
      "city": "城市",
      "sourceUrl": "信息来源URL",
      "confidence": 0.8,
      "signals": ["有官网", "制造商", "目标行业匹配"]
    }
  ]
}`;

    const userPrompt = `搜索目标：
- 关键词：${query.keywords?.join(', ') || '(无)'}
- 行业：${query.targetIndustries?.join(', ') || '(无)'}
- 地区：${query.countries?.join(', ') || query.regions?.join(', ') || '全球'}
- 公司类型：${query.companyTypes?.join(', ') || '制造商/供应商'}

搜索结果：
${JSON.stringify(results.slice(0, 20).map(r => ({
  title: r.title,
  url: r.url,
  description: r.description,
  snippets: r.extra_snippets?.slice(0, 2),
})), null, 2)}`;

    try {
      const result = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: 'qwen-plus',
          temperature: 0.2,
        }
      );

      const parsed = JSON.parse(extractJsonPayload(result.content));
      return (parsed.companies || []).filter((c: ParsedCompany) => c.confidence >= 0.5);
    } catch (error) {
      console.error('Failed to parse companies:', error);
      return [];
    }
  }

  /**
   * 将解析结果转换为标准候选
   */
  private normalizeCompany(company: ParsedCompany): NormalizedCandidate {
    const externalId = `brave_${Date.now()}_${this.hashString(company.website || company.name)}`;
    
    return {
      externalId,
      sourceUrl: company.sourceUrl || company.website || '',
      displayName: company.name,
      candidateType: 'COMPANY',
      
      website: company.website,
      description: company.description,
      country: getCountryDisplayName(company.country) || company.country,
      city: company.city,
      industry: company.industry,
      
      matchExplain: {
        channel: 'brave_search',
        reasons: company.signals,
        matchedKeywords: company.signals,
      },
      
      rawData: {
        source: 'brave_search',
        confidence: company.confidence,
        originalData: company,
      },
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  async healthCheck(): Promise<HealthStatus> {
    if (!this.apiKey) {
      return {
        healthy: false,
        latency: 0,
        error: 'Brave Search API key not configured (BRAVE_SEARCH_API_KEY)',
      };
    }
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(
        'https://api.search.brave.com/res/v1/web/search?q=test&count=1',
        {
          headers: {
            'X-Subscription-Token': this.apiKey,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        return { healthy: true, latency };
      }
      
      return {
        healthy: false,
        latency,
        error: `API error: ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
