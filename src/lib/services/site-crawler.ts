/**
 * 站点爬虫服务
 *
 * 自动发现并爬取网站所有页面：
 * 1. 优先解析 sitemap.xml
 * 2. 降级为 BFS 链接爬取
 *
 * 配合 web-scraper.ts 的 fetchWebContent 使用
 */

import * as cheerio from "cheerio";

// ==================== 类型定义 ====================

export interface CrawlOptions {
  /** 最大爬取页数（默认 50） */
  maxPages: number;
  /** 排除路径前缀 */
  excludePaths?: string[];
  /** 单页超时（毫秒，默认 15000） */
  timeout: number;
}

export interface DiscoveredPage {
  url: string;
  title: string;
  status: "pending" | "fetched" | "failed" | "skipped";
  contentLength?: number;
  error?: string;
}

export interface CrawlProgress {
  phase: "sitemap" | "discovering" | "fetching" | "done" | "error";
  discovered: number;
  fetched: number;
  failed: number;
  skipped: number;
  currentUrl?: string;
  pages: DiscoveredPage[];
  error?: string;
}

const DEFAULT_OPTIONS: CrawlOptions = {
  maxPages: 500,
  excludePaths: [
    "/admin", "/login", "/cart", "/checkout", "/account", "/wp-admin", "/api",
    "/privacy", "/terms", "/cookie", "/legal", "/gdpr", "/sitemap", "/feed",
    "/rss", "/tag/", "/tags/", "/author/", "/wp-content", "/cdn-cgi",
    "/unsubscribe", "/imprint", "/disclaimer",
    // 电商相关
    "/product/", "/products/", "/category/", "/categories/", "/collection/", "/collections/",
    "/item/", "/shop/", "/store/", "/mall/", "/marketplace/",
    // 用户生成内容
    "/forum/", "/forums/", "/thread/", "/threads/", "/post/", "/posts/",
    "/comment/", "/comments/", "/review/", "/reviews/", "/question/", "/answer/",
    // 媒体/下载
    "/media/", "/downloads/", "/download/", "/files/", "/file/",
    // 搜索/过滤
    "/search", "/?s=", "/?q=", "/filter", "/sort",
  ],
  timeout: 15000,
};

// 跳过的文件扩展名
const SKIP_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".bmp",
  ".mp4", ".mp3", ".avi", ".mov", ".wmv", ".flv", ".wav",
  ".zip", ".rar", ".gz", ".tar", ".7z",
  ".css", ".js", ".json", ".xml", ".txt", ".csv",
  ".woff", ".woff2", ".ttf", ".eot",
]);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ==================== 主函数 ====================

/**
 * 发现网站所有页面
 *
 * 1. 先尝试 sitemap.xml
 * 2. sitemap 不可用则 BFS 爬取首页链接
 *
 * 返回去重后的 URL 列表
 */
export async function discoverPages(
  rootUrl: string,
  options: Partial<CrawlOptions> = {}
): Promise<{ urls: string[]; method: "sitemap" | "crawl" }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 规范化根 URL
  const normalizedRoot = normalizeUrl(rootUrl);
  const rootHostname = new URL(normalizedRoot).hostname;

  // 1. 尝试 sitemap
  const sitemapUrls = await parseSitemap(normalizedRoot);
  if (sitemapUrls.length > 0) {
    const filtered = filterUrls(sitemapUrls, rootHostname, opts);
    return {
      urls: filtered.slice(0, opts.maxPages),
      method: "sitemap",
    };
  }

  // 2. BFS 链接爬取
  const crawledUrls = await crawlLinks(normalizedRoot, rootHostname, opts);
  return {
    urls: crawledUrls.slice(0, opts.maxPages),
    method: "crawl",
  };
}

// ==================== Sitemap 解析 ====================

/**
 * 解析 sitemap.xml，支持 sitemap index
 */
async function parseSitemap(rootUrl: string): Promise<string[]> {
  const origin = new URL(rootUrl).origin;
  const urls: string[] = [];

  // 尝试多个常见 sitemap 位置
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap.xml.gz"];

  for (const path of sitemapPaths) {
    try {
      const sitemapUrl = `${origin}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });

      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const xml = await res.text();

      // 检查是否是 sitemap index（包含多个 sitemap）
      if (xml.includes("<sitemapindex")) {
        const childSitemaps = extractSitemapIndexUrls(xml);
        for (const childUrl of childSitemaps.slice(0, 5)) {
          // 最多解析 5 个子 sitemap
          const childUrls = await fetchSingleSitemap(childUrl);
          urls.push(...childUrls);
        }
      } else {
        // 普通 sitemap
        const pageUrls = extractSitemapUrls(xml);
        urls.push(...pageUrls);
      }

      if (urls.length > 0) break; // 找到有效 sitemap 就停止
    } catch {
      // 尝试下一个路径
      continue;
    }
  }

  return [...new Set(urls)];
}

/**
 * 从 sitemap index 提取子 sitemap URL
 */
function extractSitemapIndexUrls(xml: string): string[] {
  const urls: string[] = [];
  const $ = cheerio.load(xml, { xml: true });
  $("sitemap > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) urls.push(loc);
  });
  return urls;
}

/**
 * 从单个 sitemap 提取页面 URL
 */
function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const $ = cheerio.load(xml, { xml: true });
  $("url > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) urls.push(loc);
  });
  return urls;
}

/**
 * 获取并解析单个子 sitemap
 */
async function fetchSingleSitemap(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const xml = await res.text();
    return extractSitemapUrls(xml);
  } catch {
    return [];
  }
}

// ==================== BFS 链接爬取 ====================

/**
 * BFS 广度优先爬取站内链接
 */
async function crawlLinks(
  startUrl: string,
  rootHostname: string,
  opts: CrawlOptions
): Promise<string[]> {
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  const discovered: string[] = [];

  visited.add(normalizeUrl(startUrl));

  while (queue.length > 0 && discovered.length < opts.maxPages) {
    const currentUrl = queue.shift()!;
    discovered.push(currentUrl);

    // 延迟避免被封
    if (discovered.length > 1) {
      await delay(500);
    }

    try {
      const links = await extractPageLinks(currentUrl, rootHostname, opts);

      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (!visited.has(normalized) && discovered.length + queue.length < opts.maxPages) {
          visited.add(normalized);

          // 过滤检查
          if (shouldIncludeUrl(normalized, rootHostname, opts)) {
            queue.push(normalized);
          }
        }
      }
    } catch {
      // 单页失败不影响整体
      continue;
    }
  }

  return discovered;
}

/**
 * 提取页面中的所有站内链接
 */
async function extractPageLinks(
  url: string,
  rootHostname: string,
  opts: CrawlOptions
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const resolved = new URL(href, url).href;
        const parsedLink = new URL(resolved);

        // 仅保留同域名链接
        if (parsedLink.hostname === rootHostname) {
          links.push(resolved);
        }
      } catch {
        // 无效 URL，跳过
      }
    });

    return links;
  } catch {
    return [];
  }
}

// ==================== 工具函数 ====================

/**
 * URL 标准化（去重用）
 */
export function normalizeUrl(url: string): string {
  try {
    // 自动补全协议
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);

    // 移除 fragment
    parsed.hash = "";

    // 移除尾部斜杠（非根路径）
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // 小写化 hostname
    return parsed.href;
  } catch {
    return url;
  }
}

/**
 * 检查 URL 是否应该被包含
 */
function shouldIncludeUrl(
  url: string,
  rootHostname: string,
  opts: CrawlOptions
): boolean {
  try {
    const parsed = new URL(url);

    // 同域名检查
    if (parsed.hostname !== rootHostname) return false;

    // 扩展名检查
    const ext = getExtension(parsed.pathname);
    if (ext && SKIP_EXTENSIONS.has(ext)) return false;

    // 排除路径检查
    if (opts.excludePaths) {
      for (const excludePath of opts.excludePaths) {
        if (parsed.pathname.startsWith(excludePath)) return false;
      }
    }

    // 排除锚点链接和 javascript:
    if (url.startsWith("javascript:") || url.startsWith("mailto:") || url.startsWith("tel:")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 过滤 URL 列表
 */
function filterUrls(urls: string[], rootHostname: string, opts: CrawlOptions): string[] {
  const seen = new Set<string>();
  const filtered: string[] = [];

  for (const url of urls) {
    const normalized = normalizeUrl(url);
    if (!seen.has(normalized) && shouldIncludeUrl(normalized, rootHostname, opts)) {
      seen.add(normalized);
      filtered.push(normalized);
    }
  }

  return filtered;
}

/**
 * 提取 URL 路径的文件扩展名
 */
function getExtension(pathname: string): string | null {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot === -1 || lastDot < pathname.lastIndexOf("/")) return null;
  return pathname.slice(lastDot).toLowerCase();
}

/**
 * 延迟
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
