/**
 * Cron: Auto-push
 * 姣忓皬鏃惰繍琛岋紝鎵弿 status=published 浣嗗皻鏃犳垚鍔?PushRecord 鐨勫唴瀹癸紝鎵归噺琛ユ帹銆? * 闃查噸锛氳烦杩囧凡鏈?PENDING / CONFIRMED 鐘舵€?PushRecord 鐨勫唴瀹广€? */

import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { createPublisherAdapter, mapVertaxToPaintcell } from "@/lib/publishers";
import type { PublisherAdapterConfig } from "@/lib/publishers";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  // 鑾峰彇鎵€鏈夋椿璺?WebsiteConfig锛堟敮鎸佸绔欙級
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs: any[] = await (prisma.websiteConfig as any).findMany({
    where: { isActive: true },
  });

  if (configs.length === 0) {
    return NextResponse.json({ pushed: 0, message: "No active website configs" });
  }

  const results: { tenantId: string; contentId: string; success: boolean; error?: string }[] = [];

  for (const config of configs) {
    // 鎵惧嚭璇ョ鎴峰凡鍙戝竷浣嗘病鏈夋垚鍔熸帹閫佽褰曠殑鍐呭
    const unpushed = await prisma.seoContent.findMany({
      where: {
        tenantId: config.tenantId,
        status: "published",
        deletedAt: null,
        pushRecords: {
          none: {
            websiteConfigId: config.id,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        },
      },
      include: { category: { select: { slug: true } } },
      take: 20, // 姣忔姣忕珯鏈€澶氳ˉ鎺?20 鏉★紝闃叉瓒呮椂
      orderBy: { publishedAt: "desc" },
    });

    if (unpushed.length === 0) continue;

    let adapter;
    try {
      adapter = createPublisherAdapter({
        siteType: config.siteType,
        supabaseUrl: config.supabaseUrl,
        functionName: config.functionName,
        webhookUrl: config.webhookUrl ?? null,
        wpUrl: config.wpUrl ?? null,
        wpUsername: config.wpUsername ?? null,
        wpPassword: config.wpPassword ?? null,
        pushSecret: config.pushSecret,
        customHeaders: config.customHeaders as Record<string, string> | null,
      } as PublisherAdapterConfig);
    } catch (err) {
      console.error(`[auto-push] Cannot create adapter for tenant ${config.tenantId}:`, err);
      continue;
    }

    const now = new Date();
    const timeoutAt = new Date(now.getTime() + (config.approvalTimeoutHours ?? 24) * 3600000);

    for (const content of unpushed) {
      try {
        const payload = mapVertaxToPaintcell(
          {
            id: content.id,
            title: content.title,
            slug: content.slug,
            content: content.content,
            excerpt: content.excerpt,
            metaTitle: content.metaTitle,
            metaDescription: content.metaDescription,
            keywords: content.keywords,
            featuredImage: content.featuredImage,
            categorySlug: content.category?.slug ?? "article",
          },
          { status: "published" }
        );

        const result = await adapter.publish(payload);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentVersion: number | null = (content as any).version ?? null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.pushRecord as any).upsert({
          where: { contentId_websiteConfigId: { contentId: content.id, websiteConfigId: config.id } },
          create: {
            tenantId: config.tenantId,
            contentId: content.id,
            websiteConfigId: config.id,
            status: result.success ? "PENDING" : "FAILED",
            remoteId: result.remoteId ?? null,
            remoteSlug: result.remoteSlug ?? null,
            targetUrl: result.remoteSlug
              ? `${config.url ?? ""}/en/resources/articles/${result.remoteSlug}`
              : null,
            pushPayload: JSON.parse(JSON.stringify(payload)),
            contentVersion,
            contentSnapshot: {
              title: content.title,
              slug: content.slug,
              excerpt: content.excerpt,
              keywords: content.keywords,
            },
            pushedAt: now,
            timeoutAt,
            retryCount: 0,
            lastError: result.error ?? null,
          },
          update: {
            status: result.success ? "PENDING" : "FAILED",
            remoteId: result.remoteId ?? null,
            remoteSlug: result.remoteSlug ?? null,
            pushPayload: JSON.parse(JSON.stringify(payload)),
            contentVersion,
            contentSnapshot: {
              title: content.title,
              slug: content.slug,
              excerpt: content.excerpt,
              keywords: content.keywords,
            },
            pushedAt: now,
            timeoutAt,
            retryCount: { increment: 1 },
            lastError: result.error ?? null,
          },
        });

        results.push({ tenantId: config.tenantId, contentId: content.id, success: result.success, error: result.error });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[auto-push] Error pushing ${content.id}:`, msg);
        results.push({ tenantId: config.tenantId, contentId: content.id, success: false, error: msg });
      }
    }
  }

  const pushed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return NextResponse.json({ pushed, failed, total: results.length, results });
}

