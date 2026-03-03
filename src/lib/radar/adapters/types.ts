// ==================== Radar Adapter Types ====================
// 统一的数据源适配器接口定义

import type { ChannelType, AdapterType, RadarStoragePolicy } from '@/generated/prisma/enums';

// ==================== 适配器能力 ====================

export interface AdapterFeatures {
  supportsKeywordSearch: boolean;
  supportsCategoryFilter: boolean;  // CPV/UNSPSC codes
  supportsDateFilter: boolean;
  supportsRegionFilter: boolean;
  supportsPagination: boolean;
  supportsDetails: boolean;  // 是否支持按需获取详情
  maxResultsPerQuery: number;
  rateLimit: { requests: number; windowMs: number };
}

// ==================== 搜索查询 ====================

export interface RadarSearchQuery {
  keywords?: string[];
  categories?: string[];  // CPV/UNSPSC codes
  countries?: string[];   // ISO codes
  regions?: string[];     // EU | LATAM | MENA | APAC
  publishedAfter?: Date;
  publishedBefore?: Date;
  deadlineAfter?: Date;
  deadlineBefore?: Date;
  page?: number;
  pageSize?: number;
  // AI 搜索专用
  targetIndustries?: string[];
  companyTypes?: string[];  // manufacturer | distributor | service_provider
  locationBias?: { lat: number; lng: number; radius: number };
}

// ==================== 搜索结果 ====================

export interface RadarSearchResult {
  items: NormalizedCandidate[];
  total: number;
  hasMore: boolean;
  nextPage?: number;
  metadata: {
    source: string;
    query: RadarSearchQuery;
    fetchedAt: Date;
    duration: number;
  };
}

// ==================== 标准化候选 ====================

export interface NormalizedCandidate {
  // 必须字段
  externalId: string;
  sourceUrl: string;
  displayName: string;
  candidateType: 'COMPANY' | 'OPPORTUNITY' | 'CONTACT';
  
  // 通用可选字段
  description?: string;
  
  // 公司字段
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  city?: string;
  industry?: string;
  companySize?: string;
  
  // 机会/招标字段
  deadline?: Date;
  estimatedValue?: number;
  currency?: string;
  buyerName?: string;
  buyerCountry?: string;
  buyerType?: 'government' | 'enterprise' | 'ngo' | 'international_org';
  categoryCode?: string;
  categoryName?: string;
  publishedAt?: Date;
  contactEmail?: string;
  
  // 联系人字段
  contactRole?: string;
  linkedCompanyExternalId?: string;
  
  // 匹配信息
  matchExplain?: {
    query?: string;
    channel?: string;
    reasons?: string[];
    matchedKeywords?: string[];
  };
  
  // 原始数据
  rawData?: Record<string, unknown>;
}

// ==================== 详情补全结果 ====================

export interface CandidateDetails {
  externalId: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  description?: string;
  additionalInfo?: Record<string, unknown>;
}

// ==================== 健康检查结果 ====================

export interface HealthStatus {
  healthy: boolean;
  latency: number;
  error?: string;
  lastCheckedAt?: Date;
}

// ==================== 适配器接口 ====================

export interface RadarAdapter {
  readonly sourceCode: string;
  readonly channelType: ChannelType;
  readonly supportedFeatures: AdapterFeatures;
  
  /**
   * 搜索候选
   */
  search(query: RadarSearchQuery): Promise<RadarSearchResult>;
  
  /**
   * 获取详情（可选，用于按需补全）
   */
  getDetails?(externalId: string): Promise<CandidateDetails | null>;
  
  /**
   * 标准化原始数据
   */
  normalize(raw: unknown): NormalizedCandidate;
  
  /**
   * 健康检查
   */
  healthCheck(): Promise<HealthStatus>;
}

// ==================== 适配器配置 ====================

export interface AdapterConfig {
  apiKey?: string;
  apiEndpoint?: string;
  fieldMapping?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

// ==================== 适配器注册信息 ====================

export interface AdapterRegistration {
  code: string;
  name: string;
  channelType: ChannelType;
  adapterType: AdapterType;
  description: string;
  features: AdapterFeatures;
  defaultConfig: AdapterConfig;
  storagePolicy: RadarStoragePolicy;
  ttlDays: number;
  attributionRequired: boolean;
  countries?: string[];
  regions?: string[];
  isOfficial: boolean;
  websiteUrl?: string;
  termsUrl?: string;
}

// ==================== 适配器工厂 ====================

export type AdapterFactory = (config: AdapterConfig) => RadarAdapter;
