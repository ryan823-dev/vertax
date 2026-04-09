"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Package,
  FileText,
  Share2,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  List,
  FolderOpen,
  CalendarDays,
  Users,
  Globe,
  Bot,
  ChevronDown,
  Megaphone,
  Search,
  Zap,
  Brain,
  Radar,
  TrendingUp,
  Key,
} from "lucide-react";
import { isPlatformAdmin } from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UserMenu } from "./user-menu";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const demoUser = {
    name: "演示用户",
    email: "demo@example.com",
    tenantName: "演示公司",
    tenantSlug: "demo",
    roleName: "admin",
    permissions: ["*"] as string[],
  };
  const user = session?.user || (isDemoMode ? demoUser : null);

  const isAdmin = isPlatformAdmin(
    user ? { permissions: user.permissions ?? [], roleName: user.roleName ?? "" } : null
  );

  const navGroups = [
    // 工作台
    {
      key: "main",
      items: [
        {
          title: "工作台",
          url: "/zh-CN/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    // 知识引擎（基础层）
    {
      key: "knowledge",
      label: "知识引擎",
      icon: Brain,
      items: [
        { title: "知识库", url: "/zh-CN/knowledge", icon: Brain },
        { title: "全部资产", url: "/zh-CN/assets", icon: FolderOpen },
      ],
    },
    // 产品管理
    {
      key: "products",
      label: "产品管理",
      icon: Package,
      items: [
        { title: "产品列表", url: "/zh-CN/products", icon: List },
        {
          title: "产品分类",
          url: "/zh-CN/products/categories",
          icon: FolderOpen,
        },
      ],
    },
    // 增长系统（Inbound）
    {
      key: "marketing",
      label: "增长系统",
      icon: TrendingUp,
      items: [
        { title: "SEO 内容", url: "/zh-CN/seo", icon: FileText },
        {
          title: "SEO 分类",
          url: "/zh-CN/seo/categories",
          icon: FolderOpen,
        },
        { title: "SEO 规划", url: "/zh-CN/seo/planner", icon: Search },
      ],
    },
    // 获客雷达（Outbound）
    {
      key: "radar",
      label: "获客雷达",
      icon: Radar,
      items: [
        { title: "线索挖掘", url: "/zh-CN/leads/research", icon: Search },
        { title: "线索列表", url: "/zh-CN/leads", icon: List },
        {
          title: "获客活动",
          url: "/zh-CN/leads/campaigns",
          icon: Megaphone,
        },
      ],
    },
    // 声量枢纽（社媒+PR）
    {
      key: "social",
      label: "社交媒体",
      icon: Share2,
      items: [
        { title: "社媒帖子", url: "/zh-CN/social", icon: Megaphone },
        {
          title: "社交日历",
          url: "/zh-CN/social/calendar",
          icon: CalendarDays,
        },
        {
          title: "社交账号",
          url: "/zh-CN/social/accounts",
          icon: Users,
        },
        {
          title: "社交自动化",
          url: "/zh-CN/social/automation",
          icon: Zap,
        },
      ],
    },
    // 设置
    {
      key: "settings",
      label: "设置",
      icon: Settings,
      items: [
        {
          title: "个人资料",
          url: "/zh-CN/settings/profile",
          icon: Users,
        },
        {
          title: "公司信息",
          url: "/zh-CN/settings/company",
          icon: Package,
        },
        {
          title: "团队管理",
          url: "/zh-CN/settings/team",
          icon: Users,
        },
        {
          title: "网站设置",
          url: "/zh-CN/settings/website",
          icon: Globe,
        },
      ],
    },
  ];

  if (isAdmin) {
    navGroups.push({
      key: "admin",
      label: "平台管理",
      icon: ShieldCheck,
      items: [
        {
          title: "租户管理",
          url: "/zh-CN/admin/tenants",
          icon: Users,
        },
        {
          title: "API 密钥",
          url: "/zh-CN/admin/api-keys",
          icon: Key,
        },
        {
          title: "系统设置",
          url: "/zh-CN/admin/system",
          icon: Settings,
        },
      ],
    });
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/zh-CN/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">出海获客智能体</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.tenantName || "Loading..."}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          if (group.key === "main") {
            return (
              <SidebarGroup key={group.key}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                        >
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const GroupIcon = group.icon!;
          const isGroupActive = group.items.some(
            (item) =>
              pathname === item.url || pathname.startsWith(item.url + "/")
          );

          return (
            <SidebarGroup key={group.key}>
              <Collapsible defaultOpen={isGroupActive} className="group/collapsible">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center">
                    <GroupIcon className="mr-2 size-4" />
                    {group.label}
                    <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              pathname === item.url ||
                              (item.url !== "/zh-CN/products" &&
                                item.url !== "/zh-CN/seo" &&
                                item.url !== "/zh-CN/social" &&
                                item.url !== "/zh-CN/leads" &&
                                item.url !== "/zh-CN/settings" &&
                                item.url !== "/zh-CN/knowledge" &&
                                item.url !== "/zh-CN/assets" &&
                                pathname.startsWith(item.url))
                            }
                          >
                            <Link href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
