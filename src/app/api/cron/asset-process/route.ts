import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractTextFromAsset } from "@/lib/utils/text-extract";
import { splitTextIntoChunks } from "@/lib/utils/chunk-utils";

export const maxDuration = 300; // 5 minutes per batch

/**
 * Asset Processing Background Worker
 * 
 * 后台处理资产文本提取和分块任务
 * 由 Cron 定时调用：每分钟执行一次
 */
export async function POST(req: NextRequest) {
  // Auth check for cron (using header token or API key)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-secret"}`) {
    // For development, allow without auth
    console.warn("[asset-process] Missing or invalid auth header, proceeding in dev mode");
  }

  try {
    // Find pending tasks
    const tasks = await db.assetProcessQueue.findMany({
      where: {
        status: { in: ["pending", "extracting", "chunking"] },
      },
      orderBy: [
        { createdAt: "asc" }, // Process oldest first
      ],
      take: 5, // Process up to 5 assets per run
    });

    if (tasks.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No pending asset processing tasks",
        processed: 0,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;
    const results: Array<{ taskId: string; status: string; error?: string }> = [];

    for (const task of tasks) {
      try {
        const result = await processAssetTask(task);
        results.push(result);
        if (result.status === "completed") {
          totalProcessed++;
        }
      } catch (err) {
        console.error(`[asset-process] Task ${task.id} error:`, err);
        results.push({
          taskId: task.id,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });

        // Mark task as failed
        await db.assetProcessQueue.update({
          where: { id: task.id },
          data: {
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Unknown error",
            metadata: {
              ...task.metadata,
              failedAt: new Date().toISOString(),
            },
          },
        });

        // Also update the asset metadata
        await updateAssetStatus(task.assetId, "failed", err instanceof Error ? err.message : "Unknown error");
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${totalProcessed} assets`,
      tasks: results,
      totalProcessed,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asset-process] Critical error:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Critical error" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Process a single asset task
 */
async function processAssetTask(task: {
  id: string;
  tenantId: string;
  userId: string;
  batchId: string;
  assetId: string;
  storageKey: string;
  mimeType: string;
  status: string;
  metadata: any;
}) {
  const { id: taskId, tenantId, userId, assetId, storageKey, mimeType, metadata } = task;
  
  // Step 1: Update status to extracting
  await db.assetProcessQueue.update({
    where: { id: taskId },
    data: {
      status: "extracting",
      currentStep: "extracting_text",
      progress: 10,
      metadata: {
        ...metadata,
        startedAt: new Date().toISOString(),
      },
    },
  });

  await updateAssetStatus(assetId, "processing", undefined, "extracting_text");

  // Step 1: Extract text from asset
  const text = await extractTextFromAsset(storageKey, mimeType);

  if (!text || text.length < 10 || text.startsWith('[')) {
    throw new Error('文本提取失败或内容过少');
  }

  // Update progress after extraction
  await db.assetProcessQueue.update({
    where: { id: taskId },
    data: {
      progress: 50,
      metadata: {
        ...metadata,
        textLength: text.length,
      },
    },
  });

  // Step 2: Update status to chunking
  await db.assetProcessQueue.update({
    where: { id: taskId },
    data: {
      status: "chunking",
      currentStep: "splitting_chunks",
      progress: 60,
    },
  });

  await updateAssetStatus(assetId, "processing", undefined, "splitting_chunks");

  // Step 2: Split text into chunks
  const chunks = splitTextIntoChunks(text);

  if (chunks.length === 0) {
    throw new Error('文本分块结果为空');
  }

  // Step 3: Update status to creating records
  await db.assetProcessQueue.update({
    where: { id: taskId },
    data: {
      currentStep: "creating_records",
      progress: 70,
    },
  });

  await updateAssetStatus(assetId, "processing", undefined, "creating_records");

  // Step 3: Delete old chunks (reprocessing scenario)
  await db.assetChunk.deleteMany({
    where: { assetId },
  });

  // Step 4: Batch create AssetChunk records (in batches of 100)
  const CHUNK_BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
    const batch = chunks.slice(i, i + CHUNK_BATCH_SIZE);
    await db.assetChunk.createMany({
      data: batch.map((chunk) => ({
        tenantId,
        assetId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        tokenCount: chunk.tokenCount,
      })),
    });

    // Update progress
    const progress = 70 + Math.floor(((i + batch.length) / chunks.length) * 25);
    await db.assetProcessQueue.update({
      where: { id: taskId },
      data: { progress },
    });
  }

  // Step 5: Mark as completed
  const completedAt = new Date().toISOString();
  await db.assetProcessQueue.update({
    where: { id: taskId },
    data: {
      status: "completed",
      progress: 100,
      metadata: {
        ...metadata,
        chunkCount: chunks.length,
        textLength: text.length,
        completedAt,
      },
    },
  });

  // Update asset metadata
  await updateAssetStatus(assetId, "ready", undefined, undefined, chunks.length, completedAt);

  return {
    taskId,
    status: "completed",
    chunkCount: chunks.length,
  };
}

/**
 * Update asset metadata with processing status
 */
async function updateAssetStatus(
  assetId: string,
  processingStatus: string,
  processingError?: string,
  processingStep?: string,
  chunkCount?: number,
  processedAt?: string
) {
  try {
    const asset = await db.asset.findUnique({
      where: { id: assetId },
      select: { metadata: true },
    });

    if (!asset) return;

    const currentMeta = (asset.metadata || {}) as Record<string, unknown>;
    const newMeta: Record<string, unknown> = {
      ...currentMeta,
      processingStatus,
    };

    if (processingError !== undefined) {
      newMeta.processingError = processingError;
    }
    if (processingStep !== undefined) {
      newMeta.processingStep = processingStep;
    }
    if (chunkCount !== undefined) {
      newMeta.chunkCount = chunkCount;
    }
    if (processedAt !== undefined) {
      newMeta.processedAt = processedAt;
    }

    await db.asset.update({
      where: { id: assetId },
      data: { metadata: newMeta },
    });
  } catch (err) {
    console.error(`[asset-process] Failed to update asset ${assetId} status:`, err);
  }
}
