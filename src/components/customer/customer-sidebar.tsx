"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getNavItemsByGroup,
  getSortedGroups,
  getSortedSubItems,
  type HealthIndicator,
  type NavGroupKey,
  type NavItem,
} from "@/config/nav";

interface CustomerSidebarProps {
  tenantName?: string;
  tenantSlug?: string;
  badgeData?: {
    "approvals.pending"?: number;
    [key: string]: number | undefined;
  };
  healthData?: {
    "radar.status"?: HealthIndicator;
    "marketing.status"?: HealthIndicator;
    "knowledge.status"?: HealthIndicator;
    "social.status"?: HealthIndicator;
    [key: string]: HealthIndicator | undefined;
  };
}

const STORAGE_KEY = "vertax-nav-expanded";

export function CustomerSidebar({
  tenantName = "客户企业",
  tenantSlug = "tenant",
  badgeData = {},
  healthData = {},
}: CustomerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const pathname = usePathname();

  const groups = useMemo(() => getSortedGroups(), []);
  const itemsByGroup = useMemo(() => getNavItemsByGroup(), []);
  const initials = (tenantSlug?.substring(0, 2) || "VT").toUpperCase();

  useEffect(() => {
    setMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- close drawer after route navigation
  }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setExpandedNav(stored); // eslint-disable-line react-hooks/set-state-in-effect -- hydrate persisted nav preference on mount
      return;
    }

    const navGroups = getNavItemsByGroup();
    for (const groupKey of Object.keys(navGroups) as NavGroupKey[]) {
      for (const item of navGroups[groupKey]) {
        if (pathname?.startsWith(item.href)) {
          setExpandedNav(item.key);
          return;
        }
      }
    }
  }, [pathname]);

  const toggleExpand = (key: string) => {
    setExpandedNav((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        localStorage.setItem(STORAGE_KEY, next);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      return next;
    });
  };

  const isActive = (href: string) => pathname?.startsWith(href);
  const isExactActive = (href: string) =>
    pathname === href || pathname?.endsWith(href);

  const getBadgeCount = (source?: string): number | undefined => {
    if (!source) return undefined;
    return badgeData[source];
  };

  const getHealthStatus = (
    source?: string,
  ): HealthIndicator | undefined => {
    if (!source) return undefined;
    return healthData[source];
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 rounded-2xl border border-[rgba(79,141,246,0.2)] bg-[rgba(28,40,58,0.88)] p-2.5 text-white shadow-[0_18px_32px_-18px_rgba(15,23,38,0.56)] lg:hidden"
        aria-label="打开导航菜单"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(15,23,38,0.34)] backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          collapsed ? "w-[84px]" : "w-[280px]"
        } ci-sidebar-shell relative hidden h-screen flex-col overflow-hidden border-r border-[var(--ci-sidebar-border)] transition-all duration-300 lg:sticky lg:top-0 lg:flex ${
          mobileOpen ? "!fixed !inset-y-0 !left-0 !z-50 !flex shadow-2xl" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,rgba(79,141,246,0.16),transparent_44%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_36%)] opacity-90" />
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full border border-[rgba(255,255,255,0.08)] p-1.5 text-[rgba(226,232,240,0.7)] transition-colors hover:text-white lg:hidden"
            aria-label="关闭导航菜单"
          >
            <X size={16} />
          </button>
        )}

        <div className={`${collapsed ? "px-4 py-5" : "px-5 py-5"} relative border-b border-[var(--ci-sidebar-border)]`}>
          <div
            className={`rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.05))] p-4 shadow-[0_20px_34px_-30px_rgba(15,23,38,0.54)] ${
              collapsed ? "flex justify-center" : ""
            }`}
          >
            <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-sm font-black text-white shadow-[0_20px_30px_-18px_rgba(79,141,246,0.85)]">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold tracking-tight text-white">
                    {tenantName}
                  </h1>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--ci-sidebar-muted)]">
                    Calm Intelligence
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="scrollbar-exec flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, groupIndex) => {
            const items = itemsByGroup[group.key] || [];
            if (items.length === 0) return null;

            return (
              <div key={group.key} className={groupIndex > 0 ? "mt-6" : ""}>
                {!collapsed ? (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ci-sidebar-muted)]">
                    {group.label}
                  </p>
                ) : groupIndex > 0 ? (
                  <div className="mx-3 mb-3 border-t border-[var(--ci-sidebar-border)]" />
                ) : null}

                <div className={`${collapsed ? "space-y-1 px-1" : "space-y-1"}`}>
                  {items.map((item) => (
                    <NavItemRow
                      key={item.key}
                      item={item}
                      collapsed={collapsed}
                      isActive={isActive(item.href)}
                      isExpanded={expandedNav === item.key && !collapsed}
                      isExactActive={isExactActive}
                      healthStatus={getHealthStatus(item.healthSource)}
                      badgeCount={getBadgeCount(item.badge?.source)}
                      onToggleExpand={() => toggleExpand(item.key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={`${collapsed ? "px-3" : "px-4"} border-t border-[var(--ci-sidebar-border)] py-4`}>
          {!collapsed && (
            <div className="mb-3 rounded-[24px] border border-[rgba(148,163,184,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.05))] p-3.5 shadow-[0_18px_28px_-26px_rgba(15,23,38,0.52)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent)]">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">VertaX AI Engine</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--ci-success)]" />
                    <span className="text-xs text-[var(--ci-sidebar-muted)]">
                      工作流持续运行中
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-2xl border border-transparent py-2.5 text-[rgba(226,232,240,0.58)] transition-colors hover:border-[rgba(148,163,184,0.12)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}

interface NavItemRowProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  isExpanded: boolean;
  isExactActive: (href: string) => boolean;
  healthStatus?: HealthIndicator;
  badgeCount?: number;
  onToggleExpand: () => void;
}

function NavItemRow({
  item,
  collapsed,
  isActive,
  isExpanded,
  isExactActive,
  healthStatus,
  badgeCount,
  onToggleExpand,
}: NavItemRowProps) {
  const IconComponent = item.icon;
  const sortedSubItems = getSortedSubItems(item);
  const hasSubItems = sortedSubItems.length > 0;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          title={collapsed ? item.label : undefined}
          className={`group relative flex flex-1 items-center rounded-2xl transition-all ${
            collapsed ? "justify-center px-2 py-3" : "px-3 py-3"
          } ${
            isActive
              ? "border border-[rgba(79,141,246,0.18)] bg-[linear-gradient(135deg,rgba(79,141,246,0.16),rgba(255,255,255,0.08))] text-white shadow-[0_18px_32px_-24px_rgba(79,141,246,0.34)]"
              : "border border-transparent text-[var(--ci-sidebar-text)] hover:bg-[var(--ci-sidebar-hover)] hover:text-white"
          }`}
        >
          <div className="relative shrink-0">
            <IconComponent
              size={18}
              strokeWidth={1.8}
              className={isActive ? "text-[var(--ci-accent)]" : "text-[var(--ci-sidebar-muted)] transition-colors group-hover:text-white"}
            />
            {healthStatus && !isActive ? (
              <div
                className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${
                  healthStatus === "red"
                    ? "bg-[var(--ci-danger)]"
                    : healthStatus === "amber"
                      ? "bg-[var(--ci-warning)]"
                      : "bg-[var(--ci-success)]"
                }`}
              />
            ) : null}
          </div>

          {!collapsed && (
            <span className="ml-3 flex-1 truncate text-[13px] font-medium">
              {item.label}
            </span>
          )}

          {!collapsed && badgeCount !== undefined && badgeCount > 0 ? (
            <span className="ml-2 rounded-full bg-[rgba(79,141,246,0.16)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ci-accent)]">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </Link>

        {hasSubItems && !collapsed ? (
          <button
            onClick={onToggleExpand}
            className="ml-1 flex min-h-[28px] min-w-[28px] items-center justify-center rounded-xl p-2 text-[var(--ci-sidebar-muted)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
            aria-label={isExpanded ? `收起 ${item.label}` : `展开 ${item.label}`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>

      {hasSubItems && isExpanded ? (
        <div className="ml-5 mt-1 space-y-1 border-l border-[var(--ci-sidebar-border)] pl-4">
          {sortedSubItems.map((sub) => {
            const SubIcon = sub.icon;
            const subActive = isExactActive(sub.href);
            return (
              <Link
                key={sub.key}
                href={sub.href}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[12px] transition-all ${
                  subActive
                    ? "bg-[rgba(79,141,246,0.12)] font-medium text-[var(--ci-accent)]"
                    : "text-[var(--ci-sidebar-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
                }`}
              >
                <SubIcon size={14} className={subActive ? "text-[var(--ci-accent)]" : ""} />
                <span className="flex-1 truncate">{sub.label}</span>
                {sub.badge?.type === "premium" && sub.badge.text ? (
                  <span className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.1)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--gold-primary)]">
                    {sub.badge.text}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export enum CustomerNavItem {
  StrategicHome = "strategic-home",
  KnowledgeEngine = "knowledge",
  OutreachRadar = "radar",
  MarketingDrive = "marketing",
  SocialPresence = "social",
  PromotionHub = "hub",
}
