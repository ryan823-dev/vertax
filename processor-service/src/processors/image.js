import Tesseract from 'tesseract.js';
import sharp from 'sharp';

/**
 * 处理图片文件 - OCR 文字提取
 * @param {Buffer} fileBuffer 图片文件内容
 * @param {string} mimeType MIME 类型
 * @returns {object} { text, chunks }
 */
export async function processImage(fileBuffer, _mimeType) {
  // 预处理图片以提高 OCR 效果
  const processedBuffer = await preprocessImage(fileBuffer);

  // 执行 OCR
  const text = await performOCR(processedBuffer);

  if (!text || text.length < 5) {
    throw new Error('图片中未检测到有效文字');
  }

  // 清理文本
  const cleanedText = cleanText(text);

  // 分块
  const chunks = [{
    content: cleanedText,
    pageNumber: 1,
    charStart: 0,
    charEnd: cleanedText.length,
    tokenCount: estimateTokens(cleanedText),
  }];

  return { text: cleanedText, chunks };
}

/**
 * 图片预处理 - 优化 OCR 效果
 * @param {Buffer} buffer 原始图片
 * @returns {Buffer} 处理后的图片
 */
async function preprocessImage(buffer) {
  try {
    // 使用 sharp 进行图片预处理
    // 1. 转为灰度
    // 2. 增强对比度
    // 3. 调整大小（如果太大）
    const metadata = await sharp(buffer).metadata();
    
    let processed = sharp(buffer)
      .grayscale() // 灰度化
      .normalize(); // 标准化对比度

    // 如果图片太大，缩小以提高处理速度
    if (metadata.width > 2000 || metadata.height > 2000) {
      processed = processed.resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // 输出为 PNG 格式（Tesseract 对 PNG 支持最好）
    return processed.png().toBuffer();
  } catch (error) {
    // 如果预处理失败，返回原始图片
    console.warn('Image preprocessing failed, using original:', error.message);
    return buffer;
  }
}

/**
 * 执行 OCR
 * @param {Buffer} buffer 图片内容
 * @returns {string} 提取的文本
 */
async function performOCR(buffer) {
  try {
    // 使用 Tesseract.js 进行 OCR
    // 支持中文和英文
    const result = await Tesseract.recognize(buffer, 'chi_sim+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return result.data.text;
  } catch (error) {
    throw new Error(`OCR 处理失败: ${error.message}`);
  }
}

/**
 * 清理 OCR 文本
 * @param {string} text 原始文本
 * @returns {string} 清理后的文本
 */
function cleanText(text) {
  // 移除 OCR 产生的噪声
  text = text.replace(/\s+/g, ' ');
  // 移除乱码字符
  text = text.replace(/[^\u4e00-\u9fff\u0020-\u007E\n]/g, '');
  // 移除连续空行
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
