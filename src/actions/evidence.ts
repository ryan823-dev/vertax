"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import type {
  EvidenceData,
  EvidenceFilters,
  EvidenceListResponse,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  SourceLocator,
} from "@/types/knowledge";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== 获取证据列表 ====================

export async function getEvidences(
  filters: EvidenceFilters = {},
  pagination = { page: 1, pageSize: 20 }
): Promise<EvidenceListResponse> {
  const session = await getSession();

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };

  if (filters.type && filters.type.length > 0) {
    where.type = { in: filters.type };
  }
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = "active";
  }
  if (filters.assetId) {
    where.assetId = filters.assetId;
  }
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { content: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.evidence.findMany({
      where,
      include: {
        chunk: {
          include: {
            asset: { select: { id: true, originalName: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    db.evidence.count({ where }),
  ]);

  return {
    items: items.map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content,
      type: e.type as EvidenceData["type"],
      sourceLocator: e.sourceLocator as unknown as SourceLocator,
      assetId: e.assetId,
      assetName: e.chunk?.asset?.originalName || undefined,
      chunkId: e.chunkId,
      tags: e.tags,
      status: e.status,
      createdById: e.createdById,
      createdByName: e.createdBy?.name || undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

// ==================== 创建证据 ====================

export async function createEvidence(input: CreateEvidenceInput): Promise<EvidenceData> {
  const session = await getSession();

  let sourceLocator: SourceLocator = input.sourceLocator || { assetId: "" };
  let assetId = input.assetId || null;

  // 从 chunkId 自动填充
  if (input.chunkId) {
    const chunk = await db.assetChunk.findFirst({
      where: { id: input.chunkId, tenantId: session.user.tenantId },
    });
    if (chunk) {
      assetId = chunk.assetId;
      sourceLocator = {
        assetId: chunk.assetId,
        chunkId: chunk.id,
        highlightText: input.content.substring(0, 200),
      };
    }
  }

  const evidence = await db.evidence.create({
    data: {
      tenantId: session.user.tenantId,
      title: input.title,
      content: input.content,
      type: input.type,
      sourceLocator: sourceLocator as object,
      chunkId: input.chunkId || null,
      assetId,
      tags: input.tags || [],
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  revalidatePath("/zh-CN/knowledge");

  return {
    id: evidence.id,
    title: evidence.title,
    content: evidence.content,
    type: evidence.type as EvidenceData["type"],
    sourceLocator: evidence.sourceLocator as unknown as SourceLocator,
    assetId: evidence.assetId,
    chunkId: evidence.chunkId,
    tags: evidence.tags,
    status: evidence.status,
    createdById: evidence.createdById,
    createdByName: evidence.createdBy?.name || undefined,
    createdAt: evidence.createdAt,
    updatedAt: evidence.updatedAt,
  };
}

// ==================== 更新证据 ====================

export async function updateEvidence(id: string, input: UpdateEvidenceInput): Promise<void> {
  const session = await getSession();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) data.content = input.content;
  if (input.type !== undefined) data.type = input.type;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.status !== undefined) data.status = input.status;

  await db.evidence.update({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  revalidatePath("/zh-CN/knowledge");
}

// ==================== 删除证据（软删除）====================

export async function deleteEvidence(id: string): Promise<void> {
  const session = await getSession();

  await db.evidence.update({
    where: { id, tenantId: session.user.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/zh-CN/knowledge");
}

// ==================== AI 从 Chunk 生成证据 ====================

const EVIDENCE_EXTRACT_PROMPT = `你是一个 B2B 营销证据提取专家。从给定文本片段中提取有价值的营销证据。

请分析文本，提取出一条最有价值的证据，并以 JSON 格式输出：

{
  "type": "claim|statistic|testimonial|case_study|certification",
  "title": "证据标题（≤30字）",
  "content": "证据内容（≤200字，精炼提取关键信息）"
}

type 说明：
- claim: 产品/服务的能力主张
- statistic: 具体的数据、指标、百分比
- testimonial: 客户评价、使用反馈
- case_study: 客户案例、项目成果
- certification: 资质认证、行业认可

注意：
- 只输出 JSON，不要额外文字
- 如果文本没有有价值的证据，type 设为 "claim"，title 写 "待审核"
- 内容要精炼，突出关键数据和结论`;

export async function generateEvidenceFromChunk(chunkId: string): Promise<EvidenceData> {
  const session = await getSession();

  const chunk = await db.assetChunk.findFirst({
    where: { id: chunkId, tenantId: session.user.tenantId },
  });

  if (!chunk) throw new Error("文本片段不存在");

  const response = await chatCompletion(
    [
      { role: "system", content: EVIDENCE_EXTRACT_PROMPT },
      { role: "user", content: chunk.content },
    ],
    { model: "qwen-plus", temperature: 0.2, maxTokens: 1024 }
  );

  let parsed: { type: string; title: string; content: string };
  try {
    let jsonStr = response.content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = { type: "claim", title: "AI 提取证据", content: chunk.content.substring(0, 200) };
  }

  return createEvidence({
    title: parsed.title,
    content: parsed.content,
    type: parsed.type as CreateEvidenceInput["type"],
    chunkId: chunk.id,
    assetId: chunk.assetId,
  });
}

// ==================== 批量从 Asset 生成证据 ====================

export async function batchGenerateEvidences(assetId: string): Promise<{ generated: number; errors: number }> {
  const session = await getSession();

  const chunks = await db.assetChunk.findMany({
    where: { assetId, tenantId: session.user.tenantId },
    orderBy: { chunkIndex: "asc" },
    take: 20, // 最多处理 20 个 chunks
  });

  if (chunks.length === 0) throw new Error("该资产没有文本片段，请先处理资产");

  let generated = 0;
  let errors = 0;

  // 串行处理避免 API 压力
  for (const chunk of chunks) {
    try {
      await generateEvidenceFromChunk(chunk.id);
      generated++;
    } catch {
      errors++;
    }
  }

  revalidatePath("/zh-CN/knowledge");
  return { generated, errors };
}
