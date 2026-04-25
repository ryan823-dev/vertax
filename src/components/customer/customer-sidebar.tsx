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
        className="fixed left-3 top-3 z-50 rounded-lg border border-[rgba(148,163,184,0.24)] bg-[var(--ci-sidebar-shell)] p-2 text-white shadow-[0_12px_28px_-20px_rgba(15,23,38,0.7)] lg:hidden"
        aria-label="打开导航菜单"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(15,23,38,0.32)] backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          collapsed ? "w-[76px]" : "w-[264px]"
        } ci-sidebar-shell relative hidden h-screen flex-col overflow-hidden border-r border-[var(--ci-sidebar-border)] transition-[width] duration-200 lg:sticky lg:top-0 lg:flex ${
          mobileOpen
            ? "!fixed !inset-y-0 !left-0 !z-50 !flex shadow-[0_24px_64px_-32px_rgba(15,23,38,0.78)]"
            : ""
        }`}
      >
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-[rgba(226,232,240,0.72)] transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="关闭导航菜单"
          >
            <X size={16} />
          </button>
        )}

        <div
          className={`relative border-b border-[var(--ci-sidebar-border)] ${
            collapsed ? "px-3 py-4" : "px-4 py-4"
          }`}
        >
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ci-accent)] text-sm font-semibold text-white">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-white">
                  {tenantName}
                </h1>
                <p className="mt-0.5 truncate text-xs text-[var(--ci-sidebar-muted)]">
                  Calm Intelligence
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="scrollbar-exec flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group, groupIndex) => {
            const items = itemsByGroup[group.key] || [];
            if (items.length === 0) return null;

            return (
              <div key={group.key} className={groupIndex > 0 ? "mt-5" : ""}>
                {!collapsed ? (
                  <p className="mb-2 px-2 text-xs font-semibold text-[var(--ci-sidebar-muted)]">
                    {group.label}
                  </p>
                ) : groupIndex > 0 ? (
                  <div className="mx-2 mb-2 border-t border-[var(--ci-sidebar-border)]" />
                ) : null}

                <div className="space-y-1">
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

        <div
          className={`border-t border-[var(--ci-sidebar-border)] py-3 ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          {!collapsed && (
            <div className="mb-2 rounded-lg border border-[rgba(148,163,184,0.16)] bg-white/[0.04] p-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent)]">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    VertaX AI Engine
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ci-success)]" />
                    <span className="truncate text-xs text-[var(--ci-sidebar-muted)]">
                      工作流持续运行
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-md border border-transparent py-2 text-[rgba(226,232,240,0.62)] transition-colors hover:border-[rgba(148,163,184,0.14)] hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-accent)]/40"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
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
          className={`group relative flex flex-1 items-center rounded-lg border transition-colors ${
            collapsed ? "justify-center px-2 py-2.5" : "px-2.5 py-2.5"
          } ${
            isActive
              ? "border-[rgba(79,141,246,0.28)] bg-[var(--ci-sidebar-active)] text-white"
              : "border-transparent text-[var(--ci-sidebar-text)] hover:bg-[var(--ci-sidebar-hover)] hover:text-white"
          }`}
        >
          {isActive ? (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--ci-accent)]" />
          ) : null}
          <div className="relative shrink-0">
            <IconComponent
              size={18}
              strokeWidth={1.8}
              className={
                isActive
                  ? "text-[var(--ci-accent)]"
                  : "text-[var(--ci-sidebar-muted)] transition-colors group-hover:text-white"
              }
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
            className="ml-1 flex min-h-[28px] min-w-[28px] items-center justify-center rounded-md p-2 text-[var(--ci-sidebar-muted)] transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-accent)]/40"
            aria-label={isExpanded ? `收起 ${item.label}` : `展开 ${item.label}`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        ) : null}
      </div>

      {hasSubItems && isExpanded ? (
        <div className="ml-5 mt-1 space-y-1 border-l border-[var(--ci-sidebar-border)] pl-3">
          {sortedSubItems.map((sub) => {
            const SubIcon = sub.icon;
            const subActive = isExactActive(sub.href);
            return (
              <Link
                key={sub.key}
                href={sub.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] transition-colors ${
                  subActive
                    ? "bg-[rgba(79,141,246,0.12)] font-medium text-[var(--ci-accent)]"
                    : "text-[var(--ci-sidebar-muted)] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <SubIcon
                  size={14}
                  className={subActive ? "text-[var(--ci-accent)]" : ""}
                />
                <span className="flex-1 truncate">{sub.label}</span>
                {sub.badge?.type === "premium" && sub.badge.text ? (
                  <span className="rounded-full border border-[rgba(148,163,184,0.18)] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-[var(--ci-sidebar-muted)]">
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
