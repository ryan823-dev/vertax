/**
 * 邮件外联序列服务
 *
 * 基于现有邮件发送系统，提供批量发送和跟进序列功能
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend-client";
import {
  formatCandidateContactHint,
  getCandidateOutreachContactProfile,
} from "@/lib/radar/contact-enrichment";
import type { EmailSequence } from "@/lib/research/email-sequence";

// ==================== 类型 ====================

export interface BatchSendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
  records: string[];
}

// ==================== 批量发送 ====================

export async function batchSendToCandidates(
  candidateIds: string[],
  tenantId: string,
  options?: {
    subject?: string;
    body?: string;
  }
): Promise<BatchSendResult> {
  const result: BatchSendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
    records: [],
  };

  // 获取所有候选人
  const candidates = await db.radarCandidate.findMany({
    where: { id: { in: candidateIds }, tenantId },
    select: { id: true, displayName: true, email: true, phone: true, rawData: true },
  });

  if (candidates.length === 0) {
    result.errors.push("未找到有效候选人");
    return result;
  }

  // 过滤有邮箱的候选人
  const candidatesWithProfiles = candidates.map((candidate) => ({
    candidate,
    contactProfile: getCandidateOutreachContactProfile(candidate),
  }));
  const validCandidates = candidatesWithProfiles.filter(
    ({ contactProfile }) =>
      Boolean(contactProfile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactProfile.email))
  );

  if (validCandidates.length === 0) {
    result.errors.push(
      candidatesWithProfiles
        .map(({ candidate, contactProfile }) =>
          `${candidate.displayName}: ${formatCandidateContactHint(contactProfile) || "无有效邮箱"}`
        )
        .join(" | ")
    );
    return result;
  }

  // 发送邮件
  for (const { candidate, contactProfile } of validCandidates) {
    try {
      const subject = options?.subject || "与您探讨合作机会";
      const body = options?.body || generateDefaultEmail(candidate.displayName);
      const targetEmail = contactProfile.email!;

      const sendResult = await sendEmail({
        to: targetEmail,
        tenantId,
        subject,
        html: body,
      });

      if (sendResult.success) {
        const record = await db.outreachRecord.create({
          data: {
            tenantId,
            candidateId: candidate.id,
            toEmail: targetEmail,
            toName: candidate.displayName,
            subject,
            bodyText: body,
            messageId: sendResult.messageId,
            status: "sent",
            sentAt: new Date(),
            metadata: {
              recommendedContact: contactProfile.recommendedContact?.label || null,
              primaryEmail: contactProfile.primaryEmail?.value || null,
              complianceNote: contactProfile.complianceNote || null,
            },
          },
        });

        result.records.push(record.id);
        result.sent++;
      } else {
        result.failed++;
        result.errors.push(`${candidate.displayName}: ${sendResult.error}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(
        `${candidate.displayName}: ${error instanceof Error ? error.message : "发送失败"}`
      );
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  result.success = result.sent > 0;
  return result;
}

// ==================== 序列发送 ====================

export async function sendWithSequence(
  candidateIds: string[],
  sequence: EmailSequence,
  tenantId: string
): Promise<BatchSendResult> {
  const result: BatchSendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
    records: [],
  };

  for (const email of sequence.emails) {
    for (const candidateId of candidateIds) {
      try {
        const candidate = await db.radarCandidate.findUnique({
          where: { id: candidateId },
          select: { id: true, displayName: true, email: true, phone: true, rawData: true },
        });

        const contactProfile = candidate ? getCandidateOutreachContactProfile(candidate) : null;
        const targetEmail = contactProfile?.email;

        if (!candidate || !targetEmail) {
          result.errors.push(
            `候选人 ${candidateId}: ${
              contactProfile ? formatCandidateContactHint(contactProfile) || "无邮箱" : "无邮箱"
            }`
          );
          continue;
        }

        const subject = renderTemplate(email.subject, { name: candidate.displayName });
        const body = renderTemplate(email.body, { name: candidate.displayName });

        const sendResult = await sendEmail({
          to: targetEmail,
          tenantId,
          subject,
          html: body,
        });

        if (sendResult.success) {
          const record = await db.outreachRecord.create({
            data: {
              tenantId,
              candidateId: candidate.id,
              toEmail: targetEmail,
              toName: candidate.displayName,
              subject,
              bodyText: body,
              messageId: sendResult.messageId,
              status: "sent",
              sentAt: new Date(),
              metadata: {
                recommendedContact: contactProfile?.recommendedContact?.label || null,
                primaryEmail: contactProfile?.primaryEmail?.value || null,
                complianceNote: contactProfile?.complianceNote || null,
              },
            },
          });

          result.records.push(record.id);
          result.sent++;
        } else {
          result.failed++;
          result.errors.push(`${candidate.displayName}: ${sendResult.error}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`${candidateId}: ${error instanceof Error ? error.message : "失败"}`);
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }

  result.success = result.sent > 0;
  return result;
}

// ==================== 跟进发送 ====================

export async function sendFollowUp(
  candidateId: string,
  followUpEmail: { subject: string; body: string },
  tenantId: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    const candidate = await db.radarCandidate.findUnique({
      where: { id: candidateId },
      select: { id: true, displayName: true, email: true, phone: true, rawData: true },
    });

    const contactProfile = candidate ? getCandidateOutreachContactProfile(candidate) : null;
    const targetEmail = contactProfile?.email;

    if (!candidate || !targetEmail) {
      return {
        success: false,
        error: contactProfile ? formatCandidateContactHint(contactProfile) || "无有效邮箱" : "无有效邮箱",
      };
    }

    const subject = renderTemplate(followUpEmail.subject, { name: candidate.displayName });
    const body = renderTemplate(followUpEmail.body, { name: candidate.displayName });

    const sendResult = await sendEmail({
      to: targetEmail,
      tenantId,
      subject,
      html: body,
    });

    if (sendResult.success) {
      const record = await db.outreachRecord.create({
        data: {
          tenantId,
          candidateId: candidate.id,
          toEmail: targetEmail,
          toName: candidate.displayName,
          subject,
          bodyText: body,
          messageId: sendResult.messageId,
          status: "sent",
          sentAt: new Date(),
          metadata: {
            recommendedContact: contactProfile?.recommendedContact?.label || null,
            primaryEmail: contactProfile?.primaryEmail?.value || null,
            complianceNote: contactProfile?.complianceNote || null,
          },
        },
      });

      return { success: true, recordId: record.id };
    }

    return { success: false, error: sendResult.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "失败" };
  }
}

// ==================== 定时处理 ====================

export async function processScheduledEmails(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const stats = { processed: 0, sent: 0, errors: 0 };

  const scheduledEmails = await db.outreachRecord.findMany({
    where: { status: "scheduled" },
    take: 50,
  });

  for (const email of scheduledEmails) {
    stats.processed++;

    try {
      const sendResult = await sendEmail({
        to: email.toEmail,
        tenantId: email.tenantId,
        subject: email.subject,
        html: email.bodyText || "",
      });

      if (sendResult.success) {
        await db.outreachRecord.update({
          where: { id: email.id },
          data: { status: "sent", sentAt: new Date(), messageId: sendResult.messageId },
        });
        stats.sent++;
      } else {
        await db.outreachRecord.update({
          where: { id: email.id },
          data: { status: "failed", error: sendResult.error },
        });
        stats.errors++;
      }
    } catch (error) {
      stats.errors++;
      console.error("[processScheduledEmails] Error:", error);
    }
  }

  return stats;
}

// ==================== 工具函数 ====================

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result || generateDefaultEmail(vars.name || "朋友");
}

function generateDefaultEmail(name: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>你好 ${name},</p>
      <p>希望这封邮件能找到你一切安好。</p>
      <p>我代表我们的团队，想与您探讨一个可能对您有帮助的合作机会。</p>
      <p>如果您对此感兴趣，非常希望能与您进行简短的交流。</p>
      <p>期待您的回复！</p>
      <p>祝好</p>
    </div>
  `;
}

const emailSequenceService = {
  batchSendToCandidates,
  sendWithSequence,
  sendFollowUp,
  processScheduledEmails,
};

export default emailSequenceService;
