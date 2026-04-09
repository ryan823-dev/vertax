import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Target, Brain, Globe, Shield, Users, BookOpen, Rocket, Server, Clock, HelpCircle, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/design-system';
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema';
import { SemanticTripleList } from '@/components/seo/semantic-content';

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

// 关于页面子页面导航
const aboutSubpages = [
  {
    title: 'VertaX 是什么',
    description: '了解 VertaX 的核心定位、六大模块和价值主张',
    href: '/about/what-is-vertax',
    icon: BookOpen,
  },
  {
    title: '适合哪些企业',
    description: '判断您的企业是否适合使用 VertaX',
    href: '/about/who-is-vertax-for',
    icon: UsersIcon,
  },
  {
    title: '从0启动海外市场',
    description: '没有外贸经验如何系统化启动出海',
    href: '/about/start-overseas-from-zero',
    icon: Rocket,
  },
  {
    title: '私有化部署方案',
    description: '适合有合规要求的企业本地部署',
    href: '/about/private-deployment',
    icon: Server,
  },
  {
    title: '实施周期与指南',
    description: '了解系统部署流程和效果预期',
    href: '/about/implementation-guide',
    icon: Clock,
  },
  {
    title: 'B2B 海外营销',
    description: 'B2B 企业出海营销策略与方法',
    href: '/about/b2b-overseas-marketing',
    icon: TrendingUp,
  },
];

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

// 语义三元组 - 便于 AI 理解页面核心信息
const aboutTriples = [
  { subject: "VertaX", verb: "是", object: "AI 驱动的出海获客智能体" },
  { subject: "VertaX", verb: "帮助", object: "中大型 B2B 出海企业建立全球增长体系" },
  { subject: "VertaX", verb: "包含", object: "六大核心模块：知识引擎、获客雷达、增长系统、决策驾驶舱、外联智能体、社交媒体管理" },
  { subject: "VertaX", verb: "所属公司", object: "VERTAX LIMITED" },
  { subject: "VertaX", verb: "官方网站", object: "https://vertax.top" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      <BreadcrumbSchema items={[
        { name: '首页', url: 'https://vertax.top' },
        { name: '关于', url: 'https://vertax.top/about' }
      ]} />
      <SemanticTripleList triples={aboutTriples} />

      {/* Navigation */}
      <MarketingNav />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            让出海获客从<span className="text-cyan-400">靠人</span>变成<span className="text-cyan-400">靠系统</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            VertaX 是 AI 驱动的企业出海增长引擎，致力于帮助 B2B 工业企业通过智能客户画像、全球渠道发现、自动化外联实现海外业务增长。
          </p>
        </div>
      </section>

      {/* Subpage Navigation */}
      <section className="pb-16 px-6 border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold mb-6 text-center text-gray-300">深入了解 VertaX</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aboutSubpages.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group bg-[#1A1A1A] border border-white/[0.06] hover:border-cyan-500/30 rounded-xl p-5 transition-all hover:bg-[#1A1A1A]/80"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 group-hover:text-cyan-400 transition-colors">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
      <MarketingFooter />
    </div>
  );
}
