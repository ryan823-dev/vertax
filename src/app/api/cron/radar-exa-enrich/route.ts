/**
 * Cron: Exa 浜岄樁娈靛€欓€変赴瀵屽寲
 *
 * 姣?灏忔椂杩愯锛屽鐞?QUALIFIED 鐘舵€佷絾缂哄皯 website 鎴?email 鐨?Tier A/B 鍊欓€夛紝
 * 鐢?Exa Search 琛ュ叏鑱旂郴鏂瑰紡銆佸畼缃戙€丩inkedIn銆佸叕鍙告弿杩般€? *
 * 姣忔鏈€澶氬鐞?15 鏉★紙闃茶秴鏃讹級锛孍xa 姣忔潯绾?2 娆℃悳绱㈣姹傘€? */

import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { enrichCandidateWithExa } from "@/lib/radar/exa-enrich";
import { resolveApiKey } from "@/lib/services/api-key-resolver";

export const runtime = "nodejs";
export const maxDuration = 100;

const MAX_BATCH = 15;
const RATE_LIMIT_MS = 500; // Exa 璇锋眰闂撮殧

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!(await resolveApiKey("exa"))) {
    return NextResponse.json({ error: "EXA_API_KEY not configured" }, { status: 503 });
  }

  // Target A/B qualified companies that still miss core contact fields.
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
      { qualifyTier: "asc" },
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

      // 鍙洿鏂板疄闄呯己澶辩殑瀛楁锛屼笉瑕嗙洊宸叉湁鏁版嵁
      const updateData: Record<string, unknown> = {
        enrichedAt: new Date(),
      };
      if (!candidate.website && result.website) updateData.website = result.website;
      if (!candidate.email && result.email) updateData.email = result.email;
      if (result.linkedInUrl) updateData.linkedInUrl = result.linkedInUrl;
      if (result.description) {
        updateData.description = result.description;
      }

      // 鍚堝苟 rawData锛岃拷鍔?exaEnrich 蹇収
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

    // 閫熺巼闄愬埗
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  console.log(`[radar-exa-enrich] processed=${stats.processed} enriched=${stats.enriched} failed=${stats.failed}`);
  return NextResponse.json({ ok: true, ...stats, errors });
}

