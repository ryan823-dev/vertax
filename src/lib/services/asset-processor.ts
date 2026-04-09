/**
 * 资产处理状态追踪服务
 *
 * 提供统一的资产处理状态管理，包括：
 * - 处理中 / 成功 / 失败 状态
 * - 失败原因记录
 * - 重试计数
 */

import { prisma } from '@/lib/prisma';
import { splitTextIntoChunks } from '@/lib/utils/chunk-utils';
import { extractTextFromAsset } from '@/lib/utils/text-extract';

// Asset 处理状态
export type AssetProcessingStatus =
  | 'uploading'      // 上传中
  | 'processing'     // 处理中
  | 'ready'          // 处理完成，可用于分析
  | 'failed';        // 处理失败

// 资产处理元数据
export interface AssetProcessingMetadata {
  status: AssetProcessingStatus;
  retryCount: number;
  lastError?: string;
  lastProcessedAt?: string;
  chunksCreated?: number;
  textLength?: number;
}

// Prisma JSON 字段类型

/**
 * 将任意值安全地转换为对象
 */
function toObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * 更新资产处理元数据
 */
async function updateAssetMetadata(
  assetId: string,
  tenantId: string,
  metadata: Partial<AssetProcessingMetadata>
): Promise<void> {
  // 获取当前元数据
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    select: { metadata: true },
  });

  const currentMeta = toObject(asset?.metadata);
  const currentProcessing = (currentMeta.processing as AssetProcessingMetadata) || {
    status: 'uploading' as const,
    retryCount: 0,
  };

  const updatedMeta = {
    ...currentMeta,
    processing: {
      ...currentProcessing,
      ...metadata,
      lastProcessedAt: new Date().toISOString(),
    } satisfies AssetProcessingMetadata,
  };

  await prisma.asset.update({
    where: { id: assetId },
    data: { metadata: updatedMeta as object },
  });
}

/**
 * 处理单个资产：提取文本并分块入库
 */
export async function processAsset(
  assetId: string,
  tenantId: string,
  options?: { forceReprocess?: boolean }
): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  // 获取资产信息
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
  });

  if (!asset) {
    return { success: false, chunksCreated: 0, error: 'Asset not found' };
  }

  // 检查是否已处理（除非强制重新处理）
  if (!options?.forceReprocess) {
    const currentMeta = toObject(asset.metadata)?.processing as AssetProcessingMetadata | undefined;
    if (currentMeta?.status === 'ready') {
      return {
        success: true,
        chunksCreated: currentMeta.chunksCreated || 0,
        error: undefined,
      };
    }
  }

  // 设置状态为处理中
  await updateAssetMetadata(assetId, tenantId, {
    status: 'processing',
  });

  try {
    // 提取文本（带重试机制）
    const text = await extractTextFromAsset(asset.storageKey, asset.mimeType);

    if (!text || text.trim().length < 10) {
      throw new Error('Extracted text too short or empty');
    }

    // 分块
    const chunks = splitTextIntoChunks(text, {
      maxTokensPerChunk: 500,
      overlapTokens: 50,
    });

    // 清理旧 chunks
    await prisma.assetChunk.deleteMany({
      where: { assetId },
    });

    // 创建新 chunks
    const chunkCreations = chunks.map((chunk, index) =>
      prisma.assetChunk.create({
        data: {
          tenantId,
          assetId,
          content: chunk.content,
          chunkIndex: index,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          tokenCount: chunk.tokenCount,
        },
      })
    );

    await Promise.all(chunkCreations);

    // 更新状态为成功
    await updateAssetMetadata(assetId, tenantId, {
      status: 'ready',
      retryCount: 0,
      chunksCreated: chunks.length,
      textLength: text.length,
      lastError: undefined,
    });

    // 更新 Asset 状态
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'active' },
    });

    return {
      success: true,
      chunksCreated: chunks.length,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[processAsset] Failed for asset ${assetId}:`, errorMsg);

    // 获取当前重试次数并增加
    const currentMeta = toObject(asset.metadata)?.processing as AssetProcessingMetadata | undefined;
    const retryCount = (currentMeta?.retryCount || 0) + 1;

    // 更新状态为失败
    await updateAssetMetadata(assetId, tenantId, {
      status: 'failed',
      retryCount,
      lastError: errorMsg,
    });

    // 如果超过最大重试次数，更新 Asset 状态
    if (retryCount >= 3) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'active' }, // 保持 active 但标记失败
      });
    }

    return {
      success: false,
      chunksCreated: 0,
      error: errorMsg,
    };
  }
}

/**
 * 批量处理资产（用于队列或定时任务）
 */
export async function processPendingAssets(
  tenantId: string,
  limit = 10
): Promise<{ processed: number; succeeded: number; failed: number }> {
  // 获取待处理的资产（状态为 uploading 或 processing 超过一定时间的）
  const pendingAssets = await prisma.asset.findMany({
    where: {
      tenantId,
      status: { in: ['uploading', 'active'] },
    },
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;

  for (const asset of pendingAssets) {
    // 检查处理状态
    const meta = toObject(asset.metadata)?.processing as AssetProcessingMetadata | undefined;
    const processingStatus = meta?.status;

    // 跳过已完成的
    if (processingStatus === 'ready') {
      continue;
    }

    const result = await processAsset(asset.id, tenantId);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    // 批次间延迟
    if (pendingAssets.indexOf(asset) < pendingAssets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    processed: pendingAssets.length,
    succeeded,
    failed,
  };
}

/**
 * 获取资产处理状态摘要
 */
export async function getAssetProcessingSummary(
  tenantId: string
): Promise<{
  uploading: number;
  processing: number;
  ready: number;
  failed: number;
}> {
  const assets = await prisma.asset.findMany({
    where: {
      tenantId,
      deletedAt: null,
      fileCategory: 'document',
    },
    select: {
      status: true,
      metadata: true,
    },
  });

  const summary = {
    uploading: 0,
    processing: 0,
    ready: 0,
    failed: 0,
  };

  for (const asset of assets) {
    const meta = toObject(asset.metadata) as {
      processing?: AssetProcessingMetadata;
      chunksCreated?: number;
    };
    const processing = meta.processing;

    if (asset.status === 'uploading') {
      summary.uploading++;
    } else if (processing?.status === 'processing') {
      summary.processing++;
    } else if (processing?.status === 'ready' || (asset.status === 'active' && (meta.chunksCreated ?? 0) > 0)) {
      summary.ready++;
    } else if (processing?.status === 'failed') {
      summary.failed++;
    } else {
      // 默认分类
      if (asset.status === 'active') {
        summary.ready++;
      } else {
        summary.uploading++;
      }
    }
  }

  return summary;
}
