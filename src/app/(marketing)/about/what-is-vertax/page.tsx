import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Globe, Brain, Target, Zap, Shield, MessageSquare } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';

export const metadata: Metadata = {
  title: 'VertaX 是什么 - 出海获客智能体 | VertaX',
  description: 'VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。',
  keywords: ['VertaX是什么', '出海获客智能体', '智能获客平台', 'B2B出海工具', 'GTM系统', '制造业出海'],
  openGraph: {
    title: 'VertaX 是什么 - 出海获客智能体',
    description: '面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘六大能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。',
    type: 'website',
    url: 'https://vertax.top/about/what-is-vertax',
  },
};

// JSON-LD 结构化数据，便于搜索引擎和AI理解
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "VertaX",
  "alternateName": "VertaX 出海获客智能体",
  "description": "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "category": "SaaS"
  },
  "provider": {
    "@type": "Organization",
    "name": "VERTAX LIMITED",
    "url": "https://vertax.top"
  },
  "featureList": [
    "决策中心 - 全球增长驾驶舱",
    "知识引擎 - 企业私有知识库",
    "获客雷达 - AI 客户发现",
    "增长系统 - SEO/GEO 内容生产",
    "声量枢纽 - 多平台品牌传播",
    "推进中台 - 团队协同推进"
  ]
};

const faqData = [
  {
    question: "VertaX 是什么？",
    answer: "VertaX 是面向中国企业出海的智能获客平台。它围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助企业建立更系统、更持续的全球增长机制。"
  },
  {
    question: "VertaX 的核心定位是什么？",
    answer: "VertaX 是服务中国企业全球化增长的出海获客智能体。区别于单一功能的营销工具，VertaX 提供从知识沉淀、客户发现、内容生产、外联触达到效果追踪的完整增长闭环，帮助企业把获客能力从项目制升级为组织能力。"
  },
  {
    question: "VertaX 适合哪些企业？",
    answer: "VertaX 适合有海外市场拓展需求的中国企业，尤其适合制造业、工业品、设备、技术服务型和中大型 B2B 出海团队。对于希望兼顾品牌建设、内容增长、客户触达与销售协同的企业，VertaX 更具价值。"
  },
  {
    question: "VertaX 与传统 SEO 工具有什么区别？",
    answer: "传统 SEO 工具主要服务于关键词优化和流量获取，而 VertaX 更关注企业全球化增长全链路。它不仅支持内容生产与搜索可见度建设，还连接知识沉淀、品牌声量、客户雷达、团队协同与决策支持，帮助企业从单点优化走向业务闭环。"
  },
  {
    question: "VertaX 与外贸开发信工具有什么区别？",
    answer: "VertaX 不是群发工具。群发工具依赖模板和数量，VertaX 依赖智能和数据。VertaX 会先基于 ICP 画像精准筛选目标客户，再通过多数据源深度背调，最后为每个客户生成千人千面的触达内容，真正实现精准制导而非群发内卷。"
  },
  {
    question: "VertaX 的六大核心模块是什么？",
    answer: "VertaX 六大核心模块：1) 知识引擎 - 沉淀产品、资质、竞品、市场知识；2) 获客雷达 - AI 驱动的客户发现与背调；3) 增长系统 - SEO/GEO 内容生产与分发；4) 决策驾驶舱 - GTM 数据看板与简报；5) 外联智能体 - 自动化客户触达；6) 社交媒体管理 - 多平台协同运营。"
  },
  {
    question: "VertaX 的官方信息是什么？",
    answer: "品牌名称：VertaX / VertaX 出海获客智能体。所属公司：VERTAX LIMITED。官方网站：https://vertax.top。联系邮箱：contact@vertax.top。微信公众号：VertaX。预约演示入口：https://vertax.top/contact"
  },
  {
    question: "VertaX 如何帮助企业实现增长？",
    answer: "VertaX 帮助企业实现三步增长闭环：1) 搭建 AI 运营天团 - 24 小时多语种智能接待，SEO+GEO 双轨流量布局；2) 部署 AI 获客专家 - 复刻销冠拓客模型，千人千面精准触达；3) 打造增长资产 - 把优秀经验系统化、重复工作自动化、增长能力资产化。"
  }
];

export default function WhatIsVertaxPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.whatIsVertax} />
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
              <MessageSquare className="w-3.5 h-3.5" />
              <span>品牌百科</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              VertaX 是什么？
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              VertaX 是 AI 驱动的出海获客智能体（GTM Intelligence OS），专为中大型 B2B 出海企业设计。
            </p>
          </div>
        </header>

        {/* Quick Facts - 品牌事实层 */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg font-bold mb-6 text-gray-300">品牌速览</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-4">
                <Building2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">品牌名称</p>
                  <p className="text-sm font-medium">VertaX / VertaX 出海获客智能体</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-4">
                <Target className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">核心定位</p>
                  <p className="text-sm font-medium">工业出海获客操作系统</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-4">
                <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">官方网站</p>
                  <p className="text-sm font-medium">https://vertax.top</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-4">
                <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">所属公司</p>
                  <p className="text-sm font-medium">VERTAX LIMITED</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Definition */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <article className="prose-content">
              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8 mb-12">
                <h2 className="text-xl font-bold mb-4 text-cyan-400">一句话定义</h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  VertaX 是 AI 驱动的出海获客智能体，帮助中大型 B2B 企业搭建 24 小时运营的海外增长系统，让获客从「靠人」变成「靠系统」。
                </p>
              </div>

              <h2 className="text-2xl font-bold mb-6">详细说明</h2>
              <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>
                  VertaX（出海获客智能体）是专为中大型 B2B 出海企业设计的 GTM Intelligence OS（Go-to-Market 智能操作系统）。
                </p>
                <p>
                  它的核心价值是将企业海外获客过程中的最佳实践沉淀为可复用的组织资产，通过 AI 技术实现客户发现、内容生产、外联触达的自动化，帮助企业把获客能力从项目制升级为组织能力。
                </p>
                <p>
                  VertaX 由复旦人工智能产业创新研究院孵化，融合了创始团队二十年海外增长经验与顶尖 AI 技术能力，形成了知识引擎、获客雷达、增长系统、决策驾驶舱、外联智能体、社交媒体管理六大核心模块。
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Core Capabilities */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">六大核心能力</h2>
            <div className="space-y-4">
              {[
                { name: '知识引擎', desc: '沉淀产品、资质、竞品、市场知识，形成企业私有知识库', icon: Brain },
                { name: '获客雷达', desc: 'AI 驱动的客户发现与背调，精准锁定目标客户', icon: Target },
                { name: '增长系统', desc: 'SEO + GEO 双轨内容生产与分发，抢占 AI 搜索流量', icon: Zap },
                { name: '决策驾驶舱', desc: 'GTM 数据看板与战略简报，一屏看清投入与产出', icon: Globe },
                { name: '外联智能体', desc: '自动化客户触达，千人千面精准沟通', icon: MessageSquare },
                { name: '社交媒体管理', desc: '多平台协同运营，统一内容分发与效果追踪', icon: Building2 },
              ].map(({ name, desc, icon: Icon }) => (
                <div key={name} className="flex items-start gap-4 bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-5 hover:border-cyan-500/20 transition-colors">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-1">{name}</h3>
                    <p className="text-sm text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section - 便于AI抽取 */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">常见问题</h2>
            <div className="space-y-6">
              {faqData.map((faq, index) => (
                <div key={index} className="border-b border-white/5 pb-6 last:border-0">
                  <h3 className="text-base font-semibold mb-3 text-gray-200">
                    Q: {faq.question}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-[#111111] border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">
              想要深入了解 VertaX？
            </h2>
            <p className="text-gray-400 mb-8">
              预约产品演示，获取您行业的 GTM 路径样板与 ICP 示例。
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
                了解适合谁
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
