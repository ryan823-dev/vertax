"use client";

import { useState } from 'react';
import { CustomerSidebar } from '@/components/customer/customer-sidebar';
import { CustomerHeader } from '@/components/customer/customer-header';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showAI, setShowAI] = useState(false);

  // TODO: Get tenant info from context/server
  const tenantName = '涂豆科技';
  const tenantSlug = 'tdpaintcell';

  return (
    <div className="customer-theme flex min-h-screen bg-[#F7F3EA] text-[#111827]">
      <CustomerSidebar tenantName={tenantName} tenantSlug={tenantSlug} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <CustomerHeader 
          tenantName={tenantName} 
          tenantSlug={tenantSlug}
          showAI={showAI}
          onToggleAI={() => setShowAI(!showAI)}
        />
        <section className="flex-1 overflow-y-auto bg-[#F7F3EA] scrollbar-hide">
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
            {/* AI Sidebar placeholder */}
            {showAI && (
              <div className="w-96 border-l border-[#E7E0D3] bg-[#FFFCF6] p-6">
                <h3 className="text-lg font-bold text-[#0B1B2B] mb-4">AI 顾问</h3>
                <p className="text-sm text-slate-500">AI 对话功能开发中...</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
