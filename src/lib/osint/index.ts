// ==================== 企业背调OSINT模块 ====================
// 开源情报收集框架，用于国际贸易企业背景调查

// 核心类型定义
export * from './types';

// 数据源适配器
export * from './sources';

// 调查引擎
export {
  CompanyInvestigationEngine,
  createInvestigationEngine,
  quickInvestigation,
  standardInvestigation,
  deepInvestigation,
  DEFAULT_SOURCE_CONFIGS,
} from './investigation-engine';

// AI工作流Prompt模板
export {
  COMPANY_INVESTIGATION_PROMPT,
  QUICK_INVESTIGATION_PROMPT,
  RISK_PRIORITY_PROMPT,
  ASSOCIATION_PROMPT,
  PROMPT_TEMPLATES,
  generatePrompt,
  selectPromptTemplate,
} from './workflow-prompt';

// ==================== 模块说明 ====================
/**
 * @module OSINT (Open Source Intelligence)
 * @description 企业背调开源情报收集框架
 *
 * ## 数据源层级架构
 *
 * 1. **身份层 (IDENTITY)**: 官网验证、Whois查询、LinkedIn企业搜索
 *    - 验证企业身份真实性
 *    - 获取联系方式和基础信息
 *
 * 2. **注册层 (REGISTRATION)**: 各国企业注册数据库
 *    - OpenCorporates (全球)
 *    - Companies House (英国)
 *    - 获取法定信息、股东、高管
 *
 * 3. **关联层 (ASSOCIATION)**: 股权穿透、高管关联分析
 *    - 关联企业识别
 *    - 最终受益人推断
 *    - 壳公司特征检测
 *
 * 4. **风险层 (RISK)**: 制裁名单、诉讼/执行记录、负面新闻
 *    - OFAC/EU/UN制裁名单
 *    - 海外公开法院/法律记录
 *    - 负面舆情
 *
 * 5. **经营层 (BUSINESS)**: 海关数据、招投标、经营新闻
 *    - 进出口记录验证
 *    - 招投标中标记录
 *    - 经营活跃度评估
 *
 * ## 使用示例
 *
 * ```typescript
 * import { deepInvestigation } from '@/lib/osint';
 *
 * // 深度背调
 * const report = await deepInvestigation(
 *   'Acme Corporation',
 *   'acme.com',
 *   'US',
 *   { checkRisk: true, maxAssociationDepth: 3 }
 * );
 *
 * console.log(report.authenticityScore); // 真实性评分 0-100
 * console.log(report.overallRisk); // 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR'
 * console.log(report.keyFindings); // 关键发现列表
 * console.log(report.recommendations); // 建议行动
 * ```
 *
 * ## 调查深度
 *
 * - **BASIC**: 身份层 + 注册层（快速验证）
 * - **STANDARD**: 身份层 + 注册层 + 风险层（常规背调）
 * - **DEEP**: 全5层调查（深度背调）
 */
