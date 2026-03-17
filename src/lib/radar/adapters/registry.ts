// ==================== Radar Adapter Registry ====================
// 适配器注册表和工厂

import type { 
  RadarAdapter, 
  AdapterConfig, 
  AdapterFactory, 
  AdapterRegistration 
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
        apiEndpoint: 'https://www.ungm.org/api',
        timeout: 30000,
      },
      storagePolicy: 'TTL_CACHE',
      ttlDays: 90,
      attributionRequired: true,
      isOfficial: true,
      websiteUrl: 'https://www.ungm.org',
      termsUrl: 'https://www.ungm.org/Public/Pages/TermsOfUse',
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
        apiEndpoint: 'https://ted.europa.eu/api/v3.0',
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
    },
    (config) => new EmergingMarketsAdapter(config)
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
  // 后续扩展
  CSV_IMPORT: 'csv_import',
} as const;

export type AdapterCode = typeof ADAPTER_CODES[keyof typeof ADAPTER_CODES];
