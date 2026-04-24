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
    <div className="customer-theme min-h-screen bg-[#F5F7FA] text-[#0F172A] lg:flex">
      <CustomerSidebar tenantName={tenantName} tenantSlug={tenantSlug} />
      <main className="min-w-0 flex-1 lg:h-screen lg:overflow-hidden">
        <div className="flex min-h-screen flex-col lg:h-full">
          <CustomerHeader tenantName={tenantName} tenantSlug={tenantSlug} />
          <section className="flex-1 bg-[#F5F7FA]">
            <div className="scrollbar-hide h-full overflow-y-auto px-4 pb-6 pt-4 lg:px-5">
              <div className="mx-auto max-w-[1720px]">{children}</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
