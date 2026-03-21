/**
 * Content Publishing Pipeline - Types
 * 
 * 基于 Paintcell (tdpaint.com) 真实 Supabase schema 定义。
 * resources_posts 表字段来源：paintcell/src/integrations/supabase/types.ts
 */

// ==================== Paintcell resources_posts 目标 Schema ====================

/**
 * Paintcell resources_posts 表的 category 枚举
 */
export type PaintcellResourceCategory = "learning-center" | "tools-templates" | "glossary";

/**
 * Paintcell content_status 枚举
 */
export type PaintcellContentStatus = "draft" | "review" | "published";

/**
 * Edge Function receive-content-push 接受的 payload
 * 对应 paintcell/supabase/functions/receive-content-push/index.ts
 */
export interface ContentPushPayload {
  // 必填
  vertax_asset_id: string;
  title: string;
  slug: string;
  body: string;

  // 中文版本
  title_zh?: string;
  body_zh?: string;
  summary_zh?: string;
  answer_box_zh?: string;
  meta_title_zh?: string;
  meta_description_zh?: string;

  // SEO & 摘要
  summary?: string;
  answer_box?: string;
  meta_title?: string;
  meta_description?: string;

  // 分类 & 图片
  category?: PaintcellResourceCategory;
  featured_image_url?: string;

  // 状态 (Edge Function 默认 published，可覆盖为 review)
  status?: PaintcellContentStatus;
}

// ==================== Publisher Adapter 接口 ====================

export interface PublishResult {
  success: boolean;
  remoteId?: string;
  remoteSlug?: string;
  error?: string;
}

export interface PublisherAdapter {
  /**
   * 推送内容到目标站点
   */
  publish(payload: ContentPushPayload): Promise<PublishResult>;
}

// ==================== Vertax 内容类型 → Paintcell category 映射 ====================

export const CONTENT_TYPE_CATEGORY_MAP: Record<string, PaintcellResourceCategory> = {
  "article": "learning-center",
  "blog-article": "learning-center",
  "technical-doc": "tools-templates",
  "case": "learning-center",
  "product": "learning-center",
  "glossary": "glossary",
  "default": "learning-center",
};
