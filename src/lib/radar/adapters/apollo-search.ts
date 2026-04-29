// ==================== Apollo Organization & People Search Adapter ====================
// Apollo.io 结构化 B2B 数据库搜索
// - Organization Search: 按行业/地区/规模等维度发现目标公司（阶段B）
// - People Search: 按职位/层级查找决策人联系人（阶段C）

import type {
  RadarAdapter,
  RadarSearchQuery,
  RadarSearchResult,
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';
import { normalizeCountryCode, getCountryDisplayName } from '../country-utils';

// ==================== Apollo API 类型 ====================

interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  primary_domain?: string;
  industry?: string;
  estimated_num_employees?: number;
  city?: string;
  state?: string;
  country?: string;
  linkedin_url?: string;
  short_description?: string;
  seo_description?: string;
  founded_year?: number;
  annual_revenue?: number;
  annual_revenue_printed?: string;
  technologies?: string[];
  keywords?: string[];
  logo_url?: string;
  primary_phone?: { number?: string };
}

interface ApolloOrgSearchResponse {
  organizations?: ApolloOrganization[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  seniority?: string;
  departments?: string[];
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
  };
  phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string }>;
  city?: string;
  state?: string;
  country?: string;
}

interface ApolloPeopleSearchResponse {
  people?: ApolloPerson[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

// ==================== 员工规模映射 ====================

function employeeCountToLabel(count?: number): string | undefined {
  if (!count) return undefined;
  if (count <= 10) return '1-10';
  if (count <= 50) return '11-50';
  if (count <= 200) return '51-200';
  if (count <= 1000) return '201-1000';
  if (count <= 10000) return '1001-10000';
  return '10000+';
}

// ==================== Apollo Organization Search 适配器 ====================

export class ApolloOrganizationSearchAdapter implements RadarAdapter {
  readonly sourceCode = 'apollo_org_search';
  readonly channelType = 'DIRECTORY' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,   // 行业过滤
    supportsDateFilter: false,
    supportsRegionFilter: true,     // 国家/地区过滤
    supportsPagination: true,       // 原生分页
    supportsDetails: false,
    maxResultsPerQuery: 100,
    rateLimit: { requests: 5, windowMs: 60000 },
  };

  private apiKey: string;
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || process.env.APOLLO_API_KEY || '';
    this.timeout = config.timeout || 30000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        items: [],
        total: 0,
        hasMore: false,
        metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration: 0 },
      };
    }

    const page = query.cursor?.nextPage || 1;
    const perPage = Math.min(query.pageSize || 25, 100);

    // 构建 Apollo 搜索请求
    const body = this.buildSearchBody(query, page, perPage);

    try {
      const response = await fetch('https://api.apollo.io/api/v1/mixed_companies/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[ApolloOrgSearch] API error ${response.status}: ${errText.slice(0, 300)}`);
        return {
          items: [],
          total: 0,
          hasMore: false,
          metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration: Date.now() - startTime },
        };
      }

      const data: ApolloOrgSearchResponse = await response.json();
      const orgs = data.organizations || [];

      const items = orgs.map(org => this.normalizeOrg(org));
      const totalPages = data.pagination?.total_pages || 1;
      const hasMore = page < totalPages && page < 500;

      const duration = Date.now() - startTime;
      console.log(`[ApolloOrgSearch] Found ${items.length} companies (page ${page}/${totalPages}) in ${duration}ms`);

      return {
        items,
        total: data.pagination?.total_entries || items.length,
        hasMore,
        metadata: {
          source: this.sourceCode,
          query,
          fetchedAt: new Date(),
          duration,
          apolloPagination: data.pagination,
        },
        nextCursor: hasMore ? { nextPage: page + 1 } : undefined,
        isExhausted: !hasMore,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ApolloOrgSearch] Search error:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration },
      };
    }
  }

  /**
   * 构建 Apollo Organization Search 请求体
   */
  private buildSearchBody(
    query: RadarSearchQuery,
    page: number,
    perPage: number,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      page,
      per_page: perPage,
    };

    // 关键词 → q_organization_keyword_tags（行业/产品标签搜索）
    const keywords = [
      ...(query.keywords || []),
      ...(query.targetIndustries || []),
    ].filter(Boolean);
    if (keywords.length > 0) {
      body.q_organization_keyword_tags = keywords;
    }

    // 国家 → organization_locations
    if (query.countries && query.countries.length > 0) {
      const locations = query.countries
        .map(c => {
          const name = getCountryDisplayName(normalizeCountryCode(c));
          return name || c;
        })
        .filter(Boolean);
      if (locations.length > 0) {
        body.organization_locations = locations;
      }
    }

    // 公司类型 → 追加关键词（Apollo 没有直接的 company_type 过滤）
    if (query.companyTypes && query.companyTypes.length > 0) {
      const typeKeywords = query.companyTypes.map(t => {
        switch (t) {
          case 'manufacturer': return 'manufacturing';
          case 'distributor': return 'distribution';
          case 'service_provider': return 'services';
          default: return t;
        }
      });
      const existing = (body.q_organization_keyword_tags as string[]) || [];
      body.q_organization_keyword_tags = [...existing, ...typeKeywords];
    }

    return body;
  }

  /**
   * 将 Apollo Organization 转换为标准候选
   */
  private normalizeOrg(org: ApolloOrganization): NormalizedCandidate {
    const website = org.website_url || (org.primary_domain ? `https://${org.primary_domain}` : undefined);

    return {
      externalId: `apollo_org_${org.id}`,
      sourceUrl: org.linkedin_url || website || `https://app.apollo.io/#/organizations/${org.id}`,
      displayName: org.name,
      candidateType: 'COMPANY',

      website,
      description: org.short_description || org.seo_description,
      country: org.country,
      city: org.city,
      industry: org.industry,
      companySize: employeeCountToLabel(org.estimated_num_employees),
      phone: org.primary_phone?.number,

      matchScore: 0.7, // Apollo 结构化数据基础分

      matchExplain: {
        channel: 'apollo_org_search',
        reasons: this.buildMatchReasons(org),
        matchedKeywords: org.keywords?.slice(0, 5),
      },

      rawData: {
        source: 'apollo_org_search',
        apolloId: org.id,
        linkedinUrl: org.linkedin_url,
        employeeCount: org.estimated_num_employees,
        annualRevenue: org.annual_revenue,
        annualRevenuePrinted: org.annual_revenue_printed,
        foundedYear: org.founded_year,
        technologies: org.technologies?.slice(0, 10),
        logoUrl: org.logo_url,
      },
    };
  }

  private buildMatchReasons(org: ApolloOrganization): string[] {
    const reasons: string[] = ['Apollo结构化数据'];
    if (org.website_url || org.primary_domain) reasons.push('有官网');
    if (org.linkedin_url) reasons.push('有LinkedIn');
    if (org.estimated_num_employees) reasons.push(`${org.estimated_num_employees}人`);
    if (org.industry) reasons.push(org.industry);
    if (org.annual_revenue_printed) reasons.push(`营收${org.annual_revenue_printed}`);
    return reasons;
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  async healthCheck(): Promise<HealthStatus> {
    if (!this.apiKey) {
      return { healthy: false, latency: 0, error: 'Apollo API key not configured (APOLLO_API_KEY)' };
    }

    const startTime = Date.now();

    try {
      const response = await fetch('https://api.apollo.io/api/v1/mixed_companies/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          q_organization_keyword_tags: ['technology'],
          per_page: 1,
          page: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;
      if (response.ok) {
        return { healthy: true, latency };
      }
      return { healthy: false, latency, error: `API error: ${response.status}` };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ==================== Apollo People Search 适配器 ====================
// 阶段C：根据公司域名查找决策人

const DEFAULT_SENIORITIES = ['c_suite', 'vp', 'director', 'manager', 'owner', 'founder', 'partner'];

export class ApolloPeopleSearchAdapter implements RadarAdapter {
  readonly sourceCode = 'apollo_people_search';
  readonly channelType = 'DIRECTORY' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: false,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: true,
    supportsDetails: false,
    maxResultsPerQuery: 50,
    rateLimit: { requests: 5, windowMs: 60000 },
  };

  private apiKey: string;
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || process.env.APOLLO_API_KEY || '';
    this.timeout = config.timeout || 30000;
  }

  /**
   * 搜索决策人
   * query.keywords 用于匹配公司域名/名称
   * 返回 candidateType: 'CONTACT' 类型候选
   */
  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        items: [],
        total: 0,
        hasMore: false,
        metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration: 0 },
      };
    }

    const page = query.cursor?.nextPage || 1;
    const perPage = Math.min(query.pageSize || 10, 100);

    const body: Record<string, unknown> = {
      page,
      per_page: perPage,
      person_seniorities: DEFAULT_SENIORITIES,
    };

    // 按公司关键词搜索
    if (query.keywords && query.keywords.length > 0) {
      body.q_organization_keyword_tags = query.keywords;
    }

    // 国家过滤
    if (query.countries && query.countries.length > 0) {
      const locations = query.countries
        .map(c => getCountryDisplayName(normalizeCountryCode(c)) || c)
        .filter(Boolean);
      if (locations.length > 0) {
        body.organization_locations = locations;
      }
    }

    try {
      const response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[ApolloPeopleSearch] API error ${response.status}: ${errText.slice(0, 300)}`);
        return {
          items: [],
          total: 0,
          hasMore: false,
          metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration: Date.now() - startTime },
        };
      }

      const data: ApolloPeopleSearchResponse = await response.json();
      const people = data.people || [];

      const items = people.map(p => this.normalizePerson(p));
      const totalPages = data.pagination?.total_pages || 1;
      const hasMore = page < totalPages;

      const duration = Date.now() - startTime;
      console.log(`[ApolloPeopleSearch] Found ${items.length} contacts (page ${page}/${totalPages}) in ${duration}ms`);

      return {
        items,
        total: data.pagination?.total_entries || items.length,
        hasMore,
        metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration },
        nextCursor: hasMore ? { nextPage: page + 1 } : undefined,
        isExhausted: !hasMore,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ApolloPeopleSearch] Search error:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        metadata: { source: this.sourceCode, query, fetchedAt: new Date(), duration },
      };
    }
  }

  private normalizePerson(person: ApolloPerson): NormalizedCandidate {
    const name = person.name || [person.first_name, person.last_name].filter(Boolean).join(' ');
    const phone = person.phone_numbers?.[0]?.sanitized_number || person.phone_numbers?.[0]?.raw_number;
    const orgDomain = person.organization?.primary_domain;
    const orgWebsite = person.organization?.website_url || (orgDomain ? `https://${orgDomain}` : undefined);

    return {
      externalId: `apollo_person_${person.id}`,
      sourceUrl: person.linkedin_url || orgWebsite || '',
      displayName: name,
      candidateType: 'CONTACT',

      email: person.email,
      phone,
      website: orgWebsite,
      country: person.country,
      city: person.city,
      contactRole: person.title,
      linkedCompanyExternalId: person.organization?.id ? `apollo_org_${person.organization.id}` : undefined,

      matchScore: 0.6,

      matchExplain: {
        channel: 'apollo_people_search',
        reasons: [
          person.title || 'Decision maker',
          person.seniority || '',
          person.organization?.name || '',
        ].filter(Boolean),
        jobTitles: person.title ? [person.title] : undefined,
      },

      rawData: {
        source: 'apollo_people_search',
        apolloPersonId: person.id,
        seniority: person.seniority,
        departments: person.departments,
        organizationId: person.organization?.id,
        organizationName: person.organization?.name,
        linkedinUrl: person.linkedin_url,
      },
    };
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  async healthCheck(): Promise<HealthStatus> {
    if (!this.apiKey) {
      return { healthy: false, latency: 0, error: 'Apollo API key not configured (APOLLO_API_KEY)' };
    }

    const startTime = Date.now();

    try {
      const response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          q_organization_keyword_tags: ['technology'],
          per_page: 1,
          page: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;
      if (response.ok) {
        return { healthy: true, latency };
      }
      return { healthy: false, latency, error: `API error: ${response.status}` };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
