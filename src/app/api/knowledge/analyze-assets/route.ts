import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeCompanyProfile } from "@/lib/ai-client";
import { normalizeTargetRegionRecords } from "@/lib/regions";
import {
  buildCompanyProfileAnalysisContext,
  getCompanyProfileAnalysisAssets,
} from "@/lib/knowledge/company-profile-analysis";

// Pro plan: OSS download + AI analysis can take 60s+
export const maxDuration = 60;

/**
 * POST /api/knowledge/analyze-assets
 * 从资产中提取文本并用 AI 生成企业能力画像（替代 Server Action 绕过超时）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId as string;
    const body = (await request.json()) as { assetIds?: string[] };
    const requestedAssetIds = Array.isArray(body.assetIds) ? body.assetIds : [];

    console.log(`[analyze-assets] execPath=${process.execPath}, cwd=${process.cwd()}, node=${process.version}`);
    console.log(
      `[analyze-assets] step 1: resolve assets, requested=${requestedAssetIds.length}`,
    );

    const selection = await getCompanyProfileAnalysisAssets({
      tenantId,
      assetIds: requestedAssetIds,
    });
    const assets = selection.selected;
    const selectedAssetIds = assets.map((asset) => asset.id);

    console.log(
      `[analyze-assets] step 2: resolved ${selectedAssetIds.length} assets (mode=${selection.mode}, available=${selection.availableCount})`,
    );

    if (assets.length === 0) {
      return NextResponse.json({ error: "未找到可分析的素材" }, { status: 400 });
    }

    const context = await buildCompanyProfileAnalysisContext({
      tenantId,
      assets,
      userId: session.user.id,
    });

    if (context.sections.length === 0) {
      return NextResponse.json(
        { error: "所有素材的文本提取均失败，请确认素材格式" },
        { status: 400 }
      );
    }

    console.log(
      `[analyze-assets] step 3: built corpus from ${context.stats.assetCount} assets, ` +
        `${context.stats.rawChunkCount} raw chunks, ${context.stats.selectedChunkCount} selected chunks, ` +
        `${context.stats.selectedEvidenceCount} selected evidences (${context.stats.generatedEvidenceCount} generated / ${context.stats.reusedEvidenceCount} reused), ` +
        `${context.stats.contextChars} chars`,
    );

    // 读取已探索区域，用于指导 AI 推荐新市场
    const existingProfile = await db.companyProfile.findUnique({
      where: { tenantId },
      select: { exploredRegions: true, targetRegions: true },
    });
    const exploredRegions = (existingProfile?.exploredRegions as Array<{ region: string; countries?: string[]; exploredAt?: string }>) || [];
    const exploredNames = exploredRegions.map(r => r.region);

    // 将已探索区域注入到分析文本中，作为额外上下文
    const exploredContext = exploredNames.length > 0
      ? `\n\n【已探索过的海外市场】\n以下区域已在之前的分析中推荐过，请优先探索其他未覆盖的海外区域和国家。如果确实没有更多适合的新区域，可以在已探索区域内推荐新的具体国家。\n已探索：${exploredNames.join('、')}\n`
      : '';

    // 调用 AI 分析（将已探索信息追加到第一个文本块末尾）
    const { analysis, model } = await analyzeCompanyProfile(
      context.sections.map((section, index) =>
        index === 0 ? section + exploredContext : section,
      )
    );

    console.log(`[analyze-assets] AI analysis completed, model: ${model}`);

    // 合并区域探索记录：将本次新推荐的区域追加到已探索列表
    const newRegions = normalizeTargetRegionRecords(analysis.targetRegions);
    const now = new Date().toISOString();
    const updatedExplored = [...exploredRegions];
    for (const nr of newRegions) {
      if (!updatedExplored.some(er => er.region === nr.region)) {
        updatedExplored.push({ ...nr, exploredAt: now });
      }
    }

    // 保存/更新企业画像
    const profile = await db.companyProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        companyName: (analysis.companyName as string) || null,
        companyIntro: (analysis.companyIntro as string) || null,
        coreProducts: (analysis.coreProducts as object) || [],
        techAdvantages: (analysis.techAdvantages as object) || [],
        scenarios: (analysis.scenarios as object) || [],
        differentiators: (analysis.differentiators as object) || [],
        targetIndustries: (analysis.targetIndustries as object) || [],
        targetRegions: newRegions,
        buyerPersonas: (analysis.buyerPersonas as object) || [],
        painPoints: (analysis.painPoints as object) || [],
        buyingTriggers: (analysis.buyingTriggers as object) || [],
        exploredRegions: updatedExplored,
        lastAnalyzedAt: new Date(),
        analysisSource: selectedAssetIds,
        aiModel: model,
        rawAnalysis: JSON.stringify(analysis),
      },
      update: {
        companyName: (analysis.companyName as string) || null,
        companyIntro: (analysis.companyIntro as string) || null,
        coreProducts: (analysis.coreProducts as object) || [],
        techAdvantages: (analysis.techAdvantages as object) || [],
        scenarios: (analysis.scenarios as object) || [],
        differentiators: (analysis.differentiators as object) || [],
        targetIndustries: (analysis.targetIndustries as object) || [],
        targetRegions: newRegions,
        buyerPersonas: (analysis.buyerPersonas as object) || [],
        painPoints: (analysis.painPoints as object) || [],
        buyingTriggers: (analysis.buyingTriggers as object) || [],
        exploredRegions: updatedExplored,
        lastAnalyzedAt: new Date(),
        analysisSource: selectedAssetIds,
        aiModel: model,
        rawAnalysis: JSON.stringify(analysis),
      },
    });

    return NextResponse.json({
      ok: true,
      selection: {
        mode: selection.mode,
        requestedCount: selection.requestedCount,
        availableCount: selection.availableCount,
        selectedCount: selectedAssetIds.length,
        selectedAssetIds,
        consideredCount: context.stats.assetCount,
        selectedChunkCount: context.stats.selectedChunkCount,
        selectedEvidenceCount: context.stats.selectedEvidenceCount,
        evidenceSeedCount: context.stats.evidenceSeedCount,
        reusedEvidenceCount: context.stats.reusedEvidenceCount,
        generatedEvidenceCount: context.stats.generatedEvidenceCount,
        contextChars: context.stats.contextChars,
      },
      profile: {
        id: profile.id,
        companyName: profile.companyName,
        companyIntro: profile.companyIntro,
        coreProducts: profile.coreProducts,
        techAdvantages: profile.techAdvantages,
        scenarios: profile.scenarios,
        differentiators: profile.differentiators,
        targetIndustries: profile.targetIndustries,
        targetRegions: profile.targetRegions,
        buyerPersonas: profile.buyerPersonas,
        painPoints: profile.painPoints,
        buyingTriggers: profile.buyingTriggers,
        lastAnalyzedAt: profile.lastAnalyzedAt,
        aiModel: profile.aiModel,
        analysisSource: profile.analysisSource,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[knowledge/analyze-assets] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
