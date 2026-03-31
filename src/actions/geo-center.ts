"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GeoContentItem = {
  id: string;
  title: string;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  status: string;
  briefId: string | null;
  geoVersion: string | null;
  aiMetadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Returns all SeoContent records that have a geoVersion in aiMetadata.
 */
export async function getGeoContents(): Promise<GeoContentItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const contents = await prisma.seoContent.findMany({
    where: {
      tenantId: session.user.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      metaTitle: true,
      metaDescription: true,
      keywords: true,
      status: true,
      briefId: true,
      aiMetadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return contents
    .map((c) => {
      const meta = (c.aiMetadata || {}) as Record<string, unknown>;
      const geoVersion = (meta.geoVersion as string | null) || null;
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        keywords: c.keywords as string[],
        status: c.status,
        briefId: c.briefId,
        geoVersion,
        aiMetadata: meta,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    })
    .filter((c) => !!c.geoVersion);
}
