// ==================== Trade Data Adapter ====================
// 海关贸易数据适配器：发现实际买家
// 进口商 = 已经在购买相关产品 = 高意向客户

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

// ==================== 贸易数据类型 ====================

interface TradeRecord {
  id: string;
  importerName: string;
  exporterName?: string;
  productDescription: string;
  hsCode?: string;
  quantity?: number;
  value?: number;
  shipmentDate?: string;
  portOfEntry?: string;
  countryOfOrigin?: string;
  destinationCountry?: string;
  source: string;
}

interface ParsedImporter {
  companyName: string;
  country: string;
  importProducts: string[];
  importFrequency: 'high' | 'medium' | 'low';
  estimatedVolume: string;
  suppliers: string[];
  hsCodes: string[];
  signals: string[];
  sourceUrl: string;
}

// ==================== 贸易数据适配器 ====================

export class TradeDataAdapter implements RadarAdapter {
  readonly sourceCode = 'trade_data';
  readonly channelType = 'ECOSYSTEM' as const; // 生态系统/供应链

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true, // HS codes
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 30,
    rateLimit: { requests: 5, windowMs: 60000 },
  };

  private timeout: number;

  // 免费贸易数据源（网页抓取）
  private freeDataSources = [
    'panjiva.com',
    'importgenius.com',
    'searates.com',
    'portexaminer.com',
    'bills-of-lading.com',
  ];

  constructor(config: AdapterConfig) {
    this.timeout = config.timeout || 60000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    // 构建贸易数据搜索查询
    const searchQueries = this.buildTradeSearchQueries(query);

    // 搜索贸易数据
    const tradeRecords = await this.fetchTradeData(searchQueries, query);

    // AI 分析进口商
    const importers = await this.analyzeImporters(tradeRecords, query);

    // 转换为标准候选
    const items = importers.map(i => this.normalizeImporter(i));

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
   * 构建贸易数据搜索查询
   */
  private buildTradeSearchQueries(query: RadarSearchQuery): string[] {
    const queries: string[] = [];
    const keywords = query.keywords || [];
    const countries = query.countries || [];

    // 产品 + 进口商
    for (const keyword of keywords.slice(0, 3)) {
      queries.push(`"${keyword}" importer`);
      queries.push(`"${keyword}" import data`);
      queries.push(`"${keyword}" bills of lading`);
    }

    // HS Code 搜索
    const hsCodes = query.categories || [];
    for (const code of hsCodes.slice(0, 2)) {
      queries.push(`HS code ${code} importer`);
    }

    // 地区进口商
    if (countries.length > 0) {
      const product = keywords[0] || 'industrial equipment';
      queries.push(`${product} importers in ${countries[0]}`);
    }

    // 数据源特定查询
    for (const source of this.freeDataSources.slice(0, 2)) {
      if (keywords.length > 0) {
        queries.push(`site:${source} "${keywords[0]}" importer`);
      }
    }

    return queries.length > 0 ? queries : ['industrial equipment importers'];
  }

  /**
   * 获取贸易数据
   */
  private async fetchTradeData(
    searchQueries: string[],
    query: RadarSearchQuery
  ): Promise<TradeRecord[]> {
    const records: TradeRecord[] = [];

    const { BraveSearchAdapter } = await import('./brave-search');
    const braveAdapter = new BraveSearchAdapter({} as never);

    for (const sq of searchQueries.slice(0, 5)) {
      try {
        const result = await braveAdapter.search({
          keywords: [sq],
          countries: query.countries,
          cursor: query.cursor,
        });

        // 过滤贸易数据相关结果
        for (const item of result.items) {
          if (this.isTradeDataSource(item.sourceUrl)) {
            records.push({
              id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              importerName: item.displayName, // 需要AI解析
              productDescription: item.description || '',
              source: item.sourceUrl,
            });
          }
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error('[TradeData] Search error:', error);
      }
    }

    return records;
  }

  /**
   * 判断是否是贸易数据源
   */
  private isTradeDataSource(url: string): boolean {
    const tradePatterns = [
      'panjiva.com', 'importgenius.com', 'searates.com',
      'portexaminer.com', 'bills-of-lading.com',
      'trademo.com', 'volza.com', 'exim.seair.co.in',
      'import/', 'export/', 'trade-data', 'shipment',
      'customs', 'bills-of-lading',
    ];
    return tradePatterns.some(p => url.toLowerCase().includes(p));
  }

  /**
   * AI 分析进口商
   */
  private async analyzeImporters(
    records: TradeRecord[],
    query: RadarSearchQuery
  ): Promise<ParsedImporter[]> {
    if (records.length === 0) return [];

    const systemPrompt = `你是B2B贸易分析专家。分析海关/贸易数据，识别进口商公司。

分析要点：
1. 进口商 = 已经在购买相关产品 = 高意向潜在客户
2. 进口频率高 = 需求稳定 = 值得跟进
3. 进口产品匹配 = 直接相关
4. 供应商信息 = 可了解竞争格局

输出要求：
1. 提取进口商公司名称、国家
2. 分析进口产品类型和频率
3. 识别商业信号（如：持续进口涂装设备 = 可能有扩产计划）
4. 按进口频率评估优先级

输出JSON：
{
  "importers": [
    {
      "companyName": "公司名",
      "country": "国家",
      "importProducts": ["产品1", "产品2"],
      "importFrequency": "high",
      "estimatedVolume": "估计进口量描述",
      "suppliers": ["供应商1"],
      "hsCodes": ["HS code"],
      "signals": ["持续进口-需求稳定", "进口相关产品-直接匹配"],
      "sourceUrl": "数据来源"
    }
  ]
}`;

    const userPrompt = `目标产品：${query.keywords?.join(', ') || '工业设备'}
目标地区：${query.countries?.join(', ') || '全球'}

贸易数据：
${JSON.stringify(records.slice(0, 20).map(r => ({
  importer: r.importerName,
  product: r.productDescription?.slice(0, 150),
  hsCode: r.hsCode,
  origin: r.countryOfOrigin,
  source: r.source,
})), null, 2)}

请识别进口商公司及其商业信号。`;

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
      return parsed.importers || [];
    } catch (error) {
      console.error('[TradeData] AI parse error:', error);
      return [];
    }
  }

  /**
   * 标准化进口商信息
   */
  normalizeImporter(importer: ParsedImporter): NormalizedCandidate {
    const externalId = `trade_${Date.now()}_${this.hashString(importer.companyName)}`;

    // 进口商 = 高意向客户
    const matchScore = importer.importFrequency === 'high' ? 0.95 :
                       importer.importFrequency === 'medium' ? 0.8 : 0.6;

    return {
      externalId,
      sourceUrl: importer.sourceUrl,
      displayName: importer.companyName,
      candidateType: 'COMPANY',

      country: importer.country,

      matchScore,
      matchExplain: {
        channel: 'trade_data',
        reasons: [
          `进口商 - 已购买相关产品`,
          `进口频率: ${importer.importFrequency}`,
          `进口产品: ${importer.importProducts.slice(0, 3).join(', ')}`,
          ...importer.signals.slice(0, 3),
        ].filter(Boolean) as string[],
        importProducts: importer.importProducts,
        suppliers: importer.suppliers,
      },

      description: `${importer.companyName} 是 ${importer.importProducts.join(', ')} 的进口商。进口频率：${importer.importFrequency}。供应商：${importer.suppliers.slice(0, 3).join(', ')}`,

      rawData: {
        source: 'trade_data',
        importProducts: importer.importProducts,
        importFrequency: importer.importFrequency,
        estimatedVolume: importer.estimatedVolume,
        hsCodes: importer.hsCodes,
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
      message: 'Trade data adapter ready',
    };
  }
}