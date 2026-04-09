/**
 * Organization Schema 组件
 * 用于首页，帮助 AI 引擎理解公司实体
 * 文档：https://schema.org/Organization
 */

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VertaX",
    "alternateName": "VERTAX LIMITED",
    "url": "https://vertax.top",
    "logo": "https://vertax.top/icon.svg",
    "description": "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助企业建立可持续、可进化的全球增长体系。",
    "foundingDate": "2024",
    "industry": "B2B SaaS, 出海服务, 智能营销",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "contact@vertax.top",
      "availableLanguage": ["Chinese", "English"]
    },
    "sameAs": [
      "https://github.com/ryan823-dev/vertax"
    ],
    "areaServed": {
      "@type": "GeoScope",
      "name": "Global"
    },
    "serviceType": [
      "出海获客",
      "智能营销",
      "B2B 增长",
      "内容营销",
      "SEO/AEO/GEO"
    ],
    "knowsAbout": [
      "B2B 出海获客",
      "AI 搜索引擎优化",
      "AEO (Answer Engine Optimization)",
      "GEO (Generative Engine Optimization)",
      "知识引擎",
      "内容增长系统",
      "ICP 客户画像",
      "多语言 SEO"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Product Schema 组件
 * 用于产品页面
 */
export function ProductSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VertaX",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "VertaX 是面向中国企业出海的智能获客平台，包含决策中心、知识引擎、获客雷达、增长系统、声量枢纽、推进中台六大核心模块。",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "CNY",
      "price": "咨询报价",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "50"
    },
    "featureList": [
      "决策中心 - 经营驾驶舱与团队进度可视化",
      "知识引擎 - 企业私有知识库与AI理解",
      "获客雷达 - ICP智能客户发现与线索分层",
      "增长系统 - 多语言SEO内容持续生产",
      "声量枢纽 - 社媒矩阵运营与品牌传播",
      "推进中台 - 建联到跟进的协同推进系统"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}