/**
 * Script: 添加 Tenant.emailConfig 字段
 * 
 * 运行方式：
 * 1. 本地: npx ts-node scripts/add-email-config-field.ts
 * 2. 或通过 Vercel 部署后手动执行 SQL
 */

import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking if emailConfig column exists...');

  try {
    // 尝试查询，如果字段不存在会报错
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Tenant' 
      AND column_name = 'emailConfig'
    `;

    if (Array.isArray(result) && result.length > 0) {
      console.log('✅ emailConfig column already exists');
      return;
    }

    console.log('Adding emailConfig column...');

    // 添加字段
    await prisma.$executeRaw`
      ALTER TABLE "Tenant" 
      ADD COLUMN "emailConfig" JSONB
    `;

    console.log('✅ emailConfig column added successfully');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
