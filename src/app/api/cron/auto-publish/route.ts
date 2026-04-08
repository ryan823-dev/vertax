/**
 * Cron: Auto-publish
 * 每小时运行，扫描 awaiting_publish 状态且 autoPublishAt 已到期的内容，自动发布并推送。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushContentToWebsiteInternal } from "@/actions/publishing";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";
import { sendAutoPublishNotification } from "@/lib/email/resend-client";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  
  const dueContents = await prisma.seoContent.findMany({
    where: { status: "awaiting_publish", autoPublishAt: { lte: now }, deletedAt: null },
    include: { tenant: { select: { name: true } }, author: { select: { email: true, name: true } } },
    take: 50,
  });

  if (dueContents.length === 0) {
    return NextResponse.json({ processed: 0, message: "No contents due for auto-publish" });
  }

  const results: Array<{ contentId: string; title: string; tenantId: string; success: boolean; pushed: boolean; notified: boolean; error?: string }> = [];

  for (const content of dueContents) {
    const result = { contentId: content.id, title: content.title, tenantId: content.tenantId, success: false, pushed: false, notified: false };

    try {
      await prisma.seoContent.update({
        where: { id: content.id },
        data: { status: "published", publishedAt: now, autoPublishAt: null },
      });
      result.success = true;

      // Push to website
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const websiteConfig = await (prisma.websiteConfig as any).findFirst({
        where: { tenantId: content.tenantId, isActive: true },
      });
      if (websiteConfig) {
        const pushResult = await pushContentToWebsiteInternal(content.id, content.tenantId);
        result.pushed = pushResult.success;
        if (!pushResult.success) result.error = pushResult.error;
      }

      // In-app notification
      try {
        await prisma.notification.create({
          data: {
            tenantId: content.tenantId,
            type: "content_auto_published",
            title: "Content Auto-Published",
            body: `AI-generated content "${content.title.slice(0, 50)}..." has been automatically published after 24h grace period.`,
            actionUrl: `/customer/marketing/contents/${content.id}`,
          },
        });
        result.notified = true;
      } catch (e) { console.warn("[auto-publish] Notification failed:", e); }

      // Email notification
      if (content.author?.email) {
        try {
          await sendAutoPublishNotification({
            to: content.author.email,
            tenantId: content.tenantId,
            tenantName: content.tenant?.name || "Unknown",
            contentTitle: content.title,
            contentUrl: `${process.env.NEXT_PUBLIC_BASE_DOMAIN || "https://vertax.top"}/customer/marketing/contents/${content.id}`,
            dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_DOMAIN || "https://vertax.top"}/customer/marketing/contents`,
          });
        } catch (e) { console.warn("[auto-publish] Email failed:", e); }
      }

      // Activity log
      logActivity({
        tenantId: content.tenantId,
        userId: content.authorId,
        action: ACTIVITY_ACTIONS.CONTENT_AUTO_PUBLISHED,
        entityType: "SeoContent",
        entityId: content.id,
        eventCategory: EVENT_CATEGORIES.MARKETING,
        context: { title: content.title, pushed: result.pushed },
      });

    } catch (err) {
      result.error = err instanceof Error ? err.message : "Unknown error";
      console.error("[auto-publish] Failed for", content.id, err);
    }
    results.push(result);
  }

  return NextResponse.json({
    processed: results.length,
    successful: results.filter(r => r.success).length,
    pushed: results.filter(r => r.pushed).length,
    notified: results.filter(r => r.notified).length,
    failed: results.filter(r => !r.success).length,
  });
}