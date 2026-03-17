// ==================== International Development Bank Adapter ====================
// 国际开发银行项目适配器
// 覆盖：世界银行、非洲开发银行、亚洲开发银行、欧洲复兴开发银行
// 这些银行的项目信息公开，是发现新兴市场机会的可靠来源

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

// ==================== 数据源配置 ====================

interface DevelopmentBank {
  code: string;
  name: string;
  region: string[];
  apiUrl: string;
  coverage: string;
}

const DEVELOPMENT_BANKS: DevelopmentBank[] = [
  {
    code: 'worldbank',
    name: '世界银行',
    region: ['AFRICA', 'MENA', 'LATAM', 'ECA', 'EAP'], // 非洲、中东、拉美、东欧中亚、东亚
    apiUrl: 'https://search.worldbank.org/api/v2/projects',
    coverage: '全球发展中国家',
  },
  {
    code: 'afdb',
    name: '非洲开发银行',
    region: ['AFRICA'],
    apiUrl: 'https://www.afdb.org/en/projects-and-operations',
    coverage: '非洲54国',
  },
  {
    code: 'ebrd',
    name: '欧洲复兴开发银行',
    region: ['ECA'], // 东欧、中亚、土耳其
    apiUrl: 'https://www.ebrd.com/work-with-us/project-finance/project-summary-documents.html',
    coverage: '东欧、中亚、土耳其',
  },
  {
    code: 'adb',
    name: '亚洲开发银行',
    region: ['ASIA', 'PACIFIC'],
    apiUrl: 'https://www.adb.org/projects',
    coverage: '亚太地区（含部分中东国家）',
  },
  {
    code: 'idb',
    name: '美洲开发银行',
    region: ['LATAM', 'CARIBBEAN'],
    apiUrl: 'https://www.iadb.org/en/projects',
    coverage: '拉美和加勒比地区',
  },
  {
    code: 'isdb',
    name: '伊斯兰开发银行',
    region: ['MENA', 'AFRICA', 'ASIA'],
    apiUrl: 'https://www.isdb.org/projects',
    coverage: '伊斯兰国家（中东、非洲、亚洲）',
  },
];

// ==================== 项目类型 ====================

interface DevelopmentProject {
  id: string;
  title: string;
  country: string;
  region: string;
  sector: string;
  status: string;
  budget?: number;
  currency?: string;
  approvalDate?: string;
  closingDate?: string;
  borrower?: string;
  implementingAgency?: string;
  description?: string;
  procurementNotices?: Array<{
    title: string;
    type: string;
    deadline?: string;
  }>;
  source: string;
  url: string;
}

interface ParsedProject {
  projectName: string;
  country: string;
  region: string;
  sector: string;
  budget?: number;
  currency?: string;
  status: string;
  implementingAgency?: string;
  procurementOpportunities: string[];
  relevantKeywords: string[];
  sourceUrl: string;
  bankName: string;
}

// ==================== 国际开发银行适配器 ====================

export class DevelopmentBankAdapter implements RadarAdapter {
  readonly sourceCode = 'dev_bank';
  readonly channelType = 'TENDER' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true, // 行业/部门
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 50,
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  private timeout: number;
  private targetBanks: string[];

  constructor(config: AdapterConfig) {
    this.timeout = config.timeout || 60000;
    // 默认使用所有银行
    this.targetBanks = (config.banks as string[]) || DEVELOPMENT_BANKS.map(b => b.code);
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    // 根据目标地区选择银行
    const targetBanks = this.selectBanks(query);

    // 获取项目数据
    const projects = await this.fetchProjects(targetBanks, query);

    // AI 分析项目相关性
    const relevantProjects = await this.analyzeProjects(projects, query);

    // 转换为标准候选
    const items = relevantProjects.map(p => this.normalizeProject(p));

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
   * 根据目标地区选择银行
   */
  private selectBanks(query: RadarSearchQuery): DevelopmentBank[] {
    const regions = query.regions || [];

    if (regions.length === 0) {
      return DEVELOPMENT_BANKS.filter(b => this.targetBanks.includes(b.code));
    }

    // 区域代码映射
    const regionMap: Record<string, string[]> = {
      'MENA': ['MENA'],           // 中东和北非
      'MIDDLE_EAST': ['MENA'],
      'AFRICA': ['AFRICA'],
      'LATAM': ['LATAM', 'CARIBBEAN'],
      'LATIN_AMERICA': ['LATAM'],
      'ECA': ['ECA'],             // 东欧和中亚
      'EASTERN_EUROPE': ['ECA'],
      'ASIA': ['ASIA', 'EAP'],
      'CARIBBEAN': ['CARIBBEAN'],
    };

    const targetRegionCodes = new Set<string>();
    for (const region of regions) {
      const codes = regionMap[region.toUpperCase()] || [region.toUpperCase()];
      codes.forEach(c => targetRegionCodes.add(c));
    }

    return DEVELOPMENT_BANKS.filter(b =>
      this.targetBanks.includes(b.code) &&
      b.region.some(r => targetRegionCodes.has(r))
    );
  }

  /**
   * 获取项目数据
   */
  private async fetchProjects(
    banks: DevelopmentBank[],
    query: RadarSearchQuery
  ): Promise<DevelopmentProject[]> {
    const projects: DevelopmentProject[] = [];

    // 使用 Brave Search 搜索各银行项目
    const { BraveSearchAdapter } = await import('./brave-search');
    const braveAdapter = new BraveSearchAdapter({} as never);

    const keywords = query.keywords || [];
    const sectors = query.targetIndustries || [];

    for (const bank of banks.slice(0, 3)) {
      try {
        // 构建针对性的搜索查询
        const searchQueries = this.buildBankSearchQueries(bank, keywords, sectors);

        for (const sq of searchQueries.slice(0, 2)) {
          const result = await braveAdapter.search({
            keywords: [sq],
            countries: query.countries,
            cursor: query.cursor,
          });

          // 过滤银行相关结果
          for (const item of result.items) {
            if (this.isBankProjectUrl(item.sourceUrl, bank)) {
              projects.push({
                id: `dev_${bank.code}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                title: item.displayName,
                country: item.country || '',
                region: bank.region.join(','),
                sector: '',
                status: 'Active',
                description: item.description,
                source: bank.code,
                url: item.sourceUrl,
              });
            }
          }

          await new Promise(r => setTimeout(r, 300));
        }
      } catch (error) {
        console.error(`[${bank.code}] Fetch error:`, error);
      }
    }

    // 尝试使用世界银行 API（如果有关键词）
    if (keywords.length > 0 && this.targetBanks.includes('worldbank')) {
      try {
        const wbProjects = await this.fetchWorldBankAPI(keywords, query);
        projects.push(...wbProjects);
      } catch (error) {
        console.error('[WorldBank API] Error:', error);
      }
    }

    return projects;
  }

  /**
   * 构建银行搜索查询
   */
  private buildBankSearchQueries(
    bank: DevelopmentBank,
    keywords: string[],
    sectors: string[]
  ): string[] {
    const queries: string[] = [];
    const keyword = keywords.slice(0, 2).join(' ') || 'industrial';
    const sector = sectors[0] || 'manufacturing';

    // 银行官网项目搜索
    const bankDomains: Record<string, string> = {
      worldbank: 'worldbank.org',
      afdb: 'afdb.org',
      ebrd: 'ebrd.com',
      adb: 'adb.org',
      idb: 'iadb.org',
      isdb: 'isdb.org',
    };

    const domain = bankDomains[bank.code];
    if (domain) {
      queries.push(`site:${domain} projects ${keyword}`);
      queries.push(`site:${domain} procurement ${sector}`);
    }

    // 通用搜索
    queries.push(`${bank.name} project ${keyword} procurement`);

    return queries;
  }

  /**
   * 判断是否是银行项目URL
   */
  private isBankProjectUrl(url: string, bank: DevelopmentBank): boolean {
    const domains: Record<string, string[]> = {
      worldbank: ['worldbank.org', 'projects.worldbank.org', 'documents.worldbank.org'],
      afdb: ['afdb.org'],
      ebrd: ['ebrd.com'],
      adb: ['adb.org'],
      idb: ['iadb.org', 'idb.org'],
      isdb: ['isdb.org'],
    };

    const bankDomains = domains[bank.code] || [];
    return bankDomains.some(d => url.includes(d));
  }

  /**
   * 世界银行 API（官方API）
   */
  private async fetchWorldBankAPI(
    keywords: string[],
    query: RadarSearchQuery
  ): Promise<DevelopmentProject[]> {
    const projects: DevelopmentProject[] = [];

    try {
      const params = new URLSearchParams({
        format: 'json',
        rows: '20',
        kw: keywords.join(' '),
      });

      // 国家过滤
      if (query.countries?.length) {
        // 世界银行使用ISO2国家代码
        params.set('countrycode', query.countries.slice(0, 5).join(';'));
      }

      const response = await fetch(
        `https://search.worldbank.org/api/v2/projects?${params}`,
        {
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) return projects;

      const data = await response.json();
      const items = data.projects || {};

      for (const [id, project] of Object.entries(items)) {
        const p = project as Record<string, unknown>;
        projects.push({
          id: `wb_${id}`,
          title: (p.project_name as string) || '',
          country: (p.countryname as string) || '',
          region: (p.regionname as string) || '',
          sector: (p.sector?.[0]?.Name as string) || '',
          status: (p.status as string) || '',
          budget: p.totalcost as number,
          currency: 'USD',
          approvalDate: p.boardapprovaldate as string,
          closingDate: p.closingdate as string,
          borrower: (p.borrower as string) || '',
          description: (p.project_abstract?.cdata as string) || '',
          source: 'worldbank',
          url: `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`,
        });
      }
    } catch (error) {
      console.error('[WorldBank API] Error:', error);
    }

    return projects;
  }

  /**
   * AI 分析项目相关性
   */
  private async analyzeProjects(
    projects: DevelopmentProject[],
    query: RadarSearchQuery
  ): Promise<ParsedProject[]> {
    if (projects.length === 0) return [];

    const systemPrompt = `你是国际开发项目分析专家。分析世界银行等开发银行的项目，识别商业机会。

分析要点：
1. 项目涉及设备采购 = 销售机会
2. 项目实施机构 = 潜在客户
3. 项目预算和进度 = 判断时机
4. 行业匹配度 = 优先级判断

输出要求：
1. 提取项目名称、国家、行业、预算
2. 识别采购机会（如：设备采购、咨询服务、工程建设）
3. 提取相关关键词
4. 标注信息来源银行

输出JSON：
{
  "projects": [
    {
      "projectName": "项目名",
      "country": "国家",
      "region": "地区",
      "sector": "行业",
      "budget": 1000000,
      "currency": "USD",
      "status": "Active",
      "implementingAgency": "实施机构",
      "procurementOpportunities": ["设备采购", "咨询服务"],
      "relevantKeywords": ["涂装", "表面处理"],
      "sourceUrl": "项目链接",
      "bankName": "世界银行"
    }
  ]
}`;

    const userPrompt = `目标行业：${query.targetIndustries?.join(', ') || '制造业'}
目标关键词：${query.keywords?.join(', ') || '工业设备'}
目标地区：${query.regions?.join(', ') || '新兴市场'}

项目数据：
${JSON.stringify(projects.slice(0, 15).map(p => ({
  title: p.title,
  country: p.country,
  sector: p.sector,
  budget: p.budget,
  status: p.status,
  description: p.description?.slice(0, 200),
  url: p.url,
  bank: p.source,
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
      return parsed.projects || [];
    } catch (error) {
      console.error('[DevelopmentBank] AI parse error:', error);
      return [];
    }
  }

  /**
   * 标准化项目信息
   */
  normalizeProject(project: ParsedProject): NormalizedCandidate {
    const externalId = `devbank_${Date.now()}_${this.hashString(project.projectName)}`;

    return {
      externalId,
      sourceUrl: project.sourceUrl,
      displayName: project.projectName,
      description: `来源：${project.bankName}。采购机会：${project.procurementOpportunities.join(', ')}`,
      candidateType: 'OPPORTUNITY',

      country: project.country,
      deadline: project.status === 'Active' ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) : undefined, // 默认6个月
      estimatedValue: project.budget,
      currency: project.currency || 'USD',
      buyerName: project.implementingAgency,
      buyerCountry: project.country,
      buyerType: 'international_org',
      categoryName: project.sector,

      matchExplain: {
        channel: 'tender',
        reasons: [
          `${project.bankName}项目`,
          `国家: ${project.country}`,
          `行业: ${project.sector}`,
          `采购: ${project.procurementOpportunities.slice(0, 2).join(', ')}`,
        ].filter(Boolean) as string[],
        matchedKeywords: project.relevantKeywords,
      },

      matchScore: 0.8, // 开发银行项目意向度高

      rawData: {
        source: 'dev_bank',
        bankName: project.bankName,
        sector: project.sector,
        budget: project.budget,
        procurementOpportunities: project.procurementOpportunities,
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
      message: 'Development bank adapter ready',
    };
  }
}