/**
 * Cron: GEO Citation Check
 *
 * Scheduled to run daily (or every 6 hours in production).
 * Picks up GEO distribution records with status=PENDING or those
 * not checked in the last 24 hours, and queues citation checks.
 *
 * In production, this would call each AI engine's API to verify
 * whether our GEO content is being cited in their responses.
 *
 * vercel.json cron: 0 6 * * * (daily at 6 AM UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find records that need checking:
    // 1. PENDING status (never checked)
    // 2. Last checked more than 24h ago (re-check)
    const recordsToCheck = await db.geoDistributionRecord.findMany({
      where: {
        OR: [
          { citationStatus: "PENDING" },
          {
            lastCheckedAt: { lt: oneDayAgo },
            citationStatus: { in: ["CITED", "PARTIAL", "NOT_CITED"] },
          },
        ],
      },
      include: {
        content: {
          select: {
            title: true,
            slug: true,
            geoVersion: true,
            keywords: true,
          },
        },
      },
      take: 50, // Process in batches to stay within timeout
      orderBy: [
        { lastCheckedAt: { sort: "asc", nulls: "first" } },
      ],
    });

    if (recordsToCheck.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: "No records need checking",
      });
    }

    let processed = 0;
    let errors = 0;

    for (const record of recordsToCheck) {
      try {
        // In production, this would call the AI engine API
        // For now, we just update the check timestamp and increment count
        const geoText = record.distributedVersion || record.content?.geoVersion;

        if (!geoText || geoText.length < 50) {
          // No content to check - mark as NOT_CITED
          await db.geoDistributionRecord.update({
            where: { id: record.id },
            data: {
              citationStatus: "NOT_CITED",
              lastCheckedAt: now,
              checkCount: record.checkCount + 1,
            },
          });
          processed++;
          continue;
        }

        // Placeholder: In production, implement per-channel check logic
        // For each channel, use the appropriate API:
        //
        // CHATGPT: Use OpenAI API with web search to ask about the topic
        //          and check if response overlaps with geoText
        //
        // PERPLEXITY: Use Perplexity API and check cited sources
        //
        // GEMINI: Use Google AI Overview data
        //
        // For now, just update the timestamp to indicate a check was performed

        const history = Array.isArray(record.checkHistory)
          ? record.checkHistory
          : [];
        const newEntry = {
          checkedAt: now.toISOString(),
          status: "PENDING",
          note: "cron_check_placeholder",
        };

        await db.geoDistributionRecord.update({
          where: { id: record.id },
          data: {
            lastCheckedAt: now,
            checkCount: record.checkCount + 1,
            checkHistory: [...history, newEntry],
          },
        });

        processed++;
      } catch (err) {
        console.error(
          `[geo-citation-check] Error processing record ${record.id}:`,
          err
        );
        errors++;
      }
    }

    console.log(
      `[geo-citation-check] Processed ${processed} records, ${errors} errors`
    );

    return NextResponse.json({
      processed,
      errors,
      total: recordsToCheck.length,
    });
  } catch (error) {
    console.error("[geo-citation-check] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

