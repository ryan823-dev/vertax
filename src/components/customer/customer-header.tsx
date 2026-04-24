"use client";

import { useState } from "react";
import { Activity, LogOut, Shield } from "lucide-react";
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
    <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--ci-border)] bg-[var(--ci-header-bg)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 pl-14 pr-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="ci-panel flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 sm:px-4">
            <div className="flex min-w-0 flex-col">
              <span className="ci-kicker">Workspace</span>
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="max-w-[9rem] truncate text-sm font-semibold text-[var(--ci-text)] sm:max-w-[13rem]"
                  title={tenantName}
                >
                  {tenantName}
                </span>
                <span className="hidden rounded-full border border-[rgba(79,141,246,0.18)] bg-[rgba(79,141,246,0.1)] px-2 py-0.5 font-mono text-[11px] text-[var(--ci-accent-strong)] md:inline-flex">
                  {tenantSlug}.vertax.top
                </span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-[rgba(15,159,110,0.15)] bg-[rgba(15,159,110,0.08)] px-3 py-2 md:flex">
            <Activity size={14} className="text-[var(--ci-success)]" />
            <span className="text-xs font-medium text-[var(--ci-success)]">
              引擎在线
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />

          <div className="ci-panel hidden select-none items-center gap-2 rounded-full px-2 py-1.5 sm:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(79,141,246,0.14)] text-xs font-semibold text-[var(--ci-accent-strong)]">
              决
            </div>
            <div className="hidden items-center gap-1.5 pr-1 md:flex">
              <Shield size={12} className="text-[var(--ci-accent-strong)]" />
              <span className="text-xs font-semibold text-[var(--ci-text-secondary)]">
                决策者
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-border)] bg-white/70 px-3.5 py-2 text-sm text-[var(--ci-text-secondary)] transition-all hover:border-[var(--ci-border-strong)] hover:bg-white disabled:opacity-50"
            title="退出登录"
          >
            <LogOut size={14} />
            <span className="hidden text-xs font-medium sm:inline">
              {isSigningOut ? "退出中..." : "退出"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
