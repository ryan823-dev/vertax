// ==================== Batch Discovery Adapter ====================
// 批量发现适配器：跨所有适配器的大规模并行发现

import type {
  RadarAdapter,
  RadarSearchQuery,
  RadarSearchResult,
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';
import {
  getAdapter,
  ensureAdaptersInitialized,
  listAdapterRegistrations,
} from './registry';
import { expandMultiLanguageKeywords, expandCompanyTypePatterns } from './multi-search';

// ==================== 批量发现结果 ====================

export interface BatchDiscoveryResult {
  totalFound: number;
  uniqueCandidates: NormalizedCandidate[];
  sourceBreakdown: Record<string, number>;
  errors: Record<string, string>;
  duration: number;
  queriesExecuted: number;
}

const EXCLUDED_SOURCE_CODES = new Set(['batch_discovery', 'hunter', 'pdl']);

// ==================== 批量发现适配器 ====================

export class BatchDiscoveryAdapter implements RadarAdapter {
  readonly sourceCode = 'batch_discovery';
  readonly channelType = 'DIRECTORY';
  readonly name = 'Batch Discovery Engine';
  readonly version = '1.0.0';

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: true,
    supportsDetails: false,
    maxResultsPerQuery: 500,  // 大批量结果
    rateLimit: { requests: 5, windowMs: 60000 },
  };

  private config: AdapterConfig;
  private sourceAdapters: Map<string, RadarAdapter> = new Map();

  constructor(config: AdapterConfig & {
    sources?: string[];           // 指定使用的适配器
    maxParallel?: number;         // 最大并行数
    maxQueriesPerSource?: number; // 每个源最大查询数
  } = {}) {
    this.config = config;
    ensureAdaptersInitialized();

    // 获取要使用的适配器列表
    const registrations = listAdapterRegistrations();
    const targetSources = config.sources || registrations
      .filter(
        (r) =>
          !EXCLUDED_SOURCE_CODES.has(r.code) &&
          [
            'DIRECTORY',
            'TENDER',
            'MAPS',
            'TRADESHOW',
            'HIRING',
            'ECOSYSTEM',
          ].includes(r.channelType)
      )
      .map(r => r.code);

    // 初始化适配器
    for (const code of targetSources) {
      try {
        const adapter = getAdapter(code, config);
        this.sourceAdapters.set(code, adapter);
      } catch (error) {
        console.warn(`[BatchDiscovery] Failed to initialize ${code}:`, error);
      }
    }
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    // 生成扩展查询
    const expandedQueries = this.generateExpandedQueries(query);

    const allCandidates: NormalizedCandidate[] = [];
    const dedupeSet = new Set<string>();
    const sourceBreakdown: Record<string, number> = {};
    const errors: Record<string, string> = {};

    // 并行执行所有源适配器
    const searchPromises = Array.from(this.sourceAdapters.entries()).map(
      async ([sourceCode, adapter]) => {
        try {
          const result = await adapter.search({
            ...query,
            maxResults: (this.config as Record<string, unknown>).maxQueriesPerSource as number || 50,
          });

          // 去重
          const uniqueResults = result.items.filter(c => {
            const key = `${c.displayName}|${c.sourceUrl}`;
            if (dedupeSet.has(key)) return false;
            dedupeSet.add(key);
            return true;
          });

          sourceBreakdown[sourceCode] = uniqueResults.length;

          return uniqueResults;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors[sourceCode] = message;
          console.warn(`[BatchDiscovery] ${sourceCode} failed:`, error);
          return [];
        }
      }
    );

    // 等待所有搜索完成（设置超时）
    const results = await Promise.race([
      Promise.all(searchPromises),
      new Promise<NormalizedCandidate[][]>(resolve =>
        setTimeout(() => resolve([[]]), 30000) // 30秒超时
      ),
    ]);

    // 收集结果
    for (const result of results) {
      allCandidates.push(...result);
    }

    // 按分数排序并限制
    allCandidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    const maxResults = query.maxResults || this.supportedFeatures.maxResultsPerQuery!;
    const finalCandidates = allCandidates.slice(0, maxResults);

    const duration = Date.now() - startTime;

    return {
      items: finalCandidates,
      total: finalCandidates.length,
      hasMore: allCandidates.length > maxResults,
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration,
        sourceBreakdown,
        queriesExecuted: expandedQueries.length,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      },
    };
  }

  // 生成扩展查询以增加覆盖面
  private generateExpandedQueries(baseQuery: RadarSearchQuery): RadarSearchQuery[] {
    const queries: RadarSearchQuery[] = [baseQuery];

    if (baseQuery.keywords && baseQuery.keywords.length > 0) {
      const baseKeyword = baseQuery.keywords[0];

      // 1. 多语言扩展
      const multiLang = expandMultiLanguageKeywords(baseKeyword);
      for (const [_lang, translated] of Object.entries(multiLang)) {
        for (const keyword of translated.slice(0, 2)) {
          queries.push({
            ...baseQuery,
            keywords: [keyword],
          });
        }
      }

      // 2. 公司类型扩展
      const companyPatterns = expandCompanyTypePatterns(baseKeyword);
      for (const pattern of companyPatterns.slice(0, 5)) {
        queries.push({
          ...baseQuery,
          keywords: [pattern],
        });
      }
    }

    // 3. 区域扩展
    if (baseQuery.countries && baseQuery.countries.length > 0) {
      const regionGroups = this.getRegionExpansion();
      for (const group of regionGroups) {
        queries.push({
          ...baseQuery,
          countries: group,
        });
      }
    }

    // 去重并限制
    return queries.slice(0, 50);
  }

  // 获取区域扩展组合
  private getRegionExpansion(): string[][] {
    return [
      // 北美
      ['US', 'CA', 'MX'],
      // 西欧
      ['DE', 'FR', 'GB', 'NL', 'IT', 'ES'],
      // 北欧
      ['SE', 'NO', 'DK', 'FI'],
      // 中东
      ['AE', 'SA', 'QA', 'KW'],
      // 东南亚
      ['TH', 'VN', 'ID', 'MY', 'SG'],
      // 南亚
      ['IN', 'PK', 'BD'],
      // 东亚
      ['CN', 'JP', 'KR', 'TW'],
      // 拉丁美洲
      ['BR', 'AR', 'CL', 'CO'],
      // 非洲
      ['ZA', 'NG', 'EG', 'KE'],
      // 大洋洲
      ['AU', 'NZ'],
    ];
  }

  async batchSearch(queries: RadarSearchQuery[]): Promise<RadarSearchResult[]> {
    const results: RadarSearchResult[] = [];

    // 限制并发
    const batchSize = 3;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(q => this.search(q))
      );
      results.push(...batchResults);

      // 批次间延迟
      if (i + batchSize < queries.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
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
    const healthySources: string[] = [];
    const unhealthySources: string[] = [];

    for (const [code, adapter] of this.sourceAdapters) {
      try {
        const status = await adapter.healthCheck();
        if (status.healthy) {
          healthySources.push(code);
        } else {
          unhealthySources.push(code);
        }
      } catch (error) {
        console.debug('[batchDiscoveryHealthCheck] Source check failed:', code, String(error));
        unhealthySources.push(code);
      }
    }

    return {
      healthy: healthySources.length > 0,
      latency: 0,
      message: `Batch Discovery: ${healthySources.length}/${this.sourceAdapters.size} sources available`,
    };
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  // 获取所有可用的发现源
  getAvailableSources(): string[] {
    return Array.from(this.sourceAdapters.keys());
  }
}

// ==================== 无限滚动发现模式 ====================

export interface ContinuousDiscoveryOptions {
  keywords: string[];
  countries: string[];
  regions: string[];
  maxIterations?: number;
  maxResultsPerIteration?: number;
  deduplicationWindow?: number; // 毫秒
}

export async function* continuousDiscovery(
  adapter: BatchDiscoveryAdapter,
  options: ContinuousDiscoveryOptions
): AsyncGenerator<NormalizedCandidate[], void, unknown> {
  const seen = new Set<string>();
  let iterations = 0;
  const maxIterations = options.maxIterations || 100;

  while (iterations < maxIterations) {
    // 生成查询
    const query: RadarSearchQuery = {
      keywords: options.keywords.slice(0, 3),
      countries: options.countries.slice(0, 5),
      regions: options.regions.slice(0, 3),
      maxResults: options.maxResultsPerIteration || 100,
      cursor: {
        queryIndex: iterations,
      },
    };

    // 执行搜索
    const result = await adapter.search(query);

    // 去重新结果
    const newCandidates = result.items.filter(c => {
      const key = `${c.displayName}|${c.country}|${c.sourceUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (newCandidates.length > 0) {
      yield newCandidates;
    }

    // 如果没有更多结果，退出
    if (!result.hasMore) {
      break;
    }

    iterations++;

    // 避免过快
    await new Promise(r => setTimeout(r, 500));
  }
}
