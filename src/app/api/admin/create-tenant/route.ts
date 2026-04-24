import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import {
  COMPANY_ADMIN_ROLE_CANDIDATES,
  isPlatformAdminRoleName,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

interface CreateTenantRequest {
  name: string;
  slug: string;
  domain: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  plan?: string;
}

async function getCompanyAdminRole() {
  const candidates = await prisma.role.findMany({
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

  const existingRole = COMPANY_ADMIN_ROLE_CANDIDATES
    .map((name) => candidates.find((candidate) => candidate.name === name))
    .find(
      (
        candidate
      ): candidate is {
        id: string;
        name: string;
      } => Boolean(candidate)
    );

  if (existingRole) {
    return existingRole;
  }

  return prisma.role.create({
    data: {
      name: "COMPANY_ADMIN",
      displayName: "企业管理员",
      permissions: {
        assets: ["read", "write"],
        radar: ["read", "write"],
        marketing: ["read", "write"],
        knowledge: ["read", "write"],
      },
      isSystemRole: true,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!isPlatformAdminRoleName(user?.role?.name)) {
      return NextResponse.json(
        { error: "Forbidden: platform admin only" },
        { status: 403 }
      );
    }

    const body: CreateTenantRequest = await req.json();
    const {
      name,
      slug,
      domain,
      adminEmail,
      adminPassword,
      adminName,
      plan = "free",
    } = body;

    if (!name || !slug || !domain || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      return NextResponse.json(
        { error: "Tenant slug already exists" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Admin email already exists" },
        { status: 400 }
      );
    }

    const companyAdminRole = await getCompanyAdminRole();

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        domain,
        plan,
        status: "active",
        settings: {
          websiteDomain: domain,
          brandName: name,
          locale: "en",
        },
      },
    });

    const hashedPassword = await hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName || `${name} Admin`,
        password: hashedPassword,
        tenantId: tenant.id,
        roleId: companyAdminRole.id,
        locale: "en",
        timezone: "America/New_York",
      },
    });

    await prisma.account.create({
      data: {
        userId: adminUser.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: adminEmail,
        access_token: hashedPassword,
      },
    });

    const categories = ["Article", "Product", "Case Study", "News"];
    for (let i = 0; i < categories.length; i++) {
      await prisma.contentCategory.create({
        data: {
          tenantId: tenant.id,
          name: categories[i],
          slug: categories[i].toLowerCase().replace(/ /g, "-"),
          order: i,
        },
      });
    }

    const defaultSegment = await prisma.iCPSegment.create({
      data: {
        tenantId: tenant.id,
        name: "Target Customers",
        description: `Default ICP segment for ${name}`,
        criteria: {},
      },
    });

    await prisma.radarSearchProfile.create({
      data: {
        tenantId: tenant.id,
        name: "Default Discovery Profile",
        description: "Auto-created default discovery profile",
        segmentId: defaultSegment.id,
        keywords: { en: ["machinery", "equipment", "manufacturing"] },
        targetCountries: ["US", "CA", "GB", "DE", "AU"],
        targetRegions: ["NA", "EU", "APAC"],
        enabledChannels: ["MAPS", "DIRECTORY"],
        sourceIds: [],
        isActive: true,
        scheduleRule: "0 6 * * *",
      },
    });

    await prisma.websiteConfig.create({
      data: {
        tenantId: tenant.id,
        url: `https://${domain}`,
        siteType: "custom",
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
    console.error("Create tenant error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
