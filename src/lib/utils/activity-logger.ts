import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface LogActivityParams {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  eventCategory?: string;
  severity?: "info" | "warn" | "error";
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * 统一活动日志记录工具
 * Fire-and-forget 模式：不抛异常，错误仅 console.error
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        eventCategory: params.eventCategory ?? null,
        severity: params.severity ?? "info",
        context: (params.context ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Fire-and-forget: 日志失败不应影响主流程
    console.error("[ActivityLogger] Failed to log activity:", error);
  }
}

/**
 * 预定义的活动类型常量
 */
export const ACTIVITY_ACTIONS = {
  // Knowledge
  EVIDENCE_CREATED: "evidence.created",
  EVIDENCE_UPDATED: "evidence.updated",
  EVIDENCE_DELETED: "evidence.deleted",
  GUIDELINE_CREATED: "guideline.created",
  GUIDELINE_UPDATED: "guideline.updated",
  COMPANY_PROFILE_UPDATED: "company_profile.updated",
  COMPANY_PROFILE_ANALYZED: "company_profile.analyzed",

  // Version
  VERSION_CREATED: "version.created",
  VERSION_STATUS_CHANGED: "version.status_changed",
  VERSION_REVERTED: "version.reverted",

  // Brief
  BRIEF_CREATED: "brief.created",
  BRIEF_UPDATED: "brief.updated",
  BRIEF_AI_GENERATED: "brief.ai_generated",

  // Content
  CONTENT_CREATED: "content.created",
  CONTENT_UPDATED: "content.updated",
  CONTENT_PUBLISHED: "content.published",
  CONTENT_AUTO_PUBLISHED: "content.auto_published", // 24h grace period auto-publish

  // Collaboration
  COMMENT_ADDED: "comment.added",
  COMMENT_RESOLVED: "comment.resolved",
  TASK_CREATED: "task.created",
  TASK_STATUS_CHANGED: "task.status_changed",

  // Chat
  CHAT_CONVERSATION_CREATED: "chat.conversation_created",
  CHAT_MESSAGE_SENT: "chat.message_sent",

  // Skills
  SKILL_EXECUTED: "skill.executed",
  SKILL_CHAIN_EXECUTED: "skill.chain_executed",
} as const;

export const EVENT_CATEGORIES = {
  KNOWLEDGE: "knowledge",
  MARKETING: "marketing",
  RADAR: "radar",
  REVIEW: "review",
  CHAT: "chat",
  SYSTEM: "system",
} as const;
