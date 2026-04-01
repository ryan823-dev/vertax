import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { splitTextIntoChunks } from "@/lib/utils/chunk-utils";

/**
 * AssemblyAI 音视频转录 API
 * POST /api/processing/assemblyai
 * 
 * 用于处理大文件（≥8MB）的音视频转录
 */

const ASSEMBLYAI_API = "https://api.assemblyai.com/v2";

export const maxDuration = 300; // 5 minutes

interface TranscribeRequest {
  assetId: string;
  audioUrl?: string; // 如果已有公开URL
  storageKey?: string; // OSS存储路径
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "AssemblyAI API key not configured",
        hint: "Add ASSEMBLYAI_API_KEY to environment variables"
      }, { status: 500 });
    }

    const body = await req.json() as TranscribeRequest;
    const { assetId, audioUrl, storageKey } = body;

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
          processor: "assemblyai",
        },
      },
    });

    // 获取文件URL（从OSS生成临时URL）
    let fileUrl = audioUrl;
    if (!fileUrl && storageKey) {
      const { generatePresignedGetUrl } = await import("@/lib/oss");
      fileUrl = await generatePresignedGetUrl(storageKey, 3600); // 1小时有效
    } else if (!fileUrl && asset.storageKey) {
      const { generatePresignedGetUrl } = await import("@/lib/oss");
      fileUrl = await generatePresignedGetUrl(asset.storageKey, 3600);
    }

    if (!fileUrl) {
      throw new Error("No file URL available");
    }

    // Step 1: 提交转录任务
    const submitRes = await fetch(`${ASSEMBLYAI_API}/transcript`, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: fileUrl,
        language_code: "zh", // 自动检测中文
        punctuate: true,
        format_text: true,
        speaker_labels: true, // 说话人识别
      }),
    });

    if (!submitRes.ok) {
      const error = await submitRes.text();
      throw new Error(`AssemblyAI submit failed: ${error}`);
    }

    const submitData = await submitRes.json();
    const transcriptId = submitData.id;

    // Step 2: 轮询等待完成
    let transcript: AssemblyAITranscript | null = null;
    const maxAttempts = 60; // 最多等待5分钟
    const pollInterval = 5000; // 5秒轮询一次

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollRes = await fetch(`${ASSEMBLYAI_API}/transcript/${transcriptId}`, {
        headers: { "Authorization": apiKey },
      });

      if (!pollRes.ok) {
        throw new Error(`AssemblyAI poll failed: ${await pollRes.text()}`);
      }

      transcript = await pollRes.json();

      if (transcript.status === "completed") {
        break;
      } else if (transcript.status === "error") {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }
    }

    if (!transcript || transcript.status !== "completed") {
      throw new Error("Transcription timeout");
    }

    // Step 3: 保存结果
    const text = transcript.text || "";
    
    if (!text || text.length < 10) {
      throw new Error("转录结果为空或过少");
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
          processor: "assemblyai",
          transcriptId,
          audioDuration: transcript.audio_duration,
        },
      },
    });

    return NextResponse.json({
      success: true,
      assetId,
      textLength: text.length,
      chunkCount: chunks.length,
      audioDuration: transcript.audio_duration,
    });

  } catch (error) {
    console.error("[AssemblyAI] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// AssemblyAI 响应类型
interface AssemblyAITranscript {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  error?: string;
  audio_duration?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
}