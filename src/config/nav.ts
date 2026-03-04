/**
 * VertaX 客户端导航配置
 * 
 * 统一管理所有导航文案、顺序、徽章配置
 * sidebar 与 page header 共享此配置
 * 
 * 设计原则：
 * - 老板视角：战略 → 获客 → 交付
 * - 一眼懂、尊贵稳重、少术语
 */

import {
  Home,
  Radar,
  BarChart3,
  Globe,
  ClipboardCheck,
  Library,
  Users,
  CalendarClock,
  Zap,
  Map,
  Target,
  Layers,
  FileEdit,
  Building2,
  ShieldCheck,
  FileStack,
  BookOpen,
  Users2,
  Package,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// 核心类型定义
// ============================================

export type NavItemKey = 
  | 'strategic-home'
  | 'radar'
  | 'marketing'
  | 'social'
  | 'hub'
  | 'knowledge';

export type BadgeType = 'count' | 'status' | 'premium';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'inactive';

export interface NavBadgeConfig {
  type: BadgeType;
  /** 数据来源字段（用于动态获取） */
  source?: string;
  /** 静态文本（如"增值"） */
  text?: string;
}

export interface SubNavItem {
  key: string;
  /** 侧边栏显示名 */
  label: string;
  /** 路由路径 */
  href: string;
  /** 图标 */
  icon: LucideIcon;
  /** 显示顺序 */
  order: number;
  /** 徽章配置 */
  badge?: NavBadgeConfig;
  /** 是否隐藏（条件隐藏用） */
  hidden?: boolean;
}

export interface NavItem {
  /** 唯一标识（不可改） */
  key: NavItemKey;
  /** 侧边栏显示名 */
  label: string;
  /** 页面 H1 大标题（老板语） */
  pageTitle: string;
  /** 页面 H1 小字副标题 */
  pageSubtitle: string;
  /** 路由路径 */
  href: string;
  /** 图标 */
  icon: LucideIcon;
  /** 显示顺序（按老板动线排序） */
  order: number;
  /** 所属分组 */
  group: NavGroupKey;
  /** 健康状态指示 */
  healthSource?: string;
  /** 徽章配置 */
  badge?: NavBadgeConfig;
  /** 二级菜单 */
  subItems?: SubNavItem[];
}

export type NavGroupKey = 'overview' | 'core' | 'channel';

export interface NavGroup {
  key: NavGroupKey;
  label: string;
  order: number;
}

// ============================================
// 分组配置
// ============================================

export const navGroups: NavGroup[] = [
  { key: 'overview', label: '总览', order: 1 },
  { key: 'core', label: '核心业务', order: 2 },
  { key: 'channel', label: '资产底座', order: 3 },
];

// ============================================
// 导航配置（按老板动线排序）
// ============================================

export const navConfig: NavItem[] = [
  // ────────────────────────────────────────
  // 1. 决策中心 - 首页主入口
  // ────────────────────────────────────────
  {
    key: 'strategic-home',
    label: '决策中心',
    pageTitle: '董事长驾驶舱',
    pageSubtitle: '决策中心',
    href: '/c/home',
    icon: Home,
    order: 1,
    group: 'overview',
  },

  // ────────────────────────────────────────
  // 2. 获客雷达 - 主动找商机/线索
  // ────────────────────────────────────────
  {
    key: 'radar',
    label: '获客雷达',
    pageTitle: '商机雷达',
    pageSubtitle: '获客雷达',
    href: '/c/radar',
    icon: Radar,
    order: 2,
    group: 'core',
    healthSource: 'radar.status',
    subItems: [
      { key: 'candidates', label: '线索池', href: '/c/radar/candidates', icon: Users, order: 1 },
      { key: 'tasks', label: '扫描任务', href: '/c/radar/tasks', icon: Zap, order: 2 },
      { key: 'profiles', label: '扫描计划', href: '/c/radar/profiles', icon: CalendarClock, order: 3 },
      { key: 'channels', label: '渠道地图', href: '/c/radar/channels', icon: Map, order: 4 },
      { key: 'targeting', label: '画像规则', href: '/c/radar/targeting', icon: Target, order: 5 },
    ],
  },

  // ────────────────────────────────────────
  // 3. 营销系统 - 内容增长/SEO-AEO
  // ────────────────────────────────────────
  {
    key: 'marketing',
    label: '营销系统',
    pageTitle: '内容增长引擎',
    pageSubtitle: '营销系统',
    href: '/c/marketing',
    icon: BarChart3,
    order: 3,
    group: 'core',
    healthSource: 'marketing.status',
    subItems: [
      { key: 'topics', label: '主题集群', href: '/c/marketing/topics', icon: Layers, order: 1 },
      { key: 'strategy', label: '内容策略', href: '/c/marketing/strategy', icon: Zap, order: 2 },
      { key: 'briefs', label: '内容简报', href: '/c/marketing/briefs', icon: FileEdit, order: 3 },
      { key: 'contents', label: '内容库', href: '/c/marketing/contents', icon: FileStack, order: 4 },
    ],
  },

  // ────────────────────────────────────────
  // 4. 声量枢纽 - 品牌外宣/PR社媒
  // ────────────────────────────────────────
  {
    key: 'social',
    label: '声量枢纽',
    pageTitle: '品牌外宣',
    pageSubtitle: '声量枢纽',
    href: '/c/social',
    icon: Globe,
    order: 4,
    group: 'core',
    healthSource: 'social.status',
  },

  // ────────────────────────────────────────
  // 5. 协作审批 - 协作审批/交付闭环
  // ────────────────────────────────────────
  {
    key: 'hub',
    label: '协作审批',
    pageTitle: '交付推进台',
    pageSubtitle: '推进中台',
    href: '/c/hub',
    icon: ClipboardCheck,
    order: 5,
    group: 'core',
    badge: { type: 'count', source: 'approvals.pending' },
  },

  // ────────────────────────────────────────
  // 6. 知识引擎 - 企业智库/资料底座
  // ────────────────────────────────────────
  {
    key: 'knowledge',
    label: '知识引擎',
    pageTitle: '企业智库',
    pageSubtitle: '知识引擎',
    href: '/c/knowledge',
    icon: Library,
    order: 6,
    group: 'channel',
    healthSource: 'knowledge.status',
    subItems: [
      { key: 'assets', label: '资料库', href: '/c/knowledge/assets', icon: FileStack, order: 1 },
      { key: 'evidence', label: '证据库', href: '/c/knowledge/evidence', icon: ShieldCheck, order: 2 },
      { key: 'company', label: '企业档案', href: '/c/knowledge/company', icon: Building2, order: 3 },
      { key: 'guidelines', label: '品牌手册', href: '/c/knowledge/guidelines', icon: BookOpen, order: 4 },
      { key: 'profiles', label: '买家画像', href: '/c/knowledge/profiles', icon: Users2, order: 5 },
    ],
  },
];

// ============================================
// 辅助函数
// ============================================

/**
 * 获取排序后的导航列表
 */
export function getSortedNavItems(): NavItem[] {
  return [...navConfig].sort((a, b) => a.order - b.order);
}

/**
 * 获取排序后的分组
 */
export function getSortedGroups(): NavGroup[] {
  return [...navGroups].sort((a, b) => a.order - b.order);
}

/**
 * 按分组获取导航项
 */
export function getNavItemsByGroup(): Record<NavGroupKey, NavItem[]> {
  const grouped: Record<NavGroupKey, NavItem[]> = {
    overview: [],
    core: [],
    channel: [],
  };
  
  for (const group of getSortedGroups()) {
    const items = navConfig
      .filter(item => item.group === group.key)
      .sort((a, b) => a.order - b.order);
    grouped[group.key] = items;
  }
  
  return grouped;
}

/**
 * 根据路由路径获取导航项
 */
export function getNavItemByPath(pathname: string): NavItem | undefined {
  return navConfig.find(item => {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      return true;
    }
    return false;
  });
}

/**
 * 根据路由路径获取页面标题配置
 */
export function getPageTitleByPath(pathname: string): { title: string; subtitle: string } | undefined {
  const navItem = getNavItemByPath(pathname);
  if (navItem) {
    return {
      title: navItem.pageTitle,
      subtitle: navItem.pageSubtitle,
    };
  }
  return undefined;
}

/**
 * 根据 key 获取导航项
 */
export function getNavItemByKey(key: NavItemKey): NavItem | undefined {
  return navConfig.find(item => item.key === key);
}

/**
 * 获取子导航项（已排序）
 */
export function getSortedSubItems(navItem: NavItem): SubNavItem[] {
  if (!navItem.subItems) return [];
  return [...navItem.subItems]
    .filter(item => !item.hidden)
    .sort((a, b) => a.order - b.order);
}

// ============================================
// 健康状态映射
// ============================================

export type HealthIndicator = 'emerald' | 'amber' | 'red';

export function getHealthIndicator(status?: HealthStatus): HealthIndicator | undefined {
  if (!status) return undefined;
  switch (status) {
    case 'healthy':
      return 'emerald';
    case 'warning':
    case 'inactive':
      return 'amber';
    case 'critical':
      return 'red';
    default:
      return undefined;
  }
}
