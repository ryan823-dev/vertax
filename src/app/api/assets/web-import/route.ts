import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { discoverPages, normalizeUrl } from "@/lib/services/site-crawler";
import crypto from "crypto";

export const maxDuration = 60; // 1 minute - return quickly after queueing task

/**
 * Web Import API - 后台任务模式
 * 
 * 1. 仅负责发现页面并创建爬取队列
 * 2. 立即返回任务 ID
 * 3. 由 /api/cron/web-crawl 后台分段处理
 */
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

  try {
    // Phase 1: Discover pages (fast operation)
    const { urls: discoveredUrls, method } = await discoverPages(normalizedRoot, {
      maxPages: Math.min(maxPages, 1000),
    });

    if (discoveredUrls.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No pages found on this website",
        method,
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Phase 2: Create crawl queue in database
    const crawlTask = await db.crawlQueue.create({
      data: {
        tenantId,
        userId,
        batchId: crawlBatchId,
        rootUrl: normalizedRoot,
        totalPages: discoveredUrls.length,
        processedPages: 0,
        status: "pending",
        folderId: folderId || null,
        urls: discoveredUrls.map((url, index) => ({
          url,
          status: "pending" as const,
          priority: index < 20 ? 1 : index < 100 ? 2 : 3, // 前 20 页高优先级
        })),
        metadata: {
          discoveryMethod: method,
          requestedAt: new Date().toISOString(),
          maxPagesRequested: maxPages,
        },
      },
    });

    // Phase 3: Immediately trigger processing (don't wait for cron)
    // Fire-and-forget: start processing in background without blocking response
    // Cron will act as fallback if this background task is interrupted
    const processUrl = new URL("/api/cron/web-crawl", req.url).toString();
    fetch(processUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.CRON_SECRET || "dev-secret"}`,
      },
    }).catch((err) => {
      console.warn("[web-import] Failed to trigger immediate processing:", err);
      // Cron will handle it as fallback
    });

    // Return immediately with task info
    return new Response(JSON.stringify({
      success: true,
      taskId: crawlTask.id,
      batchId: crawlBatchId,
      discoveredPages: discoveredUrls.length,
      method,
      message: `Crawl task queued. Processing ${discoveredUrls.length} pages in background.`,
      estimatedTimeSeconds: Math.ceil(discoveredUrls.length / 20), // ~20 pages per minute
    }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[web-import] Error:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Failed to start crawl task" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET - Check crawl task status
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const batchId = searchParams.get("batchId");

  if (!taskId && !batchId) {
    return new Response(JSON.stringify({ error: "taskId or batchId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const task = await db.crawlQueue.findFirst({
      where: {
        tenantId,
        id: taskId || undefined,
        batchId: batchId || undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      id: task.id,
      batchId: task.batchId,
      status: task.status,
      totalPages: task.totalPages,
      processedPages: task.processedPages,
      progress: Math.round((task.processedPages / task.totalPages) * 100),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      metadata: task.metadata,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[web-import-status] Error:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Failed to get status" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
