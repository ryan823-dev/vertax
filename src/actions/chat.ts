"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";

export type ConversationData = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
};

export type ReferenceData = {
  type: "evidence" | "profile" | "persona";
  id: string;
  title: string;
  snippet?: string;
};

export type MessageData = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  references?: ReferenceData[];
  payload?: Prisma.JsonObject | null;
  createdAt: Date;
};

function isMissingChatMessagePayloadColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const message = error instanceof Error ? error.message : "";

  return code === "P2022" && message.includes("ChatMessage.payload");
}

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function buildSystemPrompt(
  tenantId: string
): Promise<{ prompt: string; context: Record<string, unknown> }> {
  const [profile, personas, evidences, briefs] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.persona.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { order: "asc" },
    }),
    prisma.evidence.findMany({
      where: { tenantId, deletedAt: null, status: "active" },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentBrief.findMany({
      where: { tenantId, deletedAt: null },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const profileSummary = profile
    ? `企业名称: ${profile.companyName || "未设置"}
核心产品: ${Array.isArray(profile.coreProducts) ? (profile.coreProducts as string[]).join("、") : "未设置"}
差异化卖点: ${Array.isArray(profile.differentiators) ? (profile.differentiators as string[]).join("、") : "未设置"}
目标行业: ${Array.isArray(profile.targetIndustries) ? (profile.targetIndustries as string[]).join("、") : "未设置"}`
    : "企业画像尚未创建";

  const personasSummary =
    personas.length > 0
      ? personas
          .map((persona) => `- ${persona.name} (${persona.title}): 关注 ${persona.concerns.slice(0, 3).join("、")}`)
          .join("\n")
      : "暂无买家画像";

  const evidencesSummary =
    evidences.length > 0
      ? evidences
          .slice(0, 10)
          .map((evidence, index) => `[E${index + 1}] ${evidence.title}: ${evidence.content.slice(0, 100)}...`)
          .join("\n")
      : "暂无可引用证据";

  const briefsSummary =
    briefs.length > 0
      ? briefs
          .map((brief) => `- ${brief.title} (${brief.status}): ${brief.targetKeywords.slice(0, 3).join("、")}`)
          .join("\n")
      : "暂无内容规划";

  return {
    prompt: `你是 VertaX 决策中心的 AI 助手，帮助管理层快速了解营销、内容与获客进展。

## 企业背景
${profileSummary}

## 买家画像
${personasSummary}

## 证据库
${evidencesSummary}

## 内容规划
${briefsSummary}

## 回答规则
1. 只基于已知信息回答，不编造。
2. 引用证据时使用 [E1]、[E2] 这样的编号。
3. 回答简洁、专业、适合老板快速阅读。
4. 数据不足时明确指出，并给出下一步建议。
5. 全程使用中文。`,
    context: {
      evidenceIds: evidences.map((evidence) => evidence.id),
    },
  };
}

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

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title || "未命名对话",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation._count.messages,
  }));
}

export async function createConversation(
  title?: string,
  contextSnapshot?: Prisma.InputJsonValue
): Promise<ConversationData> {
  const session = await getSession();

  const conversation = await prisma.chatConversation.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      title: title || `对话 ${new Date().toLocaleDateString("zh-CN")}`,
      contextSnapshot,
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

export async function getMessages(conversationId: string): Promise<MessageData[]> {
  const session = await getSession();

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId: session.user.tenantId },
  });
  if (!conversation) {
    throw new Error("对话不存在");
  }

  let messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: Date;
    references?: Prisma.JsonValue | null;
    payload?: Prisma.JsonValue | null;
  }>;

  try {
    messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    if (!isMissingChatMessagePayloadColumn(error)) {
      throw error;
    }

    console.warn(
      "[chat] ChatMessage.payload column is missing, falling back to legacy message mapping."
    );

    messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        conversationId: true,
        role: true,
        content: true,
        references: true,
        createdAt: true,
      },
    });
  }

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as "user" | "assistant",
    content: message.content,
    references: message.references as ReferenceData[] | undefined,
    payload: (message.payload as Prisma.JsonObject | null | undefined) ?? null,
    createdAt: message.createdAt,
  }));
}

export async function sendMessage(conversationId: string, userMessage: string): Promise<MessageData> {
  const session = await getSession();

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId: session.user.tenantId },
  });
  if (!conversation) {
    throw new Error("对话不存在");
  }

  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  const { prompt: systemPrompt, context } = await buildSystemPrompt(session.user.tenantId);
  const history = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      ...history.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
    ],
    {
      model: "qwen-plus",
      temperature: 0.3,
      maxTokens: 2048,
    }
  );

  const references: ReferenceData[] = [];
  const evidencePattern = /\[E(\d+)\]/g;
  const evidenceIds = (context.evidenceIds as string[]) || [];

  let match: RegExpExecArray | null;
  while ((match = evidencePattern.exec(response.content)) !== null) {
    const index = Number.parseInt(match[1], 10) - 1;
    if (index < 0 || index >= evidenceIds.length) {
      continue;
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceIds[index] },
      select: { id: true, title: true, content: true },
    });

    if (evidence && !references.some((reference) => reference.id === evidence.id)) {
      references.push({
        type: "evidence",
        id: evidence.id,
        title: evidence.title,
        snippet: evidence.content.slice(0, 100),
      });
    }
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: response.content,
      references: references.length > 0 ? references : undefined,
    },
  });

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

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
    payload: null,
    createdAt: assistantMessage.createdAt,
  };
}
