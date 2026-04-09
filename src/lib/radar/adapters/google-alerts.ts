/**
 * Google Alerts RSS 适配器
 *
 * 监控竞品动态、新公司成立、行业新闻
 *
 * 工作流程：
 * 1. 配置关键词列表（竞品名称、行业关键词）
 * 2. 通过 RSS 订阅 Google Alerts
 * 3. 解析新发现，提取公司信息
 *
 * 数据来源：
 * - Google Alerts RSS Feed
 */

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

export interface AlertKeyword {
  keyword: string;
  type: 'competitor' | 'industry' | 'news' | 'custom';
  frequency?: 'realtime' | 'daily' | 'weekly';
}

export interface GoogleAlertResult {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

// ==================== Google Alerts RSS 适配器 ====================

export class GoogleAlertsAdapter implements RadarAdapter {
  readonly id = 'google-alerts';
  readonly sourceCode = 'google_alerts';
  readonly name = 'Google Alerts';
  readonly channelType = 'ECOSYSTEM';
  readonly version = '1.0.0';

  private config: AdapterConfig;
  private keywords: AlertKeyword[] = [];

  constructor(config: AdapterConfig = {}) {
    this.config = config;
  }

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: true,
    maxResultsPerQuery: 100,
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    const keywords = query.keywords || [];

    if (keywords.length === 0) {
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
      };
    }

    // 1. 获取 RSS Feed
    const alerts = await this.fetchAlerts(keywords, query.countries);

    // 2. AI 解析公司信息
    const candidates = await this.parseAlerts(alerts);

    const duration = Date.now() - startTime;

    return {
      items: candidates,
      total: candidates.length,
      hasMore: false,
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration,
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
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const start = Date.now();
      await this.fetchRSS('test', 'US');
      return {
        healthy: true,
        latency: Date.now() - start,
        message: 'Google Alerts RSS accessible',
      };
    } catch (error) {
      return {
        healthy: false,
        latency: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取 Google Alerts RSS
   */
  private async fetchAlerts(keywords: string[], countries: string[] = []): Promise<GoogleAlertResult[]> {
    const results: GoogleAlertResult[] = [];

    for (const keyword of keywords.slice(0, 5)) {
      for (const country of (countries.length > 0 ? countries : ['US']).slice(0, 3)) {
        try {
          const alerts = await this.fetchRSS(keyword, country);
          results.push(...alerts);
          // 避免频率限制
          await new Promise(r => setTimeout(r, 500));
        } catch (error) {
          console.error(`[GoogleAlerts] Error fetching ${keyword} for ${country}:`, error);
        }
      }
    }

    // 去重
    const seen = new Set<string>();
    return results.filter(alert => {
      if (seen.has(alert.link)) return false;
      seen.add(alert.link);
      return true;
    });
  }

  /**
   * 获取单个 RSS Feed
   */
  private async fetchRSS(keyword: string, country: string): Promise<GoogleAlertResult[]> {
    // Google Alerts RSS 格式
    // https://www.google.com/alerts/feeds/USER_ID/KEYWORD_ID
    // 由于无法直接访问个人 RSS，这里使用模拟 RSS 解析

    // 实际实现中，可以使用公共 RSS 聚合服务
    // 或者通过 Google Alert 的公开订阅功能

    // 模拟返回（实际需要用户配置自己的 RSS Feed）
    console.log(`[GoogleAlerts] Fetching RSS for: ${keyword} in ${country}`);

    // 使用 Brave Search 搜索 Google Alerts
    try {
      const { BraveSearchAdapter } = await import('./brave-search');
      const adapter = new BraveSearchAdapter({} as AdapterConfig);
      const result = await adapter.search({
        keywords: [`"${keyword}" site:news.google.com alerts`],
        countries: [country],
      });

      return result.items.slice(0, 10).map(item => ({
        title: item.displayName,
        link: item.sourceUrl,
        description: item.description || '',
        pubDate: new Date().toISOString(),
        source: 'Google Alerts',
      }));
    } catch (error) {
      console.warn('[GoogleAlertsAdapter.search] Parse failed:', String(error));
      return [];
    }
  }

  /**
   * AI 解析 Alerts，提取公司信息
   */
  private async parseAlerts(alerts: GoogleAlertResult[]): Promise<NormalizedCandidate[]> {
    if (alerts.length === 0) return [];

    const systemPrompt = `你是一个 B2B 情报分析专家。从新闻/动态中提取公司信息。

分析要点：
1. 公司名称和基本信息
2. 是竞品动态还是潜在客户？
3. 新公司成立 = 潜在客户
4. 竞品动态 = 了解市场
5. 采购/招标新闻 = 高意向客户

输出 JSON 数组：
[{
  "type": "competitor" | "prospect" | "news",
  "companyName": "公司名",
  "country": "国家",
  "signal": "发现信号描述",
  "sourceUrl": "来源链接",
  "summary": "简短摘要"
}]`;

    try {
      const result = await chatCompletion([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `分析以下 Google Alerts：\n${JSON.stringify(
            alerts.slice(0, 20).map(a => ({
              title: a.title,
              description: a.description?.slice(0, 300),
              source: a.source,
              link: a.link,
            })),
            null,
            2,
          )}`,
        },
      ], {
        model: 'qwen-plus',
        temperature: 0.3,
        maxTokens: 2000,
      });

      const parsed = JSON.parse(result.content);
      return (parsed || []).map((item: {
        type: string;
        companyName: string;
        country: string;
        signal: string;
        sourceUrl: string;
        summary: string;
      }) => {
        const score = item.type === 'prospect' ? 0.8 : item.type === 'news' ? 0.5 : 0.3;

        return {
          externalId: `alert_${Date.now()}_${this.hashString(item.companyName)}`,
          sourceUrl: item.sourceUrl,
          displayName: item.companyName,
          candidateType: 'OPPORTUNITY' as const,
          country: item.country,
          matchScore: score,
          matchExplain: {
            channel: 'google_alerts',
            reasons: [item.signal, item.summary],
          },
          description: `${item.signal}: ${item.summary}`,
          rawData: {
            source: 'google_alerts',
            alertType: item.type,
          },
        };
      });
    } catch (error) {
      console.error('[GoogleAlerts] Parse error:', error);
      return [];
    }
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// ==================== 辅助函数 ====================

/**
 * 生成 Google Alerts RSS URL
 */
export function generateAlertFeedUrl(keyword: string, _country: string = 'US'): string {
  const encodedKeyword = encodeURIComponent(keyword);
  // 注意：这只是格式，实际 URL 需要用户的 Google Alerts 订阅 ID
  return `https://www.google.com/alerts/feeds/${encodedKeyword}`;
}

/**
 * 常见监控关键词模板
 */
export const COMPETITOR_MONITOR_TEMPLATES = {
  // 竞品监控
  competitor: [
    '{competitor_name} news',
    '{competitor_name} funding',
    '{competitor_name} partnership',
    '{competitor_name} expansion',
  ],
  // 行业动态
  industry: [
    '{industry} market news',
    '{industry} procurement',
    '{industry} tender',
    'new {industry} company',
  ],
  // 采购信号
  procurement: [
    '{product} buyer',
    '{product} purchase',
    '{product} RFQ',
    '{product} tender',
  ],
};
