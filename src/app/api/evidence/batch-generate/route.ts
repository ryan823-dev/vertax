import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/ai-client";

// Allow up to 120s for large documents with many chunks
export const maxDuration = 120;

const EVIDENCE_EXTRACT_PROMPT = `你是一个 B2B 营销证据提取专家。从给定文本片段中提取有价值的营销证据。
返回严格的 JSON 格式（不要 markdown 代码块），例如：
{"type":"claim","title":"证据标题（15字以内）","content":"证据内容（100字以内，提炼核心信息）"}
type 只能是：claim（主张）、statistic（数据）、case_study（案例）、testimonial（证言）、certification（资质）

如果文本片段中没有任何有价值的营销证据（例如目录、页眉、格式文本），返回：{"type":"skip","title":"","content":""}`;

const BATCH_SIZE = 10;

/**
 * POST /api/evidence/batch-generate
 * 批量从资产的所有 chunks 生成证据
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId as string;
    const userId = session.user.id as string;
    const { assetId } = await request.json() as { assetId: string };

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    // Get total chunk count first
    const totalChunks = await db.assetChunk.count({
      where: { assetId, tenantId },
    });

    if (totalChunks === 0) {
      return NextResponse.json({ error: "该资产没有文本片段，请先处理资产" }, { status: 400 });
    }

    let generated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    let cursor: string | undefined;

    // Process all chunks in batches using cursor-based pagination
    while (true) {
      const chunks = await db.assetChunk.findMany({
        where: { assetId, tenantId },
        orderBy: { chunkIndex: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (chunks.length === 0) break;
      cursor = chunks[chunks.length - 1].id;

      // Process batch concurrently (up to BATCH_SIZE in parallel)
      const results = await Promise.allSettled(
        chunks.map(async (chunk) => {
          const response = await chatCompletion(
            [
              { role: "system", content: EVIDENCE_EXTRACT_PROMPT },
              { role: "user", content: chunk.content },
            ],
            { model: "qwen-plus", temperature: 0.2, maxTokens: 512 }
          );

          let parsed: { type: string; title: string; content: string };
          try {
            let jsonStr = response.content.trim();
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
            }
            parsed = JSON.parse(jsonStr);
          } catch {
            parsed = {
              type: "claim",
              title: "AI 提取证据",
              content: chunk.content.substring(0, 200),
            };
          }

          // Skip if AI determined chunk has no evidence
          if (parsed.type === "skip" || !parsed.title || !parsed.content) {
            return { status: "skipped" as const };
          }

          const validTypes = ["claim", "statistic", "case_study", "testimonial", "certification"];
          const evidenceType = validTypes.includes(parsed.type) ? parsed.type : "claim";

          await db.evidence.create({
            data: {
              tenantId,
              title: parsed.title,
              content: parsed.content,
              type: evidenceType as "claim" | "statistic" | "case_study" | "testimonial" | "certification",
              sourceLocator: { assetId, chunkId: chunk.id, highlightText: chunk.content.substring(0, 200) },
              chunkId: chunk.id,
              assetId,
              tags: [],
              createdById: userId,
            },
          });

          return { status: "generated" as const };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.status === "generated") generated++;
          else skipped++;
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          console.error("[evidence/batch-generate] chunk error:", msg);
          errorDetails.push(msg.substring(0, 100));
          errors++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      generated,
      skipped,
      errors,
      totalChunks,
      errorDetails: errorDetails.slice(0, 5),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[evidence/batch-generate] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
