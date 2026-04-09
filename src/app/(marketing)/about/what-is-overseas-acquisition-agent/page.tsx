import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, Database, Target, TrendingUp, Users, Zap, Globe, Shield, Clock } from 'lucide-react';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema, AuthorAttribution, authors } from '@/components/seo/article-schema';
import { SemanticTripleList, KeyDefinition, vertaxCoreTriples } from '@/components/seo/semantic-content';
import { MarketingNav, MarketingFooter, SectionHeader, Card, GoldButton } from '@/components/marketing/design-system';
import { colors } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: '什么是出海获客智能体？- VertaX 定义与价值解析',
  description: '出海获客智能体是面向中国企业全球化增长的智能系统。它整合知识引擎、内容增长、商机挖掘、品牌声量与团队协同，帮助企业建立可持续的海外获客体系。',
  keywords: ['出海获客智能体', 'B2B出海', '智能获客', '出海增长系统', 'VertaX', '海外获客平台'],
  openGraph: {
    title: '什么是出海获客智能体？',
    description: '出海获客智能体是面向中国企业全球化增长的智能系统。了解它如何帮助企业建立可持续的海外获客体系。',
    type: 'article',
    url: 'https://vertax.top/about/what-is-overseas-acquisition-agent',
  },
};

// 语义三元组 - 核心定义
const definitionTriples = [
  { subject: "出海获客智能体", verb: "是", object: "整合 AI、知识库与协同流程的海外增长系统" },
  { subject: "出海获客智能体", verb: "服务", object: "有海外市场拓展需求的中国企业" },
  { subject: "出海获客智能体", verb: "核心能力包括", object: "知识沉淀、内容生产、线索挖掘、品牌传播、团队协同" },
];

// 语义三元组 - 为什么需要
const whyNeedTriples = [
  { subject: "传统出海获客", verb: "依赖", object: "人工经验与碎片化工具" },
  { subject: "人员流动", verb: "导致", object: "客户资源与经验知识流失" },
  { subject: "出海获客智能体", verb: "将", object: "获客经验沉淀为组织资产" },
  { subject: "智能体", verb: "实现", object: "获客流程标准化与可追溯" },
];

// 语义三元组 - 核心模块
const moduleTriples = [
  { subject: "知识引擎", verb: "沉淀", object: "企业产品、资质、竞品、市场信息" },
  { subject: "获客雷达", verb: "发现", object: "ICP 匹配的潜在客户" },
  { subject: "增长系统", verb: "生产", object: "多语言 SEO/AEO 内容" },
  { subject: "声量枢纽", verb: "管理", object: "社媒矩阵与品牌传播" },
  { subject: "推进中台", verb: "协同", object: "建联、跟进、审批、复盘流程" },
  { subject: "决策中心", verb: "呈现", object: "投入、节奏、结果的可视化" },
];

// 与传统方案对比
const comparisonItems = [
  { feature: "知识管理", vertax: "结构化知识引擎", alternative: "分散在个人电脑或表格" },
  { feature: "客户识别", vertax: "ICP + 智能分层", alternative: "靠经验判断，无标准" },
  { feature: "内容生产", vertax: "持续 SEO 资产", alternative: "外包或临时创作" },
  { feature: "团队协同", vertax: "系统化推进流程", alternative: "微信群 + 表格" },
  { feature: "效果归因", vertax: "全链路可追溯", alternative: "模糊，难归因" },
  { feature: "资产沉淀", vertax: "人员流动不影响", alternative: "随人员流失" },
];

export default function WhatIsOverseasAcquisitionAgentPage() {
  const lastUpdated = "2026-04-09";
  
  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema items={[
        { name: "首页", url: "https://vertax.top" },
        { name: "关于", url: "https://vertax.top/about" },
        { name: "出海获客智能体", url: "https://vertax.top/about/what-is-overseas-acquisition-agent" }
      ]} />
      <ArticleSchema
        headline="什么是出海获客智能体？"
        description="出海获客智能体是面向中国企业全球化增长的智能系统，整合知识引擎、内容增长、商机挖掘、品牌声量与团队协同。"
        url="https://vertax.top/about/what-is-overseas-acquisition-agent"
        datePublished="2025-01-15"
        dateModified={lastUpdated}
        keywords={['出海获客智能体', 'B2B出海', '智能获客', '出海增长系统']}
      />
      
      <div className="min-h-screen" style={{ background: colors.bg.primary }}>
        <MarketingNav />
        
        {/* Hero */}
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Bot className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">Category Explainer</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              什么是出海获客智能体？
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              一句话定义：出海获客智能体是面向中国企业全球化增长的智能系统，它整合 AI、知识库与协同流程，帮助企业建立可持续、可进化的海外获客体系。
            </p>
          </div>
        </section>

        {/* Core Definition */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <KeyDefinition
              term="出海获客智能体"
              definition="出海获客智能体是整合 AI 能力、企业知识库与协同流程的海外增长系统。它围绕知识沉淀、内容生产、线索挖掘、品牌传播与团队协同五大能力，帮助制造业、工业品、技术服务型企业建立可持续、可进化的全球增长体系。"
              relatedTerms={["AEO", "GEO", "B2B出海", "智能获客", "增长系统"]}
            />
            
            <SemanticTripleList triples={definitionTriples} />
          </div>
        </section>

        {/* Why It Matters */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">为什么需要出海获客智能体？</h2>
            
            <div className="space-y-4 mb-8">
              <p className="text-gray-400 leading-relaxed">
                传统出海获客依赖人工经验与碎片化工具，面临三大核心痛点：
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-gray-300">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">1</span>
                  </span>
                  <span><strong className="text-white">经验散落</strong>：客户资源、跟进经验分散在销售人员个人手中，人员流动导致资产流失</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">2</span>
                  </span>
                  <span><strong className="text-white">标准缺失</strong>：从 ICP 定义到跟进节奏，缺乏统一标准，效率难以量化</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">3</span>
                  </span>
                  <span><strong className="text-white">协同低效</strong>：市场、销售、管理层之间信息断层，难以形成合力</span>
                </li>
              </ul>
            </div>
            
            <SemanticTripleList triples={whyNeedTriples} />
          </div>
        </section>

        {/* Core Modules */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">出海获客智能体的核心模块</h2>
            
            <div className="grid gap-4 mb-8">
              {[
                { icon: Database, name: "知识引擎", desc: "沉淀企业产品、资质、竞品、市场信息，让 AI 真正理解业务" },
                { icon: Target, name: "获客雷达", desc: "基于 ICP 智能发现潜在客户，自动分层判断优先级" },
                { icon: TrendingUp, name: "增长系统", desc: "持续生产多语言 SEO/AEO 内容，吸引高意向自然询盘" },
                { icon: Globe, name: "声量枢纽", desc: "管理社媒矩阵与品牌传播，提升目标市场认知度" },
                { icon: Users, name: "推进中台", desc: "从建联到跟进的协同推进，审批/待办/复盘可视化" },
                { icon: Zap, name: "决策中心", desc: "投入、节奏、结果一屏看清，自动生成经营简报" },
              ].map(({ icon: Icon, name, desc }) => (
                <div key={name} className="flex items-start gap-4 p-4 bg-[#1A1A1A] rounded-lg border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{name}</h3>
                    <p className="text-sm text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <SemanticTripleList triples={moduleTriples} />
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">与传统方案的对比</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">维度</th>
                    <th className="text-left py-3 px-4 text-cyan-400 font-medium">出海获客智能体</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">传统方案</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonItems.map((item, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white">{item.feature}</td>
                      <td className="py-3 px-4 text-cyan-300">{item.vertax}</td>
                      <td className="py-3 px-4 text-gray-500">{item.alternative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Who Should Use */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">适合哪些企业？</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Shield, title: "制造业出海", desc: "工业机器人、自动化设备、工业母机" },
                { icon: Zap, title: "新能源装备", desc: "光伏、储能、充电桩、智能电网" },
                { icon: Globe, title: "医疗设备", desc: "医疗器械、诊断设备、康复器材" },
                { icon: Users, title: "B2B 技术服务", desc: "软件、解决方案、专业服务" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-4 bg-[#1A1A1A] rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-semibold text-white">{title}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              ))}
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
                  q: "出海获客智能体和 CRM 有什么区别？",
                  a: "CRM 侧重客户关系管理，出海获客智能体覆盖从知识沉淀、线索发现、内容生产到协同推进的全链路。智能体不仅记录客户信息，还主动发现线索、生产内容、推进协同。"
                },
                {
                  q: "出海获客智能体如何帮助 AEO/GEO？",
                  a: "智能体的知识引擎沉淀企业核心信息，增长系统基于知识库生产结构化内容，这些内容遵循语义三元组模式，便于 AI 搜索引擎理解和引用。"
                },
                {
                  q: "实施出海获客智能体需要多长时间？",
                  a: "典型实施周期 2-4 周，包括知识库初始化、ICP 定义、流程配置与团队培训。企业规模和现有基础会影响具体周期。"
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
            <h2 className="text-2xl font-bold text-white mb-4">开始建立你的出海获客体系</h2>
            <p className="text-gray-400 mb-8">预约演示，获取您行业的 GTM 路径样板与 ICP 示例</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Author Attribution */}
        <div className="max-w-3xl mx-auto px-6 pb-8">
          <AuthorAttribution author={authors.siturenzhi} lastUpdated={lastUpdated} />
        </div>

        <MarketingFooter />
      </div>
    </>
  );
}