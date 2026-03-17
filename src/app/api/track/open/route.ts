/**
 * 邮件打开追踪API
 *
 * 返回1x1透明像素，同时记录意图信号
 *
 * 使用方式：在邮件HTML中嵌入
 * <img src="https://vertax.top/api/track/open?t=xxx&c=yyy&e=zzz" />
 *
 * 参数：
 * - t: tenantId
 * - c: candidateId
 * - e: emailId (可选)
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackIntentSignal } from '@/lib/services/intent-tracking';

// 1x1 透明 GIF 像素
const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('t');
    const candidateId = searchParams.get('c');
    const emailId = searchParams.get('e');

    // 记录意图信号
    if (tenantId) {
      await trackIntentSignal({
        tenantId,
        candidateId: candidateId || undefined,
        signalType: 'email_open',
        metadata: {
          emailId,
          trackedAt: new Date().toISOString(),
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
      });
    }

    // 返回透明像素
    return new NextResponse(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // 即使出错也返回像素，不影响邮件显示
    console.error('[TrackOpen] Error:', error);
    return new NextResponse(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
      },
    });
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