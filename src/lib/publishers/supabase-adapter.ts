/**
 * Supabase Publisher Adapter
 * 
 * 将 Vertax 内容推送到基于 Supabase 的客户独立站。
 * 目标端点：paintcell/supabase/functions/receive-content-push
 * 
 * 该 Edge Function 已部署在 Paintcell Supabase 项目上，支持：
 * - Bearer token 验证 (VERTAX_PUSH_SECRET)
 * - vertax_asset_id 幂等去重 (UPSERT)
 * - 双语字段 (title/title_zh, body/body_zh 等)
 * - 返回 { success, id, slug }
 */

import type { ContentPushPayload, PublishResult, PublisherAdapter, PublisherAdapterConfig } from "./types";
import { WebhookPublisherAdapter } from "./webhook-adapter";
import { RestPublisherAdapter } from "./rest-adapter";
import { WordPressPublisherAdapter } from "./wordpress-adapter";

interface SupabasePublisherConfig {
  /** Supabase 项目 URL, e.g. "https://xxx.supabase.co" */
  supabaseUrl: string;
  /** Edge Function 名称, e.g. "receive-content-push" */
  functionName: string;
  /** 共享密钥，与 VERTAX_PUSH_SECRET 对应 */
  pushSecret: string;
}

export class SupabasePublisherAdapter implements PublisherAdapter {
  private config: SupabasePublisherConfig;

  constructor(config: SupabasePublisherConfig) {
    this.config = config;
  }

  /**
   * 构建 Edge Function 的完整 URL
   */
  private get functionUrl(): string {
    const base = this.config.supabaseUrl.replace(/\/$/, "");
    return `${base}/functions/v1/${this.config.functionName}`;
  }

  /**
   * 推送内容到 Supabase Edge Function
   */
  async publish(payload: ContentPushPayload): Promise<PublishResult> {
    try {
      const response = await fetch(this.functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.pushSecret}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        remoteId: data.id,
        remoteSlug: data.slug,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }
}

/**
 * 工厂函数：根据 siteType 创建对应 PublisherAdapter
 *
 * siteType 路由：
 *   supabase   → SupabasePublisherAdapter  (POST to Supabase Edge Function)
 *   nextjs     → WebhookPublisherAdapter   (POST + HMAC-SHA256, 自研 Next.js 站)
 *   wordpress  → WordPressPublisherAdapter (WP REST API v2)
 *   rest       → RestPublisherAdapter      (通用 Bearer token REST)
 */
export function createPublisherAdapter(config: PublisherAdapterConfig): PublisherAdapter {
  switch (config.siteType) {
    case "supabase": {
      if (!config.supabaseUrl || !config.functionName || !config.pushSecret) {
        throw new Error("Supabase adapter requires: supabaseUrl, functionName, pushSecret");
      }
      return new SupabasePublisherAdapter({
        supabaseUrl: config.supabaseUrl,
        functionName: config.functionName,
        pushSecret: config.pushSecret,
      });
    }

    case "nextjs": {
      if (!config.webhookUrl || !config.pushSecret) {
        throw new Error("Next.js webhook adapter requires: webhookUrl, pushSecret");
      }
      return new WebhookPublisherAdapter({
        webhookUrl: config.webhookUrl,
        pushSecret: config.pushSecret,
        customHeaders: config.customHeaders ?? undefined,
      });
    }

    case "wordpress": {
      if (!config.wpUrl || !config.wpUsername || !config.wpPassword) {
        throw new Error("WordPress adapter requires: wpUrl, wpUsername, wpPassword");
      }
      return new WordPressPublisherAdapter({
        siteUrl: config.wpUrl,
        username: config.wpUsername,
        password: config.wpPassword,
      });
    }

    case "rest": {
      if (!config.webhookUrl) {
        throw new Error("REST adapter requires: webhookUrl");
      }
      return new RestPublisherAdapter({
        endpointUrl: config.webhookUrl,
        pushSecret: config.pushSecret ?? undefined,
        customHeaders: config.customHeaders ?? undefined,
      });
    }

    case "custom": {
      throw new Error("Website publishing is not configured yet. Please choose a supported siteType and complete the adapter settings.");
    }

    default:
      throw new Error(`Unsupported siteType: "${config.siteType}". Valid values: supabase | nextjs | wordpress | rest | custom`);
  }
}
