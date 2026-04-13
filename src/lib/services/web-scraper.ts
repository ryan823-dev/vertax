/**
 * 通用网页正文提取服务
 *
 * 三级降级策略：
 * 1. Jina Reader - 速度快，格式干净，免费额度 200 次/天
 * 2. 自建 Scraping（cheerio + html2text）- 无限制，支持反爬平台
 * 3. 静态抓取 - 简单页面兜底
 *
 * 支持平台：
 * - 微信公众号 ✅
 * - 知乎专栏 ✅
 * - 掘金 ✅
 * - CSDN ✅
 * - 政府采购网站 ✅
 * - 一般网站 ✅
 */

import * as cheerio from 'cheerio';
import { resolveApiKey } from '@/lib/services/api-key-resolver';

// ==================== 类型定义 ====================

export interface ScrapedContent {
  success: boolean;
  title: string;
  content: string; // Markdown 格式
  html: string;
  source: string; // 使用的方法
  error?: string;
}

export interface CompanyInfo {
  name?: string;
  description?: string;
  products?: string[];
  services?: string[];
  industries?: string[];
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

export interface ScraperOptions {
  maxChars?: number;
  timeout?: number;
  preferMethod?: 'jina' | 'firecrawl' | 'scrape' | 'static';
}

// 域名路由策略
const DOMAIN_ROUTES: Record<string, string> = {
  'mp.weixin.qq.com': 'scrape', // 微信公众号直跳抓取
  'zhuanlan.zhihu.com': 'scrape', // 知乎专栏
  'juejin.cn': 'scrape', // 掘金
  'csdn.net': 'scrape', // CSDN
  'manafathat.sa': 'scrape', // 沙特政府采购
  'etimad.org.ma': 'scrape', // 摩洛哥政府采购
  'comprasnet.gov.br': 'scrape', // 巴西政府采购
  'mercadopublico.cl': 'scrape', // 智利政府采购
};

// ==================== 主函数 ====================

/**
 * 提取网页正文
 */
export async function fetchWebContent(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedContent> {
  const { maxChars = 30000, timeout = 30000, preferMethod } = options;

  const domain = extractDomain(url);
  const route = DOMAIN_ROUTES[domain];

  // 根据域名路由或用户偏好决定策略
  if (preferMethod === 'jina' || (!route && !preferMethod)) {
    // 1. 尝试 Jina Reader
    const jinaResult = await fetchWithJina(url, maxChars, timeout);
    if (jinaResult.success) {
      return jinaResult;
    }
  }

  if (preferMethod === 'firecrawl') {
    const firecrawlResult = await fetchWithFirecrawl(url, maxChars, timeout);
    if (firecrawlResult.success) {
      return firecrawlResult;
    }
    return firecrawlResult;
  }

  if (preferMethod === 'jina') {
    return {
      success: false,
      title: '',
      content: '',
      html: '',
      source: 'jina',
      error: 'Jina Reader failed',
    };
  }

  // 2. 自建抓取
  const scrapeResult = await fetchWithScrape(url, maxChars, timeout);
  if (scrapeResult.success) {
    return scrapeResult;
  }

  // 3. Firecrawl 兜底
  const firecrawlResult = await fetchWithFirecrawl(url, maxChars, timeout);
  if (firecrawlResult.success) {
    return firecrawlResult;
  }

  // 4. 静态抓取兜底
  const staticResult = await fetchWithStatic(url, maxChars, timeout);
  return staticResult;
}

/**
 * 从公司网站提取信息
 */
export async function scrapeCompanyInfo(
  website: string,
  options: ScraperOptions = {}
): Promise<CompanyInfo> {
  const result: CompanyInfo = {};

  try {
    const content = await fetchWebContent(website, options);

    if (!content.success) {
      return result;
    }

    // 从内容中提取结构化信息
    const $ = cheerio.load(content.html);

    // 提取公司名称
    result.name = $('meta[property="og:site_name"]').attr('content') ||
                  $('title').text().split('|')[0].trim() ||
                  undefined;

    // 提取描述
    result.description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         undefined;

    // 提取联系方式
    const emailMatch = content.content.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    const phoneMatch = content.content.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g);
    if (phoneMatch) {
      result.phone = phoneMatch[0];
    }

    // 提取地址
    const addressMatch = content.content.match(/地址[：:]\s*(.+)|Address[：:]\s*(.+)/i);
    if (addressMatch) {
      result.address = (addressMatch[1] || addressMatch[2])?.trim();
    }

    // 提取社交媒体链接
    result.socialLinks = {
      linkedin: $('a[href*="linkedin.com"]').attr('href'),
      twitter: $('a[href*="twitter.com"]').attr('href'),
      facebook: $('a[href*="facebook.com"]').attr('href'),
    };

    // 提取产品/服务关键词
    result.products = extractProducts(content.content);
    result.industries = extractIndustries(content.content);

  } catch (error) {
    console.error('[WebScraper] scrapeCompanyInfo error:', error);
  }

  return result;
}

// ==================== 抓取方法 ====================

/**
 * Jina Reader API
 */
async function fetchWithJina(
  url: string,
  maxChars: number,
  timeout: number
): Promise<ScrapedContent> {
  const result: ScrapedContent = {
    success: false,
    title: '',
    content: '',
    html: '',
    source: 'jina',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return result;
    }

    const text = await response.text();

    // 提取标题（通常是第一个 # 标题）
    const titleMatch = text.match(/^#\s+(.+)$/m);
    result.title = titleMatch ? titleMatch[1].trim() : '';

    result.content = text.slice(0, maxChars);
    result.html = text; // Jina 返回的就是 Markdown
    result.success = text.length > 100;

  } catch (error) {
    console.error('[WebScraper] Jina error:', error);
  }

  return result;
}

/**
 * 自建抓取（处理反爬）
 */
async function fetchWithScrape(
  url: string,
  maxChars: number,
  timeout: number
): Promise<ScrapedContent> {
  const result: ScrapedContent = {
    success: false,
    title: '',
    content: '',
    html: '',
    source: 'scrape',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 处理懒加载图片
    $('img[data-src]').each((_, el) => {
      const dataSrc = $(el).attr('data-src');
      if (dataSrc) {
        $(el).attr('src', dataSrc);
      }
    });

    // 提取标题
    result.title = $('title').text().trim() ||
                   $('h1').first().text().trim() ||
                   '';

    // 根据域名选择内容选择器
    const selectors = getContentSelectors(url);

    let content = '';
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.html() || '';
        break;
      }
    }

    // 如果没有匹配到，尝试提取 body
    if (!content) {
      content = $('body').html() || '';
    }

    result.html = content;

    // 转换为 Markdown
    result.content = htmlToMarkdown(content, $).slice(0, maxChars);
    result.success = result.content.length > 100;

  } catch (error) {
    console.error('[WebScraper] Scrape error:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * 静态抓取兜底
 */
async function fetchWithStatic(
  url: string,
  maxChars: number,
  timeout: number
): Promise<ScrapedContent> {
  const result: ScrapedContent = {
    success: false,
    title: '',
    content: '',
    html: '',
    source: 'static',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 简单提取文本
    result.title = $('title').text().trim();

    // 移除脚本和样式
    $('script, style, nav, footer, header').remove();

    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();

    result.content = text.slice(0, maxChars);
    result.html = html;
    result.success = text.length > 100;

  } catch (error) {
    console.error('[WebScraper] Static error:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

// ==================== 工具函数 ====================

/**
 * 提取域名
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return '';
  }
}

/**
 * 获取内容选择器
 */
function getContentSelectors(url: string): string[] {
  const domain = extractDomain(url);

  // 微信公众号
  if (domain === 'mp.weixin.qq.com') {
    return ['#js_content', '.rich_media_content'];
  }

  // 知乎专栏
  if (domain === 'zhuanlan.zhihu.com') {
    return ['.Post-RichText', '.RichText'];
  }

  // 掘金
  if (domain === 'juejin.cn') {
    return ['.article-content', '.markdown-body'];
  }

  // CSDN
  if (domain.includes('csdn.net')) {
    return ['#article_content', '.article_content'];
  }

  // 政府采购网站
  if (domain.includes('gov') || domain.includes('tender') || domain.includes('compras')) {
    return ['.tender-content', '.content-body', '.tender-detail', 'article', 'main'];
  }

  // 通用选择器
  return [
    'article',
    'main',
    '.post-content',
    '.entry-content',
    '.article-body',
    '.content-body',
    '[class*="content"]',
    '[class*="article"]',
  ];
}

/**
 * HTML 转 Markdown
 */
function htmlToMarkdown(html: string, $: cheerio.CheerioAPI): string {
  let markdown = '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processNode = (node: any): string => {
    const $node = $(node);
    const tag = node.tagName?.toLowerCase();

    // 处理标题
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const level = parseInt(tag[1]);
      const text = $node.text().trim();
      return `${'#'.repeat(level)} ${text}\n\n`;
    }

    // 处理段落
    if (tag === 'p') {
      return `${$node.text().trim()}\n\n`;
    }

    // 处理链接
    if (tag === 'a') {
      const text = $node.text().trim();
      const href = $node.attr('href') || '';
      return `[${text}](${href})`;
    }

    // 处理图片
    if (tag === 'img') {
      const src = $node.attr('src') || $node.attr('data-src') || '';
      const alt = $node.attr('alt') || '';
      return `![${alt}](${src})`;
    }

    // 处理列表
    if (tag === 'li') {
      return `- ${$node.text().trim()}\n`;
    }

    // 处理代码块
    if (tag === 'pre' || tag === 'code') {
      return `\`\`\`\n${$node.text()}\n\`\`\`\n\n`;
    }

    // 处理 strong/b
    if (tag === 'strong' || tag === 'b') {
      return `**${$node.text()}**`;
    }

    // 处理 em/i
    if (tag === 'em' || tag === 'i') {
      return `*${$node.text()}*`;
    }

    // 处理 br
    if (tag === 'br') {
      return '\n';
    }

    // 递归处理子节点
    let result = '';
    $node.contents().each((_, child) => {
      if (child.type === 'text') {
        result += $(child).text();
      } else if (child.type === 'tag') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result += processNode(child as any);
      }
    });

    return result;
  };

  const $root = $('<div>').html(html);
  $root.contents().each((_, node) => {
    if (node.type === 'tag') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markdown += processNode(node as any);
    }
  });

  // 清理多余空行
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * 提取产品关键词
 */
function extractProducts(content: string): string[] {
  const productPatterns = [
    /产品[：:]\s*(.+?)(?:\n|$)/gi,
    /Products?[：:]\s*(.+?)(?:\n|$)/gi,
    /主营[：:]\s*(.+?)(?:\n|$)/gi,
    /主要产品[：:]\s*(.+?)(?:\n|$)/gi,
  ];

  const products: Set<string> = new Set();

  for (const pattern of productPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const items = match[1].split(/[,，、;；]/).map(s => s.trim()).filter(Boolean);
      items.forEach(item => products.add(item));
    }
  }

  return Array.from(products).slice(0, 10);
}

/**
 * 提取行业关键词
 */
function extractIndustries(content: string): string[] {
  const industryKeywords = [
    '制造业', '化工', '汽车', '电子', '医疗', '能源', '建筑', '农业',
    'manufacturing', 'chemical', 'automotive', 'electronics', 'medical', 'energy', 'construction', 'agriculture',
    'coating', 'painting', 'surface treatment', '涂装', '喷涂', '涂料',
  ];

  const found: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const keyword of industryKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }

  return [...new Set(found)];
}

// ==================== 导出 ====================

/**
 * Firecrawl API
 */
async function fetchWithFirecrawl(
  url: string,
  maxChars: number,
  timeout: number
): Promise<ScrapedContent> {
  const result: ScrapedContent = {
    success: false,
    title: '',
    content: '',
    html: '',
    source: 'firecrawl',
  };

  try {
    const apiKey = await resolveApiKey('firecrawl');
    if (!apiKey) {
      return result;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      result.error = `Firecrawl error: ${response.status}`;
      return result;
    }

    const payload = await response.json() as {
      data?: {
        markdown?: string;
        html?: string;
        metadata?: {
          title?: string;
        };
      };
    };

    const markdown = payload.data?.markdown?.trim() || '';
    const html = payload.data?.html || '';

    if (!markdown && !html) {
      result.error = 'Firecrawl returned empty content';
      return result;
    }

    result.success = (markdown || html).length > 100;
    result.title = payload.data?.metadata?.title?.trim() || '';
    result.content = (markdown || html).slice(0, maxChars);
    result.html = html || markdown;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

const webScraperService = {
  fetchWebContent,
  scrapeCompanyInfo,
};

export default webScraperService;
