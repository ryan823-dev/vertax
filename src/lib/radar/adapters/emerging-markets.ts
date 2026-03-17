// ==================== Emerging Markets Procurement Adapter ====================
// 新兴市场采购平台适配器
// 覆盖：中东、非洲、拉美、东欧的本地采购平台
// 这些平台信息分散，但通过 AI+搜索可以高效获取

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

// ==================== 区域采购平台配置 ====================

interface RegionalPlatform {
  code: string;
  name: string;
  region: string;
  countries: string[];
  domain: string;
  language: string;
  keywords: string[]; // 本地语言关键词
}

const REGIONAL_PLATFORMS: RegionalPlatform[] = [
  // ========== 中东地区 ==========
  {
    code: 'etimad',
    name: 'Etimad (摩洛哥)',
    region: 'MENA',
    countries: ['MA'],
    domain: 'www.etimad.ma',
    language: 'fr',
    keywords: ['marché public', 'appel d\'offres', 'adjudication'],
  },
  {
    code: 'manafathat',
    name: 'Manafathat (沙特)',
    region: 'MENA',
    countries: ['SA'],
    domain: 'etender.gov.sa',
    language: 'ar',
    keywords: ['مناقصة', 'عطاء', 'مشتريات'],
  },
  {
    code: 'tenders',
    name: 'UAE Tenders',
    region: 'MENA',
    countries: ['AE'],
    domain: 'tenders.ae',
    language: 'en',
    keywords: ['tender', 'procurement', 'bid'],
  },
  {
    code: 'qatar_tenders',
    name: 'Qatar Tenders',
    region: 'MENA',
    countries: ['QA'],
    domain: 'qgtenders.com',
    language: 'en',
    keywords: ['tender', 'procurement', 'contract'],
  },

  // ========== 非洲地区 ==========
  {
    code: 'egpp',
    name: 'EGPP (埃及)',
    region: 'AFRICA',
    countries: ['EG'],
    domain: 'egpp.gov.eg',
    language: 'ar',
    keywords: ['مناقصة', 'عطاء'],
  },
  {
    code: 'tenders_ke',
    name: 'Tenders Kenya',
    region: 'AFRICA',
    countries: ['KE'],
    domain: 'tenders.go.ke',
    language: 'en',
    keywords: ['tender', 'bid', 'procurement'],
  },
  {
    code: 'tenders_ng',
    name: 'Tenders Nigeria',
    region: 'AFRICA',
    countries: ['NG'],
    domain: 'tenders.ng',
    language: 'en',
    keywords: ['tender', 'bid', 'contract'],
  },
  {
    code: 'tenders_za',
    name: 'Tenders South Africa',
    region: 'AFRICA',
    countries: ['ZA'],
    domain: 'tenders.gov.za',
    language: 'en',
    keywords: ['tender', 'bid', 'procurement'],
  },

  // ========== 拉美地区 ==========
  {
    code: 'comprasnet',
    name: 'ComprasNet (巴西)',
    region: 'LATAM',
    countries: ['BR'],
    domain: 'compras.gov.br',
    language: 'pt',
    keywords: ['licitação', 'concorrência', 'pregão'],
  },
  {
    code: 'mer',
    name: 'Mercado Público (墨西哥)',
    region: 'LATAM',
    countries: ['MX'],
    domain: 'compranet.gob.mx',
    language: 'es',
    keywords: ['licitación', 'concurso', 'adjudicación'],
  },
  {
    code: 'chilecompra',
    name: 'ChileCompra',
    region: 'LATAM',
    countries: ['CL'],
    domain: 'mercadopublico.cl',
    language: 'es',
    keywords: ['licitación', 'concurso', 'adjudicación'],
  },
  {
    code: 'colombia_compra',
    name: 'Colombia Compra Eficiente',
    region: 'LATAM',
    countries: ['CO'],
    domain: 'colombiacompra.gov.co',
    language: 'es',
    keywords: ['licitación', 'concurso', 'contratación'],
  },
  {
    code: 'argentina_compra',
    name: 'Argentina Compra',
    region: 'LATAM',
    countries: ['AR'],
    domain: 'argentinacompra.gov.ar',
    language: 'es',
    keywords: ['licitación', 'concurso', 'oferta'],
  },

  // ========== 东欧地区 ==========
  {
    code: 'uzlis',
    name: 'Uzlis (乌兹别克斯坦)',
    region: 'ECA',
    countries: ['UZ'],
    domain: 'uzlis.uz',
    language: 'ru',
    keywords: ['тендер', 'закупка', 'конкурс'],
  },
  {
    code: 'zakupki',
    name: 'Zakupki (俄罗斯/独联体)',
    region: 'ECA',
    countries: ['RU', 'KZ', 'BY'],
    domain: 'zakupki.gov.ru',
    language: 'ru',
    keywords: ['тендер', 'закупка', 'госзаказ'],
  },
  {
    code: 'vestnik',
    name: 'Vestnik (哈萨克斯坦)',
    region: 'ECA',
    countries: ['KZ'],
    domain: 'vestnik.adilet.gov.kz',
    language: 'ru',
    keywords: ['тендер', 'закупка', 'конкурс'],
  },
  {
    code: 'e_uzk',
    name: 'E-Uzk (乌克兰)',
    region: 'ECA',
    countries: ['UA'],
    domain: 'prozorro.gov.ua',
    language: 'uk',
    keywords: ['тендер', 'закупівля', 'конкурс'],
  },
];

// ==================== 新兴市场采购适配器 ====================

export class EmergingMarketsAdapter implements RadarAdapter {
  readonly sourceCode = 'emerging_markets';
  readonly channelType = 'TENDER' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 50,
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  private timeout: number;
  private targetRegions: string[];
  private targetCountries: string[];

  constructor(config: AdapterConfig) {
    this.timeout = config.timeout || 60000;
    this.targetRegions = (config.regions as string[]) || ['MENA', 'AFRICA', 'LATAM', 'ECA'];
    this.targetCountries = (config.countries as string[]) || [];
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    // 根据目标地区/国家选择平台
    const platforms = this.selectPlatforms(query);

    // 获取招标数据
    const tenders = await this.fetchTenders(platforms, query);

    // AI 分析招标相关性
    const relevantTenders = await this.analyzeTenders(tenders, query);

    // 转换为标准候选
    const items = relevantTenders.map(t => this.normalizeTender(t));

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
   * 根据目标地区选择平台
   */
  private selectPlatforms(query: RadarSearchQuery): RegionalPlatform[] {
    const regions = query.regions || [];
    const countries = query.countries || [];

    // 如果指定了国家，精确匹配
    if (countries.length > 0) {
      return REGIONAL_PLATFORMS.filter(p =>
        countries.some(c => p.countries.includes(c.toUpperCase()))
      );
    }

    // 否则按地区过滤
    if (regions.length > 0) {
      return REGIONAL_PLATFORMS.filter(p =>
        regions.some(r => p.region === r.toUpperCase())
      );
    }

    // 默认使用所有配置的平台
    return REGIONAL_PLATFORMS.filter(p =>
      this.targetRegions.includes(p.region) ||
      this.targetCountries.some(c => p.countries.includes(c))
    );
  }

  /**
   * 获取招标数据
   */
  private async fetchTenders(
    platforms: RegionalPlatform[],
    query: RadarSearchQuery
  ): Promise<Array<{
    title: string;
    description?: string;
    url: string;
    platform: string;
    country: string;
    language: string;
  }>> {
    const tenders: Array<{
      title: string;
      description?: string;
      url: string;
      platform: string;
      country: string;
      language: string;
    }> = [];

    const { BraveSearchAdapter } = await import('./brave-search');
    const braveAdapter = new BraveSearchAdapter({} as never);

    const keywords = query.keywords || [];
    const sectors = query.targetIndustries || [];

    // 每个平台搜索
    for (const platform of platforms.slice(0, 8)) {
      try {
        // 构建本地化搜索查询
        const searchQueries = this.buildLocalizedQueries(platform, keywords, sectors);

        for (const sq of searchQueries.slice(0, 2)) {
          const result = await braveAdapter.search({
            keywords: [sq],
            countries: platform.countries,
            cursor: query.cursor,
          });

          // 过滤平台相关结果
          for (const item of result.items) {
            if (this.isPlatformUrl(item.sourceUrl, platform)) {
              tenders.push({
                title: item.displayName,
                description: item.description,
                url: item.sourceUrl,
                platform: platform.code,
                country: platform.countries[0],
                language: platform.language,
              });
            }
          }

          await new Promise(r => setTimeout(r, 300));
        }
      } catch (error) {
        console.error(`[${platform.code}] Fetch error:`, error);
      }
    }

    return tenders;
  }

  /**
   * 构建本地化搜索查询
   */
  private buildLocalizedQueries(
    platform: RegionalPlatform,
    keywords: string[],
    sectors: string[]
  ): string[] {
    const queries: string[] = [];
    const keyword = keywords[0] || 'industrial';
    const sector = sectors[0] || 'manufacturing';

    // 使用本地语言关键词
    const localKeyword = this.translateKeyword(keyword, platform.language);
    const localSector = this.translateKeyword(sector, platform.language);

    // 站点限定搜索
    queries.push(`site:${platform.domain} ${localKeyword}`);
    queries.push(`site:${platform.domain} ${localSector}`);

    // 通用搜索
    const platformKeywords = platform.keywords.slice(0, 2);
    for (const pk of platformKeywords) {
      queries.push(`${pk} ${localKeyword} ${platform.countries[0]}`);
    }

    return queries;
  }

  /**
   * 简单关键词翻译（实际应该调用翻译 API）
   */
  private translateKeyword(keyword: string, language: string): string {
    const translations: Record<string, Record<string, string>> = {
      'coating': {
        'fr': 'revêtement',
        'es': 'recubrimiento',
        'pt': 'revestimento',
        'ru': 'покрытие',
        'ar': 'طلاء',
        'uk': 'покриття',
      },
      'painting': {
        'fr': 'peinture',
        'es': 'pintura',
        'pt': 'pintura',
        'ru': 'окраска',
        'ar': 'طلاء',
        'uk': 'фарбування',
      },
      'manufacturing': {
        'fr': 'fabrication',
        'es': 'fabricación',
        'pt': 'fabricação',
        'ru': 'производство',
        'ar': 'تصنيع',
        'uk': 'виробництво',
      },
      'industrial': {
        'fr': 'industriel',
        'es': 'industrial',
        'pt': 'industrial',
        'ru': 'промышленный',
        'ar': 'صناعي',
        'uk': 'промисловий',
      },
    };

    return translations[keyword.toLowerCase()]?.[language] || keyword;
  }

  /**
   * 判断是否是平台 URL
   */
  private isPlatformUrl(url: string, platform: RegionalPlatform): boolean {
    return url.includes(platform.domain);
  }

  /**
   * AI 分析招标相关性
   */
  private async analyzeTenders(
    tenders: Array<{
      title: string;
      description?: string;
      url: string;
      platform: string;
      country: string;
      language: string;
    }>,
    query: RadarSearchQuery
  ): Promise<Array<{
    projectName: string;
    country: string;
    region: string;
    sector: string;
    buyerName?: string;
    procurementType: string;
    relevantKeywords: string[];
    sourceUrl: string;
    platformName: string;
    confidence: number;
  }>> {
    if (tenders.length === 0) return [];

    const systemPrompt = `你是新兴市场采购分析专家。分析中东、非洲、拉美、东欧地区的招标公告，识别商业机会。

分析要点：
1. 项目涉及设备采购 = 销售机会
2. 采购机构 = 潜在客户
3. 地区和国家 = 市场定位
4. 行业匹配度 = 优先级判断

输出要求：
1. 提取项目名称、国家、行业
2. 识别采购类型（设备/服务/工程）
3. 提取相关关键词
4. 评估相关性 (0-1)

输出 JSON：
{
  "tenders": [
    {
      "projectName": "项目名",
      "country": "国家",
      "region": "地区",
      "sector": "行业",
      "buyerName": "采购机构",
      "procurementType": "设备采购",
      "relevantKeywords": ["涂装", "工业"],
      "sourceUrl": "链接",
      "platformName": "平台名",
      "confidence": 0.85
    }
  ]
}`;

    const userPrompt = `目标行业：${query.targetIndustries?.join(', ') || '制造业'}
目标关键词：${query.keywords?.join(', ') || '工业设备'}
目标地区：${query.regions?.join(', ') || '新兴市场'}

招标数据：
${JSON.stringify(tenders.slice(0, 20).map(t => ({
  title: t.title,
  description: t.description?.slice(0, 200),
  url: t.url,
  platform: t.platform,
  country: t.country,
  language: t.language,
})), null, 2)}

请识别相关的商业机会。`;

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
      return parsed.tenders || [];
    } catch (error) {
      console.error('[EmergingMarkets] AI parse error:', error);
      return [];
    }
  }

  /**
   * 标准化招标信息
   */
  normalizeTender(tender: {
    projectName: string;
    country: string;
    region: string;
    sector: string;
    buyerName?: string;
    procurementType: string;
    relevantKeywords: string[];
    sourceUrl: string;
    platformName: string;
    confidence: number;
  }): NormalizedCandidate {
    const externalId = `em_${Date.now()}_${this.hashString(tender.projectName)}`;

    return {
      externalId,
      sourceUrl: tender.sourceUrl,
      displayName: tender.projectName,
      description: `${tender.procurementType} - ${tender.sector}`,
      candidateType: 'OPPORTUNITY',

      country: tender.country,
      buyerName: tender.buyerName,
      buyerCountry: tender.country,
      buyerType: 'government',
      categoryName: tender.sector,

      matchExplain: {
        channel: 'tender',
        reasons: [
          `${tender.platformName}`,
          `国家: ${tender.country}`,
          `行业: ${tender.sector}`,
          `采购类型：${tender.procurementType}`,
        ].filter(Boolean) as string[],
        matchedKeywords: tender.relevantKeywords,
      },

      matchScore: tender.confidence,

      rawData: {
        source: 'emerging_markets',
        platformName: tender.platformName,
        sector: tender.sector,
        procurementType: tender.procurementType,
        region: tender.region,
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
      message: 'Emerging markets adapter ready',
    };
  }
}