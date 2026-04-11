/**
 * Article Schema 组件
 * 用于博客和内容页面，帮助搜索引擎和 AI 理解文章结构。
 * 文档：https://schema.org/Article
 */

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdObject
  | JsonLdValue[];

interface JsonLdObject {
  [key: string]: JsonLdValue | undefined;
}

export interface ArticleSchemaAuthor {
  name: string;
  url?: string;
  description?: string;
}

export interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author?: ArticleSchemaAuthor;
  image?: string;
  articleBody?: string;
  keywords?: string[];
}

export interface AuthorProfile extends ArticleSchemaAuthor {
  description: string;
}

export const authors: Record<
  "siturenzhi" | "vertaxTeam" | "growthExpert",
  AuthorProfile
> = {
  siturenzhi: {
    name: "司徒任之",
    url: "https://vertax.top/about",
    description: "跨境增长研究者，长期关注 B2B 企业全球化增长、内容获客与市场验证。",
  },
  vertaxTeam: {
    name: "VertaX 团队",
    url: "https://vertax.top/about",
    description: "VertaX 团队专注于 B2B 出海增长、SEO/AEO/GEO 内容策略与线索转化。",
  },
  growthExpert: {
    name: "增长研究组",
    url: "https://vertax.top/about",
    description: "围绕 SEO、AEO、GEO 与海外获客场景，沉淀可执行的方法与案例。",
  },
};

export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author = authors.vertaxTeam,
  image = "https://vertax.top/logo.svg",
  articleBody,
  keywords,
}: ArticleSchemaProps) {
  const schema: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    datePublished:
      datePublished || dateModified || new Date().toISOString().split("T")[0],
    dateModified:
      dateModified || datePublished || new Date().toISOString().split("T")[0],
    author: {
      "@type": "Organization",
      name: author.name,
      url: author.url || "https://vertax.top",
    },
    publisher: {
      "@type": "Organization",
      name: "VertaX",
      url: "https://vertax.top",
      logo: {
        "@type": "ImageObject",
        url: "https://vertax.top/logo.svg",
      },
    },
    image,
    articleBody,
    keywords: keywords?.join(", "),
    inLanguage: "zh-CN",
    isPartOf: {
      "@type": "WebSite",
      name: "VertaX",
      url: "https://vertax.top",
    },
  };

  for (const key of Object.keys(schema)) {
    if (schema[key] === undefined) {
      delete schema[key];
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function AuthorAttribution({
  author = authors.vertaxTeam,
  lastUpdated,
}: {
  author?: AuthorProfile;
  lastUpdated?: string;
}) {
  const displayDate = lastUpdated || new Date().toISOString().split("T")[0];

  return (
    <div className="mt-8 flex items-center gap-3 border-t border-white/5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
        V
      </div>
      <div className="text-sm">
        <div className="text-gray-300">
          <span className="font-medium">{author.name}</span>
          <span className="mx-2 text-gray-500">|</span>
          <time dateTime={displayDate} className="text-gray-500">
            更新于 {displayDate}
          </time>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{author.description}</p>
      </div>
    </div>
  );
}
