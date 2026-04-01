"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";

// ==================== Types ====================

export type ConversationData = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
};

export type MessageData = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  references?: ReferenceData[];
  createdAt: Date;
};

export type ReferenceData = {
  type: "evidence" | "profile" | "persona";
  id: string;
  title: string;
  snippet?: string;
};

// ==================== Helpers ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// Build system prompt with company context
async function buildSystemPrompt(tenantId: string): Promise<{ prompt: string; context: Record<string, unknown> }> {
  // Fetch company profile
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
  });

  // Fetch top personas
  const personas = await prisma.persona.findMany({
    where: { tenantId },
    take: 5,
    orderBy: { order: "asc" },
  });

  // Fetch active evidences
  const evidences = await prisma.evidence.findMany({
    where: { tenantId, deletedAt: null, status: "active" },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  // Fetch recent briefs
  const briefs = await prisma.contentBrief.findMany({
    where: { tenantId, deletedAt: null },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  // Build context summary
  const profileSummary = profile
    ? `企业名称: ${profile.companyName || "未设置"}
核心产品: ${(profile.coreProducts as string[])?.join("、") || "未设置"}
差异化卖点: ${(profile.differentiators as string[])?.join("、") || "未设置"}
目标行业: ${(profile.targetIndustries as string[])?.join("、") || "未设置"}`
    : "企业画像尚未创建";

  const personasSummary = personas.length > 0
    ? personas.map(p => `- ${p.name} (${p.title}): 关注 ${p.concerns.slice(0, 3).join("、")}`).join("\n")
    : "尚未创建买家角色";

  const evidencesSummary = evidences.length > 0
    ? evidences.slice(0, 10).map((e, i) => `[E${i + 1}] ${e.title}: ${e.content.substring(0, 100)}...`).join("\n")
    : "尚未收集证据";

  const briefsSummary = briefs.length > 0
    ? briefs.map(b => `- ${b.title} (${b.status}): 关键词 ${b.targetKeywords.slice(0, 3).join("、")}`).join("\n")
    : "暂无内容规划";

  const systemPrompt = `你是 VertaX 决策中心的AI助手，专门帮助B2B企业管理层了解营销和获客进展。

## 企业背景
${profileSummary}

## 目标客户画像
${personasSummary}

## 证据库（可引用）
${evidencesSummary}

## 内容规划进度
${briefsSummary}

## 回答规则
1. 基于上述真实数据回答问题，不要编造信息
2. 如果引用证据，使用 [E1]、[E2] 等标记
3. 回答要简洁专业，适合管理层快速了解
4. 如果数据不足，诚实说明并建议补充
5. 可以主动提供下一步建议

请用中文回答。`;

  return {
    prompt: systemPrompt,
    context: {
      hasProfile: !!profile,
      personaCount: personas.length,
      evidenceCount: evidences.length,
      briefCount: briefs.length,
      evidenceIds: evidences.map(e => e.id),
    },
  };
}

// ==================== Conversations ====================

export async function getConversations(): Promise<ConversationData[]> {
  const session = await getSession();

  const conversations = await prisma.chatConversation.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return conversations.map((c) => ({
    id: c.id,
    title: c.title || "未命名对话",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c._count.messages,
  }));
}

export async function createConversation(title?: string): Promise<ConversationData> {
  const session = await getSession();

  const conversation = await prisma.chatConversation.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      title: title || `对话 ${new Date().toLocaleDateString("zh-CN")}`,
    },
  });

  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.CHAT_CONVERSATION_CREATED,
    entityType: "ChatConversation",
    entityId: conversation.id,
    eventCategory: EVENT_CATEGORIES.CHAT,
    severity: "info",
  });

  revalidatePath("/customer/home");

  return {
    id: conversation.id,
    title: conversation.title || "未命名对话",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: 0,
  };
}

export async function deleteConversation(id: string): Promise<void> {
  const session = await getSession();

  await prisma.chatConversation.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/customer/home");
}

// ==================== Messages ====================

export async function getMessages(conversationId: string): Promise<MessageData[]> {
  const session = await getSession();

  // Verify conversation belongs to tenant
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId: session.user.tenantId },
  });
  if (!conversation) throw new Error("对话不存在");

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as "user" | "assistant",
    content: m.content,
    references: m.references as ReferenceData[] | undefined,
    createdAt: m.createdAt,
  }));
}

export async function sendMessage(
  conversationId: string,
  userMessage: string
): Promise<MessageData> {
  const session = await getSession();

  // Verify conversation belongs to tenant
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId: session.user.tenantId },
  });
  if (!conversation) throw new Error("对话不存在");

  // Save user message
  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  // Build system prompt with context
  const { prompt: systemPrompt, context } = await buildSystemPrompt(session.user.tenantId);

  // Get conversation history (last 10 messages for context)
  const history = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Call AI
  const response = await chatCompletion(messages, {
    model: "qwen-plus",
    temperature: 0.3,
    maxTokens: 2048,
  });

  // Extract references from response (simple pattern matching)
  const references: ReferenceData[] = [];
  const evidencePattern = /\[E(\d+)\]/g;
  let match;
  const evidenceIds = (context.evidenceIds as string[]) || [];
  while ((match = evidencePattern.exec(response.content)) !== null) {
    const idx = parseInt(match[1]) - 1;
    if (idx >= 0 && idx < evidenceIds.length) {
      const evidence = await prisma.evidence.findUnique({
        where: { id: evidenceIds[idx] },
        select: { id: true, title: true, content: true },
      });
      if (evidence && !references.find((r) => r.id === evidence.id)) {
        references.push({
          type: "evidence",
          id: evidence.id,
          title: evidence.title,
          snippet: evidence.content.substring(0, 100),
        });
      }
    }
  }

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: response.content,
      references: references.length > 0 ? references : undefined,
    },
  });

  // Update conversation timestamp
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.CHAT_MESSAGE_SENT,
    entityType: "ChatMessage",
    entityId: assistantMessage.id,
    eventCategory: EVENT_CATEGORIES.CHAT,
    severity: "info",
    context: { conversationId, hasReferences: references.length > 0 },
  });

  revalidatePath("/customer/home");

  return {
    id: assistantMessage.id,
    conversationId: assistantMessage.conversationId,
    role: "assistant",
    content: assistantMessage.content,
    references,
    createdAt: assistantMessage.createdAt,
  };
}

// ==================== Quick Questions ====================

export const QUICK_QUESTIONS = [
  "本周营销进展如何？",
  "有哪些高优先级任务需要关注？",
  "目标客户画像是什么？",
  "最近收集了哪些客户证据？",
  "内容规划的完成情况？",
  "下一步应该做什么？",
];
