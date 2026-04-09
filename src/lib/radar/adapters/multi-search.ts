// ==================== Multi-Source Search Aggregator ====================
// 多源聚合搜索：同时调用多个搜索引擎，最大化发现覆盖面

import type {
  RadarAdapter,
  RadarSearchQuery,
  RadarSearchResult,
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';
import { BraveSearchAdapter } from './brave-search';
import { ExaAdapter } from './exa';
import { TavilyAdapter } from './tavily';
import { GooglePlacesAdapter } from './google-places';

// ==================== 搜索引擎配置 ====================

interface SearchEngineConfig {
  name: string;
  adapter: new (config: AdapterConfig) => RadarAdapter;
  weight: number;           // 结果权重
  maxResults: number;       // 最大返回结果数
  enabled: boolean;
}

const SEARCH_ENGINES: SearchEngineConfig[] = [
  {
    name: 'Brave Search',
    adapter: BraveSearchAdapter,
    weight: 1.0,
    maxResults: 50,
    enabled: true,
  },
  {
    name: 'Exa AI Search',
    adapter: ExaAdapter,
    weight: 1.2,  // AI搜索结果质量更高
    maxResults: 30,
    enabled: true,
  },
  {
    name: 'Tavily AI',
    adapter: TavilyAdapter,
    weight: 1.1,
    maxResults: 20,
    enabled: true,
  },
  {
    name: 'Google Places',
    adapter: GooglePlacesAdapter,
    weight: 0.8,  // 企业信息为主
    maxResults: 50,
    enabled: true,
  },
];

// ==================== 搜索结果去重 ====================

interface DedupeKey {
  domain: string;
  companyName: string;
}

function generateDedupeKey(candidate: NormalizedCandidate): DedupeKey {
  const url = candidate.sourceUrl || '';
  const domain = url ? new URL(url).hostname.replace('www.', '') : '';
  const name = candidate.displayName.toLowerCase().trim();
  return { domain, companyName: name };
}

function isDuplicate(existing: Set<string>, candidate: NormalizedCandidate): boolean {
  const key = generateDedupeKey(candidate);
  const keyStr = `${key.domain}|${key.companyName}`;
  return existing.has(keyStr);
}

function addToSet(set: Set<string>, candidate: NormalizedCandidate): void {
  const key = generateDedupeKey(candidate);
  set.add(`${key.domain}|${key.companyName}`);
}

// ==================== 多源聚合搜索适配器 ====================

export class MultiSourceSearchAdapter implements RadarAdapter {
  readonly sourceCode = 'multi_search';
  readonly channelType = 'DIRECTORY';
  readonly name = 'Multi-Source Aggregated Search';
  readonly version = '1.0.0';

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: true,
    supportsDetails: false,
    maxResultsPerQuery: 200,  // 聚合后最大结果
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  private engines: Map<string, {
    adapter: RadarAdapter;
    config: SearchEngineConfig;
  }> = new Map();

  constructor(config: AdapterConfig & { engines?: string[] } = {}) {
    // 根据配置启用/禁用引擎
    const enabledEngines = config.engines || SEARCH_ENGINES.filter(e => e.enabled).map(e => e.name);

    for (const engineConfig of SEARCH_ENGINES) {
      if (enabledEngines.includes(engineConfig.name)) {
        try {
          const adapter = new engineConfig.adapter(config);
          this.engines.set(engineConfig.name, {
            adapter,
            config: engineConfig,
          });
        } catch (error) {
          console.warn(`[MultiSearch] Failed to initialize ${engineConfig.name}:`, error);
        }
      }
    }
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    const allCandidates: NormalizedCandidate[] = [];
    const dedupeSet = new Set<string>();
    const errors: string[] = [];
    const sourceCounts: Record<string, number> = {};

    // 并行执行所有启用的搜索引擎
    const searchPromises = Array.from(this.engines.entries()).map(
      async ([engineName, { adapter, config }]) => {
        try {
          const result = await adapter.search({
            ...query,
            maxResults: config.maxResults,
          });

          // 去重并加权评分
          const weightedCandidates = result.items
            .filter(candidate => !isDuplicate(dedupeSet, candidate))
            .map(candidate => {
              addToSet(dedupeSet, candidate);
              // 根据来源引擎加权
              return {
                ...candidate,
                matchScore: (candidate.matchScore || 0) * config.weight,
              };
            });

          sourceCounts[engineName] = weightedCandidates.length;
          return weightedCandidates;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${engineName}: ${message}`);
          console.warn(`[MultiSearch] ${engineName} failed:`, error);
          return [];
        }
      }
    );

    // 等待所有搜索完成
    const results = await Promise.allSettled(searchPromises);

    // 收集结果
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allCandidates.push(...result.value);
      }
    }

    // 按分数排序
    allCandidates.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    // 限制总结果数
    const maxTotal = query.maxResults || this.supportedFeatures.maxResultsPerQuery!;
    const finalCandidates = allCandidates.slice(0, maxTotal);

    const duration = Date.now() - startTime;

    return {
      items: finalCandidates,
      total: finalCandidates.length,
      hasMore: allCandidates.length > maxTotal,
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration,
        engineCounts: sourceCounts,
        enginesUsed: Object.keys(sourceCounts),
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  async batchSearch(queries: RadarSearchQuery[]): Promise<RadarSearchResult[]> {
    const results: RadarSearchResult[] = [];

    for (const query of queries) {
      const result = await this.search(query);
      results.push(result);
    }

    return results;
  }

  async realTimeSearch(keyword: string): Promise<RadarSearchResult> {
    return this.search({
      keywords: [keyword],
      countries: [],
      categories: [],
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    const healthyEngines: string[] = [];
    const unhealthyEngines: string[] = [];

    for (const [name, { adapter }] of this.engines) {
      try {
        const status = await adapter.healthCheck();
        if (status.healthy) {
          healthyEngines.push(name);
        } else {
          unhealthyEngines.push(name);
        }
      } catch (error) {
        console.debug('[MultiSourceSearchAdapter.healthCheck] Engine check failed:', name, String(error));
        unhealthyEngines.push(name);
      }
    }

    return {
      healthy: healthyEngines.length > 0,
      latency: 0,
      message: `Multi-Search: ${healthyEngines.length}/${this.engines.size} engines healthy (${healthyEngines.join(', ')}${unhealthyEngines.length > 0 ? `, failed: ${unhealthyEngines.join(', ')}` : ''})`,
    };
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  // 获取可用的搜索引擎列表
  getAvailableEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  // 获取引擎健康状态
  async getEngineStatuses(): Promise<Record<string, HealthStatus>> {
    const statuses: Record<string, HealthStatus> = {};

    for (const [name, { adapter }] of this.engines) {
      try {
        statuses[name] = await adapter.healthCheck();
      } catch (error) {
        console.debug('[MultiSourceSearchAdapter.getEngineStatuses] Status check failed:', name, String(error));
        statuses[name] = { healthy: false, latency: 0, message: 'Unknown error' };
      }
    }

    return statuses;
  }
}

// ==================== 扩展搜索查询 ====================

// 基于HS Code生成更多搜索关键词
export function expandHSCodeKeywords(hsCode: string, productName?: string): string[] {
  const keywords: string[] = [];

  // 基础HS Code搜索
  keywords.push(`HS ${hsCode}`);
  keywords.push(`HS${hsCode}`);

  // 移除前导零的变体
  const cleanedHs = hsCode.replace(/^0+/, '');
  if (cleanedHs !== hsCode) {
    keywords.push(`HS ${cleanedHs}`);
  }

  // 产品名称组合
  if (productName) {
    keywords.push(`${productName} manufacturer`);
    keywords.push(`${productName} supplier`);
    keywords.push(`${productName} exporter`);
    keywords.push(`${productName} factory`);
  }

  return keywords;
}

// 基于行业生成多语言关键词
export function expandMultiLanguageKeywords(baseKeyword: string): Record<string, string[]> {
  const translations: Record<string, string[]> = {
    // 中文
    zh: [
      `${baseKeyword} 制造商`,
      `${baseKeyword} 供应商`,
      `${baseKeyword} 生产厂家`,
      `${baseKeyword} 工厂`,
    ],
    // 英文
    en: [
      `${baseKeyword} manufacturer`,
      `${baseKeyword} supplier`,
      `${baseKeyword} factory`,
      `${baseKeyword} exporter`,
    ],
    // 西班牙语
    es: [
      `fabricante de ${baseKeyword}`,
      `proveedor de ${baseKeyword}`,
      `exportador de ${baseKeyword}`,
    ],
    // 阿拉伯语
    ar: [
      `مصنع ${baseKeyword}`,
      `مورد ${baseKeyword}`,
    ],
    // 德语
    de: [
      `${baseKeyword} Hersteller`,
      `${baseKeyword} Lieferant`,
    ],
    // 法语
    fr: [
      `fabricant ${baseKeyword}`,
      `fournisseur ${baseKeyword}`,
    ],
  };

  return translations;
}

// 基于公司类型生成搜索模式
export function expandCompanyTypePatterns(keyword: string): string[] {
  const patterns = [
    // 制造商模式
    `${keyword} manufacturer`,
    `${keyword} manufacturing company`,
    `${keyword} factory`,
    `${keyword} mills`,
    // 供应商模式
    `${keyword} supplier`,
    `${keyword} vendor`,
    `${keyword} distributor`,
    // 出口商模式
    `${keyword} exporter`,
    `${keyword} export company`,
    `${keyword} trading company`,
    // 采购商模式
    `${keyword} importer`,
    `${keyword} buyer`,
    `${keyword} procurement`,
  ];

  return patterns;
}

// 生成完整搜索查询组合
export function generateSearchQueries(params: {
  keywords: string[];
  countries?: string[];
  regions?: string[];
  languages?: string[];
  companyTypes?: string[];
}): RadarSearchQuery[] {
  const queries: RadarSearchQuery[] = [];

  // 基础查询：关键词 + 国家
  if (params.countries && params.countries.length > 0) {
    for (const keyword of params.keywords.slice(0, 5)) {
      for (const country of params.countries.slice(0, 10)) {
        queries.push({
          keywords: [keyword],
          countries: [country],
        });
      }
    }
  }

  // 多语言查询
  if (params.languages && params.languages.length > 0) {
    for (const _lang of params.languages) {
      for (const keyword of params.keywords.slice(0, 3)) {
        queries.push({
          keywords: [keyword],
          // 不限制国家，使用语言作为过滤
        });
      }
    }
  }

  // 区域查询
  if (params.regions && params.regions.length > 0) {
    for (const region of params.regions) {
      for (const keyword of params.keywords.slice(0, 5)) {
        queries.push({
          keywords: [keyword],
          regions: [region],
        });
      }
    }
  }

  // 去重
  const uniqueQueries = queries.filter((q, i) =>
    queries.findIndex(x =>
      JSON.stringify(x.keywords) === JSON.stringify(q.keywords) &&
      JSON.stringify(x.countries) === JSON.stringify(q.countries) &&
      JSON.stringify(x.regions) === JSON.stringify(q.regions)
    ) === i
  );

  return uniqueQueries.slice(0, 50); // 最多50个查询
}
