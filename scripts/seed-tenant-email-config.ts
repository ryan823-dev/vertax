/**
 * 租户邮件配置种子脚本
 *
 * 用于安全地配置租户的邮件设置
 * API密钥从环境变量读取，不硬编码
 *
 * 运行方式: npx ts-node scripts/seed-tenant-email-config.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 从环境变量读取配置
const TENANT_EMAIL_CONFIGS: Record<string, {
  customApiKey?: string;
  fromEmail?: string;
  replyToEmail?: string;
  customFromDomain?: string;
  usePlatformKey: boolean;
}> = {
  // 涂豆科技配置 - 从环境变量读取
  tdpaint: {
    customApiKey: process.env.TENANT_TDPaint_API_KEY || process.env.RESEND_API_KEY || '',
    fromEmail: process.env.TENANT_TDPaint_FROM_EMAIL || '涂豆科技 <noreply@tdpaint.com>',
    replyToEmail: process.env.TENANT_TDPaint_REPLY_TO || 'engineering@tdpaint.com',
    customFromDomain: process.env.TENANT_TDPaint_DOMAIN || 'tdpaint.com',
    usePlatformKey: !process.env.TENANT_TDPaint_API_KEY,
  },
  // 可以添加更多租户配置
};

async function main() {
  console.log('开始配置租户邮件设置...\n');

  for (const [slug, config] of Object.entries(TENANT_EMAIL_CONFIGS)) {
    // 检查是否有必要的配置
    if (!config.customApiKey && config.usePlatformKey === false) {
      console.warn(`⚠️  租户 ${slug} 缺少 API 密钥配置，跳过`);
      continue;
    }

    // 查找租户
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { slug: 'tdpaintcell' }, // 兼容旧slug
        ],
      },
    });

    if (!tenant) {
      console.warn(`⚠️  未找到租户 ${slug}，跳过`);
      continue;
    }

    // 更新租户配置
    const emailConfig = {
      usePlatformKey: config.usePlatformKey,
      ...(config.customApiKey && { customApiKey: config.customApiKey }),
      ...(config.fromEmail && { fromEmail: config.fromEmail }),
      ...(config.replyToEmail && { replyToEmail: config.replyToEmail }),
      ...(config.customFromDomain && { customFromDomain: config.customFromDomain }),
    };

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        slug, // 确保使用正确的 slug
        emailConfig,
      },
    });

    console.log(`✅ 已更新租户 ${slug} 的邮件配置`);
    console.log(`   - 发件邮箱: ${config.fromEmail || '使用平台默认'}`);
    console.log(`   - 使用平台密钥: ${config.usePlatformKey}\n`);
  }

  console.log('租户邮件配置完成！');
}

main()
  .catch((e) => {
    console.error('配置失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
