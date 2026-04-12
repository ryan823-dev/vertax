import { Metadata } from 'next';
import { ArrowRight, CheckCircle2, XCircle, Building2, Factory, Shield, Globe, Users, TrendingUp, Target } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema } from '@/components/seo/article-schema';
import { SemanticTripleList } from '@/components/seo/semantic-content';
import { MarketingNav, MarketingFooter } from '@/components/marketing/design-system';

// 语义三元组 - 便于 AI 理解适用企业信息
const suitabilityTriples = [
  { subject: "VertaX", verb: "适合", object: "中大型 B2B 出海企业" },
  { subject: "VertaX", verb: "适合", object: "制造业、工业品、技术服务型企业" },
  { subject: "VertaX", verb: "适合", object: "年营收 5000 万以上的企业" },
  { subject: "VertaX", verb: "适合", object: "客单价 5 万元以上的 B2B 业务" },
  { subject: "VertaX", verb: "不适合", object: "B2C 电商或零售企业" },
];

export const metadata: Metadata = {
  title: '哪些企业适合 VertaX - 适用客户分析 | VertaX',
  description: 'VertaX 适合有海外市场拓展需求的中国企业，尤其适合制造业、工业品、设备、技术服务型和中大型 B2B 出海团队。了解 VertaX 的适用条件和典型客户画像。',
  keywords: ['VertaX适合谁', '制造业出海', '工业品出海', 'B2B出海企业', '技术服务出海', '智能获客平台'],
  openGraph: {
    title: '哪些企业适合 VertaX',
    description: 'VertaX 适合有海外市场拓展需求的中国企业，尤其适合制造业、工业品、设备、技术服务型和中大型 B2B 出海团队。',
    type: 'article',
    url: 'https://vertax.top/about/who-is-vertax-for',
  },
};

const suitableIndustries = [
  { name: '工业装备', examples: ['数控机床', '工业机器人', '自动化设备', '激光设备'] },
  { name: '智能制造', examples: ['智能产线', '工业视觉', 'MES系统', '智能物流'] },
  { name: '新能源', examples: ['光伏设备', '储能系统', '充电桩', '风电设备'] },
  { name: '医疗器械', examples: ['诊断设备', '治疗设备', '康复器械', '医用耗材'] },
  { name: '汽车零部件', examples: ['发动机部件', '底盘系统', '电子系统', '车身件'] },
  { name: '电子电气', examples: ['工业电子', '电力设备', '通信设备', '测试仪器'] },
];

const suitableConditions = [
  {
    icon: Building2,
    title: '中大型企业',
    description: '年营收 5000 万以上，有专门的海外销售团队或计划组建',
  },
  {
    icon: Target,
    title: 'B2B 业务模式',
    description: '面向企业客户，客单价较高（通常 5 万+），决策链较长',
  },
  {
    icon: Globe,
    title: '海外拓展需求',
    description: '已有或计划拓展海外市场，目标客户在海外',
  },
  {
    icon: Users,
    title: '团队协作需求',
    description: '销售、市场、运营需要协同作战，希望效率可复制',
  },
  {
    icon: TrendingUp,
    title: '长期增长导向',
    description: '不是追求短期爆单，而是希望建立可持续的获客能力',
  },
  {
    icon: Shield,
    title: '资产化思维',
    description: '希望把获客经验沉淀为组织资产，不因人员流动归零',
  },
];

const notSuitableConditions = [
  {
    title: 'B2C 电商或零售',
    reason: 'VertaX 针对 B2B 长决策链设计，B2C 的高频低价逻辑不适用',
  },
  {
    title: '追求短期爆单',
    reason: 'VertaX 是系统化获客，需要时间沉淀和迭代，不适合急功近利',
  },
  {
    title: '依赖低价竞争',
    reason: '如果核心优势是价格而非专业价值，VertaX 的方法论不匹配',
  },
  {
    title: '预算极度有限',
    reason: 'VertaX 是企业级解决方案，需要一定的投入才能产生效果',
  },
  {
    title: '团队抗拒变化',
    reason: '系统化转型需要团队配合，如果团队不愿意改变很难成功',
  },
  {
    title: '只想要单一工具',
    reason: '如果只需要 SEO 工具或邮件群发工具，VertaX 可能过于复杂',
  },
];

const decisionChecklist = [
  { question: '你的客户是企业而非个人消费者？', weight: '必要条件' },
  { question: '你的产品/服务客单价在 5 万元以上？', weight: '重要条件' },
  { question: '你有专门的海外销售团队或计划组建？', weight: '重要条件' },
  { question: '你希望获客能力可以复制和规模化？', weight: '核心动机' },
  { question: '你愿意投入时间建立系统而非追求速成？', weight: '成功前提' },
  { question: '你的团队愿意学习新的工作方式？', weight: '成功前提' },
];

export default function WhoIsVertaxForPage() {
  const lastUpdated = "2026-04-09";
  
  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.whoIsVertaxFor} />
      <ArticleSchema
        headline="哪些企业适合 VertaX？"
        description="VertaX 适合有海外市场拓展需求的中国企业，尤其适合制造业、工业品、设备、技术服务型和中大型 B2B 出海团队。"
        url="https://vertax.top/about/who-is-vertax-for"
        datePublished="2025-01-15"
        dateModified={lastUpdated}
        keywords={['VertaX适合谁', '制造业出海', '工业品出海', 'B2B出海企业']}
      />
      <SemanticTripleList triples={suitabilityTriples} />
      <div className="min-h-screen bg-[#0a0a14] text-gray-100">
        {/* Navigation */}
        <MarketingNav />

      {/* Hero Section */}
      <header className="pt-16 pb-12 px-6 border-b border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-6">
            <Users className="w-3.5 h-3.5" />
            <span>适用分析</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
            哪些企业适合 VertaX？
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            VertaX 不是万能工具，它专为特定类型的企业设计。了解它是否适合你，避免盲目决策。
          </p>
        </div>
      </header>

      {/* Core Positioning */}
      <section className="py-12 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-4 text-cyan-400">核心定位</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              VertaX 专为<strong className="text-cyan-400">中大型 B2B 出海企业</strong>设计，帮助它们搭建 24 小时运营的海外增长系统。
            </p>
            <p className="text-gray-400 mt-4 text-sm">
              这类企业的特点是：客单价高、决策链长、需要深度客户培育、传统获客方式效率低。
            </p>
          </div>
        </div>
      </section>

      {/* Suitable Industries */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">典型行业</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suitableIndustries.map(({ name, examples }) => (
              <div key={name} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-5 hover:border-cyan-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Factory className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold">{name}</h3>
                </div>
                <div className="flex flex-wrap gap-1">
                  {examples.map(ex => (
                    <span key={ex} className="text-xs bg-[#222222] text-gray-400 px-2 py-0.5 rounded">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suitable Conditions */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            适合 VertaX 的企业特征
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suitableConditions.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{title}</h3>
                    <p className="text-sm text-gray-400">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not Suitable Conditions */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-400" />
            可能不适合 VertaX 的情况
          </h2>
          <div className="space-y-4">
            {notSuitableConditions.map(({ title, reason }) => (
              <div key={title} className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 flex items-start gap-4">
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400">{reason}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
            <p className="text-gray-400 text-sm leading-relaxed">
              <span className="text-gray-300 font-medium">诚实说明：</span> 我们不是什么客户都接。如果 VertaX 不适合你，我们会直接告诉你，而不是让你花钱买一个用不上的系统。
            </p>
          </div>
        </div>
      </section>

      {/* Decision Checklist */}
      <section className="py-16 px-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">快速自检表</h2>
          <p className="text-gray-400 mb-6">回答以下问题，判断 VertaX 是否适合你的企业：</p>
          <div className="space-y-3">
            {decisionChecklist.map(({ question, weight }, index) => (
              <div key={index} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border border-white/20 rounded flex items-center justify-center text-xs text-gray-500">
                    {index + 1}
                  </div>
                  <span className="text-sm">{question}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  weight === '必要条件' ? 'bg-red-500/10 text-red-400' :
                  weight === '重要条件' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-cyan-500/10 text-cyan-400'
                }`}>
                  {weight}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">
              <span className="text-cyan-400 font-medium">判断标准：</span> 如果「必要条件」全部满足，「重要条件」满足 2 个以上，「成功前提」愿意接受，那么 VertaX 很可能适合你。
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            还不确定是否适合？
          </h2>
          <p className="text-gray-400 mb-8">
            预约一次免费咨询，我们会根据你的具体情况给出专业建议，包括是否适合使用 VertaX。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约咨询 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/faq"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              常见问题
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
    </>
  );
}
