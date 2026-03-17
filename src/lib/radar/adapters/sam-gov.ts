// ==================== SAM.gov Adapter ====================
// 美国联邦政府采购招标适配器
// SAM.gov 是美国政府唯一的采购招标平台

import type {
  RadarAdapter,
  RadarSearchQuery,
  RadarSearchResult,
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';

// ==================== SAM.gov API 类型 ====================

interface SAMOpportunity {
  opportunityId: string;
  title: string;
  solicitationNumber: string;
  responseDeadline?: string;
  postedDate?: string;
  description?: string;
  organizationType?: string;
  classificationCode?: string;
  naicsCode?: string;
  naicsDescription?: string;
  placeOfPerformance?: {
    city?: { name: string };
    state?: { name: string };
    country?: { code: string; name: string };
  };
  pointOfContact?: Array<{
    name?: string;
    email?: string;
    phone?: string;
  }>;
  link?: string;
  fullParentPathName?: string; // 机构层级
  award?: {
    awardAmount?: number;
    awardee?: {
      name: string;
      uei?: string;
    };
  };
}

interface SAMSearchResponse {
  totalRecords: number;
  opportunitiesData: SAMOpportunity[];
  page?: {
    currentPage: number;
    totalPages: number;
  };
}

// ==================== SAM.gov 适配器 ====================

export class SAMGovAdapter implements RadarAdapter {
  readonly sourceCode = 'sam_gov';
  readonly channelType = 'TENDER' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true, // NAICS codes
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: true,
    supportsDetails: true,
    maxResultsPerQuery: 100,
    rateLimit: { requests: 30, windowMs: 60000 },
  };

  private apiKey: string;
  private timeout: number;
  private baseUrl = 'https://api.sam.gov/opportunities/v2/search';

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || process.env.SAM_GOV_API_KEY || '';
    this.timeout = config.timeout || 30000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      // 如果没有API Key，使用公开网页抓取作为备选
      return this.searchViaWebScrape(query);
    }

    // 构建API查询参数
    const params = this.buildQueryParams(query);

    try {
      const response = await fetch(
        `${this.baseUrl}?${params.toString()}`,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        // API失败，回退到网页抓取
        return this.searchViaWebScrape(query);
      }

      const data: SAMSearchResponse = await response.json();
      const items = (data.opportunitiesData || []).map(o => this.normalizeOpportunity(o));

      const duration = Date.now() - startTime;

      return {
        items,
        total: data.totalRecords || items.length,
        hasMore: data.page && data.page.currentPage < data.page.totalPages,
        nextCursor: data.page ? { nextPage: data.page.currentPage + 1 } : undefined,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration,
        },
        isExhausted: !data.page || data.page.currentPage >= data.page.totalPages,
      };
    } catch (error) {
      console.error('[SAM.gov] API error, falling back to web scrape:', error);
      return this.searchViaWebScrape(query);
    }
  }

  /**
   * 构建API查询参数
   */
  private buildQueryParams(query: RadarSearchQuery): URLSearchParams {
    const params = new URLSearchParams();

    // 关键词搜索
    if (query.keywords?.length) {
      params.set('q', query.keywords.join(' '));
    }

    // NAICS分类代码
    if (query.categories?.length) {
      params.set('naicsCode', query.categories.join(','));
    }

    // 发布日期过滤
    if (query.publishedAfter) {
      params.set('postedFrom', query.publishedAfter.toISOString().split('T')[0]);
    }
    if (query.publishedBefore) {
      params.set('postedTo', query.publishedBefore.toISOString().split('T')[0]);
    }

    // 截止日期过滤
    if (query.deadlineAfter) {
      params.set('responseDeadlineFrom', query.deadlineAfter.toISOString().split('T')[0]);
    }

    // 地区过滤
    if (query.countries?.includes('US') && query.regions?.length) {
      // 将区域映射到州代码
      params.set('stateCode', query.regions.join(','));
    }

    // 分页
    const page = query.cursor?.nextPage || 0;
    params.set('page', String(Math.max(0, page)));
    params.set('limit', '25');

    return params;
  }

  /**
   * 网页抓取备选方案（无需API Key）
   */
  private async searchViaWebScrape(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    try {
      // 使用Brave Search + AI解析SAM.gov搜索结果
      const { BraveSearchAdapter } = await import('./brave-search');
      const braveAdapter = new BraveSearchAdapter({} as never);

      // 构建针对性的搜索查询
      const keywords = query.keywords?.join(' ') || '';
      const naicsDesc = query.targetIndustries?.[0] || '';

      const searchQuery: RadarSearchQuery = {
        keywords: [
          keywords,
          naicsDesc,
          'site:sam.gov',
          'opportunity',
          'solicitation',
        ].filter(Boolean),
        countries: ['US'],
        cursor: query.cursor,
      };

      const braveResult = await braveAdapter.search(searchQuery);

      // 过滤只保留SAM.gov的结果
      const samItems = braveResult.items.filter(
        item => item.sourceUrl?.includes('sam.gov')
      ).map(item => ({
        ...item,
        sourceUrl: item.sourceUrl,
        // 重新标记来源
        matchExplain: {
          ...item.matchExplain as object,
          channel: 'sam_gov',
        },
      }));

      const duration = Date.now() - startTime;

      return {
        items: samItems,
        total: samItems.length,
        hasMore: braveResult.hasMore,
        nextCursor: braveResult.nextCursor,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration,
        },
        isExhausted: braveResult.isExhausted,
      };
    } catch (error) {
      console.error('[SAM.gov] Web scrape error:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration: Date.now() - startTime,
        },
        isExhausted: true,
      };
    }
  }

  /**
   * 标准化招标机会
   */
  normalizeOpportunity(opp: SAMOpportunity): NormalizedCandidate {
    const address = [
      opp.placeOfPerformance?.city?.name,
      opp.placeOfPerformance?.state?.name,
      opp.placeOfPerformance?.country?.name,
    ].filter(Boolean).join(', ');

    return {
      externalId: `sam_${opp.opportunityId}`,
      sourceUrl: opp.link || `https://sam.gov/opp/${opp.opportunityId}/view`,
      displayName: opp.title,
      description: opp.description,
      candidateType: 'OPPORTUNITY',

      // 机会字段
      deadline: opp.responseDeadline ? new Date(opp.responseDeadline) : undefined,
      estimatedValue: opp.award?.awardAmount,
      currency: 'USD',
      buyerName: opp.fullParentPathName,
      buyerCountry: 'US',
      buyerType: this.inferBuyerType(opp.organizationType),
      categoryCode: opp.naicsCode,
      categoryName: opp.naicsDescription,

      // 公司字段（如果已知中标者）
      ...(opp.award?.awardee && {
        displayName: opp.award.awardee.name,
      }),

      // 联系方式
      phone: opp.pointOfContact?.[0]?.phone,
      email: opp.pointOfContact?.[0]?.email,

      address,
      country: opp.placeOfPerformance?.country?.code,
      city: opp.placeOfPerformance?.city?.name,

      matchExplain: {
        channel: 'sam_gov',
        reasons: [
          `美国政府采购`,
          opp.naicsDescription ? `NAICS: ${opp.naicsDescription}` : undefined,
          opp.organizationType,
        ].filter(Boolean) as string[],
        matchedKeywords: [opp.naicsCode].filter(Boolean) as string[],
      },

      publishedAt: opp.postedDate ? new Date(opp.postedDate) : undefined,
      rawData: {
        source: 'sam_gov',
        opportunityId: opp.opportunityId,
        solicitationNumber: opp.solicitationNumber,
        naicsCode: opp.naicsCode,
        organizationType: opp.organizationType,
      },
    };
  }

  /**
   * 推断买家类型
   */
  private inferBuyerType(orgType?: string): string {
    if (!orgType) return 'government';
    const type = orgType.toLowerCase();
    if (type.includes('defense') || type.includes('military')) return 'military';
    if (type.includes('state') || type.includes('local')) return 'local_government';
    return 'government';
  }

  normalize(raw: unknown): NormalizedCandidate {
    return this.normalizeOpportunity(raw as SAMOpportunity);
  }

  async getDetails(externalId: string): Promise<{
    externalId: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    description?: string;
    additionalInfo?: Record<string, unknown>;
  } | null> {
    if (!this.apiKey) return null;

    try {
      const oppId = externalId.replace('sam_', '');
      const response = await fetch(
        `https://api.sam.gov/opportunities/v2/${oppId}`,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const opp = data.opportunitiesData?.[0];

      if (!opp) return null;

      return {
        externalId,
        phone: opp.pointOfContact?.[0]?.phone,
        email: opp.pointOfContact?.[0]?.email,
        website: opp.link,
        description: opp.description,
        additionalInfo: {
          solicitationNumber: opp.solicitationNumber,
          naicsCode: opp.naicsCode,
          naicsDescription: opp.naicsDescription,
          awardAmount: opp.award?.awardAmount,
          awardee: opp.award?.awardee,
        },
      };
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        healthy: true, // 可以使用网页抓取
        latency: 0,
        error: undefined,
        message: 'Using web scrape fallback (no API key configured)',
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}?limit=1`,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
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