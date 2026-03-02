"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/constants";
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
}): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin();

  const { companyName, slug, plan, adminName, adminEmail, password } = data;

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

  // Get COMPANY_ADMIN role
  const role = await db.role.findUnique({
    where: { name: ROLES.COMPANY_ADMIN },
  });
  if (!role) {
    return { success: false, error: "roleNotFound" };
  }

  const hashedPassword = await hash(password, 10);

  // Create tenant with admin user and default categories
  await db.tenant.create({
    data: {
      name: companyName,
      slug,
      plan,
      status: "active",
      users: {
        create: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          roleId: role.id,
        },
      },
      categories: {
        createMany: {
          data: [
            { name: "Blog", slug: "blog", description: "博客文章", order: 0 },
            {
              name: "Buy Guide",
              slug: "buy-guide",
              description: "采购指南",
              order: 1,
            },
            {
              name: "Whitepaper",
              slug: "whitepaper",
              description: "白皮书",
              order: 2,
            },
          ],
        },
      },
    },
  });

  revalidatePath("/zh-CN/admin");
  revalidatePath("/en/admin");
  return { success: true };
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
