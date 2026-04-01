/**
 * API: GEO Citation Tracking - Manual trigger
 *
 * POST /api/geo/track-citations
 * Body: { recordId: string }
 *
 * Checks if a GEO version is being cited by the specified AI engine.
 * Uses web search to query the AI engine and check for content overlap.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CitationStatus } from "@/actions/geo-distribution";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: "recordId required" }, { status: 400 });
    }

    const record = await db.geoDistributionRecord.findUnique({
      where: { id: recordId, tenantId: session.user.tenantId },
      include: {
        content: {
          select: { title: true, slug: true, geoVersion: true, keywords: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Perform citation check
    const result = await checkCitation(record);

    // Update record
    const history = Array.isArray(record.checkHistory) ? record.checkHistory : [];
    const newEntry = {
      checkedAt: new Date().toISOString(),
      status: result.status,
      snippet: result.snippet || null,
    };

    const updated = await db.geoDistributionRecord.update({
      where: { id: recordId },
      data: {
        citationStatus: result.status,
        citationUrl: result.url || null,
        citationSnippet: result.snippet || null,
        citationScore: result.score ?? null,
        lastCheckedAt: new Date(),
        checkCount: record.checkCount + 1,
        checkHistory: [...history, newEntry],
      },
    });

    return NextResponse.json({
      success: true,
      record: {
        id: updated.id,
        citationStatus: updated.citationStatus,
        citationScore: updated.citationScore,
        citationSnippet: updated.citationSnippet,
      },
    });
  } catch (error) {
    console.error("[track-citations] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Check if content is cited by an AI engine.
 *
 * Strategy: Query the AI engine with the content's keywords and check
 * if the response contains overlapping content with the geoVersion.
 *
 * This is a placeholder implementation. In production, you would use
 * the actual AI engine APIs (ChatGPT, Perplexity, etc.) to query
 * and analyze their responses.
 */
async function checkCitation(record: {
  channel: string;
  queryKeywords: string[];
  distributedVersion: string | null;
  content: {
    title: string;
    slug: string;
    geoVersion: string | null;
    keywords: string[];
  } | null;
}): Promise<{
  status: CitationStatus;
  url?: string;
  snippet?: string;
  score?: number;
}> {
  const geoText = record.distributedVersion || record.content?.geoVersion;
  if (!geoText || geoText.length < 50) {
    return { status: "NOT_CITED", score: 0 };
  }

  const queryTerms = record.queryKeywords.length > 0
    ? record.queryKeywords
    : record.content?.keywords || [];

  if (queryTerms.length === 0) {
    return { status: "NOT_CITED", score: 0 };
  }

  // For now, set as PENDING to indicate it needs manual or scheduled check.
  // In production, this would call the respective AI engine's API.
  //
  // Example flow for ChatGPT:
  //   1. Use ChatGPT API to ask a question using queryTerms
  //   2. Check if the response contains phrases from geoText
  //   3. Calculate overlap score
  //
  // Example flow for Perplexity:
  //   1. Use Perplexity API to search queryTerms
  //   2. Check if cited sources include our content URL
  //   3. Extract citation snippet

  return {
    status: "PENDING",
    score: undefined,
    snippet: `Queued for check: "${queryTerms.slice(0, 3).join(", ")}"`,
  };
}
