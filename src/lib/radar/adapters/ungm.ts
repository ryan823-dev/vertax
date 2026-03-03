// ==================== UNGM Adapter ====================
// 联合国全球市场平台适配器

import type { 
  RadarAdapter, 
  RadarSearchQuery, 
  RadarSearchResult, 
  NormalizedCandidate,
  CandidateDetails,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';

export class UNGMAdapter implements RadarAdapter {
  readonly sourceCode = 'ungm';
  readonly channelType = 'TENDER' as const;
  
  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: true,
    supportsRegionFilter: false,
    supportsPagination: true,
    supportsDetails: true,
    maxResultsPerQuery: 100,
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  private apiEndpoint: string;
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiEndpoint = config.apiEndpoint || 'https://www.ungm.org/api';
    this.timeout = config.timeout || 30000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    
    // 构建请求参数
    const params = new URLSearchParams();
    params.set('PageIndex', String(query.page || 0));
    params.set('PageSize', String(Math.min(query.pageSize || 20, 100)));
    
    if (query.keywords?.length) {
      params.set('Title', query.keywords.join(' '));
    }
    if (query.deadlineAfter) {
      params.set('DeadlineFrom', query.deadlineAfter.toISOString().split('T')[0]);
    }
    if (query.deadlineBefore) {
      params.set('DeadlineTo', query.deadlineBefore.toISOString().split('T')[0]);
    }
    if (query.categories?.length) {
      // UNGM 使用 UNSPSC 分类
      params.set('UNSPSCCode', query.categories[0]);
    }

    const url = `${this.apiEndpoint}/Public/Notice?${params}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'VertaX-Radar/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`UNGM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // UNGM API 返回格式：{ Results: [], Total: number, HasMore: boolean }
      const results = data.Results || data.results || [];
      const total = data.Total || data.total || results.length;
      const hasMore = data.HasMore || data.hasMore || false;

      return {
        items: results.map((item: unknown) => this.normalize(item)),
        total,
        hasMore,
        nextPage: hasMore ? (query.page || 0) + 1 : undefined,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('UNGM API request timeout');
      }
      throw error;
    }
  }

  async getDetails(externalId: string): Promise<CandidateDetails | null> {
    const url = `${this.apiEndpoint}/Public/Notice/${externalId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'VertaX-Radar/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`UNGM API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        externalId,
        email: data.ContactEmail || data.contactEmail,
        phone: data.ContactPhone || data.contactPhone,
        description: data.Description || data.description,
        additionalInfo: {
          documents: data.Documents || data.documents,
          amendments: data.Amendments || data.amendments,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('UNGM API request timeout');
      }
      throw error;
    }
  }

  normalize(raw: unknown): NormalizedCandidate {
    const data = raw as Record<string, unknown>;
    
    const id = String(data.Id || data.id || data.Reference || data.reference || '');
    const title = String(data.Title || data.title || '');
    
    return {
      externalId: id,
      sourceUrl: `https://www.ungm.org/Public/Notice/${id}`,
      displayName: title,
      candidateType: 'OPPORTUNITY',
      
      description: data.Description as string | undefined || data.description as string | undefined,
      
      // 招标字段
      deadline: data.Deadline || data.deadline 
        ? new Date(String(data.Deadline || data.deadline)) 
        : undefined,
      publishedAt: data.PublishedDate || data.publishedDate
        ? new Date(String(data.PublishedDate || data.publishedDate))
        : undefined,
      
      buyerName: String(data.AgencyName || data.agencyName || data.Organization || data.organization || ''),
      buyerCountry: String(data.Country || data.country || ''),
      buyerType: 'international_org',
      
      categoryCode: String(data.UNSPSCCode || data.unspscCode || ''),
      categoryName: String(data.UNSPSCName || data.unspscName || ''),
      
      contactEmail: data.ContactEmail as string | undefined || data.contactEmail as string | undefined,
      
      // 匹配信息
      matchExplain: {
        channel: 'ungm',
        reasons: ['联合国采购公告'],
      },
      
      rawData: data,
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.apiEndpoint}/Public/Notice?PageSize=1`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: response.ok,
        latency,
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
