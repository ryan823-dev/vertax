"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiClient } from "@/lib/ai-client";

// ===================== Types =====================

export type DashboardStats = {
  knowledgeCompleteness: number;
  totalLeads: number;
  highIntentLeads: number;
  totalContents: number;
  pendingContents: number;
  pendingTasks: number;
  blockedTasks: number;
};

export type PendingAction = {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  module: string;
  action: string;
  actionLink: string;
};

export type AIBriefing = {
  summary: string;
  highlights: string[];
  recommendations: string[];
  generatedAt: Date;
};

export type TenantInfo = {
  name: string;
  companyName?: string;
};

// ===================== Get Dashboard Stats =====================

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      knowledgeCompleteness: 0,
      totalLeads: 0,
      highIntentLeads: 0,
      totalContents: 0,
      pendingContents: 0,
      pendingTasks: 0,
      blockedTasks: 0,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user?.tenantId) {
    return {
      knowledgeCompleteness: 0,
      totalLeads: 0,
      highIntentLeads: 0,
      totalContents: 0,
      pendingContents: 0,
      pendingTasks: 0,
      blockedTasks: 0,
    };
  }

  const tenantId = user.tenantId;

  // Get all stats in parallel
  const [profile, leads, highIntentLeads, contents, draftContents, socialAccounts, failedPosts] =
    await Promise.all([
      prisma.companyProfile.findUnique({
        where: { tenantId },
      }),
      prisma.lead.count({
        where: { tenantId, deletedAt: null },
      }),
      prisma.lead.count({
        where: { tenantId, deletedAt: null, priority: 'high' },
      }),
      prisma.seoContent.count({
        where: { tenantId, deletedAt: null },
      }),
      prisma.seoContent.count({
        where: { tenantId, deletedAt: null, status: 'draft' },
      }),
      prisma.socialAccount.count({
        where: { tenantId, isActive: true },
      }),
      prisma.socialPost.count({
        where: { tenantId, deletedAt: null, status: 'failed' },
      }),
    ]);

  // Calculate knowledge completeness
  let knowledgeCompleteness = 0;
  if (profile) {
    if (profile.companyName) knowledgeCompleteness += 10;
    if (profile.companyIntro) knowledgeCompleteness += 10;
    if (Array.isArray(profile.coreProducts) && (profile.coreProducts as unknown[]).length > 0) knowledgeCompleteness += 20;
    if (Array.isArray(profile.techAdvantages) && (profile.techAdvantages as unknown[]).length > 0) knowledgeCompleteness += 15;
    if (Array.isArray(profile.scenarios) && (profile.scenarios as unknown[]).length > 0) knowledgeCompleteness += 10;
    if (Array.isArray(profile.targetIndustries) && (profile.targetIndustries as unknown[]).length > 0) knowledgeCompleteness += 15;
    if (Array.isArray(profile.buyerPersonas) && (profile.buyerPersonas as unknown[]).length > 0) knowledgeCompleteness += 10;
    if (Array.isArray(profile.painPoints) && (profile.painPoints as unknown[]).length > 0) knowledgeCompleteness += 10;
  }

  // Calculate pending tasks
  let pendingTasks = 0;
  let blockedTasks = 0;

  if (!profile) {
    pendingTasks++;
    blockedTasks++;
  } else if (knowledgeCompleteness < 50) {
    pendingTasks++;
  }

  if (highIntentLeads > 0) pendingTasks++;
  if (draftContents > 0) pendingTasks++;
  if (socialAccounts === 0) {
    pendingTasks++;
    blockedTasks++;
  }
  if (failedPosts > 0) {
    pendingTasks++;
    blockedTasks++;
  }

  return {
    knowledgeCompleteness,
    totalLeads: leads,
    highIntentLeads,
    totalContents: contents,
    pendingContents: draftContents,
    pendingTasks,
    blockedTasks,
  };
}

// ===================== Get Pending Actions =====================

export async function getPendingActions(): Promise<PendingAction[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user?.tenantId) return [];

  const tenantId = user.tenantId;
  const actions: PendingAction[] = [];

  // Check for critical issues first
  const [profile, socialAccounts, failedPosts, highIntentLeads, draftContents] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.socialAccount.count({ where: { tenantId, isActive: true } }),
    prisma.socialPost.count({ where: { tenantId, deletedAt: null, status: 'failed' } }),
    prisma.lead.count({ where: { tenantId, deletedAt: null, priority: 'high', status: 'new' } }),
    prisma.seoContent.count({ where: { tenantId, deletedAt: null, status: 'draft' } }),
  ]);

  // P0 - Blocked issues
  if (failedPosts > 0) {
    actions.push({
      id: 'social-failed',
      priority: 'P0',
      title: `${failedPosts} 条内容发布失败`,
      module: '声量枢纽',
      action: '重新发布',
      actionLink: '/c/social',
    });
  }

  // P1 - High priority
  if (!profile) {
    actions.push({
      id: 'knowledge-profile',
      priority: 'P1',
      title: '创建企业能力画像',
      module: '知识引擎',
      action: '立即创建',
      actionLink: '/c/knowledge',
    });
  }

  if (socialAccounts === 0) {
    actions.push({
      id: 'social-accounts',
      priority: 'P1',
      title: '社媒账号未授权',
      module: '声量枢纽',
      action: '授权接入',
      actionLink: '/c/social',
    });
  }

  if (highIntentLeads > 0) {
    actions.push({
      id: 'leads-follow',
      priority: 'P1',
      title: `${highIntentLeads} 条高意向线索待跟进`,
      module: '获客雷达',
      action: '查看线索',
      actionLink: '/c/radar',
    });
  }

  // P2 - Normal priority
  if (draftContents > 0) {
    actions.push({
      id: 'content-draft',
      priority: 'P2',
      title: `${draftContents} 篇内容待发布`,
      module: '增长系统',
      action: '发布内容',
      actionLink: '/c/marketing',
    });
  }

  return actions.slice(0, 5); // Limit to 5 actions
}

// ===================== Get Tenant Info =====================

export async function getTenantInfo(): Promise<TenantInfo | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      tenantId: true,
      tenant: { select: { name: true } },
    },
  });
  if (!user?.tenantId || !user.tenant) return null;

  const tenantId = user.tenantId;

  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
    select: { companyName: true },
  });

  return {
    name: user.tenant.name,
    companyName: profile?.companyName ?? undefined,
  };
}

// ===================== Generate AI Briefing =====================

export async function generateAIBriefing(): Promise<AIBriefing> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      summary: '请先登录以获取个性化简报',
      highlights: [],
      recommendations: [],
      generatedAt: new Date(),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user?.tenantId) {
    return {
      summary: '用户信息加载失败',
      highlights: [],
      recommendations: [],
      generatedAt: new Date(),
    };
  }

  const tenantId = user.tenantId;

  // Gather all data
  const [profile, leads, contents, socialPosts, socialAccounts] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.lead.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.seoContent.findMany({
      where: { tenantId, deletedAt: null },
      take: 10,
    }),
    prisma.socialPost.findMany({
      where: { tenantId, deletedAt: null },
      include: { versions: true },
      take: 10,
    }),
    prisma.socialAccount.count({ where: { tenantId, isActive: true } }),
  ]);

  const systemPrompt = `你是一位专业的企业战略顾问，负责为企业老板提供每日决策简报。
请根据以下数据，生成简洁有力的战略简报。

数据概要：
- 企业画像：${profile ? `已创建，公司名称：${profile.companyName || '未设置'}` : '未创建'}
- 潜在客户：${leads.length} 条线索
- 内容资产：${contents.length} 篇内容
- 社媒账号：${socialAccounts} 个已授权
- 社媒帖子：${socialPosts.length} 条

请返回JSON格式：
{
  "summary": "一句话总结当前业务状态（20-40字）",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "recommendations": ["建议1", "建议2", "建议3"]
}

要求：
- summary 简洁有力，像给老板汇报
- highlights 最多3条，突出积极进展
- recommendations 最多3条，具体可执行

只返回JSON对象。`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "deepseek-v3",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成今日决策简报" },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI未返回结果");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI返回格式错误");

    const result = JSON.parse(jsonMatch[0]);
    return {
      summary: result.summary || '数据分析中...',
      highlights: result.highlights || [],
      recommendations: result.recommendations || [],
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("AI简报生成失败:", error);

    // Fallback to static briefing
    const highlights: string[] = [];
    const recommendations: string[] = [];

    if (profile) {
      highlights.push('企业能力画像已创建');
    } else {
      recommendations.push('建议尽快创建企业能力画像');
    }

    if (leads.length > 0) {
      highlights.push(`已发现 ${leads.length} 条潜在客户线索`);
    } else {
      recommendations.push('启动AI调研发掘潜在客户');
    }

    if (contents.length > 0) {
      highlights.push(`已创建 ${contents.length} 篇内容资产`);
    }

    if (socialAccounts === 0) {
      recommendations.push('授权社媒账号以启用自动发布');
    }

    return {
      summary: profile
        ? `${profile.companyName || '企业'}全球化获客引擎运行中`
        : '系统初始化中，建议完善企业画像',
      highlights,
      recommendations,
      generatedAt: new Date(),
    };
  }
}
