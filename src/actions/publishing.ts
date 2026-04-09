"use server";

/**
 * 内容推送管道 Server Actions
 *
 * 负责将 Vertax 营销内容推送到客户独立站（首个客户：tdpaint.com）
 *
 * 架构流程：
 * Vertax SeoContent → field-mapper → SupabasePublisherAdapter → Edge Function → resources_posts
 *     ↓                                                              ↑
 * PushRecord (追踪推送状态)                                    UPSERT by vertax_asset_id
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPublisherAdapter, mapVertaxToPaintcell } from "@/lib/publishers";
import type { PublisherAdapterConfig } from "@/lib/publishers";
import { getWebsiteConfigStatus } from "@/lib/website-config-status";
import type { PushRecordData, WebsiteConfigData } from "./publishing.types";
import { requireDecider } from "@/lib/permissions";

// ===================== 获取网站配置 =====================

export async function getWebsiteConfig(): Promise<WebsiteConfigData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return null;
  const tenantId = user!.tenantId as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = await (prisma.websiteConfig as any).findFirst({
    where: { tenantId: tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!config) return null;

  const statusInfo = getWebsiteConfigStatus(config);

  return {
    id: config.id,
    siteName: config.siteName ?? null,
    url: config.url,
    siteType: config.siteType,
    isActive: statusInfo.normalizedIsActive,
    isPublishReady: statusInfo.isPublishReady,
    status: statusInfo.status,
    statusLabel: statusInfo.statusLabel,
    statusMessage: statusInfo.statusMessage,
    supabaseUrl: config.supabaseUrl,
    functionName: config.functionName,
    webhookUrl: config.webhookUrl ?? null,
    wpUrl: config.wpUrl ?? null,
    wpUsername: config.wpUsername ?? null,
    pushSecret: config.pushSecret,
  };
}

// ===================== 推送内容到官网（内部函数，无 session）=====================

/**
 * Internal function for cron/auto-publish scenarios where no user session exists.
 * Skips auth and permission checks, uses provided tenantId directly.
 */
export async function pushContentToWebsiteInternal(
  contentId: string,
  tenantId: string,
  options?: {
    category?: string;
  }
): Promise<{ success: boolean; error?: string; pushRecordId?: string }> {
  // 1. 查找内容
  const content = await prisma.seoContent.findFirst({
    where: { id: contentId, tenantId: tenantId, deletedAt: null },
    include: { category: { select: { slug: true } } },
  });
  if (!content) {
    return { success: false, error: "内容不存在" };
  }

  // 2. 查找网站配置
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const websiteConfig = await (prisma.websiteConfig as any).findFirst({
    where: { tenantId: tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!websiteConfig || !websiteConfig.isActive) {
    return { success: false, error: "未配置或已禁用官网连接" };
  }

  // 3. 创建 Publisher Adapter
  if (websiteConfig.siteType === "custom") {
    return {
      success: false,
      error: "Website publishing is not configured yet for this tenant.",
    };
  }

  let adapter;
  try {
    adapter = createPublisherAdapter({
      siteType: websiteConfig.siteType,
      supabaseUrl: websiteConfig.supabaseUrl,
      functionName: websiteConfig.functionName,
      webhookUrl: websiteConfig.webhookUrl ?? null,
      wpUrl: websiteConfig.wpUrl ?? null,
      wpUsername: websiteConfig.wpUsername ?? null,
      wpPassword: websiteConfig.wpPassword ?? null,
      pushSecret: websiteConfig.pushSecret,
      customHeaders: (websiteConfig.customHeaders as Record<string, string> | null) ?? null,
    } as PublisherAdapterConfig);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "创建推送适配器失败",
    };
  }

  // 4. 字段映射
  const payload = mapVertaxToPaintcell(
    {
      id: content.id,
      title: content.title,
      slug: content.slug,
      content: content.content,
      excerpt: content.excerpt,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      keywords: content.keywords,
      featuredImage: content.featuredImage,
      categorySlug: content.category.slug,
    },
    {
      category: options?.category as never,
      status: "published",
    }
  );

  // 5. 计算超时时间
  const now = new Date();
  const timeoutAt = new Date(now.getTime() + websiteConfig.approvalTimeoutHours * 60 * 60 * 1000);

  // 6. 执行推送
  const result = await adapter.publish(payload);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentAny = content as any;
  const contentVersion: number | null = contentAny.version ?? null;

  // 7. 创建/更新 PushRecord (UPSERT)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pushRecord = await (prisma.pushRecord as any).upsert({
    where: {
      contentId_websiteConfigId: {
        contentId: content.id,
        websiteConfigId: websiteConfig.id,
      },
    },
    create: {
      tenantId: tenantId,
      contentId: content.id,
      websiteConfigId: websiteConfig.id,
      status: result.success ? "PENDING" : "FAILED",
      remoteId: result.remoteId || null,
      remoteSlug: result.remoteSlug || null,
      targetUrl: result.remoteSlug
        ? `${websiteConfig.url || ""}/en/resources/articles/${result.remoteSlug}`
        : null,
      pushPayload: JSON.parse(JSON.stringify(payload)),
      contentVersion,
      contentSnapshot: { title: content.title, slug: content.slug, excerpt: content.excerpt, keywords: content.keywords },
      pushedAt: now,
      timeoutAt,
      retryCount: 0,
      lastError: result.error || null,
    },
    update: {
      status: result.success ? "PENDING" : "FAILED",
      remoteId: result.remoteId || null,
      remoteSlug: result.remoteSlug || null,
      targetUrl: result.remoteSlug
        ? `${websiteConfig.url || ""}/en/resources/articles/${result.remoteSlug}`
        : null,
      pushPayload: JSON.parse(JSON.stringify(payload)),
      contentVersion,
      contentSnapshot: { title: content.title, slug: content.slug, excerpt: content.excerpt, keywords: content.keywords },
      pushedAt: now,
      timeoutAt,
      retryCount: { increment: 1 },
      lastError: result.error || null,
    },
  });

  // 8. 如果推送成功，更新内容状态为 published
  if (result.success && content.status !== "published") {
    await prisma.seoContent.update({
      where: { id: content.id },
      data: { status: "published", publishedAt: now, autoPublishAt: null },
    });
  }

  return {
    success: result.success,
    error: result.error,
    pushRecordId: pushRecord.id,
  };
}

// ===================== 推送内容到官网（用户调用）=====================

export async function pushContentToWebsite(
  contentId: string,
  options?: {
    category?: string;
  }
): Promise<{ success: boolean; error?: string; pushRecordId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录" };
  }
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    return { success: false, error: roleCheck.error };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) {
    return { success: false, error: "用户不存在" };
  }
  const tenantId = user!.tenantId as string;

  // Delegate to internal function
  return pushContentToWebsiteInternal(contentId, tenantId, options);
}

// ===================== 获取推送记录 =====================

export async function getPushRecords(contentId?: string): Promise<PushRecordData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const records = await prisma.pushRecord.findMany({
    where: {
      tenantId: tenantId,
      ...(contentId ? { contentId } : {}),
    },
    include: {
      content: { select: { title: true } },
    },
    orderBy: { pushedAt: "desc" },
    take: 50,
  });

  return records.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rAny = r as any;
    return {
      id: r.id,
      contentId: r.contentId,
      contentTitle: r.content.title,
      status: r.status,
      remoteId: r.remoteId,
      remoteSlug: r.remoteSlug,
      targetUrl: r.targetUrl,
      pushedAt: r.pushedAt,
      timeoutAt: r.timeoutAt,
      confirmedAt: r.confirmedAt,
      retryCount: r.retryCount,
      lastError: r.lastError,
      contentVersion: rAny.contentVersion ?? null,
      contentSnapshot: rAny.contentSnapshot ?? null,
    };
  });
}

// ===================== 手动确认推送 =====================

export async function confirmPushRecord(
  pushRecordId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) {
    return { success: false, error: "用户不存在" };
  }
  const tenantId = user!.tenantId as string;

  try {
    await prisma.pushRecord.update({
      where: {
        id: pushRecordId,
        tenantId: tenantId,
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[confirmPush] Error:", error);
    return { success: false, error: "确认失败" };
  }
}

// ===================== 重新推送 =====================

export async function retryPush(
  pushRecordId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return { success: false, error: "用户不存在" };
  const tenantId = user!.tenantId as string;

  const record = await prisma.pushRecord.findFirst({
    where: { id: pushRecordId, tenantId: tenantId },
  });
  if (!record) return { success: false, error: "记录不存在" };

  // 重新调用推送
  return pushContentToWebsite(record.contentId);
}
