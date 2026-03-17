/**
 * 邮件事件追踪API
 *
 * 接收Resend webhook事件，记录邮件打开/点击
 *
 * Resend webhook事件类型：
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackIntentSignal } from '@/lib/services/intent-tracking';

export async function POST(req: NextRequest) {
  try {
    // 验证签名
    const signature = req.headers.get('resend-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await req.json();
    const { type, data } = body;

    // 根据事件类型处理
    switch (type) {
      case 'email.opened':
        await handleEmailOpened(data);
        break;

      case 'email.clicked':
        await handleEmailClicked(data);
        break;

      case 'email.delivered':
        await handleEmailDelivered(data);
        break;

      case 'email.bounced':
        await handleEmailBounced(data);
        break;

      default:
        console.log('[EmailTracking] Unknown event type:', type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EmailTracking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 处理邮件打开事件
 */
async function handleEmailOpened(data: {
  email_id: string;
  from: string;
  to: string[];
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> {
  try {
    // 查找邮件记录，获取tenant和candidate信息
    const emailLog = await findEmailLog(data.email_id, data.to[0]);

    if (!emailLog) {
      console.log('[EmailTracking] Email log not found:', data.email_id);
      return;
    }

    // 记录意图信号
    await trackIntentSignal({
      tenantId: emailLog.tenantId,
      candidateId: emailLog.candidateId || undefined,
      companyId: emailLog.companyId || undefined,
      signalType: 'email_open',
      metadata: {
        emailId: data.email_id,
        from: data.from,
        to: data.to,
      },
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      occurredAt: new Date(data.timestamp),
    });

    // 更新邮件日志状态
    await updateEmailLogStatus(data.email_id, 'opened');

    console.log('[EmailTracking] Email opened:', data.email_id, 'to:', data.to[0]);
  } catch (error) {
    console.error('[EmailTracking] handleEmailOpened error:', error);
  }
}

/**
 * 处理链接点击事件
 */
async function handleEmailClicked(data: {
  email_id: string;
  from: string;
  to: string[];
  timestamp: string;
  link: {
    url: string;
    text?: string;
  };
  ip_address?: string;
  user_agent?: string;
}): Promise<void> {
  try {
    const emailLog = await findEmailLog(data.email_id, data.to[0]);

    if (!emailLog) {
      console.log('[EmailTracking] Email log not found:', data.email_id);
      return;
    }

    // 记录意图信号
    await trackIntentSignal({
      tenantId: emailLog.tenantId,
      candidateId: emailLog.candidateId || undefined,
      companyId: emailLog.companyId || undefined,
      signalType: 'email_click',
      metadata: {
        emailId: data.email_id,
        link: data.link.url,
        linkText: data.link.text,
      },
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      occurredAt: new Date(data.timestamp),
    });

    // 更新邮件日志状态
    await updateEmailLogStatus(data.email_id, 'clicked');

    console.log('[EmailTracking] Email clicked:', data.email_id, 'link:', data.link.url);
  } catch (error) {
    console.error('[EmailTracking] handleEmailClicked error:', error);
  }
}

/**
 * 处理邮件送达事件
 */
async function handleEmailDelivered(data: {
  email_id: string;
  from: string;
  to: string[];
  timestamp: string;
}): Promise<void> {
  await updateEmailLogStatus(data.email_id, 'delivered');
}

/**
 * 处理邮件退回事件
 */
async function handleEmailBounced(data: {
  email_id: string;
  from: string;
  to: string[];
  timestamp: string;
  bounce?: {
    type: string;
    message: string;
  };
}): Promise<void> {
  await updateEmailLogStatus(data.email_id, 'bounced');
}

// ==================== 辅助函数 ====================

/**
 * 查找邮件日志
 */
async function findEmailLog(emailId: string, to: string): Promise<{
  tenantId: string;
  candidateId: string | null;
  companyId: string | null;
} | null> {
  // 从OutreachRecord表查找
  const outreach = await prisma.outreachRecord.findFirst({
    where: {
      messageId: emailId,
    },
    select: {
      tenantId: true,
      candidateId: true,
    },
  });

  if (outreach) {
    // 获取候选的公司ID
    let companyId: string | null = null;
    if (outreach.candidateId) {
      const candidate = await prisma.radarCandidate.findUnique({
        where: { id: outreach.candidateId },
        select: { importedToId: true },
      });
      companyId = candidate?.importedToId || null;
    }

    return {
      tenantId: outreach.tenantId,
      candidateId: outreach.candidateId,
      companyId,
    };
  }

  return null;
}

/**
 * 更新邮件日志状态
 */
async function updateEmailLogStatus(
  emailId: string,
  status: 'delivered' | 'opened' | 'clicked' | 'bounced'
): Promise<void> {
  try {
    await prisma.outreachRecord.updateMany({
      where: { messageId: emailId },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === 'opened' && { openedAt: new Date() }),
        ...(status === 'clicked' && { clickedAt: new Date() }),
      },
    });
  } catch (error) {
    console.error('[EmailTracking] updateEmailLogStatus error:', error);
  }
}