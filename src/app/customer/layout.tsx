"use client";

import { useSession } from "next-auth/react";
import { CustomerSidebar } from '@/components/customer/customer-sidebar';
import { CustomerHeader } from '@/components/customer/customer-header';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const tenantName = session?.user?.tenantName;
  const tenantSlug = session?.user?.tenantSlug;

  return (
    <div className="customer-theme flex min-h-screen bg-[#F7F3EA] text-[#111827]">
      <CustomerSidebar tenantName={tenantName} tenantSlug={tenantSlug} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <CustomerHeader
          tenantName={tenantName}
          tenantSlug={tenantSlug}
        />
        <section className="flex-1 overflow-y-auto bg-[#F7F3EA] scrollbar-hide">
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto p-4 lg:p-5 scrollbar-hide">
              <div className="max-w-[1720px] mx-auto">
                {children}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
