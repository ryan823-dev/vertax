import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { discoverPages, normalizeUrl } from "@/lib/services/site-crawler";
import { fetchWebContent } from "@/lib/services/web-scraper";
import { splitTextIntoChunks } from "@/lib/utils/chunk-utils";
import crypto from "crypto";


// URL patterns that indicate low-value pages (legal/nav noise)
const LOW_VALUE_URL_PATTERNS = [
  /\/privacy/i, /\/terms/i, /\/cookie/i, /\/legal/i, /\/gdpr/i,
  /\/disclaimer/i, /\/imprint/i, /\/unsubscribe/i,
  /\/sitemap/i, /\/feed/i, /\/rss/i,
  /\/tag\//i, /\/tags\//i, /\/author\//i,
  /\/wp-content/i, /\/cdn-cgi/i,
];

function isLowValuePage(url: string, content: string): boolean {
  const pathname = new URL(url).pathname.toLowerCase();
  if (LOW_VALUE_URL_PATTERNS.some((re) => re.test(pathname))) return true;
  if (content.trim().length < 200) return true;
  return false;
}
export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function POST(req: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  // Parse body
  let body: { url: string; maxPages?: number; folderId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { url, maxPages = 500, folderId } = body;

  // URL validation
  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "URL is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let normalizedRoot: string;
  try {
    normalizedRoot = normalizeUrl(url);
    new URL(normalizedRoot); // validate
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const crawlBatchId = crypto.randomUUID();

  // SSE streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may be closed
        }
      };

      try {
        // Phase 1: Discover pages
        send({
          phase: "discovering",
          message: "Discovering pages...",
          discovered: 0,
          fetched: 0,
          failed: 0,
          skipped: 0,
        });

        const { urls: discoveredUrls, method } = await discoverPages(normalizedRoot, {
          maxPages: Math.min(maxPages, 1000),
        });

        send({
          phase: "discovering",
          message: `Found ${discoveredUrls.length} pages via ${method}`,
          discovered: discoveredUrls.length,
          fetched: 0,
          failed: 0,
          skipped: 0,
        });

        if (discoveredUrls.length === 0) {
          send({
            phase: "done",
            message: "No pages found on this website",
            discovered: 0,
            fetched: 0,
            failed: 0,
            skipped: 0,
          });
          controller.close();
          return;
        }

        // Phase 2: Fetch content and create assets
        let fetched = 0;
        let failed = 0;
        let skipped = 0;
        const results: Array<{ url: string; title: string; status: string; error?: string }> = [];

        for (let i = 0; i < discoveredUrls.length; i++) {
          const pageUrl = discoveredUrls[i];
          const storageKey = `web://${pageUrl}`;

          send({
            phase: "fetching",
            message: `Fetching (${i + 1}/${discoveredUrls.length})...`,
            discovered: discoveredUrls.length,
            fetched,
            failed,
            skipped,
            currentUrl: pageUrl,
            currentIndex: i + 1,
          });

          // Dedup check
          const existing = await db.asset.findFirst({
            where: { tenantId, storageKey },
            select: { id: true },
          });

          if (existing) {
            skipped++;
            results.push({ url: pageUrl, title: "", status: "skipped" });
            continue;
          }

          try {
            // Fetch content using existing web-scraper
            const scraped = await fetchWebContent(pageUrl, {
              maxChars: 30000,
              timeout: 15000,
            });

            if (!scraped.success || isLowValuePage(pageUrl, scraped.content)) {
              failed++;
              results.push({
                url: pageUrl,
                title: scraped.title || "",
                status: "failed",
                error: scraped.error || "Content too short or low-value page",
              });
              continue;
            }

            // Chunk the content
            const chunks = splitTextIntoChunks(scraped.content, {
              maxTokensPerChunk: 500,
              overlapTokens: 50,
            });

            // Derive page title
            const pageTitle =
              scraped.title ||
              new URL(pageUrl).pathname.split("/").filter(Boolean).pop() ||
              pageUrl;

            // Create Asset record
            const contentBytes = Buffer.byteLength(scraped.content, "utf8");

            const asset = await db.asset.create({
              data: {
                tenantId,
                uploadedById: userId,
                folderId: folderId || null,
                originalName: pageTitle,
                storageKey,
                mimeType: "text/html",
                fileSize: BigInt(contentBytes),
                extension: ".html",
                fileCategory: "document",
                purpose: ["knowledge"],
                tags: ["web-import"],
                title: pageTitle,
                description: `Imported from ${new URL(pageUrl).hostname}`,
                status: "active",
                metadata: {
                  source: "web",
                  sourceUrl: pageUrl,
                  processingStatus: "ready",
                  processedAt: new Date().toISOString(),
                  chunkCount: chunks.length,
                  crawlBatchId,
                  crawledAt: new Date().toISOString(),
                },
              },
            });

            // Create AssetChunk records
            if (chunks.length > 0) {
              await db.assetChunk.createMany({
                data: chunks.map((chunk) => ({
                  tenantId,
                  assetId: asset.id,
                  content: chunk.content,
                  chunkIndex: chunk.chunkIndex,
                  charStart: chunk.charStart,
                  charEnd: chunk.charEnd,
                  tokenCount: chunk.tokenCount,
                })),
              });
            }

            fetched++;
            results.push({
              url: pageUrl,
              title: pageTitle,
              status: "fetched",
            });

            send({
              phase: "fetching",
              message: `Fetched: ${pageTitle}`,
              discovered: discoveredUrls.length,
              fetched,
              failed,
              skipped,
              currentUrl: pageUrl,
              currentIndex: i + 1,
            });
          } catch (err) {
            failed++;
            results.push({
              url: pageUrl,
              title: "",
              status: "failed",
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }

          // Rate limiting: 300ms between pages
          if (i < discoveredUrls.length - 1) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        // Phase 3: Done
        send({
          phase: "done",
          message: `Import complete: ${fetched} imported, ${failed} failed, ${skipped} skipped`,
          discovered: discoveredUrls.length,
          fetched,
          failed,
          skipped,
          results,
          crawlBatchId,
        });
      } catch (err) {
        send({
          phase: "error",
          message: err instanceof Error ? err.message : "Crawl failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
