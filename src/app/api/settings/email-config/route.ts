/**
 * API: 租户邮件配置
 * 
 * GET  - 获取当前租户的邮件配置
 * POST - 更新邮件配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyDomain } from '@/lib/email/resend-client';
import { getTenantEmailDefaults } from '@/lib/email/tenant-email-defaults';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        emailConfig: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // 脱敏：不返回完整的 API Key
    const config = tenant.emailConfig as Record<string, unknown> | null;
    const tenantDefaults = getTenantEmailDefaults(tenant);
    const safeConfig = {
      usePlatformKey: config?.usePlatformKey ?? true,
      hasCustomApiKey: !!config?.customApiKey,
      customFromDomain: config?.customFromDomain || null,
      fromEmail: config?.fromEmail || 'VertaX <noreply@vertax.top>',
      replyToEmail: config?.replyToEmail || tenantDefaults.replyToEmail || null,
      verifiedDomain: config?.verifiedDomain || null,
    };

    return NextResponse.json({
      ok: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      config: safeConfig,
      platformDefault: {
        fromEmail: 'VertaX <noreply@vertax.top>',
        note: '默认使用平台发件域名',
      },
    });
  } catch (error) {
    console.error('[email-config] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    // 获取当前配置
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { emailConfig: true, slug: true },
    });

    const currentConfig = (tenant?.emailConfig as Record<string, unknown>) || {
      usePlatformKey: true,
    };
    const tenantDefaults = getTenantEmailDefaults(tenant);

    switch (action) {
      case 'update': {
        const { usePlatformKey, customApiKey, customFromDomain, fromEmail, replyToEmail } = data;

        const newConfig = {
          ...currentConfig,
          usePlatformKey: usePlatformKey ?? currentConfig.usePlatformKey,
          customApiKey: customApiKey !== undefined ? customApiKey : currentConfig.customApiKey,
          customFromDomain: customFromDomain || currentConfig.customFromDomain,
          fromEmail: fromEmail || currentConfig.fromEmail,
          replyToEmail: replyToEmail || currentConfig.replyToEmail || tenantDefaults.replyToEmail,
        };

        await prisma.tenant.update({
          where: { id: session.user.tenantId },
          data: { emailConfig: newConfig as object },
        });

        return NextResponse.json({
          ok: true,
          message: '配置已更新',
          config: {
            usePlatformKey: newConfig.usePlatformKey,
            hasCustomApiKey: !!newConfig.customApiKey,
            customFromDomain: newConfig.customFromDomain,
            fromEmail: newConfig.fromEmail,
            replyToEmail: newConfig.replyToEmail,
          },
        });
      }

      case 'verify_domain': {
        const { domain } = data;

        if (!domain) {
          return NextResponse.json({ error: 'domain is required' }, { status: 400 });
        }

        const result = await verifyDomain(domain, session.user.tenantId);

        if (result.success) {
          // 保存待验证域名
          await prisma.tenant.update({
            where: { id: session.user.tenantId },
            data: {
              emailConfig: {
                ...currentConfig,
                pendingDomain: domain,
              } as object,
            },
          });
        }

        return NextResponse.json({
          ok: result.success,
          domain,
          records: result.records,
          error: result.error,
          instructions: result.success
            ? '请在 DNS 中添加上述记录，然后等待验证完成（通常需要几分钟到几小时）'
            : undefined,
        });
      }

      case 'test': {
        // 发送测试邮件
        const { testEmail } = data;

        if (!testEmail) {
          return NextResponse.json({ error: 'testEmail is required' }, { status: 400 });
        }

        const { sendEmail } = await import('@/lib/email/resend-client');

        const result = await sendEmail({
          to: testEmail,
          tenantId: session.user.tenantId,
          subject: '[VertaX] 邮件配置测试',
          html: `
            <h1>邮件配置测试成功</h1>
            <p>这是一封测试邮件，确认您的邮件配置正常工作。</p>
            <p>发送时间: ${new Date().toISOString()}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              此邮件由 VertaX AI 发送，用于验证邮件配置。
            </p>
          `,
          tags: { type: 'config_test' },
        });

        return NextResponse.json({
          ok: result.success,
          messageId: result.messageId,
          error: result.error,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[email-config] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
