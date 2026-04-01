"use server";

/**
 * 网站配置 Server Actions
 * 支持 1:N 多目标站配置
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WebsiteConfigFormData, WebsiteConfigDetail } from "./website-config.types";

async function getTenantId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  return (user?.tenantId as string) ?? null;
}

function toDetail(config: {
  id: string;
  siteName: string | null;
  url: string | null;
  siteType: string;
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
}): WebsiteConfigDetail {
  return {
    id: config.id,
    siteName: config.siteName,
    url: config.url,
    siteType: config.siteType,
    supabaseUrl: config.supabaseUrl,
    functionName: config.functionName,
    webhookUrl: config.webhookUrl,
    wpUrl: config.wpUrl,
    wpUsername: config.wpUsername,
    wpPassword: config.wpPassword,
    pushSecret: config.pushSecret,
    approvalTimeoutHours: config.approvalTimeoutHours,
    isActive: config.isActive,
    apiKey: config.apiKey,
    publishEndpoint: config.publishEndpoint,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

const SELECT_FIELDS = {
  id: true,
  siteName: true,
  url: true,
  siteType: true,
  supabaseUrl: true,
  functionName: true,
  webhookUrl: true,
  wpUrl: true,
  wpUsername: true,
  wpPassword: true,
  pushSecret: true,
  approvalTimeoutHours: true,
  isActive: true,
  apiKey: true,
  publishEndpoint: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ===================== 获取所有目标站 =====================

export async function getWebsiteConfigs(): Promise<WebsiteConfigDetail[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  const configs = await prisma.websiteConfig.findMany({
    where: { tenantId },
    select: SELECT_FIELDS,
    orderBy: { createdAt: "asc" },
  });

  return configs.map(toDetail);
}

// ===================== 获取单个配置（向后兼容） =====================

export async function getWebsiteConfigDetail(): Promise<WebsiteConfigDetail | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const config = await prisma.websiteConfig.findFirst({
    where: { tenantId },
    select: SELECT_FIELDS,
    orderBy: { createdAt: "asc" },
  });

  return config ? toDetail(config) : null;
}

// ===================== 保存（新建 or 更新） =====================

export async function saveWebsiteConfig(
  data: WebsiteConfigFormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "未登录" };

  const payload = {
    siteName: data.siteName || null,
    url: data.url || null,
    siteType: data.siteType || "supabase",
    supabaseUrl: data.supabaseUrl || null,
    functionName: data.functionName || null,
    webhookUrl: data.webhookUrl || null,
    wpUrl: data.wpUrl || null,
    wpUsername: data.wpUsername || null,
    wpPassword: data.wpPassword || null,
    pushSecret: data.pushSecret || null,
    approvalTimeoutHours: data.approvalTimeoutHours || 24,
    isActive: data.isActive ?? true,
  };

  try {
    if (data.id) {
      // Update — verify ownership
      const existing = await prisma.websiteConfig.findUnique({
        where: { id: data.id },
        select: { tenantId: true },
      });
      if (!existing || existing.tenantId !== tenantId) {
        return { success: false, error: "无权限" };
      }
      await prisma.websiteConfig.update({
        where: { id: data.id },
        data: payload,
      });
      return { success: true, id: data.id };
    } else {
      // Create new
      const created = await prisma.websiteConfig.create({
        data: { tenantId, ...payload },
        select: { id: true },
      });
      return { success: true, id: created.id };
    }
  } catch (error) {
    console.error("保存网站配置失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存失败",
    };
  }
}

// ===================== 删除 =====================

export async function deleteWebsiteConfig(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "未登录" };

  const existing = await prisma.websiteConfig.findUnique({
    where: { id },
    select: { tenantId: true },
  });
  if (!existing || existing.tenantId !== tenantId) {
    return { success: false, error: "无权限" };
  }

  try {
    await prisma.websiteConfig.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除失败",
    };
  }
}

// ===================== 测试连接 =====================

export async function testWebsiteConnection(
  id?: string
): Promise<{ success: boolean; message: string }> {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, message: "未登录" };

  const config = id
    ? await prisma.websiteConfig.findUnique({ where: { id }, select: SELECT_FIELDS })
    : await prisma.websiteConfig.findFirst({ where: { tenantId }, select: SELECT_FIELDS });

  if (!config) return { success: false, message: "未找到配置" };
  if (config.siteType !== "supabase") {
    return { success: true, message: "非 Supabase 类型，跳过连通性测试" };
  }
  if (!config.supabaseUrl || !config.functionName || !config.pushSecret) {
    return { success: false, message: "配置不完整：缺少 Supabase URL、Function Name 或 Push Secret" };
  }

  try {
    const functionUrl = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/${config.functionName}`;
    const response = await fetch(functionUrl, { method: "OPTIONS" });
    if (response.ok || response.status === 204) {
      return { success: true, message: "连接成功！Edge Function 可达" };
    }
    return { success: false, message: `Edge Function 返回 HTTP ${response.status}` };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}
