"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";

// ==================== Types ====================

export type SearchIntent = "informational" | "commercial" | "transactional" | "navigational";

export type BriefListItem = {
  id: string;
  title: string;
  targetKeywords: string[];
  intent: SearchIntent;
  status: string;
  targetPersonaId: string | null;
  targetPersonaName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BriefDetail = {
  id: string;
  tenantId: string;
  title: string;
  targetPersonaId: string | null;
  targetPersonaName?: string;
  targetKeywords: string[];
  intent: SearchIntent;
  cta: string | null;
  evidenceIds: string[];
  notes: string | null;
  status: string;
  contentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBriefInput = {
  title: string;
  targetPersonaId?: string;
  targetKeywords: string[];
  intent?: SearchIntent;
  cta?: string;
  evidenceIds?: string[];
  notes?: string;
};

export type UpdateBriefInput = Partial<CreateBriefInput> & {
  status?: string;
};

// ==================== Helpers ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== CRUD ====================

export async function getBriefs(filters?: {
  targetPersonaId?: string;
  status?: string;
  search?: string;
}): Promise<BriefListItem[]> {
  const session = await getSession();

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };

  if (filters?.targetPersonaId) where.targetPersonaId = filters.targetPersonaId;
  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { targetKeywords: { hasSome: [filters.search] } },
    ];
  }

  const items = await prisma.contentBrief.findMany({
    where,
    include: {
      targetPersona: { select: { name: true } },
      _count: { select: { contentPieces: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map((b) => ({
    id: b.id,
    title: b.title,
    targetKeywords: b.targetKeywords,
    intent: b.intent as SearchIntent,
    status: b.status,
    targetPersonaId: b.targetPersonaId,
    targetPersonaName: b.targetPersona?.name || undefined,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));
}

export async function getBriefById(id: string): Promise<BriefDetail | null> {
  const session = await getSession();

  const b = await prisma.contentBrief.findFirst({
    where: { id, tenantId: session.user.tenantId, deletedAt: null },
    include: {
      targetPersona: { select: { name: true } },
      _count: { select: { contentPieces: true } },
    },
  });

  if (!b) return null;

  return {
    id: b.id,
    tenantId: b.tenantId,
    title: b.title,
    targetPersonaId: b.targetPersonaId,
    targetPersonaName: b.targetPersona?.name || undefined,
    targetKeywords: b.targetKeywords,
    intent: b.intent as SearchIntent,
    cta: b.cta,
    evidenceIds: b.evidenceIds,
    notes: b.notes,
    status: b.status,
    contentCount: b._count.contentPieces,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export async function createBrief(input: CreateBriefInput): Promise<BriefListItem> {
  const session = await getSession();

  const brief = await prisma.contentBrief.create({
    data: {
      tenantId: session.user.tenantId,
      title: input.title,
      targetPersonaId: input.targetPersonaId || null,
      targetKeywords: input.targetKeywords,
      intent: input.intent || "informational",
      cta: input.cta || null,
      evidenceIds: input.evidenceIds || [],
      notes: input.notes || null,
      status: "draft",
      createdById: session.user.id,
    },
    include: {
      targetPersona: { select: { name: true } },
    },
  });

  // Fire-and-forget activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.BRIEF_CREATED,
    entityType: "ContentBrief",
    entityId: brief.id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "info",
    context: { title: brief.title, keywords: brief.targetKeywords },
  });

  revalidatePath("/customer/marketing");

  return {
    id: brief.id,
    title: brief.title,
    targetKeywords: brief.targetKeywords,
    intent: brief.intent as SearchIntent,
    status: brief.status,
    targetPersonaId: brief.targetPersonaId,
    targetPersonaName: brief.targetPersona?.name || undefined,
    createdAt: brief.createdAt,
    updatedAt: brief.updatedAt,
  };
}

export async function updateBrief(id: string, input: UpdateBriefInput): Promise<void> {
  const session = await getSession();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.targetKeywords !== undefined) data.targetKeywords = input.targetKeywords;
  if (input.intent !== undefined) data.intent = input.intent;
  if (input.cta !== undefined) data.cta = input.cta || null;
  if (input.evidenceIds !== undefined) data.evidenceIds = input.evidenceIds;
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (input.targetPersonaId !== undefined) data.targetPersonaId = input.targetPersonaId || null;
  if (input.status !== undefined) data.status = input.status;

  await prisma.contentBrief.update({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  // Fire-and-forget activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.BRIEF_UPDATED,
    entityType: "ContentBrief",
    entityId: id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "info",
    context: { updatedFields: Object.keys(data) },
  });

  revalidatePath("/customer/marketing");
}

export async function deleteBrief(id: string): Promise<void> {
  const session = await getSession();

  await prisma.contentBrief.update({
    where: { id, tenantId: session.user.tenantId },
    data: { deletedAt: new Date() },
  });

  // Fire-and-forget activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "brief.deleted",
    entityType: "ContentBrief",
    entityId: id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "warn",
    context: { softDelete: true },
  });

  revalidatePath("/customer/marketing");
}

// ==================== AI: Generate Brief from Persona ====================

const BRIEF_GENERATION_PROMPT = `You are a B2B content strategy expert for Chinese manufacturers targeting GLOBAL BUYERS (overseas customer acquisition).

Buyer persona info:
- Name: {personaName}
- Title: {personaTitle}
- Core concerns: {concerns}

Generate a content brief targeting this buyer persona. Output MUST be in ENGLISH (for global B2B buyers). JSON format:

{
  "title": "English title (≤50 chars, SEO-friendly for global search)",
  "targetKeywords": ["primary English keyword", "related keyword 1", "related keyword 2"],
  "intent": "informational|commercial|transactional|navigational",
  "cta": "Call-to-action in English (≤30 chars)",
  "notes": "Content direction notes in English (≤150 chars)"
}

Rules:
- ALL output MUST be in English (this is for overseas customer acquisition)
- Keywords should be terms global buyers would search on Google/LinkedIn
- Title should be compelling for international B2B buyers
- Do not broaden the scope beyond the persona's actual manufacturing process and buying concerns
- If the persona is about paint or spray painting, prefer paint-specific terms such as robotic painting system, spray painting automation, paint booth automation, industrial paint automation, automatic paint spraying system, robotic spray painting cell, and liquid paint finishing; avoid generic coating automation unless it is clearly paint-specific
- intent: informational=research, commercial=evaluation, transactional=purchase decision, navigational=brand search
- Output ONLY valid JSON, no other text`;

export async function generateBriefFromPersona(personaId: string): Promise<BriefListItem> {
  const session = await getSession();

  const persona = await prisma.persona.findFirst({
    where: { id: personaId, tenantId: session.user.tenantId },
  });

  if (!persona) throw new Error("Persona 不存在");

  const prompt = BRIEF_GENERATION_PROMPT
    .replace("{personaName}", persona.name)
    .replace("{personaTitle}", persona.title)
    .replace("{concerns}", persona.concerns.join("、"));

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { model: "qwen-plus", temperature: 0.4, maxTokens: 1024 }
  );

  let parsed: {
    title: string;
    targetKeywords: string[];
    intent: string;
    cta: string;
    notes: string;
  };

  try {
    let jsonStr = response.content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.warn('[createBriefFromPersona] JSON parse failed, using default:', error);
    parsed = {
      title: `Professional Solutions for ${persona.title}`,
      targetKeywords: [`${persona.name} solution`, `B2B ${persona.title.toLowerCase()}`],
      intent: "informational",
      cta: "Learn More",
      notes: `Content strategy targeting ${persona.title} buyer persona for global market`,
    };
  }

  const brief = await createBrief({
    title: parsed.title,
    targetPersonaId: personaId,
    targetKeywords: parsed.targetKeywords,
    intent: parsed.intent as SearchIntent,
    cta: parsed.cta,
    notes: parsed.notes,
  });

  // Fire-and-forget activity log for AI generation
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.BRIEF_AI_GENERATED,
    entityType: "ContentBrief",
    entityId: brief.id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "info",
    context: { personaId, personaName: persona.name },
  });

  return brief;
}

// ==================== Stats ====================

export async function getBriefStats(): Promise<{
  total: number;
  draft: number;
  ready: number;
  inProgress: number;
  done: number;
}> {
  const session = await getSession();

  const [total, draft, ready, inProgress, done] = await Promise.all([
    prisma.contentBrief.count({
      where: { tenantId: session.user.tenantId, deletedAt: null },
    }),
    prisma.contentBrief.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "draft" },
    }),
    prisma.contentBrief.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "ready" },
    }),
    prisma.contentBrief.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "in_progress" },
    }),
    prisma.contentBrief.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "done" },
    }),
  ]);

  return { total, draft, ready, inProgress, done };
}

// ==================== Batch: Create from TopicCluster ====================

export type ContentMapItem = {
  type: string;
  title: string;
  briefGoal: string;
  funnel: string;
  intent: string;
  mustUseEvidenceIds?: string[];
  targetQuestion?: string;
  targetRole?: string;
  targetPersonaId?: string;
  targetPersonaName?: string;
  primaryPublishTarget?: string;
  suggestedDistributionTargets?: string[];
  pillar?: string;
  clusterIndex?: number;
  itemIndex?: number;
};

export type BatchBriefResult = {
  success: boolean;
  created: number;
  errors: string[];
  briefs: BriefListItem[];
};

/**
 * 从 TopicCluster 批量创建 ContentBrief
 * @param items 选中的 contentMap items
 * @param targetPersonaId 可选的目标 Persona
 */
export async function createBriefsFromTopicCluster(
  items: ContentMapItem[],
  targetPersonaId?: string
): Promise<BatchBriefResult> {
  const session = await getSession();
  
  const errors: string[] = [];
  const createdBriefs: BriefListItem[] = [];
  
  // Map intent from TopicCluster format to ContentBrief format
  const mapIntent = (intent: string): SearchIntent => {
    const normalized = intent.toLowerCase();
    if (normalized.includes('commercial') || normalized.includes('商业')) return 'commercial';
    if (normalized.includes('transactional') || normalized.includes('交易')) return 'transactional';
    if (normalized.includes('navigational') || normalized.includes('导航')) return 'navigational';
    return 'informational';
  };
  
  // Process each item
  for (const item of items) {
    try {
      // Generate target keywords from title and type
      const keywords: string[] = [];
      
      // Extract keywords from title (split by common separators)
      const titleWords = item.title.split(/[：:,，\-–—\s]+/).filter(w => w.length > 1);
      keywords.push(...titleWords.slice(0, 3));
      
      // Add type as keyword if relevant
      if (item.type && !keywords.some(k => k.toLowerCase() === item.type.toLowerCase())) {
        keywords.push(item.type);
      }
      
      // Add pillar if provided
      if (item.pillar && !keywords.some(k => k === item.pillar)) {
        keywords.push(item.pillar);
      }
      
      const resolvedPersonaId = targetPersonaId || item.targetPersonaId || null;
      const noteSections = [
        item.briefGoal,
        `来源：TopicCluster / ${item.pillar || '未分类'}`,
        `漏斗阶段：${item.funnel}`,
        `内容类型：${item.type}`,
      ];

      if (item.targetRole) {
        noteSections.push(`目标角色：${item.targetRole}`);
      }
      if (item.targetPersonaName) {
        noteSections.push(`目标画像：${item.targetPersonaName}`);
      }
      if (item.targetQuestion) {
        noteSections.push(`优先回答问题：${item.targetQuestion}`);
      }
      if (item.primaryPublishTarget) {
        noteSections.push(`主发布渠道：${item.primaryPublishTarget}`);
      }
      if (item.suggestedDistributionTargets?.length) {
        noteSections.push(`建议分发渠道：${item.suggestedDistributionTargets.join('、')}`);
      }

      const brief = await prisma.contentBrief.create({
        data: {
          tenantId: session.user.tenantId,
          title: item.title,
          targetPersonaId: resolvedPersonaId,
          targetKeywords: keywords.slice(0, 5), // Limit to 5 keywords
          intent: mapIntent(item.intent),
          cta: null,
          evidenceIds: item.mustUseEvidenceIds || [],
          notes: noteSections.join('\n'),
          status: "draft",
          createdById: session.user.id,
        },
        include: {
          targetPersona: { select: { name: true } },
        },
      });
      
      createdBriefs.push({
        id: brief.id,
        title: brief.title,
        targetKeywords: brief.targetKeywords,
        intent: brief.intent as SearchIntent,
        status: brief.status,
        targetPersonaId: brief.targetPersonaId,
        targetPersonaName: brief.targetPersona?.name || undefined,
        createdAt: brief.createdAt,
        updatedAt: brief.updatedAt,
      });
    } catch (err) {
      errors.push(`创建 "${item.title}" 失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }
  
  // Log batch activity
  if (createdBriefs.length > 0) {
    logActivity({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "brief.batch_created",
      entityType: "ContentBrief",
      entityId: createdBriefs[0].id,
      eventCategory: EVENT_CATEGORIES.MARKETING,
      severity: "info",
      context: { 
        totalCreated: createdBriefs.length, 
        totalRequested: items.length,
        errors: errors.length,
        source: 'TopicCluster',
      },
    });
  }
  
  revalidatePath("/customer/marketing");
  
  return {
    success: errors.length === 0,
    created: createdBriefs.length,
    errors,
    briefs: createdBriefs,
  };
}
