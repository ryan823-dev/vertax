// ==================== TED Adapter ====================
// 欧盟招标电子日报适配器

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

export class TEDAdapter implements RadarAdapter {
  readonly sourceCode = 'ted';
  readonly channelType = 'TENDER' as const;
  
  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: true,
    supportsDetails: true,
    maxResultsPerQuery: 100,
    rateLimit: { requests: 30, windowMs: 60000 },
  };

  private apiEndpoint: string;
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiEndpoint = config.apiEndpoint || 'https://ted.europa.eu/api/v3.0';
    this.timeout = config.timeout || 30000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    
    // TED 使用 Expert Search Query Language
    const queryParts: string[] = [];
    
    // 关键词搜索
    if (query.keywords?.length) {
      const keywordQuery = query.keywords.map(k => `"${k}"`).join(' OR ');
      queryParts.push(`(${keywordQuery})`);
    }
    
    // CPV 分类码
    if (query.categories?.length) {
      queryParts.push(`CPV:(${query.categories.join(' OR ')})`);
    }
    
    // 国家过滤
    if (query.countries?.length) {
      queryParts.push(`ISO_COUNTRY_CODE:(${query.countries.join(' OR ')})`);
    }
    
    // 日期过滤
    if (query.publishedAfter) {
      const dateStr = query.publishedAfter.toISOString().split('T')[0].replace(/-/g, '');
      queryParts.push(`PD>=${dateStr}`);
    }
    if (query.deadlineAfter) {
      const dateStr = query.deadlineAfter.toISOString().split('T')[0].replace(/-/g, '');
      queryParts.push(`DL>=${dateStr}`);
    }

    const searchQuery = queryParts.length > 0 ? queryParts.join(' AND ') : '*';
    
    const requestBody = {
      q: searchQuery,
      page: (query.page || 0) + 1,  // TED 页码从 1 开始
      limit: Math.min(query.pageSize || 20, 100),
      scope: 'ALL',
      sortField: 'PD',
      sortOrder: 'DESC',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiEndpoint}/notices/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'VertaX-Radar/1.0',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`TED API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // TED API 返回格式
      const results = data.notices || data.results || [];
      const total = data.total || results.length;
      const currentPage = data.page || 1;
      const totalPages = data.totalPages || Math.ceil(total / (query.pageSize || 20));
      const hasMore = currentPage < totalPages;

      return {
        items: results.map((item: unknown) => this.normalize(item)),
        total,
        hasMore,
        nextPage: hasMore ? currentPage + 1 : undefined,
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
        throw new Error('TED API request timeout');
      }
      throw error;
    }
  }

  async getDetails(externalId: string): Promise<CandidateDetails | null> {
    const url = `${this.apiEndpoint}/notices/${externalId}`;
    
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
        throw new Error(`TED API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        externalId,
        email: data.contactEmail,
        description: data.description || data.shortDescription,
        additionalInfo: {
          fullDocument: data.fullDocument,
          lots: data.lots,
          procedureType: data.procedureType,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('TED API request timeout');
      }
      throw error;
    }
  }

  normalize(raw: unknown): NormalizedCandidate {
    const data = raw as Record<string, unknown>;
    
    // TED 使用 ND (Notice Document) 作为唯一标识
    const noticeId = String(data.ND || data.noticeId || data.id || '');
    const title = String(data.TI || data.title || '');
    
    // 解析日期
    const parseDate = (dateStr: unknown): Date | undefined => {
      if (!dateStr) return undefined;
      const str = String(dateStr);
      // TED 日期格式可能是 YYYYMMDD 或 ISO 格式
      if (/^\d{8}$/.test(str)) {
        return new Date(`${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`);
      }
      return new Date(str);
    };
    
    // 解析金额
    const parseValue = (value: unknown): { amount?: number; currency?: string } => {
      if (!value) return {};
      if (typeof value === 'object' && value !== null) {
        const v = value as Record<string, unknown>;
        return {
          amount: v.VALUE ? Number(v.VALUE) : undefined,
          currency: v.CURRENCY ? String(v.CURRENCY) : 'EUR',
        };
      }
      return {};
    };
    
    const valueInfo = parseValue(data.MA || data.estimatedValue);
    
    // CPV 分类
    const cpvCodes = data.CPV || data.cpvCodes;
    const cpvCode = Array.isArray(cpvCodes) ? cpvCodes[0] : cpvCodes;
    const cpvNames = data.CPV_NAME || data.cpvNames;
    const cpvName = Array.isArray(cpvNames) ? cpvNames[0] : cpvNames;
    
    return {
      externalId: noticeId,
      sourceUrl: `https://ted.europa.eu/udl?uri=TED:NOTICE:${noticeId}:TEXT:EN:HTML`,
      displayName: title,
      candidateType: 'OPPORTUNITY',
      
      description: String(data.shortDescription || data.description || ''),
      
      // 招标字段
      deadline: parseDate(data.DL || data.deadline),
      publishedAt: parseDate(data.PD || data.publicationDate),
      
      estimatedValue: valueInfo.amount,
      currency: valueInfo.currency,
      
      buyerName: String(data.AA || data.awardingAuthority || data.buyerName || ''),
      buyerCountry: String(data.CY || data.country || ''),
      buyerType: 'government',
      
      categoryCode: cpvCode ? String(cpvCode) : undefined,
      categoryName: cpvName ? String(cpvName) : undefined,
      
      // 匹配信息
      matchExplain: {
        channel: 'ted',
        reasons: ['欧盟官方招标'],
      },
      
      rawData: data,
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.apiEndpoint}/notices/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ q: '*', limit: 1 }),
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
