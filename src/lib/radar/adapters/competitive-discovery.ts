/**
 * 竞品发现 Adapter
 *
 * Phase 3: 集成 competitive-analysis skill
 * 通过输入竞品名称，发现使用该竞品的客户公司
 */

import { RadarAdapter, RadarSearchResult, RadarSearchQuery, NormalizedCandidate, AdapterConfig, HealthStatus } from './types';
import { chatCompletion } from '@/lib/ai-client';

// ==================== Adapter 实现 ====================

export class CompetitiveDiscoveryAdapter implements RadarAdapter {
  readonly sourceCode = 'competitive_discovery';
  readonly channelType: 'ECOSYSTEM' = 'ECOSYSTEM';
  readonly supportedFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: false,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: true,
    maxResultsPerQuery: 20,
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  private config: AdapterConfig;
  private competitors: string[] = [];

  constructor(config: AdapterConfig = {}) {
    this.config = config;
    // 从配置中获取竞品列表
    if (config.fieldMapping?.competitors) {
      this.competitors = Array.isArray(config.fieldMapping.competitors)
        ? config.fieldMapping.competitors
        : [config.fieldMapping.competitors];
    }
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    const keywords = query.keywords || [];

    // 如果有关键词，将其作为竞品处理
    const targetCompetitors = keywords.length > 0 ? keywords : this.competitors;

    if (targetCompetitors.length === 0) {
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
      };
    }

    // 使用 Exa 搜索竞品客户
    const items: NormalizedCandidate[] = [];

    for (const competitor of targetCompetitors.slice(0, 5)) {
      try {
        const companies = await this.findCompetitorCustomers(competitor, query.countries);
        items.push(...companies);
      } catch (error) {
        console.error(`[CompetitiveDiscovery] Failed to search ${competitor}:`, error);
      }
    }

    // 去重
    const uniqueItems = this.deduplicate(items);

    return {
      items: uniqueItems.slice(0, query.maxResults || 20),
      total: uniqueItems.length,
      hasMore: uniqueItems.length > (query.maxResults || 20),
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration: Date.now() - startTime,
        competitorsSearched: targetCompetitors.slice(0, 5),
      },
    };
  }

  async getDetails(externalId: string): Promise<{ externalId: string; description?: string; website?: string; industry?: string } | null> {
    // 解析 externalId 获取公司信息
    const parts = externalId.split('::');
    if (parts.length < 2) return null;

    const companyName = parts[0];
    const competitorName = parts[1];

    // 补充搜索公司详情
    const details = await this.enrichCompanyDetails(companyName, competitorName);
    return details;
  }

  normalize(raw: unknown): NormalizedCandidate {
    const data = raw as Record<string, unknown>;
    return {
      externalId: String(data.externalId || data.companyName || ''),
      sourceUrl: String(data.sourceUrl || ''),
      displayName: String(data.companyName || ''),
      candidateType: 'COMPANY',
      description: data.description as string | undefined,
      website: data.website as string | undefined,
      industry: data.industry as string | undefined,
      country: data.country as string | undefined,
      matchScore: data.matchScore as number | undefined,
      matchExplain: {
        reasons: [`使用竞品 ${data.competitorName}`],
        query: 'competitive_discovery',
      },
      rawData: data as Record<string, unknown>,
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // 检查 Exa API
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: 'EXA_API_KEY not configured',
        };
      }

      // 简单的测试搜索
      await this.search({ keywords: ['test'], maxResults: 1 });

      return {
        healthy: true,
        latency: Date.now() - startTime,
        message: '竞品发现适配器正常',
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 查找竞品的客户公司
   */
  private async findCompetitorCustomers(competitor: string, countries?: string[]): Promise<NormalizedCandidate[]> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      console.log('[CompetitiveDiscovery] No EXA_API_KEY');
      return [];
    }

    // 构建搜索查询
    const countryFilter = countries && countries.length > 0
      ? `from ${countries.join(' OR ')}`
      : '';

    const queries = [
      `${competitor} customer case study`,
      `${competitor} implementation partner`,
      `${competitor} client testimonial`,
      `company using ${competitor}`,
    ];

    const allCompanies: NormalizedCandidate[] = [];

    for (const q of queries.slice(0, 2)) {
      try {
        const results = await this.exaSearch(q, 10);
        const companies = await this.parseSearchResults(results, competitor);
        allCompanies.push(...companies);
      } catch (error) {
        console.error(`[CompetitiveDiscovery] Search failed for query "${q}":`, error);
      }
    }

    return allCompanies;
  }

  /**
   * 解析 Exa 搜索结果
   */
  private async parseSearchResults(results: Array<{ title?: string; text?: string; url?: string }>, competitor: string): Promise<NormalizedCandidate[]> {
    const companies: NormalizedCandidate[] = [];

    for (const result of results) {
      const title = result.title || '';
      const text = result.text || '';

      // 尝试从标题和内容中提取公司名称
      const companyCandidates = await this.extractCompanyNames(title, text);

      for (const companyName of companyCandidates.slice(0, 2)) {
        // 排除竞品本身
        if (companyName.toLowerCase().includes(competitor.toLowerCase())) {
          continue;
        }

        // 排除明显不是公司名称的模式
        if (this.isExcludedPattern(companyName)) {
          continue;
        }

        companies.push({
          externalId: `${companyName}::${competitor}`,
          sourceUrl: result.url || '',
          displayName: companyName,
          candidateType: 'COMPANY',
          description: text.slice(0, 500),
          matchScore: 0.7, // 竞品客户默认中高质量
          matchExplain: {
            reasons: [`使用竞品 ${competitor} 的客户`],
            query: 'competitive_discovery',
          },
          rawData: {
            competitorName: competitor,
            originalTitle: title,
          },
        });
      }
    }

    return companies;
  }

  /**
   * 从文本中提取可能的的公司名称
   */
  private async extractCompanyNames(title: string, text: string): Promise<string[]> {
    const results: string[] = [];

    // 使用 AI 提取公司名称
    const combinedText = `${title}\n\n${text.slice(0, 1000)}`;

    try {
      const aiResponse = await chatCompletion(
        [
          {
            role: 'system',
            content: `从以下文本中提取公司名称。
返回 JSON 数组格式：["公司名称1", "公司名称2"]
只返回明确的公司名称，排除：
- 人名
- 产品名称
- "案例研究"等通用词
最多返回5个。`
          },
          {
            role: 'user',
            content: combinedText
          }
        ],
        {
          model: 'qwen-plus',
          temperature: 0.1,
          maxTokens: 300,
        }
      );
        const parsed = JSON.parse(aiResponse.content.trim());
        if (Array.isArray(parsed)) {
          results.push(...parsed.slice(0, 5));
        }
    } catch {
      // 静默失败
    }

    // 备用：简单正则匹配
    // 匹配 "XXX公司" 或 "XXX Inc" 等模式
    const patterns = [
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Inc|LLC|Corp|Ltd|Company|Co)\.?)/g,
      /([A-Z][a-zA-Z]+(?:[A-Z][a-zA-Z]+\s*)+)/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 3)) {
          const trimmed = match.trim();
          if (trimmed.length > 3 && !this.isExcludedPattern(trimmed)) {
            results.push(trimmed);
          }
        }
      }
    }

    // 去重
    return [...new Set(results)];
  }

  /**
   * 检查是否应该排除的模式
   */
  private isExcludedPattern(text: string): boolean {
    const excludePatterns = [
      /^案例$/i, /^案例研究$/i, /^客户$/i, /^成功$/i,
      /test/i, /^demo/i, /example/i,
      /\d+/, // 纯数字
    ];

    return excludePatterns.some(p => p.test(text.trim()));
  }

  /**
   * 补充公司详细信息
   */
  private async enrichCompanyDetails(companyName: string, competitorName: string) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return null;

    try {
      const results = await this.exaSearch(`${companyName} official website`, 5);

      if (results.length > 0) {
        const result = results[0];
        return {
          externalId: `${companyName}::${competitorName}`,
          website: result.url,
          description: result.text?.slice(0, 500),
        };
      }
    } catch {
      // 静默失败
    }

    return null;
  }

  /**
   * Exa 搜索
   */
  private async exaSearch(query: string, numResults: number): Promise<Array<{ title?: string; text?: string; url?: string }>> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return [];

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        numResults,
        category: 'company',
        contents: {
          text: true,
          summary: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Exa API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: {
      title?: string;
      text?: string;
      url?: string;
    }) => ({
      title: r.title,
      text: r.text,
      url: r.url,
    }));
  }

  /**
   * 去重
   */
  private deduplicate(items: NormalizedCandidate[]): NormalizedCandidate[] {
    const seen = new Set<string>();
    const result: NormalizedCandidate[] = [];

    for (const item of items) {
      const key = `${item.displayName.toLowerCase()}::${item.sourceUrl}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }
}

// ==================== 适配器注册 ====================

import type { AdapterRegistration } from './types';

export const CompetitiveDiscoveryRegistration: AdapterRegistration = {
  code: 'competitive_discovery',
  name: '竞品发现',
  channelType: 'ECOSYSTEM',
  adapterType: 'AI_SEARCH',
  description: '通过输入竞品名称，发现使用该竞品的客户公司。用于竞品切入策略。',
  features: {
    supportsKeywordSearch: true,
    supportsCategoryFilter: false,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: true,
    maxResultsPerQuery: 20,
    rateLimit: { requests: 10, windowMs: 60000 },
  },
  defaultConfig: {
    fieldMapping: {
      competitors: '', // 配置竞品列表
    },
  },
  storagePolicy: 'TTL_CACHE',
  ttlDays: 7,
  attributionRequired: false,
  isOfficial: true,
  websiteUrl: 'https://exa.ai',
  termsUrl: 'https://exa.ai/terms',
  reliability: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'MEDIUM',
    requiresAuth: true,
    authMethod: 'EXA_API_KEY',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球范围，结果需要人工验证',
    limitations: [
      'AI 可能产生幻觉',
      '搜索结果可能不相关',
      '需要人工验证公司信息',
    ],
    docUrl: 'https://exa.ai/docs',
  },
};
