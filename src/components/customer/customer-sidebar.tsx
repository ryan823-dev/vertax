"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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

  useEffect(() => {
    setMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- sync with route
  }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setExpandedNav(stored); // eslint-disable-line react-hooks/set-state-in-effect -- hydrate from localStorage
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        className="fixed left-3 top-3 z-50 rounded-lg p-2 text-white lg:hidden"
        style={{ background: "rgba(11,18,32,0.9)" }}
        aria-label="打开导航菜单"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-60"
        } hidden h-screen flex-col transition-all duration-300 lg:sticky lg:top-0 lg:flex ${
          mobileOpen ? "!fixed !inset-y-0 !left-0 !z-50 !flex shadow-2xl" : ""
        }`}
        style={{
          background: "linear-gradient(180deg, #1A1D23 0%, #16191F 100%)",
        }}
      >
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-4 z-10 p-1.5 text-[rgba(255,255,255,0.5)] transition-colors hover:text-white lg:hidden"
            aria-label="关闭导航菜单"
          >
            <X size={18} />
          </button>
        )}

        <div
          className={`${
            collapsed ? "px-4 py-6" : "px-5 py-6"
          } border-b border-[rgba(255,255,255,0.06)]`}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              style={{ background: "#3B82F6" }}
            >
              {tenantSlug?.substring(0, 2).toUpperCase() || "TD"}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="truncate text-sm font-bold tracking-tight text-white">
                  {tenantName}
                </h1>
                <p
                  className="text-[9px] font-bold uppercase tracking-widest opacity-60"
                  style={{ color: "#CBD5E1" }}
                >
                  GROWTH CHAMBER
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="scrollbar-exec flex-1 overflow-y-auto py-4">
          {groups.map((group, groupIndex) => {
            const items = itemsByGroup[group.key] || [];
            if (items.length === 0) return null;

            return (
              <div key={group.key} className={groupIndex > 0 ? "mt-5" : ""}>
                {!collapsed && (
                  <p className="mb-2 px-5 text-[9px] font-medium uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)]">
                    {group.label}
                  </p>
                )}
                {collapsed && groupIndex > 0 && (
                  <div className="mx-4 mb-3 border-t border-[rgba(255,255,255,0.06)]" />
                )}
                <div className={`${collapsed ? "px-2" : "px-3"} space-y-0.5`}>
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
          className={`${
            collapsed ? "px-2" : "px-4"
          } border-t border-[rgba(255,255,255,0.06)] py-4`}
        >
          {!collapsed && (
            <div className="mb-3 px-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.06)] p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.12)] text-[9px] font-bold text-[#3B82F6]">
                  {tenantSlug?.substring(0, 2).toUpperCase() || "TD"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-[11px] font-medium text-[rgba(59,130,246,0.85)]">
                    VertaX AI Engine
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
                    <p className="text-[9px] text-[rgba(255,255,255,0.45)]">
                      智能引擎运行中
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg py-2.5 text-[rgba(255,255,255,0.4)] transition-colors hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(255,255,255,0.7)]"
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
  const linkHref = item.href;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={linkHref}
          title={collapsed ? item.label : undefined}
          className={`relative flex flex-1 items-center rounded-lg py-2.5 text-sm transition-all group ${
            collapsed ? "justify-center px-2" : "px-3"
          } ${
            isActive
              ? "bg-[rgba(255,255,255,0.06)] text-white"
              : "text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(255,255,255,0.85)]"
          }`}
        >
          {isActive && (
            <>
              <div
                className="absolute bottom-1/4 left-0 top-1/4 w-[2px] rounded-r-full"
                style={{
                  background: "#3B82F6",
                  boxShadow: "0 0 8px rgba(59,130,246,0.5)",
                }}
              />
              <div className="absolute inset-0 rounded-lg border border-[rgba(59,130,246,0.15)]" />
            </>
          )}

          <div className="relative shrink-0">
            <IconComponent
              size={18}
              strokeWidth={1.75}
              className={`transition-colors ${
                isActive
                  ? "text-[#3B82F6]"
                  : "text-[rgba(255,255,255,0.45)] group-hover:text-[rgba(255,255,255,0.7)]"
              }`}
            />
            {healthStatus && !isActive && (
              <div
                className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${
                  healthStatus === "red"
                    ? "bg-[#EF4444]"
                    : healthStatus === "amber"
                      ? "bg-[#F59E0B]"
                      : "bg-[#22C55E]"
                }`}
              />
            )}
          </div>

          {!collapsed && (
            <span
              className={`ml-3 flex-1 truncate text-[13px] font-medium ${
                isActive ? "text-white" : ""
              }`}
            >
              {item.label}
            </span>
          )}

          {!collapsed && badgeCount !== undefined && badgeCount > 0 && (
            <span className="ml-2 rounded bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Link>

        {hasSubItems && !collapsed && (
          <button
            onClick={onToggleExpand}
            className="flex min-h-[28px] min-w-[28px] items-center justify-center rounded p-2 text-[rgba(255,255,255,0.35)] transition-colors hover:text-[rgba(255,255,255,0.6)]"
            aria-label={isExpanded ? `收起${item.label}子菜单` : `展开${item.label}子菜单`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {hasSubItems && isExpanded && (
        <div className="mb-2 ml-4 mt-1 space-y-0.5 border-l border-[rgba(255,255,255,0.06)] pl-4">
          {sortedSubItems.map((sub) => {
            const SubIcon = sub.icon;
            const subActive = isExactActive(sub.href);
            return (
              <Link
                key={sub.key}
                href={sub.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] transition-all ${
                  subActive
                    ? "bg-[rgba(59,130,246,0.08)] font-medium text-[#3B82F6]"
                    : "text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(255,255,255,0.7)]"
                }`}
              >
                <SubIcon size={14} className={subActive ? "text-[#3B82F6]" : ""} />
                {sub.label}
                {sub.badge?.type === "premium" && sub.badge.text && (
                  <span className="ml-auto rounded border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.1)] px-1.5 py-0.5 text-[9px] font-medium text-gold">
                    {sub.badge.text}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
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
