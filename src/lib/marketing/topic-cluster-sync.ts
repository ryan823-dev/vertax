import { prisma } from "@/lib/prisma";
import { normalizeTargetRegions } from "@/lib/regions";
import type { SkillRequest } from "@/lib/skills/types";

type TopicClusterSyncOptions = {
  focusSegment?: string;
  evidenceIds?: string[];
  entityId?: string;
};

type CompanyProfilePayload = {
  companyName: string;
  companyIntro: string;
  coreProducts: Array<{ name: string; description: string }>;
  techAdvantages: Array<{ title: string; description: string }>;
  scenarios: Array<{ industry: string; scenario: string }>;
  differentiators: Array<{ point: string; description: string }>;
  targetIndustries: string[];
  targetRegions: string[];
  buyerPersonas: Array<{ role: string; title: string; concerns: string[] }>;
  painPoints: Array<{ pain: string; howWeHelp: string }>;
  buyingTriggers: string[];
};

type PersonaPayload = {
  id: string;
  name: string;
  title: string;
  seniority: string | null;
  concerns: string[];
  messagingPrefs: unknown;
  evidenceRefs: string[];
  segmentId: string | null;
  segmentName?: string;
};

type ICPSegmentPayload = {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  regions: string[];
  description: string | null;
  criteria: unknown;
};

type GuidelinePayload = {
  id: string;
  category: string;
  title: string;
  content: string;
  examples: string[];
};

type QuestionInferenceHint = {
  personaId?: string;
  persona: string;
  role?: string;
  concern: string;
  likelyStage: "TOFU" | "MOFU" | "BOFU";
  likelyIntent: "informational" | "commercial" | "transactional" | "navigational";
  questionSeed: string;
  whyThisQuestion: string;
};

type PublishingHint = {
  mode: "integrated" | "suggested";
  canAutoPublish: boolean;
  channel: string;
  purpose: string;
  reason: string;
  contentTypes: string[];
};

type TopicClusterSkillContext = {
  request: SkillRequest;
  evidenceCount: number;
  personaCount: number;
  segmentCount: number;
};

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeStrings(value: unknown): string[] {
  return toArray<string>(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferStageFromConcern(text: string): "TOFU" | "MOFU" | "BOFU" {
  const normalized = text.toLowerCase();
  if (
    /(price|pricing|cost|quote|rfq|supplier|vendor|lead time|delivery|implementation|demo|试用|采购|报价|交期|供应商)/i.test(
      normalized
    )
  ) {
    return "BOFU";
  }
  if (
    /(compare|comparison|vs|alternative|best|top|recommend|evaluate|评估|比较|推荐|替代)/i.test(
      normalized
    )
  ) {
    return "MOFU";
  }
  return "TOFU";
}

function inferIntentFromConcern(
  text: string
): "informational" | "commercial" | "transactional" | "navigational" {
  const normalized = text.toLowerCase();
  if (
    /(price|pricing|quote|rfq|demo|trial|采购|报价|下单|合作)/i.test(normalized)
  ) {
    return "transactional";
  }
  if (
    /(best|top|compare|comparison|vs|alternative|recommend|评估|比较|推荐)/i.test(
      normalized
    )
  ) {
    return "commercial";
  }
  if (/(brand|company|官网|官方|about)/i.test(normalized)) {
    return "navigational";
  }
  return "informational";
}

function buildQuestionSeed(concern: string, role?: string): string {
  const who = role || "目标买家";
  return `${who}会围绕“${concern}”发起搜索或 AI 提问。`;
}

function buildQuestionInferenceHints(
  companyProfile: CompanyProfilePayload,
  personas: PersonaPayload[]
): QuestionInferenceHint[] {
  const hints: QuestionInferenceHint[] = [];

  for (const persona of personas) {
    for (const concern of persona.concerns.slice(0, 5)) {
      hints.push({
        personaId: persona.id,
        persona: persona.name,
        role: persona.title,
        concern,
        likelyStage: inferStageFromConcern(concern),
        likelyIntent: inferIntentFromConcern(concern),
        questionSeed: buildQuestionSeed(concern, persona.title || persona.name),
        whyThisQuestion: `这个关注点直接影响 ${persona.name} 对供应商筛选与方案判断。`,
      });
    }
  }

  for (const pain of companyProfile.painPoints.slice(0, 5)) {
    hints.push({
      persona: "目标买家",
      role: undefined,
      concern: pain.pain,
      likelyStage: inferStageFromConcern(pain.pain),
      likelyIntent: inferIntentFromConcern(pain.pain),
      questionSeed: `潜在客户会围绕“${pain.pain}”寻找解决方案或更优做法。`,
      whyThisQuestion: `这是客户当前业务阻力点，对内容选题和问法设计有直接指导意义。`,
    });
  }

  for (const trigger of companyProfile.buyingTriggers.slice(0, 4)) {
    hints.push({
      persona: "目标买家",
      concern: trigger,
      likelyStage: inferStageFromConcern(trigger),
      likelyIntent: inferIntentFromConcern(trigger),
      questionSeed: `当出现“${trigger}”时，潜在买家会开始更高商业意图的搜索。`,
      whyThisQuestion: "这是驱动搜索和询盘发生的真实触发场景。",
    });
  }

  return hints;
}

function buildPublishingHints(
  companyProfile: CompanyProfilePayload
): PublishingHint[] {
  const geoRegionHint =
    companyProfile.targetRegions.length > 0
      ? `结合 ${companyProfile.targetRegions.slice(0, 3).join(" / ")} 等重点市场，优先做多语言或地域化页面。`
      : "如果有重点市场，优先做地域化内容分发。";

  return [
    {
      mode: "integrated",
      canAutoPublish: true,
      channel: "客户官网 · 解决方案页 / 产品页 / 案例页",
      purpose: "作为主发布渠道，承接高商业意图与直接转化内容",
      reason: "这是系统可稳定对接和自动发布的主阵地，适合放选型、比较、参数、案例、方案页等高意图内容。",
      contentTypes: ["UseCasePage", "Comparison", "BuyingGuide", "TechnicalDoc", "CaseStudy"],
    },
    {
      mode: "integrated",
      canAutoPublish: true,
      channel: "客户官网 · FAQ / 知识库 / 博客专题",
      purpose: "作为官网内的知识承接位，优先覆盖 TOFU 与 AI 常见问答场景",
      reason: "同样属于官网主发布体系，适合定义、原理、应用、注意事项等解释型内容，更利于 AI 引用和长期沉淀。",
      contentTypes: ["FAQ", "QnA", "KnowledgeBase", "Checklist"],
    },
    {
      mode: "suggested",
      canAutoPublish: false,
      channel: "外部媒体 / 第三方平台",
      purpose: "补足第三方信源与可信证据",
      reason: `适合案例、方法论、趋势判断等内容；${geoRegionHint} 但这里只能作为运营建议，不是系统自动发布通道。`,
      contentTypes: ["CaseStudy", "Whitepaper", "BuyingGuide"],
    },
  ];
}

async function loadCompanyProfile(
  tenantId: string
): Promise<CompanyProfilePayload | null> {
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
  });

  if (!profile) {
    return null;
  }

  return {
    companyName: profile.companyName || "",
    companyIntro: profile.companyIntro || "",
    coreProducts: toArray<{ name?: string; description?: string }>(profile.coreProducts).map(
      (item) => ({
        name: item?.name || "",
        description: item?.description || "",
      })
    ),
    techAdvantages: toArray<{ title?: string; description?: string }>(
      profile.techAdvantages
    ).map((item) => ({
      title: item?.title || "",
      description: item?.description || "",
    })),
    scenarios: toArray<{ industry?: string; scenario?: string }>(profile.scenarios).map(
      (item) => ({
        industry: item?.industry || "",
        scenario: item?.scenario || "",
      })
    ),
    differentiators: toArray<{ point?: string; description?: string }>(
      profile.differentiators
    ).map((item) => ({
      point: item?.point || "",
      description: item?.description || "",
    })),
    targetIndustries: normalizeStrings(profile.targetIndustries),
    targetRegions: normalizeTargetRegions(profile.targetRegions),
    buyerPersonas: toArray<{ role?: string; title?: string; concerns?: string[] }>(
      profile.buyerPersonas
    ).map((item) => ({
      role: item?.role || "",
      title: item?.title || "",
      concerns: normalizeStrings(item?.concerns),
    })),
    painPoints: toArray<{ pain?: string; howWeHelp?: string }>(profile.painPoints).map(
      (item) => ({
        pain: item?.pain || "",
        howWeHelp: item?.howWeHelp || "",
      })
    ),
    buyingTriggers: normalizeStrings(profile.buyingTriggers),
  };
}

async function loadPersonas(tenantId: string): Promise<PersonaPayload[]> {
  const personas = await prisma.persona.findMany({
    where: { tenantId },
    include: {
      segment: { select: { name: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: 12,
  });

  return personas.map((persona) => ({
    id: persona.id,
    name: persona.name,
    title: persona.title,
    seniority: persona.seniority,
    concerns: persona.concerns,
    messagingPrefs: persona.messagingPrefs,
    evidenceRefs: persona.evidenceRefs,
    segmentId: persona.segmentId,
    segmentName: persona.segment?.name,
  }));
}

async function loadICPSegments(tenantId: string): Promise<ICPSegmentPayload[]> {
  const segments = await prisma.iCPSegment.findMany({
    where: { tenantId },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    industry: segment.industry,
    companySize: segment.companySize,
    regions: segment.regions,
    description: segment.description,
    criteria: segment.criteria,
  }));
}

async function loadGuidelines(tenantId: string): Promise<GuidelinePayload[]> {
  const guidelines = await prisma.brandGuideline.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    take: 12,
  });

  return guidelines.map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    content: item.content,
    examples: normalizeStrings(item.examples),
  }));
}

async function loadEvidences(
  tenantId: string,
  evidenceIds?: string[]
): Promise<Array<{ id: string }>> {
  if (evidenceIds && evidenceIds.length > 0) {
    return prisma.evidence.findMany({
      where: { tenantId, id: { in: evidenceIds }, deletedAt: null },
      select: { id: true },
    });
  }

  return prisma.evidence.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true },
  });
}

export async function buildTopicClusterSkillContext(
  tenantId: string,
  options: TopicClusterSyncOptions = {}
): Promise<TopicClusterSkillContext> {
  const [companyProfile, personas, icpSegments, guidelines, evidences] =
    await Promise.all([
      loadCompanyProfile(tenantId),
      loadPersonas(tenantId),
      loadICPSegments(tenantId),
      loadGuidelines(tenantId),
      loadEvidences(tenantId, options.evidenceIds),
    ]);

  if (!companyProfile) {
    throw new Error("请先完善企业认知（Company Profile）");
  }

  const inferredQuestionAngles = buildQuestionInferenceHints(
    companyProfile,
    personas
  );
  const publishingHints = buildPublishingHints(companyProfile);

  return {
    request: {
      entityType: "TopicCluster",
      entityId:
        options.entityId || `topic-cluster-${tenantId}-${Date.now()}`,
      input: {
        profiles: {
          personas,
          icpSegments,
          guidelines,
        },
        company: companyProfile,
        targetCustomers: {
          icpSegments,
          personas,
        },
        inferredQuestionAngles,
        publishingHints,
        advantages: companyProfile.techAdvantages.map(
          (item) => `${item.title}: ${item.description}`
        ),
        focusSegment: options.focusSegment,
      },
      evidenceIds: evidences.map((item) => item.id),
      useCompanyProfile: true,
      mode: "generate",
    },
    evidenceCount: evidences.length,
    personaCount: personas.length,
    segmentCount: icpSegments.length,
  };
}
