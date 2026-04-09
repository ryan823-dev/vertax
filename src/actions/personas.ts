"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import { logActivity, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";
import { requireDecider } from "@/lib/permissions";
import { normalizeTargetRegions } from "@/lib/regions";
import type {
  ICPSegmentData,
  CreateICPSegmentInput,
  PersonaData,
  CreatePersonaInput,
  MessagingMatrixData,
  UpsertMessagingMatrixInput,
} from "@/types/knowledge";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== ICP Segments ====================

export async function getICPSegments(): Promise<ICPSegmentData[]> {
  const session = await getSession();

  const items = await db.iCPSegment.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { personas: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return items.map((s) => ({
    id: s.id,
    name: s.name,
    industry: s.industry,
    companySize: s.companySize,
    regions: s.regions,
    description: s.description,
    criteria: s.criteria as Record<string, unknown>,
    order: s.order,
    personaCount: s._count.personas,
  }));
}

export async function createICPSegment(input: CreateICPSegmentInput): Promise<ICPSegmentData> {
  const session = await getSession();

  const s = await db.iCPSegment.create({
    data: {
      tenantId: session.user.tenantId,
      name: input.name,
      industry: input.industry,
      companySize: input.companySize,
      regions: input.regions || [],
      description: input.description,
      criteria: (input.criteria || {}) as object,
    },
    include: { _count: { select: { personas: true } } },
  });

  // Fire-and-forget activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "icp_segment.created",
    entityType: "ICPSegment",
    entityId: s.id,
    eventCategory: EVENT_CATEGORIES.KNOWLEDGE,
    severity: "info",
    context: { name: s.name, industry: s.industry },
  });

  revalidatePath("/customer/knowledge/profiles");

  return {
    id: s.id, name: s.name, industry: s.industry, companySize: s.companySize,
    regions: s.regions, description: s.description, criteria: s.criteria as Record<string, unknown>,
    order: s.order, personaCount: s._count.personas,
  };
}

export async function updateICPSegment(id: string, input: Partial<CreateICPSegmentInput>): Promise<void> {
  const session = await getSession();
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.companySize !== undefined) data.companySize = input.companySize;
  if (input.regions !== undefined) data.regions = input.regions;
  if (input.description !== undefined) data.description = input.description;
  if (input.criteria !== undefined) data.criteria = input.criteria as object;

  await db.iCPSegment.update({ where: { id, tenantId: session.user.tenantId }, data });
  revalidatePath("/customer/knowledge/profiles");
}

export async function deleteICPSegment(id: string): Promise<void> {
  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }
  await db.iCPSegment.delete({ where: { id, tenantId: session.user.tenantId } });
  revalidatePath("/customer/knowledge/profiles");
}

// ==================== Personas ====================

export async function getPersonasBySegment(segmentId?: string): Promise<PersonaData[]> {
  const session = await getSession();
  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (segmentId) where.segmentId = segmentId;

  const items = await db.persona.findMany({
    where,
    include: { segment: { select: { name: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return items.map((p) => ({
    id: p.id, segmentId: p.segmentId, segmentName: p.segment?.name || undefined,
    name: p.name, title: p.title, seniority: p.seniority,
    concerns: p.concerns, messagingPrefs: p.messagingPrefs as Record<string, unknown>,
    evidenceRefs: p.evidenceRefs, order: p.order,
  }));
}

export async function createPersona(input: CreatePersonaInput): Promise<PersonaData> {
  const session = await getSession();

  const p = await db.persona.create({
    data: {
      tenantId: session.user.tenantId,
      segmentId: input.segmentId,
      name: input.name,
      title: input.title,
      seniority: input.seniority,
      concerns: input.concerns || [],
      evidenceRefs: input.evidenceRefs || [],
    },
    include: { segment: { select: { name: true } } },
  });

  // Fire-and-forget activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "persona.created",
    entityType: "Persona",
    entityId: p.id,
    eventCategory: EVENT_CATEGORIES.KNOWLEDGE,
    severity: "info",
    context: { name: p.name, title: p.title },
  });

  revalidatePath("/customer/knowledge/profiles");

  return {
    id: p.id, segmentId: p.segmentId, segmentName: p.segment?.name || undefined,
    name: p.name, title: p.title, seniority: p.seniority,
    concerns: p.concerns, messagingPrefs: p.messagingPrefs as Record<string, unknown>,
    evidenceRefs: p.evidenceRefs, order: p.order,
  };
}

export async function updatePersona(id: string, input: Partial<CreatePersonaInput>): Promise<void> {
  const session = await getSession();
  const data: Record<string, unknown> = {};
  if (input.segmentId !== undefined) data.segmentId = input.segmentId;
  if (input.name !== undefined) data.name = input.name;
  if (input.title !== undefined) data.title = input.title;
  if (input.seniority !== undefined) data.seniority = input.seniority;
  if (input.concerns !== undefined) data.concerns = input.concerns;
  if (input.evidenceRefs !== undefined) data.evidenceRefs = input.evidenceRefs;

  await db.persona.update({ where: { id, tenantId: session.user.tenantId }, data });
  revalidatePath("/customer/knowledge/profiles");
}

export async function deletePersona(id: string): Promise<void> {
  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }
  await db.persona.delete({ where: { id, tenantId: session.user.tenantId } });
  revalidatePath("/customer/knowledge/profiles");
}

// ==================== 从企业档案自动生成 ====================

export async function generatePersonasFromProfile(
  options?: { overwrite?: boolean }
): Promise<{ segmentsCreated: number; personasCreated: number; needsAI?: boolean }> {
  const session = await getSession();
  const tenantId = session.user.tenantId;

  // 读取企业档案
  const profile = await db.companyProfile.findUnique({ where: { tenantId } });
  if (!profile) {
    throw new Error("请先生成企业档案");
  }

  const buyerPersonas = (profile.buyerPersonas as Array<{ role: string; title: string; concerns: string[] }>) || [];
  const targetIndustries = (profile.targetIndustries as string[]) || [];
  const targetRegions = normalizeTargetRegions(profile.targetRegions);

  // 企业档案中没有 buyerPersonas → 让前端走 AI fallback
  if (buyerPersonas.length === 0 && targetIndustries.length === 0) {
    return { segmentsCreated: 0, personasCreated: 0, needsAI: true };
  }

  // 覆盖模式：先删 Persona（SetNull 关系），再删 Segment
  if (options?.overwrite) {
    await db.persona.deleteMany({ where: { tenantId } });
    await db.iCPSegment.deleteMany({ where: { tenantId } });
  }

  // 推断 seniority
  function inferSeniority(title: string): string {
    if (/总裁|VP|副总|CEO|CTO|CMO|COO|CFO|总经理|董事/i.test(title)) return 'executive';
    if (/总监|高级经理|部长|主任|Director/i.test(title)) return 'senior';
    if (/经理|科长|主管|Manager/i.test(title)) return 'mid';
    return 'mid';
  }

  let segmentsCreated = 0;
  let personasCreated = 0;

  // 映射 targetIndustries → ICPSegment
  const createdSegments: Array<{ id: string; name: string }> = [];
  if (targetIndustries.length > 0) {
    for (let i = 0; i < targetIndustries.length; i++) {
      const seg = await db.iCPSegment.create({
        data: {
          tenantId,
          name: targetIndustries[i],
          industry: targetIndustries[i],
          regions: targetRegions,
          order: i,
        },
      });
      createdSegments.push({ id: seg.id, name: seg.name });
      segmentsCreated++;
    }
  } else {
    // 无行业信息时创建默认 segment
    const seg = await db.iCPSegment.create({
      data: {
        tenantId,
        name: '默认市场',
        regions: targetRegions,
        order: 0,
      },
    });
    createdSegments.push({ id: seg.id, name: seg.name });
    segmentsCreated++;
  }

  // 映射 buyerPersonas → Persona，挂在第一个 segment 下
  const firstSegmentId = createdSegments[0]?.id;
  for (let i = 0; i < buyerPersonas.length; i++) {
    const bp = buyerPersonas[i];
    await db.persona.create({
      data: {
        tenantId,
        segmentId: firstSegmentId,
        name: bp.role || bp.title,
        title: bp.title || bp.role,
        seniority: inferSeniority(bp.title || ''),
        concerns: (bp.concerns || []).slice(0, 5),
        order: i,
      },
    });
    personasCreated++;
  }

  revalidatePath("/customer/knowledge/profiles");

  return { segmentsCreated, personasCreated };
}

// ==================== Messaging Matrix ====================

export async function getMessagingMatrix(personaId: string): Promise<MessagingMatrixData[]> {
  const session = await getSession();

  const items = await db.messagingMatrix.findMany({
    where: { personaId, tenantId: session.user.tenantId },
    orderBy: { createdAt: "asc" },
  });

  return items.map((m) => ({
    id: m.id, personaId: m.personaId, valueProp: m.valueProp,
    message: m.message, channel: m.channel, evidenceRefs: m.evidenceRefs,
  }));
}

export async function upsertMessagingMatrixEntry(
  personaId: string,
  input: UpsertMessagingMatrixInput
): Promise<void> {
  const session = await getSession();

  const existing = await db.messagingMatrix.findFirst({
    where: { personaId, tenantId: session.user.tenantId, valueProp: input.valueProp, channel: input.channel },
  });

  if (existing) {
    await db.messagingMatrix.update({
      where: { id: existing.id },
      data: { message: input.message, evidenceRefs: input.evidenceRefs || [] },
    });
  } else {
    await db.messagingMatrix.create({
      data: {
        tenantId: session.user.tenantId,
        personaId,
        valueProp: input.valueProp,
        message: input.message,
        channel: input.channel,
        evidenceRefs: input.evidenceRefs || [],
      },
    });
  }

  revalidatePath("/customer/knowledge/profiles");
}

export async function generatePersonaMessaging(
  personaId: string,
  valueProps: string[]
): Promise<{ generated: number }> {
  const session = await getSession();

  const persona = await db.persona.findFirst({
    where: { id: personaId, tenantId: session.user.tenantId },
  });
  if (!persona) throw new Error("Persona 不存在");

  const prompt = `你是 B2B 营销文案专家。为以下买家角色生成针对性的销售信息。

买家角色：${persona.name}（${persona.title}）
核心关注：${persona.concerns.join('、')}

请为每个价值主张生成定制化销售信息（每条 50-100 字），JSON 数组格式：
${JSON.stringify(valueProps.map(v => ({ valueProp: v, message: "..." })))}

只输出 JSON 数组。`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { model: "qwen-plus", temperature: 0.3, maxTokens: 2048 }
  );

  let messages: Array<{ valueProp: string; message: string }>;
  try {
    let jsonStr = response.content.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    messages = JSON.parse(jsonStr);
  } catch (error) {
    console.warn('[generateMessagingMatrixFromPersona] JSON parse failed:', error);
    return { generated: 0 };
  }

  let generated = 0;
  for (const msg of messages) {
    await upsertMessagingMatrixEntry(personaId, {
      valueProp: msg.valueProp,
      message: msg.message,
    });
    generated++;
  }

  return { generated };
}
