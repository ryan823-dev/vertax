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
  
  initialized = true;
}

// ==================== 适配器代码常量 ====================

export const ADAPTER_CODES = {
  UNGM: 'ungm',
  TED: 'ted',
  AI_SEARCH: 'ai_search',
  // 后续扩展
  SAM_GOV: 'sam_gov',
  GOOGLE_PLACES: 'google_places',
  CSV_IMPORT: 'csv_import',
} as const;

export type AdapterCode = typeof ADAPTER_CODES[keyof typeof ADAPTER_CODES];
