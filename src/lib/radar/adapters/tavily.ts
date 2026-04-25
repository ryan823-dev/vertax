/**
 * Tavily 搜索适配器
 * 
 * 特点：
 * - AI 原生搜索，专为 RAG 和 Agent 设计
 * - 自动评估来源可信度
 * - 搜索结果自带内容摘要
 * - LangChain/LlamaIndex 原生支持
 * 
 * 免费额度：1000次/月
 * 价格：$8/1000次
 * 文档：https://docs.tavily.com/
 */

import type {
  RadarAdapter,
  RadarSearchQuery,
  RadarSearchResult,
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from '@/lib/radar/adapters/types';
import { getCountryDisplayName, toTavilyCountryName } from '../country-utils';

// 数据源类型标注
export const TAVILY_SOURCE_TYPE = 'OFFICIAL_API' as const;

// ==================== API 响应类型 ====================

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  response_time: number;
  images?: string[];
}

// ==================== Tavily 适配器 ====================

export class TavilyAdapter implements RadarAdapter {
  readonly sourceCode = 'tavily';
  readonly channelType = 'DIRECTORY' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: false,
    supportsDateFilter: true,
    supportsRegionFilter: false,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 10,
    rateLimit: { requests: 100, windowMs: 60000 },
  };

  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || '';
    this.timeout = config.timeout || 30000;
  }

  private async getApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;
    const { resolveApiKey } = await import('@/lib/services/api-key-resolver');
    return resolveApiKey('tavily');
  }

  /**
   * 搜索
   */
  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Tavily API key not configured');
    }

    const locationName = getCountryDisplayName(query.countries?.[0]);
    const searchQuery = [query.keywords?.join(' ') || '', locationName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!searchQuery) {
      return {
        items: [],
        total: 0,
        hasMore: false,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration: 0,
        },
        isExhausted: true,
      };
    }

    const requestBody: Record<string, unknown> = {
      query: searchQuery,
      max_results: Math.min(query.pageSize || 10, 10),
      include_raw_content: false,
      include_images: false,
    };

    const tavilyCountry = toTavilyCountryName(query.countries?.[0]);
    if (tavilyCountry) {
      requestBody.country = tavilyCountry;
    }

    // 搜索深度：basic 或 advanced
    if (query.maxResults && query.maxResults > 5) {
      requestBody.search_depth = 'advanced';
    }

    // 时间范围
    if (query.publishedAfter) {
      const daysDiff = Math.floor((Date.now() - query.publishedAfter.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) {
        requestBody.days = 7;
      } else if (daysDiff <= 30) {
        requestBody.days = 30;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavily API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data: TavilySearchResponse = await response.json();
      const duration = Date.now() - startTime;

      const items = data.results.map((result) => this.normalizeResult(result));

      return {
        items,
        total: items.length,
        hasMore: false,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration,
        },
        isExhausted: true,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 带内容提取的搜索
   */
  async searchWithContent(
    query: string,
    options: {
      maxResults?: number;
      includeRawContent?: boolean;
      includeImages?: boolean;
    } = {}
  ): Promise<TavilySearchResponse> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Tavily API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: options.maxResults || 5,
        include_raw_content: options.includeRawContent ?? false,
        include_images: options.includeImages ?? false,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 提取网页内容
   */
  async extract(urls: string[]): Promise<Array<{ url: string; raw_content: string }>> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Tavily API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        urls,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Tavily Extract API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  private normalizeResult(result: TavilySearchResult): NormalizedCandidate {
    return {
      externalId: `tavily-${Buffer.from(result.url).toString('base64').slice(0, 20)}`,
      sourceUrl: result.url,
      displayName: result.title,
      candidateType: 'OPPORTUNITY',

      description: result.content,

      matchExplain: {
        channel: 'tavily',
        reasons: [`相关度: ${(result.score * 100).toFixed(0)}%`],
      },
      matchScore: result.score,

      rawData: result as unknown as Record<string, unknown>,
    };
  }

  /**
   * 标准化原始数据为 NormalizedCandidate
   */
  normalize(raw: unknown): NormalizedCandidate {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid raw data for Tavily adapter');
    }

    const result = raw as TavilySearchResult;

    return this.normalizeResult(result);
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return {
        healthy: false,
        latency: 0,
        error: 'API key not configured',
      };
    }

    try {
      // 简单的搜索测试
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: 'test',
          max_results: 1,
        }),
        signal: AbortSignal.timeout(10000),
      });

      return {
        healthy: response.ok,
        latency: Date.now() - startTime,
        lastCheckedAt: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        lastCheckedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default TavilyAdapter;
