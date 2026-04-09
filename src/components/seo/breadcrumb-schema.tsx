/**
 * 面包屑导航结构化数据组件
 * 用于生成 BreadcrumbList Schema，帮助搜索引擎理解网站层级
 * 文档：https://schema.org/BreadcrumbList
 */

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * 预定义的面包屑路径
 * 用于各营销页面
 */
export const breadcrumbPaths = {
  home: [
    { name: "首页", url: "https://vertax.top" }
  ],
  features: [
    { name: "首页", url: "https://vertax.top" },
    { name: "产品功能", url: "https://vertax.top/features" }
  ],
  featuresModules: [
    { name: "首页", url: "https://vertax.top" },
    { name: "产品功能", url: "https://vertax.top/features" },
    { name: "六大模块", url: "https://vertax.top/features/modules" }
  ],
  solutions: [
    { name: "首页", url: "https://vertax.top" },
    { name: "解决方案", url: "https://vertax.top/solutions" }
  ],
  pricing: [
    { name: "首页", url: "https://vertax.top" },
    { name: "价格", url: "https://vertax.top/pricing" }
  ],
  cases: [
    { name: "首页", url: "https://vertax.top" },
    { name: "客户案例", url: "https://vertax.top/cases" }
  ],
  faq: [
    { name: "首页", url: "https://vertax.top" },
    { name: "常见问题", url: "https://vertax.top/faq" }
  ],
  blog: [
    { name: "首页", url: "https://vertax.top" },
    { name: "博客", url: "https://vertax.top/blog" }
  ],
  contact: [
    { name: "首页", url: "https://vertax.top" },
    { name: "联系我们", url: "https://vertax.top/contact" }
  ],
  about: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" }
  ],
  whatIsVertax: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "VertaX是什么", url: "https://vertax.top/about/what-is-vertax" }
  ],
  whyNotSeoTool: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "为什么不是SEO工具", url: "https://vertax.top/about/why-not-seo-tool" }
  ],
  aeoGeoB2b: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "AEO/GEO与B2B", url: "https://vertax.top/about/aeo-geo-b2b" }
  ],
  whoIsVertaxFor: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "适合哪些企业", url: "https://vertax.top/about/who-is-vertax-for" }
  ],
  en: [
    { name: "Home", url: "https://vertax.top/en" }
  ],
  whatIsOverseasAcquisitionAgent: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "出海获客智能体", url: "https://vertax.top/about/what-is-overseas-acquisition-agent" }
  ],
  vertaxVsTraditionalTools: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "VertaX vs 传统工具", url: "https://vertax.top/about/vertax-vs-traditional-tools" }
  ],
  privateDeployment: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "私有化部署方案", url: "https://vertax.top/about/private-deployment" }
  ],
  startOverseasFromZero: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "从0启动海外市场", url: "https://vertax.top/about/start-overseas-from-zero" }
  ],
  b2bOverseasMarketing: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "B2B海外营销", url: "https://vertax.top/about/b2b-overseas-marketing" }
  ],
  implementationGuide: [
    { name: "首页", url: "https://vertax.top" },
    { name: "关于", url: "https://vertax.top/about" },
    { name: "实施指南", url: "https://vertax.top/about/implementation-guide" }
  ]
};