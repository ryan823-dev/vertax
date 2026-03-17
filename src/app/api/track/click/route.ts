/**
 * 链接点击追踪API
 *
 * 重定向到目标URL，同时记录意图信号
 *
 * 使用方式：将邮件中的链接替换为
 * https://vertax.top/api/track/click?t=xxx&c=yyy&url=https%3A%2F%2Fexample.com
 *
 * 参数：
 * - t: tenantId
 * - c: candidateId
 * - url: 目标URL（需要URL编码）
 * - e: emailId (可选)
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackIntentSignal } from '@/lib/services/intent-tracking';

export async function GET(req: NextRequest) {
  // 提前提取URL，便于错误处理
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  try {
    const tenantId = searchParams.get('t');
    const candidateId = searchParams.get('c');
    const emailId = searchParams.get('e');

    // 验证目标URL
    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    // 安全检查：只允许http/https协议
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    // 记录意图信号
    if (tenantId) {
      await trackIntentSignal({
        tenantId,
        candidateId: candidateId || undefined,
        signalType: 'email_click',
        metadata: {
          emailId,
          targetUrl,
          trackedAt: new Date().toISOString(),
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
      });
    }

    // 重定向到目标URL
    return NextResponse.redirect(targetUrl, 302);
  } catch (error) {
    console.error('[TrackClick] Error:', error);

    // 即使出错也尝试重定向
    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      return NextResponse.redirect(targetUrl, 302);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 获取客户端IP
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}