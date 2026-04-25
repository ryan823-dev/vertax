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
      <main className="ci-work-surface relative min-w-0 flex-1 lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <div className="relative flex min-h-screen flex-col lg:h-full lg:min-h-0">
          <CustomerHeader tenantName={tenantName} tenantSlug={tenantSlug} />
          <section className="flex-1 lg:min-h-0">
            <div className="px-4 pb-8 pt-4 sm:px-5 lg:scrollbar-hide lg:h-full lg:overflow-y-auto lg:px-7 lg:pb-10 lg:pt-6">
              <div className="mx-auto max-w-[1720px]">{children}</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
