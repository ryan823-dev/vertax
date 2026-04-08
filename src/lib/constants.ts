// Permission constants
export const PERMISSIONS = {
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  SEO_READ: "seo.read",
  SEO_CREATE: "seo.create",
  SEO_EDIT: "seo.edit",
  SEO_DELETE: "seo.delete",
  SOCIAL_READ: "social.read",
  SOCIAL_CREATE: "social.create",
  SOCIAL_EDIT: "social.edit",
  SOCIAL_DELETE: "social.delete",
  LEADS_READ: "leads.read",
  LEADS_CREATE: "leads.create",
  LEADS_EDIT: "leads.edit",
  LEADS_DELETE: "leads.delete",
  SETTINGS_READ: "settings.read",
  SETTINGS_EDIT: "settings.edit",
  TEAM_READ: "team.read",
  TEAM_MANAGE: "team.manage",
  PLATFORM_ADMIN: "platform.*",
  TENANTS_MANAGE: "tenants.*",
} as const;

export const ROLES = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  COMPANY_MEMBER: "COMPANY_MEMBER",
  VIEWER: "VIEWER",
} as const;

// ==================== RBAC 应用角色 ====================
export const APP_ROLES = {
  DECIDER: 'DECIDER',
  OPERATOR: 'OPERATOR',
} as const;
export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const DISPLAY_MODES = {
  SECRETARY: 'secretary',
  ANALYST: 'analyst',
} as const;
export type DisplayMode = (typeof DISPLAY_MODES)[keyof typeof DISPLAY_MODES];

// 决策者禁止操作列表（前端门控用）
export const DECIDER_ONLY_ACTIONS = [
  'content.approve',
  'content.publish',
  'content.delete',
  'radar.configure',
  'radar.delete',
  'asset.delete',
  'persona.delete',
  'evidence.delete',
  'guideline.delete',
  'product.delete',
  'social.publish',
] as const;
export type DeciderAction = (typeof DECIDER_ONLY_ACTIONS)[number];

export const PRODUCT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const CONTENT_STATUS = {
  DRAFT: "draft",
  AWAITING_PUBLISH: "awaiting_publish", // AI-generated content in 24h grace period
  PUBLISHED: "published",
  SCHEDULED: "scheduled",
} as const;

export const SOCIAL_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  CONVERTED: "converted",
  LOST: "lost",
} as const;

export const LEAD_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const;

export const SOCIAL_PLATFORMS = {
  X: "x",
  FACEBOOK: "facebook",
  LINKEDIN: "linkedin",
  INSTAGRAM: "instagram",
} as const;

export const PLATFORM_CONFIG = {
  x: { charLimit: 280, mediaLimit: 4, name: "X (Twitter)" },
  facebook: { charLimit: 63206, mediaLimit: 10, name: "Facebook" },
  linkedin: { charLimit: 3000, mediaLimit: 9, name: "LinkedIn" },
  instagram: { charLimit: 2200, mediaLimit: 10, name: "Instagram" },
} as const;

export const AI_TONES = {
  PROFESSIONAL: "professional",
  CASUAL: "casual",
  HUMOROUS: "humorous",
  INFORMATIVE: "informative",
} as const;

// ==================== SEO AUDIT ====================

export const AUDIT_STATUS = {
  PENDING: "pending",
  CRAWLING: "crawling",
  ANALYZING: "analyzing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const AUDIT_CATEGORIES = {
  TECHNICAL: "technical",
  ON_PAGE: "onPage",
  STRUCTURED_DATA: "structuredData",
  SOCIAL: "social",
  GEO: "geo",
} as const;

export const AUDIT_CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  technical: { zh: "技术SEO", en: "Technical SEO" },
  onPage: { zh: "页面SEO", en: "On-Page SEO" },
  structuredData: { zh: "结构化数据", en: "Structured Data" },
  social: { zh: "社交分享", en: "Social Sharing" },
  geo: { zh: "AI引擎优化", en: "GEO (AI Engine)" },
};

export const AUDIT_WEIGHTS: Record<string, number> = {
  technical: 0.25,
  onPage: 0.25,
  structuredData: 0.20,
  social: 0.10,
  geo: 0.20,
};
