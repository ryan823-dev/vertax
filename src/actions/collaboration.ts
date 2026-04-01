"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";

// ==================== Types ====================

import type { AnchorSpec, AnchorType } from "@/types/artifact";

export type CommentData = {
  id: string;
  versionId: string;
  content: string;
  authorId: string;
  authorName?: string;
  parentId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  replies?: CommentData[];
  // 锚点字段
  anchorType?: AnchorType | null;
  anchorValue?: string | null;
  anchorLabel?: string | null;
  // 关联任务
  linkedTaskId?: string | null;
};

export type TaskData = {
  id: string;
  versionId: string;
  title: string;
  assigneeId: string | null;
  assigneeName?: string;
  status: "open" | "in_progress" | "done" | "cancelled";
  priority: "urgent" | "normal" | "low";
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // 来源评论
  sourceCommentId?: string | null;
};

export type CreateCommentInput = {
  versionId: string;
  content: string;
  parentId?: string;
  // 锚点（可选）
  anchor?: AnchorSpec;
};

export type CreateTaskInput = {
  versionId: string;
  title: string;
  assigneeId?: string;
  priority?: "urgent" | "normal" | "low";
  dueDate?: Date;
};

// ==================== Helpers ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== Comments ====================

export async function getCommentsByVersion(versionId: string): Promise<CommentData[]> {
  const session = await getSession();

  const comments = await prisma.artifactComment.findMany({
    where: {
      versionId,
      tenantId: session.user.tenantId,
      parentId: null, // Top-level only
    },
    include: {
      author: { select: { name: true } },
      linkedTask: { select: { id: true } },
      replies: {
        include: {
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return comments.map((c) => ({
    id: c.id,
    versionId: c.versionId,
    content: c.content,
    authorId: c.authorId,
    authorName: c.author.name || undefined,
    parentId: c.parentId,
    resolvedAt: c.resolvedAt,
    createdAt: c.createdAt,
    anchorType: c.anchorType as AnchorType | null,
    anchorValue: c.anchorValue,
    anchorLabel: c.anchorLabel,
    linkedTaskId: c.linkedTask?.id || null,
    replies: c.replies.map((r) => ({
      id: r.id,
      versionId: r.versionId,
      content: r.content,
      authorId: r.authorId,
      authorName: r.author.name || undefined,
      parentId: r.parentId,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      anchorType: r.anchorType as AnchorType | null,
      anchorValue: r.anchorValue,
      anchorLabel: r.anchorLabel,
    })),
  }));
}

export async function getAllComments(limit = 20): Promise<Array<CommentData & { entityType: string; entityId: string }>> {
  const session = await getSession();

  const comments = await prisma.artifactComment.findMany({
    where: {
      tenantId: session.user.tenantId,
      resolvedAt: null,
    },
    include: {
      author: { select: { name: true } },
      version: { select: { entityType: true, entityId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return comments.map((c) => ({
    id: c.id,
    versionId: c.versionId,
    content: c.content,
    authorId: c.authorId,
    authorName: c.author.name || undefined,
    parentId: c.parentId,
    resolvedAt: c.resolvedAt,
    createdAt: c.createdAt,
    entityType: c.version.entityType,
    entityId: c.version.entityId,
  }));
}

export async function createComment(input: CreateCommentInput): Promise<CommentData> {
  const session = await getSession();

  const comment = await prisma.artifactComment.create({
    data: {
      tenantId: session.user.tenantId,
      versionId: input.versionId,
      content: input.content,
      authorId: session.user.id,
      parentId: input.parentId || null,
      // 锚点字段
      anchorType: input.anchor?.type || null,
      anchorValue: input.anchor?.value || null,
      anchorLabel: input.anchor?.label || null,
    },
    include: {
      author: { select: { name: true } },
    },
  });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.COMMENT_ADDED,
    entityType: "ArtifactComment",
    entityId: comment.id,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: { 
      versionId: input.versionId, 
      isReply: !!input.parentId,
      hasAnchor: !!input.anchor,
      anchorType: input.anchor?.type,
    },
  });

  revalidatePath("/customer/hub");

  return {
    id: comment.id,
    versionId: comment.versionId,
    content: comment.content,
    authorId: comment.authorId,
    authorName: comment.author.name || undefined,
    parentId: comment.parentId,
    resolvedAt: comment.resolvedAt,
    createdAt: comment.createdAt,
    anchorType: comment.anchorType as AnchorType | null,
    anchorValue: comment.anchorValue,
    anchorLabel: comment.anchorLabel,
  };
}

export async function resolveComment(id: string): Promise<void> {
  const session = await getSession();

  await prisma.artifactComment.update({
    where: { id, tenantId: session.user.tenantId },
    data: { resolvedAt: new Date() },
  });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.COMMENT_RESOLVED,
    entityType: "ArtifactComment",
    entityId: id,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
  });

  revalidatePath("/customer/hub");
}

// ==================== Tasks ====================

export async function getTasksByVersion(versionId: string): Promise<TaskData[]> {
  const session = await getSession();

  const tasks = await prisma.artifactTask.findMany({
    where: {
      versionId,
      tenantId: session.user.tenantId,
    },
    include: {
      assignee: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return tasks.map((t) => ({
    id: t.id,
    versionId: t.versionId,
    title: t.title,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name || undefined,
    status: t.status as TaskData["status"],
    priority: t.priority as TaskData["priority"],
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getAllTasks(filters?: { 
  status?: string; 
  assigneeId?: string;
}): Promise<Array<TaskData & { entityType: string; entityId: string }>> {
  const session = await getSession();

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status;
  }
  if (filters?.assigneeId) {
    where.assigneeId = filters.assigneeId;
  }

  const tasks = await prisma.artifactTask.findMany({
    where,
    include: {
      assignee: { select: { name: true } },
      version: { select: { entityType: true, entityId: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return tasks.map((t) => ({
    id: t.id,
    versionId: t.versionId,
    title: t.title,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name || undefined,
    status: t.status as TaskData["status"],
    priority: t.priority as TaskData["priority"],
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    entityType: t.version.entityType,
    entityId: t.version.entityId,
  }));
}

export async function createTask(input: CreateTaskInput): Promise<TaskData> {
  const session = await getSession();

  const task = await prisma.artifactTask.create({
    data: {
      tenantId: session.user.tenantId,
      versionId: input.versionId,
      title: input.title,
      assigneeId: input.assigneeId || null,
      priority: input.priority || "normal",
      dueDate: input.dueDate || null,
      status: "open",
      createdById: session.user.id,
    },
  });

  // Fetch assignee separately if needed
  const assignee = task.assigneeId 
    ? await prisma.user.findUnique({ where: { id: task.assigneeId }, select: { name: true } })
    : null;

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.TASK_CREATED,
    entityType: "ArtifactTask",
    entityId: task.id,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: { title: task.title, versionId: input.versionId },
  });

  revalidatePath("/customer/hub");

  return {
    id: task.id,
    versionId: task.versionId,
    title: task.title,
    assigneeId: task.assigneeId,
    assigneeName: assignee?.name || undefined,
    status: task.status as TaskData["status"],
    priority: task.priority as TaskData["priority"],
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function updateTaskStatus(id: string, status: TaskData["status"]): Promise<void> {
  const session = await getSession();

  await prisma.artifactTask.update({
    where: { id, tenantId: session.user.tenantId },
    data: { status },
  });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.TASK_STATUS_CHANGED,
    entityType: "ArtifactTask",
    entityId: id,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: { newStatus: status },
  });

  revalidatePath("/customer/hub");
}

export async function updateTask(id: string, input: Partial<CreateTaskInput> & { status?: TaskData["status"] }): Promise<void> {
  const session = await getSession();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId || null;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate || null;
  if (input.status !== undefined) data.status = input.status;

  await prisma.artifactTask.update({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  revalidatePath("/customer/hub");
}

// ==================== Stats ====================

export async function getCollaborationStats(): Promise<{
  openComments: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasksToday: number;
}> {
  const session = await getSession();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [openComments, openTasks, inProgressTasks, completedTasksToday] = await Promise.all([
    prisma.artifactComment.count({
      where: { tenantId: session.user.tenantId, resolvedAt: null },
    }),
    prisma.artifactTask.count({
      where: { tenantId: session.user.tenantId, status: "open" },
    }),
    prisma.artifactTask.count({
      where: { tenantId: session.user.tenantId, status: "in_progress" },
    }),
    prisma.artifactTask.count({
      where: {
        tenantId: session.user.tenantId,
        status: "done",
        updatedAt: { gte: todayStart },
      },
    }),
  ]);

  return { openComments, openTasks, inProgressTasks, completedTasksToday };
}

// ==================== Comment to Task Conversion ====================

export async function convertCommentToTask(
  commentId: string,
  taskInput: Omit<CreateTaskInput, 'versionId'>
): Promise<TaskData> {
  const session = await getSession();

  // 1. 获取评论信息
  const comment = await prisma.artifactComment.findUnique({
    where: { id: commentId },
    select: { 
      id: true, 
      versionId: true, 
      tenantId: true, 
      content: true,
      linkedTask: { select: { id: true } },
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }
  if (comment.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }
  if (comment.linkedTask) {
    throw new Error("Comment already has a linked task");
  }

  // 2. 创建任务并关联评论
  const task = await prisma.artifactTask.create({
    data: {
      tenantId: session.user.tenantId,
      versionId: comment.versionId,
      title: taskInput.title || comment.content.slice(0, 50) + (comment.content.length > 50 ? '...' : ''),
      assigneeId: taskInput.assigneeId || null,
      priority: taskInput.priority || "normal",
      dueDate: taskInput.dueDate || null,
      status: "open",
      createdById: session.user.id,
      sourceCommentId: commentId,
    },
    include: {
      assignee: { select: { name: true } },
    },
  });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.TASK_CREATED,
    entityType: "ArtifactTask",
    entityId: task.id,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: { 
      title: task.title, 
      versionId: comment.versionId,
      fromCommentId: commentId,
    },
  });

  revalidatePath("/customer/hub");

  return {
    id: task.id,
    versionId: task.versionId,
    title: task.title,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.name || undefined,
    status: task.status as TaskData["status"],
    priority: task.priority as TaskData["priority"],
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    sourceCommentId: task.sourceCommentId,
  };
}

// ==================== Activity History ====================

export type ActivityEntry = {
  id: string;
  action: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
  context: Record<string, unknown>;
  user: { name: string | null } | null;
};

/**
 * 查询某实体的 Activity 历史（用于 CollaborativeShell 历史标签页）
 */
export async function getEntityActivities(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<ActivityEntry[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const activities = await prisma.activity.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      createdAt: true,
      metadata: true,
      context: true,
      user: { select: { name: true } },
    },
  });

  return activities.map((a) => ({
    id: a.id,
    action: a.action,
    createdAt: a.createdAt,
    metadata: (a.metadata as Record<string, unknown>) ?? {},
    context: (a.context as Record<string, unknown>) ?? {},
    user: a.user,
  }));
}
