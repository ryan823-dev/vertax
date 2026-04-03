/**
 * 资产处理模块
 *
 * 从 cron route 提取的核心处理逻辑，可被多个地方调用
 */

import { db } from "@/lib/db";
import { extractTextFromAsset } from "@/lib/utils/text-extract";
import { splitTextIntoChunks } from "@/lib/utils/chunk-utils";

/**
 * 直接处理资产任务（不通过 HTTP 调用）
 * 可从 server action 或 cron route 调用
 */
export async function processAssetTaskDirectly(taskId: string): Promise<{
  success: boolean;
  taskId: string;
  chunkCount?: number;
  error?: string;
}> {
  const task = await db.assetProcessQueue.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return { success: false, taskId, error: "Task not found" };
  }

  const { tenantId, assetId, storageKey, mimeType, metadata } = task;

  try {
    // Step 1: Update status to extracting
    await db.assetProcessQueue.update({
      where: { id: taskId },
      data: {
        status: "extracting",
        currentStep: "extracting_text",
        progress: 10,
        metadata: {
          ...(metadata as Record<string, unknown> ?? {}),
          startedAt: new Date().toISOString(),
        },
      },
    });

    await updateAssetStatus(assetId, "processing", undefined, "extracting_text");

    // Step 2: Extract text from asset
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
          ...(metadata as Record<string, unknown> ?? {}),
          textLength: text.length,
        },
      },
    });

    // Step 3: Update status to chunking
    await db.assetProcessQueue.update({
      where: { id: taskId },
      data: {
        status: "chunking",
        currentStep: "splitting_chunks",
        progress: 60,
      },
    });

    await updateAssetStatus(assetId, "processing", undefined, "splitting_chunks");

    // Step 4: Split text into chunks
    const chunks = splitTextIntoChunks(text);

    if (chunks.length === 0) {
      throw new Error('文本分块结果为空');
    }

    // Step 5: Delete old chunks (reprocessing scenario)
    await db.assetChunk.deleteMany({
      where: { assetId },
    });

    // Step 6: Batch create AssetChunk records
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

    // Step 7: Mark as completed
    const completedAt = new Date().toISOString();
    await db.assetProcessQueue.update({
      where: { id: taskId },
      data: {
        status: "completed",
        progress: 100,
        metadata: {
          ...(metadata as Record<string, unknown> ?? {}),
          chunkCount: chunks.length,
          textLength: text.length,
          completedAt,
        },
      },
    });

    // Update asset metadata
    await updateAssetStatus(assetId, "ready", undefined, undefined, chunks.length, completedAt);

    return {
      success: true,
      taskId,
      chunkCount: chunks.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Mark task as failed
    await db.assetProcessQueue.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorMessage,
        metadata: {
          ...(metadata as Record<string, unknown> ?? {}),
          failedAt: new Date().toISOString(),
        },
      },
    });

    await updateAssetStatus(assetId, "failed", errorMessage);

    return {
      success: false,
      taskId,
      error: errorMessage,
    };
  }
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
): Promise<void> {
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
      data: { metadata: newMeta as any },
    });
  } catch (err) {
    console.error(`[asset-processor] Failed to update asset ${assetId} status:`, err);
  }
}