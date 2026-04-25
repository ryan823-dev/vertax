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
    <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--ci-border)] bg-[var(--ci-header-bg)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 pl-14 pr-3 sm:px-5 lg:h-[60px] lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="truncate text-sm font-semibold text-[var(--ci-text)] sm:max-w-[15rem]"
                title={tenantName}
              >
                {tenantName}
              </span>
              <span className="hidden h-1.5 w-1.5 rounded-full bg-[var(--ci-success)] md:inline-flex" />
              <span className="hidden text-xs font-medium text-[var(--ci-success)] md:inline">
                引擎在线
              </span>
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <span className="ci-kicker">Workspace</span>
              <span
                className="hidden truncate font-mono text-[11px] text-[var(--ci-text-muted)] sm:inline"
                title={`${tenantSlug}.vertax.top`}
              >
                {tenantSlug}.vertax.top
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />

          <div className="hidden items-center gap-2 border-l border-[var(--ci-border)] pl-3 md:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--ci-accent-soft)] text-xs font-semibold text-[var(--ci-accent-strong)]">
              决
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--ci-text-secondary)]">
              <Shield size={12} className="text-[var(--ci-accent-strong)]" />
              决策者
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--ci-border)] bg-white/70 px-2.5 text-sm text-[var(--ci-text-secondary)] transition-colors hover:border-[var(--ci-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-accent)]/30 disabled:opacity-50 sm:px-3"
            title="退出登录"
          >
            <LogOut size={14} />
            <span className="hidden text-xs font-medium sm:inline">
              {isSigningOut ? "退出中..." : "退出"}
            </span>
          </button>
        </div>
      </div>
      <div className="hidden border-t border-[var(--ci-border)] bg-white/30 px-6 py-1.5 text-xs text-[var(--ci-text-muted)] lg:flex">
        <Activity size={13} className="mr-1.5 text-[var(--ci-accent-strong)]" />
        Calm Intelligence workbench
      </div>
    </header>
  );
}
