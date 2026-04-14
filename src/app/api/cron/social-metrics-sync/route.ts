/**
 * Cron: Social metrics sync
 * 姣忔棩 UTC 8:00 杩愯锛氬洖鎷?Twitter/YouTube 浜掑姩鏁版嵁鍐欏洖 PostVersion.metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 120;

// --- Twitter metrics fetch ---
async function fetchTwitterMetrics(
  tweetId: string,
  accessToken: string,
): Promise<Record<string, number> | null> {
  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.data?.public_metrics;
    if (!m) return null;
    return {
      likes: m.like_count ?? 0,
      retweets: m.retweet_count ?? 0,
      replies: m.reply_count ?? 0,
      views: m.impression_count ?? 0,
    };
  } catch {
    return null;
  }
}

// --- YouTube metrics fetch (via Data API v3) ---
async function fetchYouTubeMetrics(
  videoId: string,
  apiKey: string,
): Promise<Record<string, number> | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const stats = data?.items?.[0]?.statistics;
    if (!stats) return null;
    return {
      views: parseInt(stats.viewCount ?? '0'),
      likes: parseInt(stats.likeCount ?? '0'),
      comments: parseInt(stats.commentCount ?? '0'),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  // 鎵惧嚭 7 澶╁唴鍙戝竷鎴愬姛涓旀湁 platformPostId 鐨?PostVersions
  const versions = await prisma.postVersion.findMany({
    where: {
      publishedAt: { gte: since },
      platformPostId: { not: null },
    },
    select: {
      id: true,
      platform: true,
      platformPostId: true,
      postId: true,
      post: {
        select: {
          tenantId: true,
        },
      },
    },
  });

  if (versions.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No recent published versions' });
  }

  // 鎸?tenant 鍒嗙粍鍚庢壒閲忓彇 SocialAccount credentials
  const tenantIds = [...new Set(versions.map(v => v.post.tenantId))];
  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId: { in: tenantIds }, isActive: true },
    select: { tenantId: true, platform: true, accessToken: true, metadata: true },
  });

  const accountMap = new Map<string, typeof accounts[0]>();
  for (const acc of accounts) {
    accountMap.set(`${acc.tenantId}:${acc.platform}`, acc);
  }

  const results: { id: string; success: boolean; platform: string }[] = [];

  for (const version of versions) {
    const acc = accountMap.get(`${version.post.tenantId}:${version.platform}`);
    if (!acc || !version.platformPostId) {
      results.push({ id: version.id, success: false, platform: version.platform });
      continue;
    }

    let metrics: Record<string, number> | null = null;

    if (version.platform === 'x' || version.platform === 'twitter') {
      metrics = await fetchTwitterMetrics(
        version.platformPostId,
        acc.accessToken ?? '',
      );
    } else if (version.platform === 'youtube') {
      const meta = acc.metadata as Record<string, string> | null;
      const apiKey = meta?.apiKey ?? process.env.YOUTUBE_API_KEY ?? '';
      metrics = await fetchYouTubeMetrics(version.platformPostId, apiKey);
    }
    // LinkedIn public metrics require special scopes 鈥?skip for now

    if (metrics) {
      await prisma.postVersion.update({
        where: { id: version.id },
        data: { metrics: { ...metrics, syncedAt: new Date().toISOString() } },
      }).catch(() => {});
      results.push({ id: version.id, success: true, platform: version.platform });
    } else {
      results.push({ id: version.id, success: false, platform: version.platform });
    }
  }

  const synced = results.filter(r => r.success).length;
  return NextResponse.json({ synced, total: versions.length, results });
}

