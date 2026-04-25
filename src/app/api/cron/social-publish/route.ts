/**
 * Cron: 瀹氭椂甯栧瓙鍙戝竷
 * 姣忓皬鏃惰繍琛岋紝鎵惧嚭 scheduledAt <= now 鐨?scheduled 鐘舵€佸笘瀛愬苟鍙戝竷
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from '@/lib/prisma';
import { publishSocialPostForTenant } from '@/actions/social';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const now = new Date();

  // Find all scheduled posts that are due to publish.
  const duePosts = await prisma.socialPost.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
    },
    select: { id: true, title: true, tenantId: true },
  });

  if (duePosts.length === 0) {
    return NextResponse.json({ published: 0, message: 'No due posts' });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const post of duePosts) {
    try {
      await publishSocialPostForTenant(post.id, post.tenantId);
      results.push({ id: post.id, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[social-publish] Failed to publish post ${post.id}:`, msg);
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: 'failed' },
      }).catch(() => {});
      results.push({ id: post.id, success: false, error: msg });
    }
  }

  const published = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return NextResponse.json({
    published,
    failed,
    total: duePosts.length,
    results,
  });
}

