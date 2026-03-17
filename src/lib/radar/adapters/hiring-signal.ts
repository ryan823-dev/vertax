// ==================== Hiring Signal Adapter ====================
// 招聘信号适配器：通过招聘信息识别扩张中的公司
// 招聘 = 公司增长 = 潜在需求 = 高质量线索

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

// ==================== 招聘信号类型 ====================

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string;
  country?: string;
  salary?: string;
  description?: string;
  postedDate?: string;
  source: string;
  url: string;
  // 解析后的信号
  signals?: string[];
  relevanceScore?: number;
}

interface ParsedJobSignal {
  companyName: string;
  companyWebsite?: string;
  industry?: string;
  country?: string;
  city?: string;
  jobCount: number;
  jobTitles: string[];
  signals: string[];
  growthIndicator: 'high' | 'medium' | 'low';
  sourceUrl: string;
}

// ==================== 招聘信号适配器 ====================

export class HiringSignalAdapter implements RadarAdapter {
  readonly sourceCode = 'hiring_signal';
  readonly channelType = 'HIRING' as const;

  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true, // 职位类型
    supportsDateFilter: true,
    supportsRegionFilter: true,
    supportsPagination: false,
    supportsDetails: false,
    maxResultsPerQuery: 50,
    rateLimit: { requests: 10, windowMs: 60000 },
  };

  private timeout: number;

  constructor(config: AdapterConfig) {
    this.timeout = config.timeout || 60000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();

    // 构建招聘搜索查询
    const searchQueries = this.buildJobSearchQueries(query);

    // 使用 Brave Search 搜索招聘信息
    const jobPostings = await this.fetchJobPostings(searchQueries, query);

    // AI 分析招聘信号
    const companies = await this.analyzeJobSignals(jobPostings, query);

    // 转换为标准候选
    const items = companies.map(c => this.normalizeCompany(c));

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
   * 构建招聘搜索查询
   */
  private buildJobSearchQueries(query: RadarSearchQuery): string[] {
    const queries: string[] = [];
    const keywords = query.keywords || [];
    const industries = query.targetIndustries || [];
    const countries = query.countries || [];

    // 行业 + 岗位组合
    const jobKeywords = [
      'hiring',
      'job opening',
      'career opportunity',
      'we are looking for',
      'join our team',
    ];

    for (const keyword of keywords.slice(0, 3)) {
      for (const jobKeyword of jobKeywords.slice(0, 2)) {
        queries.push(`"${keyword}" ${jobKeyword}`);
      }
    }

    // 行业相关岗位
    if (industries.length > 0) {
      const industryJobs: Record<string, string[]> = {
        'coating': ['painting engineer', 'coating technician', 'surface treatment'],
        'manufacturing': ['production manager', 'manufacturing engineer', 'quality control'],
        'automotive': ['automotive engineer', 'production supervisor', 'assembly line'],
        'metal': ['metal fabricator', 'welding engineer', 'CNC operator'],
      };

      for (const industry of industries.slice(0, 2)) {
        const jobs = industryJobs[industry.toLowerCase()] || [];
        for (const job of jobs.slice(0, 2)) {
          queries.push(`"${job}" hiring`);
        }
      }
    }

    // 地区限定
    if (countries.length > 0) {
      queries.push(`manufacturing jobs in ${countries[0]}`);
    }

    return queries.length > 0 ? queries : ['manufacturing hiring'];
  }

  /**
   * 获取招聘信息
   */
  private async fetchJobPostings(
    searchQueries: string[],
    query: RadarSearchQuery
  ): Promise<JobPosting[]> {
    const postings: JobPosting[] = [];

    // 使用 Brave Search 搜索招聘信息
    const { BraveSearchAdapter } = await import('./brave-search');
    const braveAdapter = new BraveSearchAdapter({} as never);

    for (const sq of searchQueries.slice(0, 5)) {
      try {
        const result = await braveAdapter.search({
          keywords: [sq, 'job', 'career', 'hiring'],
          countries: query.countries,
          cursor: query.cursor,
        });

        // 提取招聘相关结果
        for (const item of result.items) {
          const isJobPosting = this.isJobPostingUrl(item.sourceUrl) ||
            this.hasJobKeywords(item.description);

          if (isJobPosting) {
            postings.push({
              id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              title: item.displayName,
              company: item.displayName, // 需要AI解析
              location: item.city,
              country: item.country,
              description: item.description,
              source: 'brave_search',
              url: item.sourceUrl,
            });
          }
        }

        // 速率限制
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error('[HiringSignal] Search error:', error);
      }
    }

    return postings;
  }

  /**
   * 判断是否是招聘页面URL
   */
  private isJobPostingUrl(url: string): boolean {
    const jobPatterns = [
      '/jobs/', '/careers/', '/job/', '/hiring/',
      'indeed.com', 'linkedin.com/jobs', 'glassdoor.com',
      'monster.com', 'ziprecruiter.com', 'careerbuilder.com',
      'glassdoor.', 'angel.co', 'wellfound.com',
    ];
    return jobPatterns.some(p => url.toLowerCase().includes(p));
  }

  /**
   * 判断描述是否包含招聘关键词
   */
  private hasJobKeywords(description?: string): boolean {
    if (!description) return false;
    const keywords = [
      'we are hiring', 'we\'re hiring', 'join our team',
      'job opening', 'career opportunity', 'apply now',
      'position available', 'looking for', 'seeking',
      '招聘', '诚聘', '加入我们',
    ];
    const desc = description.toLowerCase();
    return keywords.some(k => desc.includes(k));
  }

  /**
   * AI 分析招聘信号
   */
  private async analyzeJobSignals(
    postings: JobPosting[],
    query: RadarSearchQuery
  ): Promise<ParsedJobSignal[]> {
    if (postings.length === 0) return [];

    const systemPrompt = `你是B2B商业分析专家。分析招聘信息，识别正在扩张的公司。

分析要点：
1. 公司招聘 = 公司增长 = 潜在客户机会
2. 招聘相关技术岗位 = 有相关需求
3. 多岗位同时招聘 = 强增长信号
4. 特定岗位暗示业务方向

输出要求：
1. 提取公司名称、可能的网站、行业
2. 统计该公司的招聘数量和岗位
3. 识别招聘信号（如：招聘涂装工程师 = 可能有涂装设备需求）
4. 评估增长指标（high/medium/low）

输出JSON：
{
  "companies": [
    {
      "companyName": "公司名",
      "companyWebsite": "可能的网站",
      "industry": "行业",
      "country": "国家",
      "city": "城市",
      "jobCount": 3,
      "jobTitles": ["岗位1", "岗位2"],
      "signals": ["招聘涂装工程师-可能有涂装设备需求", "多岗位招聘-公司扩张"],
      "growthIndicator": "high",
      "sourceUrl": "招聘来源"
    }
  ]
}`;

    const userPrompt = `目标行业：${query.targetIndustries?.join(', ') || '制造业'}
目标岗位：${query.keywords?.join(', ') || '工程/生产相关'}

招聘信息：
${JSON.stringify(postings.slice(0, 30).map(p => ({
  title: p.title,
  company: p.company,
  location: p.location,
  description: p.description?.slice(0, 200),
  url: p.url,
})), null, 2)}

请识别正在招聘的公司及其商业信号。`;

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
      return parsed.companies || [];
    } catch (error) {
      console.error('[HiringSignal] AI parse error:', error);
      return [];
    }
  }

  /**
   * 标准化公司信息
   */
  normalizeCompany(company: ParsedJobSignal): NormalizedCandidate {
    const externalId = `hiring_${Date.now()}_${this.hashString(company.companyName)}`;

    // 计算匹配分数（基于招聘信号强度）
    const matchScore = company.growthIndicator === 'high' ? 0.9 :
                       company.growthIndicator === 'medium' ? 0.7 : 0.5;

    return {
      externalId,
      sourceUrl: company.sourceUrl || company.companyWebsite || '',
      displayName: company.companyName,
      candidateType: 'COMPANY',

      website: company.companyWebsite,
      country: company.country,
      city: company.city,
      industry: company.industry,

      matchScore,
      matchExplain: {
        channel: 'hiring_signal',
        reasons: [
          `招聘信号: ${company.jobCount} 个岗位`,
          `增长指标: ${company.growthIndicator}`,
          ...company.signals.slice(0, 3),
        ].filter(Boolean) as string[],
        jobTitles: company.jobTitles,
      },

      // 招聘信号作为描述
      description: `${company.companyName} 正在招聘 ${company.jobTitles.join(', ')} 等岗位。信号：${company.signals.join('; ')}`,

      rawData: {
        source: 'hiring_signal',
        jobCount: company.jobCount,
        jobTitles: company.jobTitles,
        signals: company.signals,
        growthIndicator: company.growthIndicator,
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
      message: 'Hiring signal adapter ready',
    };
  }
}