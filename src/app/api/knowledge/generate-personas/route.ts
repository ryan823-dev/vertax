import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, parseStructuredJsonObjectResponse } from "@/lib/ai-client";
import { normalizeTargetRegionRecords } from "@/lib/regions";
import {
  ensureCompanyProfileAnalysisEvidence,
  getCompanyProfileAnalysisAssets,
} from "@/lib/knowledge/company-profile-analysis";

export const maxDuration = 60;

const PERSONA_PROMPT = `You are a B2B go-to-market strategist for Chinese suppliers expanding overseas.

Given a company profile, infer:
1. buyerPersonas: 3 to 5 buyer roles across decision-maker, influencer, and user layers
2. targetIndustries: 2 to 5 overseas-friendly industries
3. targetRegions: 2 to 5 overseas market clusters

Hard requirements:
- Focus on overseas markets only. Do not include mainland China regions.
- Keep personas specific and procurement-oriented.
- Each persona must include 2 to 5 concrete concerns.
- Each target region item must include region, countries, and rationale.
- Return strict JSON only.

JSON shape:
{
  "buyerPersonas": [
    { "role": "Role name", "title": "Typical title", "concerns": ["Concern 1", "Concern 2"] }
  ],
  "targetIndustries": ["Industry 1", "Industry 2"],
  "targetRegions": [
    { "region": "Region name", "countries": ["Country 1", "Country 2"], "rationale": "Why this region fits" }
  ]
}`;

function buildEvidenceContext(
  evidences: Array<{ type: string; title: string; content: string }>,
): string {
  if (evidences.length === 0) {
    return "";
  }

  return evidences
    .slice(0, 10)
    .map(
      (evidence, index) =>
        `- [E${index + 1}] (${evidence.type}) ${evidence.title}: ${evidence.content.slice(0, 180)}`,
    )
    .join("\n");
}

export async function POST() {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const profile = await prisma.companyProfile.findUnique({ where: { tenantId } });
    if (!profile) {
      return NextResponse.json({ error: "请先生成企业档案" }, { status: 400 });
    }

    const coreProducts =
      (profile.coreProducts as Array<{ name: string; description: string }>) || [];
    const techAdvantages =
      (profile.techAdvantages as Array<{ title: string; description: string }>) || [];
    const scenarios =
      (profile.scenarios as Array<{ industry: string; scenario: string; value: string }>) || [];
    const analysisSourceIds = Array.isArray(profile.analysisSource)
      ? (profile.analysisSource as string[])
      : [];

    const assetSelection = await getCompanyProfileAnalysisAssets({
      tenantId,
      assetIds: analysisSourceIds,
    });

    const evidenceMaterialization =
      assetSelection.selected.length > 0
        ? await ensureCompanyProfileAnalysisEvidence({
            tenantId,
            userId: session.user.id,
            assets: assetSelection.selected,
          })
        : null;

    const evidenceContext = buildEvidenceContext(
      evidenceMaterialization?.evidences ?? [],
    );

    let ctx = `Company: ${profile.companyName ?? ""}\nIntro: ${(profile.companyIntro || "").slice(0, 800)}`;

    if (coreProducts.length > 0) {
      ctx += `\n\nCore products:\n${coreProducts
        .map((p) => `- ${p.name}: ${p.description}`)
        .join("\n")}`;
    }

    if (techAdvantages.length > 0) {
      ctx += `\n\nTechnical advantages:\n${techAdvantages
        .map((a) => `- ${a.title}: ${a.description}`)
        .join("\n")}`;
    }

    if (scenarios.length > 0) {
      ctx += `\n\nUse cases:\n${scenarios
        .map((s) => `- ${s.industry}/${s.scenario}: ${s.value}`)
        .join("\n")}`;
    }

    if (evidenceContext) {
      ctx += `\n\nStructured evidence:\n${evidenceContext}`;
    }

    const aiResponse = await chatCompletion(
      [
        { role: "system", content: PERSONA_PROMPT },
        { role: "user", content: ctx },
      ],
      { model: "qwen-plus", temperature: 0.3, maxTokens: 2048 },
    );

    let parsed: {
      buyerPersonas?: Array<{ role: string; title: string; concerns: string[] }>;
      targetIndustries?: string[];
      targetRegions?:
        | Array<{ region: string; countries: string[]; rationale: string }>
        | string[];
    };

    try {
      parsed = (await parseStructuredJsonObjectResponse(aiResponse.content)) as typeof parsed;
    } catch (error) {
      console.error("[generate-personas] JSON parse failed:", String(error));
      return NextResponse.json(
        { error: "AI 返回格式异常", raw: aiResponse.content.slice(0, 200) },
        { status: 500 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.buyerPersonas && parsed.buyerPersonas.length > 0) {
      updateData.buyerPersonas = parsed.buyerPersonas;
    }

    if (parsed.targetIndustries && parsed.targetIndustries.length > 0) {
      updateData.targetIndustries = parsed.targetIndustries;
    }

    if (parsed.targetRegions && parsed.targetRegions.length > 0) {
      const filteredRegions = normalizeTargetRegionRecords(parsed.targetRegions);
      if (filteredRegions.length > 0) {
        updateData.targetRegions = filteredRegions;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.companyProfile.update({
        where: { tenantId },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      buyerPersonas: parsed.buyerPersonas || [],
      targetIndustries: parsed.targetIndustries || [],
      targetRegions: parsed.targetRegions || [],
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[generate-personas] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
