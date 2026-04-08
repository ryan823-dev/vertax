import { MetadataRoute } from 'next';

/**
 * Sitemap for VertaX main domain
 * 仅包含营销页面，不包含租户后台
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://vertax.top';
  
  // 营销页面列表
  const marketingPages = [
    {
      path: '/',
      priority: 1.0,
      changeFrequency: 'weekly' as const,
    },
    {
      path: '/features',
      priority: 0.9,
      changeFrequency: 'weekly' as const,
    },
    {
      path: '/features/modules',
      priority: 0.9,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/solutions',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/pricing',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/about',
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    },
    // AEO/GEO 核心品牌页面 - 便于 AI 搜索理解
    {
      path: '/about/what-is-vertax',
      priority: 0.9,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/about/why-not-seo-tool',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/about/aeo-geo-b2b',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/about/who-is-vertax-for',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/faq',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    // 客户案例
    {
      path: '/cases',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    // 博客
    {
      path: '/blog',
      priority: 0.8,
      changeFrequency: 'daily' as const,
    },
    {
      path: '/blog/vertax-claw-launch',
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    },
    {
      path: '/en',
      priority: 0.9,
      changeFrequency: 'weekly' as const,
    },
    {
            path: '/contact',
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    },
  ];

  return marketingPages.map(page => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
