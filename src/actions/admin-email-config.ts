'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * 更新租户邮件配置
 */
export async function updateTenantEmailConfig(
  tenantId: string,
  config: {
    website?: string;
    resendApiKey?: string;
    fromEmail?: string;
    replyToEmail?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 检查是否是超级管理员（通过roleName判断）
    if (session.user.roleName !== 'SUPER_ADMIN') {
      return { success: false, error: 'Forbidden' };
    }

    // 获取当前配置
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { emailConfig: true },
    });

    const currentConfig = (tenant?.emailConfig as Record<string, unknown>) || {};

    // 合并配置
    const newConfig = {
      ...currentConfig,
      website: config.website || currentConfig.website,
      customApiKey: config.resendApiKey || currentConfig.customApiKey,
      fromEmail: config.fromEmail || currentConfig.fromEmail,
      replyToEmail: config.replyToEmail || currentConfig.replyToEmail,
      usePlatformKey: !config.resendApiKey, // 如果提供了自定义Key，则不使用平台Key
      customFromDomain: config.fromEmail?.match(/@([^>]+)/)?.[1] || currentConfig.customFromDomain,
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { emailConfig: newConfig as object },
    });

    revalidatePath('/admin/tenants');
    return { success: true };
  } catch (error) {
    console.error('[updateTenantEmailConfig] Error:', error);
    return { success: false, error: '保存失败' };
  }
}

/**
 * 获取租户邮件配置
 */
export async function getTenantEmailConfig(tenantId: string): Promise<{
  success: boolean;
  config?: {
    website?: string;
    hasResendApiKey: boolean;
    resendApiKeyPrefix?: string;
    fromEmail?: string;
    replyToEmail?: string;
    usePlatformKey: boolean;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 检查是否是超级管理员
    if (session.user.roleName !== 'SUPER_ADMIN') {
      return { success: false, error: 'Forbidden' };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { emailConfig: true },
    });

    const config = tenant?.emailConfig as Record<string, unknown> | null;

    return {
      success: true,
      config: {
        website: config?.website as string | undefined,
        hasResendApiKey: !!config?.customApiKey,
        resendApiKeyPrefix: config?.customApiKey 
          ? `${(config.customApiKey as string).slice(0, 7)}...` 
          : undefined,
        fromEmail: config?.fromEmail as string | undefined,
        replyToEmail: config?.replyToEmail as string | undefined,
        usePlatformKey: config?.usePlatformKey as boolean ?? true,
      },
    };
  } catch (error) {
    console.error('[getTenantEmailConfig] Error:', error);
    return { success: false, error: '获取失败' };
  }
}
