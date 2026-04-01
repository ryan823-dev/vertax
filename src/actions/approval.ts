"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";
import { isValidTransition, type ArtifactStatusValue } from "@/types/artifact";
import { requireDecider } from "@/lib/permissions";

// ==================== Types ====================

export interface VersionHistoryEntry {
  id: string;
  version: number;
  status: ArtifactStatusValue;
  createdAt: Date;
  createdByName?: string;
  changeNote?: string;
}

export interface ApprovalResult {
  success: boolean;
  newStatus: ArtifactStatusValue;
  message: string;
}

// ==================== Helpers ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== Approval Actions ====================

/**
 * 请求修改：将版本状态从 in_review 转为 client_feedback
 * 需要填写修改原因，会自动创建一条系统评论
 */
export async function requestChanges(
  versionId: string,
  note: string
): Promise<ApprovalResult> {
  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }

  // 1. 获取版本信息
  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      entityType: true,
      entityId: true,
      version: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }
  if (version.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }

  const currentStatus = version.status as ArtifactStatusValue;
  const targetStatus: ArtifactStatusValue = "client_feedback";

  // 2. 验证状态转换
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${targetStatus}`);
  }

  // 3. 更新版本状态
  await prisma.artifactVersion.update({
    where: { id: versionId },
    data: { status: targetStatus },
  });

  // 4. 创建系统评论记录修改原因
  await prisma.artifactComment.create({
    data: {
      tenantId: session.user.tenantId,
      versionId,
      content: `[审批反馈] ${note}`,
      authorId: session.user.id,
    },
  });

  // 5. 记录活动日志
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.VERSION_STATUS_CHANGED,
    entityType: "ArtifactVersion",
    entityId: versionId,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "warn",
    context: {
      previousStatus: currentStatus,
      newStatus: targetStatus,
      reason: note,
      entityType: version.entityType,
      entityId: version.entityId,
      version: version.version,
    },
  });

  revalidatePath("/customer/hub");
  revalidatePath("/customer/knowledge/company");
  revalidatePath("/customer/marketing/contents");

  return {
    success: true,
    newStatus: targetStatus,
    message: "已请求修改，状态已更新为待反馈",
  };
}

/**
 * 批准版本：将版本状态从 in_review 转为 approved
 * 批准后版本将被冻结（只读）
 */
export async function approveVersion(versionId: string): Promise<ApprovalResult> {
  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }

  // 1. 获取版本信息
  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      entityType: true,
      entityId: true,
      version: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }
  if (version.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }

  const currentStatus = version.status as ArtifactStatusValue;
  const targetStatus: ArtifactStatusValue = "approved";

  // 2. 验证状态转换
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${targetStatus}`);
  }

  // 3. 更新版本状态为已批准（冻结）
  await prisma.artifactVersion.update({
    where: { id: versionId },
    data: { status: targetStatus },
  });

  // 4. 记录活动日志
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.VERSION_STATUS_CHANGED,
    entityType: "ArtifactVersion",
    entityId: versionId,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: {
      previousStatus: currentStatus,
      newStatus: targetStatus,
      frozenAt: new Date().toISOString(),
      entityType: version.entityType,
      entityId: version.entityId,
      version: version.version,
    },
  });

  revalidatePath("/customer/hub");
  revalidatePath("/customer/knowledge/company");
  revalidatePath("/customer/marketing/contents");

  return {
    success: true,
    newStatus: targetStatus,
    message: "版本已批准，内容已锁定",
  };
}

/**
 * 提交审核：将版本状态从 draft/revised 转为 in_review
 */
export async function submitForReview(versionId: string): Promise<ApprovalResult> {
  const session = await getSession();

  // 1. 获取版本信息
  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      entityType: true,
      entityId: true,
      version: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }
  if (version.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }

  const currentStatus = version.status as ArtifactStatusValue;
  const targetStatus: ArtifactStatusValue = "in_review";

  // 2. 验证状态转换
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${targetStatus}`);
  }

  // 3. 更新版本状态
  await prisma.artifactVersion.update({
    where: { id: versionId },
    data: { status: targetStatus },
  });

  // 4. 记录活动日志
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.VERSION_STATUS_CHANGED,
    entityType: "ArtifactVersion",
    entityId: versionId,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: {
      previousStatus: currentStatus,
      newStatus: targetStatus,
      entityType: version.entityType,
      entityId: version.entityId,
      version: version.version,
    },
  });

  revalidatePath("/customer/hub");

  return {
    success: true,
    newStatus: targetStatus,
    message: "已提交审核",
  };
}

/**
 * 标记已修订：将版本状态从 client_feedback 转为 revised
 */
export async function markAsRevised(versionId: string): Promise<ApprovalResult> {
  const session = await getSession();

  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      entityType: true,
      entityId: true,
      version: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }
  if (version.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }

  const currentStatus = version.status as ArtifactStatusValue;
  const targetStatus: ArtifactStatusValue = "revised";

  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${targetStatus}`);
  }

  await prisma.artifactVersion.update({
    where: { id: versionId },
    data: { status: targetStatus },
  });

  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.VERSION_STATUS_CHANGED,
    entityType: "ArtifactVersion",
    entityId: versionId,
    eventCategory: EVENT_CATEGORIES.REVIEW,
    severity: "info",
    context: {
      previousStatus: currentStatus,
      newStatus: targetStatus,
      entityType: version.entityType,
      entityId: version.entityId,
      version: version.version,
    },
  });

  revalidatePath("/customer/hub");

  return {
    success: true,
    newStatus: targetStatus,
    message: "已标记为已修订",
  };
}

// ==================== Version History ====================

/**
 * 获取实体的版本历史列表
 */
export async function getVersionHistory(
  entityType: string,
  entityId: string
): Promise<VersionHistoryEntry[]> {
  const session = await getSession();

  const versions = await prisma.artifactVersion.findMany({
    where: {
      tenantId: session.user.tenantId,
      entityType,
      entityId,
    },
    include: {
      createdBy: { select: { name: true } },
    },
    orderBy: { version: "desc" },
  });

  return versions.map((v) => ({
    id: v.id,
    version: v.version,
    status: v.status as ArtifactStatusValue,
    createdAt: v.createdAt,
    createdByName: v.createdBy.name || undefined,
    changeNote: (v.meta as Record<string, unknown>)?.changeNote as string | undefined,
  }));
}

/**
 * 获取单个版本详情
 */
export async function getVersionDetails(versionId: string) {
  const session = await getSession();

  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    include: {
      createdBy: { select: { name: true } },
      comments: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tasks: {
        include: { assignee: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }
  if (version.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }

  return {
    id: version.id,
    entityType: version.entityType,
    entityId: version.entityId,
    version: version.version,
    status: version.status as ArtifactStatusValue,
    content: version.content,
    meta: version.meta,
    createdAt: version.createdAt,
    createdByName: version.createdBy.name || undefined,
    commentCount: version.comments.length,
    taskCount: version.tasks.length,
    isReadOnly: version.status === "approved" || version.status === "archived",
  };
}

/**
 * 检查版本是否只读（已批准或已归档）
 */
export async function isVersionReadOnly(versionId: string): Promise<boolean> {
  const session = await getSession();

  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: { tenantId: true, status: true },
  });

  if (!version || version.tenantId !== session.user.tenantId) {
    return true; // 默认只读
  }

  return version.status === "approved" || version.status === "archived";
}
