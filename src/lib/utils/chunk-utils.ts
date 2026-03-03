/**
 * 文本分块工具
 *
 * 将长文本按照 token 估算切割为多个 chunk，
 * 用于知识引擎的文本索引和证据提取。
 */

export interface ChunkOptions {
  /** 每块最大 token 数（默认 500） */
  maxTokensPerChunk?: number;
  /** 块间重叠 token 数（默认 50） */
  overlapTokens?: number;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  tokenCount: number;
}

/**
 * 简单 token 估算：中文字符按 1.5 token，英文单词按 1 token
 */
export function estimateTokenCount(text: string): number {
  let tokens = 0;
  // 中文字符
  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  if (chineseChars) {
    tokens += chineseChars.length * 1.5;
  }
  // 非中文部分按空格分词
  const nonChinese = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  const words = nonChinese.split(/\s+/).filter(w => w.length > 0);
  tokens += words.length;
  return Math.ceil(tokens);
}

/**
 * 估算给定 token 数对应的大致字符数
 */
function estimateCharsForTokens(text: string, targetTokens: number): number {
  const totalTokens = estimateTokenCount(text);
  if (totalTokens === 0) return text.length;
  const ratio = text.length / totalTokens;
  return Math.ceil(targetTokens * ratio);
}

/**
 * 将文本分割为多个 chunk
 *
 * 策略：
 * 1. 按段落（双换行）切分为自然段
 * 2. 累积自然段直到接近 maxTokensPerChunk
 * 3. 超出时按句号/句终符切分
 * 4. 相邻块之间保留 overlapTokens 重叠
 */
export function splitTextIntoChunks(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const { maxTokensPerChunk = 500, overlapTokens = 50 } = options;

  if (!text || text.trim().length === 0) return [];

  const totalTokens = estimateTokenCount(text);
  // 如果总 token 不超过上限，直接返回单块
  if (totalTokens <= maxTokensPerChunk) {
    return [{
      content: text.trim(),
      chunkIndex: 0,
      charStart: 0,
      charEnd: text.length,
      tokenCount: totalTokens,
    }];
  }

  const chunks: TextChunk[] = [];
  const approxCharsPerChunk = estimateCharsForTokens(text, maxTokensPerChunk);
  const approxOverlapChars = estimateCharsForTokens(text, overlapTokens);

  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < text.length) {
    let end = Math.min(cursor + approxCharsPerChunk, text.length);

    // 尝试在句末断开（查找最近的句号、问号、感叹号、换行）
    if (end < text.length) {
      const searchRegion = text.substring(
        Math.max(end - 200, cursor),
        Math.min(end + 100, text.length)
      );
      const sentenceEnds = /[。！？.!?\n]/g;
      let lastMatch: RegExpExecArray | null = null;
      let match: RegExpExecArray | null;
      while ((match = sentenceEnds.exec(searchRegion)) !== null) {
        const absPos = Math.max(end - 200, cursor) + match.index + 1;
        if (absPos > cursor + approxCharsPerChunk * 0.5 && absPos <= end + 100) {
          lastMatch = match;
        }
      }
      if (lastMatch) {
        end = Math.max(end - 200, cursor) + lastMatch.index + 1;
      }
    }

    const chunkText = text.substring(cursor, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        content: chunkText,
        chunkIndex,
        charStart: cursor,
        charEnd: end,
        tokenCount: estimateTokenCount(chunkText),
      });
      chunkIndex++;
    }

    // 下一块起始位置 = 当前结束位置 - 重叠字符数
    const nextCursor = end - approxOverlapChars;
    cursor = nextCursor <= cursor ? end : nextCursor;
  }

  return chunks;
}
