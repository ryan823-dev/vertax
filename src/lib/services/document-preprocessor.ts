/**
 * 文档预处理服务
 *
 * 用于批量处理文档，在存储前进行预处理：
 * 1. 提取结构化摘要
 * 2. 生成文档摘要
 * 3. 提取关键实体
 * 4. 创建轻量级索引
 *
 * 目的：减少后续 AI 调用的 token 消耗
 */

import { db } from "@/lib/db";
import {
  extractTextFromAsset,
} from "@/lib/utils/text-extract";

// ==================== 类型定义 ====================

export interface DocumentSummary {
  title: string;
  documentType: string;
  mainTopics: string[];
  keyEntities: {
    companies: string[];
    people: string[];
    products: string[];
    locations: string[];
  };
  summary: string;
  wordCount: number;
  confidence: number;
}

export interface PreprocessResult {
  assetId: string;
  success: boolean;
  summary?: DocumentSummary;
  chunksCreated: number;
  tokensSaved: number;
  error?: string;
}

export interface BatchPreprocessStats {
  total: number;
  success: number;
  failed: number;
  totalTokensSaved: number;
  results: PreprocessResult[];
}

// ==================== 提示词 ====================

const SUMMARY_PROMPT = `分析这个文档，提取以下信息并输出JSON格式：

{
  "title": "文档标题",
  "documentType": "文档类型（如：产品手册、技术方案、公司介绍、案例研究、合同等）",
  "mainTopics": ["主题1", "主题2", "主题3"],
  "keyEntities": {
    "companies": ["提及的公司"],
    "people": ["提及的人物"],
    "products": ["提及的产品"],
    "locations": ["提及的地点"]
  },
  "summary": "文档摘要（100-200字）"
}

只输出JSON，不要其他文字。`;

const CHUNK_SUMMARY_PROMPT = `为这段文档片段生成简洁的摘要（50字以内），用于检索索引。只输出摘要文字，不要其他内容。`;

// ==================== 核心函数 ====================

/**
 * 生成文档摘要
 */
async function generateDocumentSummary(text: string): Promise<DocumentSummary | null> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY not configured");
  }

  // 限制输入长度
  const truncatedText = text.length > 50000
    ? text.slice(0, 50000) + "\n...(内容已截断)"
    : text;

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            { role: "system", content: "你是一个专业的文档分析助手。" },
            { role: "user", content: `${SUMMARY_PROMPT}\n\n## 文档内容\n${truncatedText}` },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // 清理 markdown 包裹
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(content);

    return {
      title: parsed.title || "未命名文档",
      documentType: parsed.documentType || "未知类型",
      mainTopics: parsed.mainTopics || [],
      keyEntities: parsed.keyEntities || {
        companies: [],
        people: [],
        products: [],
        locations: [],
      },
      summary: parsed.summary || "",
      wordCount: text.length,
      confidence: 0.8,
    };
  } catch (error) {
    console.error("[generateDocumentSummary] error:", error);
    return null;
  }
}

/**
 * 为文档分块生成摘要
 */
async function _generateChunkSummary(chunkText: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return "";

  // 只处理有意义的文本
  if (chunkText.length < 50) return chunkText.slice(0, 50);

  // 对长文本截断
  const truncated = chunkText.length > 2000 ? chunkText.slice(0, 2000) : chunkText;

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-turbo", // 使用更快的模型
          messages: [
            { role: "user", content: `${CHUNK_SUMMARY_PROMPT}\n\n${truncated}` },
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      }
    );

    if (!response.ok) return "";

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.warn('[summarizeContent] OpenAI call failed:', error);
    return "";
  }
}

/**
 * 预处理单个素材
 */
export async function preprocessAsset(
  assetId: string,
  tenantId: string,
  options?: {
    generateSummary?: boolean;
    enhanceChunks?: boolean;
  }
): Promise<PreprocessResult> {
  const result: PreprocessResult = {
    assetId,
    success: false,
    chunksCreated: 0,
    tokensSaved: 0,
  };

  try {
    // 获取素材信息
    const asset = await db.asset.findFirst({
      where: { id: assetId, tenantId, deletedAt: null },
      select: {
        id: true,
        originalName: true,
        storageKey: true,
        mimeType: true,
        metadata: true,
      },
    });

    if (!asset) {
      result.error = "素材不存在";
      return result;
    }

    // 检查是否已处理
    const metadata = asset.metadata as Record<string, unknown> || {};
    if (metadata.preprocessed) {
      result.success = true;
      result.error = "已预处理过";
      return result;
    }

    // 提取文本
    const text = await extractTextFromAsset(asset.storageKey, asset.mimeType);

    if (!text || text.startsWith("[")) {
      result.error = "文本提取失败";
      return result;
    }

    // 计算节省的 token（原始文本 vs 摘要）
    const originalTokens = Math.ceil(text.length / 2);

    // 生成文档摘要
    if (options?.generateSummary !== false) {
      const summary = await generateDocumentSummary(text);

      if (summary) {
        // 更新素材元数据
        await db.asset.update({
          where: { id: assetId },
          data: {
            metadata: JSON.parse(JSON.stringify({
              ...metadata,
              summary,
              preprocessed: true,
              preprocessedAt: new Date().toISOString(),
            })),
          },
        });

        // 摘要的 token 数
        const summaryTokens = Math.ceil(
          (summary.summary.length +
            JSON.stringify(summary.keyEntities).length +
            summary.mainTopics.join().length) / 2
        );
        result.tokensSaved = originalTokens - summaryTokens;
        result.summary = summary;
      }
    }

    // 增强分块摘要
    if (options?.enhanceChunks) {
      const chunks = await db.assetChunk.findMany({
        where: { assetId, tenantId },
        select: { id: true, content: true },
      });

      // 注：AssetChunk 模型没有 metadata 字段，跳过分块摘要增强
      // 如需此功能，需要先修改 schema.prisma 添加 metadata 字段
      result.chunksCreated = chunks.length;
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "预处理失败";
  }

  return result;
}

/**
 * 批量预处理素材
 */
export async function batchPreprocessAssets(
  assetIds: string[],
  tenantId: string,
  options?: {
    generateSummary?: boolean;
    enhanceChunks?: boolean;
  }
): Promise<BatchPreprocessStats> {
  const stats: BatchPreprocessStats = {
    total: assetIds.length,
    success: 0,
    failed: 0,
    totalTokensSaved: 0,
    results: [],
  };

  // 串行处理，避免 API 限流
  for (const assetId of assetIds) {
    const result = await preprocessAsset(assetId, tenantId, options);
    stats.results.push(result);

    if (result.success) {
      stats.success++;
      stats.totalTokensSaved += result.tokensSaved;
    } else {
      stats.failed++;
    }

    // 添加延迟避免限流
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return stats;
}

/**
 * 预处理租户所有未处理的素材
 */
export async function preprocessAllAssets(
  tenantId: string,
  options?: {
    limit?: number;
  }
): Promise<BatchPreprocessStats> {
  // 获取所有文档素材，在内存中过滤
  const assets = await db.asset.findMany({
    where: {
      tenantId,
      deletedAt: null,
      fileCategory: "document",
      status: "active",
    },
    select: { id: true, metadata: true },
    take: options?.limit || 50,
  });

  // 过滤出未预处理的素材
  const unprocessedAssetIds = assets
    .filter((a) => {
      const meta = a.metadata as Record<string, unknown> | null;
      return !meta?.preprocessed;
    })
    .map((a) => a.id);

  return batchPreprocessAssets(unprocessedAssetIds, tenantId, {
    generateSummary: true,
    enhanceChunks: false,
  });
}

// ==================== 定时任务支持 ====================

/**
 * 检查并处理待预处理的素材
 * 可由 cron job 调用
 */
export async function processPendingAssets(): Promise<{
  processed: number;
  errors: number;
}> {
  // 获取所有需要预处理的素材（跨租户），在内存中过滤
  const allAssets = await db.asset.findMany({
    where: {
      deletedAt: null,
      fileCategory: "document",
      status: "active",
    },
    select: { id: true, tenantId: true, metadata: true },
    take: 100,
  });

  // 过滤出未预处理的素材
  const pendingAssets = allAssets.filter((a) => {
    const meta = a.metadata as Record<string, unknown> | null;
    return !meta?.preprocessed;
  });

  let processed = 0;
  let errors = 0;

  for (const asset of pendingAssets) {
    const result = await preprocessAsset(asset.id, asset.tenantId);
    if (result.success) {
      processed++;
    } else {
      errors++;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return { processed, errors };
}
