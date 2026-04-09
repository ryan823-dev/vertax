/**
 * Cron: 雷达详情补全 & 情报丰富化 (Exa + Tavily + Hunter.io)
 * 
 * 每 6 小时执行一次 (vercel.json: 0 *\/6 * * *)
 * 对 status=ENRICHING 的候选进行深度丰富。
 * 
 * 2026-04-01 增强：
 * - 结合原始适配器 getDetails() 与通用的 Intelligence Enricher
 * - 引入 Hunter.io 查找决策者邮箱
 * - 引入 Tavily 作为备用搜索
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdapter, ensureAdaptersInitialized } from '@/lib/radar/adapters';
import { enrichWithSignalScore } from '@/lib/radar/intelligence-enricher';

const MAX_RUN_SECONDS = 55; // Vercel Hobby max is 60s, leave buffer
const MAX_BATCH_SIZE = 10;  // 深度丰富耗时较长，减小批次

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  ensureAdaptersInitialized();

  const stats = {
    processed: 0,
    adapterEnriched: 0,
    intelligenceEnriched: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 查询 ENRICHING 候选
    const candidates = await prisma.radarCandidate.findMany({
      where: { status: 'ENRICHING' },
      include: { source: true },
      take: MAX_BATCH_SIZE,
      orderBy: { updatedAt: 'asc' },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, ...stats, message: 'No ENRICHING candidates' });
    }

    for (const candidate of candidates) {
      if (Date.now() >= deadline) {
        stats.skipped++;
        continue;
      }

      console.log(`[RadarEnrich] Enriching candidate: ${candidate.displayName} (${candidate.id})`);
      
      try {
        // 1. 尝试原始适配器的 getDetails (比如从 Google Places 拿电话/详情)
        try {
          const adapter = getAdapter(
            candidate.source.code,
            candidate.source.adapterConfig as Record<string, unknown>
          );
          if (adapter.getDetails) {
            const details = await adapter.getDetails(candidate.externalId);
            if (details) {
              await prisma.radarCandidate.update({
                where: { id: candidate.id },
                data: {
                  phone: details.phone || candidate.phone,
                  email: details.email || candidate.email,
                  website: details.website || candidate.website,
                  address: details.address || candidate.address,
                  description: details.description || candidate.description,
                },
              });
              stats.adapterEnriched++;
            }
          }
        } catch {
          console.warn(`[RadarEnrich] Adapter getDetails failed for ${candidate.id}, continuing to intelligence enrich...`);
        }

        // 2. 深度情报丰富 (Exa + Tavily + Hunter.io)
        // 只有配置了 key 才会真正执行
        if (process.env.EXA_API_KEY || process.env.TAVILY_API_KEY) {
          const enrichResult = await enrichWithSignalScore(candidate.id);
          if (enrichResult.enrichment.success) {
            stats.intelligenceEnriched++;
          }
        }

        // 3. 标记为 QUALIFIED
        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: { status: 'QUALIFIED' },
        });

        stats.processed++;
      } catch (error) {
        console.error(`[RadarEnrich] Failed to enrich candidate ${candidate.id}:`, error);
        stats.failed++;
        stats.errors.push(`${candidate.displayName}: ${error instanceof Error ? error.message : 'Unknown'}`);
        
        // 报错也要流转状态，避免卡死
        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: { status: 'QUALIFIED' },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[radar-enrich] Fatal Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
