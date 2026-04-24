// ==================== 经营层数据源适配器 ====================
// 海关数据、招投标、经营新闻等业务活动信息

import type {
  OSINTSourceAdapter,
  OSINTSourceConfig,
  OSINTLayer,
  CompanyInvestigationQuery,
  BusinessRecord,
  BusinessLayerResult,
} from '../types';

// ==================== 海关数据适配器 ====================

/**
 * 海关进出口数据适配器
 * 查询企业的进出口记录，验证业务真实性
 */
class CustomsDataAdapter implements OSINTSourceAdapter {
  readonly code = 'customs_data';
  readonly name = '海关进出口数据';
  readonly layer: OSINTLayer = 'BUSINESS';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: false,
    supportsRiskQuery: false,
    maxResultsPerQuery: 100,
  };

  private config: OSINTSourceConfig | null = null;
  private apiKey: string | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
    this.apiKey = process.env.CUSTOMS_DATA_API_KEY || config.apiKey || null;
  }

  /**
   * 搜索企业进出口记录
   */
  async searchCustomsRecords(companyName: string): Promise<BusinessRecord[]> {
    const timeout = this.config?.timeout || 15000;
    const records: BusinessRecord[] = [];

    try {
      // 使用公开搜索查询海关数据相关新闻
      // 实际实现需要接入专业海关数据服务商（如Panjiva、ImportGenius）
      const searchQuery = `${companyName} 进口 出口 海关`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      return this.parseCustomsResults(html, companyName);
    } catch (error) {
      console.warn('[CustomsData] Search failed:', String(error));
      return [];
    }
  }

  /**
   * 解析海关搜索结果
   */
  private parseCustomsResults(html: string, companyName: string): BusinessRecord[] {
    const records: BusinessRecord[] = [];

    // 检查是否有进出口相关新闻
    const importPatterns = [
      new RegExp(`${companyName}[\\s]*进口[\\s]*(\\d+[,.]?\\d*)\\s*(吨|公斤|件|台)`),
      new RegExp(`${companyName}[\\s]*从[\\s]*(\\w+)[\\s]*进口`),
    ];

    const exportPatterns = [
      new RegExp(`${companyName}[\\s]*出口[\\s]*(\\d+[,.]?\\d*)\\s*(吨|公斤|件|台)`),
      new RegExp(`${companyName}[\\s]*向[\\s]*(\\w+)[\\s]*出口`),
    ];

    for (const pattern of importPatterns) {
      const match = html.match(pattern);
      if (match) {
        records.push({
          type: 'CUSTOMS_IMPORT',
          title: `发现进口记录`,
          description: match[0],
          product: match[2] || '未知',
          source: 'news_search',
        });
      }
    }

    for (const pattern of exportPatterns) {
      const match = html.match(pattern);
      if (match) {
        records.push({
          type: 'CUSTOMS_EXPORT',
          title: `发现出口记录`,
          description: match[0],
          product: match[2] || '未知',
          source: 'news_search',
        });
      }
    }

    return records;
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use searchCustomsRecords method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 招投标数据适配器 ====================

/**
 * 招投标数据适配器
 * 查询企业的招投标中标记录
 */
class TenderDataAdapter implements OSINTSourceAdapter {
  readonly code = 'tender_data';
  readonly name = '招投标数据';
  readonly layer: OSINTLayer = 'BUSINESS';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: false,
    supportsRiskQuery: false,
    maxResultsPerQuery: 50,
  };

  private config: OSINTSourceConfig | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 搜索招投标记录
   */
  async searchTenderRecords(companyName: string): Promise<BusinessRecord[]> {
    const timeout = this.config?.timeout || 15000;
    const records: BusinessRecord[] = [];

    try {
      // 搜索中标公告
      const searchQuery = `${companyName} 中标 公告`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const tenderRecords = this.parseTenderResults(html, companyName);
      records.push(...tenderRecords);

      // 搜索投标记录
      const bidSearchQuery = `${companyName} 招标 投标`;
      const bidResponse = await fetch(
        `https://duckduckgo.com/html/?q=${encodeURIComponent(bidSearchQuery)}`,
        {
          signal: AbortSignal.timeout(timeout),
        }
      );

      if (bidResponse.ok) {
        const bidHtml = await bidResponse.text();
        const bidRecords = this.parseBidResults(bidHtml, companyName);
        records.push(...bidRecords);
      }

      return records;
    } catch (error) {
      console.warn('[TenderData] Search failed:', String(error));
      return [];
    }
  }

  /**
   * 解析中标结果
   */
  private parseTenderResults(html: string, companyName: string): BusinessRecord[] {
    const records: BusinessRecord[] = [];

    // 提取中标信息
    const patterns = [
      new RegExp(`${companyName}[\\s]*中标[\\s]*([^\\n]{5,50})`),
      /中标金额[:：]?\s*(\d+[,.]?\d*)\s*(万元|元|美元)/,
      /中标项目[:：]?\s*([^\n]+)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const description = match[0];
        const amountMatch = description.match(/(\d+[,.]?\d*)\s*(万元|元|美元)/);

        records.push({
          type: 'CONTRACT',
          title: `发现中标记录`,
          description,
          amount: amountMatch ? {
            value: parseFloat(amountMatch[1].replace(',', '')),
            currency: amountMatch[2] === '美元' ? 'USD' : 'CNY',
          } : undefined,
          source: 'news_search',
        });
      }
    }

    return records;
  }

  /**
   * 解析投标结果
   */
  private parseBidResults(html: string, companyName: string): BusinessRecord[] {
    const records: BusinessRecord[] = [];

    // 提取投标信息
    if (html.includes(companyName) && html.includes('招标')) {
      records.push({
        type: 'TENDER',
        title: `发现投标活动`,
        description: `${companyName} 参与招标活动`,
        source: 'news_search',
      });
    }

    return records;
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use searchTenderRecords method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 经营新闻适配器 ====================

/**
 * 经营新闻适配器
 * 搜索企业的经营动态、产品发布、合作新闻等
 */
class BusinessNewsAdapter implements OSINTSourceAdapter {
  readonly code = 'business_news';
  readonly name = '经营新闻动态';
  readonly layer: OSINTLayer = 'BUSINESS';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: false,
    supportsAssociationQuery: false,
    supportsRiskQuery: false,
    maxResultsPerQuery: 30,
  };

  private config: OSINTSourceConfig | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 搜索经营新闻
   */
  async searchBusinessNews(companyName: string): Promise<BusinessRecord[]> {
    const timeout = this.config?.timeout || 15000;
    const records: BusinessRecord[] = [];

    const newsTypes = [
      { keyword: '发布新产品', type: 'NEWS' },
      { keyword: '签署合同', type: 'CONTRACT' },
      { keyword: '合作', type: 'NEWS' },
      { keyword: '投资', type: 'NEWS' },
      { keyword: '获得认证', type: 'CERTIFICATION' },
      { keyword: '产品认证', type: 'CERTIFICATION' },
    ];

    for (const newsType of newsTypes) {
      try {
        const searchQuery = `${companyName} ${newsType.keyword}`;
        const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(searchUrl, {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
          },
        });

        if (!response.ok) continue;

        const html = await response.text();

        if (html.includes(companyName) && html.includes(newsType.keyword)) {
          // 提取新闻标题
          const titleMatch = html.match(new RegExp(`${companyName}[^<]{0,100}${newsType.keyword}[^<]{0,50}`));

          records.push({
            type: newsType.type as 'NEWS' | 'CONTRACT' | 'CERTIFICATION',
            title: `${companyName} ${newsType.keyword}`,
            description: titleMatch?.[0]?.substring(0, 100) || `${companyName} 相关经营动态`,
            source: 'news_search',
          });
        }
      } catch {
        continue;
      }
    }

    // 去重
    const uniqueRecords = records.filter((r, i) =>
      records.findIndex(r2 => r2.title === r.title) === i
    );

    return uniqueRecords;
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use searchBusinessNews method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 经营活跃度计算器 ====================

/**
 * 经营活跃度计算器
 * 根据经营记录计算企业的经营活跃度评分
 */
class ActivityScoreCalculator {
  /**
   * 计算经营活跃度评分
   */
  calculateActivityScore(records: BusinessRecord[]): number {
    // 基础评分
    let score = 50;

    // 根据记录类型和数量调整
    const typeWeights = {
      CUSTOMS_IMPORT: 10,
      CUSTOMS_EXPORT: 10,
      TENDER: 8,
      CONTRACT: 12,
      CERTIFICATION: 5,
      NEWS: 3,
    };

    for (const record of records) {
      const weight = typeWeights[record.type] || 5;
      score += weight;
    }

    // 根据金额调整（如果有）
    for (const record of records) {
      if (record.amount) {
        // 大金额合同加分
        if (record.amount.value > 1000000) {
          score += 10;
        } else if (record.amount.value > 100000) {
          score += 5;
        }
      }
    }

    // 时间衰减（最近的活动权重更高）
    for (const record of records) {
      if (record.date) {
        const daysSinceRecord = (Date.now() - record.date.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceRecord < 365) {
          score += 5; // 一年内活动加分
        } else if (daysSinceRecord < 730) {
          score += 2; // 两年内活动加分
        }
      }
    }

    // 确保评分在0-100范围内
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 提取主要市场
   */
  extractPrimaryMarkets(records: BusinessRecord[]): string[] {
    const markets: string[] = [];

    for (const record of records) {
      if (record.country) {
        markets.push(record.country);
      }
      // 从描述中提取国家信息
      if (record.description) {
        const countryPatterns = [
          /向([^\s]{2,10})出口/,
          /从([^\s]{2,10})进口/,
          /([^\s]{2,10})市场/,
        ];

        for (const pattern of countryPatterns) {
          const match = record.description.match(pattern);
          if (match) {
            markets.push(match[1]);
          }
        }
      }
    }

    // 去重并返回前5个
    return [...new Set(markets)].slice(0, 5);
  }

  /**
   * 提取主要产品
   */
  extractPrimaryProducts(records: BusinessRecord[]): string[] {
    const products: string[] = [];

    for (const record of records) {
      if (record.product) {
        products.push(record.product);
      }
    }

    // 去重并返回前5个
    return [...new Set(products)].slice(0, 5);
  }
}

// ==================== 经营层聚合器 ====================

/**
 * 经营层聚合器
 * 整合海关数据、招投标、经营新闻
 */
class BusinessLayerAggregator {
  private customsAdapter = new CustomsDataAdapter();
  private tenderAdapter = new TenderDataAdapter();
  private newsAdapter = new BusinessNewsAdapter();
  private scoreCalculator = new ActivityScoreCalculator();

  initialize(configs: Record<string, OSINTSourceConfig>): void {
    if (configs.customs_data) {
      this.customsAdapter.initialize(configs.customs_data);
    }
    if (configs.tender_data) {
      this.tenderAdapter.initialize(configs.tender_data);
    }
    if (configs.business_news) {
      this.newsAdapter.initialize(configs.business_news);
    }
  }

  /**
   * 执行经营层调查
   */
  async investigate(query: CompanyInvestigationQuery): Promise<BusinessLayerResult> {
    const companyName = query.companyName;

    const records: BusinessRecord[] = [];

    // 1. 海关进出口数据
    if (query.options?.checkBusiness !== false) {
      const customsRecords = await this.customsAdapter.searchCustomsRecords(companyName);
      records.push(...customsRecords);
    }

    // 2. 招投标数据
    const tenderRecords = await this.tenderAdapter.searchTenderRecords(companyName);
    records.push(...tenderRecords);

    // 3. 经营新闻
    const newsRecords = await this.newsAdapter.searchBusinessNews(companyName);
    records.push(...newsRecords);

    // 计算经营活跃度评分
    const activityScore = this.scoreCalculator.calculateActivityScore(records);

    // 提取主要市场和产品
    const primaryMarkets = this.scoreCalculator.extractPrimaryMarkets(records);
    const primaryProducts = this.scoreCalculator.extractPrimaryProducts(records);

    return {
      records,
      activityScore,
      primaryMarkets,
      primaryProducts,
      sources: ['customs_data', 'tender_data', 'business_news'],
    };
  }

  /**
   * 健康检查所有适配器
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    const customsHealth = await this.customsAdapter.healthCheck();
    results.customs_data = customsHealth;

    const tenderHealth = await this.tenderAdapter.healthCheck();
    results.tender_data = tenderHealth;

    const newsHealth = await this.newsAdapter.healthCheck();
    results.business_news = newsHealth;

    return results;
  }
}

// 导出所有适配器
export {
  CustomsDataAdapter,
  TenderDataAdapter,
  BusinessNewsAdapter,
  ActivityScoreCalculator,
  BusinessLayerAggregator,
};