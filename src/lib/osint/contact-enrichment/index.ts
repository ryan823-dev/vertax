// ==================== 联系方式补全模块索引 ====================
// B2B线索公开商务联系方式补全与线索可信度评分系统

// 类型定义
export * from './types';

// 核心组件
export {
  CompanyIdentityNormalizer,
  WebsiteContactScraper,
  EmailSearcher,
} from './enrichment-engine-core';

// 行业目录查询
export {
  IndustryDirectorySearcher,
  INDUSTRY_DIRECTORY_CONFIGS,
} from './industry-directory';

// 置信度评分
export {
  ConfidenceScorer,
  RecommendedChannelGenerator,
  InformationGapAnalyzer,
  ComplianceChecker,
  SOURCE_CONFIDENCE_MAP,
} from './scoring';

// 补全引擎（整合）
export {
  ContactEnrichmentEngine,
  createContactEnrichmentEngine,
  enrichSingleCompany,
  enrichCompanies,
} from './enrichment-engine';

// ==================== 模块说明 ====================
/**
 * @module ContactEnrichment
 * @description B2B线索公开商务联系方式补全系统
 *
 * ## 核心能力
 *
 * 1. **身份归一化**: 锁定正确企业主体，防止同名混淆
 * 2. **官网优先抓取**: Contact/Footer/About等页面优先
 * 3. **搜索语法邮箱**: 使用公开搜索语法查找邮箱
 * 4. **行业目录查询**: The Fabricator/Thomasnet/LinkedIn等
 * 5. **置信度评分**: 100分制评分体系
 * 6. **业务证据化**: 从假设改成证据
 * 7. **CRM友好输出**: JSON标准化格式
 *
 * ## 使用示例
 *
 * ```typescript
 * import { createContactEnrichmentEngine } from '@/lib/osint/contact-enrichment';
 *
 * const engine = createContactEnrichmentEngine();
 *
 * // 执行补全
 * const result = await engine.deepEnrich('TW Automation', 'tw-automation.com');
 *
 * // 生成CRM输出
 * const crmOutput = engine.generateCRMOutput(result);
 *
 * console.log(crmOutput.primary_phone?.value);      // 913-303-9700
 * console.log(crmOutput.primary_phone?.confidence); // 95
 * console.log(crmOutput.primary_email?.value);      // sales@tw-automation.com
 * console.log(crmOutput.primary_email?.confidence); // 75
 * console.log(crmOutput.lead_quality_score);        // 线索质量评分
 * ```
 *
 * ## 置信度评分规则
 *
 * | 分数 | 来源类型 |
 * | --- | --- |
 * | 100 | 官网Contact页面直接列出 |
 * | 90 | 官网多个页面反复列出 |
 * | 80 | 官方LinkedIn/Facebook/YouTube列出 |
 * | 70 | 行业目录列出且信息匹配 |
 * | 50 | 第三方数据库列出 |
 * | 30 | 根据邮箱格式推断 |
 * | 0 | 泄露库/不可靠来源（不使用） |
 *
 * ## 合规边界
 *
 * **可使用**:
 * - 公司总机电话
 * - 公开销售邮箱（sales@、info@）
 * - 官网联系表单
 * - 行业目录公开信息
 * - LinkedIn公司页公开信息
 * - 展会参展商名录
 *
 * **需标注置信度**:
 * - 第三方数据库信息
 * - 推断的邮箱
 * - 搜索结果中的信息
 *
 * **不使用**:
 * - 泄露库/暗网数据
 * - 绕过登录抓取的信息
 */