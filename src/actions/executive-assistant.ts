"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import { ACTIVITY_ACTIONS, EVENT_CATEGORIES, logActivity } from "@/lib/utils/activity-logger";
import type { ConversationData, MessageData } from "@/actions/chat";
import { createTargetingSpecDraft, createTopicClusterDraft } from "@/lib/knowledge-sync";
import type {
  AssistantAction,
  ExecutiveAssistantExecutionResult,
  ExecutiveAssistantPayload,
} from "@/lib/executive-assistant/types";
import {
  generateAIBriefing,
  getDashboardStats,
  getPendingActions,
  getTenantInfo,
  type PendingAction,
} from "@/actions/dashboard";

const EXECUTIVE_ASSISTANT_TYPE = "executive_home";

const OPENABLE_MODULES = [
  { href: "/customer/radar", label: "查看获客雷达" },
  { href: "/customer/radar/prospects", label: "查看商机跟进" },
  { href: "/customer/radar/targeting", label: "查看雷达画像" },
  { href: "/customer/marketing/contents", label: "查看内容进度" },
  { href: "/customer/marketing/strategy", label: "查看增长策略" },
  { href: "/customer/knowledge/company", label: "查看企业档案" },
  { href: "/customer/knowledge/assets", label: "查看知识资产" },
  { href: "/customer/social", label: "查看声量枢纽" },
  { href: "/customer/social/accounts", label: "完成发布配置" },
  { href: "/customer/hub", label: "查看推进中台" },
] as const;

type AssistantContext = {
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
  pendingActions: PendingAction[];
  tenantInfo: Awaited<ReturnType<typeof getTenantInfo>>;
  briefing: Awaited<ReturnType<typeof generateAIBriefing>> | null;
  companyProfile: {
    exists: boolean;
    companyName: string | null;
    companyIntro: string | null;
  };
  recentLeads: Array<{ companyName: string; priority: string; status: string; createdAt: Date }>;
  recentContents: Array<{ title: string; status: string; updatedAt: Date }>;
  recentPosts: Array<{ title: string | null; status: string; scheduledAt: Date | null; updatedAt: Date }>;
  openTasks: Array<{ title: string; priority: string; status: string; createdAt: Date }>;
};

async function requireAssistantSession() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("会话已过期，请重新登录后再试");
  }

  if (!session.user.tenantId) {
    throw new Error("当前租户尚未初始化，请重新登录或联系管理员");
  }

  return {
    session,
    tenantId: session.user.tenantId,
    userId: session.user.id,
  };
}

function isExecutiveConversation(snapshot: unknown): boolean {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      "assistantType" in snapshot &&
      (snapshot as { assistantType?: string }).assistantType === EXECUTIVE_ASSISTANT_TYPE
  );
}

function serializePayload(payload: ExecutiveAssistantPayload): string {
  const sections = [payload.conclusion];

  if (payload.evidence?.length) {
    sections.push(`依据: ${payload.evidence.join("; ")}`);
  }

  if (payload.suggestions?.length) {
    sections.push(`建议: ${payload.suggestions.join("; ")}`);
  }

  if (payload.pendingConfirmation?.length) {
    sections.push(`待确认: ${payload.pendingConfirmation.join("; ")}`);
  }

  return sections.join("\n\n");
}

function trimStringArray(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeAction(raw: unknown): AssistantAction | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const action = raw as Record<string, unknown>;
  const type = typeof action.type === "string" ? action.type : "";
  const label = typeof action.label === "string" ? action.label.trim() : "";
  const description = typeof action.description === "string" ? action.description.trim() : undefined;

  if (!label) {
    return null;
  }

  if (type === "open_module") {
    const href = typeof action.href === "string" ? action.href.trim() : "";
    if (!OPENABLE_MODULES.some((item) => item.href === href)) {
      return null;
    }

    return { type, label, href, description };
  }

  if (type === "sync_marketing") {
    const focusSegment =
      typeof action.focusSegment === "string" && action.focusSegment.trim()
        ? action.focusSegment.trim()
        : undefined;
    return { type, label, description, focusSegment };
  }

  if (type === "sync_radar") {
    return { type, label, description };
  }

  if (type === "create_task") {
    const title = typeof action.title === "string" ? action.title.trim() : "";
    if (!title) {
      return null;
    }

    const priority =
      action.priority === "urgent" || action.priority === "low" ? action.priority : "normal";

    return {
      type,
      label,
      title,
      priority,
      description,
    };
  }

  return null;
}

function buildDefaultActions(context: AssistantContext, userMessage: string): AssistantAction[] {
  const actions: AssistantAction[] = [];
  const normalized = userMessage.toLowerCase();

  if (!context.companyProfile.exists) {
    actions.push({
      type: "open_module",
      label: "创建企业档案",
      href: "/customer/knowledge/company",
      description: "先补齐企业画像与核心能力，首页问答才会更准确。",
    });
  }

  if (context.tenantInfo?.isPublishingSetupPending) {
    actions.push({
      type: "open_module",
      label: "完成发布配置",
      href: "/customer/social/accounts",
      description: "先接入至少一个发布账号，解除安全模式。",
    });
  }

  if (
    normalized.includes("商机") ||
    normalized.includes("线索") ||
    context.stats.highIntentLeads > 0
  ) {
    actions.push({
      type: "open_module",
      label: "查看获客雷达",
      href: "/customer/radar",
      description: "查看当前高意向线索和候选商机。",
    });
  }

  if (
    normalized.includes("内容") ||
    normalized.includes("brief") ||
    context.stats.pendingContents > 0
  ) {
    actions.push({
      type: "open_module",
      label: "查看内容进度",
      href: "/customer/marketing/contents",
      description: "检查待发布内容和当前推进状态。",
    });
  }

  if (context.stats.knowledgeCompleteness < 60) {
    actions.push({
      type: "open_module",
      label: "完善企业档案",
      href: "/customer/knowledge/company",
      description: "补齐画像与资料后，问答和生成结果会更准确。",
    });
  }

  if (context.pendingActions.some((item) => item.module.includes("增长"))) {
    actions.push({
      type: "sync_marketing",
      label: "同步到增长系统",
      description: "生成最新 Topic Cluster 草稿，刷新增长规划。",
    });
  }

  if (context.pendingActions.some((item) => item.module.includes("雷达")) || context.stats.highIntentLeads > 0) {
    actions.push({
      type: "sync_radar",
      label: "同步到获客雷达",
      description: "生成新的 Targeting Spec 草稿，校准雷达筛选规则。",
    });
  }

  if (normalized.includes("下一步") || normalized.includes("待办") || normalized.includes("建议")) {
    actions.push({
      type: "create_task",
      label: "加入推进中台",
      title: "跟进 CEO 助手建议的下一步动作",
      priority: "normal",
      description: "把当前建议转成可跟踪的待办。",
    });
  }

  const deduped: AssistantAction[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const key =
      action.type === "open_module"
        ? `${action.type}:${action.href}`
        : action.type === "create_task"
          ? `${action.type}:${action.title}`
          : action.type;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(action);
    }
  }

  return deduped.slice(0, 4);
}

function buildBlockingPayload(context: AssistantContext): ExecutiveAssistantPayload | null {
  if (!context.companyProfile.exists) {
    return {
      conclusion: "我已经接入首页经营数据，但企业档案还没建立，所以暂时无法给出足够可靠的经营建议。",
      evidence: [
        "企业画像状态：未创建",
        `知识完整度 ${context.stats.knowledgeCompleteness}%`,
        `当前系统阻塞项 ${context.stats.blockedTasks} 个`,
      ],
      suggestions: [
        "先创建企业档案，补齐公司介绍、核心产品、目标行业和差异化卖点。",
        "完成后回到首页继续追问本周商机、内容进度和下一步建议。",
      ],
      pendingConfirmation: ["是否先补齐企业档案后再继续使用 CEO 助手"],
      actions: [
        {
          type: "open_module",
          label: "去创建企业档案",
          href: "/customer/knowledge/company",
          description: "先补齐企业画像，再回来继续追问。",
        },
      ],
    };
  }

  return null;
}

function buildFallbackPayload(userMessage: string, context: AssistantContext): ExecutiveAssistantPayload {
  const recommendations = trimStringArray(context.briefing?.recommendations, 3);
  const evidence = [
    `知识完整度 ${context.stats.knowledgeCompleteness}%`,
    `高意向线索 ${context.stats.highIntentLeads} 条`,
    `待发布内容 ${context.stats.pendingContents} 篇`,
  ];

  if (context.pendingActions[0]?.title) {
    evidence.push(`当前首要阻塞项：${context.pendingActions[0].title}`);
  }

  let conclusion = "当前经营推进总体可控，建议围绕最紧迫的阻塞项继续推进。";

  if (context.tenantInfo?.isPublishingSetupPending) {
    conclusion = "当前仍处于安全模式，先完成发布配置是最关键的前置动作。";
  } else if (userMessage.includes("商机") || context.stats.highIntentLeads > 0) {
    conclusion = `当前最值得优先跟进的是 ${context.stats.highIntentLeads} 条高意向线索。`;
  } else if (userMessage.includes("内容") || context.stats.pendingContents > 0) {
    conclusion = `当前有 ${context.stats.pendingContents} 篇内容待处理，内容推进是最近的主线任务。`;
  }

  const suggestions = recommendations.length
    ? recommendations
    : [
        "优先处理当前最靠前的阻塞项。",
        "把建议动作转成待办，避免首页沟通后丢失。",
        "处理完成后回到首页继续追问下一步。",
      ];

  return {
    conclusion,
    evidence,
    suggestions,
    pendingConfirmation: context.pendingActions.slice(0, 2).map((item) => item.title),
    actions: buildDefaultActions(context, userMessage),
  };
}

function normalizePayload(raw: unknown, fallback: ExecutiveAssistantPayload): ExecutiveAssistantPayload {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const candidate = raw as Record<string, unknown>;
  const conclusion =
    typeof candidate.conclusion === "string" && candidate.conclusion.trim()
      ? candidate.conclusion.trim()
      : fallback.conclusion;

  const actions = Array.isArray(candidate.actions)
    ? candidate.actions.map(normalizeAction).filter((item): item is AssistantAction => Boolean(item))
    : fallback.actions || [];

  return {
    conclusion,
    evidence: trimStringArray(candidate.evidence, 4).length
      ? trimStringArray(candidate.evidence, 4)
      : fallback.evidence,
    suggestions: trimStringArray(candidate.suggestions, 4).length
      ? trimStringArray(candidate.suggestions, 4)
      : fallback.suggestions,
    pendingConfirmation: trimStringArray(candidate.pendingConfirmation, 3).length
      ? trimStringArray(candidate.pendingConfirmation, 3)
      : fallback.pendingConfirmation,
    references: fallback.references,
    actions: actions.length > 0 ? actions : fallback.actions,
  };
}

function parseAssistantResponse(content: string): unknown {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

async function buildAssistantContext(tenantId: string): Promise<AssistantContext> {
  const [stats, pendingActions, briefing, tenantInfo, companyProfile, recentLeads, recentContents, recentPosts, openTasks] =
    await Promise.all([
      getDashboardStats(),
      getPendingActions(),
      generateAIBriefing().catch(() => null),
      getTenantInfo(),
      prisma.companyProfile.findUnique({
        where: { tenantId },
        select: { companyName: true, companyIntro: true },
      }),
      prisma.lead.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { companyName: true, priority: true, status: true, createdAt: true },
      }),
      prisma.seoContent.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { title: true, status: true, updatedAt: true },
      }),
      prisma.socialPost.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { title: true, status: true, scheduledAt: true, updatedAt: true },
      }),
      prisma.artifactTask.findMany({
        where: { tenantId, status: { in: ["open", "in_progress"] } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: { title: true, priority: true, status: true, createdAt: true },
      }),
    ]);

  return {
    stats,
    pendingActions,
    tenantInfo: tenantInfo || null,
    briefing,
    companyProfile: {
      exists: Boolean(companyProfile),
      companyName: companyProfile?.companyName ?? null,
      companyIntro: companyProfile?.companyIntro ?? null,
    },
    recentLeads,
    recentContents,
    recentPosts,
    openTasks,
  };
}

function createContextSummary(context: AssistantContext): string {
  const topActions = context.pendingActions
    .slice(0, 4)
    .map((action) => `- ${action.title} | 模块: ${action.module} | 动作: ${action.action}`)
    .join("\n");

  const leads = context.recentLeads
    .map((lead) => `- ${lead.companyName || "未命名线索"} | 优先级: ${lead.priority} | 状态: ${lead.status}`)
    .join("\n");

  const contents = context.recentContents
    .map((item) => `- ${item.title} | 状态: ${item.status} | 更新时间: ${item.updatedAt.toISOString()}`)
    .join("\n");

  const posts = context.recentPosts
    .map((post) => `- ${post.title || "未命名发布"} | 状态: ${post.status}${post.scheduledAt ? ` | 计划发布时间: ${post.scheduledAt.toISOString()}` : ""}`)
    .join("\n");

  const openTasks = context.openTasks
    .map((task) => `- ${task.title} | 优先级: ${task.priority} | 状态: ${task.status}`)
    .join("\n");

  const allowedRoutes = OPENABLE_MODULES.map((item) => `- ${item.label}: ${item.href}`).join("\n");

  return `经营概览:
- 知识完整度: ${context.stats.knowledgeCompleteness}%
- 总线索: ${context.stats.totalLeads}
- 高意向线索: ${context.stats.highIntentLeads}
- 内容总量: ${context.stats.totalContents}
- 待处理内容: ${context.stats.pendingContents}
- 系统待办: ${context.stats.pendingTasks}
- 阻塞项: ${context.stats.blockedTasks}

租户状态:
- 租户: ${context.tenantInfo?.name || "未知"}
- 公司名称: ${context.tenantInfo?.companyName || "未设置"}
- 已连接发布账号: ${context.tenantInfo?.socialConnectedCount || 0}
- 是否处于安全模式: ${context.tenantInfo?.isPublishingSetupPending ? "是" : "否"}

AI 简报:
- Summary: ${context.briefing?.summary || "暂无"}
- Highlights: ${(context.briefing?.highlights || []).join("; ") || "暂无"}
- Recommendations: ${(context.briefing?.recommendations || []).join("; ") || "暂无"}

企业档案:
- 是否已创建: ${context.companyProfile.exists ? "是" : "否"}
- 档案名称: ${context.companyProfile.companyName || "未设置"}
- 公司介绍: ${context.companyProfile.companyIntro ? "已填写" : "未填写"}

待处理事项:
${topActions || "- 暂无"}

最近线索:
${leads || "- 暂无"}

最近内容:
${contents || "- 暂无"}

最近发布:
${posts || "- 暂无"}

进行中的协同任务:
${openTasks || "- 暂无"}

允许使用的动作和路由:
${allowedRoutes}`;
}

async function createAssistantConversation(title: string, tenantId: string, userId: string) {
  return prisma.chatConversation.create({
    data: {
      tenantId,
      userId,
      title,
      contextSnapshot: {
        assistantType: EXECUTIVE_ASSISTANT_TYPE,
      },
    },
  });
}

async function mapStoredMessages(conversationId: string): Promise<MessageData[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as "user" | "assistant",
    content: message.content,
    references: undefined,
    payload: (message.payload as Prisma.JsonObject | null | undefined) ?? null,
    createdAt: message.createdAt,
  }));
}

async function appendAssistantMessage(
  conversationId: string,
  payload: ExecutiveAssistantPayload
): Promise<MessageData> {
  const content = serializePayload(payload);
  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content,
      payload: payload as Prisma.InputJsonValue,
    },
  });

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: "assistant",
    content: message.content,
    payload: payload as Prisma.JsonObject,
    createdAt: message.createdAt,
  };
}

async function appendUserMessage(conversationId: string, userMessage: string): Promise<MessageData> {
  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: "user",
    content: message.content,
    payload: null,
    createdAt: message.createdAt,
  };
}

async function createAssistantTask(
  tenantId: string,
  userId: string,
  title: string,
  priority: "urgent" | "normal" | "low",
  conversationId?: string
) {
  const version = await prisma.artifactVersion.create({
    data: {
      tenantId,
      entityType: "AssistantPlan",
      entityId: `assistant-plan-${conversationId || tenantId}-${Date.now()}`,
      version: 1,
      status: "draft",
      content: {
        title,
        source: EXECUTIVE_ASSISTANT_TYPE,
        conversationId: conversationId || null,
      },
      meta: {
        generatedBy: "ai",
        source: EXECUTIVE_ASSISTANT_TYPE,
      },
      createdById: userId,
    },
  });

  return prisma.artifactTask.create({
    data: {
      tenantId,
      versionId: version.id,
      title,
      priority,
      status: "open",
      createdById: userId,
    },
  });
}

export async function getLatestExecutiveAssistantState(): Promise<{
  conversationId: string | null;
  messages: MessageData[];
}> {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    return { conversationId: null, messages: [] };
  }

  const conversations = await prisma.chatConversation.findMany({
    where: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const executiveConversation = conversations.find((item) => isExecutiveConversation(item.contextSnapshot));

  if (!executiveConversation) {
    return { conversationId: null, messages: [] };
  }

  return {
    conversationId: executiveConversation.id,
    messages: await mapStoredMessages(executiveConversation.id),
  };
}

export async function askExecutiveAssistant(
  userMessage: string,
  conversationId?: string | null
): Promise<{
  conversation: ConversationData;
  userMessage: MessageData;
  assistantMessage: MessageData;
}> {
  const { tenantId, userId } = await requireAssistantSession();

  let conversation = conversationId
    ? await prisma.chatConversation.findFirst({
        where: { id: conversationId, tenantId, userId },
      })
    : null;

  if (conversation && !isExecutiveConversation(conversation.contextSnapshot)) {
    throw new Error("当前会话不是首页 CEO 助手会话");
  }

  if (!conversation) {
    conversation = await createAssistantConversation(
      userMessage.slice(0, 20) || `CEO 助手 ${new Date().toLocaleDateString("zh-CN")}`,
      tenantId,
      userId
    );

    logActivity({
      tenantId,
      userId,
      action: ACTIVITY_ACTIONS.CHAT_CONVERSATION_CREATED,
      entityType: "ChatConversation",
      entityId: conversation.id,
      eventCategory: EVENT_CATEGORIES.CHAT,
      severity: "info",
      context: { assistantType: EXECUTIVE_ASSISTANT_TYPE },
    });
  }

  const savedUserMessage = await appendUserMessage(conversation.id, userMessage);
  const history = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 8,
  });

  const context = await buildAssistantContext(tenantId);
  const blockingPayload = buildBlockingPayload(context);
  const fallbackPayload = blockingPayload || buildFallbackPayload(userMessage, context);
  const contextSummary = createContextSummary(context);

  const systemPrompt = `你是 VertaX 首页 CEO 助手。你的任务是帮助老板在首页快速看懂：
- 本周商机
- 内容进度
- 当前阻塞点
- 下一步建议

回答要求：
1. 只基于给定上下文回答。
2. 不要编造数字、状态或路由。
3. 给出老板能直接执行的建议。
4. 仅输出 JSON，不要输出解释文字或 Markdown。

输出 JSON 结构：
{
  "conclusion": "一句结论",
  "evidence": ["依据1", "依据2"],
  "suggestions": ["建议1", "建议2"],
  "pendingConfirmation": ["待确认项1"],
  "actions": [
    {
      "type": "open_module|sync_marketing|sync_radar|create_task",
      "label": "按钮文案",
      "href": "/customer/...",
      "title": "create_task 时的任务标题",
      "priority": "urgent|normal|low",
      "description": "按钮说明"
    }
  ]
}

动作规则：
- open_module 只能使用给定的白名单路由。
- sync_marketing 仅在需要刷新增长策略时使用。
- sync_radar 仅在需要刷新获客雷达画像或筛选规则时使用。
- create_task 适合把建议转成待办。
- 最多返回 4 个 actions。
- 如果没有合适动作，actions 返回空数组。`;

  let payload = fallbackPayload;

  if (!blockingPayload) {
    try {
      const completion = await chatCompletion(
        [
          { role: "system", content: `${systemPrompt}\n\n上下文如下：\n${contextSummary}` },
          ...history.map((item) => ({
            role: item.role as "user" | "assistant",
            content: item.content,
          })),
        ],
        {
          model: "qwen-plus",
          temperature: 0.2,
          maxTokens: 2048,
        }
      );

      payload = normalizePayload(parseAssistantResponse(completion.content), fallbackPayload);
    } catch (error) {
      console.warn("[executive-assistant] fallback payload used:", error);
    }
  }

  const assistantMessage = await appendAssistantMessage(conversation.id, payload);

  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  logActivity({
    tenantId,
    userId,
    action: ACTIVITY_ACTIONS.CHAT_MESSAGE_SENT,
    entityType: "ChatMessage",
    entityId: assistantMessage.id,
    eventCategory: EVENT_CATEGORIES.CHAT,
    severity: "info",
    context: { assistantType: EXECUTIVE_ASSISTANT_TYPE, conversationId: conversation.id },
  });

  revalidatePath("/customer/home");

  return {
    conversation: {
      id: conversation.id,
      title: conversation.title || "CEO 助手对话",
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: history.length + 1,
    },
    userMessage: savedUserMessage,
    assistantMessage,
  };
}

export async function executeExecutiveAssistantAction(
  action: AssistantAction,
  conversationId?: string | null
): Promise<ExecutiveAssistantExecutionResult> {
  const { tenantId, userId } = await requireAssistantSession();
  const normalizedAction = normalizeAction(action);

  if (!normalizedAction) {
    throw new Error("不支持的助手动作");
  }

  let result: ExecutiveAssistantExecutionResult;
  let assistantPayload: ExecutiveAssistantPayload | null = null;

  switch (normalizedAction.type) {
    case "open_module":
      result = {
        success: true,
        message: `正在为你打开：${normalizedAction.label}`,
        href: normalizedAction.href,
        actionLabel: normalizedAction.label,
      };
      assistantPayload = {
        conclusion: `已准备打开 ${normalizedAction.label}。`,
        suggestions: ["到目标模块后可以继续追问，我会根据最新状态给你下一步建议。"],
        actions: [normalizedAction],
      };
      break;

    case "sync_marketing": {
      const version = await createTopicClusterDraft(tenantId, userId, {
        focusSegment: normalizedAction.focusSegment,
      });
      result = {
        success: true,
        message: "已同步到增长系统，并生成新的 Topic Cluster 草稿。",
        href: "/customer/marketing/strategy",
        actionLabel: normalizedAction.label,
      };
      assistantPayload = {
        conclusion: "增长系统同步已完成。",
        evidence: [`已生成 Topic Cluster 草稿版本 ${version.id}`],
        suggestions: ["进入增长策略页查看新草稿，并确认主题与内容地图是否符合当前目标。"],
        actions: [
          {
            type: "open_module",
            label: "查看增长策略",
            href: "/customer/marketing/strategy",
          },
        ],
      };
      break;
    }

    case "sync_radar": {
      const version = await createTargetingSpecDraft(tenantId, userId);
      result = {
        success: true,
        message: "已同步到获客雷达，并生成新的 Targeting Spec 草稿。",
        href: "/customer/radar/targeting",
        actionLabel: normalizedAction.label,
      };
      assistantPayload = {
        conclusion: "获客雷达同步已完成。",
        evidence: [`已生成 Targeting Spec 草稿版本 ${version.id}`],
        suggestions: ["进入雷达画像页检查细分市场、筛选规则与触发信号是否合理。"],
        actions: [
          {
            type: "open_module",
            label: "查看雷达画像",
            href: "/customer/radar/targeting",
          },
        ],
      };
      break;
    }

    case "create_task": {
      const task = await createAssistantTask(
        tenantId,
        userId,
        normalizedAction.title,
        normalizedAction.priority || "normal",
        conversationId || undefined
      );
      result = {
        success: true,
        message: "已加入推进中台待办。",
        href: "/customer/hub",
        actionLabel: normalizedAction.label,
      };
      assistantPayload = {
        conclusion: "待办已创建并同步到推进中台。",
        evidence: [`任务标题：${task.title}`],
        suggestions: ["可以在推进中台继续跟进、变更状态或补充说明。"],
        actions: [
          {
            type: "open_module",
            label: "查看推进中台",
            href: "/customer/hub",
          },
        ],
      };
      break;
    }
  }

  if (conversationId && assistantPayload) {
    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, tenantId, userId },
    });

    if (conversation && isExecutiveConversation(conversation.contextSnapshot)) {
      await appendAssistantMessage(conversationId, assistantPayload);
    }
  }

  revalidatePath("/customer/home");
  revalidatePath("/customer/hub");

  return result;
}
