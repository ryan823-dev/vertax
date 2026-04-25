/**
 * 配置涂豆科技的邮件设置
 * 使用 tdpaint.com 作为发件域名
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tenantId = 'cmmanspb30000anfp2ldflrov'; // 涂豆科技

    // 配置邮件设置
    const emailConfig = {
      usePlatformKey: true,  // 使用平台 API Key
      fromEmail: '涂豆科技 <noreply@tdpaint.com>',
      replyToEmail: 'engineering@tdpaint.com',
      customFromDomain: 'tdpaint.com',
      verifiedDomain: 'tdpaint.com', // 需在 Resend 后台验证
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        emailConfig: emailConfig as object,
      },
    });

    return NextResponse.json({
      ok: true,
      message: '涂豆科技邮件配置已更新',
      config: {
        fromEmail: emailConfig.fromEmail,
        replyToEmail: emailConfig.replyToEmail,
        domain: emailConfig.customFromDomain,
      },
      note: '请确保已在 Resend 后台验证 tdpaint.com 域名',
    });
  } catch (error) {
    console.error('[setup-tdpaint-email] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
