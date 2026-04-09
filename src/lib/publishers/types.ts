/**
 * Content Publishing Pipeline - Types
 *
 * 核心理念：
 * - ContentPushPayload 是 Vertax 平台标准格式，适配器负责转换为各目标格式
 * - 每种 siteType 对应一个 PublisherAdapter 实现
 * - 客户侧（Supabase/Next.js webhook/REST）只需实现约定接口即可
 */

// ==================== Vertax 标准推送 Payload ====================

/**
 * Vertax → 目标站 标准内容 Payload
 * 适配器接收此格式，转换为各目标站所需格式后推送。
 */
export interface ContentPushPayload {
  // 幂等键（必填）
  vertax_asset_id: string;

  // 内容（必填）
  title: string;
  slug: string;
  body: string;             // HTML 正文

  // 中文版（可选，双语站使用）
  title_zh?: string;
  body_zh?: string;
  summary_zh?: string;
  answer_box_zh?: string;
  meta_title_zh?: string;
  meta_description_zh?: string;

  // SEO 字段
  summary?: string;         // 摘要 / excerpt
  answer_box?: string;      // Featured snippet 候选段落
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];

  // 媒体 & 分类
  category?: string;        // 分类 slug，各适配器自行映射
  featured_image_url?: string;

  // 结构化数据
  schema_json?: string;     // JSON-LD Schema.org 字符串

  // 发布状态（目标站默认发布）
  status?: "published" | "draft" | "review";
}

// ==================== Publisher Adapter 接口 ====================

export interface PublishResult {
  success: boolean;
  remoteId?: string;
  remoteSlug?: string;
  remoteUrl?: string;
  error?: string;
}

export interface PublisherAdapter {
  publish(payload: ContentPushPayload): Promise<PublishResult>;
}

// ==================== WebsiteConfig siteType ====================

export type SiteType = "supabase" | "nextjs" | "wordpress" | "rest" | "custom";

// ==================== 工厂配置 ====================

export interface PublisherAdapterConfig {
  siteType: SiteType | string;

  // Supabase
  supabaseUrl?: string | null;
  functionName?: string | null;

  // Nextjs webhook / REST
  webhookUrl?: string | null;

  // WordPress
  wpUrl?: string | null;
  wpUsername?: string | null;
  wpPassword?: string | null;

  // 通用
  pushSecret?: string | null;
  customHeaders?: Record<string, string> | null;
}

// ==================== Paintcell 专用（向后兼容） ====================

/** @deprecated 用 ContentPushPayload 替代 */
export type PaintcellResourceCategory = "learning-center" | "tools-templates" | "glossary";
/** @deprecated */
export type PaintcellContentStatus = "draft" | "review" | "published";

export const CONTENT_TYPE_CATEGORY_MAP: Record<string, PaintcellResourceCategory> = {
  "article": "learning-center",
  "blog-article": "learning-center",
  "technical-doc": "tools-templates",
  "case": "learning-center",
  "product": "learning-center",
  "glossary": "glossary",
  "default": "learning-center",
};
