import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer/customer-shell";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/permissions";
import { getTenantCanonicalRedirectUrl } from "@/lib/tenant-resolver";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isPlatformAdminUser = isPlatformAdmin({
    permissions: (session.user.permissions as string[]) ?? [],
    roleName: session.user.roleName ?? "",
  });

  if (isPlatformAdminUser && !session.user.tenantId) {
    redirect("/tower");
  }

  if (!isPlatformAdminUser && (!session.user.tenantId || !session.user.tenantSlug)) {
    redirect("/login");
  }

  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ??
    headersList.get("host") ??
    "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const currentPath = headersList.get("x-vertax-current-path") ?? "/customer/home";
  const currentSearch = headersList.get("x-vertax-current-search") ?? "";

  const canonicalTenantUrl = !isPlatformAdminUser
    ? getTenantCanonicalRedirectUrl({
        currentUrl: `${protocol}://${host}${currentPath}${currentSearch}`,
        sessionTenantSlug: session.user.tenantSlug,
      })
    : null;

  if (canonicalTenantUrl) {
    redirect(canonicalTenantUrl);
  }

  return (
    <CustomerShell
      tenantName={session.user.tenantName}
      tenantSlug={session.user.tenantSlug}
    >
      {children}
    </CustomerShell>
  );
}
