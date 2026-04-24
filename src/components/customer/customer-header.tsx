"use client";

import { useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationBell } from "./notification-bell";

interface CustomerHeaderProps {
  tenantName?: string;
  tenantSlug?: string;
}

export function CustomerHeader({
  tenantName = "客户企业",
  tenantSlug = "tenant",
}: CustomerHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header
      className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] pl-14 pr-4 sm:px-5"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="flex min-w-0 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm"
          style={{
            background: "#F8FAFC",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
            项目
          </span>
          <span
            className="max-w-[11rem] truncate text-[13px] font-semibold text-[#0F172A]"
            title={tenantName}
          >
            {tenantName}
          </span>
          <span
            className="hidden rounded px-1.5 py-0.5 font-mono text-[10px] md:inline-flex"
            style={{
              background: "rgba(59,130,246,0.08)",
              color: "#3B82F6",
              border: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            {tenantSlug}.vertax.top
          </span>
        </div>

        <div
          className="hidden items-center gap-1.5 rounded-lg border border-[rgba(16,185,129,0.15)] px-2.5 py-1 sm:flex"
          style={{ background: "rgba(16,185,129,0.06)" }}
        >
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
          <span className="text-[10px] font-medium text-[#10B981]">
            引擎运行中
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <NotificationBell />

        <div
          className="hidden select-none items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.2)] pl-1.5 pr-3 py-1 sm:flex"
          style={{
            background: "rgba(212,175,55,0.05)",
          }}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{ background: "#D4AF37", color: "#FFFFFF" }}
          >
            决
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <Shield size={9} style={{ color: "#D4AF37" }} />
            <span className="text-[11px] font-bold text-[#D4AF37]">
              决策者
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#475569] transition-all hover:bg-[#F1F5F9] disabled:opacity-50"
          title="退出登录"
        >
          <LogOut size={14} />
          <span className="hidden text-xs font-medium sm:inline">退出</span>
        </button>
      </div>
    </header>
  );
}
