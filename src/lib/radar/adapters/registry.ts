// ==================== Radar Adapter Registry ====================
// 适配器注册表和工厂

import type { 
  RadarAdapter, 
  AdapterConfig, 
  AdapterFactory, 
  AdapterRegistration,
  SourceReliability
} from './types';
import { UNGMAdapter } from './ungm';
import { TEDAdapter } from './ted';
import { AISearchAdapter } from './ai-search';
import { GooglePlacesAdapter } from './google-places';
import { BraveSearchAdapter } from './brave-search';
import { GenericFeedAdapter } from './generic-feed';
import { SAMGovAdapter } from './sam-gov';
import { HiringSignalAdapter } from './hiring-signal';
import { TradeDataAdapter } from './trade-data';
import { TradeShowAdapter } from './trade-show';
import { DevelopmentBankAdapter } from './development-bank';
import { EmergingMarketsAdapter } from './emerging-markets';
import { HunterAdapter } from './hunter';
import { PeopleDataLabsAdapter } from './pdl';
import { TavilyAdapter } from './tavily';
import { ExaAdapter } from './exa';
import { ICPMatchingAdapter } from './icp-matching';
import { GoogleAlertsAdapter } from './google-alerts';
import { MultiSourceSearchAdapter } from './multi-search';
import { BatchDiscoveryAdapter } from './batch-discovery';
import { CompetitiveDiscoveryAdapter, CompetitiveDiscoveryRegistration } from './competitive-discovery';
import { ApolloOrganizationSearchAdapter, ApolloPeopleSearchAdapter } from './apollo-search';

// ==================== 数据源可靠性定义 ====================

/**
 * 每个数据源的可靠性信息
 * 用于向用户透明展示数据质量
 */
const SOURCE_RELIABILITY: Record<string, SourceReliability> = {
  // === 官方API（高可靠性）===
  ungm: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'OAuth2 Client Credentials',
    updateFrequency: 'DAILY',
    coverageNote: '覆盖所有联合国机构采购公告',
    limitations: ['需要注册开发者账号获取认证信息'],
    docUrl: 'https://developer.ungm.org/',
  },
  ted: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: false,
    updateFrequency: 'DAILY',
    coverageNote: '覆盖欧盟27国政府采购公告',
    limitations: ['搜索API无需认证，但提交公告需要认证'],
    docUrl: 'https://docs.ted.europa.eu/api/latest/index.html',
  },
  sam_gov: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'DAILY',
    coverageNote: '覆盖美国联邦政府采购公告',
    limitations: ['需要API Key，免费但有请求限制'],
    docUrl: 'https://open.gsa.gov/api/sam-gov-api/',
  },
  google_places: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球企业信息',
    limitations: ['需要Google Cloud API Key，有费用'],
    docUrl: 'https://developers.google.com/maps/documentation/places',
  },
  
  // === 公开数据（中高可靠性）===
  generic_feed: {
    dataType: 'PUBLIC_DATA',
    qualityLevel: 'MEDIUM',
    requiresAuth: false,
    updateFrequency: 'UNKNOWN',
    coverageNote: '取决于配置的RSS/JSON源',
    limitations: ['数据质量取决于源网站'],
  },
  
  // === AI推断（低可靠性，需要人工验证）===
  ai_search: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: '搜索引擎API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球范围，但结果需要验证',
    limitations: ['AI可能产生幻觉', '搜索结果可能不相关', '需要人工验证'],
  },
  brave_search: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: 'Brave Search API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球范围',
    limitations: ['搜索结果需要人工验证', 'AI分析可能不准确'],
  },
  hiring_signal: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: '搜索引擎API Key',
    updateFrequency: 'DAILY',
    coverageNote: '全球招聘平台',
    limitations: ['招聘信息不等于购买意向', '需要进一步验证'],
  },
  trade_data: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: '搜索引擎API Key',
    updateFrequency: 'UNKNOWN',
    coverageNote: '公开海关数据源',
    limitations: ['免费海关数据有限', '数据可能过时', '需要验证进口商信息'],
  },
  trade_show: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: '搜索引擎API Key',
    updateFrequency: 'WEEKLY',
    coverageNote: '全球展会参展商',
    limitations: ['参展商信息可能不完整', '需要验证联系方式'],
  },
  dev_bank: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: '搜索引擎API Key',
    updateFrequency: 'DAILY',
    coverageNote: '世界银行、非洲开发银行等',
    limitations: ['非官方API', '项目信息可能不完整', '需要验证采购机会'],
  },
  emerging_markets: {
    dataType: 'AI_INFERRED',
    qualityLevel: 'UNSTABLE',
    requiresAuth: true,
    authMethod: '搜索引擎API Key',
    updateFrequency: 'UNKNOWN',
    coverageNote: '中东、非洲、拉美、东欧采购平台',
    limitations: ['非官方API', '多语言网站可能解析错误', '需要人工验证'],
  },
  // === 联系人丰富化API ===
  hunter: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球企业邮箱查找和验证',
    limitations: ['免费额度: 25次/月', '仅限邮箱相关数据'],
    docUrl: 'https://hunter.io/api-documentation',
  },
  pdl: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'DAILY',
    coverageNote: '全球联系人和公司数据',
    limitations: ['按查询次数计费', '需要合理使用'],
    docUrl: 'https://docs.peopledatalabs.com/',
  },
  // === AI 搜索 API ===
  tavily: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: 'AI原生搜索，专为RAG和Agent设计',
    limitations: ['免费额度: 1000次/月', '最多10条结果/次'],
    docUrl: 'https://docs.tavily.com/',
  },
  exa: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '神经语义搜索，理解意图而非关键词',
    limitations: ['免费额度: 1000次/月', '最便宜的搜索API'],
    docUrl: 'https://docs.exa.ai/',
  },
  // === Apollo B2B 数据库 ===
  apollo_org_search: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球3000万+公司画像，结构化行业/规模/营收数据',
    limitations: ['按信用点计费', '每页最多100条', '最多500页'],
    docUrl: 'https://docs.apollo.io/reference/organization-search',
  },
  apollo_people_search: {
    dataType: 'OFFICIAL_API',
    qualityLevel: 'HIGH',
    requiresAuth: true,
    authMethod: 'API Key',
    updateFrequency: 'REAL_TIME',
    coverageNote: '全球2.75亿+联系人，含职位/层级/部门',
    limitations: ['搜索不返回邮箱电话，需额外enrichment', '按信用点计费'],
    docUrl: 'https://docs.apollo.io/reference/people-api-search',
  },
};

// ==================== 适配器注册表 ====================

const adapterFactories = new Map<string, AdapterFactory>();
const adapterRegistrations = new Map<string, AdapterRegistration>();

// ==================== 注册函数 ====================

export function registerAdapter(
  registration: AdapterRegistration,
  factory: AdapterFactory
): void {
  adapterFactories.set(registration.code, factory);
  adapterRegistrations.set(registration.code, registration);
}

// ==================== 获取适配器 ====================

export function getAdapter(code: string, config?: AdapterConfig): RadarAdapter {
  const factory = adapterFactories.get(code);
  if (!factory) {
    throw new Error(`Adapter not found: ${code}`);
  }
  
  const registration = adapterRegistrations.get(code);
  const mergedConfig = {
    ...registration?.defaultConfig,
    ...config,
  };
  
  return factory(mergedConfig);
}

// ==================== 获取注册信息 ====================

export function getAdapterRegistration(code: string): AdapterRegistration | undefined {
  return adapterRegistrations.get(code);
}

export function listAdapterRegistrations(): AdapterRegistration[] {
  return Array.from(adapterRegistrations.values());
}

export function listAdaptersByChannel(channelType: string): AdapterRegistration[] {
  return listAdapterRegistrations().filter(r => r.channelType === channelType);
}

// ==================== 检查适配器是否存在 ====================

export function hasAdapter(code: string): boolean {
  return adapterFactories.has(code);
}

// ==================== 初始化内置适配器 ====================

let initialized = false;

export function ensureAdaptersInitialized(): void {
  if (initialized) return;
  
  // 注册 UNGM 适配器
  registerAdapter(
    {
      code: 'ungm',
      name: 'UNGM - 联合国采购',
      channelType: 'TENDER',
      adapterType: 'API',
      description: '联合国全球市场平台，覆盖联合国机构的采购公告',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: true,
        supportsRegionFilter: false,
        supportsPagination: true,
        supportsDetails: true,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        apiEndpoint: 'https://www.ungm.org',
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://www.ungm.org',
      termsUrl: 'https://www.ungm.org/Public/Pages/TermsOfUse',
      reliability: SOURCE_RELIABILITY.ungm,
    },
    (config) => new UNGMAdapter(config)
  );
  
  // 注册 TED 适配器
  registerAdapter(
    {
      code: 'ted',
      name: 'TED - 欧盟招标',
      channelType: 'TENDER',
      adapterType: 'API',
      description: '欧盟官方招标电子日报，覆盖欧盟27国政府采购',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: true,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 30, windowMs: 60000 },
      },
      defaultConfig: {
        apiEndpoint: 'https://api.ted.europa.eu',
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      countries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
      regions: ['EU'],
      websiteUrl: 'https://ted.europa.eu',
      termsUrl: 'https://ted.europa.eu/en/legal-notice',
      reliability: SOURCE_RELIABILITY.ted,
    },
    (config) => new TEDAdapter(config)
  );
  
  // 注册 AI 搜索适配器
  registerAdapter(
    {
      code: 'ai_search',
      name: 'AI 智能搜索',
      channelType: 'TENDER',
      adapterType: 'AI_SEARCH',
      description: '使用 AI + 搜索引擎发现全球招标公告，覆盖官方 API 未覆盖的地区',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: false,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 20,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: true,
      isOfficial: false,
      websiteUrl: undefined,
      reliability: SOURCE_RELIABILITY.ai_search,
    },
    (config) => new AISearchAdapter(config)
  );
  
  // 注册 Google Places 适配器
  registerAdapter(
    {
      code: 'google_places',
      name: 'Google Maps - 企业发现',
      channelType: 'MAPS',
      adapterType: 'API',
      description: '通过 Google Maps Places API 发现目标区域的潜在客户公司',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: true,
        maxResultsPerQuery: 60,
        rateLimit: { requests: 100, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://developers.google.com/maps/documentation/places',
      reliability: SOURCE_RELIABILITY.google_places,
    },
    (config) => new GooglePlacesAdapter(config)
  );
  
  // 注册 Brave Search 适配器
  registerAdapter(
    {
      code: 'brave_search',
      name: 'Brave Search - B2B 发现',
      channelType: 'DIRECTORY',
      adapterType: 'AI_SEARCH',
      description: '使用 Brave Search + AI 从互联网发现目标公司',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: false,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 30,
        rateLimit: { requests: 15, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 60,
      attributionRequired: false,
      isOfficial: false,
      websiteUrl: 'https://brave.com/search/api/',
      reliability: SOURCE_RELIABILITY.brave_search,
    },
    (config) => new BraveSearchAdapter(config)
  );
  
  // 注册 Generic Feed 适配器
  registerAdapter(
    {
      code: 'generic_feed',
      name: 'Generic Feed - RSS/JSON',
      channelType: 'TENDER',
      adapterType: 'RSS',
      description: 'RSS/JSON 通用 Feed 适配器，支持自定义字段映射',
      features: {
        supportsKeywordSearch: false,
        supportsCategoryFilter: false,
        supportsDateFilter: false,
        supportsRegionFilter: false,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 60,
      attributionRequired: true,
      isOfficial: false,
      websiteUrl: undefined,
      reliability: SOURCE_RELIABILITY.generic_feed,
    },
    (config) => new GenericFeedAdapter(config)
  );

  // ==================== 新增数据源 ====================

  // 注册 SAM.gov 适配器（美国政府采购）
  registerAdapter(
    {
      code: 'sam_gov',
      name: 'SAM.gov - 美国政府采购',
      channelType: 'TENDER',
      adapterType: 'API',
      description: '美国联邦政府采购招标平台，覆盖美国政府采购公告',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true, // NAICS codes
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: true,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 30, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      countries: ['US'],
      websiteUrl: 'https://sam.gov',
      reliability: SOURCE_RELIABILITY.sam_gov,
    },
    (config) => new SAMGovAdapter(config)
  );

  // 注册招聘信号适配器
  registerAdapter(
    {
      code: 'hiring_signal',
      name: '招聘信号 - 公司增长监测',
      channelType: 'HIRING',
      adapterType: 'AI_SEARCH',
      description: '通过招聘信息识别正在扩张的公司，招聘=增长=潜在需求',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true, // 职位类型
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 50,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: false,
      isOfficial: false,
      reliability: SOURCE_RELIABILITY.hiring_signal,
    },
    (config) => new HiringSignalAdapter(config)
  );

  // 注册海关贸易数据适配器
  registerAdapter(
    {
      code: 'trade_data',
      name: '海关贸易数据 - 进口商发现',
      channelType: 'ECOSYSTEM',
      adapterType: 'AI_SEARCH',
      description: '通过海关数据发现实际买家，进口商=已购买相关产品=高意向客户',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true, // HS codes
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 30,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: false,
      isOfficial: false,
      reliability: SOURCE_RELIABILITY.trade_data,
    },
    (config) => new TradeDataAdapter(config)
  );

  // 注册展会参展商适配器
  registerAdapter(
    {
      code: 'trade_show',
      name: '展会参展商 - 市场活跃客户',
      channelType: 'TRADESHOW',
      adapterType: 'AI_SEARCH',
      description: '获取行业展会参展商名单，参展商=有市场预算=高意向客户',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true, // 展会类型
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 50,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: false,
      isOfficial: false,
      reliability: SOURCE_RELIABILITY.trade_show,
    },
    (config) => new TradeShowAdapter(config)
  );

  // ==================== 新兴市场数据源 ====================

  // 注册国际开发银行适配器
  registerAdapter(
    {
      code: 'dev_bank',
      name: '国际开发银行 - 新兴市场项目',
      channelType: 'TENDER',
      adapterType: 'AI_SEARCH',
      description: '世界银行、非洲开发银行等机构的项目，覆盖中东、非洲、拉美、东欧',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true, // 行业/部门
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 50,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: false,
      isOfficial: false,
      regions: ['MENA', 'AFRICA', 'LATAM', 'ECA', 'ASIA'],
      reliability: SOURCE_RELIABILITY.dev_bank,
    },
    (config) => new DevelopmentBankAdapter(config)
  );

  // 注册新兴市场采购平台适配器
  registerAdapter(
    {
      code: 'emerging_markets',
      name: '新兴市场采购平台',
      channelType: 'TENDER',
      adapterType: 'AI_SEARCH',
      description: '中东、非洲、拉美、东欧本地采购平台，覆盖 40+ 国家',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 50,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 60,
      attributionRequired: false,
      isOfficial: false,
      regions: ['MENA', 'AFRICA', 'LATAM', 'ECA'],
      reliability: SOURCE_RELIABILITY.emerging_markets,
    },
    (config) => new EmergingMarketsAdapter(config)
  );

  // ==================== 联系人丰富化数据源 ====================

  // 注册 Hunter.io 适配器
  registerAdapter(
    {
      code: 'hunter',
      name: 'Hunter.io - 邮箱查找验证',
      channelType: 'DIRECTORY',
      adapterType: 'API',
      description: '根据域名查找公司邮箱格式，验证邮箱有效性',
      features: {
        supportsKeywordSearch: false,
        supportsCategoryFilter: false,
        supportsDateFilter: false,
        supportsRegionFilter: false,
        supportsPagination: true,
        supportsDetails: true,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 25, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://hunter.io',
      termsUrl: 'https://hunter.io/terms',
      reliability: SOURCE_RELIABILITY.hunter,
    },
    (config) => new HunterAdapter(config)
  );

  // 注册 People Data Labs 适配器
  registerAdapter(
    {
      code: 'pdl',
      name: 'People Data Labs - 联系人丰富化',
      channelType: 'DIRECTORY',
      adapterType: 'API',
      description: '全球联系人和公司数据丰富化，查找决策者',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: true,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://www.peopledatalabs.com',
      termsUrl: 'https://www.peopledatalabs.com/terms',
      reliability: SOURCE_RELIABILITY.pdl,
    },
    (config) => new PeopleDataLabsAdapter(config)
  );

  // ==================== AI 搜索 API ====================

  // 注册 Tavily 适配器
  registerAdapter(
    {
      code: 'tavily',
      name: 'Tavily - AI原生搜索',
      channelType: 'DIRECTORY',
      adapterType: 'API',
      description: 'AI原生搜索，专为RAG和Agent设计，自动评估来源可信度',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: false,
        supportsDateFilter: true,
        supportsRegionFilter: false,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 10,
        rateLimit: { requests: 100, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://tavily.com',
      termsUrl: 'https://tavily.com/terms',
      reliability: SOURCE_RELIABILITY.tavily,
    },
    (config) => new TavilyAdapter(config)
  );

  // 注册 Exa 适配器
  registerAdapter(
    {
      code: 'exa',
      name: 'Exa - 神经语义搜索',
      channelType: 'DIRECTORY',
      adapterType: 'API',
      description: '神经语义搜索，理解意图而非关键词匹配，适合"发现"类查询',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: true,
        supportsRegionFilter: false,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 100, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://exa.ai',
      termsUrl: 'https://exa.ai/terms',
      reliability: SOURCE_RELIABILITY.exa,
    },
    (config) => new ExaAdapter(config)
  );

  // 注册 ICP 匹配适配器
  registerAdapter(
    {
      code: 'icp_matching',
      name: 'ICP智能匹配',
      channelType: 'DIRECTORY',
      adapterType: 'AI_SEARCH',
      description: '基于AI的ICP画像匹配，自动分析目标客户特征并搜索匹配企业',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: true,
        maxResultsPerQuery: 50,
        rateLimit: { requests: 10, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: false,
      isOfficial: false,
      reliability: {
        dataType: 'AI_INFERRED',
        qualityLevel: 'UNSTABLE',
        requiresAuth: true,
        authMethod: 'AI API Key',
        updateFrequency: 'REAL_TIME',
        coverageNote: '全球范围，取决于ICP描述',
        limitations: ['AI可能产生幻觉', '需要验证匹配结果'],
      },
    },
    (config) => new ICPMatchingAdapter(config)
  );

  // 注册 Google Alerts 适配器
  registerAdapter(
    {
      code: 'google_alerts',
      name: 'Google Alerts监控',
      channelType: 'DIRECTORY',
      adapterType: 'AI_SEARCH',
      description: '监控竞争对手和行业动态，发现新进入市场的企业',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: false,
        supportsDateFilter: true,
        supportsRegionFilter: true,
        supportsPagination: false,
        supportsDetails: false,
        maxResultsPerQuery: 20,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 7,
      attributionRequired: false,
      isOfficial: false,
      reliability: {
        dataType: 'AI_INFERRED',
        qualityLevel: 'UNSTABLE',
        requiresAuth: true,
        authMethod: '搜索引擎API Key',
        updateFrequency: 'REAL_TIME',
        coverageNote: '全球范围',
        limitations: ['搜索结果需要人工验证'],
      },
    },
    (config) => new GoogleAlertsAdapter(config)
  );

  // 注册多源聚合搜索适配器
  registerAdapter(
    {
      code: 'multi_search',
      name: '多源聚合搜索',
      channelType: 'DIRECTORY',
      adapterType: 'AI_SEARCH',
      description: '同时调用多个搜索引擎（Brave + Exa + Tavily + Google Places），最大化发现覆盖面，去重后返回高质量结果',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: false,
        maxResultsPerQuery: 200,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 60000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 7,
      attributionRequired: false,
      isOfficial: false,
      reliability: {
        dataType: 'AI_INFERRED',
        qualityLevel: 'MEDIUM',
        requiresAuth: true,
        authMethod: '多个搜索API Key',
        updateFrequency: 'REAL_TIME',
        coverageNote: '全球范围，通过多源聚合扩大覆盖',
        limitations: ['需要配置多个API Key', '结果需要人工验证'],
      },
    },
    (config) => new MultiSourceSearchAdapter(config)
  );

  // 注册批量发现适配器
  registerAdapter(
    {
      code: 'batch_discovery',
      name: '批量智能发现',
      channelType: 'DIRECTORY',
      adapterType: 'AI_SEARCH',
      description: '跨所有数据源的大规模并行发现，自动扩展多语言关键词和区域覆盖，支持无限滚动发现模式',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: false,
        maxResultsPerQuery: 500,
        rateLimit: { requests: 3, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 120000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 7,
      attributionRequired: false,
      isOfficial: false,
      reliability: {
        dataType: 'AI_INFERRED',
        qualityLevel: 'MEDIUM',
        requiresAuth: true,
        authMethod: '多个搜索API Key',
        updateFrequency: 'REAL_TIME',
        coverageNote: '全球范围，跨所有适配器',
        limitations: ['执行时间较长', '结果需要人工验证'],
      },
    },
    (config) => new BatchDiscoveryAdapter(config)
  );

  // 注册竞品发现适配器
  registerAdapter(
    CompetitiveDiscoveryRegistration,
    (config) => new CompetitiveDiscoveryAdapter(config)
  );

  // ==================== Apollo B2B 数据库 ====================

  // 注册 Apollo Organization Search 适配器
  registerAdapter(
    {
      code: 'apollo_org_search',
      name: 'Apollo 公司搜索 - B2B数据库',
      channelType: 'DIRECTORY',
      adapterType: 'API',
      description: '通过Apollo结构化B2B数据库搜索目标公司，按行业/地区/规模精确过滤，数据质量远高于网页搜索',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: true,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: false,
        maxResultsPerQuery: 100,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: false,
      isOfficial: true,
      websiteUrl: 'https://www.apollo.io',
      reliability: SOURCE_RELIABILITY.apollo_org_search,
    },
    (config) => new ApolloOrganizationSearchAdapter(config)
  );

  // 注册 Apollo People Search 适配器
  registerAdapter(
    {
      code: 'apollo_people_search',
      name: 'Apollo 决策人搜索 - 联系人发现',
      channelType: 'DIRECTORY',
      adapterType: 'API',
      description: '按职位/层级/部门搜索目标公司的决策人，用于获取采购、运营、工程、管理层联系人',
      features: {
        supportsKeywordSearch: true,
        supportsCategoryFilter: false,
        supportsDateFilter: false,
        supportsRegionFilter: true,
        supportsPagination: true,
        supportsDetails: false,
        maxResultsPerQuery: 50,
        rateLimit: { requests: 5, windowMs: 60000 },
      },
      defaultConfig: {
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 30,
      attributionRequired: false,
      isOfficial: true,
      websiteUrl: 'https://www.apollo.io',
      reliability: SOURCE_RELIABILITY.apollo_people_search,
    },
    (config) => new ApolloPeopleSearchAdapter(config)
  );

  initialized = true;
}

// ==================== 适配器代码常量 ====================

export const ADAPTER_CODES = {
  UNGM: 'ungm',
  TED: 'ted',
  AI_SEARCH: 'ai_search',
  GOOGLE_PLACES: 'google_places',
  BRAVE_SEARCH: 'brave_search',
  GENERIC_FEED: 'generic_feed',
  // 新增数据源
  SAM_GOV: 'sam_gov',
  HIRING_SIGNAL: 'hiring_signal',
  TRADE_DATA: 'trade_data',
  TRADE_SHOW: 'trade_show',
  DEV_BANK: 'dev_bank',
  EMERGING_MARKETS: 'emerging_markets',
  // 联系人丰富化
  HUNTER: 'hunter',
  PDL: 'pdl',
  // AI 搜索
  TAVILY: 'tavily',
  EXA: 'exa',
  ICP_MATCHING: 'icp_matching',
  GOOGLE_ALERTS: 'google_alerts',
  MULTI_SEARCH: 'multi_search',
  BATCH_DISCOVERY: 'batch_discovery',
  // 竞品发现
  COMPETITIVE_DISCOVERY: 'competitive_discovery',
  // Apollo B2B 数据库
  APOLLO_ORG_SEARCH: 'apollo_org_search',
  APOLLO_PEOPLE_SEARCH: 'apollo_people_search',
  // 后续扩展
  CSV_IMPORT: 'csv_import',
} as const;

export type AdapterCode = typeof ADAPTER_CODES[keyof typeof ADAPTER_CODES];
