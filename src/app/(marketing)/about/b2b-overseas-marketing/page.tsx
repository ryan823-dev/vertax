import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Target, Users, Globe, Shield, Clock } from 'lucide-react';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema } from '@/components/seo/article-schema';
import { SemanticTripleList, KeyDefinition } from '@/components/seo/semantic-content';
import { MarketingNav, MarketingFooter } from '@/components/marketing/design-system';
import { colors } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: 'B2B 企业怎么做海外营销？- 制造业出海营销完整指南',
  description: 'B2B 企业海外营销完整指南：从市场选择、渠道布局、内容策略到线索转化。帮助制造业、工业品、技术服务企业建立系统化海外获客体系。',
  keywords: ['B2B海外营销', '制造业出海', '工业品海外推广', '出海营销策略', 'B2B出海', '海外获客'],
  openGraph: {
    title: 'B2B 企业怎么做海外营销？',
    description: '制造业、工业品、技术服务企业海外营销完整指南，从0到1建立系统化海外获客体系。',
    type: 'article',
    url: 'https://vertax.top/about/b2b-overseas-marketing',
  },
};

// 语义三元组
const coreTriples = [
  { subject: "B2B 海外营销", verb: "核心是", object: "建立系统化的海外获客体系" },
  { subject: "B2B 海外营销", verb: "包含", object: "市场选择、渠道布局、内容策略、线索转化" },
  { subject: "制造业出海营销", verb: "需要", object: "长周期培育和品牌信任建设" },
  { subject: "B2B 企业", verb: "应优先关注", object: "SEO/AEO/GEO 等自然获客渠道" },
];

const channelTriples = [
  { subject: "SEO", verb: "帮助", object: "B2B 企业获得持续的搜索流量" },
  { subject: "AEO/GEO", verb: "让品牌", object: "在 AI 搜索中被推荐" },
  { subject: "LinkedIn", verb: "适合", object: "B2B 专业社交和客户开发" },
  { subject: "内容营销", verb: "建立", object: "行业专家形象和品牌信任" },
];

const steps = [
  {
    step: 1,
    title: "明确目标市场和客户画像",
    items: [
      "研究目标市场的行业分布、采购习惯、决策链",
      "定义 ICP（理想客户画像）：行业、规模、地域、痛点",
      "分析竞争对手的海外布局和营销策略",
      "确定差异化定位和价值主张"
    ]
  },
  {
    step: 2,
    title: "建立内容基础设施",
    items: [
      "搭建多语言官网，支持 SEO 优化",
      "建立企业知识库，沉淀产品、资质、案例信息",
      "创建内容生产流程，持续输出行业内容",
      "配置结构化数据，便于 AI 理解和引用"
    ]
  },
  {
    step: 3,
    title: "布局核心获客渠道",
    items: [
      "SEO：优化关键词，获得 Google/百度等搜索流量",
      "AEO/GEO：优化内容让 AI 搜索推荐你的品牌",
      "LinkedIn：专业社交平台开发 B2B 客户",
      "展会/行业媒体：线下线上结合扩大影响"
    ]
  },
  {
    step: 4,
    title: "建立线索转化体系",
    items: [
      "设置询盘承接流程，快速响应客户需求",
      "建立线索分层机制，优先跟进高意向客户",
      "配置 CRM 系统管理客户关系",
      "定期复盘转化率，优化各环节"
    ]
  },
];

const mistakes = [
  { mistake: "只依赖展会和 B2B 平台", correct: "建立自有获客渠道，降低平台依赖" },
  { mistake: "内容外包，缺乏行业深度", correct: "基于企业知识库输出专业内容" },
  { mistake: "忽视 AI 搜索趋势", correct: "布局 AEO/GEO，抓住 AI 搜索红利" },
  { mistake: "短期投入期望短期回报", correct: "B2B 海外营销需要 6-12 个月培育周期" },
  { mistake: "营销和销售割裂", correct: "建立协同推进体系，营销线索无缝传递" },
];

export default function B2BOverseasMarketingPage() {
  const lastUpdated = "2026-04-09";
  
  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema items={[
        { name: "首页", url: "https://vertax.top" },
        { name: "关于", url: "https://vertax.top/about" },
        { name: "B2B 海外营销", url: "https://vertax.top/about/b2b-overseas-marketing" }
      ]} />
      <ArticleSchema
        headline="B2B 企业怎么做海外营销？"
        description="制造业、工业品、技术服务企业海外营销完整指南，从市场选择、渠道布局到线索转化。"
        url="https://vertax.top/about/b2b-overseas-marketing"
        datePublished="2025-02-15"
        dateModified={lastUpdated}
        keywords={['B2B海外营销', '制造业出海', '出海营销策略', 'AEO', 'GEO', '海外获客']}
      />
      
      <div className="min-h-screen" style={{ background: colors.bg.primary }}>
        <MarketingNav />
        
        {/* Hero */}
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">出海营销指南</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              B2B 企业怎么做海外营销？
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              制造业、工业品、技术服务企业海外营销完整指南：从市场选择、渠道布局、内容策略到线索转化，帮助你建立系统化的海外获客体系。
            </p>
          </div>
        </section>

        {/* Key Definition */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <KeyDefinition
              term="B2B 海外营销"
              definition="B2B 海外营销是企业面向海外市场获取商业客户的系统性工作。与 B2C 不同，B2B 海外营销更强调长期信任建设、专业内容输出和多触点协同，核心目标是建立可持续的海外获客体系。"
              relatedTerms={["出海获客", "B2B出海", "制造业出海", "AEO", "GEO"]}
            />
            
            <SemanticTripleList triples={coreTriples} />
          </div>
        </section>

        {/* Why It's Different */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">B2B 海外营销的特点</h2>
            
            <div className="grid gap-4 mb-8">
              {[
                { icon: Clock, title: "决策周期长", desc: "B2B 采购决策通常需要 3-12 个月，需要持续培育" },
                { icon: Users, title: "决策链复杂", desc: "涉及采购、技术、管理层多人，需多触点覆盖" },
                { icon: Target, title: "客单价高", desc: "单笔订单金额大，客户终身价值高" },
                { icon: Shield, title: "信任要求高", desc: "需要专业内容、案例背书建立可信度" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 bg-[#1A1A1A] rounded-lg border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
                    <p className="text-sm text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">B2B 海外营销四步法</h2>
            
            <div className="space-y-6">
              {steps.map(({ step, title, items }) => (
                <div key={step} className="p-5 bg-[#1A1A1A] rounded-lg border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-sm font-bold text-black">
                      {step}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
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

        {/* Channels */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">核心获客渠道</h2>
            
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { title: "SEO 搜索优化", desc: "获得 Google、百度等搜索引擎的持续流量", highlight: "长期价值高" },
                { title: "AEO/GEO 优化", desc: "让品牌在豆包、元宝、Kimi 等 AI 搜索中被推荐", highlight: "新趋势红利" },
                { title: "LinkedIn 开发", desc: "专业社交平台精准触达 B2B 决策者", highlight: "精准触达" },
                { title: "内容营销", desc: "行业文章、白皮书建立专家形象", highlight: "信任建设" },
              ].map(({ title, desc, highlight }) => (
                <div key={title} className="p-4 bg-[#1A1A1A] rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{title}</h3>
                    <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded">{highlight}</span>
                  </div>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
            
            <SemanticTripleList triples={channelTriples} />
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">常见误区</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-red-400 font-medium">误区</th>
                    <th className="text-left py-3 px-4 text-green-400 font-medium">正确做法</th>
                  </tr>
                </thead>
                <tbody>
                  {mistakes.map((item, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-3 px-4 text-gray-400">{item.mistake}</td>
                      <td className="py-3 px-4 text-cyan-300">{item.correct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">常见问题</h2>
            
            <div className="space-y-4">
              {[
                {
                  q: "B2B 海外营销需要多少预算？",
                  a: "取决于目标市场和企业规模。建议初期预算 30-100 万/年，主要用于内容建设、SEO 优化和渠道布局。随着效果验证逐步增加投入。"
                },
                {
                  q: "B2B 海外营销多久能看到效果？",
                  a: "SEO 和内容营销通常需要 6-12 个月见效，AEO/GEO 需要持续优化 3-6 个月。建议建立阶段性的里程碑目标。"
                },
                {
                  q: "小企业能做 B2B 海外营销吗？",
                  a: "可以。小企业更应聚焦细分市场和精准客户，利用 SEO、LinkedIn 等低成本渠道，避免大规模广告投放。"
                },
                {
                  q: "AEO/GEO 对 B2B 企业重要吗？",
                  a: "越来越重要。越来越多的 B2B 采购决策者使用豆包、元宝、Kimi 等 AI 工具做前期调研，如果你的品牌不被 AI 认识，就会错过机会。"
                },
              ].map(({ q, a }, index) => (
                <div key={index} className="p-4 bg-[#1A1A1A] rounded-lg border border-white/5">
                  <h3 className="font-semibold text-white mb-2">{q}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">想了解适合你企业的海外营销方案？</h2>
            <p className="text-gray-400 mb-8">预约演示，获取定制化的 B2B 海外营销策略建议</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
