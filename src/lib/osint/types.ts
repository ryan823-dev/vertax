// ==================== 企业背调OSINT类型定义 ====================
// 定义企业背调数据源、查询和结果的标准接口

// ==================== 数据源层级 ====================

/**
 * 数据源层级
 * - IDENTITY: 身份验证层（官网、Whois、LinkedIn）
 * - REGISTRATION: 法定注册层（企业注册数据库）
 * - ASSOCIATION: 关联穿透层（股权、高管关联）
 * - RISK: 风险扫描层（诉讼、执行、制裁）
 * - BUSINESS: 经营验证层（海关、招投标、新闻）
 */
export type OSINTLayer = 'IDENTITY' | 'REGISTRATION' | 'ASSOCIATION' | 'RISK' | 'BUSINESS';

/**
 * 数据源可靠性
 */
export type DataSourceReliability = 'OFFICIAL' | 'COMMERCIAL' | 'PUBLIC' | 'INFERRED';

/**
 * 数据源配置
 */
export interface OSINTSourceConfig {
  /** 数据源编码 */
  code: string;
  /** 数据源名称 */
  name: string;
  /** 数据源层级 */
  layer: OSINTLayer;
  /** 数据源可靠性 */
  reliability: DataSourceReliability;
  /** 覆盖国家（ISO代码） */
  coveredCountries: string[];
  /** 是否需要API Key */
  requiresApiKey: boolean;
  /** API Key */
  apiKey?: string;
  /** API端点 */
  apiEndpoint?: string;
  /** 请求超时（毫秒） */
  timeout: number;
  /** 速率限制 */
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  /** 官方文档URL */
  docUrl?: string;
}

// ==================== 查询定义 ====================

/**
 * 企业背调查询
 */
export interface CompanyInvestigationQuery {
  /** 目标企业名称 */
  companyName: string;
  /** 已知域名（可选） */
  domain?: string;
  /** 所在国家（ISO代码） */
  country?: string;
  /** 行业 */
  industry?: string;
  /** 调查深度 */
  depth: 'BASIC' | 'STANDARD' | 'DEEP';
  /** 要执行的层级 */
  layers?: OSINTLayer[];
  /** 自定义配置 */
  options?: {
    /** 是否抓取官网 */
    scrapeWebsite?: boolean;
    /** 是否查询Whois */
    checkWhois?: boolean;
    /** 是否查询LinkedIn */
    checkLinkedIn?: boolean;
    /** 是否查询股权穿透 */
    checkShareholders?: boolean;
    /** 是否查询风险信息 */
    checkRisk?: boolean;
    /** 是否查询经营信息 */
    checkBusiness?: boolean;
    /** 最大关联深度 */
    maxAssociationDepth?: number;
    /** 语言偏好 */
    language?: string;
  };
}

// ==================== 结果定义 ====================

/**
 * 身份层结果
 */
export interface IdentityLayerResult {
  /** 官网信息 */
  website?: {
    url: string;
    title?: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'REDIRECT' | 'SUSPICIOUS';
    sslValid?: boolean;
    technologies?: string[];
    contactInfo?: {
      emails?: string[];
      phones?: string[];
      addresses?: string[];
    };
  };
  /** Whois信息 */
  whois?: {
    domain: string;
    registrar?: string;
    createdDate?: Date;
    expiryDate?: Date;
    updatedDate?: Date;
    registrant?: {
      name?: string;
      organization?: string;
      country?: string;
      email?: string;
    };
    nameServers?: string[];
    /** 域名年龄（天） */
    domainAge?: number;
    /** Whois隐私保护 */
    privacyProtected?: boolean;
  };
  /** LinkedIn信息 */
  linkedin?: {
    url?: string;
    companyName: string;
    employeeCount?: string;
    industry?: string;
    headquarters?: string;
    founded?: string;
    specialties?: string[];
    verified?: boolean;
  };
  /** 数据源可靠性标注 */
  sourceReliability: DataSourceReliability;
}

/**
 * 企业注册信息
 */
export interface CompanyRegistration {
  /** 注册号 */
  registrationNumber: string;
  /** 注册国家 */
  country: string;
  /** 注册机构 */
  registry?: string;
  /** 企业法定名称 */
  legalName: string;
  /** 曾用名 */
  formerNames?: string[];
  /** 注册地址 */
  registeredAddress?: string;
  /** 经营地址 */
  tradingAddress?: string;
  /** 注册资本 */
  registeredCapital?: {
    amount: number;
    currency: string;
  };
  /** 实缴资本 */
  paidUpCapital?: {
    amount: number;
    currency: string;
  };
  /** 企业类型 */
  entityType?: string;
  /** 经营状态 */
  status?: 'ACTIVE' | 'DISSOLVED' | 'SUSPENDED' | 'LIQUIDATION' | 'UNKNOWN';
  /** 成立日期 */
  incorporationDate?: Date;
  /** 注册日期 */
  registrationDate?: Date;
  /** 注销日期 */
  dissolutionDate?: Date;
  /** 法定代表人 */
  legalRepresentative?: string;
  /** 经营范围 */
  businessScope?: string[];
  /** 股东信息 */
  shareholders?: Shareholder[];
  /** 高管信息 */
  officers?: Officer[];
  /** 数据来源 */
  dataSource: string;
  /** 数据更新日期 */
  lastUpdated?: Date;
}

/**
 * 股东信息
 */
export interface Shareholder {
  /** 股东名称 */
  name: string;
  /** 股东类型 */
  type: 'INDIVIDUAL' | 'CORPORATE' | 'GOVERNMENT' | 'UNKNOWN';
  /** 持股比例 */
  shareholding?: number;
  /** 认缴出资 */
  subscribedCapital?: {
    amount: number;
    currency: string;
  };
  /** 实缴出资 */
  paidCapital?: {
    amount: number;
    currency: string;
  };
  /** 关联企业 */
  relatedCompanies?: string[];
}

/**
 * 高管信息
 */
export interface Officer {
  /** 姓名 */
  name: string;
  /** 职位 */
  position: string;
  /** 任职日期 */
  appointedDate?: Date;
  /** 离任日期 */
  resignedDate?: Date;
  /** 国籍 */
  nationality?: string;
  /** 关联企业 */
  relatedCompanies?: string[];
}

/**
 * 注册层结果
 */
export interface RegistrationLayerResult {
  /** 主要注册信息 */
  primary: CompanyRegistration;
  /** 其他司法管辖区的注册信息 */
  secondary?: CompanyRegistration[];
  /** 数据来源 */
  sources: string[];
  /** 数据可靠性 */
  reliability: DataSourceReliability;
}

/**
 * 关联企业
 */
export interface AssociatedCompany {
  /** 企业名称 */
  name: string;
  /** 关系类型 */
  relationship: 'PARENT' | 'SUBSIDIARY' | 'SIBLING' | 'BRANCH' | 'INVESTEE' | 'INVESTOR';
  /** 关联程度 */
  shareholding?: number;
  /** 注册国家 */
  country?: string;
  /** 经营状态 */
  status?: 'ACTIVE' | 'DISSOLVED' | 'SUSPENDED' | 'UNKNOWN';
  /** 关联来源 */
  source: string;
}

/**
 * 最终受益人
 */
export interface UltimateBeneficialOwner {
  /** 姓名 */
  name: string;
  /** 持股比例 */
  shareholding: number;
  /** 控制方式 */
  controlType: 'DIRECT' | 'INDIRECT';
  /** 国籍 */
  nationality?: string;
  /** 居住国家 */
  residenceCountry?: string;
  /** 控制链 */
  controlChain?: string[];
  /** 数据来源 */
  source: string;
}

/**
 * 关联层结果
 */
export interface AssociationLayerResult {
  /** 关联企业 */
  associatedCompanies: AssociatedCompany[];
  /** 最终受益人 */
  ultimateBeneficialOwners: UltimateBeneficialOwner[];
  /** 是否存在壳公司特征 */
  shellCompanyIndicators: {
    /** 是否有壳公司特征 */
    detected: boolean;
    /** 风险信号 */
    signals: string[];
  };
  /** 关系图谱 */
  relationshipGraph?: {
    nodes: Array<{ id: string; name: string; type: string }>;
    edges: Array<{ source: string; target: string; relationship: string }>;
  };
  /** 数据来源 */
  sources: string[];
}

/**
 * 风险类型
 */
export type RiskType =
  | 'LITIGATION'       // 诉讼
  | 'JUDGMENT'         // 判决
  | 'ENFORCEMENT'      // 执行
  | 'DISHONESTY'       // Public enforcement/default record
  | 'SANCTION'         // 制裁
  | 'PEP'              // 政治敏感人物
  | 'ADVERSE_MEDIA'    // 负面新闻
  | 'BANKRUPTCY'       // 破产
  | 'TAX_VIOLATION';   // 税务违规

/**
 * 风险记录
 */
export interface RiskRecord {
  /** 风险类型 */
  type: RiskType;
  /** 风险等级 */
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 发生日期 */
  date?: Date;
  /** 金额 */
  amount?: {
    value: number;
    currency: string;
  };
  /** 案号 */
  caseNumber?: string;
  /** 法院/机构 */
  authority?: string;
  /** 状态 */
  status?: 'PENDING' | 'RESOLVED' | 'ONGOING';
  /** 数据来源 */
  source: string;
  /** 来源URL */
  sourceUrl?: string;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 风险层结果
 */
export interface RiskLayerResult {
  /** 风险记录 */
  records: RiskRecord[];
  /** 总体风险等级 */
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR';
  /** 风险评分（0-100） */
  riskScore: number;
  /** 风险摘要 */
  summary: {
    highCount: number;
    mediumCount: number;
    lowCount: number;
    byType: Record<RiskType, number>;
  };
  /** 数据来源 */
  sources: string[];
}

/**
 * 经营记录
 */
export interface BusinessRecord {
  /** 记录类型 */
  type: 'CUSTOMS_IMPORT' | 'CUSTOMS_EXPORT' | 'TENDER' | 'CONTRACT' | 'CERTIFICATION' | 'NEWS';
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 日期 */
  date?: Date;
  /** 金额 */
  amount?: {
    value: number;
    currency: string;
  };
  /** 产品/服务 */
  product?: string;
  /** 交易对手 */
  counterparty?: string;
  /** 国家 */
  country?: string;
  /** 数据来源 */
  source: string;
  /** 来源URL */
  sourceUrl?: string;
}

/**
 * 经营层结果
 */
export interface BusinessLayerResult {
  /** 经营记录 */
  records: BusinessRecord[];
  /** 经营活跃度评分（0-100） */
  activityScore: number;
  /** 主要市场 */
  primaryMarkets: string[];
  /** 主要产品 */
  primaryProducts: string[];
  /** 数据来源 */
  sources: string[];
}

// ==================== 综合报告 ====================

/**
 * 企业背调报告
 */
export interface CompanyInvestigationReport {
  /** 报告ID */
  id: string;
  /** 查询参数 */
  query: CompanyInvestigationQuery;
  /** 生成时间 */
  generatedAt: Date;
  /** 调查耗时（毫秒） */
  duration: number;

  // 各层级结果
  /** 身份层结果 */
  identity?: IdentityLayerResult;
  /** 注册层结果 */
  registration?: RegistrationLayerResult;
  /** 关联层结果 */
  association?: AssociationLayerResult;
  /** 风险层结果 */
  risk?: RiskLayerResult;
  /** 经营层结果 */
  business?: BusinessLayerResult;

  // 综合评估
  /** 企业真实性评分（0-100） */
  authenticityScore: number;
  /** 综合风险等级 */
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR';
  /** 关键发现 */
  keyFindings: KeyFinding[];
  /** 可疑信号 */
  suspiciousSignals: string[];
  /** 建议行动 */
  recommendations: string[];
  /** 数据源列表 */
  dataSources: string[];
}

/**
 * 关键发现
 */
export interface KeyFinding {
  /** 类型 */
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'WARNING';
  /** 类别 */
  category: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 证据 */
  evidence?: string;
  /** 数据来源 */
  source: string;
}

// ==================== 适配器接口 ====================

/**
 * OSINT数据源适配器接口
 */
export type OSINTHealthCheckResult = {
  healthy: boolean;
  latency: number;
  error?: string;
  message?: string;
};

export interface OSINTSourceAdapter {
  /** 数据源编码 */
  readonly code: string;
  /** 数据源名称 */
  readonly name: string;
  /** 数据源层级 */
  readonly layer: OSINTLayer;
  /** 支持的功能 */
  readonly supportedFeatures: {
    /** 支持企业搜索 */
    supportsCompanySearch: boolean;
    /** 支持详情查询 */
    supportsDetailQuery: boolean;
    /** 支持关联查询 */
    supportsAssociationQuery: boolean;
    /** 支持风险查询 */
    supportsRiskQuery: boolean;
    /** 最大结果数 */
    maxResultsPerQuery: number;
  };

  /**
   * 初始化适配器
   */
  initialize(config: OSINTSourceConfig): void;

  /**
   * 搜索企业
   */
  searchCompany(query: CompanyInvestigationQuery): Promise<CompanyRegistration[]>;

  /**
   * 获取企业详情
   */
  getCompanyDetail(registrationNumber: string, country: string): Promise<CompanyRegistration | null>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<OSINTHealthCheckResult>;
}
