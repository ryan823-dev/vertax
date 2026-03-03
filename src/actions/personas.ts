"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
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

  revalidatePath("/zh-CN/knowledge");

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
  revalidatePath("/zh-CN/knowledge");
}

export async function deleteICPSegment(id: string): Promise<void> {
  const session = await getSession();
  await db.iCPSegment.delete({ where: { id, tenantId: session.user.tenantId } });
  revalidatePath("/zh-CN/knowledge");
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

  revalidatePath("/zh-CN/knowledge");

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
  revalidatePath("/zh-CN/knowledge");
}

export async function deletePersona(id: string): Promise<void> {
  const session = await getSession();
  await db.persona.delete({ where: { id, tenantId: session.user.tenantId } });
  revalidatePath("/zh-CN/knowledge");
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

  revalidatePath("/zh-CN/knowledge");
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
  } catch {
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
