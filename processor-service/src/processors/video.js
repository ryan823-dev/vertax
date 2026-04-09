import sharp from 'sharp';
import Tesseract from 'tesseract.js';

/**
 * 视频处理配置
 */
const _FRAME_INTERVAL = 5; // 每 5 秒提取一帧
const _MAX_FRAMES = 20; // 最多提取 20 帧
const MIN_TEXT_LENGTH = 10; // 最小有效文本长度

/**
 * 处理视频文件 - 提取关键帧并进行 OCR
 * 注意：由于纯 Node.js 环境下视频解码困难，
 * 这个处理器主要用于接收预提取的帧或使用外部工具
 * 
 * @param {Buffer} fileBuffer 视频文件内容
 * @param {string} mimeType MIME 类型
 * @returns {object} { text, chunks }
 */
export async function processVideo(_fileBuffer, _mimeType) {
  // 视频处理需要特殊处理
  // Railway 环境下没有 ffmpeg，所以有两种方案：
  // 1. 调用外部 API 处理视频帧提取
  // 2. 使用 OSS 视频截图功能
  
  // 方案：使用 OSS 视频截图 API 获取多个关键帧
  // 但这需要在主应用端预先生成截图 URL
  // 这里我们抛出一个提示，建议使用其他方式
  
  throw new Error(
    '视频处理建议方案：\n' +
    '1. 使用 OSS 视频截图 API 提取关键帧（主应用端操作）\n' +
    '2. 将提取的帧作为图片发送到此微服务进行 OCR\n' +
    '3. 或者使用 DashScope paraformer-v2 进行语音识别\n' +
    '当前微服务不支持直接视频解码'
  );
}

/**
 * 处理视频帧图片（由主应用提取后发送）
 * @param {Array<Buffer>} frames 视频帧图片数组
 * @returns {object} { text, chunks }
 */
export async function processVideoFrames(frames) {
  if (!frames || frames.length === 0) {
    throw new Error('没有提供视频帧');
  }

  const allTexts = [];
  
  for (let i = 0; i < frames.length; i++) {
    try {
      // 预处理帧图片
      const processedFrame = await preprocessImage(frames[i]);
      
      // OCR 提取文字
      const text = await performOCR(processedFrame);
      
      if (text && text.length >= MIN_TEXT_LENGTH) {
        allTexts.push({
          frameIndex: i,
          text: cleanText(text),
        });
      }
    } catch (error) {
      console.warn(`Frame ${i} OCR failed:`, error.message);
    }
  }

  if (allTexts.length === 0) {
    throw new Error('视频帧中未检测到有效文字');
  }

  // 合并所有帧的文字
  const combinedText = allTexts
    .map((item, index) => `[帧${index + 1}]\n${item.text}`)
    .join('\n\n');

  // 分块处理
  const chunks = allTexts.map((item, index) => ({
    content: item.text,
    pageNumber: index + 1,
    charStart: 0,
    charEnd: item.text.length,
    tokenCount: estimateTokens(item.text),
  }));

  return { text: combinedText, chunks };
}

/**
 * 图片预处理
 * @param {Buffer} buffer 图片内容
 * @returns {Buffer} 处理后的图片
 */
async function preprocessImage(buffer) {
  try {
    return await sharp(buffer)
      .grayscale()
      .normalize()
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * 执行 OCR
 * @param {Buffer} buffer 图片内容
 * @returns {string} 提取的文本
 */
async function performOCR(buffer) {
  const result = await Tesseract.recognize(buffer, 'chi_sim+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  return result.data.text;
}

/**
 * 清理文本
 * @param {string} text 原始文本
 * @returns {string} 清理后的文本
 */
function cleanText(text) {
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/[^\u4e00-\u9fff\u0020-\u007E\n]/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * 估算 token 数量
 * @param {string} text 文本
 * @returns {number} token 估算值
 */
function estimateTokens(text) {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

// 导出帧处理函数供外部调用
export { processVideoFrames };
