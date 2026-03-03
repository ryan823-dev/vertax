"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Library,
  BarChart3,
  Globe,
  Radar,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  FileStack,
  ShieldCheck,
  Building2,
  BookOpen,
  Users2,
  FileEdit,
  Layers,
} from 'lucide-react';

export enum CustomerNavItem {
  StrategicHome = 'strategic-home',
  KnowledgeEngine = 'knowledge',
  OutreachRadar = 'radar',
  MarketingDrive = 'marketing',
  SocialPresence = 'social',
  PromotionHub = 'hub',
}

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavItemConfig {
  id: CustomerNavItem;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  href: string;
  health?: 'amber' | 'emerald' | 'red';
  subItems?: SubNavItem[];
}

interface CustomerSidebarProps {
  tenantName?: string;
  tenantSlug?: string;
}

export function CustomerSidebar({ tenantName = '客户企业', tenantSlug = 'tenant' }: CustomerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>('knowledge');
  const pathname = usePathname();

  const navSections = [
    {
      label: '总览',
      items: [
        { id: CustomerNavItem.StrategicHome, label: '决策中心', icon: Home, href: '/c/home', health: undefined },
      ] as NavItemConfig[],
    },
    {
      label: '核心引擎',
      items: [
        {
          id: CustomerNavItem.KnowledgeEngine,
          label: '知识引擎',
          icon: Library,
          href: '/c/knowledge',
          health: 'amber' as const,
          subItems: [
            { label: '素材资源', href: '/c/knowledge/assets', icon: FileStack },
            { label: '证据库', href: '/c/knowledge/evidence', icon: ShieldCheck },
            { label: '企业认知', href: '/c/knowledge/company', icon: Building2 },
            { label: '品牌规范', href: '/c/knowledge/guidelines', icon: BookOpen },
            { label: '人设中心', href: '/c/knowledge/profiles', icon: Users2 },
          ],
        },
        { id: CustomerNavItem.OutreachRadar, label: '获客雷达', icon: Radar, href: '/c/radar', health: 'emerald' as const },
        {
          id: CustomerNavItem.MarketingDrive,
          label: '营销系统',
          icon: BarChart3,
          href: '/c/marketing',
          health: 'amber' as const,
          subItems: [
            { label: '内容规划', href: '/c/marketing/briefs', icon: FileEdit },
            { label: '内容管理', href: '/c/marketing/contents', icon: Layers },
          ],
        },
      ] as NavItemConfig[],
    },
    {
      label: '运营渠道',
      items: [
        { id: CustomerNavItem.SocialPresence, label: '声量枢纽', icon: Globe, href: '/c/social', health: 'red' as const },
        { id: CustomerNavItem.PromotionHub, label: '推进中台', icon: ClipboardList, href: '/c/hub', health: 'emerald' as const },
      ] as NavItemConfig[],
    },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);
  const isExactActive = (href: string) => pathname === href || pathname?.endsWith(href);

  const toggleExpand = (id: string) => {
    setExpandedNav((prev) => (prev === id ? null : id));
  };

  return (
    <aside className={`${collapsed ? 'w-[72px]' : 'w-60'} bg-[#0B1B2B] text-slate-400 flex flex-col h-screen sticky top-0 border-r border-[#10263B] transition-all duration-300`}>
      {/* Brand Header */}
      <div className={`${collapsed ? 'px-4 py-6' : 'px-5 py-6'} border-b border-[#10263B]/50`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/80 rounded-xl flex items-center justify-center text-sm font-black text-[#0B1B2B] shadow-lg shadow-[#C7A56A]/20 shrink-0">
            {tenantSlug?.substring(0, 2).toUpperCase() || 'TD'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">{tenantName}</h1>
              <p className="text-[9px] text-[#C7A56A]/70 font-bold uppercase tracking-widest">DIGITAL HQ</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <p className="px-5 mb-2 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">
                {section.label}
              </p>
            )}
            {collapsed && sIdx > 0 && (
              <div className="mx-4 mb-3 border-t border-[#10263B]/50" />
            )}
            <div className={`${collapsed ? 'px-2' : 'px-3'} space-y-0.5`}>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.href);
                const health = item.health;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedNav === item.id && !collapsed;

                return (
                  <div key={item.id}>
                    {/* Main nav item */}
                    <div className="flex items-center">
                      <Link
                        href={hasSubItems ? (item.subItems![0].href) : item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex-1 flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm rounded-lg transition-all relative group ${
                          active
                            ? 'bg-gradient-to-r from-[#10263B] to-[#10263B]/50 text-white'
                            : 'hover:bg-[#10263B]/40 hover:text-slate-200 text-slate-500'
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-[#C7A56A] rounded-r-full shadow-[0_0_6px_rgba(199,165,106,0.4)]" />
                        )}
                        <div className="relative shrink-0">
                          <IconComponent
                            size={18}
                            strokeWidth={1.75}
                            className={`transition-colors ${active ? 'text-[#C7A56A]' : 'text-slate-500 group-hover:text-slate-300'}`}
                          />
                          {health && !active && (
                            <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                              health === 'red' ? 'bg-red-400' : health === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
                            }`} />
                          )}
                        </div>
                        {!collapsed && (
                          <span className={`ml-3 text-[13px] font-medium truncate ${active ? 'text-white' : ''}`}>
                            {item.label}
                          </span>
                        )}
                      </Link>
                      {/* Expand toggle */}
                      {hasSubItems && !collapsed && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors rounded"
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
                      <div className="ml-4 pl-4 border-l border-[#10263B]/50 mt-1 mb-2 space-y-0.5">
                        {item.subItems!.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = isExactActive(sub.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`flex items-center gap-2.5 px-2.5 py-2 text-[12px] rounded-md transition-all ${
                                subActive
                                  ? 'text-[#C7A56A] bg-[#C7A56A]/5 font-medium'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#10263B]/30'
                              }`}
                            >
                              <SubIcon size={14} className={subActive ? 'text-[#C7A56A]' : ''} />
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-[#10263B]/50`}>
        {!collapsed && (
          <div className="px-2 mb-3">
            <div className="flex items-center gap-2.5 p-2.5 bg-[#10263B]/30 rounded-lg border border-[#10263B]/50">
              <div className="w-7 h-7 rounded-lg bg-[#C7A56A]/10 border border-[#C7A56A]/20 flex items-center justify-center text-[9px] font-bold text-[#C7A56A] shrink-0">
                {tenantSlug?.substring(0, 2).toUpperCase() || 'TD'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-medium text-slate-300 truncate">{tenantSlug}.vertax.top</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <p className="text-[9px] text-slate-600">运行中</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-slate-600 hover:text-slate-400 transition-colors rounded-lg hover:bg-[#10263B]/30"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </aside>
  );
}
