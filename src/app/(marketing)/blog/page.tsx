import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, TrendingUp, Zap, Brain, Target, Globe, BarChart3, Rocket } from 'lucide-react';

export const metadata: Metadata = {
  title: '博客 - VertaX GTM 洞察与实战指南',
  description: '探索 GTM 战略、海外获客、AI 营销、客户画像等主题的深度文章。获取最新出海趋势、实战案例与方法论。',
  keywords: ['GTM 博客', '出海获客', 'AI 营销', '客户画像', '海外增长', '销售自动化', '营销自动化', 'B2B 获客'],
  openGraph: {
    title: '博客 - VertaX GTM 洞察与实战指南',
    description: 'GTM 战略、海外获客、AI 营销的深度洞察与实战指南。',
    type: 'website',
  },
};

const categories = [
  { name: '全部', count: 24 },
  { name: 'GTM 战略', count: 8 },
  { name: '获客实战', count: 6 },
  { name: 'AI 营销', count: 5 },
  { name: '客户画像', count: 3 },
  { name: '案例分析', count: 2 },
];

const featuredPosts = [
  {
    category: '产品发布',
    title: '告别低效内卷：VertaX Claw 出海获客智能体重磅发布',
    excerpt: '以二十年海外增长经验为基底，打造 AI 增长引擎，重构外贸获客逻辑，帮企业搭建 24 小时运营团队，实现精准智能拓客。',
    author: 'VertaX 研究院',
    date: '2026-04-08',
    readTime: '8 分钟',
    icon: Rocket,
    featured: true,
    slug: '/blog/vertax-claw-launch',
  },
  {
    category: 'GTM 战略',
    title: '2026 中国企业出海 GTM 战略全景图',
    excerpt: '从市场选择到渠道布局，从客户画像到获客策略，一份完整的 GTM 战略框架指南。帮助 B2B 企业系统化规划海外扩张路径。',
    author: 'VertaX 研究院',
    date: '2026-04-05',
    readTime: '12 分钟',
    icon: Target,
    featured: true,
    slug: '/blog/gtm-2026-strategy',
  },
  {
    category: '获客实战',
    title: '如何用 AI 发现并触达海外决策者？完整实战指南',
    excerpt: '详解 Hunter.io、Exa Search 等工具的使用方法，从公司发现到联系人穿透，从邮箱找到邮件发送的完整流程。',
    author: '增长团队',
    date: '2026-04-03',
    readTime: '15 分钟',
    icon: Zap,
    featured: true,
  },
  {
    category: 'AI 营销',
    title: 'SEO + GEO 双引擎：让 AI 搜索引擎主动推荐你的内容',
    excerpt: '传统 SEO 已经不够了。了解如何优化内容以被 ChatGPT、Claude、Perplexity 等 AI 引擎引用，获取新一代流量红利。',
    author: 'SEO 专家团队',
    date: '2026-04-01',
    readTime: '10 分钟',
    icon: Brain,
    featured: true,
  },
];

const recentPosts = [
  {
    category: '客户画像',
    title: 'ICP 画像的 5 个关键维度：从模糊到精准',
    excerpt: '如何定义理想客户画像（ICP）？从企业画像到决策链画像，从静态标签到动态信号，让获客目标更清晰。',
    date: '2026-03-28',
    readTime: '8 分钟',
  },
  {
    category: '案例分析',
    title: '某工业机器人企业如何用 VertaX 实现 3 倍线索增长',
    excerpt: '真实客户案例：从 0 到 1 搭建 GTM 系统，3 个月内实现海外线索质量与数量的双重提升。',
    date: '2026-03-25',
    readTime: '6 分钟',
  },
  {
    category: 'GTM 战略',
    title: 'RevOps vs 传统销售：为什么需要增长运营？',
    excerpt: 'Revenue Operations 不是简单的销售 + 市场，而是一套完整的增长方法论。了解 RevOps 如何驱动可预测增长。',
    date: '2026-03-22',
    readTime: '9 分钟',
  },
  {
    category: '获客实战',
    title: '冷邮件的 7 个最佳实践：提高回复率的实战技巧',
    excerpt: '从标题优化到内容结构，从发送时机到跟进节奏，详解如何提高冷邮件的打开率、回复率与转化率。',
    date: '2026-03-20',
    readTime: '11 分钟',
  },
  {
    category: 'AI 营销',
    title: '用 AI 生成多语言内容：效率提升 10 倍的秘密',
    excerpt: '如何利用 AI 工具批量生成英语、西班牙语、德语等多语言营销内容，同时保持质量与一致性。',
    date: '2026-03-18',
    readTime: '7 分钟',
  },
  {
    category: 'GTM 战略',
    title: '从 PLG 到 SLG：B2B 企业的增长模式选择',
    excerpt: 'Product-Led Growth、Sales-Led Growth、Marketing-Led Growth 各适合什么场景？如何选择与组合？',
    date: '2026-03-15',
    readTime: '10 分钟',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">VertaX</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">首页</Link>
            <a href="/features" className="text-gray-400 hover:text-white transition-colors">功能</a>
            <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">合作方案</a>
            <a href="/about" className="text-gray-400 hover:text-white transition-colors">关于</a>
            <a href="/blog" className="text-white font-medium">博客</a>
            <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
              预约演示
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-8 tracking-wide">
            <TrendingUp className="w-3.5 h-3.5" /> GTM Insights
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            VertaX<span className="text-cyan-400">博客</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            GTM 战略、海外获客、AI 营销的深度洞察与实战指南。
            <br />
            <span className="text-sm text-gray-500">
              帮助 B2B 企业构建可复制、可预测的海外增长系统。
            </span>
          </p>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">精选文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredPosts.map((post) => (
              <article
                key={post.title}
                className="group bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-6 hover:border-cyan-500/20 transition-colors"
              >
                <post.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <div className="flex items-center gap-2 text-xs text-cyan-500/70 font-medium mb-3">
                  <span>{post.category}</span>
                </div>
                <h3 className="text-lg font-bold mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{post.date}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-6 bg-[#111111]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.name}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#1A1A1A] border border-white/[0.06] hover:border-cyan-500/30 hover:text-cyan-400"
              >
                {category.name}
                <span className="ml-2 text-xs text-gray-500">({category.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">最新文章</h2>
          <div className="space-y-4">
            {recentPosts.map((post) => (
              <article
                key={post.title}
                className="group flex flex-col md:flex-row gap-6 p-6 bg-[#1A1A1A] border border-white/[0.06] rounded-xl hover:border-cyan-500/20 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="text-cyan-500/70 font-medium">{post.category}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{post.date}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-cyan-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{post.excerpt}</p>
                </div>
                <div className="flex items-center md:items-start">
                  <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">
                    阅读全文 <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-24 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Globe className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl md:text-3xl font-bold">订阅 VertaX 洞察</h2>
          </div>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            每月精选 GTM 战略、获客实战、AI 营销深度文章。
            <br />
            <span className="text-sm text-gray-500">
              已订阅 2000+ 海外增长从业者，无垃圾邮件。
            </span>
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="输入工作邮箱"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
            >
              立即订阅
            </button>
          </form>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl md:text-3xl font-bold">
              准备好系统化获客了吗？
            </h2>
          </div>
          <p className="text-gray-400 mb-8">
            了解 VertaX 如何帮助您构建可复制、可预测的海外增长系统。
          </p>
          <a
            href="/contact"
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            预约演示 <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-500 rounded flex items-center justify-center">
                <span className="text-black font-bold text-xs">V</span>
              </div>
              <span className="text-sm font-medium">VertaX</span>
            </Link>
            <span className="text-xs text-gray-600 ml-2">© {new Date().getFullYear()} VERTAX LIMITED</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>contact@vertax.top</span>
            <a href="https://tower.vertax.top" className="hover:text-gray-300 transition-colors">管理后台</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
