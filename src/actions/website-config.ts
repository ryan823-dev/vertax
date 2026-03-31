"use server";

/**
 * 网站配置 Server Actions
 * 管理 WebsiteConfig（客户独立站连接配置）
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WebsiteConfigFormData, WebsiteConfigDetail } from "./website-config.types";

// ===================== 获取配置 =====================

export async function getWebsiteConfigDetail(): Promise<WebsiteConfigDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return null;
  const tenantId = user!.tenantId as string;

  const config = await prisma.websiteConfig.findUnique({
    where: { tenantId: tenantId },
  });
  if (!config) return null;

  return {
    id: config.id,
    url: config.url,
    siteType: config.siteType,
    supabaseUrl: config.supabaseUrl,
    functionName: config.functionName,
    pushSecret: config.pushSecret,
    approvalTimeoutHours: config.approvalTimeoutHours,
    isActive: config.isActive,
    apiKey: config.apiKey,
    publishEndpoint: config.publishEndpoint,
  };
}

// ===================== 保存配置 =====================

export async function saveWebsiteConfig(
  data: WebsiteConfigFormData
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
    await prisma.websiteConfig.upsert({
      where: { tenantId: tenantId },
      create: {
        tenantId: tenantId,
        url: data.url || null,
        siteType: data.siteType || "supabase",
        supabaseUrl: data.supabaseUrl || null,
        functionName: data.functionName || null,
        pushSecret: data.pushSecret || null,
        approvalTimeoutHours: data.approvalTimeoutHours || 24,
        isActive: data.isActive ?? true,
      },
      update: {
        url: data.url || null,
        siteType: data.siteType || "supabase",
        supabaseUrl: data.supabaseUrl || null,
        functionName: data.functionName || null,
        pushSecret: data.pushSecret || null,
        approvalTimeoutHours: data.approvalTimeoutHours || 24,
        isActive: data.isActive ?? true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("保存网站配置失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存失败",
    };
  }
}

// ===================== 测试连接 =====================

export async function testWebsiteConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "未登录" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) {
    return { success: false, message: "用户不存在" };
  }
  const tenantId = user!.tenantId as string;

  const config = await prisma.websiteConfig.findUnique({
    where: { tenantId: tenantId },
  });

  if (!config) {
    return { success: false, message: "未配置网站连接" };
  }

  if (!config.supabaseUrl || !config.functionName || !config.pushSecret) {
    return { success: false, message: "配置不完整：缺少 Supabase URL、Function Name 或 Push Secret" };
  }

  // 发送一个空的 OPTIONS 请求来测试 Edge Function 是否可达
  try {
    const functionUrl = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/${config.functionName}`;
    const response = await fetch(functionUrl, {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok || response.status === 204) {
      return { success: true, message: "连接成功！Edge Function 可达" };
    }
    return {
      success: false,
      message: `Edge Function 返回 HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}
