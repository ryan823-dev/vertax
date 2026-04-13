"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react';
import {
  getSortedGroups,
  getNavItemsByGroup,
  getSortedSubItems,
  type NavItem,
  type NavGroupKey,
  type HealthIndicator,
} from '@/config/nav';

// ============================================
// 类型定义
// ============================================

interface CustomerSidebarProps {
  tenantName?: string;
  tenantSlug?: string;
  /** 动态徽章数据 */
  badgeData?: {
    'approvals.pending'?: number;
    [key: string]: number | undefined;
  };
  /** 动态健康状态数据 */
  healthData?: {
    'radar.status'?: HealthIndicator;
    'marketing.status'?: HealthIndicator;
    'knowledge.status'?: HealthIndicator;
    'social.status'?: HealthIndicator;
    [key: string]: HealthIndicator | undefined;
  };
}

const STORAGE_KEY = 'vertax-nav-expanded';

// ============================================
// 主组件
// ============================================

export function CustomerSidebar({
  tenantName = '客户企业',
  tenantSlug = 'tenant',
  badgeData = {},
  healthData = {},
}: CustomerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- sync with route
  }, [pathname]);

  // 获取配置数据（纯函数，结果稳定）
  const groups = useMemo(() => getSortedGroups(), []);
  const itemsByGroup = useMemo(() => getNavItemsByGroup(), []);

  // SSR-safe: always start as null, then hydrate from localStorage
  const [expandedNav, setExpandedNav] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setExpandedNav(stored); // eslint-disable-line react-hooks/set-state-in-effect -- hydrate from localStorage
      return;
    }
    // Auto-expand group matching current route
    const groups = getNavItemsByGroup();
    for (const groupKey of Object.keys(groups) as NavGroupKey[]) {
      for (const item of groups[groupKey]) {
        if (pathname?.startsWith(item.href)) {
          setExpandedNav(item.key);
          return;
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 保存展开状态到 localStorage
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
  const isExactActive = (href: string) => pathname === href || pathname?.endsWith(href);

  // 获取徽章数量
  const getBadgeCount = (source?: string): number | undefined => {
    if (!source) return undefined;
    return badgeData[source];
  };

  // 获取健康状态
  const getHealthStatus = (source?: string): HealthIndicator | undefined => {
    if (!source) return undefined;
    return healthData[source];
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg text-white"
        style={{ background: 'rgba(11,18,32,0.9)' }}
        aria-label="打开导航菜单"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside 
        className={`${collapsed ? 'w-[72px]' : 'w-60'} flex-col h-screen transition-all duration-300 hidden lg:flex lg:sticky lg:top-0 ${
          mobileOpen ? '!flex fixed inset-y-0 left-0 z-50' : ''
        }`}
        style={{
          background: 'linear-gradient(180deg, #0B1220 0%, #0A1018 100%)',
        }}
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-3 z-10 p-1.5 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors lg:hidden"
            aria-label="关闭导航菜单"
          >
            <X size={18} />
          </button>
        )}
      {/* Brand Header - 高端会所风格 */}
      <div className={`${collapsed ? 'px-4 py-6' : 'px-5 py-6'} border-b border-[rgba(255,255,255,0.06)]`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center text-sm font-black text-[#0B1220] shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0">
            {tenantSlug?.substring(0, 2).toUpperCase() || 'TD'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">{tenantName}</h1>
              <p className="text-[9px] text-gold font-bold uppercase tracking-widest opacity-80">GROWTH CHAMBER</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-exec">
        {groups.map((group, gIdx) => {
          const items = itemsByGroup[group.key] || [];
          if (items.length === 0) return null;

          return (
            <div key={group.key} className={gIdx > 0 ? 'mt-5' : ''}>
              {!collapsed && (
                <p className="px-5 mb-2 text-[9px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[0.15em]">
                  {group.label}
                </p>
              )}
              {collapsed && gIdx > 0 && (
                <div className="mx-4 mb-3 border-t border-[rgba(255,255,255,0.06)]" />
              )}
              <div className={`${collapsed ? 'px-2' : 'px-3'} space-y-0.5`}>
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

      {/* Footer - 徽章式账号卡 */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-[rgba(255,255,255,0.06)]`}>
        {!collapsed && (
          <div className="px-2 mb-3">
            <div className="flex items-center gap-2.5 p-2.5 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
              <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[9px] font-bold text-gold shrink-0">
                {tenantSlug?.substring(0, 2).toUpperCase() || 'TD'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-medium text-[rgba(212,175,55,0.85)] truncate">VertaX AI Engine</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <p className="text-[9px] text-[rgba(255,255,255,0.45)]">智能引擎运行中</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2.5 text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </aside>
    </>
  );
}

// ============================================
// 一级导航项
// ============================================

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

  // 一级链接始终跳转模块总览，二级菜单承担模块内分流
  const linkHref = item.href;

  return (
    <div>
      {/* Main nav item */}
      <div className="flex items-center">
        <Link
          href={linkHref}
          title={collapsed ? item.label : undefined}
          className={`flex-1 flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm rounded-lg transition-all relative group ${
            isActive
              ? 'bg-[rgba(255,255,255,0.06)] text-white'
              : 'hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(255,255,255,0.85)] text-[rgba(255,255,255,0.5)]'
          }`}
        >
          {/* 左侧金色选中条 + 金色细描边 */}
          {isActive && (
            <>
              <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-gold rounded-r-full shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
              <div className="absolute inset-0 rounded-lg border border-[rgba(212,175,55,0.2)]" />
            </>
          )}
          
          {/* 图标 + 健康状态点 */}
          <div className="relative shrink-0">
            <IconComponent
              size={18}
              strokeWidth={1.75}
              className={`transition-colors ${isActive ? 'text-gold' : 'text-[rgba(255,255,255,0.45)] group-hover:text-[rgba(255,255,255,0.7)]'}`}
            />
            {healthStatus && !isActive && (
              <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                healthStatus === 'red' ? 'bg-[#EF4444]' : 
                healthStatus === 'amber' ? 'bg-[#F59E0B]' : 
                'bg-[#22C55E]'
              }`} />
            )}
          </div>
          
          {/* 标签 */}
          {!collapsed && (
            <span className={`ml-3 text-[13px] font-medium truncate flex-1 ${isActive ? 'text-white' : ''}`}>
              {item.label}
            </span>
          )}
          
          {/* 数量徽章 */}
          {!collapsed && badgeCount !== undefined && badgeCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-[#EF4444] text-white rounded">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </Link>
        
        {/* 展开/折叠按钮 */}
        {hasSubItems && !collapsed && (
          <button
            onClick={onToggleExpand}
            className="p-2 min-w-[28px] min-h-[28px] flex items-center justify-center text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)] transition-colors rounded"
            aria-label={isExpanded ? `收起${item.label}子菜单` : `展开${item.label}子菜单`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Sub items */}
      {hasSubItems && isExpanded && (
        <div className="ml-4 pl-4 border-l border-[rgba(255,255,255,0.06)] mt-1 mb-2 space-y-0.5">
          {sortedSubItems.map((sub) => {
            const SubIcon = sub.icon;
            const subActive = isExactActive(sub.href);
            return (
              <Link
                key={sub.key}
                href={sub.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-[12px] rounded-md transition-all ${
                  subActive
                    ? 'text-gold bg-[rgba(212,175,55,0.08)] font-medium'
                    : 'text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <SubIcon size={14} className={subActive ? 'text-gold' : ''} />
                {sub.label}
                {/* 子菜单徽章（如"增值"） */}
                {sub.badge?.type === 'premium' && sub.badge.text && (
                  <span className="ml-auto px-1.5 py-0.5 text-[9px] font-medium bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.25)] rounded">
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

// 导出枚举供外部使用（兼容旧代码）
export enum CustomerNavItem {
  StrategicHome = 'strategic-home',
  KnowledgeEngine = 'knowledge',
  OutreachRadar = 'radar',
  MarketingDrive = 'marketing',
  SocialPresence = 'social',
  PromotionHub = 'hub',
}
