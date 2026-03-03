"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type {
  GuidelineData,
  GuidelineCategoryValue,
  CreateGuidelineInput,
  UpdateGuidelineInput,
} from "@/types/knowledge";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getGuidelines(
  category?: GuidelineCategoryValue
): Promise<GuidelineData[]> {
  const session = await getSession();

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  if (category) where.category = category;

  const items = await db.brandGuideline.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return items.map((g) => ({
    id: g.id,
    category: g.category as GuidelineCategoryValue,
    title: g.title,
    content: g.content,
    examples: g.examples as GuidelineData["examples"],
    isActive: g.isActive,
    order: g.order,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
}

export async function createGuideline(input: CreateGuidelineInput): Promise<GuidelineData> {
  const session = await getSession();

  const maxOrder = await db.brandGuideline.aggregate({
    where: { tenantId: session.user.tenantId, category: input.category },
    _max: { order: true },
  });

  const g = await db.brandGuideline.create({
    data: {
      tenantId: session.user.tenantId,
      category: input.category,
      title: input.title,
      content: input.content,
      examples: (input.examples || { do: [], dont: [] }) as object,
      isActive: input.isActive ?? true,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath("/zh-CN/knowledge");

  return {
    id: g.id,
    category: g.category as GuidelineCategoryValue,
    title: g.title,
    content: g.content,
    examples: g.examples as GuidelineData["examples"],
    isActive: g.isActive,
    order: g.order,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function updateGuideline(id: string, input: UpdateGuidelineInput): Promise<void> {
  const session = await getSession();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) data.content = input.content;
  if (input.examples !== undefined) data.examples = input.examples as object;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  await db.brandGuideline.update({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  revalidatePath("/zh-CN/knowledge");
}

export async function deleteGuideline(id: string): Promise<void> {
  const session = await getSession();

  await db.brandGuideline.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/zh-CN/knowledge");
}
