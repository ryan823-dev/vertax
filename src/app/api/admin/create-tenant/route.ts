/**
 * 创建新租户的API
 *
 * 仅限 SUPER_ADMIN 调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

interface CreateTenantRequest {
  name: string;
  slug: string;
  domain: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  plan?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 验证权限
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查是否是超级管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (user?.role?.name !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
    }

    const body: CreateTenantRequest = await req.json();
    const { name, slug, domain, adminEmail, adminPassword, adminName, plan = 'pro' } = body;

    // 验证必填字段
    if (!name || !slug || !domain || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 检查slug是否已存在
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      return NextResponse.json({ error: 'Tenant slug already exists' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Admin email already exists' }, { status: 400 });
    }

    // 获取 COMPANY_ADMIN 角色
    let companyAdminRole = await prisma.role.findUnique({
      where: { name: 'COMPANY_ADMIN' },
    });

    if (!companyAdminRole) {
      // 创建角色
      companyAdminRole = await prisma.role.create({
        data: {
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
    }

    // 创建租户
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        domain,
        plan,
        status: 'active',
        settings: {
          websiteDomain: domain,
          brandName: name,
          locale: 'en',
        },
      },
    });

    // 创建管理员用户
    const hashedPassword = await hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName || `${name} Admin`,
        tenantId: tenant.id,
        roleId: companyAdminRole.id,
        locale: 'en',
        timezone: 'America/New_York',
      },
    });

    // 创建账户（密码登录）
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: adminEmail,
        access_token: hashedPassword,
      },
    });

    // 创建默认内容分类
    const categories = ['Article', 'Product', 'Case Study', 'News'];
    for (let i = 0; i < categories.length; i++) {
      await prisma.contentCategory.create({
        data: {
          tenantId: tenant.id,
          name: categories[i],
          slug: categories[i].toLowerCase().replace(/ /g, '-'),
          order: i,
        },
      });
    }

    // 创建默认 ICP Segment
    const defaultSegment = await prisma.iCPSegment.create({
      data: {
        tenantId: tenant.id,
        name: 'Target Customers',
        description: `Default ICP segment for ${name}`,
        criteria: {},
      },
    });

    // 创建默认 RadarSearchProfile
    await prisma.radarSearchProfile.create({
      data: {
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

    // 创建 WebsiteConfig
    await prisma.websiteConfig.create({
      data: {
        tenantId: tenant.id,
        url: `https://${domain}`,
        siteType: 'custom',
        isActive: true,
        seoDefaults: {
          metaTitleTemplate: `{title} | ${name}`,
          defaultDescription: `${name} - Industrial Machinery & Equipment`,
        },
      },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
      },
      admin: {
        email: adminEmail,
        name: adminUser.name,
      },
      loginUrl: `https://${slug}.vertax.top`,
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}