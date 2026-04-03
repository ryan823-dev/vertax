/**
 * REST Pull API — 客户站主动拉取已发布内容
 *
 * GET /api/pull/{tenantId}/contents
 *   ?page=1&limit=20&since=ISO8601&category=article
 *
 * Auth: Authorization: Bearer {WebsiteConfig.pushSecret}
 *
 * 设计：用 tenantId 定位，用 pushSecret 鉴权，无需额外 pullApiKey 字段。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  // 1. Auth — Bearer token must match WebsiteConfig.pushSecret
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return unauthorized();

  // findFirst since tenantId is no longer @unique (1:N schema)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const websiteConfig: any = await (prisma.websiteConfig as any).findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, isActive: true, pushSecret: true, url: true },
  });
  if (!websiteConfig || !websiteConfig.isActive) return unauthorized("Site not configured");
  if (!websiteConfig.pushSecret || websiteConfig.pushSecret !== token) return unauthorized();

  // 2. Query params
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20")));
  const since = sp.get("since") ? new Date(sp.get("since")!) : undefined;
  const category = sp.get("category") ?? undefined;

  const where = {
    tenantId,
    deletedAt: null,
    status: "published",
    ...(since ? { publishedAt: { gte: since } } : {}),
    ...(category
      ? { category: { slug: category } }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.seoContent.count({ where }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.seoContent as any).findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
        keywords: true,
        featuredImage: true,
        status: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
        aiMetadata: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (items as any[]).map((item) => {
    const meta = (item.aiMetadata as Record<string, unknown> | null) ?? {};
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      content: item.content,
      excerpt: item.excerpt,
      meta_title: item.metaTitle,
      meta_description: item.metaDescription,
      keywords: item.keywords,
      featured_image_url: item.featuredImage,
      version: item.version ?? 1,
      category: item.category ? { name: item.category.name, slug: item.category.slug } : null,
      schema_json: meta.schemaJson ?? null,
      geo_version: meta.geoVersion ?? null,
      published_at: item.publishedAt,
      updated_at: item.updatedAt,
    };
  });

  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      limit,
      hasMore: page * limit < total,
      pages: Math.ceil(total / limit),
    },
  });
}
