// ==================== AI Search Adapter ====================
// AI + 搜索引擎适配器，用于发现官方 API 未覆盖地区的招标

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

// ==================== 类型定义 ====================

interface GeneratedQuery {
  lang: string;
  query: string;
  targetSites?: string[];
  region?: string;
}

interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
}

interface SearchAPIResponse {
  organic_results?: WebSearchResult[];
  web?: { results?: WebSearchResult[] };
}

// ==================== AI 搜索适配器 ====================

export class AISearchAdapter implements RadarAdapter {
  readonly sourceCode = 'ai_search';
  readonly channelType = 'TENDER' as const;
  
  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: false,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 20,
    rateLimit: { requests: 5, windowMs: 60000 },
  };

  private timeout: number;
  private searchApiKey?: string;

  constructor(config: AdapterConfig) {
    this.timeout = config.timeout || 60000;
    this.searchApiKey = config.apiKey || process.env.SERPAPI_KEY || process.env.BING_SEARCH_KEY;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    
    // Step 1: AI 生成多语言搜索查询
    const searchQueries = await this.generateSearchQueries(query);
    
    // Step 2: 执行搜索
    const searchResults = await this.executeSearches(searchQueries, query);
    
    // Step 3: AI 解析搜索结果，提取招标信息
    const tenders = await this.parseSearchResults(searchResults, query);
    
    const duration = Date.now() - startTime;
    
    return {
      items: tenders,
      total: tenders.length,
      hasMore: false,
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration,
      },
    };
  }

  /**
   * AI 生成多语言搜索查询
   */
  private async generateSearchQueries(query: RadarSearchQuery): Promise<GeneratedQuery[]> {
    const systemPrompt = `你是招标搜索专家。根据用户的产品关键词和目标区域，生成用于在搜索引擎搜索招标公告的搜索查询。

输出要求：
1. 生成 3-5 个不同角度的搜索查询
2. 每个查询包含：语言代码、搜索词、目标区域
3. 使用 site: 限定政府采购网站（如 site:gov.* 或 site:gob.*）
4. 包含招标相关词：tender, RFQ, procurement, bid, 招标, 采购, licitación, appel d'offres 等
5. 考虑目标国家的官方语言

输出严格的 JSON 格式：
{
  "queries": [
    { "lang": "en", "query": "industrial robot tender site:gov", "region": "global" },
    { "lang": "es", "query": "robot industrial licitación site:gob.mx", "region": "MX" }
  ]
}`;

    const userPrompt = `产品关键词：${query.keywords?.join(', ') || '(无)'}
目标国家/地区：${query.countries?.join(', ') || query.regions?.join(', ') || '全球'}
目标行业：${query.targetIndustries?.join(', ') || '通用'}`;

    try {
      const result = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: 'qwen-plus',
          temperature: 0.3,
        }
      );

      const parsed = JSON.parse(result.content);
      return parsed.queries || [];
    } catch (error) {
      console.error('Failed to generate search queries:', error);
      // 降级：使用简单查询
      return [{
        lang: 'en',
        query: `${query.keywords?.join(' ') || ''} tender procurement site:gov`,
        region: 'global',
      }];
    }
  }

  /**
   * 执行搜索（使用 SerpAPI 或 Bing Search）
   */
  private async executeSearches(
    queries: GeneratedQuery[],
    _originalQuery: RadarSearchQuery
  ): Promise<Array<{ query: GeneratedQuery; items: WebSearchResult[] }>> {
    const results: Array<{ query: GeneratedQuery; items: WebSearchResult[] }> = [];
    
    // 限制并发数
    const limitedQueries = queries.slice(0, 3);
    
    for (const q of limitedQueries) {
      try {
        let items: WebSearchResult[] = [];
        
        if (process.env.SERPAPI_KEY) {
          items = await this.searchWithSerpAPI(q.query);
        } else if (process.env.BING_SEARCH_KEY) {
          items = await this.searchWithBing(q.query);
        } else {
          // 无搜索 API，跳过
          console.warn('No search API key configured');
          continue;
        }
        
        results.push({ query: q, items });
        
        // 速率限制
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`Search failed for query "${q.query}":`, error);
      }
    }
    
    return results;
  }

  /**
   * 使用 SerpAPI 搜索
   */
  private async searchWithSerpAPI(query: string): Promise<WebSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      api_key: process.env.SERPAPI_KEY!,
      engine: 'google',
      num: '10',
    });
    
    const response = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }
    
    const data: SearchAPIResponse = await response.json();
    return data.organic_results || [];
  }

  /**
   * 使用 Bing Search 搜索
   */
  private async searchWithBing(query: string): Promise<WebSearchResult[]> {
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_KEY!,
        },
        signal: AbortSignal.timeout(this.timeout),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Bing Search error: ${response.status}`);
    }
    
    const data: SearchAPIResponse = await response.json();
    return (data.web?.results || []).map(r => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link,
    }));
  }

  /**
   * AI 解析搜索结果，提取招标信息
   */
  private async parseSearchResults(
    searchResults: Array<{ query: GeneratedQuery; items: WebSearchResult[] }>,
    originalQuery: RadarSearchQuery
  ): Promise<NormalizedCandidate[]> {
    const allItems = searchResults.flatMap(r => r.items);
    
    if (allItems.length === 0) {
      return [];
    }

    const systemPrompt = `你是招标信息提取专家。分析搜索结果，识别其中的招标/采购公告，并提取关键信息。

对于每个识别为招标的结果，提取：
- title: 招标标题
- buyerName: 采购方名称（如能识别）
- buyerCountry: 采购方国家（ISO code，如 US, CN, MX）
- deadline: 截止日期（ISO 格式，如能识别）
- sourceUrl: 原文链接
- description: 简要描述

输出严格的 JSON 格式：
{
  "tenders": [
    { "title": "...", "buyerName": "...", "buyerCountry": "...", "sourceUrl": "...", "description": "..." }
  ],
  "nonTenders": ["url1", "url2"]
}

注意：
1. 只提取真实的招标/采购公告，排除新闻报道、分析文章等
2. 如果无法确定是否为招标，不要包含
3. sourceUrl 必须是原始搜索结果中的 link`;

    const userPrompt = `搜索结果：
${JSON.stringify(allItems.slice(0, 15).map(item => ({
  title: item.title,
  snippet: item.snippet,
  link: item.link,
})), null, 2)}

原始搜索关键词：${originalQuery.keywords?.join(', ') || '(无)'}
目标区域：${originalQuery.countries?.join(', ') || originalQuery.regions?.join(', ') || '全球'}`;

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

      const parsed = JSON.parse(result.content);
      const tenders = parsed.tenders || [];
      
      return tenders.map((t: Record<string, unknown>, idx: number) => this.normalizeAIResult(t, idx, originalQuery));
    } catch (error) {
      console.error('Failed to parse search results:', error);
      return [];
    }
  }

  /**
   * 标准化 AI 解析结果
   */
  private normalizeAIResult(
    data: Record<string, unknown>, 
    idx: number, 
    query: RadarSearchQuery
  ): NormalizedCandidate {
    const sourceUrl = String(data.sourceUrl || data.link || '');
    const externalId = `ai_${Date.now()}_${idx}_${this.hashUrl(sourceUrl)}`;
    
    return {
      externalId,
      sourceUrl,
      displayName: String(data.title || '未知招标'),
      candidateType: 'OPPORTUNITY',
      
      description: data.description as string | undefined,
      
      deadline: data.deadline ? new Date(String(data.deadline)) : undefined,
      
      buyerName: data.buyerName as string | undefined,
      buyerCountry: data.buyerCountry as string | undefined,
      buyerType: 'government',
      
      matchExplain: {
        channel: 'ai_search',
        query: query.keywords?.join(' '),
        reasons: ['AI 搜索发现'],
      },
      
      rawData: {
        source: 'ai_search',
        originalData: data,
        searchKeywords: query.keywords,
      },
    };
  }

  /**
   * 简单 URL 哈希
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  normalize(raw: unknown): NormalizedCandidate {
    // AI 搜索在 parseSearchResults 中已标准化
    return raw as NormalizedCandidate;
  }

  async healthCheck(): Promise<HealthStatus> {
    const hasSearchApi = !!(process.env.SERPAPI_KEY || process.env.BING_SEARCH_KEY);
    
    return {
      healthy: hasSearchApi,
      latency: 0,
      lastCheckedAt: new Date(),
      error: hasSearchApi ? undefined : 'No search API key configured (SERPAPI_KEY or BING_SEARCH_KEY)',
    };
  }
}
