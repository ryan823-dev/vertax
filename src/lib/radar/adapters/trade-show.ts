// ==================== Trade Show Adapter ====================
// 展会参展商适配器：获取高质量潜在客户
// 展会参展商 = 主动拓展市场 = 高意向客户

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

// ==================== 展会数据类型 ====================

interface Exhibitor {
  name: string;
  booth?: string;
  country?: string;
  description?: string;
  products?: string[];
  website?: string;
  email?: string;
  phone?: string;
}

interface _TradeShow {
  name: string;
  venue?: string;
  dates?: string;
  url: string;
  exhibitors: Exhibitor[];
}

interface ParsedExhibitor {
  companyName: string;
  website?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  industry?: string;
  products: string[];
  showName: string;
  signals: string[];
  sourceUrl: string;
}

// ==================== 展会适配器 ====================

export class TradeShowAdapter implements RadarAdapter {
  readonly sourceCode = 'trade_show';
  readonly channelType = 'TRADESHOW' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true, // 展会类型
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 50,
    rateLimit: { requests: 5, windowMs: 60000 },
  };

  private timeout: number;

  // 重点展会列表（涂装/制造业相关）
  private knownShows = [
    // 涂装/表面处理
    { name: 'PaintExpo', url: 'paintexpo.de', industry: 'coating' },
    { name: 'Surfin', url: 'surfin.net', industry: 'surface_treatment' },
    { name: 'Powder Coating Summit', url: 'powdercoating.org', industry: 'coating' },
    { name: 'Surface Technology', url: 'surface-technology.de', industry: 'surface' },
    // 制造业
    { name: 'IMTS', url: 'imts.com', industry: 'manufacturing' },
    { name: 'Hannover Messe', url: 'hannovermesse.de', industry: 'manufacturing' },
    { name: 'Fabtech', url: 'fabtechexpo.com', industry: 'metal_fabrication' },
    { name: 'AMT', url: 'amtshow.com', industry: 'manufacturing' },
    // 汽车
    { name: 'Automotive Engineering Show', url: 'automotiveengineeringshow.com', industry: 'automotive' },
    { name: 'NACE', url: 'nace.org', industry: 'coating' },
    // 工业
    { name: 'Industrial Automation', url: 'industrial-automation.com', industry: 'automation' },
    { name: 'Metaltech', url: 'metaltech.com.my', industry: 'metal' },
  ];

  constructor(config: AdapterConfig) {
    this.timeout = config.timeout || 60000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    // 搜索展会参展商
    const searchQueries = this.buildShowSearchQueries(query);
    const rawExhibitors = await this.fetchExhibitorData(searchQueries, query);

    // AI 分析参展商
    const exhibitors = await this.analyzeExhibitors(rawExhibitors, query);

    // 转换为标准候选
    const items = exhibitors.map(e => this.normalizeExhibitor(e));

    const duration = Date.now() - startTime;

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
  }

  /**
   * 构建展会搜索查询
   */
  private buildShowSearchQueries(query: RadarSearchQuery): string[] {
    const queries: string[] = [];
    const keywords = query.keywords || [];
    const industries = query.targetIndustries || [];

    // 已知展会
    for (const show of this.knownShows.slice(0, 3)) {
      queries.push(`site:${show.url} exhibitor list`);
      queries.push(`site:${show.url} exhibitors`);
    }

    // 行业展会搜索
    const industryKeywords: Record<string, string[]> = {
      'coating': ['painting', 'coating', 'surface treatment'],
      'manufacturing': ['manufacturing', 'industrial', 'production'],
      'automotive': ['automotive', 'car', 'vehicle'],
      'metal': ['metal', 'steel', 'fabrication'],
    };

    for (const industry of industries.slice(0, 2)) {
      const terms = industryKeywords[industry.toLowerCase()] || [industry];
      for (const term of terms.slice(0, 2)) {
        queries.push(`"${term}" trade show exhibitors`);
        queries.push(`"${term}" exhibition exhibitor list`);
      }
    }

    // 产品 + 展会
    for (const keyword of keywords.slice(0, 2)) {
      queries.push(`"${keyword}" trade show exhibitor directory`);
    }

    // 展会目录网站
    queries.push('site:10times.com exhibitors');
    queries.push('site:exhibitor.com directory');

    return queries.length > 0 ? queries : ['industrial trade show exhibitors'];
  }

  /**
   * 获取参展商数据
   */
  private async fetchExhibitorData(
    searchQueries: string[],
    query: RadarSearchQuery
  ): Promise<Array<{ name: string; description?: string; url: string; show?: string }>> {
    const exhibitors: Array<{ name: string; description?: string; url: string; show?: string }> = [];

    const { BraveSearchAdapter } = await import('./brave-search');
    const braveAdapter = new BraveSearchAdapter({} as never);

    for (const sq of searchQueries.slice(0, 5)) {
      try {
        const result = await braveAdapter.search({
          keywords: [sq],
          countries: query.countries,
          cursor: query.cursor,
        });

        for (const item of result.items) {
          // 过滤展会相关页面
          if (this.isExhibitorPage(item.sourceUrl) || this.isShowPage(item.sourceUrl)) {
            exhibitors.push({
              name: item.displayName,
              description: item.description,
              url: item.sourceUrl,
              show: this.extractShowName(item.sourceUrl),
            });
          }
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error('[TradeShow] Search error:', error);
      }
    }

    return exhibitors;
  }

  /**
   * 判断是否是参展商页面
   */
  private isExhibitorPage(url: string): boolean {
    const patterns = [
      '/exhibitor', '/exhibitors', '/exhibitor-list',
      '/participants', '/companies', '/vendors',
      'exhibitor-list', 'exhibitor-directory',
    ];
    return patterns.some(p => url.toLowerCase().includes(p));
  }

  /**
   * 判断是否是展会页面
   */
  private isShowPage(url: string): boolean {
    const patterns = [
      '10times.com', 'exhibitor.com', 'eventbrite.com',
      'tradeshow', 'exhibition', 'expo', 'convention',
    ];
    return patterns.some(p => url.toLowerCase().includes(p));
  }

  /**
   * 提取展会名称
   */
  private extractShowName(url: string): string {
    // 从已知展会匹配
    for (const show of this.knownShows) {
      if (url.includes(show.url)) {
        return show.name;
      }
    }
    return 'Industry Trade Show';
  }

  /**
   * AI 分析参展商
   */
  private async analyzeExhibitors(
    rawExhibitors: Array<{ name: string; description?: string; url: string; show?: string }>,
    query: RadarSearchQuery
  ): Promise<ParsedExhibitor[]> {
    if (rawExhibitors.length === 0) return [];

    const systemPrompt = `你是B2B商业分析专家。分析展会参展商信息，提取公司详情。

分析要点：
1. 展会参展商 = 主动拓展市场 = 潜在客户
2. 关注参展商的产品/服务是否匹配目标
3. 有官网的公司质量更高
4. 本地参展商可能是分销商/代理商

输出要求：
1. 提取公司名称、网站、联系方式
2. 识别公司产品和行业
3. 标记商业信号（如：参展=有市场预算、新品发布=有创新需求）
4. 过滤非目标公司（如：竞品、服务提供商）

输出JSON：
{
  "exhibitors": [
    {
      "companyName": "公司名",
      "website": "网站",
      "email": "邮箱（如有）",
      "phone": "电话（如有）",
      "country": "国家",
      "city": "城市",
      "industry": "行业",
      "products": ["产品1", "产品2"],
      "showName": "展会名",
      "signals": ["展会参展-有市场预算", "产品匹配-直接相关"],
      "sourceUrl": "来源URL"
    }
  ]
}`;

    const userPrompt = `目标行业：${query.targetIndustries?.join(', ') || '制造业'}
目标产品：${query.keywords?.join(', ') || '工业设备'}
目标地区：${query.countries?.join(', ') || '全球'}

展会参展商数据：
${JSON.stringify(rawExhibitors.slice(0, 25).map(e => ({
  name: e.name,
  description: e.description?.slice(0, 200),
  url: e.url,
  show: e.show,
})), null, 2)}

请提取参展商公司信息并识别商业信号。`;

    try {
      const result = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: 'qwen-plus',
          temperature: 0.2,
        }
      );

      const parsed = JSON.parse(result.content);
      return parsed.exhibitors || [];
    } catch (error) {
      console.error('[TradeShow] AI parse error:', error);
      return [];
    }
  }

  /**
   * 标准化参展商信息
   */
  normalizeExhibitor(exhibitor: ParsedExhibitor): NormalizedCandidate {
    const externalId = `show_${Date.now()}_${this.hashString(exhibitor.companyName)}`;

    // 展会参展商 = 高意向（有市场预算）
    const matchScore = 0.85;

    return {
      externalId,
      sourceUrl: exhibitor.sourceUrl,
      displayName: exhibitor.companyName,
      candidateType: 'COMPANY',

      website: exhibitor.website,
      phone: exhibitor.phone,
      email: exhibitor.email,
      country: exhibitor.country,
      city: exhibitor.city,
      industry: exhibitor.industry,

      matchScore,
      matchExplain: {
        channel: 'trade_show',
        reasons: [
          `展会参展商 - 有市场预算`,
          `展会: ${exhibitor.showName}`,
          `产品: ${exhibitor.products.slice(0, 3).join(', ')}`,
          ...exhibitor.signals.slice(0, 3),
        ].filter(Boolean) as string[],
        showName: exhibitor.showName,
        products: exhibitor.products,
      },

      description: `${exhibitor.companyName} 是 ${exhibitor.showName} 的参展商。产品：${exhibitor.products.join(', ')}`,

      rawData: {
        source: 'trade_show',
        showName: exhibitor.showName,
        products: exhibitor.products,
        signals: exhibitor.signals,
      },
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  normalize(raw: unknown): NormalizedCandidate {
    return raw as NormalizedCandidate;
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      healthy: true,
      latency: 0,
      message: 'Trade show adapter ready',
    };
  }
}
