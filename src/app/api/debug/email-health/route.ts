/**
 * API: 邮件服务健康检查
 * 
 * 检查 Resend 配置状态，用于诊断邮件发送问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformClient } from '@/lib/email/resend-client';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  // 检查配置状态
  const configStatus = {
    hasApiKey: !!apiKey,
    isPlaceholder: apiKey?.startsWith('re_placeholder') || apiKey === 're_test_placeholder',
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 7)}...` : null,
    fromEmail: fromEmail || 'VertaX <noreply@vertax.top> (default)',
  };

  // 尝试获取客户端
  const client = getPlatformClient();

  // 尝试健康检查
  let healthStatus = 'not_configured';
  let latency = 0;

  if (client) {
    try {
      const startTime = Date.now();
      // Resend 没有专门的 health check 端点，尝试获取域名列表
      const { data: _data, error } = await client.domains.list();
      latency = Date.now() - startTime;

      if (error) {
        healthStatus = 'error';
      } else {
        healthStatus = 'healthy';
      }
    } catch {
      healthStatus = 'error';
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    config: {
      ...configStatus,
      status: healthStatus,
      latency: latency > 0 ? `${latency}ms` : null,
    },
    diagnosis: {
      canSendEmails: healthStatus === 'healthy',
      issues: [
        ...(configStatus.isPlaceholder ? ['API Key 使用占位符，需要在生产环境配置真实 Key'] : []),
        ...(!configStatus.hasApiKey ? ['未配置 RESEND_API_KEY 环境变量'] : []),
        ...(healthStatus === 'error' ? ['API Key 无效或网络错误'] : []),
      ],
      nextSteps: configStatus.isPlaceholder || !configStatus.hasApiKey
        ? [
            '1. 访问 https://resend.com 注册账户',
            '2. 获取 API Key',
            '3. 在 Vercel 配置 RESEND_API_KEY 环境变量',
            '4. 重新部署项目',
            '5. 再次运行此检查',
          ]
        : healthStatus === 'healthy'
          ? ['邮件服务配置正常，可以发送邮件']
          : ['检查 API Key 是否正确，或联系 Resend 支持'],
    },
    documentation: '/docs/RESEND_SETUP.md',
  });
}
