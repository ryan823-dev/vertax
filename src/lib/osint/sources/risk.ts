// ==================== 风险层数据源适配器 ====================
// 法院公告、制裁名单、负面新闻等风险信息查询

import type {
  OSINTSourceAdapter,
  OSINTSourceConfig,
  OSINTLayer,
  CompanyInvestigationQuery,
  RiskRecord,
  RiskLayerResult,
  RiskType,
} from '../types';

// ==================== 制裁名单数据源 ====================

/**
 * 全球制裁名单数据源配置
 */
export const SANCTION_LISTS_CONFIGS = {
  // 美国OFAC制裁名单
  ofac: {
    name: 'OFAC (美国财政部制裁名单)',
    apiUrl: 'https://api.sam.gov',
    officialApi: true,
    listType: 'sanctions',
    countries: ['US'],
  },
  // 欧盟制裁名单
  eu_sanctions: {
    name: 'EU Sanctions List',
    apiUrl: 'https://webgate.ec.europa.eu/fsd/fsf',
    officialApi: true,
    listType: 'sanctions',
    countries: ['EU'],
  },
  // 英国制裁名单
  uk_sanctions: {
    name: 'UK Sanctions List',
    apiUrl: 'https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets',
    officialApi: true,
    listType: 'sanctions',
    countries: ['GB'],
  },
  // 联合国制裁名单
  un_sanctions: {
    name: 'UN Security Council Sanctions List',
    apiUrl: 'https://scsanctions.un.org',
    officialApi: true,
    listType: 'sanctions',
    countries: ['GLOBAL'],
  },
};

/**
 * 制裁名单适配器
 * 检查企业是否在各国制裁名单中
 */
class SanctionsListAdapter implements OSINTSourceAdapter {
  readonly code = 'sanctions_list';
  readonly name = '制裁名单查询';
  readonly layer: OSINTLayer = 'RISK';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: false,
    supportsRiskQuery: true,
    maxResultsPerQuery: 100,
  };

  private config: OSINTSourceConfig | null = null;
  private apiKey: string | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
    this.apiKey = process.env.OFAC_API_KEY || config.apiKey || null;
  }

  /**
   * 检查制裁名单
   */
  async checkSanctions(companyName: string): Promise<RiskRecord[]> {
    const records: RiskRecord[] = [];

    // 1. 检查OFAC名单
    const ofacRecords = await this.checkOFAC(companyName);
    records.push(...ofacRecords);

    // 2. 检查欧盟制裁名单
    const euRecords = await this.checkEUSanctions(companyName);
    records.push(...euRecords);

    // 3. 检查联合国制裁名单
    const unRecords = await this.checkUNSanctions(companyName);
    records.push(...unRecords);

    return records;
  }

  /**
   * 检查OFAC SDN名单
   */
  private async checkOFAC(companyName: string): Promise<RiskRecord[]> {
    const timeout = this.config?.timeout || 15000;

    try {
      // OFAC公开API
      const apiUrl = 'https://api.sam.gov/v1/entities/search';

      // 如果没有API Key，使用公开数据
      if (!this.apiKey) {
        return this.checkOFACPublic(companyName, timeout);
      }

      const params = new URLSearchParams();
      params.set('q', companyName);
      params.set('api_key', this.apiKey);

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return this.parseOFACResults(data);
    } catch (error) {
      console.warn('[SanctionsList] OFAC check failed:', String(error));
      return [];
    }
  }

  /**
   * 使用公开数据检查OFAC名单
   */
  private async checkOFACPublic(companyName: string, timeout: number): Promise<RiskRecord[]> {
    try {
      // 使用搜索引擎查询OFAC名单
      const searchQuery = `${companyName} site:home.treasury.gov OFAC sanctions`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();

      // 检查是否在名单中
      if (html.toLowerCase().includes(companyName.toLowerCase()) &&
          html.includes('SDN') || html.includes('sanctions')) {
        return [{
          type: 'SANCTION',
          severity: 'HIGH',
          title: '可能被列入OFAC制裁名单',
          description: `发现 ${companyName} 可能在美国财政部OFAC制裁名单中`,
          source: 'ofac',
          sourceUrl: 'https://home.treasury.gov/policy-issues/office-of-foreign-assets-control-sanctions-programs-and-information',
        }];
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * 解析OFAC结果
   */
  private parseOFACResults(data: Record<string, unknown>): RiskRecord[] {
    const entities = (data.entities as Array<Record<string, unknown>>) || [];

    return entities.map(entity => ({
      type: 'SANCTION',
      severity: 'HIGH',
      title: `被列入OFAC ${entity.sdnType || '制裁名单'}`,
      description: entity.type as string,
      date: entity.listedDate ? new Date(entity.listedDate as string) : undefined,
      source: 'ofac',
      sourceUrl: 'https://home.treasury.gov',
      details: entity,
    }));
  }

  /**
   * 检查欧盟制裁名单
   */
  private async checkEUSanctions(companyName: string): Promise<RiskRecord[]> {
    const timeout = this.config?.timeout || 15000;

    try {
      // 搜索欧盟制裁XML数据
      const searchQuery = `${companyName} EU sanctions consolidated list`;
      const response = await fetch(
        `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`,
        {
          signal: AbortSignal.timeout(timeout),
        }
      );

      if (!response.ok) return [];

      const html = await response.text();

      if (html.toLowerCase().includes(companyName.toLowerCase()) &&
          html.includes('sanction')) {
        return [{
          type: 'SANCTION',
          severity: 'HIGH',
          title: '可能被列入欧盟制裁名单',
          description: `发现 ${companyName} 可能被列入欧盟金融制裁名单`,
          source: 'eu_sanctions',
          sourceUrl: 'https://webgate.ec.europa.eu/fsd/fsf',
        }];
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * 检查联合国制裁名单
   */
  private async checkUNSanctions(companyName: string): Promise<RiskRecord[]> {
    const timeout = this.config?.timeout || 15000;

    try {
      const apiUrl = 'https://scsanctions.un.org/resources/xml/en';

      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) return [];

      const xml = await response.text();

      if (xml.toLowerCase().includes(companyName.toLowerCase())) {
        return [{
          type: 'SANCTION',
          severity: 'HIGH',
          title: '被列入联合国安全理事会制裁名单',
          description: `发现 ${companyName} 被列入联合国制裁名单`,
          source: 'un_sanctions',
          sourceUrl: 'https://scsanctions.un.org',
        }];
      }

      return [];
    } catch {
      return [];
    }
  }

  async searchCompany(_query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use checkSanctions method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch('https://scsanctions.un.org/resources/xml/en');
      return {
        healthy: response.ok,
        latency: Date.now() - start,
      };
    } catch (error) {
      return { healthy: false, latency: Date.now() - start, error: String(error) };
    }
  }
}

// ==================== 负面新闻舆情适配器 ====================

/**
 * 负面新闻舆情查询适配器
 * 搜索与企业相关的负面新闻报道
 */
class AdverseMediaAdapter implements OSINTSourceAdapter {
  readonly code = 'adverse_media';
  readonly name = '负面新闻舆情';
  readonly layer: OSINTLayer = 'RISK';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: false,
    supportsAssociationQuery: false,
    supportsRiskQuery: true,
    maxResultsPerQuery: 20,
  };

  private config: OSINTSourceConfig | null = null;
  private negativeKeywords = [
    '欺诈',
    '诈骗',
    '造假',
    '破产',
    '倒闭',
    '违规',
    '处罚',
    '罚款',
    '诉讼',
    '起诉',
    '涉嫌',
    '调查',
    '查处',
    'shut down',
    'fraud',
    'scam',
    'bankruptcy',
    'investigation',
    'lawsuit',
    'penalty',
    'violation',
    'illegal',
  ];

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 搜索负面新闻
   */
  async searchAdverseNews(companyName: string, language?: string): Promise<RiskRecord[]> {
    const timeout = this.config?.timeout || 15000;
    const records: RiskRecord[] = [];

    // 构建负面关键词搜索
    for (const keyword of this.negativeKeywords.slice(0, 10)) {
      try {
        const searchQuery = `${companyName} ${keyword}`;
        const searchUrl = language === 'zh'
          ? `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`
          : `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(searchUrl, {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
          },
        });

        if (!response.ok) continue;

        const html = await response.text();

        // 检查是否有实质性负面报道（不只是搜索结果页面）
        const hasRealResult = html.includes(companyName) && html.includes(keyword);

        if (hasRealResult) {
          records.push({
            type: 'ADVERSE_MEDIA',
            severity: this.inferSeverity(keyword),
            title: `发现负面新闻报道`,
            description: `发现与 ${keyword} 相关的报道`,
            source: 'news_search',
            details: { keyword },
          });
        }
      } catch {
        continue;
      }
    }

    // 去重
    const uniqueRecords = records.filter((r, i) =>
      records.findIndex(r2 => r2.title === r.title && r2.description === r.description) === i
    );

    return uniqueRecords;
  }

  /**
   * 推断严重程度
   */
  private inferSeverity(keyword: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highKeywords = ['欺诈', '诈骗', 'fraud', 'scam', '破产', 'bankruptcy', '涉嫌', '调查', 'investigation'];
    const mediumKeywords = ['诉讼', '起诉', 'lawsuit', '处罚', '罚款', 'penalty', '违规'];

    if (highKeywords.some(k => keyword.includes(k))) return 'HIGH';
    if (mediumKeywords.some(k => keyword.includes(k))) return 'MEDIUM';
    return 'LOW';
  }

  async searchCompany(_query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use searchAdverseNews method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 风险层聚合器 ====================

/**
 * 风险层聚合器
 * 整合制裁名单、负面新闻等风险信息
 */
class RiskLayerAggregator {
  private sanctionsAdapter = new SanctionsListAdapter();
  private mediaAdapter = new AdverseMediaAdapter();

  initialize(configs: Record<string, OSINTSourceConfig>): void {
    if (configs.sanctions_list) {
      this.sanctionsAdapter.initialize(configs.sanctions_list);
    }
    if (configs.adverse_media) {
      this.mediaAdapter.initialize(configs.adverse_media);
    }
  }

  /**
   * 执行风险层调查
   */
  async investigate(query: CompanyInvestigationQuery): Promise<RiskLayerResult> {
    const companyName = query.companyName;
    const language = query.options?.language;

    const records: RiskRecord[] = [];

    // 1. 制裁名单检查
    if (query.options?.checkRisk !== false) {
      const sanctionRecords = await this.sanctionsAdapter.checkSanctions(companyName);
      records.push(...sanctionRecords);
    }

    // 2. 负面新闻舆情
    const mediaRecords = await this.mediaAdapter.searchAdverseNews(companyName, language);
    records.push(...mediaRecords);

    // 计算风险评分和等级
    const riskScore = this.calculateRiskScore(records);
    const overallRisk = this.determineOverallRisk(records, riskScore);

    // 统计汇总
    const summary = {
      highCount: records.filter(r => r.severity === 'HIGH').length,
      mediumCount: records.filter(r => r.severity === 'MEDIUM').length,
      lowCount: records.filter(r => r.severity === 'LOW').length,
      byType: this.countByType(records),
    };

    return {
      records,
      overallRisk,
      riskScore,
      summary,
      sources: ['sanctions_list', 'adverse_media'],
    };
  }

  /**
   * 计算风险评分
   */
  private calculateRiskScore(records: RiskRecord[]): number {
    // 基础评分
    let score = 100;

    for (const record of records) {
      switch (record.severity) {
        case 'HIGH':
          score -= 25;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
        case 'LOW':
          score -= 5;
          break;
        case 'INFO':
          score -= 2;
          break;
      }
    }

    // 制裁记录额外扣分
    const sanctionsCount = records.filter(r => r.type === 'SANCTION').length;
    score -= sanctionsCount * 30;

    // 确保评分在0-100范围内
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 确定总体风险等级
   */
  private determineOverallRisk(records: RiskRecord[], score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR' {
    // 制裁记录直接判定为高风险
    if (records.some(r => r.type === 'SANCTION')) {
      return 'HIGH';
    }

    // 根据评分判定
    if (score >= 80) return 'CLEAR';
    if (score >= 60) return 'LOW';
    if (score >= 40) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * 按类型统计
   */
  private countByType(records: RiskRecord[]): Record<RiskType, number> {
    const counts: Record<RiskType, number> = {
      LITIGATION: 0,
      JUDGMENT: 0,
      ENFORCEMENT: 0,
      DISHONESTY: 0,
      SANCTION: 0,
      PEP: 0,
      ADVERSE_MEDIA: 0,
      BANKRUPTCY: 0,
      TAX_VIOLATION: 0,
    };

    for (const record of records) {
      counts[record.type]++;
    }

    return counts;
  }

  /**
   * 健康检查所有适配器
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    const sanctionsHealth = await this.sanctionsAdapter.healthCheck();
    results.sanctions_list = sanctionsHealth;

    const mediaHealth = await this.mediaAdapter.healthCheck();
    results.adverse_media = mediaHealth;

    return results;
  }
}

// 导出所有适配器
export {
  SanctionsListAdapter,
  AdverseMediaAdapter,
  RiskLayerAggregator,
};
