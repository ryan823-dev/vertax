import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, HelpCircle, Zap, Database, Target, Users, TrendingUp, Globe } from 'lucide-react';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema, AuthorAttribution, authors } from '@/components/seo/article-schema';
import { SemanticTripleList, ComparisonTable, vertaxCoreTriples } from '@/components/seo/semantic-content';
import { MarketingNav, MarketingFooter } from '@/components/marketing/design-system';
import { colors } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: 'VertaX vs 传统出海工具 - 哪个更适合 B2B 出海企业？',
  description: '对比 VertaX 与传统 SEO 工具、CRM、营销自动化平台的差异。了解出海获客智能体如何帮助 B2B 企业建立系统化增长体系。',
  keywords: ['VertaX对比', '出海工具对比', 'SEO工具', 'CRM对比', '营销自动化', 'B2B出海工具'],
  openGraph: {
    title: 'VertaX vs 传统出海工具',
    description: '对比 VertaX 与传统工具的差异，了解出海获客智能体的核心优势。',
    type: 'article',
    url: 'https://vertax.top/about/vertax-vs-traditional-tools',
  },
};

// 语义三元组 - VertaX 优势
const vertaxAdvantageTriples = [
  { subject: "VertaX", verb: "整合", object: "知识沉淀、内容生产、线索挖掘、协同推进全链路" },
  { subject: "传统 SEO 工具", verb: "仅覆盖", object: "关键词优化与流量分析" },
  { subject: "传统 CRM", verb: "仅管理", object: "已有客户关系，不主动获客" },
  { subject: "VertaX 知识引擎", verb: "让", object: "AI 理解企业业务，生成精准内容" },
  { subject: "VertaX 获客雷达", verb: "主动发现", object: "ICP 匹配的潜在客户" },
  { subject: "VertaX", verb: "支持", object: "SEO、AEO、GEO 全链路优化" },
];

// 对比数据
const comparisonData = [
  { category: "知识管理", vertax: "结构化知识引擎，AI 可理解", seo: "无", crm: "分散的客户记录", marketing: "无" },
  { category: "内容生产", vertax: "基于知识库的多语言内容", seo: "关键词建议", crm: "无", marketing: "模板群发" },
  { category: "客户发现", vertax: "ICP 智能发现 + 分层", seo: "流量分析", crm: "手动录入", marketing: "线索评分" },
  { category: "AEO/GEO", vertax: "完整支持", seo: "部分 SEO", crm: "无", marketing: "无" },
  { category: "团队协同", vertax: "推进中台 + 审批流程", seo: "无", crm: "基础协作", marketing: "营销协同" },
  { category: "多语言", vertax: "原生支持", seo: "需插件", crm: "需配置", marketing: "需集成" },
  { category: "资产沉淀", vertax: "人员流动不影响", seo: "无", crm: "客户数据保留", marketing: "活动记录保留" },
  { category: "效果归因", vertax: "全链路可追溯", seo: "流量归因", crm: "销售归因", marketing: "营销归因" },
];

// 适用场景
const fitScenarios = [
  {
    tool: "VertaX",
    fit: "B2B 出海企业，需要系统化增长体系",
    condition: "制造业、工业品、技术服务型企业，希望从单点优化走向业务闭环"
  },
  {
    tool: "传统 SEO 工具",
    fit: "仅需搜索流量优化的企业",
    condition: "已有完善的内容团队和销售协同流程，只需补充 SEO 能力"
  },
  {
    tool: "传统 CRM",
    fit: "已有稳定客户群，侧重关系维护",
    condition: "获客渠道成熟，主要挑战是客户维护而非新客获取"
  },
  {
    tool: "营销自动化",
    fit: "B2C 或高频 B2B 营销场景",
    condition: "客户决策周期短，营销触点密集，需大规模自动化触达"
  },
];

export default function VertaxVsTraditionalToolsPage() {
  const lastUpdated = "2026-04-09";
  
  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema items={[
        { name: "首页", url: "https://vertax.top" },
        { name: "关于", url: "https://vertax.top/about" },
        { name: "VertaX vs 传统工具", url: "https://vertax.top/about/vertax-vs-traditional-tools" }
      ]} />
      <ArticleSchema
        headline="VertaX vs 传统出海工具"
        description="对比 VertaX 与传统 SEO 工具、CRM、营销自动化平台的差异，帮助 B2B 出海企业选择合适的增长方案。"
        url="https://vertax.top/about/vertax-vs-traditional-tools"
        datePublished="2025-02-01"
        dateModified={lastUpdated}
        keywords={['VertaX对比', '出海工具', 'SEO工具', 'CRM', '营销自动化']}
      />
      
      <div className="min-h-screen" style={{ background: colors.bg.primary }}>
        <MarketingNav />
        
        {/* Hero */}
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">产品对比</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              VertaX vs 传统出海工具
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              B2B 出海企业应该选择出海获客智能体还是传统工具？本文从知识管理、内容生产、客户发现、协同推进等维度进行对比分析。
            </p>
          </div>
        </section>

        {/* Core Triples */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">核心差异</h2>
            <SemanticTripleList triples={vertaxAdvantageTriples} />
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">功能对比</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">维度</th>
                    <th className="text-left py-3 px-4 text-cyan-400 font-medium">VertaX</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">SEO 工具</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">CRM</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">营销自动化</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white font-medium">{row.category}</td>
                      <td className="py-3 px-4 text-cyan-300">
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-cyan-500" />
                          {row.vertax}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{row.seo}</td>
                      <td className="py-3 px-4 text-gray-500">{row.crm}</td>
                      <td className="py-3 px-4 text-gray-500">{row.marketing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Fit Statements */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">适用场景</h2>
            
            <div className="space-y-4">
              {fitScenarios.map((scenario, index) => (
                <div key={index} className={`p-5 rounded-lg border ${index === 0 ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-[#1A1A1A] border-white/5'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {index === 0 && <Zap className="w-4 h-4 text-cyan-400" />}
                    <h3 className={`font-semibold ${index === 0 ? 'text-cyan-400' : 'text-white'}`}>{scenario.tool}</h3>
                  </div>
                  <p className="text-gray-300 mb-1">{scenario.fit}</p>
                  <p className="text-sm text-gray-500">{scenario.condition}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Takeaways */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">关键结论</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Database, title: "知识资产化", desc: "VertaX 将企业知识沉淀为 AI 可理解的结构化资产" },
                { icon: Target, title: "主动获客", desc: "获客雷达主动发现潜在客户，而非被动等待线索" },
                { icon: TrendingUp, title: "全链路优化", desc: "覆盖从知识到成交的完整闭环，而非单点工具" },
                { icon: Globe, title: "AEO/GEO 原生支持", desc: "针对 AI 搜索引擎优化，传统工具尚未覆盖" },
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
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">常见问题</h2>
            
            <div className="space-y-4">
              {[
                {
                  q: "VertaX 能否与现有 CRM 集成？",
                  a: "可以。VertaX 支持与主流 CRM 数据同步，作为获客层补充 CRM 的关系管理能力。"
                },
                {
                  q: "我们已经用了 SEO 工具，还需要 VertaX 吗？",
                  a: "如果您的 SEO 工具仅覆盖关键词优化，VertaX 可以补充知识引擎、获客雷达、协同推进等能力，形成完整闭环。"
                },
                {
                  q: "VertaX 和营销自动化平台如何选择？",
                  a: "营销自动化适合高频触达场景，VertaX 适合 B2B 长周期获客。如果客户决策周期长、需要深度培育，VertaX 更合适。"
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
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">评估 VertaX 是否适合您的企业</h2>
            <p className="text-gray-400 mb-8">预约演示，获取定制化的工具选型建议</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Author */}
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <AuthorAttribution author={authors.siturenzhi} lastUpdated={lastUpdated} />
        </div>

        <MarketingFooter />
      </div>
    </>
  );
}