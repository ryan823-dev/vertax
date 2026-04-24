// ==================== B2B联系方式补全类型定义 ====================
// 用于销售线索的公开商务联系方式补全与置信度评分

// ==================== 置信度评分体系 ====================

/**
 * 联系方式置信度评分
 * 0-100 分制，基于来源可靠性
 */
export type ContactConfidenceScore = number;

/**
 * 置信度评分规则
 */
export const CONFIDENCE_SCORE_RULES: Record<ContactConfidenceScore, { label: string; description: string }> = {
  100: {
    label: '官网直接确认',
    description: '官网Contact页面或多个页面直接列出',
  },
  90: {
    label: '官网多处佐证',
    description: '官网首页、页脚、About等多处反复列出',
  },
  80: {
    label: '官方社媒确认',
    description: '官方LinkedIn、Facebook、YouTube简介列出',
  },
  70: {
    label: '行业目录佐证',
    description: '行业目录列出，且电话/域名/地址匹配',
  },
  50: {
    label: '第三方数据',
    description: '第三方数据库列出，但无官网佐证',
  },
  30: {
    label: '格式推断',
    description: '根据邮箱格式推断（如 info@域名）',
  },
  0: {
    label: '不可使用',
    description: '泄露库、非法来源、无法验证',
  },
};

/**
 * 来源类型
 */
export type ContactSourceType =
  | 'official_contact_page'      // 官网Contact页面
  | 'official_footer'            // 官网页脚
  | 'official_about_page'        // 官网About页面
  | 'official_homepage'          // 官网首页
  | 'official_service_page'      // 官网Support/Service页面
  | 'official_quote_page'        // 官网Request Quote页面
  | 'official_inquiry_page'      // 官网询盘页面
  | 'official_policy_page'       // 官网政策页（隐私/条款）
  | 'official_team_page'         // 官网团队页面
  | 'official_linkedin'          // 官方LinkedIn公司页
  | 'official_facebook'          // 官方Facebook商业页
  | 'official_youtube'           // 官方YouTube频道
  | 'industry_directory'         // 行业目录（The Fabricator、Thomasnet等）
  | 'association_member'         // 协会会员名录
  | 'chamber_member'             // 商会/本地商会目录
  | 'trade_show_exhibitor'       // 展会参展商名录
  | 'chamber_of_commerce'        // 商会目录
  | 'bbb'                        // BBB商业目录
  | 'partner_page'               // 合作伙伴页面（如FANUC integrator）
  | 'third_party_database'       // 第三方数据库
  | 'email_format_inferred'      // 邮箱格式推断
  | 'search_result'              // 搜索引擎结果
  | 'mx_validated';              // MX记录验证通过

// ==================== 联系方式结构 ====================

/**
 * 单个联系方式条目
 */
export interface ContactEntry {
  /** 联系方式值 */
  value: string;
  /** 置信度评分 (0-100) */
  confidence: ContactConfidenceScore;
  /** 来源列表 */
  sources: ContactSourceType[];
  /** 来源URL列表 */
  sourceUrls?: string[];
  /** 备注 */
  note?: string;
  /** 是否为主要联系方式 */
  isPrimary?: boolean;
  /** 最后验证时间 */
  lastVerified?: Date;
}

/**
 * 电话联系方式
 */
export interface PhoneContact extends ContactEntry {
  /** 电话类型 */
  type: 'main' | 'sales' | 'support' | 'service' | 'mobile' | 'unknown';
  /** 国家代码 */
  countryCode?: string;
  /** 是否已拨通验证 */
  dialVerified?: boolean;
}

/**
 * 邮箱联系方式
 */
export interface EmailContact extends ContactEntry {
  /** 邵箱类型 */
  type: 'role' | 'personal' | 'unknown';
  /** 角色类型（如果是role邮箱） */
  roleType?: 'sales' | 'info' | 'support' | 'service' | 'engineering' | 'quotes' | 'rfq' | 'contact';
  /** MX记录是否有效 */
  mxValid?: boolean;
  /** 是否已发送验证邮件 */
  emailVerified?: boolean;
}

/**
 * 地址信息
 */
export interface AddressContact extends ContactEntry {
  /** 地址类型 */
  type: 'headquarters' | 'office' | 'warehouse' | 'service' | 'manufacturing' | 'unknown';
  /** 街道地址 */
  street?: string;
  /** 城市 */
  city?: string;
  /** 州/省 */
  state?: string;
  /** 国家 */
  country?: string;
  /** 邮编 */
  postalCode?: string;
  /** 是否有冲突（多个地址不一致） */
  hasConflict?: boolean;
}

/**
 * 联系表单信息
 */
export interface ContactForm {
  /** 表单URL */
  url: string;
  /** 表单类型 */
  type: 'general' | 'contact' | 'sales' | 'support' | 'quote' | 'rfq' | 'inquiry' | 'demo' | 'unknown';
  /** 表单字段 */
  fields?: string[];
  /** 是否需要登录 */
  requiresLogin?: boolean;
  /** 来源 */
  source: ContactSourceType;
}

// ==================== 企业身份归一化 ====================

/**
 * 企业身份标识
 * 用于防止同名公司混淆
 */
export interface CompanyIdentity {
  /** 输入名称 */
  inputName: string;
  /** 法定名称 */
  legalName?: string;
  /** 显示名称 */
  displayName?: string;
  /** 域名 */
  domain?: string;
  /** 国家 */
  country?: string;
  /** 州/省 */
  state?: string;
  /** 城市 */
  city?: string;
  /** 行业 */
  industry?: string;
  /** 官网URL */
  officialUrl?: string;
  /** LinkedIn URL */
  linkedinUrl?: string;
  /** 归一化置信度 */
  identityConfidence: number;
  /** 是否可能与其他公司混淆 */
  duplicateRisk: 'none' | 'low' | 'medium' | 'high';
  /** 混淆警告信息 */
  duplicateWarnings?: string[];
}

// ==================== 补全查询与结果 ====================

/**
 * 联系方式补全查询
 */
export interface ContactEnrichmentQuery {
  /** 企业名称（必需） */
  companyName: string;
  /** 已知域名（可选） */
  domain?: string;
  /** 所在国家（可选） */
  country?: string;
  /** 州/省（可选） */
  state?: string;
  /** 城市（可选） */
  city?: string;
  /** 行业（可选） */
  industry?: string;
  /** 补全深度 */
  depth: 'quick' | 'standard' | 'deep';
  /** 要补全的类型 */
  enrichTypes?: ('phone' | 'email' | 'address' | 'form' | 'capabilities')[];
  /** 自定义配置 */
  options?: {
    /** 是否验证MX记录 */
    validateMX?: boolean;
    /** 是否检查官网表单 */
    checkForms?: boolean;
    /** 是否检查行业目录 */
    checkDirectories?: boolean;
    /** 是否检查官方社媒 */
    checkSocialMedia?: boolean;
    /** 是否推断邮箱格式 */
    inferEmailFormat?: boolean;
    /** 最大结果数 */
    maxResults?: number;
    /** 语言偏好 */
    language?: string;
    /** 行业目录列表 */
    preferredDirectories?: string[];
  };
}

/**
 * 企业能力信息
 */
export interface CompanyCapabilities {
  /** 能力关键词列表 */
  keywords: string[];
  /** 详细能力描述 */
  descriptions?: string[];
  /** 主要产品/服务 */
  products?: string[];
  /** 主要市场 */
  markets?: string[];
  /** 目标行业 */
  targetIndustries?: string[];
  /** 来源 */
  sources: ContactSourceType[];
  /** 来源URL */
  sourceUrls?: string[];
}

export type Capabilities = CompanyCapabilities;

/**
 * 联系方式补全结果
 */
export interface ContactEnrichmentResult {
  /** 企业身份 */
  identity: CompanyIdentity;

  /** 电话列表 */
  phones: PhoneContact[];

  /** 邵箱列表 */
  emails: EmailContact[];

  /** 地址列表 */
  addresses: AddressContact[];

  /** 联系表单列表 */
  contactForms: ContactForm[];

  /** 企业能力 */
  capabilities?: CompanyCapabilities;

  /** 推荐联系渠道（按置信度排序） */
  recommendedChannels: RecommendedChannel[];

  /** 线索质量评分 */
  leadQualityScore: number;

  /** 数据完整性评分 */
  completenessScore: number;

  /** 信息缺口 */
  informationGaps: InformationGap[];

  /** 数据来源汇总 */
  sourcesSummary: string[];

  /** 补全耗时 */
  duration: number;

  /** 补全时间 */
  enrichedAt: Date;
}

/**
 * 推荐联系渠道
 */
export interface RecommendedChannel {
  /** 渠道类型 */
  type: 'phone' | 'email' | 'form' | 'linkedin';
  /** 渠道值 */
  value: string;
  /** 置信度 */
  confidence: ContactConfidenceScore;
  /** 推荐理由 */
  reason: string;
  /** 优先级 (1-5) */
  priority: number;
}

/**
 * 信息缺口
 */
export interface InformationGap {
  /** 缺口类型 */
  type: 'email' | 'phone' | 'address' | 'industry' | 'capabilities' | 'decision_maker' | 'business_match';
  /** 缺口描述 */
  description: string;
  /** 重要性 */
  importance: 'high' | 'medium' | 'low';
  /** 建议补全方式 */
  suggestedAction?: string;
}

// ==================== 合规边界 ====================

/**
 * 来源合规性判定
 */
export type SourceComplianceLevel = 'compliant' | 'borderline' | 'non_compliant';

/**
 * 合规检查结果
 */
export interface ComplianceCheckResult {
  /** 来源类型 */
  source: ContactSourceType;
  /** 合规等级 */
  compliance: SourceComplianceLevel;
  /** 判定理由 */
  reason: string;
  /** 是否可以使用 */
  usable: boolean;
  /** 使用建议 */
  usageNote?: string;
}

export type ComplianceResult = ComplianceCheckResult;

/**
 * 合规边界配置
 */
export const COMPLIANCE_BOUNDARY = {
  /** 完全合规的来源 */
  compliantSources: [
    'official_contact_page',
    'official_footer',
    'official_about_page',
    'official_homepage',
    'official_service_page',
    'official_quote_page',
    'official_team_page',
    'official_linkedin',
    'official_facebook',
    'official_youtube',
    'industry_directory',
    'association_member',
    'trade_show_exhibitor',
    'chamber_of_commerce',
    'bbb',
    'partner_page',
  ] as ContactSourceType[],

  /** 边界来源（需谨慎使用） */
  borderlineSources: [
    'third_party_database',
    'search_result',
    'email_format_inferred',
  ] as ContactSourceType[],

  /** 不可使用的来源 */
  nonCompliantSources: [
    // 泄露库、暗网数据等 - 代码中不实现，仅记录
  ] as ContactSourceType[],

  /** 可收集的联系方式类型 */
  allowedContactTypes: [
    '公司总机',
    '公开销售邮箱',
    '官网联系表单',
    '公开地址',
    '行业目录信息',
    'LinkedIn公开信息',
    '展会公开信息',
  ],

  /** 需标注置信度的信息 */
  requiresConfidenceLabel: [
    '推断的邮箱',
    '第三方数据库信息',
    '搜索结果提取的信息',
  ],
};

// ==================== CRM输出格式 ====================

/**
 * CRM友好的联系方式输出
 */
export interface CRMContactOutput {
  /** 企业名称 */
  company: string;
  /** 兼容旧字段 */
  company_name?: string;
  /** 域名 */
  domain: string;
  /** 官网 */
  official_website: string;

  /** 主电话 */
  primary_phone?: {
    value: string;
    confidence: number;
    sources: string[];
  };

  /** 主邮箱 */
  primary_email?: {
    value: string;
    confidence: number;
    sources: string[];
    note?: string;
  };

  /** 地址列表 */
  addresses?: Array<{
    value: string;
    confidence: number;
    source: string;
    note?: string;
  }>;

  /** 行业 */
  industry?: string;

  /** 能力关键词 */
  capabilities?: string[];

  /** 推荐联系渠道 */
  recommended_contact?: string;
  /** 推荐联系渠道列表 */
  recommended_contact_channel: string[];

  /** 线索质量评分 */
  lead_quality_score: number;

  /** 数据来源标注 */
  data_sources: string[];

  /** 合规标注 */
  compliance_note: string;

  /** 信息缺口 */
  information_gaps?: string[];

  /** 补全时间 */
  enriched_at: string;
}
