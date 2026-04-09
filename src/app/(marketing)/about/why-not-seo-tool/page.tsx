import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Search, Target, Zap, Brain, Globe, X, Check, TrendingUp } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';

export const metadata: Metadata = {
  title: 'VertaX 与传统 SEO、外包代运营、线索工具有什么不同 | VertaX',
  description: '传统 SEO 工具只解决关键词优化，VertaX 是面向中国企业出海的智能获客平台，覆盖知识沉淀、内容增长、商机挖掘、品牌声量、协同推进与决策支持全链路。',
  keywords: ['VertaX vs SEO工具', 'VertaX vs 代运营', '出海获客工具对比', '智能获客平台', 'B2B出海工具'],
  openGraph: {
    title: 'VertaX 与传统 SEO、外包代运营、线索工具有什么不同',
    description: 'VertaX 是面向中国企业出海的智能获客平台，覆盖从客户发现到建联的全流程。',
    type: 'article',
    url: 'https://vertax.top/about/why-not-seo-tool',
  },
};

const comparisons = [
  {
    aspect: '定位',
    traditional: '单一功能工具，只解决流量获取的一个环节',
    vertax: 'GTM 智能操作系统，覆盖获客全流程'
  },
  {
    aspect: '覆盖范围',
    traditional: '只做 SEO 关键词排名',
    vertax: '知识引擎 → 客户发现 → 内容生产 → 外联触达 → 效果追踪'
  },
  {
    aspect: '流量策略',
    traditional: '仅适配传统搜索引擎（Google、百度）',
    vertax: 'SEO + GEO 双策略，同时适配传统搜索和 AI 搜索（ChatGPT、豆包、元宝）'
  },
  {
    aspect: '内容生产',
    traditional: '需人工撰写，或简单 AI 生成',
    vertax: '知识引擎驱动，基于企业私有数据生成专业内容'
  },
  {
    aspect: '客户触达',
    traditional: '不涉及客户开发',
    vertax: 'AI 获客雷达 + 千人千面外联智能体'
  },
  {
    aspect: '数据沉淀',
    traditional: '工具不沉淀企业资产',
    vertax: '每一次获客动作都沉淀为可复用的组织资产'
  },
  {
    aspect: '目标客户',
    traditional: '所有有网站的企业',
    vertax: '中大型 B2B 出海企业（工业、制造、医疗器械等）'
  },
  {
    aspect: '价值主张',
    traditional: '提升关键词排名',
    vertax: '搭建 24 小时运营的海外增长系统'
  },
];

const keyDifferences = [
  {
    icon: Target,
    title: '不是单一工具，是完整系统',
    description: '传统 SEO 工具只解决「如何让网站在搜索结果中排名更高」这一个问题。VertaX 解决的是「如何系统化地获取海外客户」这个更大的命题——从该找谁、怎么找到、如何建联，到效果追踪的完整闭环。'
  },
  {
    icon: Globe,
    title: '不只做 SEO，还做 GEO',
    description: 'GEO（Generative Engine Optimization）是 AI 时代的搜索优化新范式。越来越多用户通过 ChatGPT、豆包、元宝、Perplexity 获取信息，而不是传统搜索引擎。VertaX 的内容同时适配两种搜索逻辑。'
  },
  {
    icon: Brain,
    title: '不依赖模板，依赖知识',
    description: '传统工具的内容要么人工写，要么用模板批量生成。VertaX 基于企业私有知识库——产品资料、案例、资质、竞品分析——生成真正专业、有深度的行业内容。'
  },
  {
    icon: Zap,
    title: '不只引流，还做转化',
    description: '传统 SEO 工具把流量引到网站就结束了。VertaX 还负责：24 小时多语种智能接待、客户线索识别、AI 外联跟进，把流量变成真正的商业机会。'
  },
];

export default function WhyNotSeoToolPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.whyNotSeoTool} />
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
            <Search className="w-3.5 h-3.5" />
            <span>差异化说明</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
            为什么 VertaX 不是传统 SEO 工具？
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            VertaX 是 GTM Intelligence OS，不是关键词排名工具。它解决的是「如何系统化获取海外客户」这个更大的命题。
          </p>
        </div>
      </header>

      {/* Core Statement */}
      <section className="py-12 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-4 text-cyan-400">核心区别</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              传统 SEO 工具只解决「如何让网站在搜索结果中排名更高」这一个问题。
              <br /><br />
              VertaX 解决的是「<span className="text-cyan-400 font-medium">如何系统化地获取海外客户</span>」这个更大的命题——从该找谁、怎么找到、如何建联，到效果追踪的完整闭环。
            </p>
          </div>
        </div>
      </section>

      {/* Four Key Differences */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">四大本质区别</h2>
          <div className="space-y-6">
            {keyDifferences.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">详细对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">对比维度</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">
                    <span className="flex items-center gap-2">
                      <X className="w-4 h-4 text-gray-500" />
                      传统 SEO 工具
                    </span>
                  </th>
                  <th className="text-left py-4 px-4 text-cyan-400 font-medium">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      VertaX
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map(({ aspect, traditional, vertax }) => (
                  <tr key={aspect} className="border-b border-white/5">
                    <td className="py-4 px-4 text-gray-300 font-medium">{aspect}</td>
                    <td className="py-4 px-4 text-gray-500">{traditional}</td>
                    <td className="py-4 px-4 text-gray-300">{vertax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SEO + GEO Explanation */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">SEO 与 GEO 的区别</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                SEO（搜索引擎优化）
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                传统搜索引擎优化，目标是在 Google、百度等搜索结果中获得更高排名。
              </p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>• 关键词排名优化</li>
                <li>• 网站技术 SEO</li>
                <li>• 外链建设</li>
                <li>• 内容营销</li>
              </ul>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                GEO（AI 搜索优化）
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                AI 时代的搜索优化，目标是被 ChatGPT、豆包、元宝等 AI 推荐和引用。
              </p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>• 结构化内容表达</li>
                <li>• 语义三元组标记</li>
                <li>• 品牌实体构建</li>
                <li>• 多源信息一致性</li>
              </ul>
            </div>
          </div>
          <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
            <p className="text-gray-400 text-sm leading-relaxed">
              <span className="text-cyan-400 font-medium">VertaX 采用 SEO + GEO 双策略</span>：既优化传统搜索引擎排名，也优化 AI 搜索推荐逻辑。当用户在 ChatGPT 问「有什么好的出海获客工具」时，VertaX 有更大的概率被 AI 推荐和引用。
            </p>
          </div>
        </div>
      </section>

      {/* Who Should Choose What */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">选哪个？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4 text-gray-300">适合传统 SEO 工具的企业：</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <span>只需要提升网站搜索排名</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <span>已有成熟的客户开发流程</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <span>B2C 电商、内容型网站</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <span>预算有限，只需单一功能</span>
                </li>
              </ul>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4 text-cyan-400">适合 VertaX 的企业：</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <span>中大型 B2B 出海企业</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <span>需要系统化获客能力</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <span>客单价高、决策链长</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <span>希望获客能力资产化、可复制</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            想了解 VertaX 是否适合你的企业？
          </h2>
          <p className="text-gray-400 mb-8">
            预约演示，获取你行业的 GTM 路径样板与差异化分析。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/about/who-is-vertax-for"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              查看适合谁
            </a>
          </div>
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
            <a href="/faq" className="hover:text-gray-300 transition-colors">常见问题</a>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
