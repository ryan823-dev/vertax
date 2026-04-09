import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Search, Brain, Target, TrendingUp, Zap, Globe, MessageSquare, BookOpen } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema, AuthorAttribution, authors } from '@/components/seo/article-schema';

export const metadata: Metadata = {
  title: 'AEO/GEO 与 B2B 出海获客的关系 - AI 搜索优化指南 | VertaX',
  description: '深入解析 AEO（Answer Engine Optimization）与 GEO（Generative Engine Optimization）如何影响 B2B 出海获客。了解如何让豆包、元宝、Kimi、DeepSeek 等 AI 搜索推荐你的品牌。',
  keywords: ['AEO优化', 'GEO优化', 'AI搜索引擎优化', 'B2B出海', '豆包搜索', '元宝搜索', 'Kimi搜索', 'DeepSeek'],
  openGraph: {
    title: 'AEO/GEO 与 B2B 出海获客的关系',
    description: 'AI 时代的搜索优化新范式，如何让豆包、元宝、Kimi 等 AI 搜索推荐你的品牌。',
    type: 'article',
    url: 'https://vertax.top/about/aeo-geo-b2b',
  },
};

const concepts = [
  {
    acronym: 'AEO',
    fullName: 'Answer Engine Optimization',
    chinese: '答案引擎优化',
    description: '优化内容以在「答案引擎」中获得推荐。答案引擎是直接给用户答案的搜索系统，如豆包、元宝、Kimi、DeepSeek、百度 AI 搜索等。',
    examples: ['豆包问答', '元宝搜索', 'Kimi 回答', 'DeepSeek 搜索', '百度 AI 摘要']
  },
  {
    acronym: 'GEO',
    fullName: 'Generative Engine Optimization',
    chinese: '生成式引擎优化',
    description: '优化内容以被 AI 生成式搜索引擎引用和推荐。核心是让 AI「理解」你的品牌和内容，并在相关查询中推荐你。',
    examples: ['豆包搜索', 'Kimi 搜索', '元宝', 'DeepSeek', '文心一言']
  }
];

const whyItMatters = [
  {
    title: '用户搜索习惯正在改变',
    description: '越来越多用户不再「搜索后点击链接」，而是直接问 AI。根据调查，2025 年超过 30% 的信息查询通过 AI 完成，这个比例还在快速增长。',
    stat: '30%+'
  },
  {
    title: '传统 SEO 效果在下降',
    description: 'Google 的 AI Overviews 直接在搜索结果中给出答案，用户无需点击网站。这意味着即使排名很好，流量也可能下降。',
    stat: 'AI 抢答'
  },
  {
    title: 'B2B 采购决策链在 AI 化',
    description: 'B2B 采购经理越来越依赖 AI 工具做前期调研。如果你的品牌不被 AI 「认识」，就会在决策者的信息源中消失。',
    stat: '决策链'
  },
  {
    title: '先发优势明显',
    description: 'AI 搜索优化还在早期阶段，先布局的企业更容易建立认知优势。就像 2010 年做 SEO 的人获得了巨大的先发红利。',
    stat: '早期红利'
  }
];

const howToDo = [
  {
    step: 1,
    title: '让 AI 找得到你',
    items: [
      '官网不被 robots.txt 阻挡',
      '关键信息不用图片或登录墙',
      '提交 sitemap，在百度资源平台完善站点信息',
      '确保官网在主要搜索引擎有良好收录'
    ]
  },
  {
    step: 2,
    title: '让 AI 看得懂你',
    items: [
      '建立统一的「品牌事实层」',
      '在官网、公众号、视频等多渠道保持一致的品牌表述',
      '创建问答式内容，直接回答用户可能问的问题',
      '使用结构化数据（JSON-LD）标记关键信息'
    ]
  },
  {
    step: 3,
    title: '让 AI 信得过你',
    items: [
      '积累第三方证据：媒体报道、客户案例、行业文章',
      '在不同平台反复出现同一组稳定事实',
      '让信息可以被多源交叉验证',
      '避免虚假宣传、假测评等会伤害可信度的行为'
    ]
  },
  {
    step: 4,
    title: '按生态分发内容',
    items: [
      '元宝：优先做微信公众号、视频号内容',
      '百度：做好官网 SEO、百度资源平台接入',
      '豆包：公开网页 + 公开文章 + 视频解说',
      '全平台：保持品牌信息一致性'
    ]
  }
];

export default function AeoGeoB2bPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.aeoGeoB2b} />
      <ArticleSchema
        headline="AEO/GEO 与 B2B 出海获客的关系"
        description="深入解析 AEO 与 GEO 如何影响 B2B 出海获客，了解如何让豆包、元宝、Kimi、DeepSeek 等 AI 搜索推荐你的品牌。"
        url="https://vertax.top/about/aeo-geo-b2b"
        datePublished="2025-03-01"
        dateModified="2026-04-09"
        author={{ name: authors.siturenzhi.name, url: authors.siturenzhi.url }}
        keywords={['AEO优化', 'GEO优化', 'AI搜索引擎优化', 'B2B出海', '豆包', '元宝', 'Kimi', 'DeepSeek']}
      />
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
            <a href="/about" className="text-gray-400 hover:text-white transition-colors">关于</a>
            <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
              预约演示
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-16 pb-12 px-6 border-b border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-6">
            <BookOpen className="w-3.5 h-3.5" />
            <span>知识科普</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
            AEO/GEO 与 B2B 出海获客的关系
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            AI 正在重塑用户获取信息的方式。了解 AEO 和 GEO，理解它们如何影响你的海外获客效果。
          </p>
        </div>
      </header>

      {/* What is AEO/GEO */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">什么是 AEO 和 GEO？</h2>
          <div className="space-y-6">
            {concepts.map(({ acronym, fullName, chinese, description, examples }) => (
              <div key={acronym} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-cyan-400">{acronym}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{fullName}</h3>
                    <p className="text-sm text-gray-500">{chinese}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{description}</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map(example => (
                    <span key={example} className="text-xs bg-[#222222] text-gray-400 px-2 py-1 rounded">
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters for B2B */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">为什么 B2B 出海企业必须关注？</h2>
          <div className="space-y-4">
            {whyItMatters.map(({ title, description, stat }) => (
              <div key={title} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-cyan-400">{stat}</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Core Logic */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">核心逻辑</h2>
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8 mb-8">
            <p className="text-lg text-gray-300 leading-relaxed">
              AI 推荐 ≠ 喂模型
            </p>
            <p className="text-gray-400 mt-4 leading-relaxed">
              AI 搜索引擎（ChatGPT、豆包、元宝等）依赖<strong className="text-cyan-400">联网搜索、网页读取、检索增强和信源整合</strong>来回答问题，而不是只靠模型记忆。
            </p>
            <p className="text-gray-400 mt-4 leading-relaxed">
              因此，让 AI 推荐你的核心是：
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-sm font-bold text-cyan-400">1</div>
                <span className="text-gray-300">让 AI <strong>找得到</strong>你</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-sm font-bold text-cyan-400">2</div>
                <span className="text-gray-300">让 AI <strong>看得懂</strong>你</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-sm font-bold text-cyan-400">3</div>
                <span className="text-gray-300">让 AI <strong>信得过</strong>你</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Do It */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">如何做 AEO/GEO 优化？</h2>
          <div className="space-y-6">
            {howToDo.map(({ step, title, items }) => (
              <div key={step} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-sm font-bold text-black">
                    {step}
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-cyan-500/60 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What VertaX Does */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">VertaX 如何帮助你做 AEO/GEO？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Brain, title: '知识引擎', desc: '建立企业私有知识库，形成统一的品牌事实层' },
              { icon: Target, title: '内容结构化', desc: '生成语义可理解的内容，便于 AI 抽取和引用' },
              { icon: Globe, title: '多渠道分发', desc: '官网、公众号、视频号等统一品牌表述' },
              { icon: TrendingUp, title: 'SEO + GEO 双策略', desc: '同时适配传统搜索和 AI 搜索的推荐逻辑' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4 hover:border-cyan-500/20 transition-colors">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 如何测试品牌可见度 */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">如何测试你的品牌 AI 可见度？</h2>
          <p className="text-gray-400 mb-6">
            在以下中国 AI 引擎中搜索你的品牌，看看 AI 是否「认识」你：
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { name: '豆包', by: '字节跳动', url: 'doubao.com', tip: '擅长抓取公开网页和视频内容' },
              { name: '元宝', by: '腾讯', url: 'yuanbao.tencent.com', tip: '优先引用微信公众号和视频号内容' },
              { name: 'Kimi', by: '月之暗面', url: 'kimi.moonshot.cn', tip: '擅长长文本理解和网页分析' },
              { name: 'DeepSeek', by: '深度求索', url: 'chat.deepseek.com', tip: '技术社区讨论热度影响较大' },
            ].map((engine) => (
              <div key={engine.name} className="p-4 bg-[#1A1A1A] rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{engine.name}</h3>
                  <span className="text-xs text-gray-500">{engine.by}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{engine.url}</p>
                <p className="text-sm text-cyan-400">{engine.tip}</p>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <h3 className="font-semibold text-cyan-400 mb-2">测试提示词示例</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• "推荐几家做 [你的行业] 出海服务的公司"</li>
              <li>• "[你的品牌名] 是做什么的？"</li>
              <li>• "B2B 出海获客有哪些靠谱的平台？"</li>
              <li>• "出海获客智能体有哪些产品？"</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Warning Section */}
      <section className="py-16 px-6 bg-red-500/5 border-y border-red-500/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4 text-red-400">不要走偏</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            2026 年 3·15 曝光显示，一些机构通过批量发布软文、编造虚假测评、虚构专家身份等方式影响 AI 推荐结果。
          </p>
          <p className="text-gray-400 leading-relaxed">
            这类「GEO 投喂」短期可能有噪音，长期一定伤品牌，还可能被平台与监管盯上。<span className="text-red-400">VertaX 坚持合规、可持续的 AEO/GEO 实践</span>，通过真实价值建立品牌可信度。
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            想了解 VertaX 如何帮你做 AEO/GEO？
          </h2>
          <p className="text-gray-400 mb-8">
            预约演示，获取你行业的 AEO/GEO 优化方案。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/about/what-is-vertax"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              了解 VertaX
            </a>
          </div>
        </div>
      </section>

      {/* Author Attribution */}
      <div className="max-w-3xl mx-auto px-6 py-6 border-t border-white/5">
        <AuthorAttribution author={authors.siturenzhi} lastUpdated="2026-04-09" />
      </div>

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
    </>
  );
}
