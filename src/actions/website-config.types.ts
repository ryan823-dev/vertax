/**
 * 网站配置类型定义
 */

export type WebsiteConfigFormData = {
  id?: string;
  siteName: string;
  url: string;
  siteType: string;
  // Supabase
  supabaseUrl?: string;
  functionName?: string;
  // Next.js / REST
  webhookUrl?: string;
  // WordPress
  wpUrl?: string;
  wpUsername?: string;
  wpPassword?: string;
  // Common
  pushSecret?: string;
  approvalTimeoutHours: number;
  isActive: boolean;
};

export type WebsiteConfigDetail = {
  id: string;
  siteName: string | null;
  url: string | null;
  siteType: string;
  status: string;
  statusLabel: string;
  statusMessage: string;
  isPublishReady: boolean;
  supabaseUrl: string | null;
  functionName: string | null;
  webhookUrl: string | null;
  wpUrl: string | null;
  wpUsername: string | null;
  wpPassword: string | null;
  pushSecret: string | null;
  approvalTimeoutHours: number;
  isActive: boolean;
  apiKey: string | null;
  publishEndpoint: string | null;
  createdAt: Date;
  updatedAt: Date;
};
