import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const maxDuration = 30;

/**
 * 测试邮件发送 API
 * GET /api/test-email?secret=xxx&to=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const to = searchParams.get('to') || 'admin@tdpaintcell.com';

  // 验证密钥
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const resend = new Resend(resendApiKey);

  try {
    // 发送测试邮件
    const result = await resend.emails.send({
      from: '涂豆科技 <noreply@tdpaintcell.com>',
      to: to,
      subject: '【VertaX】邮件服务测试成功',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
            ✅ 邮件服务测试成功
          </h1>
          <p>这是一封测试邮件，证明 Resend 邮件服务已正确配置。</p>
          <p><strong>收件人：</strong>${to}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}<br>
            发件域名: tdpaintcell.com
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
      message: `测试邮件已发送到 ${to}`,
    });
  } catch (error) {
    console.error('[test-email] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
