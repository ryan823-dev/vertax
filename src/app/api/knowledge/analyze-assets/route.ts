import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeCompanyProfile } from "@/lib/ai-client";
import { extractTextFromAsset } from "@/lib/utils/text-extract";

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
    const { assetIds } = (await request.json()) as { assetIds: string[] };

    if (!assetIds || assetIds.length === 0) {
      return NextResponse.json(
        { error: "请选择至少一个素材进行分析" },
        { status: 400 }
      );
    }

    if (assetIds.length > 10) {
      return NextResponse.json(
        { error: "单次最多分析 10 个素材" },
        { status: 400 }
      );
    }

    console.log(`[analyze-assets] execPath=${process.execPath}, cwd=${process.cwd()}, node=${process.version}`);
    console.log(`[analyze-assets] step 1: query assets, ids=${assetIds.length}`);

    // 优先使用已解析的 AssetChunk（避免重复 OSS 下载+解析），回退到原始提取
    const assets = await db.asset.findMany({
      where: { id: { in: assetIds }, tenantId, status: "active" },
      select: { id: true, originalName: true, storageKey: true, mimeType: true },
    });

    console.log(`[analyze-assets] step 2: found ${assets.length} assets`);

    if (assets.length === 0) {
      return NextResponse.json({ error: "未找到可分析的素材" }, { status: 400 });
    }

    // 先尝试从 AssetChunk 读取已解析文本
    const chunks = await db.assetChunk.findMany({
      where: { assetId: { in: assetIds }, tenantId },
      orderBy: [{ assetId: "asc" }, { chunkIndex: "asc" }],
      select: { assetId: true, content: true },
    });

    console.log(`[analyze-assets] step 3: found ${chunks.length} chunks`);

    const textResults: string[] = [];

    if (chunks.length > 0) {
      // Group chunks by assetId
      const chunkMap = new Map<string, string[]>();
      for (const chunk of chunks) {
        if (!chunkMap.has(chunk.assetId)) chunkMap.set(chunk.assetId, []);
        chunkMap.get(chunk.assetId)!.push(chunk.content);
      }
      for (const asset of assets) {
        const parts = chunkMap.get(asset.id);
        if (parts && parts.length > 0) {
          textResults.push(`## ${asset.originalName}\n\n${parts.join("\n\n").substring(0, 15000)}`);
        }
      }
    }

    // Fallback: extract from OSS only for small assets with no chunks (<5MB)
    const coveredIds = new Set(chunks.map((c) => c.assetId));
    for (const asset of assets) {
      if (coveredIds.has(asset.id)) continue;
      // Skip large files to avoid timeout
      const assetWithSize = await db.asset.findUnique({
        where: { id: asset.id },
        select: { fileSize: true },
      });
      if (assetWithSize && Number(assetWithSize.fileSize) > 5 * 1024 * 1024) {
        console.warn(`[analyze-assets] Skipping large file without chunks: ${asset.originalName}`);
        continue;
      }
      try {
        const text = await extractTextFromAsset(asset.storageKey, asset.mimeType);
        if (text && text.length > 10) {
          textResults.push(`## ${asset.originalName}\n\n${text.substring(0, 15000)}`);
        }
      } catch (error) {
        console.warn(`[analyze-assets] Failed to extract text from ${asset.originalName}:`, error);
      }
    }

    if (textResults.length === 0) {
      return NextResponse.json(
        { error: "所有素材的文本提取均失败，请确认素材格式" },
        { status: 400 }
      );
    }

    console.log(`[analyze-assets] Sending ${textResults.length} texts (total ${textResults.join('').length} chars) to AI...`);

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
      textResults.map((t, i) => i === 0 ? t + exploredContext : t)
    );

    console.log(`[analyze-assets] AI analysis completed, model: ${model}`);

    // 合并区域探索记录：将本次新推荐的区域追加到已探索列表
    const newRegions = (analysis.targetRegions as Array<{ region: string; countries: string[]; rationale: string }>) || [];
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
        targetRegions: (analysis.targetRegions as object) || [],
        buyerPersonas: (analysis.buyerPersonas as object) || [],
        painPoints: (analysis.painPoints as object) || [],
        buyingTriggers: (analysis.buyingTriggers as object) || [],
        exploredRegions: updatedExplored,
        lastAnalyzedAt: new Date(),
        analysisSource: assetIds,
        aiModel: model,
      },
      update: {
        companyName: (analysis.companyName as string) || null,
        companyIntro: (analysis.companyIntro as string) || null,
        coreProducts: (analysis.coreProducts as object) || [],
        techAdvantages: (analysis.techAdvantages as object) || [],
        scenarios: (analysis.scenarios as object) || [],
        differentiators: (analysis.differentiators as object) || [],
        targetIndustries: (analysis.targetIndustries as object) || [],
        targetRegions: (analysis.targetRegions as object) || [],
        buyerPersonas: (analysis.buyerPersonas as object) || [],
        painPoints: (analysis.painPoints as object) || [],
        buyingTriggers: (analysis.buyingTriggers as object) || [],
        exploredRegions: updatedExplored,
        lastAnalyzedAt: new Date(),
        analysisSource: assetIds,
        aiModel: model,
      },
    });

    return NextResponse.json({
      ok: true,
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
