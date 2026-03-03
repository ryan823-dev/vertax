/**
 * 文本提取工具
 *
 * 从不同格式的文件中提取纯文本内容。
 * 被 knowledge.ts 和 assets.ts 的处理逻辑共同调用。
 */

import { generatePresignedGetUrl } from "@/lib/oss";

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
    try {
      const buffer = Buffer.from(await response.arrayBuffer());
      const pdfModule = (await import("pdf-parse")) as unknown as {
        default?: (buffer: Buffer) => Promise<{ text: string }>;
      };
      const pdfParse =
        pdfModule.default ||
        (pdfModule as unknown as (
          buffer: Buffer
        ) => Promise<{ text: string }>);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.warn("PDF parsing failed, skipping:", error);
      return `[PDF文件: 文本提取失败]`;
    }
  }

  // 其他格式暂不支持
  return `[${mimeType}: 暂不支持文本提取]`;
}
