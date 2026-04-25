// ==================== B2B联系方式补全引擎 ====================
// 实现7步方法论：身份归一化 → 官网优先 → 搜索语法 → 行业目录 → 置信度评分 → 业务证据化 → CRM输出

import type {
  ContactEnrichmentQuery,
  ContactEnrichmentResult,
  CompanyIdentity,
  IdentityResolution,
  IdentityResolutionEvidence,
  PhoneContact,
  EmailContact,
  AddressContact,
  ContactForm,
  Capabilities,
  RecommendedChannel,
  InformationGap,
  ContactConfidenceScore,
  ContactSourceType,
  ComplianceResult,
  CRMContactOutput,
} from './types';
import { resolveMx } from 'node:dns/promises';
import { load } from 'cheerio';
import { IndustryDirectorySearcher } from './industry-directory';
import {
  ConfidenceScorer,
  RecommendedChannelGenerator,
  InformationGapAnalyzer,
  ComplianceChecker,
} from './scoring';
import {
  doesCountryMatchTargets,
  getCountryDisplayName,
} from '@/lib/radar/country-utils';

interface SearchResultCandidate {
  url: string;
  title: string;
  snippet: string;
  domain?: string;
}

interface PageFormSignal {
  action?: string;
  descriptors: string[];
  fieldNames: string[];
}

interface PageDomSignals {
  textContent: string;
  telLinks: string[];
  mailtoLinks: string[];
  addressBlocks: string[];
  forms: PageFormSignal[];
}

interface EmailSearchOptions {
  maxResults?: number;
  validateMX?: boolean;
  language?: string;
}

// ==================== 第1步：身份归一化 ====================

/**
 * 企业身份归一化器
 * 防止同名混淆，确保锁定正确主体
 */
export class CompanyIdentityNormalizer {
  /**
   * 归一化企业身份
   */
  async normalize(query: ContactEnrichmentQuery): Promise<CompanyIdentity> {
    const searchedDomain = await this.searchOfficialDomain(query.companyName);
    const identity: CompanyIdentity = {
      inputName: query.companyName,
      displayName: query.companyName,
      domain: this.extractDomain(query.domain) || searchedDomain,
      country: query.country,
      state: query.state,
      city: query.city,
      industry: query.industry,
      identityConfidence: 0,
      duplicateRisk: 'none',
      duplicateWarnings: [],
      resolution: this.createEmptyResolution(query.companyName),
    };

    // 1. 搜索企业官网确认身份
    if (query.domain) {
      const providedDomain = this.extractDomain(query.domain);
      if (providedDomain) {
        identity.domain = providedDomain;
        identity.officialUrl = this.toOfficialUrl(providedDomain);
        this.pushEvidence(identity.resolution, {
          type: 'input_domain',
          strength: 'strong',
          source: 'input',
          value: providedDomain,
          scoreDelta: 45,
          note: 'Provided directly with the query',
        });
      }
    }

    if (!query.domain && searchedDomain) {
      identity.domain = searchedDomain;
      identity.officialUrl = this.toOfficialUrl(searchedDomain);
      this.pushEvidence(identity.resolution, {
        type: 'official_domain_search',
        strength: 'strong',
        source: 'search',
        value: searchedDomain,
        scoreDelta: 30,
        note: 'Discovered from official-site search',
      });
    }

    if (identity.domain && this.domainMatchesCompany(identity.domain, query.companyName)) {
      this.pushEvidence(identity.resolution, {
        type: 'official_domain_match',
        strength: 'supporting',
        source: query.domain ? 'input' : 'search',
        value: identity.domain,
        scoreDelta: 12,
        note: 'Domain tokens align with the company name',
      });
    }

    if (query.domain && searchedDomain) {
      const providedDomain = this.extractDomain(query.domain);
      if (providedDomain && !this.sameDomainFamily(providedDomain, searchedDomain)) {
        this.pushEvidence(identity.resolution, {
          type: 'domain_conflict',
          strength: 'conflict',
          source: 'search',
          value: `${providedDomain} != ${searchedDomain}`,
          scoreDelta: -30,
          note: 'Provided domain disagrees with search-discovered official domain',
        });
        identity.resolution.blockingIssues.push(
          `Provided domain ${providedDomain} conflicts with search result ${searchedDomain}`
        );
      } else if (providedDomain) {
        this.pushEvidence(identity.resolution, {
          type: 'official_domain_search',
          strength: 'supporting',
          source: 'search',
          value: searchedDomain,
          scoreDelta: 10,
          note: 'Search corroborates the provided domain',
        });
      }
    }

    // 2. 搜索LinkedIn公司页确认
    const linkedinInfo =
      query.options?.checkSocialMedia === false
        ? null
        : await this.searchLinkedInCompany(query.companyName);
    if (linkedinInfo) {
      identity.linkedinUrl = linkedinInfo.url;
      identity.legalName = linkedinInfo.legalName || identity.legalName;
      identity.industry = linkedinInfo.industry || identity.industry;
      identity.city = linkedinInfo.headquarters || identity.city;
      if (linkedinInfo.url) {
        this.pushEvidence(identity.resolution, {
          type: 'linkedin_company_page',
          strength: 'supporting',
          source: 'linkedin',
          value: linkedinInfo.url,
          scoreDelta: 18,
          note: 'Found a public LinkedIn company page',
        });

        const linkedinSlug = this.extractLinkedInCompanySlug(linkedinInfo.url);
        if (linkedinSlug && this.linkedinSlugMatchesCompany(linkedinSlug, query.companyName)) {
          this.pushEvidence(identity.resolution, {
            type: 'linkedin_slug_match',
            strength: 'supporting',
            source: 'linkedin',
            value: linkedinInfo.url,
            scoreDelta: 10,
            note: 'LinkedIn company slug aligns with the company name',
          });
        }
      }
    }

    // 3. 检查混淆风险
    const duplicates = await this.checkDuplicateRisk(identity);
    if (duplicates.length > 0) {
      identity.duplicateRisk = duplicates.length > 2 ? 'high' : duplicates.length > 1 ? 'medium' : 'low';
      identity.duplicateWarnings = duplicates;
      this.pushEvidence(identity.resolution, {
        type: 'duplicate_conflict',
        strength: 'conflict',
        source: 'search',
        value: duplicates[0],
        scoreDelta: identity.duplicateRisk === 'high' ? -35 : identity.duplicateRisk === 'medium' ? -20 : -10,
        note: 'Search surfaced likely lookalike entities',
      });
      if (identity.duplicateRisk === 'high' || identity.duplicateRisk === 'medium') {
        identity.resolution.blockingIssues.push(...duplicates.slice(0, 2));
      }
    }

    // 4. 归一化域名（清理）
    if (identity.domain) {
      identity.officialUrl = this.toOfficialUrl(identity.domain);
      identity.resolution.officialDomain = identity.domain;
    }

    this.finalizeResolution(identity);
    return identity;
  }

  refine(
    identity: CompanyIdentity,
    signals: {
      hasOfficialWebsiteSignals?: boolean;
      locationMatch?: boolean;
      industryMatch?: boolean;
      emailDomainMatch?: boolean;
      conflictingEmailDomains?: string[];
      linkedinSlugMatch?: boolean;
    }
  ): CompanyIdentity {
    const nextIdentity: CompanyIdentity = {
      ...identity,
      duplicateWarnings: identity.duplicateWarnings ? [...identity.duplicateWarnings] : [],
      resolution: {
        ...identity.resolution,
        evidence: [...identity.resolution.evidence],
        blockingIssues: [...identity.resolution.blockingIssues],
      },
    };

    if (signals.hasOfficialWebsiteSignals && nextIdentity.officialUrl) {
      this.pushEvidence(nextIdentity.resolution, {
        type: 'official_website_signal',
        strength: 'strong',
        source: 'website',
        value: nextIdentity.officialUrl,
        scoreDelta: 18,
        note: 'Official website yielded contact or capability signals',
      });
    }

    if (signals.locationMatch) {
      this.pushEvidence(nextIdentity.resolution, {
        type: 'location_match',
        strength: 'supporting',
        source: 'website',
        value: `${nextIdentity.city || ''} ${nextIdentity.country || ''}`.trim() || nextIdentity.inputName,
        scoreDelta: 8,
        note: 'Location signals are consistent across inputs and extracted data',
      });
    }

    if (signals.industryMatch) {
      this.pushEvidence(nextIdentity.resolution, {
        type: 'industry_match',
        strength: 'supporting',
        source: 'directory',
        value: nextIdentity.industry || nextIdentity.inputName,
        scoreDelta: 6,
        note: 'Industry signals align across sources',
      });
    }

    if (signals.emailDomainMatch && nextIdentity.domain) {
      this.pushEvidence(nextIdentity.resolution, {
        type: 'contact_domain_match',
        strength: 'strong',
        source: 'website',
        value: nextIdentity.domain,
        scoreDelta: 14,
        note: 'Official contact emails use the same domain family as the locked entity',
      });
    }

    if (signals.conflictingEmailDomains?.length) {
      const uniqueDomains = [...new Set(signals.conflictingEmailDomains)];
      this.pushEvidence(nextIdentity.resolution, {
        type: 'contact_domain_conflict',
        strength: 'conflict',
        source: 'website',
        value: uniqueDomains.join(', '),
        scoreDelta: signals.emailDomainMatch ? -8 : -18,
        note: 'Official-page contact emails disagree with the locked entity domain',
      });

      if (!signals.emailDomainMatch) {
        nextIdentity.resolution.blockingIssues.push(
          `Conflicting official contact domains: ${uniqueDomains.join(', ')}`
        );
      }
    }

    if (signals.linkedinSlugMatch && nextIdentity.linkedinUrl) {
      this.pushEvidence(nextIdentity.resolution, {
        type: 'linkedin_slug_match',
        strength: 'supporting',
        source: 'linkedin',
        value: nextIdentity.linkedinUrl,
        scoreDelta: 10,
        note: 'LinkedIn company slug aligns with the locked entity name',
      });
    }

    this.finalizeResolution(nextIdentity);
    return nextIdentity;
  }

  /**
   * 搜索官方域名
   */
  private async searchOfficialDomain(companyName: string): Promise<string | undefined> {
    const searchQuery = `${companyName} official website`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    const excludeDomains = [
      'duckduckgo.com',
      'google.com',
      'bing.com',
      'yahoo.com',
      'linkedin.com',
      'facebook.com',
      'twitter.com',
      'youtube.com',
      'wikipedia.org',
      'crunchbase.com',
      'zoominfo.com',
    ];

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VertaxEnrich/1.0)' },
      });

      if (!response.ok) return undefined;

      const html = await response.text();
      const parsedResults = this.parseDuckDuckGoResults(html);
      const parsedDomain = parsedResults.find(result => {
        const domain = result.domain || this.extractDomain(result.url);
        if (!domain) {
          return false;
        }
        if (excludeDomains.some(ex => domain.includes(ex))) {
          return false;
        }

        const looksOfficial = /official|home|contact|about/i.test(
          `${result.title} ${result.snippet}`
        );
        return (
          this.resultMentionsCompany(result, companyName) &&
          (looksOfficial || this.domainMatchesCompany(domain, companyName))
        );
      });

      if (parsedDomain?.domain) {
        return parsedDomain.domain;
      }

      // 提取第一个非广告、非搜索引擎的域名
      const domainPatterns = [
        /href="https?:\/\/(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi,
      ];

      const excludeDomains = [
        'duckduckgo.com', 'google.com', 'bing.com', 'yahoo.com',
        'linkedin.com', 'facebook.com', 'twitter.com', 'youtube.com',
        'wikipedia.org', 'crunchbase.com', 'zoominfo.com',
      ];

      for (const pattern of domainPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const domain = match[1]?.toLowerCase();
          if (domain && !excludeDomains.some(ex => domain.includes(ex))) {
            // 检查域名是否与公司名相关
            const companyWords = companyName.toLowerCase().split(/\s+/);
            const domainRelated = companyWords.some(word =>
              word.length > 3 && domain.includes(word.replace(/[^a-z]/g, ''))
            );

            if (domainRelated || domain.includes(companyName.split(/\s+/)[0]?.toLowerCase() || '')) {
              return domain;
            }
          }
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 搜索LinkedIn公司页
   */
  private async searchLinkedInCompany(companyName: string): Promise<{
    url?: string;
    legalName?: string;
    industry?: string;
    headquarters?: string;
  } | null> {
    const searchQuery = `${companyName} site:linkedin.com/company`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;

      const html = await response.text();
      const parsedResults = this.parseDuckDuckGoResults(html).filter(result =>
        /linkedin\.com\/company\//i.test(result.url)
      );
      const bestMatch =
        parsedResults.find(result => {
          const slug = this.extractLinkedInCompanySlug(result.url);
          return slug ? this.linkedinSlugMatchesCompany(slug, companyName) : false;
        }) || parsedResults[0];

      if (bestMatch) {
        return {
          url: bestMatch.url,
          legalName: this.extractLikelyEntityName(bestMatch.title),
        };
      }

      // 提取LinkedIn URL
      const linkedinPattern = /href="https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9-]+)/gi;
      const match = html.match(linkedinPattern);

      if (match) {
        return {
          url: match[0].replace(/href="|"/g, ''),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 检查混淆风险
   */
  private async checkDuplicateRisk(identity: CompanyIdentity): Promise<string[]> {
    const warnings: string[] = [];

    // 搜索可能混淆的公司
    const searchQuery = `${identity.inputName} company`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return warnings;

      const html = await response.text();
      const normalizedInput = this.normalizeCompanyName(identity.inputName);
      const parsedLookalikes = this.parseDuckDuckGoResults(html)
        .map(result => ({
          title: this.extractLikelyEntityName(result.title),
          domain: result.domain || this.extractDomain(result.url),
        }))
        .filter(result => {
          const normalizedCandidate = this.normalizeCompanyName(result.title);
          if (!normalizedCandidate || normalizedCandidate === normalizedInput) {
            return false;
          }

          if (identity.domain && result.domain && this.sameDomainFamily(identity.domain, result.domain)) {
            return false;
          }

          return this.countTokenOverlap(normalizedInput, normalizedCandidate) >= 1;
        })
        .map(result => result.title);

      const parsedUniqueMatches = [...new Set(parsedLookalikes)];
      if (parsedUniqueMatches.length > 1) {
        warnings.push(`Found ${parsedUniqueMatches.length} lookalike company names`);
        warnings.push(...parsedUniqueMatches.slice(0, 3).map(m => `Lookalike: ${m}`));
        return warnings;
      }

      // 检查是否有多个同名或相似名公司
      const companyPattern = new RegExp(`${identity.inputName.split(/\s+/)[0]}[^<]{0,50}(?:Inc|LLC|Corp|Ltd|Co|GmbH|SA|BV)`, 'gi');
      const matches = html.match(companyPattern) || [];

      /*
      if (matches.length > 1) {
        const uniqueMatches = [...new Set(matches.map(m => m.trim()))];
        if (uniqueMatches.length > 1) {
          warnings.push(`发现${uniqueMatches.length}个可能混淆的相似公司名`);
          warnings.push(...uniqueMatches.slice(0, 3).map(m => `相似名: ${m}`));
        }
      }
      */
      if (matches.length > 1) {
        const uniqueMatches = [...new Set(matches.map(m => m.trim()))];
        if (uniqueMatches.length > 1) {
          warnings.push(`Found ${uniqueMatches.length} lookalike company names`);
          warnings.push(...uniqueMatches.slice(0, 3).map(m => `Lookalike: ${m}`));
        }
      }
    } catch {
      // 忽略错误
    }

    return warnings;
  }

  /**
   * 规范化域名
   */
  private normalizeDomain(domain: string): string {
    // 移除协议和路径
    let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // 确保有www或没有www的一致性（优先无www）
    cleanDomain = cleanDomain.replace(/^www\./, '');

    return `https://www.${cleanDomain}`;
  }

  private toOfficialUrl(domain: string): string {
    const cleanDomain = this.extractDomain(domain);
    return cleanDomain ? `https://www.${cleanDomain}` : domain;
  }

  private parseDuckDuckGoResults(html: string): SearchResultCandidate[] {
    const $ = load(html);
    const results: SearchResultCandidate[] = [];
    const seen = new Set<string>();
    const pushResult = (
      href: string | undefined,
      title: string | undefined,
      snippet: string | undefined,
      domainText?: string
    ) => {
      const url = this.normalizeSearchResultUrl(href);
      if (!url) {
        return;
      }

      const normalizedTitle = (title || '').replace(/\s+/g, ' ').trim();
      const normalizedSnippet = (snippet || '').replace(/\s+/g, ' ').trim();
      const key = `${url}|${normalizedTitle}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      results.push({
        url,
        title: normalizedTitle,
        snippet: normalizedSnippet,
        domain: this.extractDomain(domainText || url),
      });
    };

    $('.result').each((_, element) => {
      const container = $(element);
      const link = container.find('a.result__a, h2 a[href], a[href]').first();
      pushResult(
        link.attr('href'),
        link.text(),
        container.find('.result__snippet, .result__body, .result__extras__snippet').first().text(),
        container.find('.result__url, .result__extras__url').first().text()
      );
    });

    if (!results.length) {
      $('a[href]').each((_, element) => {
        const link = $(element);
        pushResult(link.attr('href'), link.text(), link.parent().text());
      });
    }

    return results;
  }

  private normalizeSearchResultUrl(rawUrl?: string): string | undefined {
    if (!rawUrl) {
      return undefined;
    }

    const candidate = rawUrl.trim();
    if (!candidate) {
      return undefined;
    }

    try {
      const normalizedCandidate = candidate.startsWith('//') ? `https:${candidate}` : candidate;
      const parsed = new URL(normalizedCandidate, 'https://duckduckgo.com');
      const redirected = parsed.searchParams.get('uddg');
      if (redirected) {
        return decodeURIComponent(redirected);
      }

      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch {
      if (/^https?:\/\//i.test(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private extractDomain(domain?: string): string | undefined {
    if (!domain) return undefined;

    const candidate = domain.trim();
    if (!candidate) return undefined;

    try {
      const url = new URL(candidate.startsWith('http') ? candidate : `https://${candidate}`);
      return url.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return candidate
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
    }
  }

  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(inc|llc|corp|corporation|co|ltd|limited|gmbh|sa|bv|plc)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resultMentionsCompany(result: SearchResultCandidate, companyName: string): boolean {
    const normalizedCompany = this.normalizeCompanyName(companyName);
    const haystack = `${result.title} ${result.snippet} ${result.domain || ''}`.toLowerCase();
    return normalizedCompany
      .split(' ')
      .filter(token => token.length >= 3)
      .some(token => haystack.includes(token));
  }

  private domainMatchesCompany(domain: string, companyName: string): boolean {
    const normalizedName = this.normalizeCompanyName(companyName);
    const domainToken = this.extractDomain(domain)?.split('.')[0] || '';
    const nameTokens = normalizedName.split(' ').filter(token => token.length >= 4);

    return nameTokens.some(token => domainToken.includes(token) || token.includes(domainToken));
  }

  private sameDomainFamily(left: string, right: string): boolean {
    const leftDomain = this.extractDomain(left);
    const rightDomain = this.extractDomain(right);
    if (!leftDomain || !rightDomain) return false;

    const leftParts = leftDomain.split('.');
    const rightParts = rightDomain.split('.');
    return leftParts.slice(-2).join('.') === rightParts.slice(-2).join('.');
  }

  private extractLikelyEntityName(title: string): string {
    const segments = title
      .replace(/\s+/g, ' ')
      .split(/\s+[|:-]\s+/)
      .map(segment => segment.trim())
      .filter(Boolean);
    return segments[0] || title.trim();
  }

  private countTokenOverlap(left: string, right: string): number {
    const leftTokens = new Set(left.split(' ').filter(token => token.length >= 3));
    const rightTokens = new Set(right.split(' ').filter(token => token.length >= 3));
    let overlap = 0;

    for (const token of leftTokens) {
      if (rightTokens.has(token)) {
        overlap += 1;
      }
    }

    return overlap;
  }

  private extractLinkedInCompanySlug(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }

    const match = url.match(/linkedin\.com\/company\/([^/?#]+)/i);
    return match?.[1]?.toLowerCase();
  }

  private linkedinSlugMatchesCompany(slug: string, companyName: string): boolean {
    const normalizedSlug = slug.replace(/-/g, ' ');
    const normalizedCompany = this.normalizeCompanyName(companyName);
    return this.countTokenOverlap(normalizedSlug, normalizedCompany) >= 1;
  }

  private createEmptyResolution(companyName: string): IdentityResolution {
    return {
      canonicalName: companyName,
      normalizedName: this.normalizeCompanyName(companyName),
      officialUrl: undefined,
      linkedinSlug: undefined,
      country: undefined,
      city: undefined,
      confidence: 0,
      verdict: 'unverified',
      writebackAllowed: false,
      strongEvidenceCount: 0,
      evidence: [],
      blockingIssues: [],
    };
  }

  private pushEvidence(
    resolution: IdentityResolution,
    evidence: IdentityResolutionEvidence
  ): void {
    const exists = resolution.evidence.some(
      item => item.type === evidence.type && item.value === evidence.value
    );
    if (!exists) {
      resolution.evidence.push(evidence);
    }
  }

  private finalizeResolution(identity: CompanyIdentity): void {
    const totalScore = identity.resolution.evidence.reduce(
      (sum, item) => sum + item.scoreDelta,
      0
    );
    const normalizedConfidence = Math.max(0, Math.min(100, totalScore));
    const strongEvidenceCount = identity.resolution.evidence.filter(
      item => item.strength === 'strong' && item.scoreDelta > 0
    ).length;
    const hasBlockingIssues =
      identity.duplicateRisk === 'high' || identity.resolution.blockingIssues.length > 0;
    const hasOfficialAnchor = Boolean(identity.domain || identity.officialUrl);

    let verdict: IdentityResolution['verdict'] = 'unverified';
    if (!hasBlockingIssues && normalizedConfidence >= 75 && strongEvidenceCount >= 1) {
      verdict = 'verified';
    } else if (!hasBlockingIssues && normalizedConfidence >= 55 && hasOfficialAnchor) {
      verdict = 'probable';
    } else if (normalizedConfidence >= 35) {
      verdict = 'ambiguous';
    }

    identity.resolution = {
      ...identity.resolution,
      canonicalName: identity.displayName || identity.legalName || identity.inputName,
      normalizedName: this.normalizeCompanyName(
        identity.displayName || identity.legalName || identity.inputName
      ),
      officialDomain: identity.domain,
      officialUrl: identity.officialUrl,
      linkedinSlug: this.extractLinkedInCompanySlug(identity.linkedinUrl),
      country: identity.country,
      city: identity.city,
      confidence: normalizedConfidence,
      verdict,
      writebackAllowed:
        !hasBlockingIssues &&
        (verdict === 'verified' || (verdict === 'probable' && strongEvidenceCount >= 1)),
      strongEvidenceCount,
      blockingIssues: [...new Set(identity.resolution.blockingIssues)],
    };
    identity.identityConfidence = identity.resolution.confidence;
  }
}

// ==================== 第2步：官网优先抓取 ====================

/**
 * 官网联系方式抓取器
 * 优先顺序：Contact → Footer → About → Support → Quote → Privacy
 */
export class WebsiteContactScraper {
  // 页面优先级顺序
  private readonly pagePriority: Array<{ path: string; sourceType: ContactSourceType }> = [
    { path: '/contact', sourceType: 'official_contact_page' },
    { path: '/contact-us', sourceType: 'official_contact_page' },
    { path: '/contactus', sourceType: 'official_contact_page' },
    { path: '/footer', sourceType: 'official_footer' },
    { path: '/about', sourceType: 'official_about_page' },
    { path: '/about-us', sourceType: 'official_about_page' },
    { path: '/aboutus', sourceType: 'official_about_page' },
    { path: '/support', sourceType: 'official_service_page' },
    { path: '/service', sourceType: 'official_service_page' },
    { path: '/sales', sourceType: 'official_service_page' },
    { path: '/quote', sourceType: 'official_quote_page' },
    { path: '/rfq', sourceType: 'official_quote_page' },
    { path: '/request-quote', sourceType: 'official_quote_page' },
    { path: '/get-quote', sourceType: 'official_quote_page' },
    { path: '/inquiry', sourceType: 'official_inquiry_page' },
    { path: '/privacy', sourceType: 'official_policy_page' },
    { path: '/terms', sourceType: 'official_policy_page' },
  ];

  /**
   * 抓取官网联系方式
   */
  async scrapeWebsite(
    officialUrl: string,
    options: { checkForms?: boolean } = {}
  ): Promise<{
    phones: PhoneContact[];
    emails: EmailContact[];
    addresses: AddressContact[];
    forms: ContactForm[];
    capabilities: Capabilities | null;
  }> {
    const result = {
      phones: [] as PhoneContact[],
      emails: [] as EmailContact[],
      addresses: [] as AddressContact[],
      forms: [] as ContactForm[],
      capabilities: null as Capabilities | null,
    };

    if (!officialUrl) return result;

    // 1. 先抓取首页（最高优先级）
    const homepageData = await this.scrapePage(officialUrl, 'official_homepage', options);
    this.mergeContactData(result, homepageData);

    // 2. 按优先级抓取其他页面
    for (const { path, sourceType } of this.pagePriority) {
      const pageUrl = `${officialUrl}${path}`;
      const pageData = await this.scrapePage(pageUrl, sourceType, options);

      // 合并数据，避免重复
      this.mergeContactData(result, pageData);
    }

    // 3. 抓取能力页面（products, services, solutions等）
    const capabilitiesData = await this.scrapeCapabilities(officialUrl);
    if (capabilitiesData) {
      result.capabilities = capabilitiesData;
    }

    return result;
  }

  /**
   * 抓取单个页面
   */
  private async scrapePage(
    url: string,
    sourceType: ContactSourceType,
    options: { checkForms?: boolean } = {}
  ): Promise<{
    phones: PhoneContact[];
    emails: EmailContact[];
    addresses: AddressContact[];
    forms: ContactForm[];
  }> {
    const result = {
      phones: [] as PhoneContact[],
      emails: [] as EmailContact[],
      addresses: [] as AddressContact[],
      forms: [] as ContactForm[],
    };

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VertaxEnrich/1.0)' },
      });

      if (!response.ok) return result;

      const html = await response.text();

      // 提取电话
      const domSignals = this.buildPageDomSignals(html);
      const phones = this.extractPhones(html, domSignals);
      for (const phone of phones) {
        result.phones.push({
          value: phone,
          confidence: sourceType === 'official_homepage' ? 95 : 90,
          sources: [sourceType],
          type: 'main',
          isPrimary: result.phones.length === 0,
        });
      }

      // 提取邮箱
      const emails = this.extractEmails(html, domSignals);
      for (const email of emails) {
        const isRoleBased = this.isRoleBasedEmail(email);
        result.emails.push({
          value: email,
          confidence: sourceType === 'official_homepage' ? 95 : 90,
          sources: [sourceType],
          type: isRoleBased ? 'role' : 'personal',
          roleType: isRoleBased ? this.inferEmailRole(email) : undefined,
          isPrimary: result.emails.length === 0,
        });
      }

      // 提取地址
      const addresses = this.extractAddresses(html, domSignals);
      for (const addr of addresses) {
        result.addresses.push({
          value: addr.full,
          confidence: 85,
          sources: [sourceType],
          type: addr.type,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          postalCode: addr.postalCode,
          hasConflict: false,
          isPrimary: result.addresses.length === 0,
        });
      }

      // 检测联系表单
      if (options.checkForms !== false) {
        result.forms.push(...this.extractForms(url, sourceType, html, domSignals));
      }

      return result;
    } catch {
      return result;
    }
  }

  /**
   * 提取电话号码
   */
  private buildPageDomSignals(html: string): PageDomSignals {
    const $ = load(html);
    $('script, style, noscript').remove();

    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const telLinks = $('a[href^="tel:"]')
      .map((_, element) => ($(element).attr('href') || '').replace(/^tel:/i, '').trim())
      .get()
      .filter(Boolean);
    const mailtoLinks = $('a[href^="mailto:"]')
      .map((_, element) =>
        ($(element).attr('href') || '')
          .replace(/^mailto:/i, '')
          .replace(/\?.*$/, '')
          .trim()
      )
      .get()
      .filter(Boolean);
    const addressBlocks = $('address, [class], [id], [data-address]')
      .map((_, element) => {
        const node = $(element);
        const className = node.attr('class') || '';
        const id = node.attr('id') || '';
        const hasAddressSignal =
          element.tagName === 'address' ||
          /address|location|headquarter|head-office|office/i.test(`${className} ${id}`) ||
          node.attr('data-address') !== undefined;
        if (!hasAddressSignal) {
          return '';
        }

        return node.text().replace(/\s+/g, ' ').trim();
      })
      .get()
      .filter(Boolean);
    const forms = $('form')
      .map((_, element) => {
        const form = $(element);
        const fieldNames = form
          .find('input, textarea, select')
          .map((__, field) => {
            const input = $(field);
            return (
              input.attr('name') ||
              input.attr('id') ||
              input.attr('type') ||
              input.attr('aria-label') ||
              ''
            )
              .trim()
              .toLowerCase();
          })
          .get()
          .filter(Boolean);

        return {
          action: form.attr('action')?.trim(),
          descriptors: [
            form.attr('id'),
            form.attr('class'),
            form.attr('name'),
            form.attr('action'),
            form.attr('aria-label'),
          ]
            .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
            .map(value => value.trim().toLowerCase()),
          fieldNames,
        };
      })
      .get();

    return {
      textContent,
      telLinks,
      mailtoLinks,
      addressBlocks,
      forms,
    };
  }

  private extractPhones(html: string, domSignals?: PageDomSignals): string[] {
    const phones = [...(domSignals?.telLinks || [])];
    const searchSpaces = [domSignals?.textContent, html].filter(
      (value): value is string => typeof value === 'string' && Boolean(value)
    );

    // 严格北美电话格式（必须有分隔符）
    const strictPatterns = [
      /\(\d{3}\)[\s]*\d{3}[-.\s]\d{4}/g,
      /\d{3}[-.]\d{3}[-.]\d{4}/g,
      /\+1[\s]*\(?\d{3}\)?[\s]*\d{3}[-.\s]\d{4}/g,
    ];

    for (const searchSpace of searchSpaces) {
      for (const pattern of strictPatterns) {
        const matches = searchSpace.match(pattern) || [];
        for (const match of matches) {
          const phone = match.trim();
          const digits = phone.replace(/[^\d]/g, '');
          if (
            (digits.length === 10 || digits.length === 11) &&
            (phone.includes('-') || phone.includes('.') || phone.includes('(') || phone.startsWith('+'))
          ) {
            phones.push(phone);
          }
        }
      }
    }

    return [...new Set(phones)]
      .map(phone => phone.replace(/\s+/g, ' ').trim())
      .filter(phone => !phone.match(/^\d+$/) && !phone.match(/\d{4}-\d{2}-\d{2}/));
  }

  /**
   * 提取邮箱地址
   */
  private extractEmails(html: string, domSignals?: PageDomSignals): string[] {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = [
      ...(domSignals?.mailtoLinks || []),
      ...((domSignals?.textContent || html).match(emailPattern) || []),
      ...(html.match(emailPattern) || []),
    ];

    // 过滤无关邮箱
    const excludePatterns = [
      /@example\.com/i,
      /@test\.com/i,
      /@yourcompany\.com/i,
      /@domain\.com/i,
      /@email\.com/i,
      /@sentry\./i,
      /@analytics\./i,
      /noreply@/i,
      /no-reply@/i,
      /unsubscribe@/i,
      /error@/i,
      /error-lite@/i,
      /@duckduckgo\.com/i,
      /@google\.com/i,
      /@bing\.com/i,
      /@yahoo\.com/i,
      /@wordpress\./i,
      /@facebook\.com/i,
      /@twitter\.com/i,
      /@linkedin\.com/i,
      /@youtube\.com/i,
      /@instagram\.com/i,
      /sales@twmetals/i,  // 排除相似公司的邮箱
    ];

    return [...new Set(matches.map(email => email.toLowerCase()))].filter(
      email => !excludePatterns.some(p => p.test(email))
    );
  }

  /**
   * 判断是否为角色邮箱
   */
  private isRoleBasedEmail(email: string): boolean {
    const rolePrefixes = [
      'sales', 'info', 'contact', 'support', 'service',
      'help', 'admin', 'marketing', 'hr', 'careers',
      'quotes', 'quote', 'rfq', 'inquiry', 'enquiries',
      'orders', 'order', 'billing', 'accounts',
    ];

    const prefix = email.split('@')[0]?.toLowerCase();
    return rolePrefixes.includes(prefix);
  }

  /**
   * 推断邮箱角色类型
   */
  private inferEmailRole(email: string): 'sales' | 'info' | 'support' | 'service' | 'quotes' | 'rfq' | 'contact' | undefined {
    const prefix = email.split('@')[0]?.toLowerCase();

    const roleMap: Record<string, 'sales' | 'info' | 'support' | 'service' | 'quotes' | 'rfq' | 'contact'> = {
      'sales': 'sales',
      'info': 'info',
      'contact': 'contact',
      'support': 'support',
      'service': 'service',
      'help': 'support',
      'quotes': 'quotes',
      'quote': 'quotes',
      'rfq': 'rfq',
      'inquiry': 'contact',
      'enquiries': 'contact',
    };

    return roleMap[prefix];
  }

  /**
   * 提取地址
   */
  private extractAddresses(html: string, domSignals?: PageDomSignals): Array<{
    full: string;
    type: 'headquarters' | 'office' | 'warehouse' | 'service' | 'manufacturing' | 'unknown';
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }> {
    const addresses: Array<{
      full: string;
      type: 'headquarters' | 'office' | 'warehouse' | 'service' | 'manufacturing' | 'unknown';
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    }> = [];
    const seen = new Set<string>();
    const pushAddress = (rawValue: string) => {
      const normalized = rawValue.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
      if (!normalized || seen.has(normalized.toLowerCase())) {
        return;
      }

      if (
        normalized.includes('post type') ||
        normalized.includes('status-publish') ||
        !normalized.match(/\d{5}/)
      ) {
        return;
      }

      seen.add(normalized.toLowerCase());
      const match = normalized.match(
        /^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:,\s*(.+))?$/i
      );
      addresses.push({
        full: normalized,
        type: this.inferAddressType(normalized),
        street: match?.[1]?.trim(),
        city: match?.[2]?.trim(),
        state: match?.[3]?.trim(),
        postalCode: match?.[4]?.trim(),
        country: match?.[5]?.trim(),
      });
    };

    for (const addressBlock of domSignals?.addressBlocks || []) {
      pushAddress(addressBlock);
    }

    // 美国地址模式（严格要求有邮编）
    const strictPatterns = [
      // 带邮编格式: 8190 Nieman Road, Lenexa, KS 66214
      /\d+\s+[A-Z][a-zA-Z]+\s+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln)[,]\s*[A-Z][a-zA-Z\s]+[,]\s*[A-Z]{2}\s+\d{5}/gi,
    ];

    for (const pattern of strictPatterns) {
      const matches = html.match(pattern) || [];
      for (const match of matches) {
        const addr = match.trim();
        pushAddress(addr);
        // 排除WordPress CSS类名
        if (!addr.includes('post type') && !addr.includes('status-publish') && addr.match(/\d{5}/)) {
          addresses.push({
            full: addr,
            type: 'unknown',
          });
        }
      }
    }

    return addresses;
  }

  /**
   * 检测是否有联系表单
   */
  private extractForms(
    url: string,
    sourceType: ContactSourceType,
    html: string,
    domSignals?: PageDomSignals
  ): ContactForm[] {
    const forms: ContactForm[] = [];
    const domForms = domSignals?.forms || [];

    for (const form of domForms) {
      const context = [url, ...form.descriptors, form.action || ''].join(' ');
      const fieldNames = [...new Set(form.fieldNames)];
      if (fieldNames.length === 0 && !/contact|quote|rfq|inquiry|support|sales/i.test(context)) {
        continue;
      }

      forms.push({
        url,
        type: this.inferFormType(context),
        fields: fieldNames,
        requiresLogin: /login|signin|account/.test(context),
        source: sourceType,
      });
    }

    if (!forms.length && this.hasContactForm(html)) {
      forms.push({
        url,
        type: this.inferFormType(url),
        fields: this.detectFormFields(html),
        source: sourceType,
      });
    }

    return forms;
  }

  private inferAddressType(
    value: string
  ): 'headquarters' | 'office' | 'warehouse' | 'service' | 'manufacturing' | 'unknown' {
    const normalized = value.toLowerCase();
    if (normalized.includes('headquarter') || normalized.includes('hq')) return 'headquarters';
    if (normalized.includes('warehouse')) return 'warehouse';
    if (normalized.includes('service')) return 'service';
    if (normalized.includes('manufacturing') || normalized.includes('plant')) return 'manufacturing';
    if (normalized.includes('office')) return 'office';
    return 'unknown';
  }

  private hasContactForm(html: string): boolean {
    const formPatterns = [
      /<form[^>]*action[^>]*contact/i,
      /<form[^>]*id[^>]*contact/i,
      /<form[^>]*class[^>]*contact/i,
      /<input[^>]*type[^>]*email/i,
      /<input[^>]*name[^>]*email/i,
      /contact[-_]form/i,
      /request[-_]quote/i,
      /get[-_]quote/i,
    ];

    return formPatterns.some(p => p.test(html));
  }

  /**
   * 推断表单类型
   */
  private inferFormType(url: string): 'sales' | 'quote' | 'rfq' | 'inquiry' | 'support' | 'contact' | 'unknown' {
    if (url.includes('quote') || url.includes('rfq')) return 'quote';
    if (url.includes('sales')) return 'sales';
    if (url.includes('support') || url.includes('service')) return 'support';
    if (url.includes('inquiry')) return 'inquiry';
    if (url.includes('contact')) return 'contact';
    return 'unknown';
  }

  /**
   * 检测表单字段
   */
  private detectFormFields(html: string): string[] {
    const fields: string[] = [];

    const fieldPatterns = [
      { pattern: /<input[^>]*name[^>]*name/i, field: 'name' },
      { pattern: /<input[^>]*name[^>]*email/i, field: 'email' },
      { pattern: /<input[^>]*name[^>]*phone/i, field: 'phone' },
      { pattern: /<input[^>]*name[^>]*company/i, field: 'company' },
      { pattern: /<textarea[^>]*name[^>]*message/i, field: 'message' },
      { pattern: /<input[^>]*name[^>]*product/i, field: 'product' },
    ];

    for (const { pattern, field } of fieldPatterns) {
      if (pattern.test(html)) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * 合并联系方式数据
   */
  private mergeContactData(
    target: { phones: PhoneContact[]; emails: EmailContact[]; addresses: AddressContact[]; forms: ContactForm[] },
    source: { phones: PhoneContact[]; emails: EmailContact[]; addresses: AddressContact[]; forms: ContactForm[] }
  ): void {
    // 合并电话（去重）
    for (const phone of source.phones) {
      const existing = target.phones.find(p => p.value === phone.value);
      if (existing) {
        existing.sources.push(...phone.sources);
        existing.confidence = Math.max(existing.confidence, phone.confidence);
      } else {
        target.phones.push(phone);
      }
    }

    // 合并邮箱（去重）
    for (const email of source.emails) {
      const existing = target.emails.find(e => e.value === email.value);
      if (existing) {
        existing.sources.push(...email.sources);
        existing.confidence = Math.max(existing.confidence, email.confidence);
      } else {
        target.emails.push(email);
      }
    }

    // 合并地址（去重）
    for (const addr of source.addresses) {
      const existing = target.addresses.find(a => a.value === addr.value);
      if (existing) {
        existing.sources.push(...addr.sources);
        existing.confidence = Math.max(existing.confidence, addr.confidence);
      } else {
        target.addresses.push(addr);
      }
    }

    // 合并表单（去重）
    for (const form of source.forms) {
      if (!target.forms.some(f => f.url === form.url)) {
        target.forms.push(form);
      }
    }
  }

  /**
   * 抓取企业能力信息
   */
  private async scrapeCapabilities(officialUrl: string): Promise<Capabilities | null> {
    const capabilityPages = [
      '/products',
      '/services',
      '/solutions',
      '/capabilities',
      '/what-we-do',
      '/about',
    ];

    const keywords: string[] = [];
    const descriptions: string[] = [];
    const products: string[] = [];
    const markets: string[] = [];
    const sources: ContactSourceType[] = [];
    const sourceUrls: string[] = [];

    for (const pagePath of capabilityPages) {
      try {
        const pageUrl = `${officialUrl}${pagePath}`;
        const response = await fetch(pageUrl, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const html = await response.text();

        // 提取能力关键词
        const capabilityKeywords = this.extractCapabilityKeywords(html);
        keywords.push(...capabilityKeywords);

        // 提取产品/服务
        const productItems = this.extractProducts(html);
        products.push(...productItems);

        sources.push(this.mapCapabilityPageToSourceType(pagePath));
        sourceUrls.push(pageUrl);
      } catch {
        continue;
      }
    }

    if (keywords.length === 0) return null;

    return {
      keywords: [...new Set(keywords)],
      descriptions: [...new Set(descriptions)],
      products: [...new Set(products)],
      markets: [...new Set(markets)],
      sources,
      sourceUrls,
    };
  }

  /**
   * 提取能力关键词
   */
  private extractCapabilityKeywords(html: string): string[] {
    const keywords: string[] = [];

    // 常见工业能力关键词模式
    const patterns = [
      /robotic\s+(\w+)/gi,
      /automation\s+(\w+)/gi,
      /industrial\s+(\w+)/gi,
      /manufacturing\s+(\w+)/gi,
      /(\w+)\s+system/gi,
      /(\w+)\s+integration/gi,
      /(\w+)\s+equipment/gi,
      /(\w+)\s+solution/gi,
    ];

    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 3) {
          keywords.push(`${match[0]}`);
        }
      }
    }

    return keywords;
  }

  /**
   * 提取产品/服务
   */
  private extractProducts(html: string): string[] {
    const products: string[] = [];

    // 查找产品列表
    const productPatterns = [
      /<h[2-4][^>]*>(?:Our\s+)?(?:Products|Services|Solutions)[^<]*<\/h[2-4]>/gi,
    ];

    return products;
  }

  private mapCapabilityPageToSourceType(pagePath: string): ContactSourceType {
    if (pagePath === '/about') return 'official_about_page';
    return 'official_service_page';
  }
}

// ==================== 第3步：搜索语法邮箱查找 ====================

/**
 * 邮箱搜索器
 * 使用搜索语法查找公开邮箱
 */
export class EmailSearcher {
  /**
   * 搜索公开邮箱
   */
  async searchEmails(
    companyName: string,
    domain?: string,
    options: EmailSearchOptions = {}
  ): Promise<EmailContact[]> {
    const emails: EmailContact[] = [];
    const maxResults = Math.max(1, Math.min(options.maxResults ?? 10, 20));

    // 构建搜索查询
    const searchQueries = this.buildEmailSearchQueries(
      companyName,
      domain,
      options.language
    ).slice(0, Math.min(maxResults, 8));

    for (const query of searchQueries) {
      try {
        const searchResults = await this.executeSearch(query);
        for (const email of this.filterEmailCandidates(searchResults, domain)) {
          // 检查是否已存在
          const existing = emails.find(e => e.value === email.value);
          if (existing) {
            existing.sources.push(...email.sources);
            existing.confidence = Math.max(existing.confidence, email.confidence);
          } else {
            emails.push(email);
          }
        }

        if (emails.length >= maxResults) {
          break;
        }
      } catch {
        continue;
      }
    }

    const rankedEmails = this.rankEmails(emails).slice(0, maxResults);

    return options.validateMX
      ? this.attachMxSignals(rankedEmails)
      : rankedEmails;
  }

  /**
   * 构建邮箱搜索查询
   */
  private buildEmailSearchQueries(
    companyName: string,
    domain?: string,
    language?: string
  ): string[] {
    const queries: string[] = [];
    const normalizedLanguage = language?.toLowerCase() || '';

    // 基础查询
    queries.push(`"${companyName}" email`);
    queries.push(`"${companyName}" "sales@"`);
    queries.push(`"${companyName}" "info@"`);
    queries.push(`"${companyName}" "contact" "email"`);

    if (normalizedLanguage.startsWith('zh')) {
      queries.push(`"${companyName}" 邮箱`);
      queries.push(`"${companyName}" 联系方式`);
      queries.push(`"${companyName}" 销售 邮箱`);
    }

    // 基于域名的查询
    if (domain) {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      queries.push(`"${cleanDomain}" email`);
      queries.push(`site:${cleanDomain} "@${cleanDomain}"`);
      queries.push(`"@${cleanDomain}"`);
    }

    return queries;
  }

  /**
   * 执行搜索
   */
  private async executeSearch(query: string): Promise<EmailContact[]> {
    const emails: EmailContact[] = [];
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VertaxEnrich/1.0)' },
      });

      if (!response.ok) return emails;

      const html = await response.text();

      // 提取邮箱
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = html.match(emailPattern) || [];

      for (const email of matches) {
        const isRoleBased = this.isRoleBasedEmail(email);

        emails.push({
          value: email,
          confidence: 70, // 搜索结果置信度
          sources: ['search_result'],
          type: isRoleBased ? 'role' : 'unknown',
          roleType: isRoleBased ? this.inferEmailRole(email) : undefined,
          isPrimary: false,
        });
      }

      return emails;
    } catch {
      return emails;
    }
  }

  async inferRoleBasedEmails(
    domain: string,
    existingEmails: string[],
    options: { validateMX?: boolean; formTypes?: string[] } = {}
  ): Promise<EmailContact[]> {
    const cleanDomain = this.normalizeDomain(domain);
    if (!cleanDomain) {
      return [];
    }

    const existingSet = new Set(
      existingEmails.map(email => email.trim().toLowerCase()).filter(Boolean)
    );

    const rolePrefixes = ['sales', 'info', 'contact'];
    if (options.formTypes?.some(type => type === 'quote' || type === 'rfq' || type === 'sales')) {
      rolePrefixes.push('quotes', 'rfq');
    }

    const inferred = [...new Set(rolePrefixes)]
      .map(prefix => `${prefix}@${cleanDomain}`)
      .filter(email => !existingSet.has(email))
      .map(email => {
        const roleType = this.inferEmailRole(email);
        return {
          value: email,
          confidence: 35,
          sources: ['email_format_inferred'] as ContactSourceType[],
          type: 'role' as const,
          roleType,
          isPrimary: false,
          note: 'Inferred from a common public role-mailbox pattern on the official domain',
        };
      });

    return options.validateMX ? this.attachMxSignals(inferred) : inferred;
  }

  private isRoleBasedEmail(email: string): boolean {
    const rolePrefixes = ['sales', 'info', 'contact', 'support', 'service', 'quotes', 'rfq'];
    const prefix = email.split('@')[0]?.toLowerCase();
    return rolePrefixes.includes(prefix);
  }

  private inferEmailRole(email: string): 'sales' | 'info' | 'support' | 'service' | 'quotes' | 'rfq' | 'contact' | undefined {
    const prefix = email.split('@')[0]?.toLowerCase();
    const roleMap: Record<string, 'sales' | 'info' | 'support' | 'service' | 'quotes' | 'rfq' | 'contact'> = {
      'sales': 'sales', 'info': 'info', 'contact': 'contact',
      'support': 'support', 'service': 'service', 'quotes': 'quotes', 'rfq': 'rfq',
    };
    return roleMap[prefix];
  }

  private filterEmailCandidates(
    emails: EmailContact[],
    lockedDomain?: string
  ): EmailContact[] {
    return emails.filter(email => this.isUsableBusinessEmail(email.value, lockedDomain));
  }

  private isUsableBusinessEmail(email: string, lockedDomain?: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return false;
    }

    const [localPart, emailDomain] = normalizedEmail.split('@');
    if (!localPart || !emailDomain) {
      return false;
    }

    if (
      this.isConsumerEmailDomain(emailDomain) ||
      emailDomain === 'example.com' ||
      emailDomain === 'example.org' ||
      emailDomain === 'example.net'
    ) {
      return false;
    }

    if (
      ['noreply', 'no-reply', 'do-not-reply', 'donotreply', 'example'].includes(localPart)
    ) {
      return false;
    }

    if (lockedDomain) {
      return this.sameDomainFamily(emailDomain, lockedDomain);
    }

    return true;
  }

  private rankEmails(emails: EmailContact[]): EmailContact[] {
    return [...emails].sort((left, right) => {
      const leftRole = this.isRoleBasedEmail(left.value);
      const rightRole = this.isRoleBasedEmail(right.value);

      if (Number(rightRole) !== Number(leftRole)) {
        return Number(rightRole) - Number(leftRole);
      }

      return right.confidence - left.confidence;
    });
  }

  private async attachMxSignals(emails: EmailContact[]): Promise<EmailContact[]> {
    const mxCache = new Map<string, boolean>();
    const enriched = await Promise.all(
      emails.map(async email => {
        const domain = email.value.split('@')[1]?.toLowerCase();
        const mxValid = domain ? await this.hasMxRecords(domain, mxCache) : false;

        if (!mxValid) {
          return email;
        }

        const boost =
          email.sources.includes('email_format_inferred')
            ? 20
            : email.sources.includes('search_result')
              ? 8
              : 5;

        const maxConfidence = email.sources.includes('email_format_inferred') ? 55 : 85;

        return {
          ...email,
          mxValid: true,
          confidence: Math.min(maxConfidence, Math.max(email.confidence + boost, email.confidence)),
          sources: [...new Set<ContactSourceType>([...email.sources, 'mx_validated'])],
          note: email.note
            ? `${email.note}; MX records found for the email domain`
            : 'MX records found for the email domain',
        };
      })
    );

    return this.rankEmails(enriched);
  }

  private async hasMxRecords(
    domain: string,
    cache: Map<string, boolean>
  ): Promise<boolean> {
    if (cache.has(domain)) {
      return cache.get(domain) ?? false;
    }

    try {
      const records = await resolveMx(domain);
      const hasMx = records.length > 0;
      cache.set(domain, hasMx);
      return hasMx;
    } catch {
      cache.set(domain, false);
      return false;
    }
  }

  private normalizeDomain(value: string): string | null {
    try {
      const normalized = new URL(value.startsWith('http') ? value : `https://${value}`);
      return normalized.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return value
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .trim()
        .toLowerCase() || null;
    }
  }

  private sameDomainFamily(left: string, right: string): boolean {
    const normalize = (value: string) =>
      value
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
    const leftDomain = normalize(left);
    const rightDomain = normalize(right);
    const leftParts = leftDomain.split('.');
    const rightParts = rightDomain.split('.');

    if (leftParts.length < 2 || rightParts.length < 2) {
      return false;
    }

    return leftParts.slice(-2).join('.') === rightParts.slice(-2).join('.');
  }

  private isConsumerEmailDomain(domain: string): boolean {
    return [
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'icloud.com',
      'aol.com',
      'qq.com',
      '163.com',
      '126.com',
    ].includes(domain.toLowerCase());
  }

  /**
   * 推断企业邮箱格式
   */
  inferEmailFormat(domain: string, sampleEmails: string[]): {
    format: string;
    examples: string[];
  } | null {
    if (sampleEmails.length === 0) return null;

    // 分析现有邮箱格式
    const formats = sampleEmails.map(email => {
      const prefix = email.split('@')[0];
      if (prefix) {
        // 检测格式模式
        if (prefix.includes('.')) return 'first.last';
        if (prefix.includes('_')) return 'first_last';
        if (prefix.length <= 3) return 'abbreviation';
        return 'single_word';
      }
      return 'unknown';
    });

    // 取最常见的格式
    const mostCommonFormat = formats.sort((a, b) =>
      formats.filter(f => f === b).length - formats.filter(f => f === a).length
    )[0];

    return {
      format: mostCommonFormat,
      examples: sampleEmails.slice(0, 3),
    };
  }
}

type DeepEnrichOverrides = Partial<Omit<ContactEnrichmentQuery, 'companyName' | 'domain'>>;

/**
 * 联系方式补全整合引擎
 * 负责串联身份归一化、官网抓取、目录搜索、评分和 CRM 输出
 */
export class ContactEnrichmentEngine {
  constructor(
    private readonly identityNormalizer = new CompanyIdentityNormalizer(),
    private readonly websiteScraper = new WebsiteContactScraper(),
    private readonly emailSearcher = new EmailSearcher(),
    private readonly directorySearcher = new IndustryDirectorySearcher(),
    private readonly confidenceScorer = new ConfidenceScorer(),
    private readonly channelGenerator = new RecommendedChannelGenerator(),
    private readonly gapAnalyzer = new InformationGapAnalyzer(),
    private readonly complianceChecker = new ComplianceChecker()
  ) {}

  async deepEnrich(
    companyName: string,
    domain?: string,
    overrides: DeepEnrichOverrides = {}
  ): Promise<ContactEnrichmentResult> {
    const startedAt = Date.now();
    const query = this.buildQuery(companyName, domain, overrides);

    let identity = await this.identityNormalizer.normalize(query);

    const websiteData = identity.officialUrl
      ? await this.websiteScraper.scrapeWebsite(identity.officialUrl, {
          checkForms: query.options?.checkForms !== false,
        })
      : {
          phones: [] as PhoneContact[],
          emails: [] as EmailContact[],
          addresses: [] as AddressContact[],
          forms: [] as ContactForm[],
          capabilities: null as Capabilities | null,
        };

    const directoryData = query.options?.checkDirectories === false
      ? {
          phones: [] as PhoneContact[],
          emails: [] as EmailContact[],
          addresses: [] as AddressContact[],
          additionalInfo: {} as Record<string, unknown>,
        }
      : await this.directorySearcher.searchDirectory(
          query.companyName,
          query.options?.preferredDirectories,
          query.country,
        );

    const shouldMxValidateFallback =
      query.options?.validateMX === true &&
      !this.hasReliableBusinessEmail(
        [...websiteData.emails, ...directoryData.emails],
        identity.domain
      );

    const searchEmails = query.enrichTypes && !query.enrichTypes.includes('email')
      ? []
      : await this.emailSearcher.searchEmails(query.companyName, identity.domain, {
          maxResults: query.options?.maxResults,
          validateMX: shouldMxValidateFallback,
          language: query.options?.language,
        });

    const knownEmails = [...websiteData.emails, ...directoryData.emails, ...searchEmails];
    const inferredEmails =
      query.options?.inferEmailFormat &&
      identity.domain &&
      !this.hasReliableBusinessEmail(knownEmails, identity.domain)
        ? await this.emailSearcher.inferRoleBasedEmails(
            identity.domain,
            knownEmails.map(email => email.value),
            {
              validateMX: shouldMxValidateFallback,
              formTypes: websiteData.forms.map(form => form.type),
            }
          )
        : [];

    const phones = this.mergeContacts(websiteData.phones, directoryData.phones);
    const emails = this.mergeContacts(
      websiteData.emails,
      directoryData.emails,
      searchEmails,
      inferredEmails
    );
    const addresses = this.mergeContacts(websiteData.addresses, directoryData.addresses);
    const contactForms = websiteData.forms;
    const capabilities = websiteData.capabilities ?? this.buildDirectoryCapabilities(directoryData.additionalInfo);

    if (!identity.industry && typeof directoryData.additionalInfo.industry === 'string') {
      identity.industry = directoryData.additionalInfo.industry;
    }

    const emailDomainConsistency = this.evaluateEmailDomainConsistency(websiteData.emails, identity);

    identity = this.identityNormalizer.refine(identity, {
      hasOfficialWebsiteSignals:
        websiteData.phones.length > 0 ||
        websiteData.emails.length > 0 ||
        websiteData.addresses.length > 0 ||
        websiteData.forms.length > 0 ||
        Boolean(websiteData.capabilities?.keywords?.length),
      locationMatch: this.hasLocationMatch(query, addresses, identity),
      industryMatch: this.hasIndustryMatch(query, capabilities, identity),
      emailDomainMatch: emailDomainConsistency.match,
      conflictingEmailDomains: emailDomainConsistency.conflictingDomains,
      linkedinSlugMatch: this.hasLinkedInSlugMatch(identity),
    });

    const recommendedChannels = this.channelGenerator.generateRecommendedChannels(
      phones,
      emails,
      contactForms,
      identity.linkedinUrl
    );

    const highestContactConfidence = Math.max(
      0,
      ...phones.map(phone => phone.confidence),
      ...emails.map(email => email.confidence),
      ...recommendedChannels.map(channel => channel.confidence)
    );

    const completenessScore = this.confidenceScorer.calculateCompletenessScore({
      hasPhone: phones.length > 0,
      hasEmail: emails.length > 0,
      hasAddress: addresses.length > 0,
      hasIndustry: Boolean(identity.industry),
      hasCapabilities: Boolean(capabilities?.keywords?.length),
      hasContactForm: contactForms.length > 0,
    });

    const informationGaps = this.gapAnalyzer.analyzeGaps({
      hasPhone: phones.length > 0,
      hasEmail: emails.length > 0,
      hasAddress: addresses.length > 0,
      hasIndustry: Boolean(identity.industry),
      hasCapabilities: Boolean(capabilities?.keywords?.length),
      hasCapabilitiesMatchEvidence: Boolean(capabilities?.keywords?.length || capabilities?.descriptions?.length),
      primaryPhoneConfidence: phones[0]?.confidence ?? 0,
      primaryEmailConfidence: emails[0]?.confidence ?? 0,
    });

    const leadQualityScore = this.confidenceScorer.calculateLeadQualityScore({
      identityConfidence: identity.identityConfidence,
      completenessScore,
      highestContactConfidence,
      hasBusinessMatchEvidence: Boolean(capabilities?.keywords?.length || capabilities?.descriptions?.length),
      capabilitiesMatch: Boolean(capabilities?.keywords?.length),
      hasRecommendedChannel: recommendedChannels.length > 0,
    });

    const sourcesSummary = this.collectSources(
      phones,
      emails,
      addresses,
      contactForms,
      capabilities ?? undefined,
      identity.linkedinUrl
    );

    return {
      identity,
      phones,
      emails,
      addresses,
      contactForms,
      capabilities: capabilities ?? undefined,
      recommendedChannels,
      leadQualityScore,
      completenessScore,
      informationGaps,
      sourcesSummary,
      duration: Date.now() - startedAt,
      enrichedAt: new Date(),
    };
  }

  generateCRMOutput(result: ContactEnrichmentResult): CRMContactOutput {
    const primaryPhone = this.pickPrimary(result.phones);
    const primaryEmail = this.pickPrimary(result.emails);
    const allSources = this.collectSources(
      result.phones,
      result.emails,
      result.addresses,
      result.contactForms,
      result.capabilities,
      result.identity.linkedinUrl
    );
    const typedSources = allSources.filter(this.isContactSourceType);
    const bestChannel = result.recommendedChannels[0];
    const company = result.identity.displayName || result.identity.legalName || result.identity.inputName;

    return {
      company,
      company_name: company,
      domain: result.identity.domain || '',
      official_website: result.identity.officialUrl || '',
      primary_phone: primaryPhone
        ? {
            value: primaryPhone.value,
            confidence: primaryPhone.confidence,
            sources: [...primaryPhone.sources],
          }
        : undefined,
      primary_email: primaryEmail
        ? {
            value: primaryEmail.value,
            confidence: primaryEmail.confidence,
            sources: [...primaryEmail.sources],
            note: primaryEmail.note,
          }
        : undefined,
      addresses: result.addresses.map(address => ({
        value: address.value,
        confidence: address.confidence,
        source: address.sources[0] || 'unknown',
        note: address.note,
      })),
      industry: result.identity.industry,
      capabilities: result.capabilities?.keywords ?? [],
      recommended_contact: bestChannel ? `${bestChannel.type}: ${bestChannel.value}` : undefined,
      recommended_contact_channel: result.recommendedChannels.map(
        channel => `${channel.type}: ${channel.value}`
      ),
      lead_quality_score: result.leadQualityScore,
      data_sources: allSources,
      compliance_note: this.complianceChecker.generateComplianceNote(typedSources),
      information_gaps: result.informationGaps.map(gap => gap.description),
      enriched_at: result.enrichedAt.toISOString(),
    };
  }

  private buildQuery(
    companyName: string,
    domain?: string,
    overrides: DeepEnrichOverrides = {}
  ): ContactEnrichmentQuery {
    return {
      companyName,
      domain,
      country: overrides.country,
      state: overrides.state,
      city: overrides.city,
      industry: overrides.industry,
      depth: overrides.depth ?? 'deep',
      enrichTypes: overrides.enrichTypes ?? ['phone', 'email', 'address', 'form', 'capabilities'],
      options: {
        validateMX: false,
        checkForms: true,
        checkDirectories: true,
        checkSocialMedia: true,
        inferEmailFormat: false,
        maxResults: 10,
        ...overrides.options,
      },
    };
  }

  private hasLocationMatch(
    query: ContactEnrichmentQuery,
    addresses: AddressContact[],
    identity: CompanyIdentity
  ): boolean {
    const countryTargets = [query.country, identity.country].filter(
      (value): value is string => typeof value === 'string' && Boolean(value.trim())
    );
    const locationTokens = [
      query.state,
      query.city,
      identity.state,
      identity.city,
      ...countryTargets.map((value) => getCountryDisplayName(value) || value),
    ]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map(value => value.trim().toLowerCase());

    if (locationTokens.length === 0 || addresses.length === 0) {
      return false;
    }

    return addresses.some(address =>
      doesCountryMatchTargets(address.country, countryTargets) ||
      locationTokens.some(token =>
        [address.country, address.state, address.city]
          .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
          .some(value => value.trim().toLowerCase().includes(token) || token.includes(value.trim().toLowerCase()))
      )
    );
  }

  private hasIndustryMatch(
    query: ContactEnrichmentQuery,
    capabilities: Capabilities | null,
    identity: CompanyIdentity
  ): boolean {
    const signals = [
      query.industry,
      identity.industry,
      ...(capabilities?.keywords || []),
      ...(capabilities?.descriptions || []),
    ]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map(value => value.trim().toLowerCase());

    if (signals.length < 2) {
      return false;
    }

    const anchors = signals.slice(0, 2);
    return anchors.some(anchor =>
      signals.slice(2).some(signal => signal.includes(anchor) || anchor.includes(signal))
    );
  }

  private evaluateEmailDomainConsistency(
    emails: EmailContact[],
    identity: CompanyIdentity
  ): { match: boolean; conflictingDomains: string[] } {
    if (!identity.domain) {
      return { match: false, conflictingDomains: [] };
    }

    const domains = [...new Set(
      emails
        .map(email => email.value.split('@')[1]?.toLowerCase())
        .filter((value): value is string => typeof value === 'string' && Boolean(value))
        .filter(domain => !this.isConsumerEmailDomain(domain))
    )];

    const match = domains.some(domain => this.sameDomainFamily(domain, identity.domain!));
    const conflictingDomains = domains.filter(domain => !this.sameDomainFamily(domain, identity.domain!));
    return { match, conflictingDomains };
  }

  private hasLinkedInSlugMatch(identity: CompanyIdentity): boolean {
    if (!identity.linkedinUrl) {
      return false;
    }

    const slugMatch = identity.linkedinUrl.match(/linkedin\.com\/company\/([^/?#]+)/i);
    if (!slugMatch?.[1]) {
      return false;
    }

    const normalizedSlug = slugMatch[1].toLowerCase().replace(/-/g, ' ');
    const normalizedCompany = this.normalizeCompanyName(identity.displayName || identity.legalName || identity.inputName);
    return this.countTokenOverlap(normalizedSlug, normalizedCompany) >= 1;
  }

  private hasReliableBusinessEmail(
    emails: EmailContact[],
    lockedDomain?: string
  ): boolean {
    return emails.some(
      email =>
        email.confidence >= 70 &&
        this.isUsableBusinessEmail(email.value, lockedDomain)
    );
  }

  private isUsableBusinessEmail(email: string, lockedDomain?: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return false;
    }

    const [localPart, emailDomain] = normalizedEmail.split('@');
    if (!localPart || !emailDomain) {
      return false;
    }

    if (
      this.isConsumerEmailDomain(emailDomain) ||
      emailDomain === 'example.com' ||
      emailDomain === 'example.org' ||
      emailDomain === 'example.net'
    ) {
      return false;
    }

    if (
      ['noreply', 'no-reply', 'do-not-reply', 'donotreply', 'example'].includes(localPart)
    ) {
      return false;
    }

    if (lockedDomain) {
      return this.sameDomainFamily(emailDomain, lockedDomain);
    }

    return true;
  }

  private isConsumerEmailDomain(domain: string): boolean {
    return [
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'icloud.com',
      'aol.com',
    ].includes(domain.toLowerCase());
  }

  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(inc|llc|corp|corporation|co|ltd|limited|gmbh|sa|bv|plc)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private countTokenOverlap(left: string, right: string): number {
    const leftTokens = new Set(left.split(' ').filter(token => token.length >= 3));
    const rightTokens = new Set(right.split(' ').filter(token => token.length >= 3));
    let overlap = 0;

    for (const token of leftTokens) {
      if (rightTokens.has(token)) {
        overlap += 1;
      }
    }

    return overlap;
  }

  private sameDomainFamily(left: string, right: string): boolean {
    const normalize = (value: string) =>
      value
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
    const leftDomain = normalize(left);
    const rightDomain = normalize(right);
    const leftParts = leftDomain.split('.');
    const rightParts = rightDomain.split('.');
    if (leftParts.length < 2 || rightParts.length < 2) {
      return false;
    }

    return leftParts.slice(-2).join('.') === rightParts.slice(-2).join('.');
  }

  private buildDirectoryCapabilities(additionalInfo: Record<string, unknown>): Capabilities | null {
    const keywords = Array.isArray(additionalInfo.capabilities)
      ? additionalInfo.capabilities.filter((item): item is string => typeof item === 'string')
      : [];
    const descriptions = typeof additionalInfo.description === 'string'
      ? [additionalInfo.description]
      : [];

    if (keywords.length === 0 && descriptions.length === 0) {
      return null;
    }

    return {
      keywords,
      descriptions,
      sources: ['industry_directory'],
      sourceUrls: [],
    };
  }

  private mergeContacts<T extends {
    value: string;
    confidence: number;
    sources: ContactSourceType[];
    isPrimary?: boolean;
    note?: string;
    sourceUrls?: string[];
    mxValid?: boolean;
    emailVerified?: boolean;
    roleType?: string;
    type?: string;
  }>(
    ...groups: T[][]
  ): T[] {
    const merged = new Map<string, T>();

    for (const group of groups) {
      for (const item of group) {
        const existing = merged.get(item.value);
        if (!existing) {
          merged.set(item.value, {
            ...item,
            sources: [...item.sources],
          });
          continue;
        }

        existing.confidence = Math.max(existing.confidence, item.confidence);
        existing.sources = [...new Set([...existing.sources, ...item.sources])];

        if (existing.isPrimary === undefined) {
          existing.isPrimary = item.isPrimary;
        }

        if (item.sourceUrls?.length) {
          existing.sourceUrls = [
            ...new Set([...(existing.sourceUrls || []), ...item.sourceUrls]),
          ];
        }

        if (!existing.note && item.note) {
          existing.note = item.note;
        }

        if (item.mxValid) {
          existing.mxValid = true;
        }

        if (item.emailVerified) {
          existing.emailVerified = true;
        }

        if (!existing.roleType && item.roleType) {
          existing.roleType = item.roleType;
        }

        if ((existing.type === undefined || existing.type === 'unknown') && item.type) {
          existing.type = item.type;
        }
      }
    }

    return [...merged.values()].sort((a, b) => {
      if (Boolean(b.isPrimary) !== Boolean(a.isPrimary)) {
        return Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary));
      }
      return b.confidence - a.confidence;
    });
  }

  private collectSources(
    phones: PhoneContact[],
    emails: EmailContact[],
    addresses: AddressContact[],
    forms: ContactForm[],
    capabilities?: Capabilities,
    linkedinUrl?: string
  ): string[] {
    const sources = new Set<string>();

    for (const phone of phones) {
      for (const source of phone.sources) sources.add(source);
    }
    for (const email of emails) {
      for (const source of email.sources) sources.add(source);
    }
    for (const address of addresses) {
      for (const source of address.sources) sources.add(source);
    }
    for (const form of forms) {
      sources.add(form.source);
    }
    if (capabilities) {
      for (const source of capabilities.sources) sources.add(source);
    }
    if (linkedinUrl) {
      sources.add('official_linkedin');
    }

    return [...sources];
  }

  private pickPrimary<T extends { isPrimary?: boolean; confidence: number }>(items: T[]): T | undefined {
    return [...items].sort((a, b) => {
      if (Boolean(b.isPrimary) !== Boolean(a.isPrimary)) {
        return Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary));
      }
      return b.confidence - a.confidence;
    })[0];
  }

  private isContactSourceType(value: string): value is ContactSourceType {
    const allowedSources = new Set<ContactSourceType>([
      'official_contact_page',
      'official_footer',
      'official_about_page',
      'official_homepage',
      'official_service_page',
      'official_quote_page',
      'official_inquiry_page',
      'official_policy_page',
      'official_team_page',
      'official_linkedin',
      'official_facebook',
      'official_youtube',
      'industry_directory',
      'association_member',
      'chamber_member',
      'trade_show_exhibitor',
      'chamber_of_commerce',
      'bbb',
      'partner_page',
      'third_party_database',
      'email_format_inferred',
      'search_result',
      'mx_validated',
    ]);

    return allowedSources.has(value as ContactSourceType);
  }
}

export function createContactEnrichmentEngine(): ContactEnrichmentEngine {
  return new ContactEnrichmentEngine();
}

export async function enrichSingleCompany(
  companyName: string,
  domain?: string,
  overrides: DeepEnrichOverrides = {}
): Promise<ContactEnrichmentResult> {
  return createContactEnrichmentEngine().deepEnrich(companyName, domain, overrides);
}

export async function enrichCompanies(
  companies: Array<{ companyName: string; domain?: string; overrides?: DeepEnrichOverrides }>
): Promise<ContactEnrichmentResult[]> {
  const engine = createContactEnrichmentEngine();
  const results: ContactEnrichmentResult[] = [];

  for (const company of companies) {
    results.push(await engine.deepEnrich(company.companyName, company.domain, company.overrides));
  }

  return results;
}
