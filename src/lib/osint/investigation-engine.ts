// ==================== 企业背调调查引擎 ====================
// 整合所有层级，执行完整的企业背调流程

import type {
  CompanyInvestigationQuery,
  CompanyInvestigationReport,
  OSINTLayer,
  OSINTSourceConfig,
} from './types';

import {
  IdentityLayerAggregator,
  RegistrationLayerAggregator,
  AssociationLayerAggregator,
  RiskLayerAggregator,
  BusinessLayerAggregator,
} from './sources';

// ==================== 调查引擎配置 ====================

/**
 * 默认数据源配置
 */
const DEFAULT_SOURCE_CONFIGS: Record<string, OSINTSourceConfig> = {
  // 身份层
  website_verify: {
    code: 'website_verify',
    name: '官网验证',
    layer: 'IDENTITY',
    reliability: 'PUBLIC',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },
  whois: {
    code: 'whois',
    name: 'Whois域名查询',
    layer: 'IDENTITY',
    reliability: 'OFFICIAL',
    coveredCountries: ['*'],
    requiresApiKey: true,
    timeout: 10000,
    rateLimit: { requests: 30, windowMs: 60000 },
  },
  linkedin_company: {
    code: 'linkedin_company',
    name: 'LinkedIn企业搜索',
    layer: 'IDENTITY',
    reliability: 'PUBLIC',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },

  // 注册层
  opencorporates: {
    code: 'opencorporates',
    name: 'OpenCorporates',
    layer: 'REGISTRATION',
    reliability: 'OFFICIAL',
    coveredCountries: ['*'],
    requiresApiKey: true,
    timeout: 15000,
    rateLimit: { requests: 30, windowMs: 60000 },
    docUrl: 'https://api.opencorporates.com/documentation/API_reference',
  },
  companies_house: {
    code: 'companies_house',
    name: 'Companies House (英国)',
    layer: 'REGISTRATION',
    reliability: 'OFFICIAL',
    coveredCountries: ['GB'],
    requiresApiKey: true,
    timeout: 15000,
    rateLimit: { requests: 100, windowMs: 60000 },
    docUrl: 'https://developer.company-information.service.gov.uk/api/docs',
  },

  // 关联层
  shareholder_analysis: {
    code: 'shareholder_analysis',
    name: '股权穿透分析',
    layer: 'ASSOCIATION',
    reliability: 'INFERRED',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },
  officer_analysis: {
    code: 'officer_analysis',
    name: '高管关联分析',
    layer: 'ASSOCIATION',
    reliability: 'INFERRED',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },

  // 风险层
  sanctions_list: {
    code: 'sanctions_list',
    name: '制裁名单查询',
    layer: 'RISK',
    reliability: 'OFFICIAL',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 20, windowMs: 60000 },
  },
  adverse_media: {
    code: 'adverse_media',
    name: '负面新闻舆情',
    layer: 'RISK',
    reliability: 'INFERRED',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },

  // 经营层
  customs_data: {
    code: 'customs_data',
    name: '海关进出口数据',
    layer: 'BUSINESS',
    reliability: 'COMMERCIAL',
    coveredCountries: ['*'],
    requiresApiKey: true,
    timeout: 15000,
    rateLimit: { requests: 30, windowMs: 60000 },
  },
  tender_data: {
    code: 'tender_data',
    name: '招投标数据',
    layer: 'BUSINESS',
    reliability: 'PUBLIC',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },
  business_news: {
    code: 'business_news',
    name: '经营新闻动态',
    layer: 'BUSINESS',
    reliability: 'INFERRED',
    coveredCountries: ['*'],
    requiresApiKey: false,
    timeout: 15000,
    rateLimit: { requests: 10, windowMs: 60000 },
  },
};

// ==================== 调查引擎 ====================

/**
 * 企业背调调查引擎
 * 执行完整的多层级企业背调流程
 */
class CompanyInvestigationEngine {
  private identityAggregator = new IdentityLayerAggregator();
  private registrationAggregator = new RegistrationLayerAggregator();
  private associationAggregator = new AssociationLayerAggregator();
  private riskAggregator = new RiskLayerAggregator();
  private businessAggregator = new BusinessLayerAggregator();

  private sourceConfigs: Record<string, OSINTSourceConfig>;

  constructor(customConfigs?: Record<string, OSINTSourceConfig>) {
    this.sourceConfigs = { ...DEFAULT_SOURCE_CONFIGS, ...customConfigs };
    this.initializeAggregators();
  }

  /**
   * 初始化所有聚合器
   */
  private initializeAggregators(): void {
    // 身份层
    this.identityAggregator.initialize({
      website_verify: this.sourceConfigs.website_verify,
      whois: this.sourceConfigs.whois,
      linkedin_company: this.sourceConfigs.linkedin_company,
    });

    // 注册层
    this.registrationAggregator.initialize({
      opencorporates: this.sourceConfigs.opencorporates,
      companies_house: this.sourceConfigs.companies_house,
    });

    // 关联层
    this.associationAggregator.initialize({
      shareholder_analysis: this.sourceConfigs.shareholder_analysis,
      officer_analysis: this.sourceConfigs.officer_analysis,
    });

    // 风险层
    this.riskAggregator.initialize({
      sanctions_list: this.sourceConfigs.sanctions_list,
      adverse_media: this.sourceConfigs.adverse_media,
    });

    // 经营层
    this.businessAggregator.initialize({
      customs_data: this.sourceConfigs.customs_data,
      tender_data: this.sourceConfigs.tender_data,
      business_news: this.sourceConfigs.business_news,
    });
  }

  /**
   * 执行企业背调
   */
  async investigate(query: CompanyInvestigationQuery): Promise<CompanyInvestigationReport> {
    const startTime = Date.now();
    const reportId = `invest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 确定要执行的层级
    const layers = query.layers || this.determineLayers(query);

    // 创建报告骨架
    const report: CompanyInvestigationReport = {
      id: reportId,
      query,
      generatedAt: new Date(),
      duration: 0,
      authenticityScore: 0,
      overallRisk: 'CLEAR',
      keyFindings: [],
      suspiciousSignals: [],
      recommendations: [],
      dataSources: [],
    };

    // 按层级顺序执行调查
    // 1. 身份层（验证企业身份）
    if (layers.includes('IDENTITY')) {
      report.identity = await this.identityAggregator.investigate(query);
      report.dataSources.push('identity_layer');
      this.extractIdentityFindings(report);
    }

    // 2. 注册层（获取法定信息）
    if (layers.includes('REGISTRATION')) {
      report.registration = await this.registrationAggregator.investigate(query);
      report.dataSources.push('registration_layer');
      this.extractRegistrationFindings(report);
    }

    // 3. 关联层（穿透股权和高管）
    if (layers.includes('ASSOCIATION')) {
      report.association = await this.associationAggregator.investigate(
        query,
        report.registration?.primary
      );
      report.dataSources.push('association_layer');
      this.extractAssociationFindings(report);
    }

    // 4. 风险层（扫描风险信息）
    if (layers.includes('RISK')) {
      report.risk = await this.riskAggregator.investigate(query);
      report.dataSources.push('risk_layer');
      this.extractRiskFindings(report);
    }

    // 5. 经营层（验证业务真实性）
    if (layers.includes('BUSINESS')) {
      report.business = await this.businessAggregator.investigate(query);
      report.dataSources.push('business_layer');
      this.extractBusinessFindings(report);
    }

    // 计算综合评分
    report.authenticityScore = this.calculateAuthenticityScore(report);
    report.overallRisk = this.determineOverallRisk(report);
    report.duration = Date.now() - startTime;

    // 生成建议
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * 根据调查深度确定执行层级
   */
  private determineLayers(query: CompanyInvestigationQuery): OSINTLayer[] {
    switch (query.depth) {
      case 'BASIC':
        return ['IDENTITY', 'REGISTRATION'];
      case 'STANDARD':
        return ['IDENTITY', 'REGISTRATION', 'RISK'];
      case 'DEEP':
        return ['IDENTITY', 'REGISTRATION', 'ASSOCIATION', 'RISK', 'BUSINESS'];
      default:
        return ['IDENTITY', 'REGISTRATION', 'RISK'];
    }
  }

  /**
   * 提取身份层发现
   */
  private extractIdentityFindings(report: CompanyInvestigationReport): void {
    if (!report.identity) return;

    // 官网验证
    if (report.identity.website) {
      if (report.identity.website.status === 'ACTIVE') {
        report.keyFindings.push({
          type: 'POSITIVE',
          category: '身份验证',
          title: '官网正常运行',
          description: `官网 ${report.identity.website.url} 正常运行，SSL有效`,
          source: 'website_verify',
        });
      } else {
        report.suspiciousSignals.push(`官网状态异常: ${report.identity.website.status}`);
      }

      if (report.identity.website.contactInfo?.emails?.length) {
        report.keyFindings.push({
          type: 'NEUTRAL',
          category: '联系方式',
          title: '发现官网邮箱',
          description: `官网提供邮箱: ${report.identity.website.contactInfo.emails.join(', ')}`,
          source: 'website_verify',
        });
      }
    }

    // Whois信息
    if (report.identity.whois) {
      if (report.identity.whois.domainAge && report.identity.whois.domainAge < 365) {
        report.suspiciousSignals.push(`域名注册时间较短: ${Math.floor(report.identity.whois.domainAge / 30)} 个月`);
      }

      if (report.identity.whois.privacyProtected) {
        report.keyFindings.push({
          type: 'NEUTRAL',
          category: '域名信息',
          title: '域名使用隐私保护',
          description: '域名注册信息被隐私保护服务隐藏',
          source: 'whois',
        });
      }
    }

    // LinkedIn验证
    if (report.identity.linkedin) {
      if (report.identity.linkedin.verified) {
        report.keyFindings.push({
          type: 'POSITIVE',
          category: '身份验证',
          title: 'LinkedIn公司主页已验证',
          description: `LinkedIn公司主页: ${report.identity.linkedin.url}`,
          source: 'linkedin_company',
        });

        if (report.identity.linkedin.employeeCount) {
          report.keyFindings.push({
            type: 'NEUTRAL',
            category: '企业规模',
            title: '员工规模',
            description: `LinkedIn显示员工数: ${report.identity.linkedin.employeeCount}`,
            source: 'linkedin_company',
          });
        }
      } else {
        report.suspiciousSignals.push('未找到LinkedIn公司主页');
      }
    }
  }

  /**
   * 提取注册层发现
   */
  private extractRegistrationFindings(report: CompanyInvestigationReport): void {
    if (!report.registration) return;

    const primary = report.registration.primary;

    // 注册状态
    if (primary.status === 'ACTIVE') {
      report.keyFindings.push({
        type: 'POSITIVE',
        category: '法定状态',
        title: '企业正常经营',
        description: `企业注册状态: ${primary.status}`,
        evidence: primary.registrationNumber,
        source: primary.dataSource,
      });
    } else if (primary.status === 'DISSOLVED' || primary.status === 'LIQUIDATION') {
      report.keyFindings.push({
        type: 'NEGATIVE',
        category: '法定状态',
        title: '企业已注销或清算',
        description: `企业注册状态: ${primary.status}`,
        evidence: primary.registrationNumber,
        source: primary.dataSource,
      });
      report.suspiciousSignals.push(`企业状态异常: ${primary.status}`);
    }

    // 成立时间
    if (primary.incorporationDate) {
      const yearsSinceIncorporation = (Date.now() - primary.incorporationDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (yearsSinceIncorporation < 1) {
        report.suspiciousSignals.push(`企业成立时间较短: ${Math.floor(yearsSinceIncorporation * 12)} 个月`);
      } else if (yearsSinceIncorporation > 10) {
        report.keyFindings.push({
          type: 'POSITIVE',
          category: '经营历史',
          title: '企业历史悠久',
          description: `企业成立于 ${primary.incorporationDate.toISOString().split('T')[0]}，已运营 ${Math.floor(yearsSinceIncorporation)} 年`,
          source: primary.dataSource,
        });
      }
    }

    // 注册资本
    if (primary.registeredCapital) {
      report.keyFindings.push({
        type: 'NEUTRAL',
        category: '注册资本',
        title: '注册资本信息',
        description: `注册资本: ${primary.registeredCapital.amount} ${primary.registeredCapital.currency}`,
        source: primary.dataSource,
      });
    }
  }

  /**
   * 提取关联层发现
   */
  private extractAssociationFindings(report: CompanyInvestigationReport): void {
    if (!report.association) return;

    // 壳公司特征
    if (report.association.shellCompanyIndicators.detected) {
      report.keyFindings.push({
        type: 'WARNING',
        category: '壳公司风险',
        title: '存在壳公司特征',
        description: report.association.shellCompanyIndicators.signals.join('; '),
        source: 'shell_detection',
      });
      report.suspiciousSignals.push(...report.association.shellCompanyIndicators.signals);
    }

    // 关联企业数量
    if (report.association.associatedCompanies.length > 10) {
      report.keyFindings.push({
        type: 'NEUTRAL',
        category: '关联企业',
        title: '关联企业较多',
        description: `发现 ${report.association.associatedCompanies.length} 家关联企业`,
        source: 'association_analysis',
      });
    }

    // 最终受益人
    if (report.association.ultimateBeneficialOwners.length > 0) {
      const topUBO = report.association.ultimateBeneficialOwners[0];
      if (topUBO.shareholding >= 50) {
        report.keyFindings.push({
          type: 'NEUTRAL',
          category: '实际控制',
          title: '识别到主要受益人',
          description: `${topUBO.name} 持股 ${topUBO.shareholding}%`,
          source: 'ubo_analysis',
        });
      }
    }
  }

  /**
   * 提取风险层发现
   */
  private extractRiskFindings(report: CompanyInvestigationReport): void {
    if (!report.risk) return;

    // 风险记录
    for (const record of report.risk.records) {
      report.keyFindings.push({
        type: record.severity === 'HIGH' ? 'NEGATIVE' :
              record.severity === 'MEDIUM' ? 'WARNING' : 'NEUTRAL',
        category: '风险信息',
        title: record.title,
        description: record.description || '',
        evidence: record.caseNumber || record.sourceUrl,
        source: record.source,
      });
    }

    // 风险评分
    if (report.risk.riskScore < 50) {
      report.suspiciousSignals.push(`风险评分较低: ${report.risk.riskScore}`);
    }
  }

  /**
   * 提取经营层发现
   */
  private extractBusinessFindings(report: CompanyInvestigationReport): void {
    if (!report.business) return;

    // 经营活跃度
    if (report.business.activityScore >= 70) {
      report.keyFindings.push({
        type: 'POSITIVE',
        category: '经营活跃度',
        title: '企业经营活跃',
        description: `经营活跃度评分: ${report.business.activityScore}`,
        source: 'activity_analysis',
      });
    } else if (report.business.activityScore < 30) {
      report.keyFindings.push({
        type: 'WARNING',
        category: '经营活跃度',
        title: '企业经营活动较少',
        description: `经营活跃度评分: ${report.business.activityScore}`,
        source: 'activity_analysis',
      });
      report.suspiciousSignals.push('经营活跃度较低');
    }

    // 主要市场
    if (report.business.primaryMarkets.length > 0) {
      report.keyFindings.push({
        type: 'NEUTRAL',
        category: '市场分布',
        title: '主要市场',
        description: `主要市场: ${report.business.primaryMarkets.join(', ')}`,
        source: 'market_analysis',
      });
    }

    // 招投标记录
    const tenderRecords = report.business.records.filter(r => r.type === 'TENDER' || r.type === 'CONTRACT');
    if (tenderRecords.length > 0) {
      report.keyFindings.push({
        type: 'POSITIVE',
        category: '业务活动',
        title: '发现招投标记录',
        description: `发现 ${tenderRecords.length} 条招投标相关记录`,
        source: 'tender_analysis',
      });
    }
  }

  /**
   * 计算企业真实性评分
   */
  private calculateAuthenticityScore(report: CompanyInvestigationReport): number {
    let score = 0;
    let factors = 0;

    // 身份层贡献（30%）
    if (report.identity) {
      factors += 30;
      if (report.identity.website?.status === 'ACTIVE') score += 10;
      if (report.identity.linkedin?.verified) score += 10;
      if (report.identity.whois?.domainAge && report.identity.whois.domainAge > 365) score += 10;
    }

    // 注册层贡献（40%）
    if (report.registration) {
      factors += 40;
      if (report.registration.primary.status === 'ACTIVE') score += 20;
      if (report.registration.primary.incorporationDate) {
        const years = (Date.now() - report.registration.primary.incorporationDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
        if (years > 3) score += 10;
      }
      if ((report.registration.primary.registeredCapital?.amount ?? 0) > 100000) score += 10;
    }

    // 风险层贡献（20%）
    if (report.risk) {
      factors += 20;
      score += (report.risk.riskScore / 100) * 20;
    }

    // 经营层贡献（10%）
    if (report.business) {
      factors += 10;
      score += (report.business.activityScore / 100) * 10;
    }

    // 归一化评分
    if (factors === 0) return 0;
    return Math.round((score / factors) * 100);
  }

  /**
   * 确定总体风险等级
   */
  private determineOverallRisk(report: CompanyInvestigationReport): 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR' {
    // 有制裁记录直接判定高风险
    if (report.risk?.records.some(r => r.type === 'SANCTION')) {
      return 'HIGH';
    }

    // 壳公司特征
    if (report.association?.shellCompanyIndicators.detected) {
      return 'MEDIUM';
    }

    // 企业状态异常
    if (report.registration?.primary.status === 'DISSOLVED' ||
        report.registration?.primary.status === 'LIQUIDATION') {
      return 'HIGH';
    }

    // 根据风险评分
    if (report.risk?.riskScore) {
      if (report.risk.riskScore < 40) return 'HIGH';
      if (report.risk.riskScore < 60) return 'MEDIUM';
      if (report.risk.riskScore < 80) return 'LOW';
    }

    // 根据真实性评分
    if (report.authenticityScore < 30) return 'HIGH';
    if (report.authenticityScore < 50) return 'MEDIUM';
    if (report.authenticityScore < 70) return 'LOW';

    return 'CLEAR';
  }

  /**
   * 生成建议
   */
  private generateRecommendations(report: CompanyInvestigationReport): string[] {
    const recommendations: string[] = [];

    // 基于风险等级
    if (report.overallRisk === 'HIGH') {
      recommendations.push('建议暂停合作，等待进一步核实');
      recommendations.push('建议要求对方提供更多证明材料');
    } else if (report.overallRisk === 'MEDIUM') {
      recommendations.push('建议谨慎推进，可要求对方提供补充材料');
      recommendations.push('建议实地考察或视频会议确认');
    } else if (report.overallRisk === 'LOW') {
      recommendations.push('可推进合作，但建议保持监控');
    }

    // 基于可疑信号
    if (report.suspiciousSignals.some(s => s.includes('域名') || s.includes('成立'))) {
      recommendations.push('建议核实企业真实性，可通过电话或视频确认');
    }

    if (report.suspiciousSignals.some(s => s.includes('壳公司'))) {
      recommendations.push('建议深入了解企业实际业务和人员配置');
    }

    // 基于缺失信息
    if (!report.identity?.linkedin?.verified) {
      recommendations.push('建议通过其他渠道核实企业身份');
    }

    if (!report.business?.records.length) {
      recommendations.push('建议要求对方提供业务证明（如合同、发票等）');
    }

    return recommendations;
  }

  /**
   * 健康检查所有数据源
   */
  async healthCheck(): Promise<Record<string, Record<string, { healthy: boolean; latency: number }>>> {
    const results: Record<string, Record<string, { healthy: boolean; latency: number }>> = {};

    results.identity = await this.identityAggregator.healthCheckAll();
    results.registration = await this.registrationAggregator.healthCheckAll();
    results.association = await this.associationAggregator.healthCheckAll();
    results.risk = await this.riskAggregator.healthCheckAll();
    results.business = await this.businessAggregator.healthCheckAll();

    return results;
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建调查引擎实例
 */
export function createInvestigationEngine(
  customConfigs?: Record<string, OSINTSourceConfig>
): CompanyInvestigationEngine {
  return new CompanyInvestigationEngine(customConfigs);
}

/**
 * 执行快速背调
 */
export async function quickInvestigation(
  companyName: string,
  domain?: string,
  country?: string
): Promise<CompanyInvestigationReport> {
  const engine = createInvestigationEngine();

  const query: CompanyInvestigationQuery = {
    companyName,
    domain,
    country,
    depth: 'BASIC',
  };

  return engine.investigate(query);
}

/**
 * 执行标准背调
 */
export async function standardInvestigation(
  companyName: string,
  domain?: string,
  country?: string
): Promise<CompanyInvestigationReport> {
  const engine = createInvestigationEngine();

  const query: CompanyInvestigationQuery = {
    companyName,
    domain,
    country,
    depth: 'STANDARD',
  };

  return engine.investigate(query);
}

/**
 * 执行深度背调
 */
export async function deepInvestigation(
  companyName: string,
  domain?: string,
  country?: string,
  options?: CompanyInvestigationQuery['options']
): Promise<CompanyInvestigationReport> {
  const engine = createInvestigationEngine();

  const query: CompanyInvestigationQuery = {
    companyName,
    domain,
    country,
    depth: 'DEEP',
    options,
  };

  return engine.investigate(query);
}

// 导出
export {
  CompanyInvestigationEngine,
  DEFAULT_SOURCE_CONFIGS,
};
