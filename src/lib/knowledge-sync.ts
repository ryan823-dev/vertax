import { chatCompletion } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";

const TOPIC_CLUSTER_PROMPT = `You are a B2B SEO/AEO strategist. Generate a practical Topic Cluster for the company context below.

Return strict JSON:
{
  "topicCluster": {
    "name": "segment name",
    "clusters": [
      {
        "clusterName": "cluster name",
        "coreKeywords": ["keyword"],
        "longTailKeywords": ["keyword"],
        "aeoQuestions": ["question"],
        "commercialKeywords": ["keyword"],
        "negatives": ["keyword"],
        "contentMap": [
          {
            "type": "BuyingGuide|FAQ|CaseStudy|Comparison|UseCasePage",
            "title": "content title",
            "briefGoal": "content goal",
            "funnel": "TOFU|MOFU|BOFU",
            "intent": "informational|commercial|transactional"
          }
        ]
      }
    ]
  },
  "confidence": 0.8
}

Rules:
- Each cluster must include at least 3 contentMap items.
- Cover TOFU, MOFU, and BOFU when possible.
- Return JSON only.`;

const TARGETING_SPEC_PROMPT = `You are a B2B outbound strategist. Generate a practical targeting specification from the company context below.

Return strict JSON:
{
  "targetingSpec": {
    "icpName": "ideal customer profile name",
    "segments": [
      {
        "segmentName": "segment name",
        "firmographic": { "industries": [], "countries": [] },
        "triggers": [{ "name": "trigger", "signals": [], "confidence": 0.7 }]
      }
    ],
    "exclusionRules": [{ "rule": "rule", "reason": "why" }]
  }
}

Return JSON only.`;

type SyncMarketingOptions = {
  focusSegment?: string;
};

function parseJsonResponse(content: string): object {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function createTopicClusterDraft(
  tenantId: string,
  userId: string,
  options: SyncMarketingOptions = {}
) {
  const [companyProfile, evidences] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.evidence.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, title: true },
    }),
  ]);

  if (!companyProfile) {
    throw new Error("请先完善企业档案后再同步到增长系统");
  }

  const techAdvantages =
    (companyProfile.techAdvantages as Array<{ title?: string; description?: string }>) || [];
  const coreProducts =
    (companyProfile.coreProducts as Array<{ name?: string; description?: string }>) || [];

  let context = `Company: ${companyProfile.companyName || "Unknown"}\nIntro: ${(
    companyProfile.companyIntro || ""
  ).slice(0, 600)}`;

  if (coreProducts.length > 0) {
    context += `\n\nCore products:\n${coreProducts
      .map((product) => `- ${product.name || "Product"}: ${product.description || ""}`)
      .join("\n")}`;
  }

  if (techAdvantages.length > 0) {
    context += `\n\nTech advantages:\n${techAdvantages
      .map((advantage) => `- ${advantage.title || "Advantage"}: ${advantage.description || ""}`)
      .join("\n")}`;
  }

  if (evidences.length > 0) {
    context += `\n\nEvidence:\n${evidences
      .map((evidence) => `- [${evidence.id}] (${evidence.type}) ${evidence.title}`)
      .join("\n")}`;
  }

  if (options.focusSegment) {
    context += `\n\nPriority segment: ${options.focusSegment}`;
  }

  const aiResponse = await chatCompletion(
    [
      { role: "system", content: TOPIC_CLUSTER_PROMPT },
      { role: "user", content: context },
    ],
    { model: "qwen-plus", temperature: 0.4, maxTokens: 4096 }
  );

  let parsed: object;
  try {
    parsed = parseJsonResponse(aiResponse.content);
  } catch {
    parsed = { rawContent: aiResponse.content };
  }

  return prisma.artifactVersion.create({
    data: {
      tenantId,
      entityType: "TopicCluster",
      entityId: `topic-cluster-${tenantId}-${Date.now()}`,
      version: 1,
      status: "draft",
      content: parsed,
      meta: {
        generatedBy: "ai",
        model: aiResponse.model,
        tokens: aiResponse.usage.totalTokens,
      },
      createdById: userId,
    },
  });
}

export async function createTargetingSpecDraft(tenantId: string, userId: string) {
  const [companyProfile, icpSegments] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.iCPSegment.findMany({
      where: { tenantId },
      include: { personas: true },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!companyProfile) {
    throw new Error("请先完善企业档案后再同步到获客雷达");
  }

  let context = `Company: ${companyProfile.companyName || "Unknown"}\nIntro: ${(
    companyProfile.companyIntro || ""
  ).slice(0, 500)}`;

  if (icpSegments.length > 0) {
    context += "\n\nExisting ICP segments:";
    for (const segment of icpSegments) {
      context += `\n- ${segment.name}${segment.industry ? ` (${segment.industry})` : ""}${
        segment.regions.length > 0 ? ` regions: [${segment.regions.join(", ")}]` : ""
      }`;
      for (const persona of segment.personas) {
        context += `\n  - ${persona.name} / ${persona.title}${
          persona.seniority ? ` (${persona.seniority})` : ""
        }${persona.concerns.length > 0 ? ` concerns: [${persona.concerns.slice(0, 5).join(", ")}]` : ""}`;
      }
    }
  }

  const aiResponse = await chatCompletion(
    [
      { role: "system", content: TARGETING_SPEC_PROMPT },
      { role: "user", content: context },
    ],
    { model: "qwen-plus", temperature: 0.3, maxTokens: 2048 }
  );

  let parsed: object;
  try {
    parsed = parseJsonResponse(aiResponse.content);
  } catch {
    parsed = { rawContent: aiResponse.content };
  }

  return prisma.artifactVersion.create({
    data: {
      tenantId,
      entityType: "TargetingSpec",
      entityId: `targeting-spec-${tenantId}-${Date.now()}`,
      version: 1,
      status: "draft",
      content: parsed,
      meta: {
        generatedBy: "ai",
        model: aiResponse.model,
        tokens: aiResponse.usage.totalTokens,
      },
      createdById: userId,
    },
  });
}
