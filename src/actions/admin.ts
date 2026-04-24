"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { COMPANY_ADMIN_ROLE_CANDIDATES, isPlatformAdmin } from "@/lib/permissions";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requirePlatformAdmin() {
  const session = await auth();
  if (
    !isPlatformAdmin({
      permissions: (session?.user?.permissions as string[]) ?? [],
      roleName: (session?.user?.roleName as string) ?? "",
    })
  ) {
    throw new Error("Unauthorized");
  }
  return session!;
}

export async function getTenantStats() {
  await requirePlatformAdmin();
  const [tenantCount, userCount] = await Promise.all([
    db.tenant.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null } }),
  ]);
  return { tenantCount, userCount };
}

export async function getTenants() {
  await requirePlatformAdmin();
  return db.tenant.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTenantDetail(id: string) {
  await requirePlatformAdmin();
  return db.tenant.findUnique({
    where: { id },
    include: {
      users: {
        where: { deletedAt: null },
        include: { role: true },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          products: true,
          seoContents: true,
          socialPosts: true,
          leads: true,
        },
      },
    },
  });
}

export async function createTenantWithAdmin(data: {
  companyName: string;
  slug: string;
  plan: string;
  adminName: string;
  adminEmail: string;
  password: string;
  domain?: string; // 外贸网站域名
}): Promise<{ success: boolean; error?: string; tenantId?: string; loginUrl?: string }> {
  await requirePlatformAdmin();

  const { companyName, slug, plan, adminName, adminEmail, password, domain } = data;

  // Validate email uniqueness
  const existingUser = await db.user.findUnique({
    where: { email: adminEmail },
  });
  if (existingUser) {
    return { success: false, error: "emailExists" };
  }

  // Validate slug uniqueness
  const existingTenant = await db.tenant.findUnique({
    where: { slug },
  });
  if (existingTenant) {
    return { success: false, error: "slugExists" };
  }

  const roleCandidates = await db.role.findMany({
    where: {
      name: {
        in: [...COMPANY_ADMIN_ROLE_CANDIDATES],
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const role = COMPANY_ADMIN_ROLE_CANDIDATES
    .map((roleName) =>
      roleCandidates.find((candidate) => candidate.name === roleName)
    )
    .find(
      (
        candidate
      ): candidate is {
        id: string;
        name: string;
      } => Boolean(candidate)
    );

  if (!role) {
    return { success: false, error: "roleNotFound" };
  }

  const hashedPassword = await hash(password, 10);
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'vertax.top';

  // Create tenant with all default configurations
  const tenant = await db.tenant.create({
    data: {
      name: companyName,
      slug,
      domain: domain || null,
      plan,
      status: "active",
      settings: {
        websiteDomain: domain || null,
        brandName: companyName,
        locale: 'en',
      },
      users: {
        create: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          roleId: role.id,
          locale: 'en',
        },
      },
      categories: {
        createMany: {
          data: [
            { name: "Article", slug: "article", description: "Blog articles", order: 0 },
            { name: "Product", slug: "product", description: "Product pages", order: 1 },
            { name: "Case Study", slug: "case-study", description: "Customer case studies", order: 2 },
            { name: "News", slug: "news", description: "Company news", order: 3 },
          ],
        },
      },
    },
    include: { users: true },
  });

  const adminUser = tenant.users[0];

  // 创建账户（密码登录）
  await db.account.create({
    data: {
      userId: adminUser.id,
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: adminEmail,
      access_token: hashedPassword,
    },
  });

  // 创建默认 ICP Segment
  const defaultSegment = await db.iCPSegment.create({
    data: {
      tenantId: tenant.id,
      name: 'Target Customers',
      description: `Default ICP segment for ${companyName}`,
      criteria: {},
    },
  });

  // 创建默认 RadarSearchProfile
  await db.radarSearchProfile.create({
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
  if (domain) {
    await db.websiteConfig.create({
      data: {
        tenantId: tenant.id,
        url: `https://${domain}`,
        siteType: 'custom',
        isActive: true,
        seoDefaults: {
          metaTitleTemplate: `{title} | ${companyName}`,
          defaultDescription: `${companyName} - Industrial Solutions`,
        },
      },
    });
  }

  revalidatePath("/zh-CN/admin");
  revalidatePath("/en/admin");

  return {
    success: true,
    tenantId: tenant.id,
    loginUrl: `https://${slug}.${baseDomain}`,
  };
}

export async function updateTenantStatus(
  id: string,
  status: "active" | "suspended"
): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin();

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return { success: false, error: "notFound" };
  }

  await db.tenant.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/zh-CN/admin");
  revalidatePath("/en/admin");
  revalidatePath(`/zh-CN/admin/tenants/${id}`);
  revalidatePath(`/en/admin/tenants/${id}`);
  return { success: true };
}
