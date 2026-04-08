"use client";

import { TowerSidebar } from "@/components/tower/tower-sidebar";

export default function TowerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
