import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/ai-client";

// Pro plan: allow up to 60s for batch AI calls
export const maxDuration = 60;

const EVIDENCE_EXTRACT_PROMPT = `你是一个 B2B 营销证据提取专家。从给定文本片段中提取有价值的营销证据。
返回严格的 JSON 格式（不要 markdown 代码块），例如：
{"type":"claim","title":"证据标题（15字以内）","content":"证据内容（100字以内，提炼核心信息）"}
type 只能是：claim（主张）、statistic（数据）、case_study（案例）、testimonial（证言）、award（荣誉）`;

/**
 * POST /api/evidence/batch-generate
 * 批量从资产生成证据（替代 Server Action，绕过超时限制）
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

    const chunks = await db.assetChunk.findMany({
      where: { assetId, tenantId },
      orderBy: { chunkIndex: "asc" },
      take: 20,
    });

    if (chunks.length === 0) {
      return NextResponse.json({ error: "该资产没有文本片段，请先处理资产" }, { status: 400 });
    }

    let generated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const chunk of chunks) {
      try {
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

        await db.evidence.create({
          data: {
            tenantId,
            title: parsed.title || "AI 提取证据",
            content: parsed.content || chunk.content.substring(0, 200),
            type: (["claim","statistic","case_study","testimonial","certification"].includes(parsed.type)
              ? parsed.type : "claim") as "claim" | "statistic" | "case_study" | "testimonial" | "certification",
            sourceLocator: { assetId, chunkId: chunk.id, highlightText: chunk.content.substring(0, 200) },
            chunkId: chunk.id,
            assetId,
            tags: [],
            createdById: userId,
          },
        });
        generated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[evidence/batch-generate] chunk error:", msg);
        errorDetails.push(msg.substring(0, 100));
        errors++;
      }
    }

    return NextResponse.json({ ok: true, generated, errors, errorDetails });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[evidence/batch-generate] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
