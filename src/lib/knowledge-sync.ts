import { chatCompletion } from "@/lib/ai-client";
import { buildTopicClusterSkillContext } from "@/lib/marketing/topic-cluster-sync";
import { prisma } from "@/lib/prisma";
import { SKILL_NAMES } from "@/lib/skills/names";
import { executeSkill } from "@/lib/skills/runner";

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
  const { request } = await buildTopicClusterSkillContext(tenantId, {
    focusSegment: options.focusSegment,
  });

  const result = await executeSkill(
    SKILL_NAMES.MARKETING_BUILD_TOPIC_CLUSTER,
    request,
    { tenantId, userId }
  );

  const version = await prisma.artifactVersion.findUnique({
    where: { id: result.versionId },
  });

  if (!version) {
    throw new Error("TopicCluster 版本创建失败");
  }

  return version;
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
