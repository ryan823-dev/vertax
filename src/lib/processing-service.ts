/**
 * 统一文档处理服务
 * 
 * 根据文件类型和大小选择合适的处理方式：
 * - 小文件 (<8MB): 浏览器端处理
 * - 大文件音视频: AssemblyAI
 * - 大文件文档: Azure Document Intelligence
 * - 其他: 服务端本地处理
 */

export type ProcessorType = 'browser' | 'assemblyai' | 'azure-ocr' | 'server';

export interface ProcessingDecision {
  processor: ProcessorType;
  reason: string;
  apiEndpoint?: string;
}

// 文件大小阈值
const BROWSER_THRESHOLD_BYTES = 8 * 1024 * 1024; // 8MB

// 支持浏览器端处理的 MIME 类型
const BROWSER_SUPPORTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

// 音视频 MIME 类型（AssemblyAI）
const AUDIO_VIDEO_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
  'audio/aac', 'audio/flac', 'audio/x-m4a',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'video/x-msvideo', 'video/x-ms-wmv',
]);

// 文档 MIME 类型（Azure OCR）
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/**
 * 决定使用哪个处理器
 */
export function decideProcessor(
  fileSize: number,
  mimeType: string
): ProcessingDecision {
  const isSmall = fileSize < BROWSER_THRESHOLD_BYTES;
  const isAudioVideo = AUDIO_VIDEO_TYPES.has(mimeType);
  const isDocument = DOCUMENT_TYPES.has(mimeType);
  const isBrowserSupported = BROWSER_SUPPORTED_TYPES.has(mimeType);

  // 小文件 + 浏览器支持 → 浏览器端处理
  if (isSmall && isBrowserSupported) {
    return {
      processor: 'browser',
      reason: '小文件，浏览器端处理（更快）',
    };
  }

  // 音视频文件 → AssemblyAI
  if (isAudioVideo) {
    const hasApiKey = !!process.env.ASSEMBLYAI_API_KEY;
    if (hasApiKey) {
      return {
        processor: 'assemblyai',
        reason: '音视频文件，使用 AssemblyAI 转录',
        apiEndpoint: '/api/processing/assemblyai',
      };
    }
    // 没有 API Key，回退到服务端处理
    return {
      processor: 'server',
      reason: 'AssemblyAI 未配置，使用服务端处理',
    };
  }

  // 大文件文档 → Azure OCR
  if (!isSmall && isDocument) {
    const hasAzure = !!(
      process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
      process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
    );
    if (hasAzure) {
      return {
        processor: 'azure-ocr',
        reason: '大文件文档，使用 Azure OCR',
        apiEndpoint: '/api/processing/azure-ocr',
      };
    }
    // 没有 Azure，尝试服务端处理
    return {
      processor: 'server',
      reason: 'Azure OCR 未配置，使用服务端处理',
    };
  }

  // 默认：服务端处理
  return {
    processor: 'server',
    reason: '使用服务端处理',
  };
}

/**
 * 获取处理状态说明
 */
export function getProcessingDescription(decision: ProcessingDecision): string {
  switch (decision.processor) {
    case 'browser':
      return '本地处理中...';
    case 'assemblyai':
      return 'AI 转录中（AssemblyAI）...';
    case 'azure-ocr':
      return '云端 OCR 处理中（Azure）...';
    case 'server':
      return '服务器处理中...';
    default:
      return '处理中...';
  }
}

/**
 * 检查第三方 API 配置状态
 */
export function checkAPIConfiguration(): {
  assemblyai: { configured: boolean; reason?: string };
  azure: { configured: boolean; reason?: string };
} {
  return {
    assemblyai: {
      configured: !!process.env.ASSEMBLYAI_API_KEY,
      reason: process.env.ASSEMBLYAI_API_KEY 
        ? undefined 
        : '未设置 ASSEMBLYAI_API_KEY',
    },
    azure: {
      configured: !!(
        process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
        process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
      ),
      reason: !process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
        ? '未设置 AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
        : !process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
        ? '未设置 AZURE_DOCUMENT_INTELLIGENCE_KEY'
        : undefined,
    },
  };
}