/**
 * Webhook集成服务
 *
 * 允许客户将线索/候选自动推送到外部系统（CRM、Slack等）
 *
 * 支持事件：
 * - candidate_qualified: 候选合格化
 * - candidate_imported: 候选导入线索库
 * - email_sent: 邮件发送
 * - intent_high: 高意向信号
 */

import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

// ==================== 类型定义 ====================

export type WebhookEvent =
  | 'candidate_qualified'
  | 'candidate_imported'
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'intent_high';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  tenantId: string;
}

export interface TriggerWebhookOptions {
  tenantId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
}

export interface CreateWebhookOptions {
  tenantId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
}

// ==================== 管理功能 ====================

/**
 * 创建Webhook配置
 */
export async function createWebhook(options: CreateWebhookOptions): Promise<{ id: string } | null> {
  try {
    const webhook = await prisma.webhookConfig.create({
      data: {
        tenantId: options.tenantId,
        name: options.name,
        url: options.url,
        events: options.events,
        secret: options.secret || generateSecret(),
        headers: options.headers || {},
        isActive: true,
      },
    });

    return { id: webhook.id };
  } catch (error) {
    console.error('[Webhook] createWebhook error:', error);
    return null;
  }
}

/**
 * 获取租户的Webhook列表
 */
export async function getWebhooks(tenantId: string): Promise<Array<{
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: Date | null;
  successRate: number;
}>> {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { tenantId },
      include: {
        logs: {
          take: 100,
          select: { success: true },
        },
      },
    });

    return webhooks.map(webhook => {
      const successCount = webhook.logs.filter(l => l.success).length;
      const successRate = webhook.logs.length > 0 ? successCount / webhook.logs.length : 1;

      return {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        lastTriggeredAt: webhook.lastTriggeredAt,
        successRate,
      };
    });
  } catch (error) {
    console.error('[Webhook] getWebhooks error:', error);
    return [];
  }
}

/**
 * 更新Webhook配置
 */
export async function updateWebhook(
  webhookId: string,
  tenantId: string,
  updates: {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
    headers?: Record<string, string>;
  }
): Promise<boolean> {
  try {
    await prisma.webhookConfig.update({
      where: { id: webhookId, tenantId },
      data: updates,
    });
    return true;
  } catch (error) {
    console.error('[Webhook] updateWebhook error:', error);
    return false;
  }
}

/**
 * 删除Webhook
 */
export async function deleteWebhook(webhookId: string, tenantId: string): Promise<boolean> {
  try {
    await prisma.webhookConfig.delete({
      where: { id: webhookId, tenantId },
    });
    return true;
  } catch (error) {
    console.error('[Webhook] deleteWebhook error:', error);
    return false;
  }
}

// ==================== 触发功能 ====================

/**
 * 触发Webhook
 */
export async function triggerWebhooks(options: TriggerWebhookOptions): Promise<void> {
  const { tenantId, event, data } = options;

  try {
    // 查找订阅该事件的所有活跃webhook
    const webhooks = await prisma.webhookConfig.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // 并行触发所有webhook
    await Promise.allSettled(
      webhooks.map(webhook => executeWebhook(webhook.id, event, data, tenantId))
    );
  } catch (error) {
    console.error('[Webhook] triggerWebhooks error:', error);
  }
}

/**
 * 执行单个Webhook调用
 */
async function executeWebhook(
  webhookId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  tenantId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    const webhook = await prisma.webhookConfig.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      tenantId,
    };

    // 生成签名
    const signature = generateSignature(payload, webhook.secret || '');

    // 发送请求
    const response = await fetch(webhook.url, {
      method: webhook.method as 'POST' | 'PUT' | 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        ...(webhook.headers as Record<string, string> || {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(webhook.timeout),
    });

    const executionTime = Date.now() - startTime;

    // 记录日志
    await prisma.webhookLog.create({
      data: {
        tenantId,
        webhookId,
        event,
        payload: JSON.parse(JSON.stringify(payload)),
        success: response.ok,
        statusCode: response.status,
        response: await response.text().catch(() => null),
        executionTime,
      },
    });

    // 更新最后触发时间
    await prisma.webhookConfig.update({
      where: { id: webhookId },
      data: { lastTriggeredAt: new Date() },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 记录失败日志
    await prisma.webhookLog.create({
      data: {
        tenantId,
        webhookId,
        event,
        payload: JSON.parse(JSON.stringify({ event, data })),
        success: false,
        error: errorMessage,
        executionTime,
      },
    });
  }
}

/**
 * 重试失败的Webhook
 */
export async function retryFailedWebhook(logId: string): Promise<boolean> {
  try {
    const log = await prisma.webhookLog.findUnique({
      where: { id: logId },
      include: { webhook: true },
    });

    if (!log || log.success) {
      return false;
    }

    const payload = log.payload as unknown as WebhookPayload;

    // 重新执行
    await executeWebhook(
      log.webhookId,
      log.event as WebhookEvent,
      payload?.data || {},
      log.tenantId
    );

    return true;
  } catch (error) {
    console.error('[Webhook] retryFailedWebhook error:', error);
    return false;
  }
}

// ==================== 工具函数 ====================

/**
 * 生成签名
 */
function generateSignature(payload: WebhookPayload, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * 生成随机密钥
 */
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 验证Webhook签名（供客户端使用）
 */
export function verifyWebhookSignature(
  payload: WebhookPayload,
  signature: string,
  secret: string
): boolean {
  const expected = generateSignature(payload, secret);
  return signature === expected;
}

// ==================== 便捷触发器 ====================

/**
 * 触发候选合格化事件
 */
export async function triggerCandidateQualified(
  tenantId: string,
  candidate: {
    id: string;
    displayName: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    country?: string | null;
    industry?: string | null;
    qualifyTier?: string | null;
  }
): Promise<void> {
  await triggerWebhooks({
    tenantId,
    event: 'candidate_qualified',
    data: {
      candidateId: candidate.id,
      companyName: candidate.displayName,
      website: candidate.website,
      phone: candidate.phone,
      email: candidate.email,
      country: candidate.country,
      industry: candidate.industry,
      tier: candidate.qualifyTier,
    },
  });
}

/**
 * 触发邮件发送事件
 */
export async function triggerEmailSent(
  tenantId: string,
  data: {
    emailId: string;
    candidateId?: string;
    to: string;
    subject: string;
  }
): Promise<void> {
  await triggerWebhooks({
    tenantId,
    event: 'email_sent',
    data,
  });
}

/**
 * 触发高意向事件
 */
export async function triggerHighIntent(
  tenantId: string,
  data: {
    candidateId: string;
    companyName: string;
    signalType: string;
    score: number;
  }
): Promise<void> {
  await triggerWebhooks({
    tenantId,
    event: 'intent_high',
    data,
  });
}