/**
 * 文本提取工具
 *
 * 从不同格式的文件中提取纯文本内容。
 * 被 knowledge.ts 和 assets.ts 的处理逻辑共同调用。
 * 扫描件 PDF（无文字层）自动走 DashScope qwen-long OCR 通道。
 */

import { generatePresignedGetUrl } from "@/lib/oss";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

// Office 格式 MIME 类型
const OFFICE_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.ms-powerpoint", // ppt
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",   // docx
  "application/msword",            // doc
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",         // xlsx
  "application/vnd.ms-excel",      // xls
]);

// ==================== DashScope OCR ====================

/**
 * 上传文件到 DashScope Files API，返回 file_id
 */
async function uploadToDashScope(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY not configured");

  const formData = new FormData();
  // Convert Buffer to Uint8Array to avoid SharedArrayBuffer type issues
  const uint8 = new Uint8Array(buffer);
  formData.append(
    "file",
    new Blob([uint8], { type: "application/pdf" }),
    filename
  );
  formData.append("purpose", "file-extract");

  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/files",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    }
  );

  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || !data.id) {
    throw new Error(
      `DashScope file upload failed: ${data.error?.message ?? res.statusText}`
    );
  }
  return data.id;
}

/**
 * 使用 qwen-long 对上传的文件进行 OCR / 文本提取
 */
async function extractWithQwenLong(fileId: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY not configured");

  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-long",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "system", content: `fileid://${fileId}` },
          {
            role: "user",
            content:
              "请提取这个文档中的所有文字内容，保留原始结构，只输出文字内容，不要添加任何解释或说明。",
          },
        ],
        max_tokens: 8000,
      }),
    }
  );

  const data = (await res.json()) as {
    choices?: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (!res.ok || data.error) {
    throw new Error(
      `qwen-long OCR failed: ${data.error?.message ?? res.statusText}`
    );
  }

  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * 扫描件 PDF OCR：上传 → qwen-long 提取
 */
async function ocrScannedPdf(buffer: Buffer): Promise<string> {
  const fileId = await uploadToDashScope(buffer, "document.pdf");
  const text = await extractWithQwenLong(fileId);
  return text;
}

// ==================== 主函数 ====================

/**
 * 从 OSS 存储的文件中提取文本
 */
export async function extractTextFromAsset(
  storageKey: string,
  mimeType: string
): Promise<string> {
  // 生成临时下载 URL
  const url = await generatePresignedGetUrl(storageKey, 600);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  // 纯文本类文件直接读取
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "text/markdown"
  ) {
    return await response.text();
  }

  // PDF
  if (mimeType === "application/pdf") {
    const buffer = Buffer.from(await response.arrayBuffer());

    // 先用 pdf-parse 尝试提取文字层
    let pdfText = "";
    try {
      const pdfModule = (await import("pdf-parse")) as unknown as {
        default?: (buffer: Buffer) => Promise<{ text: string }>;
      };
      const pdfParse =
        pdfModule.default ||
        (pdfModule as unknown as (
          buffer: Buffer
        ) => Promise<{ text: string }>);
      const data = await pdfParse(buffer);
      pdfText = data.text?.trim() ?? "";
    } catch (error) {
      console.warn("[text-extract] pdf-parse error:", error);
    }

    // 文字层内容充足 → 直接返回
    if (pdfText.length >= 50) {
      return pdfText;
    }

    // 文字层内容过少（扫描件）→ 走 qwen-long OCR
    console.log(
      `[text-extract] PDF text too short (${pdfText.length} chars), trying qwen-long OCR...`
    );
    try {
      const ocrText = await ocrScannedPdf(buffer);
      if (ocrText && ocrText.length >= 20) {
        return ocrText;
      }
    } catch (ocrError) {
      console.warn("[text-extract] qwen-long OCR failed:", ocrError);
    }

    return `[扫描件PDF: OCR提取失败，请使用含文字层的PDF]`;
  }

  // Office 格式：PPTX / PPT / DOCX / DOC / XLSX / XLS
  if (OFFICE_MIME_TYPES.has(mimeType)) {
    try {
      const buffer = Buffer.from(await response.arrayBuffer());
      // officeparser requires a file path to handle large ZIP-based formats correctly
      const ext = mimeType.includes("presentation") ? "pptx"
        : mimeType.includes("spreadsheet") ? "xlsx"
        : mimeType.includes("word") || mimeType === "application/msword" ? "docx"
        : "office";
      const tmpFile = join(tmpdir(), `office_${randomUUID()}.${ext}`);
      writeFileSync(tmpFile, buffer);
      let text = "";
      try {
        const { parseOffice } = (await import("officeparser")) as unknown as {
          parseOffice: (
            file: string,
            config?: Record<string, unknown>
          ) => Promise<{ toText?: () => string } | string>;
        };
        const result = await parseOffice(tmpFile, {
          outputErrorToConsole: false,
          newlineDelimiter: "\n",
          ignoreNotes: false,
        });
        text = typeof result === "string"
          ? result
          : typeof (result as { toText?: () => string }).toText === "function"
          ? (result as { toText: () => string }).toText()
          : String(result);
      } finally {
        try { unlinkSync(tmpFile); } catch { /* ignore */ }
      }
      if (!text || text.trim().length < 5) {
        return `[Office文件: 文本内容为空或过少]`;
      }
      return text;
    } catch (error) {
      console.warn("Office parsing failed:", error);
      return `[Office文件: 文本提取失败]`;
    }
  }

  // 其他格式暂不支持
  return `[${mimeType}: 暂不支持文本提取]`;
}
