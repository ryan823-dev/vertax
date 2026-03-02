import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create system roles
  const platformAdmin = await prisma.role.upsert({
    where: { name: "PLATFORM_ADMIN" },
    update: {},
    create: {
      name: "PLATFORM_ADMIN",
      displayName: "平台管理员",
      isSystemRole: true,
      permissions: [
        "platform.*",
        "tenants.*",
        "products.*",
        "seo.*",
        "social.*",
        "leads.*",
        "settings.*",
      ],
    },
  });

  const companyAdmin = await prisma.role.upsert({
    where: { name: "COMPANY_ADMIN" },
    update: {},
    create: {
      name: "COMPANY_ADMIN",
      displayName: "企业管理员",
      isSystemRole: true,
      permissions: [
        "products.*",
        "seo.*",
        "social.*",
        "leads.*",
        "settings.*",
        "team.*",
      ],
    },
  });

  const companyMember = await prisma.role.upsert({
    where: { name: "COMPANY_MEMBER" },
    update: {},
    create: {
      name: "COMPANY_MEMBER",
      displayName: "企业成员",
      isSystemRole: true,
      permissions: [
        "products.read",
        "products.create",
        "products.edit",
        "seo.read",
        "seo.create",
        "seo.edit",
        "social.read",
        "social.create",
        "social.edit",
        "leads.read",
        "leads.create",
        "leads.edit",
      ],
    },
  });

  await prisma.role.upsert({
    where: { name: "VIEWER" },
    update: {},
    create: {
      name: "VIEWER",
      displayName: "查看者",
      isSystemRole: true,
      permissions: [
        "products.read",
        "seo.read",
        "social.read",
        "leads.read",
      ],
    },
  });

  // Create platform admin tenant
  const adminTenant = await prisma.tenant.upsert({
    where: { slug: "platform" },
    update: {},
    create: {
      name: "平台管理",
      slug: "platform",
      plan: "enterprise",
      status: "active",
    },
  });

  // Create platform admin user
  const adminPassword = await hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@platform.com" },
    update: {},
    create: {
      email: "admin@platform.com",
      name: "平台管理员",
      password: adminPassword,
      tenantId: adminTenant.id,
      roleId: platformAdmin.id,
    },
  });

  // Create test tenant
  const testTenant = await prisma.tenant.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "示例工业公司",
      slug: "demo-company",
      plan: "pro",
      status: "active",
    },
  });

  // Create test company admin
  const companyPassword = await hash("demo123", 10);
  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "张三",
      password: companyPassword,
      tenantId: testTenant.id,
      roleId: companyAdmin.id,
    },
  });

  // Create test company member
  await prisma.user.upsert({
    where: { email: "member@demo.com" },
    update: {},
    create: {
      email: "member@demo.com",
      name: "李四",
      password: companyPassword,
      tenantId: testTenant.id,
      roleId: companyMember.id,
    },
  });

  // Create sample content categories for test tenant
  const categoryData = [
    { name: "Blog", slug: "blog", description: "博客文章", icon: "FileText", order: 0 },
    { name: "Buy Guide", slug: "buy-guide", description: "采购指南", icon: "ShoppingCart", order: 1 },
    { name: "Whitepaper", slug: "whitepaper", description: "白皮书", icon: "BookOpen", order: 2 },
    { name: "Case Study", slug: "case-study", description: "客户案例", icon: "Trophy", order: 3 },
  ];

  for (const cat of categoryData) {
    await prisma.contentCategory.upsert({
      where: {
        tenantId_slug: { tenantId: testTenant.id, slug: cat.slug },
      },
      update: {},
      create: {
        tenantId: testTenant.id,
        ...cat,
      },
    });
  }

  // Create website config for test tenant
  await prisma.websiteConfig.upsert({
    where: { tenantId: testTenant.id },
    update: {},
    create: {
      tenantId: testTenant.id,
      url: "https://demo-company.example.com",
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
