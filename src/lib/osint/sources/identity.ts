// ==================== 身份层数据源适配器 ====================
// 官网验证、Whois查询、LinkedIn企业搜索

import type {
  OSINTSourceAdapter,
  OSINTHealthCheckResult,
  OSINTSourceConfig,
  OSINTLayer,
  CompanyInvestigationQuery,
  IdentityLayerResult,
  DataSourceReliability,
} from '../types';

// ==================== 官网验证适配器 ====================

/**
 * 官网验证数据源
 * 通过抓取官网获取企业基本信息和联系方式
 */
class WebsiteVerificationAdapter implements OSINTSourceAdapter {
  readonly code = 'website_verify';
  readonly name = '官网验证';
  readonly layer: OSINTLayer = 'IDENTITY';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: false,
    supportsRiskQuery: false,
    maxResultsPerQuery: 1,
  };

  private config: OSINTSourceConfig | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 从域名抓取官网信息
   */
  async scrapeWebsite(domain: string): Promise<IdentityLayerResult['website']> {
    if (!domain) return undefined;

    const url = this.normalizeUrl(domain);
    const timeout = this.config?.timeout || 15000;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        return {
          url,
          status: response.status >= 500 ? 'INACTIVE' : 'SUSPICIOUS',
        };
      }

      const html = await response.text();
      return this.parseWebsite(html, url, response.status);
    } catch (error) {
      console.warn('[WebsiteVerification] Scrape failed:', String(error));
      return {
        url,
        status: 'INACTIVE',
      };
    }
  }

  /**
   * 规范化URL
   */
  private normalizeUrl(domain: string): string {
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      return domain;
    }
    return `https://${domain}`;
  }

  /**
   * 解析网页内容
   */
  private parseWebsite(html: string, url: string, status: number): IdentityLayerResult['website'] {
    const title = this.extractMetaContent(html, 'title');
    const description = this.extractMetaContent(html, 'description');
    const keywords = this.extractMetaContent(html, 'keywords');

    // 提取联系方式
    const emails = this.extractEmails(html);
    const phones = this.extractPhones(html);
    const addresses = this.extractAddresses(html);

    // 检测SSL和状态
    const sslValid = url.startsWith('https://');

    // 检测技术栈
    const technologies = this.detectTechnologies(html);

    return {
      url,
      title,
      description: description || keywords,
      status: 'ACTIVE',
      sslValid,
      technologies,
      contactInfo: {
        emails: emails.length > 0 ? emails : undefined,
        phones: phones.length > 0 ? phones : undefined,
        addresses: addresses.length > 0 ? addresses : undefined,
      },
    };
  }

  /**
   * 提取Meta内容
   */
  private extractMetaContent(html: string, name: string): string | undefined {
    const patterns = [
      new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"[^>]*>`, 'i'),
      new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"[^>]*>`, 'i'),
      new RegExp(`<meta[^>]*property="og:${name}"[^>]*content="([^"]*)"[^>]*>`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }

    // Title特殊处理
    if (name === 'title') {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return titleMatch?.[1]?.trim();
    }

    return undefined;
  }

  /**
   * 提取邮箱地址
   */
  private extractEmails(html: string): string[] {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailPattern) || [];

    // 过滤常见无关邮箱
    const excludePatterns = [
      /@example\.com/i,
      /@test\.com/i,
      /@yourcompany\.com/i,
      /@domain\.com/i,
      /@email\.com/i,
    ];

    return matches.filter(email =>
      !excludePatterns.some(p => p.test(email))
    );
  }

  /**
   * 提取电话号码
   */
  private extractPhones(html: string): string[] {
    // 国际电话格式（含国家代码）
    const phonePatterns = [
      /\+?[1-9]\d{1,14}/g, // E.164格式
      /\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, // 常见格式
    ];

    const phones: string[] = [];
    for (const pattern of phonePatterns) {
      const matches = html.match(pattern) || [];
      phones.push(...matches);
    }

    // 去重并过滤过短的号码
    return [...new Set(phones)].filter(p => p.length >= 7);
  }

  /**
   * 提取地址
   */
  private extractAddresses(html: string): string[] {
    // 简单地址模式匹配
    const addressPattern = /(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr| Boulevard|Blvd|Way|Place|Pl|Suite|Ste|Floor|Fl)[\w\s,.-]+)/gi;
    const matches = html.match(addressPattern) || [];
    return matches.map(a => a.trim());
  }

  /**
   * 检测技术栈
   */
  private detectTechnologies(html: string): string[] {
    const techSignatures: Record<string, RegExp> = {
      'React': /react|react-dom/i,
      'Vue': /vue\.js|vue@/i,
      'Angular': /angular|ng-/i,
      'WordPress': /wp-content|wordpress/i,
      'Shopify': /shopify|cdn\.shopify/i,
      'Magento': /magento/i,
      'Bootstrap': /bootstrap/i,
      'jQuery': /jquery/i,
      'Google Analytics': /google-analytics|gtag|ga\(/i,
      'Cloudflare': /cloudflare/i,
      'AWS': /amazonaws|aws/i,
      'Google Cloud': /googleapis|gstatic/i,
    };

    const detected: string[] = [];
    for (const [tech, pattern] of Object.entries(techSignatures)) {
      if (pattern.test(html)) {
        detected.push(tech);
      }
    }

    return detected;
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    // 官网验证不支持企业搜索，需要已知域名
    throw new Error('WebsiteVerificationAdapter requires known domain');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<OSINTHealthCheckResult> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== Whois查询适配器 ====================

/**
 * Whois查询数据源
 * 查询域名注册信息，获取注册人、注册时间等
 */
class WhoisAdapter implements OSINTSourceAdapter {
  readonly code = 'whois';
  readonly name = 'Whois域名查询';
  readonly layer: OSINTLayer = 'IDENTITY';
  readonly supportedFeatures = {
    supportsCompanySearch: false,
    supportsDetailQuery: true,
    supportsAssociationQuery: false,
    supportsRiskQuery: false,
    maxResultsPerQuery: 1,
  };

  private config: OSINTSourceConfig | null = null;
  private apiKey: string | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
    this.apiKey = process.env.WHOISXML_API_KEY || config.apiKey || null;
  }

  /**
   * 查询Whois信息
   */
  async queryWhois(domain: string): Promise<IdentityLayerResult['whois']> {
    if (!domain) return undefined;

    // 清理域名
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const timeout = this.config?.timeout || 10000;

    try {
      // 优先使用WhoisXML API（需要API Key）
      if (this.apiKey) {
        return this.queryViaAPI(cleanDomain, timeout);
      }

      // 回退到公开Whois源
      return this.queryViaPublic(cleanDomain, timeout);
    } catch (error) {
      console.warn('[WhoisAdapter] Query failed:', String(error));
      return undefined;
    }
  }

  /**
   * 通过WhoisXML API查询
   */
  private async queryViaAPI(domain: string, timeout: number): Promise<IdentityLayerResult['whois']> {
    const apiUrl = 'https://www.whoisxmlapi.com/whoisserver/WhoisService';

    try {
      const response = await fetch(
        `${apiUrl}?apiKey=${this.apiKey}&domainName=${domain}&outputFormat=JSON`,
        {
          signal: AbortSignal.timeout(timeout),
        }
      );

      if (!response.ok) {
        return this.queryViaPublic(domain, timeout);
      }

      const data = await response.json();
      return this.parseWhoisXMLAPI(data, domain);
    } catch {
      return this.queryViaPublic(domain, timeout);
    }
  }

  /**
   * 解析WhoisXML API响应
   */
  private parseWhoisXMLAPI(data: Record<string, unknown>, domain: string): IdentityLayerResult['whois'] {
    const whoisRecord = data.WhoisRecord as Record<string, unknown> || {};

    const createdDate = whoisRecord.createdDate ? new Date(whoisRecord.createdDate as string) : undefined;
    const expiryDate = whoisRecord.expiresDate ? new Date(whoisRecord.expiresDate as string) : undefined;
    const updatedDate = whoisRecord.updatedDate ? new Date(whoisRecord.updatedDate as string) : undefined;

    // 计算域名年龄
    const domainAge = createdDate
      ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    const registrant = whoisRecord.registrant as Record<string, unknown> || {};

    // 检测隐私保护
    const privacyProtected = this.detectPrivacyProtection(whoisRecord);

    return {
      domain,
      registrar: whoisRecord.registrarName as string,
      createdDate,
      expiryDate,
      updatedDate,
      registrant: {
        name: registrant.name as string,
        organization: registrant.organization as string,
        country: registrant.country as string,
        email: registrant.email as string,
      },
      domainAge,
      privacyProtected,
    };
  }

  /**
   * 通过公开源查询（免费Whois）
   */
  private async queryViaPublic(domain: string, timeout: number): Promise<IdentityLayerResult['whois']> {
    // 使用公开Whois查询服务
    const publicApiUrl = `https://api.ip2whois.com/v2?key=demo&domain=${domain}`;

    try {
      const response = await fetch(publicApiUrl, {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        // 返回基本信息
        return { domain };
      }

      const data = await response.json();
      return this.parsePublicWhois(data, domain);
    } catch {
      return { domain };
    }
  }

  /**
   * 解析公开Whois响应
   */
  private parsePublicWhois(data: Record<string, unknown>, domain: string): IdentityLayerResult['whois'] {
    const createdDate = data.create_date ? new Date(data.create_date as string) : undefined;
    const expiryDate = data.expire_date ? new Date(data.expire_date as string) : undefined;
    const updatedDate = data.update_date ? new Date(data.update_date as string) : undefined;

    const domainAge = createdDate
      ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      domain,
      registrar: data.registrar as string,
      createdDate,
      expiryDate,
      updatedDate,
      registrant: {
        name: data.registrant_name as string,
        organization: data.registrant_organization as string,
        country: data.registrant_country as string,
        email: data.registrant_email as string,
      },
      domainAge,
      privacyProtected: Boolean(data.privacy),
    };
  }

  /**
   * 检测隐私保护
   */
  private detectPrivacyProtection(whoisRecord: Record<string, unknown>): boolean {
    const privacyKeywords = [
      'privacy',
      'private',
      'protected',
      'proxy',
      'guard',
      'shield',
      'domains by proxy',
      'whois privacy',
    ];

    const registrant = whoisRecord.registrant as Record<string, unknown> || {};
    const organization = (registrant.organization as string || '').toLowerCase();
    const name = (registrant.name as string || '').toLowerCase();

    return privacyKeywords.some(keyword =>
      organization.includes(keyword) || name.includes(keyword)
    );
  }

  async searchCompany(): Promise<never[]> {
    throw new Error('WhoisAdapter requires known domain');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<OSINTHealthCheckResult> {
    if (this.apiKey) {
      try {
        const start = Date.now();
        await fetch(`https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${this.apiKey}&domainName=example.com&outputFormat=JSON`);
        return { healthy: true, latency: Date.now() - start };
      } catch (error) {
        return { healthy: false, latency: 0, error: String(error) };
      }
    }
    return { healthy: true, latency: 0, message: 'Using public fallback' };
  }
}

// ==================== LinkedIn企业搜索适配器 ====================

/**
 * LinkedIn企业搜索数据源
 * 搜索LinkedIn公司主页，获取员工规模、行业信息
 */
class LinkedInCompanyAdapter implements OSINTSourceAdapter {
  readonly code = 'linkedin_company';
  readonly name = 'LinkedIn企业搜索';
  readonly layer: OSINTLayer = 'IDENTITY';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: false,
    supportsRiskQuery: false,
    maxResultsPerQuery: 10,
  };

  private config: OSINTSourceConfig | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 搜索LinkedIn公司主页
   */
  async searchLinkedInCompany(companyName: string): Promise<IdentityLayerResult['linkedin']> {
    const timeout = this.config?.timeout || 15000;

    try {
      // 使用搜索引擎搜索LinkedIn公司页
      const searchQuery = `${companyName} site:linkedin.com/company`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
        },
      });

      if (!response.ok) {
        return { companyName };
      }

      const html = await response.text();
      return this.parseLinkedInSearchResult(html, companyName);
    } catch (error) {
      console.warn('[LinkedInAdapter] Search failed:', String(error));
      return { companyName };
    }
  }

  /**
   * 解析LinkedIn搜索结果
   */
  private parseLinkedInSearchResult(html: string, companyName: string): IdentityLayerResult['linkedin'] {
    // 提取LinkedIn URL
    const linkedinPattern = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+/gi;
    const linkedinUrls = html.match(linkedinPattern) || [];

    const url = linkedinUrls[0];

    // 提取搜索结果中的基本信息
    const resultPattern = new RegExp(
      `${companyName}\\s*[^<]*?(?:\\d+[,.]?\\d*\\s*(?:employees|staff|people))?`,
      'i'
    );
    const resultMatch = html.match(resultPattern);

    // 尝试提取员工数量
    const employeePattern = /(\d+[,.]?\d*)\s*(employees|staff|people|connections)/i;
    const employeeMatch = html.match(employeePattern);

    // 提取行业
    const industryPattern = /industry:\s*([^,\n]+)/i;
    const industryMatch = html.match(industryPattern);

    return {
      url,
      companyName,
      employeeCount: employeeMatch?.[1]?.replace(',', ''),
      industry: industryMatch?.[1]?.trim(),
      verified: Boolean(url),
    };
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    // LinkedIn适配器通过searchLinkedInCompany方法工作
    throw new Error('Use searchLinkedInCompany method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<OSINTHealthCheckResult> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 身份层聚合器 ====================

/**
 * 身份层聚合器
 * 整合官网验证、Whois查询、LinkedIn搜索
 */
class IdentityLayerAggregator {
  private websiteAdapter = new WebsiteVerificationAdapter();
  private whoisAdapter = new WhoisAdapter();
  private linkedinAdapter = new LinkedInCompanyAdapter();

  initialize(configs: Record<string, OSINTSourceConfig>): void {
    if (configs.website_verify) {
      this.websiteAdapter.initialize(configs.website_verify);
    }
    if (configs.whois) {
      this.whoisAdapter.initialize(configs.whois);
    }
    if (configs.linkedin_company) {
      this.linkedinAdapter.initialize(configs.linkedin_company);
    }
  }

  /**
   * 执行身份层调查
   */
  async investigate(query: CompanyInvestigationQuery): Promise<IdentityLayerResult> {
    const results: IdentityLayerResult = {
      sourceReliability: 'PUBLIC',
    };

    const options = query.options || {};

    // 1. 官网验证（如果有域名）
    if (query.domain && options.scrapeWebsite !== false) {
      results.website = await this.websiteAdapter.scrapeWebsite(query.domain);
    }

    // 2. Whois查询（如果有域名）
    if (query.domain && options.checkWhois !== false) {
      results.whois = await this.whoisAdapter.queryWhois(query.domain);
    }

    // 3. LinkedIn搜索
    if (options.checkLinkedIn !== false) {
      results.linkedin = await this.linkedinAdapter.searchLinkedInCompany(query.companyName);
    }

    // 确定数据可靠性
    const hasOfficialData = results.website?.status === 'ACTIVE' || results.linkedin?.verified;
    results.sourceReliability = hasOfficialData ? 'PUBLIC' : 'INFERRED';

    return results;
  }

  /**
   * 健康检查所有适配器
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    const websiteHealth = await this.websiteAdapter.healthCheck();
    results.website_verify = websiteHealth;

    const whoisHealth = await this.whoisAdapter.healthCheck();
    results.whois = whoisHealth;

    const linkedinHealth = await this.linkedinAdapter.healthCheck();
    results.linkedin_company = linkedinHealth;

    return results;
  }
}

// 导出所有适配器
export {
  WebsiteVerificationAdapter,
  WhoisAdapter,
  LinkedInCompanyAdapter,
  IdentityLayerAggregator,
};
