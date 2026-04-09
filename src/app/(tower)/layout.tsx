import { TowerSidebar } from "@/components/tower/tower-sidebar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/permissions";

export default async function TowerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !isPlatformAdmin({
      permissions: (session.user.permissions as string[]) ?? [],
      roleName: session.user.roleName ?? "",
    })
  ) {
    redirect(session.user.tenantId ? "/customer/home" : "/login");
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex min-h-screen bg-[#f8f9fb]">
        <TowerSidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
