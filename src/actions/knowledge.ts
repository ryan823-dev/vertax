"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { analyzeCompanyProfile } from "@/lib/ai-client";
import { normalizeTargetRegionRecords } from "@/lib/regions";
import {
  buildCompanyProfileAnalysisContext,
  getCompanyProfileAnalysisAssets,
} from "@/lib/knowledge/company-profile-analysis";

// ==================== 认证辅助 ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== 类型定义 ====================

export interface CompanyProfileData {
  id: string;
  companyName: string | null;
  companyIntro: string | null;
  coreProducts: Array<{
    name: string;
    description: string;
    highlights: string[];
  }>;
  techAdvantages: Array<{ title: string; description: string }>;
  scenarios: Array<{
    industry: string;
    scenario: string;
    value: string;
  }>;
  differentiators: Array<{ point: string; description: string }>;
  targetIndustries: string[];
  targetRegions: Array<{ region: string; countries: string[]; rationale: string }> | string[];
  buyerPersonas: Array<{
    role: string;
    title: string;
    concerns: string[];
  }>;
  painPoints: Array<{ pain: string; howWeHelp: string }>;
  buyingTriggers: string[];
  exploredRegions?: Array<{ region: string; countries: string[]; rationale: string; exploredAt?: string }>;
  lastAnalyzedAt: Date | null;
  aiModel: string | null;
  analysisSource: string[];
  createdAt: Date;
  updatedAt: Date;
}

type RadarSearchProfileSyncBridge = {
  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<unknown>;
};

// ==================== 获取企业能力画像 ====================

export async function getCompanyProfile(): Promise<CompanyProfileData | null> {
  const session = await getSession();

  const profile = await db.companyProfile.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    companyName: profile.companyName,
    companyIntro: profile.companyIntro,
    coreProducts: profile.coreProducts as CompanyProfileData["coreProducts"],
    techAdvantages:
      profile.techAdvantages as CompanyProfileData["techAdvantages"],
    scenarios: profile.scenarios as CompanyProfileData["scenarios"],
    differentiators:
      profile.differentiators as CompanyProfileData["differentiators"],
    targetIndustries:
      profile.targetIndustries as CompanyProfileData["targetIndustries"],
    targetRegions:
      profile.targetRegions as CompanyProfileData["targetRegions"],
    buyerPersonas:
      profile.buyerPersonas as CompanyProfileData["buyerPersonas"],
    painPoints: profile.painPoints as CompanyProfileData["painPoints"],
    buyingTriggers:
      profile.buyingTriggers as CompanyProfileData["buyingTriggers"],
    exploredRegions:
      (profile.exploredRegions as CompanyProfileData["exploredRegions"]) || [],
        lastAnalyzedAt: profile.lastAnalyzedAt,
    aiModel: profile.aiModel,
    analysisSource: profile.analysisSource as string[],
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ==================== 获取可分析的素材列表 ====================

export async function getAnalyzableAssets(): Promise<
  Array<{
    id: string;
    originalName: string;
    fileCategory: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
  }>
> {
  const session = await getSession();

  // 获取文档类素材（仅已成功解析的，避免超时）
  const assets = await db.asset.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "active",
      metadata: { path: ["processingStatus"], equals: "ready" },
    },
    select: {
      id: true,
      originalName: true,
      fileCategory: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return assets.map((a) => ({
    ...a,
    fileSize: Number(a.fileSize),
  }));
}

// ==================== AI 分析生成能力画像 ====================

export async function analyzeAssets(
  assetIds: string[]
): Promise<CompanyProfileData> {
  const session = await getSession();
  const selection = await getCompanyProfileAnalysisAssets({
    tenantId: session.user.tenantId,
    assetIds,
  });
  const assets = selection.selected;

  if (assets.length === 0) {
    throw new Error("未找到可分析的素材");
  }

  const context = await buildCompanyProfileAnalysisContext({
    tenantId: session.user.tenantId,
    assets,
    userId: session.user.id,
  });

  if (context.sections.length === 0) {
    throw new Error("所有素材的文本提取均失败，请确认素材格式");
  }

  // 调用 AI 分析
  const existingProfile = await db.companyProfile.findUnique({
    where: { tenantId: session.user.tenantId },
    select: { exploredRegions: true },
  });
  const exploredRegions =
    (existingProfile?.exploredRegions as Array<{
      region: string;
      countries?: string[];
      rationale?: string;
      exploredAt?: string;
    }>) || [];
  const exploredContext =
    exploredRegions.length > 0
      ? `\n\n【已探索过的海外市场】\n以下区域已在之前的分析中推荐过，请优先探索其他未覆盖的海外区域和国家。如果确实没有更多适合的新区域，可以在已探索区域内推荐新的具体国家。\n已探索：${exploredRegions.map((item) => item.region).join("、")}\n`
      : "";

  const { analysis, model } = await analyzeCompanyProfile(
    context.sections.map((section, index) =>
      index === 0 ? section + exploredContext : section,
    ),
  );
  const targetRegions = normalizeTargetRegionRecords(analysis.targetRegions);
  const now = new Date().toISOString();
  const updatedExplored = [...exploredRegions];
  for (const region of targetRegions) {
    if (!updatedExplored.some((item) => item.region === region.region)) {
      updatedExplored.push({ ...region, exploredAt: now });
    }
  }

  // 保存/更新企业画像
  const profile = await db.companyProfile.upsert({
    where: { tenantId: session.user.tenantId },
    create: {
      tenantId: session.user.tenantId,
      companyName: (analysis.companyName as string) || null,
      companyIntro: (analysis.companyIntro as string) || null,
      coreProducts: (analysis.coreProducts as object) || [],
      techAdvantages: (analysis.techAdvantages as object) || [],
      scenarios: (analysis.scenarios as object) || [],
      differentiators: (analysis.differentiators as object) || [],
      targetIndustries: (analysis.targetIndustries as object) || [],
      targetRegions,
      buyerPersonas: (analysis.buyerPersonas as object) || [],
      painPoints: (analysis.painPoints as object) || [],
      buyingTriggers: (analysis.buyingTriggers as object) || [],
      exploredRegions: updatedExplored,
      lastAnalyzedAt: new Date(),
      analysisSource: assets.map((asset) => asset.id),
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
      targetRegions,
      buyerPersonas: (analysis.buyerPersonas as object) || [],
      painPoints: (analysis.painPoints as object) || [],
      buyingTriggers: (analysis.buyingTriggers as object) || [],
      exploredRegions: updatedExplored,
      lastAnalyzedAt: new Date(),
      analysisSource: assets.map((asset) => asset.id),
      aiModel: model,
      rawAnalysis: JSON.stringify(analysis),
    },
  });

  revalidatePath("/customer/knowledge/company");
  revalidatePath("/dashboard/knowledge");
  return {
    id: profile.id,
    companyName: profile.companyName,
    companyIntro: profile.companyIntro,
    coreProducts: profile.coreProducts as CompanyProfileData["coreProducts"],
    techAdvantages:
      profile.techAdvantages as CompanyProfileData["techAdvantages"],
    scenarios: profile.scenarios as CompanyProfileData["scenarios"],
    differentiators:
      profile.differentiators as CompanyProfileData["differentiators"],
    targetIndustries:
      profile.targetIndustries as CompanyProfileData["targetIndustries"],
    targetRegions:
      profile.targetRegions as CompanyProfileData["targetRegions"],
    buyerPersonas:
      profile.buyerPersonas as CompanyProfileData["buyerPersonas"],
    painPoints: profile.painPoints as CompanyProfileData["painPoints"],
    buyingTriggers:
      profile.buyingTriggers as CompanyProfileData["buyingTriggers"],
    lastAnalyzedAt: profile.lastAnalyzedAt,
    aiModel: profile.aiModel,
    analysisSource: profile.analysisSource as string[],
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ==================== 手动更新企业画像 ====================

export async function updateCompanyProfile(
  data: Partial<
    Pick<
      CompanyProfileData,
      | "companyName"
      | "companyIntro"
      | "coreProducts"
      | "techAdvantages"
      | "scenarios"
      | "differentiators"
      | "targetIndustries"
      | "targetRegions"
      | "buyerPersonas"
      | "painPoints"
      | "buyingTriggers"
    >
  >
): Promise<CompanyProfileData> {
  const session = await getSession();

  const updateData: Record<string, unknown> = {};

  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.companyIntro !== undefined)
    updateData.companyIntro = data.companyIntro;
  if (data.coreProducts !== undefined)
    updateData.coreProducts = data.coreProducts;
  if (data.techAdvantages !== undefined)
    updateData.techAdvantages = data.techAdvantages;
  if (data.scenarios !== undefined) updateData.scenarios = data.scenarios;
  if (data.differentiators !== undefined)
    updateData.differentiators = data.differentiators;
  if (data.targetIndustries !== undefined)
    updateData.targetIndustries = data.targetIndustries;
  if (data.targetRegions !== undefined)
    updateData.targetRegions = data.targetRegions;
  if (data.buyerPersonas !== undefined)
    updateData.buyerPersonas = data.buyerPersonas;
  if (data.painPoints !== undefined) updateData.painPoints = data.painPoints;
  if (data.buyingTriggers !== undefined)
    updateData.buyingTriggers = data.buyingTriggers;

  const profile = await db.companyProfile.upsert({
    where: { tenantId: session.user.tenantId },
    create: {
      tenantId: session.user.tenantId,
      ...updateData,
    },
    update: updateData,
  });

  revalidatePath("/customer/knowledge/company");
  revalidatePath("/customer/radar");

  const radarSearchProfile = (
    db as typeof db & { radarSearchProfile: RadarSearchProfileSyncBridge }
  ).radarSearchProfile;

  // Sync targetIndustries -> RadarSearchProfile.industryCodes (non-blocking)
  if (data.targetIndustries !== undefined) {
    const industries = (data.targetIndustries as Array<{ name?: string } | string>)
      .map((i) => (typeof i === 'string' ? i : i.name ?? ''))
      .filter(Boolean);
    if (industries.length) {
      radarSearchProfile.updateMany({
        where: { tenantId: session.user.tenantId, industryCodes: { isEmpty: true } },
        data: { industryCodes: industries },
      }).catch(() => { /* non-critical */ });
    }
  }

  // Sync targetRegions -> RadarSearchProfile.targetRegions (Task #132)
  if (data.targetRegions !== undefined) {
    const regions = normalizeTargetRegions(data.targetRegions);
    if (regions.length) {
      radarSearchProfile.updateMany({
        where: { tenantId: session.user.tenantId, targetRegions: { isEmpty: true } },
        data: { targetRegions: regions },
      }).catch(() => { /* non-critical */ });
    }
  }

  return {
    id: profile.id,
    companyName: profile.companyName,
    companyIntro: profile.companyIntro,
    coreProducts: profile.coreProducts as CompanyProfileData["coreProducts"],
    techAdvantages:
      profile.techAdvantages as CompanyProfileData["techAdvantages"],
    scenarios: profile.scenarios as CompanyProfileData["scenarios"],
    differentiators:
      profile.differentiators as CompanyProfileData["differentiators"],
    targetIndustries:
      profile.targetIndustries as CompanyProfileData["targetIndustries"],
    targetRegions:
      profile.targetRegions as CompanyProfileData["targetRegions"],
    buyerPersonas:
      profile.buyerPersonas as CompanyProfileData["buyerPersonas"],
    painPoints: profile.painPoints as CompanyProfileData["painPoints"],
    buyingTriggers:
      profile.buyingTriggers as CompanyProfileData["buyingTriggers"],
    lastAnalyzedAt: profile.lastAnalyzedAt,
    aiModel: profile.aiModel,
    analysisSource: profile.analysisSource as string[],
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
