"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ===================== Types =====================

export type TodoItem = {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  module: string;
  moduleIcon: string;
  status: 'pending' | 'in_progress' | 'completed';
  action: string;
  actionLink?: string;
  createdAt: Date;
  dueDate?: Date;
};

export type HubStats = {
  pending: number;
  blocked: number;
  inProgress: number;
  completed: number;
};

// ===================== Aggregate System Todos =====================

export async function getSystemTodos(): Promise<TodoItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const todos: TodoItem[] = [];
  const now = new Date();

  // 1. Check Knowledge Engine - Company Profile completeness
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: tenantId },
  });

  if (!profile) {
    todos.push({
      id: 'knowledge-no-profile',
      priority: 'P1',
      title: '创建企业能力画像',
      description: '上传企业资料，让AI自动提炼企业能力画像，这是所有智能功能的基础',
      module: '知识引擎',
      moduleIcon: 'brain',
      status: 'pending',
      action: '立即创建',
      actionLink: '/customer/knowledge',
      createdAt: now,
    });
  } else {
    // Check profile completeness
    const hasProducts = Array.isArray(profile.coreProducts) && (profile.coreProducts as unknown[]).length > 0;
    const hasICP = Array.isArray(profile.targetIndustries) && (profile.targetIndustries as unknown[]).length > 0;
    
    if (!hasProducts || !hasICP) {
      todos.push({
        id: 'knowledge-incomplete-profile',
        priority: 'P2',
        title: '完善企业能力画像',
        description: '企业画像信息不完整，建议上传更多资料以提升AI分析准确性',
        module: '知识引擎',
        moduleIcon: 'brain',
        status: 'pending',
        action: '上传资料',
        actionLink: '/customer/knowledge',
        createdAt: now,
      });
    }
  }

  // 2. Check Acquisition Radar - High intent leads to follow up
  const highIntentLeads = await prisma.lead.count({
    where: {
      tenantId: tenantId,
      deletedAt: null,
      priority: 'high',
      status: 'new',
    },
  });

  if (highIntentLeads > 0) {
    todos.push({
      id: 'radar-high-intent',
      priority: 'P1',
      title: `${highIntentLeads} 条高意向线索待跟进`,
      description: '有高意向潜在客户等待联系，及时跟进可提高转化率',
      module: '获客雷达',
      moduleIcon: 'radar',
      status: 'pending',
      action: '查看线索',
      actionLink: '/customer/radar',
      createdAt: now,
    });
  }

  // 3. Check Marketing System - Draft contents
  const draftContents = await prisma.seoContent.count({
    where: {
      tenantId: tenantId,
      deletedAt: null,
      status: 'draft',
    },
  });

  if (draftContents > 0) {
    todos.push({
      id: 'marketing-drafts',
      priority: 'P2',
      title: `${draftContents} 篇内容待发布`,
      description: '草稿内容已准备好，发布后可提升SEO排名和品牌曝光',
      module: '营销系统',
      moduleIcon: 'file-text',
      status: 'pending',
      action: '发布内容',
      actionLink: '/customer/marketing',
      createdAt: now,
    });
  }

  // 4. Check Social Hub - Account authorization
  const socialAccounts = await prisma.socialAccount.count({
    where: {
      tenantId: tenantId,
      isActive: true,
    },
  });

  if (socialAccounts === 0) {
    todos.push({
      id: 'social-no-accounts',
      priority: 'P1',
      title: '社媒账号未授权',
      description: '授权社交媒体账号后，可一键多平台发布内容',
      module: '声量枢纽',
      moduleIcon: 'globe',
      status: 'pending',
      action: '授权账号',
      actionLink: '/customer/social/accounts',
      createdAt: now,
    });
  }

  // 5. Check Social Hub - Scheduled posts
  const scheduledPosts = await prisma.socialPost.count({
    where: {
      tenantId: tenantId,
      deletedAt: null,
      status: 'scheduled',
      scheduledAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) }, // within 24h
    },
  });

  if (scheduledPosts > 0) {
    todos.push({
      id: 'social-scheduled',
      priority: 'P2',
      title: `${scheduledPosts} 条内容即将发布`,
      description: '排期内容将在24小时内自动发布，请确认内容无误',
      module: '声量枢纽',
      moduleIcon: 'globe',
      status: 'in_progress',
      action: '查看排期',
      actionLink: '/customer/social',
      createdAt: now,
    });
  }

  // 6. Check for failed social posts
  const failedPosts = await prisma.socialPost.count({
    where: {
      tenantId: tenantId,
      deletedAt: null,
      status: 'failed',
    },
  });

  if (failedPosts > 0) {
    todos.push({
      id: 'social-failed',
      priority: 'P0',
      title: `${failedPosts} 条内容发布失败`,
      description: '部分社媒内容发布失败，请检查账号授权状态并重试',
      module: '声量枢纽',
      moduleIcon: 'globe',
      status: 'pending',
      action: '重新发布',
      actionLink: '/customer/social',
      createdAt: now,
    });
  }

  // Sort by priority
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return todos;
}

// ===================== Get Stats =====================

export async function getHubStats(): Promise<HubStats> {
  const todos = await getSystemTodos();

  return {
    pending: todos.filter(t => t.status === 'pending').length,
    blocked: todos.filter(t => t.priority === 'P0').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    completed: 0, // System todos are dynamic, completed ones don't show
  };
}

// ===================== Recent Activity =====================

export type RecentActivity = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  userName?: string;
  // Phase 3 扩展字段
  eventCategory?: string;
  severity?: string;
  context?: Record<string, unknown>;
};

export async function getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const activities = await prisma.activity.findMany({
    where: { tenantId: tenantId },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return activities.map(a => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    metadata: a.metadata as Record<string, unknown>,
    createdAt: a.createdAt,
    userName: a.user.name || undefined,
    // Phase 3 扩展字段
    eventCategory: a.eventCategory || undefined,
    severity: a.severity || undefined,
    context: a.context as Record<string, unknown> | undefined,
  }));
}

// ===================== Module Health Check =====================

export type ModuleHealth = {
  module: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastActivity?: Date;
};

export async function getModuleHealth(): Promise<ModuleHealth[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const health: ModuleHealth[] = [];

  // Knowledge Engine
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: tenantId },
  });
  health.push({
    module: '知识引擎',
    status: profile && profile.lastAnalyzedAt ? 'healthy' : profile ? 'warning' : 'error',
    message: profile && profile.lastAnalyzedAt ? '企业画像已创建' : profile ? '画像待完善' : '未创建画像',
    lastActivity: profile?.lastAnalyzedAt || undefined,
  });

  // Acquisition Radar
  const leadCount = await prisma.lead.count({
    where: { tenantId: tenantId, deletedAt: null },
  });
  health.push({
    module: '获客雷达',
    status: leadCount > 0 ? 'healthy' : 'warning',
    message: leadCount > 0 ? `${leadCount} 条线索` : '暂无线索',
  });

  // Marketing System
  const contentCount = await prisma.seoContent.count({
    where: { tenantId: tenantId, deletedAt: null },
  });
  health.push({
    module: '营销系统',
    status: contentCount > 0 ? 'healthy' : 'warning',
    message: contentCount > 0 ? `${contentCount} 篇内容` : '暂无内容',
  });

  // Social Hub
  const accountCount = await prisma.socialAccount.count({
    where: { tenantId: tenantId, isActive: true },
  });
  health.push({
    module: '声量枢纽',
    status: accountCount > 0 ? 'healthy' : 'error',
    message: accountCount > 0 ? `${accountCount} 个已授权账号` : '未授权账号',
  });

  return health;
}
