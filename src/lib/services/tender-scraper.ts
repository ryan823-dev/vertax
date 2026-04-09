/**
 * 政府采购网站抓取适配器
 *
 * 支持新兴市场政府采购平台：
 * - MENA: Manafathat (沙特), Etimad (摩洛哥), UAE Tenders
 * - Africa: EGPP (埃及), Tenders Kenya, Tenders Nigeria
 * - LATAM: ComprasNet (巴西), ChileCompra (智利), Mercado Público (墨西哥)
 * - ECA: Zakupki (俄罗斯), Vestnik (哈萨克斯坦)
 *
 * 用于从采购公告页面提取结构化信息
 */

import * as cheerio from 'cheerio';
import { fetchWebContent } from './web-scraper';

// ==================== 类型定义 ====================

export interface TenderInfo {
  title: string;
  description: string;
  buyer: string;
  buyerType: 'government' | 'enterprise' | 'ngo' | 'international_org';
  country: string;
  region: string;
  category: string;
  deadline?: Date;
  publishedAt?: Date;
  budget?: {
    amount: number;
    currency: string;
  };
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  documents?: Array<{
    name: string;
    url: string;
  }>;
  sourceUrl: string;
  sourceName: string;
  language: string;
}

export interface TenderScraperResult {
  success: boolean;
  tender?: TenderInfo;
  error?: string;
}

// 政府采购网站配置
const TENDER_SITES: Record<string, {
  name: string;
  country: string;
  region: string;
  language: string;
  selectors: {
    title: string[];
    description: string[];
    buyer: string[];
    budget: string[];
    deadline: string[];
    category: string[];
    contact: string[];
  };
}> = {
  // MENA
  'manafathat.sa': {
    name: 'Manafathat',
    country: 'SA',
    region: 'MENA',
    language: 'ar',
    selectors: {
      title: ['h1', '.tender-title', '[class*="title"]'],
      description: ['.tender-desc', '.description', '[class*="content"]'],
      buyer: ['.buyer-name', '.organization', '[class*="entity"]'],
      budget: ['.budget', '.value', '[class*="amount"]'],
      deadline: ['.deadline', '.date', '[class*="closing"]'],
      category: ['.category', '.sector', '[class*="type"]'],
      contact: ['.contact', '.info', '[class*="email"]'],
    },
  },
  'etimad.org.ma': {
    name: 'Etimad',
    country: 'MA',
    region: 'MENA',
    language: 'ar',
    selectors: {
      title: ['h1', '.tender-title'],
      description: ['.tender-content', '.description'],
      buyer: ['.buyer', '.entity-name'],
      budget: ['.budget', '.estimated-value'],
      deadline: ['.deadline', '.closing-date'],
      category: ['.category', '.sector'],
      contact: ['.contact-info'],
    },
  },
  'uaetenders.ae': {
    name: 'UAE Tenders',
    country: 'AE',
    region: 'MENA',
    language: 'en',
    selectors: {
      title: ['h1', '.tender-title'],
      description: ['.tender-description', '.details'],
      buyer: ['.buyer', '.company-name'],
      budget: ['.budget', '.value'],
      deadline: ['.deadline', '.closing'],
      category: ['.category', '.industry'],
      contact: ['.contact'],
    },
  },

  // Africa
  'egpp.gov.eg': {
    name: 'EGPP',
    country: 'EG',
    region: 'AFRICA',
    language: 'ar',
    selectors: {
      title: ['h1', '.tender-title'],
      description: ['.tender-content', '.description'],
      buyer: ['.buyer', '.entity'],
      budget: ['.budget', '.value'],
      deadline: ['.deadline', '.closing'],
      category: ['.category', '.type'],
      contact: ['.contact'],
    },
  },
  'tenderskenya.com': {
    name: 'Tenders Kenya',
    country: 'KE',
    region: 'AFRICA',
    language: 'en',
    selectors: {
      title: ['h1', '.tender-title', 'article h2'],
      description: ['.tender-content', '.description', 'article'],
      buyer: ['.buyer', '.organization'],
      budget: ['.budget', '.value'],
      deadline: ['.deadline', '.closing-date'],
      category: ['.category', '.sector'],
      contact: ['.contact', '.contact-info'],
    },
  },
  'tendersnigeria.com': {
    name: 'Tenders Nigeria',
    country: 'NG',
    region: 'AFRICA',
    language: 'en',
    selectors: {
      title: ['h1', '.tender-title'],
      description: ['.tender-content', '.description'],
      buyer: ['.buyer', '.company'],
      budget: ['.budget', '.value'],
      deadline: ['.deadline', '.closing'],
      category: ['.category', '.sector'],
      contact: ['.contact'],
    },
  },

  // LATAM
  'comprasnet.gov.br': {
    name: 'ComprasNet',
    country: 'BR',
    region: 'LATAM',
    language: 'pt',
    selectors: {
      title: ['h1', '.licitacao-titulo', '[class*="titulo"]'],
      description: ['.licitacao-descricao', '.descricao', '[class*="objeto"]'],
      buyer: ['.orgao', '.entidade', '[class*="orgao"]'],
      budget: ['.valor', '.valor-estimado'],
      deadline: ['.data', '.prazo', '[class*="data"]'],
      category: ['.categoria', '.tipo'],
      contact: ['.contato', '.informacoes'],
    },
  },
  'chilecompra.cl': {
    name: 'ChileCompra',
    country: 'CL',
    region: 'LATAM',
    language: 'es',
    selectors: {
      title: ['h1', '.nombre', '[class*="titulo"]'],
      description: ['.descripcion', '.objeto', '[class*="descripcion"]'],
      buyer: ['.organismo', '.comprador'],
      budget: ['.monto', '.valor', '[class*="monto"]'],
      deadline: ['.fecha', '.plazo', '[class*="fecha"]'],
      category: ['.categoria', '.tipo', '[class*="categoria"]'],
      contact: ['.contacto'],
    },
  },
  'mercadopublico.cl': {
    name: 'Mercado Público',
    country: 'CL',
    region: 'LATAM',
    language: 'es',
    selectors: {
      title: ['h1', '.nombre-proveedor', '[class*="nombre"]'],
      description: ['.descripcion', '.detalle'],
      buyer: ['.comprador', '.organismo'],
      budget: ['.monto', '.valor'],
      deadline: ['.fecha-cierre', '.plazo'],
      category: ['.categoria', '.rubro'],
      contact: ['.contacto'],
    },
  },

  // ECA
  'zakupki.gov.ru': {
    name: 'Zakupki',
    country: 'RU',
    region: 'ECA',
    language: 'ru',
    selectors: {
      title: ['h1', '.cardMainInfo__header', '[class*="name"]'],
      description: ['.cardMainInfo__content', '.description', '[class*="description"]'],
      buyer: ['.common-text__organization', '.customer', '[class*="organization"]'],
      budget: ['.price-block__value', '.nmck', '[class*="price"]'],
      deadline: ['.data-block__value', '.date-end', '[class*="date"]'],
      category: ['.ktru-customer-block__title', '.category'],
      contact: ['.contact-block', '.contact-info'],
    },
  },
};

// 货币代码映射
const CURRENCY_MAP: Record<string, string> = {
  'SA': 'SAR', // 沙特里亚尔
  'AE': 'AED', // 阿联酋迪拉姆
  'MA': 'MAD', // 摩洛哥迪拉姆
  'EG': 'EGP', // 埃及镑
  'KE': 'KES', // 肯尼亚先令
  'NG': 'NGN', // 尼日利亚奈拉
  'BR': 'BRL', // 巴西雷亚尔
  'CL': 'CLP', // 智利比索
  'MX': 'MXN', // 墨西哥比索
  'RU': 'RUB', // 俄罗斯卢布
  'KZ': 'KZT', // 哈萨克斯坦坚戈
};

// ==================== 主函数 ====================

/**
 * 从政府采购页面提取招标信息
 */
export async function scrapeTenderPage(url: string): Promise<TenderScraperResult> {
  try {
    const domain = extractDomain(url);
    const siteConfig = TENDER_SITES[domain];

    if (!siteConfig) {
      // 通用处理
      return scrapeGenericTender(url);
    }

    // 获取页面内容
    const content = await fetchWebContent(url);

    if (!content.success) {
      return {
        success: false,
        error: 'Failed to fetch page content',
      };
    }

    // 解析 HTML
    const $ = cheerio.load(content.html);

    // 根据配置提取信息
    const tender: TenderInfo = {
      title: extractBySelectors($, siteConfig.selectors.title) || content.title,
      description: extractBySelectors($, siteConfig.selectors.description) || cleanText(content.content),
      buyer: extractBySelectors($, siteConfig.selectors.buyer) || '',
      buyerType: 'government', // 政府采购网站默认为政府
      country: siteConfig.country,
      region: siteConfig.region,
      category: extractBySelectors($, siteConfig.selectors.category) || '',
      sourceUrl: url,
      sourceName: siteConfig.name,
      language: siteConfig.language,
    };

    // 提取预算
    const budgetText = extractBySelectors($, siteConfig.selectors.budget);
    if (budgetText) {
      tender.budget = parseBudget(budgetText, siteConfig.country);
    }

    // 提取截止日期
    const deadlineText = extractBySelectors($, siteConfig.selectors.deadline);
    if (deadlineText) {
      tender.deadline = parseDate(deadlineText, siteConfig.language);
    }

    // 提取联系方式
    const contactText = extractBySelectors($, siteConfig.selectors.contact);
    if (contactText) {
      tender.contact = parseContact(contactText);
    }

    return {
      success: true,
      tender,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 通用招标页面解析
 */
async function scrapeGenericTender(url: string): Promise<TenderScraperResult> {
  try {
    const content = await fetchWebContent(url);

    if (!content.success) {
      return {
        success: false,
        error: 'Failed to fetch page content',
      };
    }

    const $ = cheerio.load(content.html);

    // 通用选择器尝试
    const tender: TenderInfo = {
      title: $('h1').first().text().trim() || content.title,
      description: cleanText(content.content.slice(0, 2000)),
      buyer: '',
      buyerType: 'government',
      country: '',
      region: '',
      category: '',
      sourceUrl: url,
      sourceName: extractDomain(url),
      language: 'en',
    };

    // 尝试提取常见字段
    const budgetMatch = content.content.match(/budget[:\s]+([\d,.\s]+)/i);
    if (budgetMatch) {
      tender.budget = {
        amount: parseFloat(budgetMatch[1].replace(/[,.\s]/g, '')),
        currency: 'USD',
      };
    }

    const deadlineMatch = content.content.match(/deadline[:\s]+(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/i);
    if (deadlineMatch) {
      tender.deadline = new Date(deadlineMatch[1]);
    }

    return {
      success: true,
      tender,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批量抓取招标页面
 */
export async function scrapeTenderBatch(urls: string[]): Promise<{
  success: number;
  failed: number;
  results: Map<string, TenderScraperResult>;
}> {
  const results = new Map<string, TenderScraperResult>();
  let success = 0;
  let failed = 0;

  for (const url of urls) {
    const result = await scrapeTenderPage(url);
    results.set(url, result);

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // 限速
    await sleep(500);
  }

  return { success, failed, results };
}

// ==================== 工具函数 ====================

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (error) {
    console.warn('[extractDomain] URL parse error:', error);
    return '';
  }
}

function extractBySelectors($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      return element.text().trim();
    }
  }
  return '';
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseBudget(text: string, countryCode: string): { amount: number; currency: string } | undefined {
  // 提取数字
  const numbers = text.match(/[\d,.\s]+/g);
  if (!numbers || numbers.length === 0) return undefined;

  const amount = parseFloat(numbers[0].replace(/[,.\s]/g, ''));
  if (isNaN(amount)) return undefined;

  const currency = CURRENCY_MAP[countryCode] || 'USD';

  return { amount, currency };
}

function parseDate(text: string, _language: string): Date | undefined {
  // 尝试多种日期格式
  const patterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // DD-MM-YYYY or MM-DD-YYYY
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i, // DD Mon YYYY
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return undefined;
}

function parseContact(text: string): { name?: string; email?: string; phone?: string } {
  const contact: { name?: string; email?: string; phone?: string } = {};

  // 提取邮箱
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emailMatch) {
    contact.email = emailMatch[0];
  }

  // 提取电话
  const phoneMatch = text.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g);
  if (phoneMatch) {
    contact.phone = phoneMatch[0];
  }

  return contact;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 导出 ====================

const tenderScraper = {
  scrapeTenderPage,
  scrapeTenderBatch,
  TENDER_SITES,
};

export default tenderScraper;
