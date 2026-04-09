/**
 * Article Schema 组件
 * 用于博客和内容页面，帮助 AI 引擎理解文章结构
 * 文档：https://schema.org/Article
 */

interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author?: {
    name: string;
    url?: string;
  };
  image?: string;
  articleBody?: string;
  keywords?: string[];
}

export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author = { name: "VertaX 团队", url: "https://vertax.top/about" },
  image = "https://vertax.top/icon.svg",
  articleBody,
  keywords
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": headline,
    "description": description,
    "url": url,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "datePublished": datePublished || dateModified || new Date().toISOString().split('T')[0],
    "dateModified": dateModified || datePublished || new Date().toISOString().split('T')[0],
    "author": {
      "@type": "Organization",
      "name": author.name,
      "url": author.url || "https://vertax.top"
    },
    "publisher": {
      "@type": "Organization",
      "name": "VertaX",
      "url": "https://vertax.top",
      "logo": {
        "@type": "ImageObject",
        "url": "https://vertax.top/icon.svg"
      }
    },
    "image": image,
    "articleBody": articleBody,
    "keywords": keywords?.join(", "),
    "inLanguage": "zh-CN",
    "isPartOf": {
      "@type": "WebSite",
      "name": "VertaX",
      "url": "https://vertax.top"
    }
  };

  // 移除 undefined 字段
  Object.keys(schema).forEach(key => {
    if (schema[key] === undefined) {
      delete schema[key];
    }
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * 预定义作者信息
 * 用于 AEO 作者署名
 */
export const authors = {
  siturenzhi: {
    name: "司徒任之",
    url: "https://vertax.top/about",
    description: "跨境出海增长专家，专注 B2B 企业全球化增长策略与实践。"
  },
  vertaxTeam: {
    name: "VertaX 团队",
    url: "https://vertax.top/about",
    description: "VertaX 是面向中国企业出海的智能获客平台团队，专注于 B2B 出海增长方法论与实践。"
  },
  growthExpert: {
    name: "增长研究组",
    url: "https://vertax.top/about",
    description: "VertaX 增长研究组，聚焦海外获客策略、SEO/AEO/GEO 最佳实践。"
  }
};

/**
 * 作者署名组件
 * 用于页面底部，增强 E-E-A-T 信号
 */
export function AuthorAttribution({ 
  author = authors.vertaxTeam,
  lastUpdated 
}: { 
  author?: typeof authors.vertaxTeam;
  lastUpdated?: string;
}) {
  const displayDate = lastUpdated || new Date().toISOString().split('T')[0];
  
  return (
    <div className="flex items-center gap-3 py-4 border-t border-white/5 mt-8">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
        V
      </div>
      <div className="text-sm">
        <div className="text-gray-300">
          <span className="font-medium">{author.name}</span>
          <span className="text-gray-500 mx-2">·</span>
          <time dateTime={displayDate} className="text-gray-500">
            更新于 {displayDate}
          </time>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{author.description}</p>
      </div>
    </div>
  );
}