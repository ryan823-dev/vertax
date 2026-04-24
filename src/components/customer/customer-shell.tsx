"use client";

import { CustomerHeader } from "@/components/customer/customer-header";
import { CustomerSidebar } from "@/components/customer/customer-sidebar";

export function CustomerShell({
  children,
  tenantName,
  tenantSlug,
}: {
  children: React.ReactNode;
  tenantName?: string;
  tenantSlug?: string;
}) {
  return (
    <div className="customer-theme ci-shell-bg min-h-screen text-[var(--ci-text)] lg:flex">
      <CustomerSidebar tenantName={tenantName} tenantSlug={tenantSlug} />
      <main className="relative min-w-0 flex-1 lg:h-screen lg:overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,141,246,0.12),transparent_28%),radial-gradient(circle_at_78%_0%,rgba(15,159,110,0.08),transparent_22%),linear-gradient(180deg,transparent,rgba(255,255,255,0.12))]" />
        <div className="relative flex min-h-screen flex-col lg:h-full">
          <CustomerHeader tenantName={tenantName} tenantSlug={tenantSlug} />
          <section className="flex-1">
            <div className="scrollbar-hide h-full overflow-y-auto px-4 pb-8 pt-5 sm:px-5 lg:px-7 lg:pb-10">
              <div className="mx-auto max-w-[1720px]">{children}</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
