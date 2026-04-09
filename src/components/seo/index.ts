/**
 * SEO 组件统一导出
 * 用于 vertax.top 的 AEO/GEO 优化
 */

// Schema 组件
export { OrganizationSchema, ProductSchema } from './organization-schema';
export { ArticleSchema, AuthorAttribution, authors } from './article-schema';
export { BreadcrumbSchema, breadcrumbPaths } from './breadcrumb-schema';

// 语义内容组件
export {
  SemanticTripleList,
  FeatureParagraph,
  ComparisonTable,
  KeyDefinition,
  vertaxCoreTriples,
  aeoGeoTriples,
} from './semantic-content';

// 类型导出
export type { ArticleSchemaProps } from './article-schema';
export type { SemanticTriple, SemanticContentProps, FeatureParagraphProps, ComparisonItem, ComparisonTableProps, KeyDefinitionProps } from './semantic-content';