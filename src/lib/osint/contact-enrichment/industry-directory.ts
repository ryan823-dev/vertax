// ==================== 行业目录数据源适配器 ====================
// 查询The Fabricator、Thomasnet、LinkedIn等公开行业目录

import type {
  ContactSourceType,
  PhoneContact,
  EmailContact,
  AddressContact,
  CompanyIdentity,
} from './types';
import { getCountryDisplayName } from '@/lib/radar/country-utils';

// ==================== 行业目录配置 ====================

/**
 * 行业目录配置
 */
type IndustryDirectoryConfig = {
  name: string;
  url: string;
  category: string;
  industries: string[];
};

export const INDUSTRY_DIRECTORY_CONFIGS: Record<string, IndustryDirectoryConfig> = {
  // 制造业目录
  the_fabricator: {
    name: 'The Fabricator',
    url: 'https://www.thefabricator.com',
    category: 'manufacturing',
    industries: ['metalworking', 'fabrication', 'welding'],
  },

  thomasnet: {
    name: 'Thomasnet',
    url: 'https://www.thomasnet.com',
    category: 'manufacturing',
    industries: ['industrial', 'manufacturing', 'automation'],
  },

  how_to_robot: {
    name: 'HowToRobot',
    url: 'https://www.howtorobot.com',
    category: 'automation',
    industries: ['robotics', 'automation', 'integration'],
  },

  // 通用商业目录
  manta: {
    name: 'Manta',
    url: 'https://www.manta.com',
    category: 'general',
    industries: ['*'],
  },

  kompass: {
    name: 'Kompass',
    url: 'https://www.kompass.com',
    category: 'general',
    industries: ['*'],
  },

  bbb: {
    name: 'Better Business Bureau',
    url: 'https://www.bbb.org',
    category: 'general',
    industries: ['*'],
  },

  // 社交媒体
  linkedin: {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com',
    category: 'social',
    industries: ['*'],
  },

  facebook: {
    name: 'Facebook',
    url: 'https://www.facebook.com',
    category: 'social',
    industries: ['*'],
  },

  // 展会目录
  automate: {
    name: 'Automate Show',
    url: 'https://www.automateshow.com',
    category: 'trade_show',
    industries: ['automation', 'robotics'],
  },

  fabtech: {
    name: 'FABTECH',
    url: 'https://www.fabtechexpo.com',
    category: 'trade_show',
    industries: ['fabrication', 'metalworking', 'welding'],
  },

  // 合作伙伴目录
  fanuc_partner: {
    name: 'FANUC Integrators',
    url: 'https://www.fanuc.com',
    category: 'partner',
    industries: ['robotics', 'automation'],
  },

  motoman_partner: {
    name: 'Yaskawa/Motoman Partners',
    url: 'https://www.motoman.com',
    category: 'partner',
    industries: ['robotics', 'automation'],
  },

  abb_partner: {
    name: 'ABB Partners',
    url: 'https://www.abb.com',
    category: 'partner',
    industries: ['robotics', 'automation'],
  },
};

// ==================== 行业目录查询器 ====================

/**
 * 行业目录查询器
 */
export class IndustryDirectorySearcher {
  /**
   * 查询行业目录
   */
  async searchDirectory(
    companyName: string,
    directories: string[] = ['the_fabricator', 'thomasnet', 'linkedin'],
    country?: string
  ): Promise<{
    phones: PhoneContact[];
    emails: EmailContact[];
    addresses: AddressContact[];
    additionalInfo: Record<string, unknown>;
  }> {
    const result = {
      phones: [] as PhoneContact[],
      emails: [] as EmailContact[],
      addresses: [] as AddressContact[],
      additionalInfo: {} as Record<string, unknown>,
    };

    for (const dirKey of directories) {
      const config = INDUSTRY_DIRECTORY_CONFIGS[dirKey];
      if (!config) continue;

      try {
        const searchQuery = this.buildDirectorySearchQuery(companyName, config, country);
        const searchResults = await this.executeSearch(searchQuery);

        for (const item of searchResults) {
          // 合并电话
          if (item.phone) {
            result.phones.push({
              value: item.phone,
              confidence: 70,
              sources: ['industry_directory'],
              type: 'main',
              isPrimary: false,
            });
          }

          // 合并邮箱
          if (item.email) {
            result.emails.push({
              value: item.email,
              confidence: 75,
              sources: ['industry_directory'],
              type: 'role',
              roleType: 'sales',
              isPrimary: false,
            });
          }

          // 合并地址
          if (item.address) {
            result.addresses.push({
              value: item.address,
              confidence: 70,
              sources: ['industry_directory'],
              type: 'headquarters',
              hasConflict: false,
              isPrimary: false,
            });
          }

          // 合并其他信息
          if (item.industry) {
            result.additionalInfo.industry = item.industry;
          }
          if (item.description) {
            result.additionalInfo.description = item.description;
          }
          if (item.capabilities) {
            result.additionalInfo.capabilities = item.capabilities;
          }
        }
      } catch {
        continue;
      }
    }

    return result;
  }

  /**
   * 构建目录搜索查询
   */
  private buildDirectorySearchQuery(
    companyName: string,
    config: IndustryDirectoryConfig,
    country?: string
  ): string {
    const countryName = getCountryDisplayName(country);
    return [companyName, countryName, `site:${config.url.replace('https://www.', '')}`]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * 执行搜索
   */
  private async executeSearch(query: string): Promise<Array<{
    phone?: string;
    email?: string;
    address?: string;
    industry?: string;
    description?: string;
    capabilities?: string[];
  }>> {
    const results: Array<{
      phone?: string;
      email?: string;
      address?: string;
      industry?: string;
      description?: string;
      capabilities?: string[];
    }> = [];

    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VertaxEnrich/1.0)' },
      });

      if (!response.ok) return results;

      const html = await response.text();

      // 提取电话
      const phonePattern = /\+?[1-9]\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g;
      const phoneMatches = html.match(phonePattern) || [];
      if (phoneMatches[0]) {
        results.push({ phone: phoneMatches[0] });
      }

      // 提取邮箱

      // 提取行业关键词
      const industryKeywords = this.extractIndustryKeywords(html);
      if (industryKeywords.length > 0) {
        results.push({ capabilities: industryKeywords });
      }

      return results;
    } catch {
      return results;
    }
  }

  /**
   * 提取行业关键词
   */
  private extractIndustryKeywords(html: string): string[] {
    const keywords: string[] = [];

    const patterns = [
      /robotic\s+(\w+)/gi,
      /automation\s+(\w+)/gi,
      /industrial\s+(\w+)/gi,
      /welding/gi,
      /fabrication/gi,
      /manufacturing/gi,
      /integration/gi,
      /assembly/gi,
      /material\s+handling/gi,
      /machine\s+tending/gi,
      /palletizing/gi,
      /painting/gi,
      /coating/gi,
    ];

    for (const pattern of patterns) {
      const matches = html.match(pattern) || [];
      keywords.push(...matches.map(m => m.trim()));
    }

    return [...new Set(keywords)];
  }

  /**
   * 查询LinkedIn公司页
   */
  async searchLinkedIn(companyName: string): Promise<{
    url?: string;
    industry?: string;
    headquarters?: string;
    employeeCount?: string;
    description?: string;
    specialties?: string[];
  } | null> {
    const searchQuery = `${companyName} site:linkedin.com/company`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;

      const html = await response.text();

      // 提取LinkedIn URL
      const linkedinPattern = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+/gi;
      const linkedinMatches = html.match(linkedinPattern);

      if (!linkedinMatches) return null;

      const result = {
        url: linkedinMatches[0],
        industry: this.extractLinkedInIndustry(html),
        headquarters: this.extractLinkedInHQ(html),
        employeeCount: this.extractLinkedInEmployees(html),
        description: this.extractLinkedInDescription(html),
        specialties: this.extractLinkedInSpecialties(html),
      };

      return result;
    } catch {
      return null;
    }
  }

  private extractLinkedInIndustry(html: string): string | undefined {
    const industryPattern = /industry[:\s]+([a-zA-Z\s]+)/i;
    const match = html.match(industryPattern);
    return match?.[1]?.trim();
  }

  private extractLinkedInHQ(html: string): string | undefined {
    const hqPattern = /headquarters[:\s]+([a-zA-Z\s,]+)/i;
    const match = html.match(hqPattern);
    return match?.[1]?.trim();
  }

  private extractLinkedInEmployees(html: string): string | undefined {
    const empPattern = /(\d+[,\d]*\s*employees)/i;
    const match = html.match(empPattern);
    return match?.[1]?.trim();
  }

  private extractLinkedInDescription(html: string): string | undefined {
    return undefined;
  }

  private extractLinkedInSpecialties(html: string): string[] {
    const specialties: string[] = [];
    const specPattern = /specialties[:\s]+([a-zA-Z\s,]+)/i;
    const match = html.match(specPattern);
    if (match) {
      specialties.push(...match[1].split(',').map(s => s.trim()));
    }
    return specialties;
  }

  /**
   * 查询Facebook商业页面
   */
  async searchFacebook(companyName: string): Promise<{
    url?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null> {
    const searchQuery = `${companyName} site:facebook.com`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;

      const html = await response.text();

      // 提取Facebook URL
      const fbPattern = /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.-]+/gi;
      const fbMatches = html.match(fbPattern);

      if (!fbMatches) return null;

      // 提取联系方式
      const result = {
        url: fbMatches[0],
        phone: this.extractPhone(html),
        email: this.extractEmail(html),
        address: this.extractAddress(html),
      };

      return result;
    } catch {
      return null;
    }
  }

  private extractPhone(html: string): string | undefined {
    const phonePattern = /\+?[1-9]\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g;
    const match = html.match(phonePattern);
    return match?.[0];
  }

  private extractEmail(html: string): string | undefined {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const match = html.match(emailPattern);
    return match?.[0];
  }

  private extractAddress(html: string): string | undefined {
    return undefined;
  }
}

