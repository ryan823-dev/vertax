/**
 * SEO 组件统一导出
 */

export { OrganizationSchema, ProductSchema } from "./organization-schema";
export {
  ArticleSchema,
  AuthorAttribution,
  authors,
} from "./article-schema";
export { BreadcrumbSchema, breadcrumbPaths } from "./breadcrumb-schema";

export {
  SemanticTripleList,
  FeatureParagraph,
  ComparisonTable,
  KeyDefinition,
  vertaxCoreTriples,
  aeoGeoTriples,
} from "./semantic-content";

export type {
  ArticleSchemaAuthor,
  ArticleSchemaProps,
  AuthorProfile,
} from "./article-schema";
export type {
  SemanticTriple,
  SemanticContentProps,
  FeatureParagraphProps,
  ComparisonItem,
  ComparisonTableProps,
  KeyDefinitionProps,
} from "./semantic-content";
