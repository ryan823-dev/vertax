import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Target, Brain, Globe, Shield, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: '关于我们 - VertaX GTM Intelligence OS',
  description: 'VertaX 是 AI 驱动的企业出海增长引擎，致力于帮助 B2B 企业通过智能客户画像、全球渠道发现、自动化外联实现海外业务增长。',
  keywords: ['关于 VertaX', 'GTM 系统', '企业出海', 'AI 获客', '品牌故事', '团队介绍'],
  openGraph: {
    title: '关于我们 - VertaX GTM Intelligence OS',
    description: 'AI 驱动的企业出海增长引擎，让获客从靠人变成靠系统。',
    type: 'website',
  },
};

const values = [
  {
    icon: Target,
    title: '使命驱动',
    description: '让中国企业的海外获客从「靠人」变成「靠系统」，从项目制升级为组织能力。',
  },
  {
    icon: Brain,
    title: '智能优先',
    description: '用 AI 和知识引擎把最佳实践沉淀为可复用的组织资产，不因人员流动归零。',
  },
  {
    icon: Shield,
    title: '可审计性',
    description: '动作记录、效果归因、成本核算，全链路透明可追溯。',
  },
];

const story = [
  {
    year: '2024',
    title: '初心',
    content: '创始团队在服务企业出海过程中发现：传统 CRM 和营销工具无法解决 B2B 工业企业的获客难题。获客靠人、经验难沉淀、效果不可控。',
  },
  {
    year: '2025',
    title: '研发',
    content: '融合 GTM 方法论、RevOps 理念与 AI 技术，打造 VertaX GTM Intelligence OS。把「该找谁、怎么找、如何建联」做成可计算、可复制的系统。',
  },
  {
    year: '2026',
    title: '启航',
    content: 'VertaX 正式发布，服务首批工业企业客户。验证了「知识引擎 + 获客雷达 + 决策驾驶舱」的核心价值主张。',
  },
];

export default function AboutPage() {
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
            <a href="/about" className="text-white font-medium">关于</a>
            <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
              预约演示
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            让出海获客从<span className="text-cyan-400">靠人</span>变成<span className="text-cyan-400">靠系统</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            VertaX 是 AI 驱动的企业出海增长引擎，致力于帮助 B2B 工业企业通过智能客户画像、全球渠道发现、自动化外联实现海外业务增长。
          </p>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">使命与价值观</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-8">
                <value.icon className="w-10 h-10 text-cyan-400 mb-6" />
                <h3 className="text-xl font-bold mb-4">{value.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-20 px-6 bg-[#111111]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">品牌故事</h2>
          <div className="space-y-8">
            {story.map((item) => (
              <div key={item.year} className="flex gap-6">
                <div className="text-3xl font-bold text-cyan-500/30 shrink-0">{item.year}</div>
                <div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why VertaX */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">为什么选择 VertaX</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2 text-cyan-400">资产化</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                每一次获客动作都沉淀为可复用的组织资产，不因人员流动归零。知识引擎持续积累行业洞察与客户画像。
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2 text-cyan-400">标准化</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                从 ICP 定义到跟进节奏，全流程有标准、可度量。让新人也能快速上手，团队效率可复制。
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2 text-cyan-400">可审计</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                动作记录、效果归因、成本核算，全链路透明可追溯。老板要的不是功能，是可控感。
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2 text-cyan-400">智能化</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                AI 驱动的获客系统，自动发现线索、生成内容、外联触达。让人做决策，让 AI 做执行。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6 bg-[#111111]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">核心团队</h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            创始团队来自知名科技企业，拥有 10+ 年 B2B 企业服务、AI 技术研发、海外市场拓展经验。
            曾服务多家世界 500 强企业的数字化转型与海外增长项目。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <Users className="w-8 h-8 text-cyan-400 mb-4 mx-auto" />
              <h3 className="text-base font-bold mb-2">GTM 专家</h3>
              <p className="text-xs text-gray-500">前知名 SaaS 企业 GTM 负责人</p>
            </div>
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <Brain className="w-8 h-8 text-cyan-400 mb-4 mx-auto" />
              <h3 className="text-base font-bold mb-2">AI 科学家</h3>
              <p className="text-xs text-gray-500">AI 博士，大模型应用专家</p>
            </div>
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <Globe className="w-8 h-8 text-cyan-400 mb-4 mx-auto" />
              <h3 className="text-base font-bold mb-2">海外增长专家</h3>
              <p className="text-xs text-gray-500">10+ 年海外市场拓展经验</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            联系我们
          </h2>
          <p className="text-gray-400 mb-8">
            了解 VertaX 如何帮助您的企业实现海外增长。
            <br />
            <span className="text-sm text-gray-500">
              预约演示，获取您行业的 GTM 路径样板与 ICP 示例。
            </span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/features"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              了解功能
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
            <a href="https://tower.vertax.top" className="hover:text-gray-300 transition-colors">管理后台</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
