/**
 * 多源数据丰富引擎
 *
 * 三层级架构（成本优化）：
 *
 * 第1层：官方/公共免费源（完全免费）
 *   - 无需API Key
 *
 * 第2层：自建网页抓取（自建，免费）
 *   - 官网首页/产品页
 *
 * 第3层：有免费额度的 API
 *   - Apollo.io（公司+联系人，50次/月免费）
 *   - Skrapp.io（邮箱查找，100次/月免费）
 *   - Hunter.io（邮箱备用，25次/月免费）
 *   - Google Places（$200/月免费额度）
 *   - Brave Search（2000次/月免费）
 */

import { prisma } from '@/lib/prisma';

// ==================== 类型定义 ====================

export interface EnrichmentResult {
  success: boolean;
  data: Record<string, unknown>;
  sources: string[];
  cost: number;
}

export interface CompanyEnrichment {
  name?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  industry?: string;
  employees?: number;
  revenue?: number;
  description?: string;
  linkedin?: string;
  technologies?: string[];
  // 联系人
  contacts?: Array<{
    name: string;
    email: string;
    title?: string;
    linkedin?: string;
  }>;
}

export interface EnrichmentOptions {
  usePaidSources?: boolean;
  findContacts?: boolean;
  maxCost?: number;
}

// ==================== 主函数 ====================

/**
 * 丰富公司数据
 */
export async function enrichCompany(
  domain: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const { usePaidSources = true, findContacts = false, maxCost = 0.10 } = options;

  const result: EnrichmentResult = {
    success: false,
    data: {},
    sources: [],
    cost: 0,
  };

  let totalCost = 0;

  try {
    // 第1层：Google Places（已有适配器）
    if (totalCost < maxCost) {
      const placesResult = await enrichFromGooglePlaces(domain);
      if (placesResult.success) {
        mergeEnrichment(result, placesResult);
        totalCost += placesResult.cost;
      }
    }

    // 第3层：Apollo.io（数据最全）
    if (usePaidSources && totalCost < maxCost) {
      const apolloResult = await enrichFromApollo(domain);
      if (apolloResult.success) {
        mergeEnrichment(result, apolloResult);
        totalCost += apolloResult.cost;
      }
    }

    // 第3层：Skrapp.io（邮箱查找）
    if (usePaidSources && !result.data.email && totalCost < maxCost) {
      const skrappResult = await enrichFromSkrapp(domain);
      if (skrappResult.success) {
        mergeEnrichment(result, skrappResult);
        totalCost += skrappResult.cost;
      }
    }

    // 第3层：Hunter.io（邮箱备用）
    if (usePaidSources && !result.data.email && totalCost < maxCost) {
      const hunterResult = await enrichFromHunter(domain);
      if (hunterResult.success) {
        mergeEnrichment(result, hunterResult);
        totalCost += hunterResult.cost;
      }
    }

    // 查找联系人
    if (findContacts && result.data.apolloId) {
      const contacts = await getContactsFromApollo(result.data.apolloId as string);
      if (contacts.length > 0) {
        result.data.contacts = contacts;
      }
    }

    result.success = Object.keys(result.data).length > 0;
    result.cost = totalCost;

    // 记录API调用日志
    await logEnrichmentCall(domain, result);

    return result;
  } catch (error) {
    console.error('[Enrichment] enrichCompany error:', error);
    return result;
  }
}

/**
 * 批量丰富公司数据
 */
export async function enrichCompaniesBatch(
  domains: string[],
  options: EnrichmentOptions = {}
): Promise<{
  success: number;
  failed: number;
  totalCost: number;
  results: Map<string, EnrichmentResult>;
}> {
  const results = new Map<string, EnrichmentResult>();
  let success = 0;
  let failed = 0;
  let totalCost = 0;

  for (const domain of domains) {
    const result = await enrichCompany(domain, options);
    results.set(domain, result);

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    totalCost += result.cost;

    // 限速
    await sleep(300);
  }

  return { success, failed, totalCost, results };
}

// ==================== 数据源适配器 ====================

/**
 * Google Places 数据源
 */
async function enrichFromGooglePlaces(domain: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    success: false,
    data: {},
    sources: [],
    cost: 0,
  };

  try {
    // 使用现有的Google Places适配器
    const { GooglePlacesAdapter } = await import('@/lib/radar/adapters/google-places');
    const adapter = new GooglePlacesAdapter({} as never);

    // 通过域名搜索公司
    const searchResult = await adapter.search({
      keywords: [domain],
      countries: ['US'],
    });

    if (searchResult.items && searchResult.items.length > 0) {
      const candidate = searchResult.items[0];

      // 获取详情
      if (candidate.externalId) {
        const details = await adapter.getDetails?.(candidate.externalId);

        if (details) {
          result.data.phone = details.phone;
          result.data.website = details.website;
          result.data.address = details.address;
          result.data.name = candidate.displayName;

          result.sources.push('Google Places');
          result.success = true;
        }
      }

      result.cost = 0.017; // Google Places成本
    }
  } catch (error) {
    console.error('[Enrichment] Google Places error:', error);
  }

  return result;
}

/**
 * Apollo.io 数据源
 */
async function enrichFromApollo(domain: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    success: false,
    data: {},
    sources: [],
    cost: 0,
  };

  try {
    const apiKey = await getApiKey('apollo');

    if (!apiKey) {
      return result;
    }

    const response = await fetch('https://api.apollo.io/v1/organizations/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      return result;
    }

    const data = await response.json();
    const org = data.organization;

    if (org) {
      result.data.name = org.name;
      result.data.website = org.website_url || org.primary_domain;
      result.data.industry = org.industry;
      result.data.employees = org.employee_count || org.estimated_num_employees;
      result.data.revenue = org.annual_revenue;
      result.data.description = org.description || org.seo_description;
      result.data.linkedin = org.linkedin_url;
      result.data.city = org.city;
      result.data.country = org.country;
      result.data.technologies = org.technologies?.slice(0, 20);
      result.data.apolloId = org.id;

      if (org.primary_phone?.number) {
        result.data.phone = org.primary_phone.number;
      }

      result.sources.push('Apollo.io');
      result.success = true;
      result.cost = 0.10;

      await updateApiUsage('apollo');
    }
  } catch (error) {
    console.error('[Enrichment] Apollo error:', error);
  }

  return result;
}

/**
 * Skrapp.io 数据源（邮箱查找）
 */
async function enrichFromSkrapp(domain: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    success: false,
    data: {},
    sources: [],
    cost: 0,
  };

  try {
    const apiKey = await getApiKey('skrapp');

    if (!apiKey) {
      return result;
    }

    const response = await fetch('https://api.skrapp.io/api/v2/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      return result;
    }

    const data = await response.json();

    if (data.emails && data.emails.length > 0) {
      result.data.email = data.emails[0].email;
      result.data.contacts = data.emails.slice(0, 5).map((e: { email: string; name?: string; title?: string }) => ({
        email: e.email,
        name: e.name,
        title: e.title,
      }));

      result.sources.push('Skrapp.io');
      result.success = true;
      result.cost = 0.05;

      await updateApiUsage('skrapp');
    }
  } catch (error) {
    console.error('[Enrichment] Skrapp error:', error);
  }

  return result;
}

/**
 * Hunter.io 数据源（邮箱查找备用）
 */
async function enrichFromHunter(domain: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    success: false,
    data: {},
    sources: [],
    cost: 0,
  };

  try {
    const apiKey = await getApiKey('hunter');

    if (!apiKey) {
      return result;
    }

    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`
    );

    if (!response.ok) {
      return result;
    }

    const data = await response.json();

    if (data.data?.emails && data.data.emails.length > 0) {
      const firstEmail = data.data.emails[0];
      result.data.email = firstEmail.value;

      result.sources.push('Hunter.io');
      result.success = true;
      result.cost = 0.02;

      await updateApiUsage('hunter');
    }
  } catch (error) {
    console.error('[Enrichment] Hunter error:', error);
  }

  return result;
}

/**
 * 从Apollo获取联系人
 */
async function getContactsFromApollo(organizationId: string): Promise<Array<{
  name: string;
  email: string;
  title?: string;
  linkedin?: string;
}>> {
  try {
    const apiKey = await getApiKey('apollo');

    if (!apiKey) {
      return [];
    }

    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({
        organization_ids: [organizationId],
        page_size: 10,
        person_titles: ['CEO', 'CTO', 'CFO', 'VP', 'Director', 'Manager', 'Owner', 'Founder'],
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const people = data.people || [];

    return people
      .filter((p: { email?: string }) => p.email)
      .map((p: { first_name?: string; last_name?: string; name?: string; email: string; title?: string; linkedin_url?: string }) => ({
        name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        email: p.email,
        title: p.title,
        linkedin: p.linkedin_url,
      }));
  } catch (error) {
    console.error('[Enrichment] Get contacts error:', error);
    return [];
  }
}

// ==================== 工具函数 ====================

/**
 * 合并丰富结果
 */
function mergeEnrichment(target: EnrichmentResult, source: EnrichmentResult): void {
  for (const [key, value] of Object.entries(source.data)) {
    if (target.data[key] === undefined && value !== undefined && value !== null) {
      target.data[key] = value;
    }
  }

  for (const src of source.sources) {
    if (!target.sources.includes(src)) {
      target.sources.push(src);
    }
  }

  target.cost += source.cost;
}

/**
 * 获取API密钥
 */
async function getApiKey(service: string): Promise<string | null> {
  try {
    const config = await prisma.apiKeyConfig.findUnique({
      where: { service },
    });

    return config?.apiKey || process.env[`${service.toUpperCase()}_API_KEY`] || null;
  } catch (error) {
    // 回退到环境变量
    return process.env[`${service.toUpperCase()}_API_KEY`] || null;
  }
}

/**
 * 更新API使用量
 */
async function updateApiUsage(service: string): Promise<void> {
  try {
    await prisma.apiKeyConfig.update({
      where: { service },
      data: {
        lastUsedAt: new Date(),
        currentUsage: { increment: 1 },
      },
    });
  } catch {
    // 静默失败
  }
}

/**
 * 记录丰富化调用
 */
async function logEnrichmentCall(domain: string, result: EnrichmentResult): Promise<void> {
  try {
    await prisma.apiCallLog.create({
      data: {
        service: 'enrichment',
        operation: 'enrich_company',
        cost: result.cost,
        success: result.success,
        metadata: { domain, sources: result.sources, fieldsFound: Object.keys(result.data) },
      },
    });
  } catch {
    // 静默失败
  }
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}