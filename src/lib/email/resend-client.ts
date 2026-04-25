// ==================== Resend Email Client ====================
// 邮件发送服务，支持平台级和租户级 API Key

import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { getTenantEmailDefaults } from '@/lib/email/tenant-email-defaults';

// 平台级客户端（单例）
let platformClient: Resend | null = null;

// 租户级客户端缓存
const tenantClients = new Map<string, Resend>();

/**
 * 获取平台级 Resend 客户端
 */
export function getPlatformClient(): Resend | null {
  if (!platformClient) {
    const apiKey = process.env.RESEND_API_KEY;
    
    // 如果没有配置或使用占位符，返回 null
    if (!apiKey || apiKey.startsWith('re_placeholder') || apiKey === 're_test_placeholder') {
      console.warn('[Resend] API Key not configured or using placeholder. Email sending will fail.');
      return null;
    }
    
    platformClient = new Resend(apiKey);
  }
  return platformClient;
}

/**
 * 获取默认发件地址
 * 优先使用环境变量，否则使用 Resend 默认域名
 */
function getDefaultFromEmail(): string {
  // 如果配置了自定义域名，使用它
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }
  // 否则使用 Resend 默认域名（用于测试）
  return 'VertaX <onboarding@resend.dev>';
}

/**
 * 获取租户级 Resend 客户端（如果配置了自定义 Key）
 */
export async function getTenantClient(tenantId: string): Promise<{
  client: Resend | null;
  config: TenantEmailConfig;
}> {
  // 默认配置：使用平台 Key
  try {
    // 查询租户邮件配置
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        slug: true,
        emailConfig: true,
        companyProfile: {
          select: { companyName: true },
        },
      },
    });

    const savedConfig = tenant?.emailConfig as TenantEmailConfig | null;
    const tenantDefaults = getTenantEmailDefaults(tenant);
    const defaultConfig: TenantEmailConfig = {
      usePlatformKey: true,
      fromEmail: tenantDefaults.fromEmail || getDefaultFromEmail(),
      replyToEmail: tenantDefaults.replyToEmail ?? null,
    };

    if (!savedConfig || savedConfig.usePlatformKey) {
      // 使用平台 Key
      return {
        client: getPlatformClient(),
        config: {
          ...defaultConfig,
          ...savedConfig,
          fromEmail: savedConfig?.fromEmail || defaultConfig.fromEmail,
          replyToEmail: savedConfig?.replyToEmail || defaultConfig.replyToEmail,
        },
      };
    }

    // 使用租户自定义 Key
    if (savedConfig.customApiKey) {
      // 检查缓存
      if (tenantClients.has(tenantId)) {
        return {
          client: tenantClients.get(tenantId)!,
          config: {
            ...savedConfig,
            replyToEmail: savedConfig.replyToEmail || tenantDefaults.replyToEmail || null,
          },
        };
      }

      // 创建新客户端
      const client = new Resend(savedConfig.customApiKey);
      tenantClients.set(tenantId, client);

      return {
        client,
        config: {
          ...savedConfig,
          replyToEmail: savedConfig.replyToEmail || tenantDefaults.replyToEmail || null,
        },
      };
    }

    return { client: getPlatformClient(), config: defaultConfig };
  } catch (error) {
    console.error('[getTenantClient] Error:', error);
    return {
      client: getPlatformClient(),
      config: {
        usePlatformKey: true,
        fromEmail: getDefaultFromEmail(),
        replyToEmail: null,
      },
    };
  }
}

// ==================== 类型定义 ====================

export interface TenantEmailConfig {
  usePlatformKey: boolean;           // true = 使用平台 Key, false = 使用自定义 Key
  customApiKey?: string;             // 租户自己的 Resend API Key
  customFromDomain?: string;         // 自定义发件域名
  fromEmail?: string;                // 发件人邮箱
  replyToEmail?: string | null;      // 回复邮箱
  verifiedDomain?: string;           // 已验证的域名
}

export interface EmailAttachment {
  filename: string;        // 文件名
  content: string;         // Base64 编码的文件内容
  contentType?: string;    // MIME 类型，如 "application/pdf"
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Record<string, string>;
  tenantId?: string;                 // 可选：指定租户以使用其配置
  attachments?: EmailAttachment[];    // 附件列表
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 发送邮件（支持租户级配置）
 */
export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  let client: Resend | null;
  let fromEmail: string;
  let replyTo: string | undefined = options.replyTo;

  if (options.tenantId) {
    // 使用租户配置
    const { client: tenantClient, config } = await getTenantClient(options.tenantId);
    client = tenantClient;
    fromEmail = options.from || config.fromEmail || getDefaultFromEmail();
    replyTo = replyTo || config.replyToEmail || undefined;
  } else {
    // 使用平台配置
    client = getPlatformClient();
    fromEmail = options.from || getDefaultFromEmail();
  }

  if (!client) {
    return {
      success: false,
      error: 'Resend API key not configured',
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: replyTo,
      tags: options.tags ? Object.entries(options.tags).map(([name, value]) => ({ name, value })) : undefined,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * 验证域名（用于租户配置自定义域名）
 */
export async function verifyDomain(domain: string, tenantId?: string): Promise<{
  success: boolean;
  records?: Array<{
    type: string;
    name: string;
    value: string;
  }>;
  error?: string;
}> {
  const client = tenantId
    ? (await getTenantClient(tenantId)).client
    : getPlatformClient();

  if (!client) {
    return { success: false, error: 'Client not configured' };
  }

  try {
    const { data, error } = await client.domains.create({ name: domain });

    if (error) {
      return { success: false, error: error.message };
    }

    // 处理不同类型的记录
    const records: Array<{ type: string; name: string; value: string }> = [];
    
    if (data?.records && Array.isArray(data.records)) {
      for (const record of data.records) {
        // 根据记录类型提取信息
        if ('record_type' in record) {
          records.push({
            type: (record as { record_type: string }).record_type,
            name: record.name || '',
            value: record.value || '',
          });
        } else if ('type' in record) {
          records.push({
            type: (record as { type: string }).type,
            name: record.name || '',
            value: record.value || '',
          });
        }
      }
    }

    return {
      success: true,
      records,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * 发送商机推送通知（支持租户配置）
 */
export async function sendNewCandidatesNotification(options: {
  to: string;
  tenantId: string;
  tenantName: string;
  newCandidatesCount: number;
  topCandidates: Array<{
    displayName: string;
    country?: string | null;
    website?: string | null;
    tier?: string | null;
  }>;
  dashboardUrl: string;
}): Promise<SendResult> {
  const { to, tenantId, tenantName, newCandidatesCount, topCandidates, dashboardUrl } = options;

  // 获取租户配置
  await getTenantClient(tenantId);

  const candidatesList = topCandidates
    .slice(0, 5)
    .map(c => `
      <li style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <strong>${c.displayName}</strong>
        ${c.country ? `<br><span style="color: #666;">${c.country}</span>` : ''}
        ${c.website ? `<br><a href="${c.website}" style="color: #D4AF37;">${c.website}</a>` : ''}
      </li>
    `)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0B1829 0%, #162033 100%); color: #fff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { background: #fff; padding: 30px; border: 1px solid #eee; }
        .highlight { color: #D4AF37; font-weight: bold; }
        .cta-button { display: inline-block; background: #D4AF37; color: #0B1829; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 发现新商机</h1>
          <p>VertaX AI 获客雷达为您发现了 <span class="highlight">${newCandidatesCount}</span> 个新商机</p>
        </div>
        <div class="content">
          <p>尊敬的 ${tenantName} 团队：</p>
          <p>您的获客雷达刚刚完成了新一轮扫描，发现了 <strong>${newCandidatesCount}</strong> 个潜在客户。</p>

          <h3 style="margin-top: 24px;">📋 部分商机预览</h3>
          <ul style="list-style: none; padding: 0;">
            ${candidatesList}
          </ul>

          <a href="${dashboardUrl}" class="cta-button">查看全部商机 →</a>

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            此邮件由 VertaX AI 自动发送。您可以在系统设置中调整通知频率。
          </p>
        </div>
        <div class="footer">
          <p>© 2026 VertaX AI · 智能出海获客平台</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    tenantId, // 使用租户配置
    subject: `🎯 发现 ${newCandidatesCount} 个新商机 - VertaX AI`,
    html,
    tags: {
      type: 'new_candidates',
      tenant: tenantName,
    },
  });
}

/**
 * Send auto-publish notification email
 * Notifies user when AI-generated content is automatically published after 24h grace period
 */
export async function sendAutoPublishNotification(options: {
  to: string;
  tenantId: string;
  tenantName: string;
  contentTitle: string;
  contentUrl: string;
  dashboardUrl: string;
}): Promise<SendResult> {
  const { to, tenantId, tenantName, contentTitle, contentUrl, dashboardUrl } = options;

  const truncatedTitle = contentTitle.length > 60 ? contentTitle.slice(0, 60) + '...' : contentTitle;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0B1829 0%, #162033 100%); color: #fff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { background: #fff; padding: 30px; border: 1px solid #eee; }
        .highlight { color: #D4AF37; font-weight: bold; }
        .content-title { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; font-weight: 500; }
        .cta-button { display: inline-block; background: #D4AF37; color: #0B1829; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        .cta-button.secondary { background: #0B1829; color: #fff; margin-left: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 内容已自动发布</h1>
          <p>AI 生成的内容已通过 24 小时审核期，自动发布至您的官网</p>
        </div>
        <div class="content">
          <p>尊敬的 ${tenantName} 团队：</p>
          <p>您通过 VertaX AI 生成的内容已自动发布至官网。以下是发布详情：</p>
          
          <div class="content-title">
            📄 ${truncatedTitle}
          </div>
          
          <p>此内容在生成后经过了 <span class="highlight">24 小时</span> 的审核等待期，未收到修改请求，现已自动发布。</p>
          
          <a href="${contentUrl}" class="cta-button">查看内容</a>
          <a href="${dashboardUrl}" class="cta-button secondary">进入控制台</a>
          
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            如需修改，可直接在控制台编辑内容，保存后将立即更新到官网。
          </p>
        </div>
        <div class="footer">
          <p>© 2026 VertaX AI · 智能出海获客平台</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    tenantId,
    subject: `📝 内容已自动发布: ${truncatedTitle} - VertaX AI`,
    html,
    tags: {
      type: 'auto_publish',
      tenant: tenantName,
    },
  });
}
