/**
 * 浏览器端文件处理模块
 *
 * 在客户端处理小文件（< 8MB），避免服务器压力
 * 支持：PDF、Word、纯文本
 */

// 文件大小阈值（8MB）
export const BROWSER_PROCESS_THRESHOLD_MB = 8;
export const BROWSER_PROCESS_THRESHOLD_BYTES = 8 * 1024 * 1024;

export interface ProcessResult {
  text: string;
  pageCount?: number;
  wordCount: number;
  processor: 'browser' | 'server';
}

export interface ProcessProgress {
  stage: 'reading' | 'processing' | 'chunking' | 'done';
  progress: number; // 0-100
  message: string;
}

type ProgressCallback = (progress: ProcessProgress) => void;

/**
 * 检查文件是否应该在浏览器端处理
 */
export function shouldProcessInBrowser(file: File): boolean {
  return file.size < BROWSER_PROCESS_THRESHOLD_BYTES;
}

/**
 * 获取支持的文件类型
 */
export function getSupportedBrowserTypes(): string[] {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'text/plain',
    'text/markdown',
    'text/csv',
  ];
}

/**
 * 检查文件类型是否支持浏览器端处理
 */
export function isSupportedBrowserType(mimeType: string): boolean {
  return getSupportedBrowserTypes().includes(mimeType);
}

/**
 * 主处理入口
 */
export async function processFileInBrowser(
  file: File,
  onProgress?: ProgressCallback
): Promise<ProcessResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  onProgress?.({ stage: 'reading', progress: 10, message: '读取文件中...' });

  let text = '';
  let pageCount: number | undefined;

  try {
    if (file.type === 'application/pdf' || ext === 'pdf') {
      const result = await processPdf(file, onProgress);
      text = result.text;
      pageCount = result.pageCount;
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword' ||
      ext === 'docx' ||
      ext === 'doc'
    ) {
      text = await processDocx(file, onProgress);
    } else if (file.type.startsWith('text/') || ext === 'txt' || ext === 'md' || ext === 'csv') {
      text = await processText(file);
    } else {
      throw new Error(`不支持的文件类型: ${file.type}`);
    }

    onProgress?.({ stage: 'done', progress: 100, message: '处理完成' });

    return {
      text,
      pageCount,
      wordCount: text.length,
      processor: 'browser',
    };
  } catch (error) {
    console.error('[browser-processor] Error:', error);
    throw error;
  }
}

/**
 * PDF 处理（使用 PDF.js）
 */
async function processPdf(
  file: File,
  onProgress?: ProgressCallback
): Promise<{ text: string; pageCount: number }> {
  // 动态导入 PDF.js
  const pdfjsLib = await import('pdfjs-dist');

  // 设置 worker（使用 CDN 避免打包问题）
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({ stage: 'processing', progress: 20, message: '解析 PDF...' });

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  let text = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    text += pageText + '\n\n';

    const progress = 20 + Math.floor((i / numPages) * 70);
    onProgress?.({
      stage: 'processing',
      progress,
      message: `处理 PDF: ${i}/${numPages} 页`,
    });
  }

  return { text: text.trim(), pageCount: numPages };
}

/**
 * Word 文档处理（使用 Mammoth）
 */
async function processDocx(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  const mammoth = await import('mammoth');

  onProgress?.({ stage: 'processing', progress: 30, message: '解析 Word 文档...' });

  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({ stage: 'processing', progress: 50, message: '提取文本...' });

  const result = await mammoth.extractRawText({ arrayBuffer });

  onProgress?.({ stage: 'processing', progress: 90, message: '处理完成...' });

  return result.value;
}

/**
 * 纯文本处理
 */
async function processText(file: File): Promise<string> {
  return await file.text();
}

/**
 * 文本分块（与服务器端逻辑一致）
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Array<{
  content: string;
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  tokenCount?: number;
}> {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks: Array<{
    content: string;
    chunkIndex: number;
    charStart: number;
    charEnd: number;
    tokenCount?: number;
  }> = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkText = text.slice(start, end);

    // 尝试在句子边界处分割
    if (end < text.length) {
      const lastPeriod = Math.max(
        chunkText.lastIndexOf('。'),
        chunkText.lastIndexOf('！'),
        chunkText.lastIndexOf('？'),
        chunkText.lastIndexOf('.'),
        chunkText.lastIndexOf('!'),
        chunkText.lastIndexOf('?'),
        chunkText.lastIndexOf('\n')
      );

      if (lastPeriod > chunkSize * 0.5) {
        chunkText = chunkText.slice(0, lastPeriod + 1);
      }
    }

    chunks.push({
      content: chunkText.trim(),
      chunkIndex,
      charStart: start,
      charEnd: start + chunkText.length,
      tokenCount: Math.ceil(chunkText.length / 4), // 粗略估算
    });

    start += chunkText.length - overlap;
    chunkIndex++;

    // 防止无限循环
    if (start <= chunks[chunks.length - 1].charStart) {
      start = chunks[chunks.length - 1].charEnd;
    }
  }

  return chunks;
}