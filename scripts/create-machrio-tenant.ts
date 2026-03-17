/**
 * 创建 MachRio 租户和管理员账户
 */

import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建 MachRio 租户...');

  // 1. 创建租户
  const tenant = await prisma.tenant.create({
    data: {
      id: `machrio-${randomUUID().slice(0, 8)}`,
      name: 'MachRio',
      slug: 'machrio',
      domain: 'machrio.com',
      plan: 'pro',
      status: 'active',
      settings: {
        websiteDomain: 'machrio.com',
        brandName: 'MachRio',
        locale: 'en',
      },
    },
  });
  console.log('✅ 租户创建成功:', tenant.id);

  // 2. 创建 SUPER_ADMIN 角色（如果不存在）
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        id: `role-super-${randomUUID().slice(0, 8)}`,
        name: 'SUPER_ADMIN',
        displayName: '超级管理员',
        permissions: {
          all: true,
          tenants: ['read', 'write', 'delete'],
          users: ['read', 'write', 'delete'],
          assets: ['read', 'write', 'delete'],
          radar: ['read', 'write', 'delete'],
          marketing: ['read', 'write', 'delete'],
        },
        isSystemRole: true,
      },
    });
    console.log('✅ SUPER_ADMIN 角色创建成功');
  }

  // 3. 创建 COMPANY_ADMIN 角色（如果不存在）
  let companyAdminRole = await prisma.role.findUnique({
    where: { name: 'COMPANY_ADMIN' },
  });

  if (!companyAdminRole) {
    companyAdminRole = await prisma.role.create({
      data: {
        id: `role-comp-${randomUUID().slice(0, 8)}`,
        name: 'COMPANY_ADMIN',
        displayName: '企业管理员',
        permissions: {
          assets: ['read', 'write'],
          radar: ['read', 'write'],
          marketing: ['read', 'write'],
          knowledge: ['read', 'write'],
        },
        isSystemRole: true,
      },
    });
    console.log('✅ COMPANY_ADMIN 角色创建成功');
  }

  // 4. 创建管理员用户
  const hashedPassword = await hash('machrio2024', 10);
  const adminUser = await prisma.user.create({
    data: {
      id: `user-machrio-admin-${randomUUID().slice(0, 8)}`,
      email: 'admin@machrio.com',
      name: 'MachRio Admin',
      tenantId: tenant.id,
      roleId: companyAdminRole.id,
      locale: 'en',
      timezone: 'America/New_York',
    },
  });

  // 创建账户（密码登录）
  await prisma.account.create({
    data: {
      id: `acc-${randomUUID().slice(0, 8)}`,
      userId: adminUser.id,
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: adminUser.email,
      access_token: hashedPassword,
    },
  });
  console.log('✅ 管理员用户创建成功:', adminUser.email);

  // 5. 创建默认内容分类
  const categories = ['Article', 'Product', 'Case Study', 'News'];
  for (let i = 0; i < categories.length; i++) {
    await prisma.contentCategory.create({
      data: {
        id: `cat-machrio-${randomUUID().slice(0, 8)}`,
        tenantId: tenant.id,
        name: categories[i],
        slug: categories[i].toLowerCase().replace(/ /g, '-'),
        order: i,
      },
    });
  }
  console.log('✅ 内容分类创建成功');

  // 6. 创建默认 ICP Segment
  const defaultSegment = await prisma.iCPSegment.create({
    data: {
      id: `segment-machrio-${randomUUID().slice(0, 8)}`,
      tenantId: tenant.id,
      name: 'Target Customers',
      description: 'Default ICP segment for MachRio',
      criteria: {},
    },
  });
  console.log('✅ 默认ICP细分创建成功');

  // 7. 创建默认 RadarSearchProfile
  const radarProfile = await prisma.radarSearchProfile.create({
    data: {
      id: `profile-machrio-${randomUUID().slice(0, 8)}`,
      tenantId: tenant.id,
      name: 'Default Discovery Profile',
      description: 'Auto-created default discovery profile',
      segmentId: defaultSegment.id,
      keywords: { en: ['machinery', 'equipment', 'manufacturing'] },
      targetCountries: ['US', 'CA', 'GB', 'DE', 'AU'],
      targetRegions: ['NA', 'EU', 'APAC'],
      enabledChannels: ['MAPS', 'DIRECTORY'],
      sourceIds: [],
      isActive: true,
      scheduleRule: '0 6 * * *',
    },
  });
  console.log('✅ 默认雷达配置创建成功');

  // 8. 创建 WebsiteConfig
  await prisma.websiteConfig.create({
    data: {
      id: `webconfig-machrio-${randomUUID().slice(0, 8)}`,
      tenantId: tenant.id,
      url: 'https://machrio.com',
      siteType: 'custom',
      isActive: true,
      seoDefaults: {
        metaTitleTemplate: '{title} | MachRio',
        defaultDescription: 'MachRio - Industrial Machinery & Equipment',
      },
    },
  });
  console.log('✅ 网站配置创建成功');

  console.log('\n========================================');
  console.log('🎉 MachRio 租户创建完成！');
  console.log('========================================');
  console.log('租户ID:', tenant.id);
  console.log('管理员邮箱: admin@machrio.com');
  console.log('管理员密码: machrio2024');
  console.log('登录地址: https://machrio.vertax.top');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('❌ 创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
