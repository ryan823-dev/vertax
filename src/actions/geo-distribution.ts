'use server';

// ==================== GEO Distribution Tracking Actions ====================
// P2: Track GEO content distribution across AI engines and monitor citations

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

// Local enum types (mirrors schema.prisma — avoids dependency on generated client)
export type GeoChannel = 'CHATGPT' | 'PERPLEXITY' | 'CLAUDE' | 'GEMINI' | 'BING_COPILOT' | 'CUSTOM_SITE';
export type CitationStatus = 'PENDING' | 'CITED' | 'NOT_CITED' | 'PARTIAL' | 'ERROR';

// ==================== Types ====================

export type GeoDistributionData = {
  id: string;
  tenantId: string;
  contentId: string;
  channel: GeoChannel;
  channelDetail: string | null;
  distributedVersion: string | null;
  queryKeywords: string[];
  citationStatus: CitationStatus;
  citationUrl: string | null;
  citationSnippet: string | null;
  citationScore: number | null;
  lastCheckedAt: Date | null;
  checkCount: number;
  createdAt: Date;
  updatedAt: Date;
  content?: {
    id: string;
    title: string;
    slug: string;
    keywords: string[];
    geoVersion: string | null;
  };
};

export type GeoDistributionStats = {
  totalRecords: number;
  cited: number;
  notCited: number;
  pending: number;
  partial: number;
  byChannel: Array<{
    channel: GeoChannel;
    total: number;
    cited: number;
  }>;
};

// ==================== Channel metadata ====================

const CHANNEL_LABELS: Record<GeoChannel, string> = {
  CHATGPT: 'ChatGPT / ChatGPT Search',
  PERPLEXITY: 'Perplexity AI',
  CLAUDE: 'Claude',
  GEMINI: 'Gemini / Google AI Overviews',
  BING_COPILOT: 'Bing Copilot',
  CUSTOM_SITE: 'Custom Site',
};

export function getChannelLabel(channel: GeoChannel): string {
  return CHANNEL_LABELS[channel] || channel;
}

// ==================== Query ====================

/**
 * Get all distribution records for a content piece
 */
export async function getDistributionsForContent(
  contentId: string
): Promise<GeoDistributionData[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  return prisma.geoDistributionRecord.findMany({
    where: { contentId, tenantId: session.user.tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all distribution records with content details
 */
export async function getAllDistributions(): Promise<GeoDistributionData[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  return prisma.geoDistributionRecord.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      content: {
        select: {
          id: true,
          title: true,
          slug: true,
          keywords: true,
          geoVersion: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get distribution stats overview
 */
export async function getDistributionStats(): Promise<GeoDistributionStats> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  const tenantId = session.user.tenantId;

  const [total, cited, notCited, pending, partial, records] = await Promise.all([
    prisma.geoDistributionRecord.count({ where: { tenantId } }),
    prisma.geoDistributionRecord.count({ where: { tenantId, citationStatus: 'CITED' } }),
    prisma.geoDistributionRecord.count({ where: { tenantId, citationStatus: 'NOT_CITED' } }),
    prisma.geoDistributionRecord.count({ where: { tenantId, citationStatus: 'PENDING' } }),
    prisma.geoDistributionRecord.count({ where: { tenantId, citationStatus: 'PARTIAL' } }),
    prisma.geoDistributionRecord.findMany({
      where: { tenantId },
      select: { channel: true, citationStatus: true },
    }),
  ]);

  // Group by channel
  const channelMap = new Map<GeoChannel, { total: number; cited: number }>();
  for (const r of records) {
    const entry = channelMap.get(r.channel) || { total: 0, cited: 0 };
    entry.total++;
    if (r.citationStatus === 'CITED' || r.citationStatus === 'PARTIAL') {
      entry.cited++;
    }
    channelMap.set(r.channel, entry);
  }

  return {
    totalRecords: total,
    cited,
    notCited,
    pending,
    partial,
    byChannel: Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      ...data,
    })),
  };
}

// ==================== Mutations ====================

/**
 * Register a GEO distribution for a content piece on a specific channel.
 * Snapshots the geoVersion at distribution time.
 */
export async function registerDistribution(input: {
  contentId: string;
  channel: GeoChannel;
  channelDetail?: string;
  queryKeywords?: string[];
}): Promise<GeoDistributionData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  const tenantId = session.user.tenantId;

  // Get the content's geoVersion for snapshot
  const content = await prisma.seoContent.findUnique({
    where: { id: input.contentId },
    select: { geoVersion: true, aiMetadata: true, keywords: true },
  });

  const geoVersion = content?.geoVersion ?? null;
  const snapshot = geoVersion ? geoVersion.substring(0, 500) : null;
  const queryKeywords =
    input.queryKeywords && input.queryKeywords.length > 0
      ? input.queryKeywords
      : (content?.keywords as string[]) || [];

  const record = await prisma.geoDistributionRecord.upsert({
    where: {
      contentId_channel: {
        contentId: input.contentId,
        channel: input.channel,
      },
    },
    create: {
      tenantId,
      contentId: input.contentId,
      channel: input.channel,
      channelDetail: input.channelDetail ?? null,
      distributedVersion: snapshot,
      queryKeywords,
      citationStatus: 'PENDING',
    },
    update: {
      distributedVersion: snapshot,
      queryKeywords,
      channelDetail: input.channelDetail ?? undefined,
      citationStatus: 'PENDING',
      checkCount: 0,
      lastCheckedAt: null,
    },
  });

  revalidatePath('/customer/marketing/geo-center');
  return record;
}

/**
 * Batch register distribution across multiple channels
 */
export async function batchRegisterDistribution(input: {
  contentId: string;
  channels: GeoChannel[];
  queryKeywords?: string[];
}): Promise<{ created: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  let created = 0;
  for (const channel of input.channels) {
    await registerDistribution({
      contentId: input.contentId,
      channel,
      queryKeywords: input.queryKeywords,
    });
    created++;
  }

  revalidatePath('/customer/marketing/geo-center');
  return { created };
}

/**
 * Update citation check result (called by Cron or manual check)
 */
export async function updateCitationResult(
  recordId: string,
  result: {
    citationStatus: CitationStatus;
    citationUrl?: string;
    citationSnippet?: string;
    citationScore?: number;
  }
): Promise<GeoDistributionData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  const existing = await prisma.geoDistributionRecord.findUnique({
    where: { id: recordId },
    select: { checkHistory: true, checkCount: true },
  });

  const history = Array.isArray(existing?.checkHistory) ? existing.checkHistory : [];
  const newEntry = {
    checkedAt: new Date().toISOString(),
    status: result.citationStatus,
    snippet: result.citationSnippet || null,
  };

  const record = await prisma.geoDistributionRecord.update({
    where: { id: recordId, tenantId: session.user.tenantId },
    data: {
      citationStatus: result.citationStatus,
      citationUrl: result.citationUrl ?? null,
      citationSnippet: result.citationSnippet ?? null,
      citationScore: result.citationScore ?? null,
      lastCheckedAt: new Date(),
      checkCount: (existing?.checkCount || 0) + 1,
      checkHistory: [...history, newEntry] as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/customer/marketing/geo-center');
  return record;
}

/**
 * Delete a distribution record
 */
export async function deleteDistribution(recordId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  await prisma.geoDistributionRecord.delete({
    where: { id: recordId, tenantId: session.user.tenantId },
  });

  revalidatePath('/customer/marketing/geo-center');
}
