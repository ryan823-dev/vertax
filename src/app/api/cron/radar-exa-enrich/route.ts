/**
 * Cron: Exa 二阶段候选丰富化
 *
 * 每6小时运行，处理 QUALIFIED 状态但缺少 website 或 email 的 Tier A/B 候选，
 * 用 Exa Search 补全联系方式、官网、LinkedIn、公司描述。
 *
 * 每次最多处理 15 条（防超时），Exa 每条约 2 次搜索请求。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichCandidateWithExa } from "@/lib/radar/exa-enrich";
import { resolveApiKey } from "@/lib/services/api-key-resolver";

export const runtime = "nodejs";
export const maxDuration = 100;

const MAX_BATCH = 15;
const RATE_LIMIT_MS = 500; // Exa 请求间隔

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await resolveApiKey("exa"))) {
    return NextResponse.json({ error: "EXA_API_KEY not configured" }, { status: 503 });
  }

  // 找 QUALIFIED 且 Tier A/B 且缺关键字段的候选
  const candidates = await prisma.radarCandidate.findMany({
    where: {
      status: "QUALIFIED",
      qualifyTier: { in: ["A", "B"] },
      candidateType: "COMPANY",
      OR: [
        { website: null },
        { email: null },
      ],
    },
    select: {
      id: true,
      displayName: true,
      country: true,
      industry: true,
      website: true,
      email: true,
      rawData: true,
    },
    orderBy: [
      { qualifyTier: "asc" }, // A 先处理
      { createdAt: "asc" },
    ],
    take: MAX_BATCH,
  });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No candidates need enrichment" });
  }

  const stats = { processed: 0, enriched: 0, failed: 0, skipped: 0 };
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const result = await enrichCandidateWithExa(
        candidate.displayName,
        candidate.country,
        candidate.industry
      );

      // 只更新实际缺失的字段，不覆盖已有数据
      const updateData: Record<string, unknown> = {
        enrichedAt: new Date(),
      };
      if (!candidate.website && result.website) updateData.website = result.website;
      if (!candidate.email && result.email) updateData.email = result.email;
      if (result.linkedInUrl) updateData.linkedInUrl = result.linkedInUrl;
      if (result.description) {
        // 只在没有描述时写入
        updateData.description = result.description;
      }

      // 合并 rawData，追加 exaEnrich 快照
      const existingRaw = (candidate.rawData as Record<string, unknown> | null) ?? {};
      updateData.rawData = {
        ...existingRaw,
        ...(result.rawSnapshot ?? {}),
      };

      await prisma.radarCandidate.update({
        where: { id: candidate.id },
        data: updateData,
      });

      const didEnrich = !!(
        (!candidate.website && result.website) ||
        (!candidate.email && result.email) ||
        result.linkedInUrl
      );
      if (didEnrich) stats.enriched++;
      else stats.skipped++;
      stats.processed++;
    } catch (err) {
      stats.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${candidate.id} (${candidate.displayName}): ${msg}`);
      console.error(`[radar-exa-enrich] Failed ${candidate.id}:`, msg);
    }

    // 速率限制
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  console.log(`[radar-exa-enrich] processed=${stats.processed} enriched=${stats.enriched} failed=${stats.failed}`);
  return NextResponse.json({ ok: true, ...stats, errors });
}
