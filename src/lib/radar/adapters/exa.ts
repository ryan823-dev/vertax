/**
 * Exa 搜索适配器
 * 
 * 特点：
 * - 神经语义搜索，理解意图而非关键词匹配
 * - 适合"发现"类查询
 * - AI 原生设计
 * 
 * 免费额度：1000次/月
 * 价格：$1.5/1000次（最便宜）
 * 文档：https://docs.exa.ai/
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
import { resolveApiKey } from '@/lib/services/api-key-resolver';

// 数据源类型标注
export const EXA_SOURCE_TYPE = 'OFFICIAL_API' as const;

// ==================== API 响应类型 ====================

interface ExaSearchResult {
  id?: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  text?: string;
  highlights?: string[];
  summary?: string;
  image?: string;
  favicon?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
  costDollars?: {
    total: number;
    search: number;
    contents: number;
  };
}

interface ExaSearchRequest {
  query?: string;
  useAutoprompt?: boolean;
  type?: 'keyword' | 'neural' | 'auto';
  category?: 'company' | 'research paper' | 'news' | 'github' | 'tweet' | 'movie' | 'song' | 'personal site' | 'pdf';
  numResults?: number;
  contents?: {
    text?: boolean;
    highlights?: {
      numSentences?: number;
      query?: string;
    };
    summary?: boolean;
  };
  excludeDomains?: string[];
  includeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
}

// ==================== Exa 适配器 ====================

export class ExaAdapter implements RadarAdapter {
  readonly sourceCode = 'exa';
  readonly channelType = 'DIRECTORY' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: true,
    supportsRegionFilter: false,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 100,
    rateLimit: { requests: 100, windowMs: 60000 },
  };

  private apiKey: string;
  private baseUrl = 'https://api.exa.ai';
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || '';
    this.timeout = config.timeout || 30000;
  }

  private async getApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;
    return resolveApiKey('exa');
  }

  /**
   * 搜索
   */
  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Exa API key not configured');
    }

    const searchQuery = query.keywords?.join(' ') || '';

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

    const requestBody: ExaSearchRequest = {
      query: searchQuery,
      type: 'neural', // 使用神经搜索
      useAutoprompt: true, // 自动优化查询
      numResults: Math.min(query.pageSize || 10, 100),
      contents: {
        text: true,
        highlights: { numSentences: 3 },
        summary: true,
      },
    };

    // 分类过滤
    if (query.targetIndustries?.length) {
      // 根据行业选择合适的分类
      const industryMap: Record<string, ExaSearchRequest['category']> = {
        'research': 'research paper',
        'news': 'news',
        'github': 'github',
        'tech': 'github',
      };
      for (const industry of query.targetIndustries) {
        const category = industryMap[industry.toLowerCase()];
        if (category) {
          requestBody.category = category;
          break;
        }
      }
    }

    // 日期范围
    if (query.publishedAfter) {
      requestBody.startPublishedDate = query.publishedAfter.toISOString().split('T')[0];
    }
    if (query.publishedBefore) {
      requestBody.endPublishedDate = query.publishedBefore.toISOString().split('T')[0];
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Exa API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data: ExaSearchResponse = await response.json();
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
   * 搜索公司
   */
  async searchCompanies(
    query: string,
    options: {
      numResults?: number;
      excludeDomains?: string[];
    } = {}
  ): Promise<ExaSearchResult[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query,
          type: 'neural',
          category: 'company',
          numResults: options.numResults || 10,
          contents: {
            summary: true,
          },
          excludeDomains: options.excludeDomains,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return [];
      }

      const data: ExaSearchResponse = await response.json();
      return data.results;
    } catch (error) {
      console.warn('[ExaAdapter] API call failed:', String(error));
      return [];
    }
  }

  /**
   * 搜索研究论文
   */
  async searchResearchPapers(
    query: string,
    options: {
      numResults?: number;
      startPublishedDate?: string;
    } = {}
  ): Promise<ExaSearchResult[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query,
          type: 'neural',
          category: 'research paper',
          numResults: options.numResults || 10,
          contents: {
            text: true,
          },
          startPublishedDate: options.startPublishedDate,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return [];
      }

      const data: ExaSearchResponse = await response.json();
      return data.results;
    } catch (error) {
      console.warn('[ExaAdapter] API call failed:', String(error));
      return [];
    }
  }

  /**
   * 查找相似内容
   */
  async findSimilar(
    url: string,
    options: {
      numResults?: number;
      excludeDomain?: string;
    } = {}
  ): Promise<ExaSearchResult[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/findSimilar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          url,
          numResults: options.numResults || 10,
          excludeDomain: options.excludeDomain,
          contents: {
            summary: true,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return [];
      }

      const data: ExaSearchResponse = await response.json();
      return data.results;
    } catch (error) {
      console.warn('[ExaAdapter] API call failed:', String(error));
      return [];
    }
  }

  /**
   * 获取内容
   */
  async getContents(ids: string[]): Promise<ExaSearchResult[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/contents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          ids,
          text: true,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return [];
      }

      const data: ExaSearchResponse = await response.json();
      return data.results;
    } catch (error) {
      console.warn('[ExaAdapter] API call failed:', String(error));
      return [];
    }
  }

  /**
   * 从 URL 提取公司域名
   * 例如: https://www.acme-corp.com/about -> Acme Corp
   */
  private extractCompanyNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      // 去掉 TLD，取主域名
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        // 取倒数第二部分作为公司名（处理 .co.uk 等）
        const domainPart = parts[parts.length - 2] || parts[0];
        // 转换为可读格式: acme-corp -> Acme Corp
        return domainPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
      }
      return hostname;
    } catch {
      return url;
    }
  }

  /**
   * 判断是否是研究论文/博客文章（非公司信息）
   */
  private isNonCompanyContent(result: ExaSearchResult): boolean {
    const paperKeywords = ['paper', 'research', 'study', 'journal', 'doi.org', 'arxiv', 'pubmed', 'ncbi'];
    const blogKeywords = ['blog', 'medium', 'substack', 'wordpress', 'article', 'news'];
    
    const text = (result.title + ' ' + (result.url || '')).toLowerCase();
    return paperKeywords.some(kw => text.includes(kw)) || blogKeywords.some(kw => text.includes(kw));
  }

  private normalizeResult(result: ExaSearchResult): NormalizedCandidate {
    const isNonCompany = this.isNonCompanyContent(result);
    
    // 从 URL 提取公司名，而不是使用网页标题
    const companyName = this.extractCompanyNameFromUrl(result.url);
    
    // 尝试从标题提取行业信息
    let industry: string | undefined;
    const titleLower = result.title.toLowerCase();
    if (titleLower.includes('paint') || titleLower.includes('coating') || titleLower.includes('spray')) {
      industry = 'Coating & Painting';
    } else if (titleLower.includes('robot') || titleLower.includes('automation')) {
      industry = 'Robotics & Automation';
    } else if (titleLower.includes('manufactur')) {
      industry = 'Manufacturing';
    }

    return {
      externalId: result.id || `exa-${Buffer.from(result.url).toString('base64').slice(0, 20)}`,
      sourceUrl: result.url,
      displayName: isNonCompany ? companyName : result.title, // 非公司内容使用域名，公司内容使用标题
      candidateType: isNonCompany ? 'OPPORTUNITY' : 'COMPANY',

      // 公司字段
      website: result.url,
      industry,
      description: result.summary || result.text?.slice(0, 500) || result.highlights?.join('\n') || '',

      publishedAt: result.publishedDate ? new Date(result.publishedDate) : undefined,

      matchExplain: {
        channel: 'exa',
        reasons: [
          result.author ? `来源: ${result.author}` : '',
          result.score ? `相关度: ${(result.score * 100).toFixed(0)}%` : '',
          industry ? `行业: ${industry}` : '',
        ].filter(Boolean),
      },
      matchScore: result.score || 0.7,

      rawData: result as unknown as Record<string, unknown>,
    };
  }

  /**
   * 标准化原始数据为 NormalizedCandidate
   */
  normalize(raw: unknown): NormalizedCandidate {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid raw data for Exa adapter');
    }

    const result = raw as ExaSearchResult;

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
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query: 'test',
          numResults: 1,
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

export default ExaAdapter;
