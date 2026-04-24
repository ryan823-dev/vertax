// ==================== 注册层数据源适配器 ====================
// 各国工商注册数据库集成

import type {
  OSINTSourceAdapter,
  OSINTSourceConfig,
  OSINTLayer,
  CompanyInvestigationQuery,
  CompanyRegistration,
  RegistrationLayerResult,
} from '../types';

// ==================== 工商数据库配置 ====================

/**
 * 各国工商数据库配置
 */
export const BUSINESS_REGISTRY_CONFIGS: Record<string, {
  name: string;
  apiUrl: string;
  officialApi: boolean;
  docUrl: string;
  requiresApiKey: boolean;
}> = {
  // 美国
  us: {
    name: 'OpenCorporates',
    apiUrl: 'https://api.opencorporates.com',
    officialApi: true,
    docUrl: 'https://api.opencorporates.com/documentation/API_reference',
    requiresApiKey: true,
  },
  // 英国
  gb: {
    name: 'Companies House',
    apiUrl: 'https://api.company-information.service.gov.uk',
    officialApi: true,
    docUrl: 'https://developer.company-information.service.gov.uk/api/docs',
    requiresApiKey: true,
  },
  // 德国
  de: {
    name: 'German Trade Register',
    apiUrl: 'https://www.unternehmensregister.de',
    officialApi: false,
    docUrl: 'https://www.unternehmensregister.de',
    requiresApiKey: false,
  },
  // 法国
  fr: {
    name: 'INPI - Registre National des Entreprises',
    apiUrl: 'https://data.inpi.fr',
    officialApi: true,
    docUrl: 'https://data.inpi.fr',
    requiresApiKey: true,
  },
  // 日本
  jp: {
    name: 'National Tax Agency - Corporate Number System',
    apiUrl: 'https://www.houjin-kigyou.com',
    officialApi: false,
    docUrl: 'https://www.houjin-kigyou.com',
    requiresApiKey: false,
  },
  // 香港
  hk: {
    name: 'Companies Registry',
    apiUrl: 'https://www.icris.cr.gov.hk',
    officialApi: false,
    docUrl: 'https://www.icris.cr.gov.hk',
    requiresApiKey: false,
  },
  // 欧盟通用
  eu: {
    name: 'European Business Register',
    apiUrl: 'https://www.ebr.org',
    officialApi: true,
    docUrl: 'https://www.ebr.org',
    requiresApiKey: true,
  },
};

// ==================== OpenCorporates适配器 ====================

/**
 * OpenCorporates适配器
 * 全球企业注册数据库，覆盖140+国家
 */
class OpenCorporatesAdapter implements OSINTSourceAdapter {
  readonly code = 'opencorporates';
  readonly name = 'OpenCorporates';
  readonly layer: OSINTLayer = 'REGISTRATION';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: true,
    supportsRiskQuery: false,
    maxResultsPerQuery: 30,
  };

  private config: OSINTSourceConfig | null = null;
  private apiKey: string | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
    this.apiKey = process.env.OPENCORPORATES_API_KEY || config.apiKey || null;
  }

  /**
   * 搜索企业
   */
  async searchCompany(query: CompanyInvestigationQuery): Promise<CompanyRegistration[]> {
    const timeout = this.config?.timeout || 15000;
    const apiUrl = 'https://api.opencorporates.com/v0.4/companies/search';

    const params = new URLSearchParams();
    params.set('q', query.companyName);
    if (query.country) {
      params.set('jurisdiction_code', query.country.toLowerCase());
    }
    if (this.apiKey) {
      params.set('api_token', this.apiKey);
    }
    params.set('per_page', '30');

    try {
      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        console.warn('[OpenCorporates] API error:', response.status);
        return [];
      }

      const data = await response.json();
      return this.parseSearchResults(data);
    } catch (error) {
      console.warn('[OpenCorporates] Search failed:', String(error));
      return [];
    }
  }

  /**
   * 解析搜索结果
   */
  private parseSearchResults(data: Record<string, unknown>): CompanyRegistration[] {
    const results = data.results as
      | {
          companies?: Array<Record<string, unknown>>;
        }
      | undefined;
    const companies = results?.companies ?? [];

    return companies.map(c => {
      const company = c.company as Record<string, unknown>;
      return this.normalizeCompany(company);
    });
  }

  /**
   * 标准化企业数据
   */
  private normalizeCompany(company: Record<string, unknown>): CompanyRegistration {
    return {
      registrationNumber: company.company_number as string || '',
      country: company.jurisdiction_code as string || '',
      registry: company.registry_url as string,
      legalName: company.name as string || '',
      status: this.mapCompanyStatus(company.current_status as string),
      incorporationDate: company.incorporation_date ? new Date(company.incorporation_date as string) : undefined,
      dissolutionDate: company.dissolution_date ? new Date(company.dissolution_date as string) : undefined,
      registeredAddress: company.registered_address as string,
      entityType: company.company_type as string,
      dataSource: 'opencorporates',
    };
  }

  /**
   * 映射企业状态
   */
  private mapCompanyStatus(status?: string): 'ACTIVE' | 'DISSOLVED' | 'SUSPENDED' | 'LIQUIDATION' | 'UNKNOWN' {
    if (!status) return 'UNKNOWN';

    const statusMap: Record<string, 'ACTIVE' | 'DISSOLVED' | 'SUSPENDED' | 'LIQUIDATION' | 'UNKNOWN'> = {
      'Active': 'ACTIVE',
      'Dissolved': 'DISSOLVED',
      'Liquidation': 'LIQUIDATION',
      'Suspended': 'SUSPENDED',
      'Live': 'ACTIVE',
      'Closed': 'DISSOLVED',
    };

    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * 获取企业详情
   */
  async getCompanyDetail(registrationNumber: string, country: string): Promise<CompanyRegistration | null> {
    const timeout = this.config?.timeout || 15000;
    const apiUrl = `https://api.opencorporates.com/v0.4/companies/${country.toLowerCase()}/${registrationNumber}`;

    const params = new URLSearchParams();
    if (this.apiKey) {
      params.set('api_token', this.apiKey);
    }

    try {
      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const results = data.results as
        | {
            company?: {
              company?: Record<string, unknown>;
            };
          }
        | undefined;
      const company = results?.company?.company;

      if (!company) return null;

      const registration = this.normalizeCompany(company);

      // 添加股东和高管信息
      const officers = (company.officers as Array<Record<string, unknown>>) || [];
      registration.officers = officers.map((officerRecord) => {
        const officer = officerRecord.officer as Record<string, unknown> | undefined;

        return {
          name: (officer?.name as string) || '',
          position: (officer?.position as string) || '',
          appointedDate: officer?.start_date ? new Date(officer.start_date as string) : undefined,
          resignedDate: officer?.end_date ? new Date(officer.end_date as string) : undefined,
        };
      });

      return registration;
    } catch (error) {
      console.warn('[OpenCorporates] Detail query failed:', String(error));
      return null;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.opencorporates.com/v0.4/companies/search?q=test&per_page=1');
      return {
        healthy: response.ok,
        latency: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return { healthy: false, latency: Date.now() - start, error: String(error) };
    }
  }
}

// ==================== 英国Companies House适配器 ====================

/**
 * 英国Companies House适配器
 * 英国官方企业注册数据库
 */
class CompaniesHouseAdapter implements OSINTSourceAdapter {
  readonly code = 'companies_house';
  readonly name = 'Companies House (英国)';
  readonly layer: OSINTLayer = 'REGISTRATION';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: true,
    supportsRiskQuery: false,
    maxResultsPerQuery: 50,
  };

  private config: OSINTSourceConfig | null = null;
  private apiKey: string | null = null;
  private baseUrl = 'https://api.company-information.service.gov.uk';

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
    this.apiKey = process.env.COMPANIES_HOUSE_API_KEY || config.apiKey || null;
  }

  /**
   * 搜索企业
   */
  async searchCompany(query: CompanyInvestigationQuery): Promise<CompanyRegistration[]> {
    if (!this.apiKey) {
      console.warn('[CompaniesHouse] No API key configured');
      return [];
    }

    const timeout = this.config?.timeout || 15000;

    try {
      const response = await fetch(
        `${this.baseUrl}/search/companies?q=${encodeURIComponent(query.companyName)}`,
        {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.parseSearchResults(data);
    } catch (error) {
      console.warn('[CompaniesHouse] Search failed:', String(error));
      return [];
    }
  }

  /**
   * 解析搜索结果
   */
  private parseSearchResults(data: Record<string, unknown>): CompanyRegistration[] {
    const items = (data.items as Array<Record<string, unknown>>) || [];

    return items.map(item => ({
      registrationNumber: item.company_number as string || '',
      country: 'GB',
      registry: 'Companies House',
      legalName: item.title as string || '',
      status: this.mapStatus(item.company_status as string),
      registeredAddress: item.address_snippet as string,
      entityType: item.company_type as string,
      dataSource: 'companies_house',
    }));
  }

  /**
   * 映射企业状态
   */
  private mapStatus(status?: string): 'ACTIVE' | 'DISSOLVED' | 'SUSPENDED' | 'LIQUIDATION' | 'UNKNOWN' {
    const statusMap: Record<string, 'ACTIVE' | 'DISSOLVED' | 'SUSPENDED' | 'LIQUIDATION' | 'UNKNOWN'> = {
      'active': 'ACTIVE',
      'dissolved': 'DISSOLVED',
      'liquidation': 'LIQUIDATION',
      'administration': 'SUSPENDED',
      'voluntary-arrangement': 'SUSPENDED',
      'insolvency-proceedings': 'SUSPENDED',
      'receivership': 'SUSPENDED',
    };

    return statusMap[status || ''] || 'UNKNOWN';
  }

  /**
   * 获取企业详情（含股东和高管）
   */
  async getCompanyDetail(registrationNumber: string, _country: string): Promise<CompanyRegistration | null> {
    if (!this.apiKey) return null;

    const timeout = this.config?.timeout || 15000;

    try {
      // 获取基本信息
      const companyResponse = await fetch(
        `${this.baseUrl}/company/${registrationNumber}`,
        {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      if (!companyResponse.ok) return null;

      const companyData = await companyResponse.json();

      // 获取股东信息
      const shareholdersResponse = await fetch(
        `${this.baseUrl}/company/${registrationNumber}/persons-with-significant-control`,
        {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      let shareholders: Array<{ name: string; shareholding?: number; type: 'INDIVIDUAL' | 'CORPORATE' | 'UNKNOWN' }> = [];
      if (shareholdersResponse.ok) {
        const pscData = await shareholdersResponse.json();
        const pscItems = (pscData.items as Array<Record<string, unknown>>) || [];
        shareholders = pscItems.map((psc) => {
          const naturesOfControl = Array.isArray(psc.natures_of_control)
            ? psc.natures_of_control
            : [];

          return {
            name: (psc.name as string) || '',
            shareholding: naturesOfControl.includes('ownership-of-shares-75-to-100-percent') ? 75 : undefined,
            type: psc.kind === 'individual-person-with-significant-control' ? 'INDIVIDUAL' as const : 'CORPORATE' as const,
          };
        });
      }

      // 获取高管信息
      const officersResponse = await fetch(
        `${this.baseUrl}/company/${registrationNumber}/officers`,
        {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      let officers: Array<{ name: string; position: string; appointedDate?: Date; resignedDate?: Date }> = [];
      if (officersResponse.ok) {
        const officersData = await officersResponse.json();
        const officerItems = (officersData.items as Array<Record<string, unknown>>) || [];
        officers = officerItems.map(off => ({
          name: off.name as string || '',
          position: off.officer_role as string || '',
          appointedDate: off.appointed_on ? new Date(off.appointed_on as string) : undefined,
          resignedDate: off.resigned_on ? new Date(off.resigned_on as string) : undefined,
        }));
      }

      return {
        registrationNumber,
        country: 'GB',
        registry: 'Companies House',
        legalName: companyData.company_name as string || '',
        registeredAddress: companyData.registered_office_address?.address_line_1
          ? `${companyData.registered_office_address.address_line_1}, ${companyData.registered_office_address.locality}, ${companyData.registered_office_address.postal_code}`
          : undefined,
        incorporationDate: companyData.date_of_creation ? new Date(companyData.date_of_creation as string) : undefined,
        dissolutionDate: companyData.date_of_cessation ? new Date(companyData.date_of_cessation as string) : undefined,
        entityType: companyData.type as string,
        status: this.mapStatus(companyData.company_status as string),
        shareholders,
        officers,
        dataSource: 'companies_house',
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.warn('[CompaniesHouse] Detail query failed:', String(error));
      return null;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    if (!this.apiKey) {
      return { healthy: false, latency: 0, error: 'No API key configured' };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/search/companies?q=test`, {
        headers: { 'Authorization': `Basic ${this.apiKey}` },
      });
      return {
        healthy: response.ok,
        latency: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return { healthy: false, latency: Date.now() - start, error: String(error) };
    }
  }
}

// ==================== 注册层聚合器 ====================

/**
 * 注册层聚合器
 * 根据企业所在国家选择合适的工商数据库
 */
class RegistrationLayerAggregator {
  private adapters: Record<string, OSINTSourceAdapter> = {};
  private defaultAdapter: OpenCorporatesAdapter;

  constructor() {
    this.defaultAdapter = new OpenCorporatesAdapter();
  }

  initialize(configs: Record<string, OSINTSourceConfig>): void {
    // 初始化默认适配器
    this.defaultAdapter.initialize(configs.opencorporates || {
      code: 'opencorporates',
      name: 'OpenCorporates',
      layer: 'REGISTRATION',
      reliability: 'OFFICIAL',
      coveredCountries: ['*'],
      requiresApiKey: true,
      timeout: 15000,
      rateLimit: { requests: 30, windowMs: 60000 },
    });

    // 初始化各国专用适配器
    this.adapters.gb = new CompaniesHouseAdapter();
    this.adapters.gb.initialize(configs.companies_house || {
      code: 'companies_house',
      name: 'Companies House',
      layer: 'REGISTRATION',
      reliability: 'OFFICIAL',
      coveredCountries: ['GB'],
      requiresApiKey: true,
      timeout: 15000,
      rateLimit: { requests: 100, windowMs: 60000 },
    });

  }

  /**
   * 执行注册层调查
   */
  async investigate(query: CompanyInvestigationQuery): Promise<RegistrationLayerResult> {
    // 选择适配器
    const adapter = this.selectAdapter(query.country);

    // 搜索企业
    const searchResults = await adapter.searchCompany(query);

    if (searchResults.length === 0) {
      // 尝试默认适配器
      const defaultResults = await this.defaultAdapter.searchCompany(query);
      if (defaultResults.length === 0) {
        return {
          primary: {
            registrationNumber: '',
            country: query.country || '',
            legalName: query.companyName,
            dataSource: 'none',
            status: 'UNKNOWN',
          },
          sources: [],
          reliability: 'INFERRED',
        };
      }

      return {
        primary: defaultResults[0],
        secondary: defaultResults.slice(1),
        sources: ['opencorporates'],
        reliability: 'OFFICIAL',
      };
    }

    // 获取详细信息
    const primary = searchResults[0];
    const detail = await adapter.getCompanyDetail(primary.registrationNumber, primary.country);

    const result: RegistrationLayerResult = {
      primary: detail || primary,
      secondary: searchResults.slice(1),
      sources: [adapter.code],
      reliability: 'OFFICIAL',
    };

    return result;
  }

  /**
   * 选择适配器
   */
  private selectAdapter(country?: string): OSINTSourceAdapter {
    if (!country) return this.defaultAdapter;

    const countryCode = country.toLowerCase();

    if (this.adapters[countryCode]) {
      return this.adapters[countryCode];
    }

    return this.defaultAdapter;
  }

  /**
   * 健康检查所有适配器
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    const defaultHealth = await this.defaultAdapter.healthCheck();
    results.opencorporates = defaultHealth;

    for (const [code, adapter] of Object.entries(this.adapters)) {
      const health = await adapter.healthCheck();
      results[code] = health;
    }

    return results;
  }
}

// 导出所有适配器
export {
  OpenCorporatesAdapter,
  CompaniesHouseAdapter,
  RegistrationLayerAggregator,
};
