// ==================== 置信度评分器 ====================
// 实现100分制置信度评分体系

import type {
  ContactConfidenceScore,
  ContactSourceType,
  PhoneContact,
  EmailContact,
  RecommendedChannel,
  InformationGap,
  ComplianceResult,
} from './types';

// ==================== 置信度评分规则 ====================

/**
 * 置信度评分映射表
 * 基于来源类型自动计算置信度
 */
export const SOURCE_CONFIDENCE_MAP: Record<ContactSourceType, ContactConfidenceScore> = {
  'official_contact_page': 100,
  'official_footer': 90,
  'official_about_page': 85,
  'official_homepage': 95,
  'official_service_page': 85,
  'official_quote_page': 85,
  'official_inquiry_page': 85,
  'official_team_page': 80,
  'official_policy_page': 70,
  'official_linkedin': 80,
  'official_facebook': 80,
  'official_youtube': 80,
  'industry_directory': 70,
  'association_member': 70,
  'chamber_of_commerce': 70,
  'chamber_member': 70,
  'trade_show_exhibitor': 70,
  'bbb': 70,
  'partner_page': 75,
  'third_party_database': 50,
  'email_format_inferred': 30,
  'search_result': 60,
  'mx_validated': 85,
};

/**
 * 置信度评分器
 */
export class ConfidenceScorer {
  /**
   * 计算联系方式置信度
   */
  calculateConfidence(
    sources: ContactSourceType[],
    hasCrossValidation: boolean = false,
    appearsMultipleTimes: boolean = false
  ): ContactConfidenceScore {
    // 基础置信度取最高来源
    const baseConfidence = Math.max(
      ...sources.map(s => SOURCE_CONFIDENCE_MAP[s] || 50)
    );

    // 多来源交叉验证加分
    let finalConfidence = baseConfidence;

    if (hasCrossValidation) {
      finalConfidence = Math.min(100, finalConfidence + 10);
    }

    if (appearsMultipleTimes) {
      finalConfidence = Math.min(100, finalConfidence + 5);
    }

    // 降级处理
    if (sources.includes('email_format_inferred')) {
      finalConfidence = Math.min(finalConfidence, 30);
    }

    if (sources.includes('third_party_database') && sources.length === 1) {
      finalConfidence = Math.min(finalConfidence, 50);
    }

    return finalConfidence as ContactConfidenceScore;
  }

  /**
   * 生成置信度说明
   */
  generateConfidenceExplanation(confidence: ContactConfidenceScore): string {
    if (confidence >= 90) {
      return '高置信度：官网多处列出，来源可靠';
    }
    if (confidence >= 70) {
      return '中高置信度：官方来源或行业目录确认';
    }
    if (confidence >= 50) {
      return '中置信度：第三方数据源，需进一步验证';
    }
    if (confidence >= 30) {
      return '低置信度：推断得出，建议人工确认';
    }
    return '不可用：来源不可靠或合规问题';
  }

  /**
   * 计算数据完整性评分
   */
  calculateCompletenessScore(data: {
    hasPhone: boolean;
    hasEmail: boolean;
    hasAddress: boolean;
    hasIndustry: boolean;
    hasCapabilities: boolean;
    hasContactForm: boolean;
  }): number {
    const weights = {
      hasPhone: 20,
      hasEmail: 20,
      hasAddress: 15,
      hasIndustry: 10,
      hasCapabilities: 15,
      hasContactForm: 20,
    };

    let score = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (data[key as keyof typeof data]) {
        score += weight;
      }
    }

    return score;
  }

  /**
   * 计算线索质量评分
   */
  calculateLeadQualityScore(data: {
    identityConfidence: number;
    completenessScore: number;
    highestContactConfidence: number;
    hasBusinessMatchEvidence: boolean;
    capabilitiesMatch: boolean;
    hasRecommendedChannel: boolean;
  }): number {
    // 权重分配
    const weights = {
      identity: 0.15,
      completeness: 0.25,
      contactConfidence: 0.30,
      businessMatch: 0.15,
      capabilitiesMatch: 0.10,
      channel: 0.05,
    };

    let score = 0;

    score += data.identityConfidence * weights.identity;
    score += data.completenessScore * weights.completeness;
    score += data.highestContactConfidence * weights.contactConfidence;

    if (data.hasBusinessMatchEvidence) {
      score += 100 * weights.businessMatch;
    }

    if (data.capabilitiesMatch) {
      score += 100 * weights.capabilitiesMatch;
    }

    if (data.hasRecommendedChannel) {
      score += 100 * weights.channel;
    }

    return Math.round(score);
  }
}

// ==================== 推荐渠道生成器 ====================

/**
 * 推荐联系渠道生成器
 * 根据置信度和类型生成推荐联系顺序
 */
export class RecommendedChannelGenerator {
  /**
   * 生成推荐联系渠道
   */
  generateRecommendedChannels(
    phones: PhoneContact[],
    emails: EmailContact[],
    forms: { url: string; type: string }[],
    linkedinUrl?: string
  ): RecommendedChannel[] {
    const channels: RecommendedChannel[] = [];
    let priority = 1;

    // 1. 联系表单（优先，风险最低）
    for (const form of forms) {
      if (form.type === 'sales' || form.type === 'quote' || form.type === 'contact') {
        channels.push({
          type: 'form',
          value: form.url,
          confidence: 90,
          reason: '官方联系表单，意图明确',
          priority: priority++,
        });
      }
    }

    // 2. 角色邮箱（次优）
    for (const email of emails) {
      if (email.type === 'role' && email.confidence >= 70) {
        channels.push({
          type: 'email',
          value: email.value,
          confidence: email.confidence,
          reason: `${email.roleType || '商务'}邮箱，公开列出`,
          priority: priority++,
        });
      }
    }

    // 3. 总机电话
    for (const phone of phones) {
      if (phone.type === 'main' && phone.confidence >= 70) {
        channels.push({
          type: 'phone',
          value: phone.value,
          confidence: phone.confidence,
          reason: '公司总机，公开列出',
          priority: priority++,
        });
      }
    }

    // 4. LinkedIn（补充）
    if (linkedinUrl) {
      channels.push({
        type: 'linkedin',
        value: linkedinUrl,
        confidence: 80,
        reason: 'LinkedIn公司页，可用于背景了解',
        priority: priority++,
      });
    }

    // 按置信度和优先级排序
    channels.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });

    return channels;
  }

  /**
   * 生成最佳联系渠道
   */
  getBestChannel(channels: RecommendedChannel[]): RecommendedChannel | null {
    if (channels.length === 0) return null;
    return channels[0];
  }

  /**
   * 生成联系策略说明
   */
  generateContactStrategy(channels: RecommendedChannel[]): string {
    if (channels.length === 0) {
      return '未找到可靠联系渠道，建议人工搜索';
    }

    const bestChannel = channels[0];

    if (bestChannel.type === 'form') {
      return `建议通过官网表单提交意向，表单地址: ${bestChannel.value}`;
    }

    if (bestChannel.type === 'email') {
      return `建议发送商务邮件至 ${bestChannel.value}，邮件主题明确、内容专业`;
    }

    if (bestChannel.type === 'phone') {
      return `建议致电 ${bestChannel.value}，准备好公司介绍和合作意向`;
    }

    return `建议通过 ${bestChannel.type} 联系`;
  }
}

// ==================== 信息缺口识别器 ====================

/**
 * 信息缺口识别器
 * 识别缺失的关键信息
 */
export class InformationGapAnalyzer {
  /**
   * 识别信息缺口
   */
  analyzeGaps(data: {
    hasPhone: boolean;
    hasEmail: boolean;
    hasAddress: boolean;
    hasIndustry: boolean;
    hasCapabilities: boolean;
    hasCapabilitiesMatchEvidence: boolean;
    primaryPhoneConfidence: number;
    primaryEmailConfidence: number;
  }): InformationGap[] {
    const gaps: InformationGap[] = [];

    // 1. 电话缺失或低置信度
    if (!data.hasPhone) {
      gaps.push({
        type: 'phone',
        description: '未找到公司电话',
        importance: 'high',
        suggestedAction: '搜索行业目录、展会名录或LinkedIn',
      });
    } else if (data.primaryPhoneConfidence < 50) {
      gaps.push({
        type: 'phone',
        description: '电话置信度较低',
        importance: 'medium',
        suggestedAction: '人工验证电话是否有效',
      });
    }

    // 2. 邮箱缺失或低置信度
    if (!data.hasEmail) {
      gaps.push({
        type: 'email',
        description: '未找到公司邮箱',
        importance: 'high',
        suggestedAction: '检查官网联系表单或推断邮箱格式',
      });
    } else if (data.primaryEmailConfidence < 50) {
      gaps.push({
        type: 'email',
        description: '邮箱置信度较低',
        importance: 'medium',
        suggestedAction: '验证MX记录或人工确认',
      });
    }

    // 3. 地址缺失
    if (!data.hasAddress) {
      gaps.push({
        type: 'address',
        description: '未找到公司地址',
        importance: 'medium',
        suggestedAction: '查询LinkedIn公司页或公开企业注册数据库',
      });
    }

    // 4. 行业信息缺失
    if (!data.hasIndustry) {
      gaps.push({
        type: 'industry',
        description: '未确定企业所属行业',
        importance: 'medium',
        suggestedAction: '查询LinkedIn公司页或官网About页面',
      });
    }

    // 5. 能力信息缺失
    if (!data.hasCapabilities) {
      gaps.push({
        type: 'capabilities',
        description: '未找到企业能力/产品信息',
        importance: 'medium',
        suggestedAction: '访问官网Products/Services/Solutions页面',
      });
    }

    // 6. 业务匹配证据缺失
    if (!data.hasCapabilitiesMatchEvidence) {
      gaps.push({
        type: 'business_match',
        description: '业务匹配仅为假设，缺乏证据',
        importance: 'high',
        suggestedAction: '深入调研官网业务介绍、客户案例、产品列表',
      });
    }

    // 按重要性排序
    gaps.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.importance] - order[b.importance];
    });

    return gaps;
  }

  /**
   * 生成缺口摘要
   */
  generateGapSummary(gaps: InformationGap[]): string {
    if (gaps.length === 0) {
      return '信息完整，无明显缺口';
    }

    const highGaps = gaps.filter(g => g.importance === 'high');
    const mediumGaps = gaps.filter(g => g.importance === 'medium');

    let summary = '';

    if (highGaps.length > 0) {
      summary += `重要缺口(${highGaps.length}): ${highGaps.map(g => g.description).join(', ')}。`;
    }

    if (mediumGaps.length > 0) {
      summary += `次要缺口(${mediumGaps.length}): ${mediumGaps.map(g => g.description).join(', ')}。`;
    }

    return summary;
  }
}

// ==================== 合规边界检查器 ====================

/**
 * 合规边界检查器
 * 检查数据来源是否符合合规要求
 */
export class ComplianceChecker {
  /**
   * 检查来源合规性
   */
  checkSourceCompliance(source: ContactSourceType): ComplianceResult {
    const compliantSources: ContactSourceType[] = [
      'official_contact_page',
      'official_footer',
      'official_about_page',
      'official_homepage',
      'official_service_page',
      'official_quote_page',
      'official_inquiry_page',
      'official_team_page',
      'official_linkedin',
      'official_facebook',
      'official_youtube',
      'industry_directory',
      'chamber_member',
      'trade_show_exhibitor',
      'bbb',
      'partner_page',
    ];

    const borderlineSources: ContactSourceType[] = [
      'third_party_database',
      'search_result',
      'email_format_inferred',
    ];

    if (compliantSources.includes(source)) {
      return {
        source,
        compliance: 'compliant',
        reason: '公开合法来源',
        usable: true,
      };
    }

    if (borderlineSources.includes(source)) {
      return {
        source,
        compliance: 'borderline',
        reason: '第三方或推断来源，需标注置信度',
        usable: true,
        usageNote: '建议标注来源并降低置信度，人工确认后再使用',
      };
    }

    return {
      source,
      compliance: 'non_compliant',
      reason: '来源不可靠或涉及隐私风险',
      usable: false,
    };
  }

  /**
   * 批量检查合规性
   */
  checkAllSourcesCompliance(sources: ContactSourceType[]): {
    compliant: ContactSourceType[];
    borderline: ContactSourceType[];
    nonCompliant: ContactSourceType[];
  } {
    const result = {
      compliant: [] as ContactSourceType[],
      borderline: [] as ContactSourceType[],
      nonCompliant: [] as ContactSourceType[],
    };

    for (const source of sources) {
      const check = this.checkSourceCompliance(source);
      if (check.compliance === 'compliant') {
        result.compliant.push(source);
      } else if (check.compliance === 'borderline') {
        result.borderline.push(source);
      } else {
        result.nonCompliant.push(source);
      }
    }

    return result;
  }

  /**
   * 生成合规标注
   */
  generateComplianceNote(sources: ContactSourceType[]): string {
    const check = this.checkAllSourcesCompliance(sources);

    if (check.nonCompliant.length > 0) {
      return `包含不可用来源: ${check.nonCompliant.join(', ')}，已排除`;
    }

    if (check.borderline.length > 0) {
      return `部分来源为第三方或推断: ${check.borderline.join(', ')}，已标注置信度`;
    }

    return '所有来源均为公开合法渠道';
  }
}
