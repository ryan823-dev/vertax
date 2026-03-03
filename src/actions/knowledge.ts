"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { analyzeCompanyProfile } from "@/lib/ai-client";
import { extractTextFromAsset } from "@/lib/utils/text-extract";

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
  targetRegions: string[];
  buyerPersonas: Array<{
    role: string;
    title: string;
    concerns: string[];
  }>;
  painPoints: Array<{ pain: string; howWeHelp: string }>;
  buyingTriggers: string[];
  lastAnalyzedAt: Date | null;
  aiModel: string | null;
  analysisSource: string[];
  createdAt: Date;
  updatedAt: Date;
}

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

  // 获取文档类素材（可以提取文本的）
  const assets = await db.asset.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "active",
      OR: [
        { fileCategory: "document" },
        {
          mimeType: {
            in: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ],
          },
        },
      ],
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

  if (assetIds.length === 0) {
    throw new Error("请选择至少一个素材进行分析");
  }

  if (assetIds.length > 10) {
    throw new Error("单次最多分析 10 个素材");
  }

  // 获取素材信息
  const assets = await db.asset.findMany({
    where: {
      id: { in: assetIds },
      tenantId: session.user.tenantId,
      status: "active",
    },
    select: {
      id: true,
      originalName: true,
      storageKey: true,
      mimeType: true,
    },
  });

  if (assets.length === 0) {
    throw new Error("未找到可分析的素材");
  }

  // 提取文本
  const textResults: string[] = [];
  for (const asset of assets) {
    try {
      const text = await extractTextFromAsset(
        asset.storageKey,
        asset.mimeType
      );
      if (text && text.length > 10) {
        textResults.push(`## ${asset.originalName}\n\n${text}`);
      }
    } catch (error) {
      console.warn(`Failed to extract text from ${asset.originalName}:`, error);
    }
  }

  if (textResults.length === 0) {
    throw new Error("所有素材的文本提取均失败，请确认素材格式");
  }

  // 调用 AI 分析
  const { analysis, model } = await analyzeCompanyProfile(textResults);

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
      targetRegions: (analysis.targetRegions as object) || [],
      buyerPersonas: (analysis.buyerPersonas as object) || [],
      painPoints: (analysis.painPoints as object) || [],
      buyingTriggers: (analysis.buyingTriggers as object) || [],
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
      lastAnalyzedAt: new Date(),
      analysisSource: assetIds,
      aiModel: model,
    },
  });

  revalidatePath("/zh-CN/knowledge");

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

  revalidatePath("/zh-CN/knowledge");

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
