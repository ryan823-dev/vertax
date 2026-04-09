/**
 * 内容推送管道类型定义
 */

export type PushRecordData = {
  id: string;
  contentId: string;
  contentTitle: string;
  status: string;
  remoteId: string | null;
  remoteSlug: string | null;
  targetUrl: string | null;
  pushedAt: Date;
  timeoutAt: Date;
  confirmedAt: Date | null;
  retryCount: number;
  lastError: string | null;
  contentVersion: number | null;
  contentSnapshot: { title: string; slug: string; excerpt: string | null; keywords: string[] } | null;
};

export type WebsiteConfigData = {
  id: string;
  siteName: string | null;
  url: string | null;
  siteType: string;
  isActive: boolean;
  isPublishReady: boolean;
  status: string;
  statusLabel: string;
  statusMessage: string;
  supabaseUrl: string | null;
  functionName: string | null;
  webhookUrl: string | null;
  wpUrl: string | null;
  wpUsername: string | null;
  pushSecret: string | null;
};
