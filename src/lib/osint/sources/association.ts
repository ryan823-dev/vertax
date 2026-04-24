// ==================== 关联层数据源适配器 ====================
// 股权穿透、高管关联、最终受益人查询

import type {
  OSINTSourceAdapter,
  OSINTSourceConfig,
  OSINTLayer,
  CompanyInvestigationQuery,
  AssociatedCompany,
  UltimateBeneficialOwner,
  AssociationLayerResult,
  CompanyRegistration,
} from '../types';

// ==================== 股权穿透适配器 ====================

/**
 * 股权穿透适配器
 * 查询企业股东信息，识别关联企业和最终受益人
 */
class ShareholderAnalysisAdapter implements OSINTSourceAdapter {
  readonly code = 'shareholder_analysis';
  readonly name = '股权穿透分析';
  readonly layer: OSINTLayer = 'ASSOCIATION';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: true,
    supportsRiskQuery: false,
    maxResultsPerQuery: 50,
  };

  private config: OSINTSourceConfig | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 分析股东关联
   * 从股东信息出发，反向查询关联企业
   */
  async analyzeShareholders(
    shareholders: Array<{ name: string; type: string; shareholding?: number }>,
    maxDepth: number = 2
  ): Promise<AssociatedCompany[]> {
    const associatedCompanies: AssociatedCompany[] = [];
    const visited = new Set<string>();

    for (const shareholder of shareholders) {
      if (visited.has(shareholder.name)) continue;
      visited.add(shareholder.name);

      // 如果股东是企业，查询该企业的其他投资
      if (shareholder.type === 'CORPORATE') {
        const related = await this.searchRelatedCompanies(shareholder.name);
        associatedCompanies.push(...related);
      }

      // 如果持股比例高，可能是母公司或重要投资方
      if (shareholder.shareholding && shareholder.shareholding >= 50) {
        associatedCompanies.push({
          name: shareholder.name,
          relationship: shareholder.type === 'CORPORATE' ? 'PARENT' : 'INVESTOR',
          shareholding: shareholder.shareholding,
          source: 'shareholder_analysis',
        });
      }
    }

    return associatedCompanies;
  }

  /**
   * 搜索关联企业
   */
  private async searchRelatedCompanies(entityName: string): Promise<AssociatedCompany[]> {
    const timeout = this.config?.timeout || 15000;

    try {
      // 使用搜索引擎查询企业的其他投资/子公司
      const searchQuery = `${entityName} 投资 子公司 关联公司`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      return this.parseRelatedCompanies(html, entityName);
    } catch (error) {
      console.warn('[ShareholderAnalysis] Search failed:', String(error));
      return [];
    }
  }

  /**
   * 解析关联企业
   */
  private parseRelatedCompanies(html: string, entityName: string): AssociatedCompany[] {
    const companies: AssociatedCompany[] = [];

    // 检查是否存在关联企业信息
    const patterns = [
      /子公司[:：]?\s*([^\n]+)/,
      /控股[:：]?\s*([^\n]+)/,
      /投资[:：]?\s*([^\n]+)/,
      /关联公司[:：]?\s*([^\n]+)/,
    ];

    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches) {
        // 提取企业名称
        const companyNames = matches[1].split(/[，,、]/).filter(s => s.trim().length > 2);
        for (const name of companyNames) {
          companies.push({
            name: name.trim(),
            relationship: 'SUBSIDIARY',
            source: 'search_inferred',
          });
        }
      }
    }

    return companies;
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use analyzeShareholders method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 高管关联适配器 ====================

/**
 * 高管关联适配器
 * 查询高管在其他企业的任职情况，识别关联关系
 */
class OfficerAnalysisAdapter implements OSINTSourceAdapter {
  readonly code = 'officer_analysis';
  readonly name = '高管关联分析';
  readonly layer: OSINTLayer = 'ASSOCIATION';
  readonly supportedFeatures = {
    supportsCompanySearch: true,
    supportsDetailQuery: true,
    supportsAssociationQuery: true,
    supportsRiskQuery: false,
    maxResultsPerQuery: 50,
  };

  private config: OSINTSourceConfig | null = null;

  initialize(config: OSINTSourceConfig): void {
    this.config = config;
  }

  /**
   * 分析高管关联
   * 查询高管在其他企业的任职情况
   */
  async analyzeOfficers(
    officers: Array<{ name: string; position: string; relatedCompanies?: string[] }>
  ): Promise<AssociatedCompany[]> {
    const associatedCompanies: AssociatedCompany[] = [];
    const visited = new Set<string>();

    // 首先处理已知关联企业
    for (const officer of officers) {
      if (officer.relatedCompanies) {
        for (const company of officer.relatedCompanies) {
          if (visited.has(company)) continue;
          visited.add(company);

          associatedCompanies.push({
            name: company,
            relationship: 'SIBLING', // 同一高管任职的企业可能是兄弟公司
            source: 'officer_related',
          });
        }
      }

      // 搜索高管的其他任职
      const related = await this.searchOfficerCompanies(officer.name);
      for (const company of related) {
        if (visited.has(company.name)) continue;
        visited.add(company.name);

        associatedCompanies.push({
          ...company,
          relationship: 'SIBLING',
          source: 'officer_search',
        });
      }
    }

    return associatedCompanies;
  }

  /**
   * 搜索高管任职的企业
   */
  private async searchOfficerCompanies(officerName: string): Promise<AssociatedCompany[]> {
    const timeout = this.config?.timeout || 15000;

    try {
      const searchQuery = `${officerName} 董事 高管 法人`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VertaxOSINT/1.0)',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      return this.parseOfficerCompanies(html, officerName);
    } catch (error) {
      console.warn('[OfficerAnalysis] Search failed:', String(error));
      return [];
    }
  }

  /**
   * 解析高管任职企业
   */
  private parseOfficerCompanies(html: string, officerName: string): AssociatedCompany[] {
    const companies: AssociatedCompany[] = [];

    // 检查是否存在任职信息
    if (!html.includes(officerName)) return [];

    // 提取企业名称（简化）
    const companyPatterns = [
      new RegExp(`${officerName}[\\s]*[:：]?[\\s]*([^\\n]{2,20}公司|[^\\n]{2,20}集团)`),
      /担任[^\n]{0,10}([^\n]{2,20}公司)[^\n]{0,10}的/,
    ];

    for (const pattern of companyPatterns) {
      const matches = html.match(pattern);
      if (matches && matches[1]) {
        const companyName = matches[1].trim();
        if (companyName.length > 2) {
          companies.push({
            name: companyName,
            relationship: 'SIBLING',
            source: 'search_inferred',
          });
        }
      }
    }

    return companies;
  }

  async searchCompany(query: CompanyInvestigationQuery): Promise<never[]> {
    throw new Error('Use analyzeOfficers method instead');
  }

  async getCompanyDetail(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }
}

// ==================== 壳公司特征检测 ====================

/**
 * 壳公司特征检测器
 * 识别潜在的壳公司特征
 */
class ShellCompanyDetector {
  private shellCompanyIndicators = [
    '注册代理地址',
    '虚拟办公室',
    '秘书公司',
    'registered agent',
    'virtual office',
    'mailbox',
    '服务地址',
    'registered office only',
  ];

  /**
   * 检测壳公司特征
   */
  detectShellCompanyIndicators(registration: CompanyRegistration): {
    detected: boolean;
    signals: string[];
  } {
    const signals: string[] = [];

    // 1. 检查注册地址特征
    if (registration.registeredAddress) {
      for (const indicator of this.shellCompanyIndicators) {
        if (registration.registeredAddress.toLowerCase().includes(indicator.toLowerCase())) {
          signals.push(`注册地址包含"${indicator}"`);
        }
      }
    }

    // 2. 检查注册资本与实缴资本差异
    if (registration.registeredCapital && registration.paidUpCapital) {
      const ratio = registration.paidUpCapital.amount / registration.registeredCapital.amount;
      if (ratio < 0.1) {
        signals.push(`实缴资本仅占注册资本的${(ratio * 100).toFixed(1)}%`);
      }
    }

    // 3. 检查经营范围异常
    if (registration.businessScope) {
      if (registration.businessScope.length > 20) {
        signals.push('经营范围过于宽泛');
      }
      const genericTerms = ['企业管理咨询', '商务信息咨询', '投资咨询'];
      if (registration.businessScope.some(scope => genericTerms.includes(scope))) {
        signals.push('经营范围包含通用咨询类业务');
      }
    }

    // 4. 检查股东信息缺失
    if (!registration.shareholders || registration.shareholders.length === 0) {
      signals.push('股东信息未披露');
    }

    // 5. 检查高管信息缺失
    if (!registration.officers || registration.officers.length === 0) {
      signals.push('高管信息未披露');
    }

    // 6. 检查企业成立时间与实际运营时间差异
    if (registration.incorporationDate) {
      const yearsSinceIncorporation = (Date.now() - registration.incorporationDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (yearsSinceIncorporation > 3 && registration.status === 'ACTIVE') {
        // 企业成立多年但可能有其他问题
        // 这里不做标记，需要结合其他信息判断
      }
    }

    return {
      detected: signals.length >= 2,
      signals,
    };
  }
}

// ==================== 最终受益人推断器 ====================

/**
 * 最终受益人推断器
 * 根据股权结构推断最终受益人
 */
class UBOInferencer {
  /**
   * 推断最终受益人
   */
  inferUBO(
    shareholders: Array<{ name: string; type: string; shareholding?: number }>,
    maxDepth: number = 3
  ): UltimateBeneficialOwner[] {
    const ubos: UltimateBeneficialOwner[] = [];
    const visited = new Set<string>();

    for (const shareholder of shareholders) {
      if (visited.has(shareholder.name)) continue;
      visited.add(shareholder.name);

      // 个人股东直接识别为UBO
      if (shareholder.type === 'INDIVIDUAL') {
        ubos.push({
          name: shareholder.name,
          shareholding: shareholder.shareholding || 0,
          controlType: 'DIRECT',
          source: 'shareholder_data',
        });
      }

      // 企业股东需要进一步穿透
      if (shareholder.type === 'CORPORATE' && shareholder.shareholding && shareholder.shareholding >= 25) {
        // 这里需要进一步查询该企业股东的股东
        // 简化版本：标记为间接控制
        ubos.push({
          name: `${shareholder.name}的股东`, // 需要进一步穿透
          shareholding: shareholder.shareholding,
          controlType: 'INDIRECT',
          controlChain: [shareholder.name],
          source: 'inferred',
        });
      }
    }

    // 按持股比例排序
    ubos.sort((a, b) => b.shareholding - a.shareholding);

    return ubos;
  }
}

// ==================== 关联层聚合器 ====================

/**
 * 关联层聚合器
 * 整合股权穿透、高管关联、壳公司检测、UBO推断
 */
class AssociationLayerAggregator {
  private shareholderAdapter = new ShareholderAnalysisAdapter();
  private officerAdapter = new OfficerAnalysisAdapter();
  private shellDetector = new ShellCompanyDetector();
  private uboInferencer = new UBOInferencer();

  initialize(configs: Record<string, OSINTSourceConfig>): void {
    if (configs.shareholder_analysis) {
      this.shareholderAdapter.initialize(configs.shareholder_analysis);
    }
    if (configs.officer_analysis) {
      this.officerAdapter.initialize(configs.officer_analysis);
    }
  }

  /**
   * 执行关联层调查
   */
  async investigate(
    query: CompanyInvestigationQuery,
    registration?: CompanyRegistration
  ): Promise<AssociationLayerResult> {
    const maxDepth = query.options?.maxAssociationDepth || 2;

    // 如果有注册信息，使用股东和高管数据
    const shareholders = registration?.shareholders || [];
    const officers = registration?.officers || [];

    // 分析股东关联
    const shareholderRelated = await this.shareholderAdapter.analyzeShareholders(
      shareholders.map(s => ({
        name: s.name,
        type: s.type,
        shareholding: s.shareholding,
      })),
      maxDepth
    );

    // 分析高管关联
    const officerRelated = await this.officerAdapter.analyzeOfficers(
      officers.map(o => ({
        name: o.name,
        position: o.position,
        relatedCompanies: o.relatedCompanies,
      }))
    );

    // 合并关联企业
    const associatedCompanies = this.mergeAndDeduplicate(
      shareholderRelated,
      officerRelated
    );

    // 推断最终受益人
    const ubos = this.uboInferencer.inferUBO(
      shareholders.map(s => ({
        name: s.name,
        type: s.type,
        shareholding: s.shareholding,
      }))
    );

    // 检测壳公司特征
    const shellIndicators = registration
      ? this.shellDetector.detectShellCompanyIndicators(registration)
      : { detected: false, signals: [] };

    // 构建关系图谱（简化版本）
    const relationshipGraph = this.buildRelationshipGraph(
      query.companyName,
      associatedCompanies,
      shareholders,
      officers
    );

    return {
      associatedCompanies,
      ultimateBeneficialOwners: ubos,
      shellCompanyIndicators: shellIndicators,
      relationshipGraph,
      sources: ['shareholder_analysis', 'officer_analysis'],
    };
  }

  /**
   * 合并并去重
   */
  private mergeAndDeduplicate(...lists: AssociatedCompany[][]): AssociatedCompany[] {
    const merged: AssociatedCompany[] = [];
    const visited = new Set<string>();

    for (const list of lists) {
      for (const company of list) {
        if (visited.has(company.name)) continue;
        visited.add(company.name);
        merged.push(company);
      }
    }

    return merged;
  }

  /**
   * 构建关系图谱
   */
  private buildRelationshipGraph(
    companyName: string,
    associatedCompanies: AssociatedCompany[],
    shareholders: Array<{ name: string; type: string; shareholding?: number }>,
    officers: Array<{ name: string; position: string }>
  ): { nodes: Array<{ id: string; name: string; type: string }>; edges: Array<{ source: string; target: string; relationship: string }> } {
    const nodes: Array<{ id: string; name: string; type: string }> = [
      { id: 'target', name: companyName, type: 'company' },
    ];

    const edges: Array<{ source: string; target: string; relationship: string }> = [];

    // 添加关联企业节点
    for (const company of associatedCompanies) {
      const nodeId = `assoc_${nodes.length}`;
      nodes.push({ id: nodeId, name: company.name, type: 'company' });
      edges.push({
        source: 'target',
        target: nodeId,
        relationship: company.relationship,
      });
    }

    // 添加股东节点
    for (const shareholder of shareholders) {
      const nodeId = `sh_${nodes.length}`;
      nodes.push({
        id: nodeId,
        name: shareholder.name,
        type: shareholder.type === 'INDIVIDUAL' ? 'person' : 'company',
      });
      edges.push({
        source: nodeId,
        target: 'target',
        relationship: shareholder.shareholding ? `持股${shareholder.shareholding}%` : '股东',
      });
    }

    // 添加高管节点
    for (const officer of officers) {
      const nodeId = `off_${nodes.length}`;
      nodes.push({ id: nodeId, name: officer.name, type: 'person' });
      edges.push({
        source: nodeId,
        target: 'target',
        relationship: officer.position,
      });
    }

    return { nodes, edges };
  }

  /**
   * 健康检查所有适配器
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    const shareholderHealth = await this.shareholderAdapter.healthCheck();
    results.shareholder_analysis = shareholderHealth;

    const officerHealth = await this.officerAdapter.healthCheck();
    results.officer_analysis = officerHealth;

    return results;
  }
}

// 导出所有适配器
export {
  ShareholderAnalysisAdapter,
  OfficerAnalysisAdapter,
  ShellCompanyDetector,
  UBOInferencer,
  AssociationLayerAggregator,
};