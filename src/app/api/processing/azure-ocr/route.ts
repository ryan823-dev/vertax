import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { splitTextIntoChunks } from "@/lib/utils/chunk-utils";

/**
 * Azure Document Intelligence API
 * POST /api/processing/azure-ocr
 * 
 * 用于处理大文件（≥8MB）的文档OCR
 */

export const maxDuration = 300; // 5 minutes

interface AzureOCRRequest {
  assetId: string;
  documentUrl?: string;
  storageKey?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!endpoint || !apiKey) {
      return NextResponse.json({ 
        error: "Azure Document Intelligence not configured",
        hint: "Add AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY to environment variables"
      }, { status: 500 });
    }

    const body = await req.json() as AzureOCRRequest;
    const { assetId, documentUrl, storageKey } = body;

    if (!assetId) {
      return NextResponse.json({ error: "Missing assetId" }, { status: 400 });
    }

    // 验证资产所有权
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        tenantId: session.user.tenantId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // 更新状态为处理中
    await db.asset.update({
      where: { id: assetId },
      data: {
        metadata: {
          processingStatus: "processing",
          processor: "azure-ocr",
        },
      },
    });

    // 获取文件URL
    let fileUrl = documentUrl;
    if (!fileUrl && (storageKey || asset.storageKey)) {
      const { generatePresignedGetUrl } = await import("@/lib/oss");
      fileUrl = await generatePresignedGetUrl(storageKey || asset.storageKey, 3600);
    }

    if (!fileUrl) {
      throw new Error("No file URL available");
    }

    // Step 1: 提交分析任务
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-02-29-preview`;
    
    const analyzeRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urlSource: fileUrl,
      }),
    });

    if (!analyzeRes.ok) {
      const error = await analyzeRes.text();
      throw new Error(`Azure analyze failed: ${error}`);
    }

    // 获取轮询URL
    const operationLocation = analyzeRes.headers.get("Operation-Location");
    if (!operationLocation) {
      throw new Error("No Operation-Location header in response");
    }

    // Step 2: 轮询等待完成
    let result: AzureAnalyzeResult | null = null;
    const maxAttempts = 60;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollRes = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
      });

      if (!pollRes.ok) {
        throw new Error(`Azure poll failed: ${await pollRes.text()}`);
      }

      const pollData = await pollRes.json();
      
      if (pollData.status === "succeeded") {
        result = pollData.analyzeResult;
        break;
      } else if (pollData.status === "failed") {
        throw new Error(`Azure analysis failed: ${JSON.stringify(pollData.error)}`);
      }
    }

    if (!result) {
      throw new Error("Azure analysis timeout");
    }

    // Step 3: 提取文本
    let text = "";
    
    if (result.content) {
      text = result.content;
    } else if (result.pages) {
      text = result.pages
        .map((page) => page.lines?.map((line) => line.content).join("\n") || "")
        .join("\n\n");
    }

    if (!text || text.length < 10) {
      throw new Error("OCR结果为空或过少");
    }

    const chunks = splitTextIntoChunks(text);

    // 删除旧的 chunks
    await db.assetChunk.deleteMany({
      where: { assetId },
    });

    // 写入新的 chunks
    if (chunks.length > 0) {
      const CHUNK_BATCH_SIZE = 100;
      for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
        const batch = chunks.slice(i, i + CHUNK_BATCH_SIZE);
        await db.assetChunk.createMany({
          data: batch.map((chunk) => ({
            tenantId: session.user.tenantId,
            assetId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            charStart: chunk.charStart,
            charEnd: chunk.charEnd,
            tokenCount: chunk.tokenCount,
          })),
        });
      }
    }

    // 更新资产状态
    const completedAt = new Date().toISOString();
    await db.asset.update({
      where: { id: assetId },
      data: {
        metadata: {
          processingStatus: "ready",
          chunkCount: chunks.length,
          processedAt: completedAt,
          textLength: text.length,
          processor: "azure-ocr",
          pageCount: result.pages?.length || 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      assetId,
      textLength: text.length,
      chunkCount: chunks.length,
      pageCount: result.pages?.length || 0,
    });

  } catch (error) {
    console.error("[Azure OCR] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Azure 响应类型
interface AzureAnalyzeResult {
  apiVersion: string;
  modelId: string;
  stringIndexType: string;
  content?: string;
  pages?: Array<{
    pageNumber: number;
    lines?: Array<{
      content: string;
    }>;
  }>;
}
