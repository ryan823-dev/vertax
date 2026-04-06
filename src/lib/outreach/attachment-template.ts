/**
 * 邮件附件模板服务
 *
 * 为不同租户配置邮件附件
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend-client";

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface AttachmentTemplate {
  id: string;
  name: string;
  filename: string;
  contentType: string;
  storageKey: string;
  size: number;
  category: string;
  industry?: string;
  isDefault: boolean;
  createdAt: Date;
}

// ==================== 创建附件模板 ====================

export async function createAttachmentTemplate(
  tenantId: string,
  name: string,
  filename: string,
  contentType: string,
  storageKey: string,
  size: number,
  options?: {
    category?: string;
    industry?: string;
    isDefault?: boolean;
  }
): Promise<AttachmentTemplate | null> {
  try {
    // 如果设为默认，取消其他默认
    if (options?.isDefault) {
      await (db as any).attachmentTemplate?.updateMany?.({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await (db as any).attachmentTemplate?.create?.({
      data: {
        tenantId,
        name,
        filename,
        contentType,
        storageKey,
        size,
        category: options?.category || "other",
        industry: options?.industry,
        isDefault: options?.isDefault || false,
      },
    });

    return template || null;
  } catch (error) {
    console.error("[createAttachmentTemplate] Error:", error);
    return null;
  }
}

// ==================== 获取附件模板 ====================

export async function getAttachmentTemplates(
  tenantId: string,
  options?: { category?: string; industry?: string }
): Promise<AttachmentTemplate[]> {
  try {
    const templates = await (db as any).attachmentTemplate?.findMany?.({
      where: {
        tenantId,
        ...(options?.category && { category: options.category }),
        ...(options?.industry && { industry: options.industry }),
      },
      orderBy: { isDefault: "desc" },
    });

    return templates || [];
  } catch (error) {
    console.error("[getAttachmentTemplates] Error:", error);
    return [];
  }
}

export async function getDefaultAttachmentTemplate(
  tenantId: string
): Promise<AttachmentTemplate | null> {
  try {
    const template = await (db as any).attachmentTemplate?.findFirst?.({
      where: { tenantId, isDefault: true },
    });

    return template || null;
  } catch (error) {
    console.error("[getDefaultAttachmentTemplate] Error:", error);
    return null;
  }
}

// ==================== 发送带附件的邮件 ====================

export async function sendEmailWithAttachments(
  options: {
    to: string | string[];
    subject: string;
    html: string;
    tenantId: string;
    attachments?: EmailAttachment[];
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, tenantId, attachments } = options;

  return sendEmail({
    to,
    tenantId,
    subject,
    html,
    attachments,
  });
}

export default {
  createAttachmentTemplate,
  getAttachmentTemplates,
  getDefaultAttachmentTemplate,
  sendEmailWithAttachments,
};
