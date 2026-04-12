import { Metadata } from 'next';
import { ArrowRight, Map, Target, Users, FileText, Mail, Globe, CheckCircle2, XCircle, Rocket, Building2, AlertTriangle } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema } from '@/components/seo/article-schema';
import { SemanticTripleList } from '@/components/seo/semantic-content';
import { MarketingNav, MarketingFooter } from '@/components/marketing/design-system';

// 语义三元组 - 出海启动方法
const startupTriples = [
  { subject: "出海启动", verb: "需要", object: "系统化方法而非盲目试错" },
  { subject: "从0启动海外市场", verb: "包含", object: "六步启动方法" },
  { subject: "制造业出海", verb: "应先明确", object: "目标市场和目标客户" },
  { subject: "智能获客系统", verb: "可降低", object: "50% 以上人力成本" },
];

export const metadata: Metadata = {
  title: '没有外贸经验如何从0启动海外市场 - 制造业出海指南 | VertaX',
  description: '没有外贸经验，只有好产品，如何从0启动海外市场？本文提供制造业出海的六步启动指南：市场定位、客户识别、内容准备、渠道选择、触达策略、迭代优化。',
  keywords: ['没有外贸经验怎么出海', '制造业从0启动海外市场', '工厂转型外贸第一步', '中小企业出海指南', 'B2B出海启动方法'],
  openGraph: {
    title: '没有外贸经验如何从0启动海外市场',
    description: '制造业出海六步启动指南，适合没有外贸经验的中小企业。',
    type: 'article',
    url: 'https://vertax.top/about/start-overseas-from-zero',
  },
};

const startSteps = [
  {
    step: '01',
    icon: Target,
    title: '确定目标市场',
    description: '基于产品特性、行业趋势、竞争格局，选择1-2个重点目标国家/地区',
    details: [
      '分析产品在哪些国家有需求缺口',
      '研究目标市场的准入法规和标准',
      '评估竞争对手在该市场的布局',
      '选择1-2个作为首批突破点',
    ],
    time: '1-2周',
  },
  {
    step: '02',
    icon: Users,
    title: '定义目标客户',
    description: '明确你要找的客户是谁，他们有什么特征，在哪里活跃',
    details: [
      '确定客户类型（经销商/代理商/终端用户/OEM）',
      '描绘客户画像（规模、行业、决策链）',
      '识别客户活跃渠道（展会/LinkedIn/行业网站）',
      '收集典型客户名单作为对标',
    ],
    time: '1周',
  },
  {
    step: '03',
    icon: FileText,
    title: '准备基础内容',
    description: '制作让海外客户能理解的产品介绍、公司介绍、资质证明',
    details: [
      '产品介绍：规格、应用场景、优势（英文版）',
      '公司介绍：历史、规模、能力（英文版）',
      '资质证明：认证证书、检测报告（翻译）',
      '案例素材：典型应用案例、客户评价',
    ],
    time: '2-3周',
  },
  {
    step: '04',
    icon: Globe,
    title: '建立展示阵地',
    description: '搭建海外客户能找到你的阵地，网站、社媒、行业平台',
    details: [
      '英文官网（至少产品页、公司页、联系页）',
      'LinkedIn 公司主页',
      '目标市场行业平台/目录注册',
      'YouTube 产品演示视频（可选）',
    ],
    time: '2-4周',
  },
  {
    step: '05',
    icon: Mail,
    title: '主动触达客户',
    description: '系统化寻找潜在客户，持续触达，不依赖运气',
    details: [
      '通过LinkedIn/海关数据/展会名录找目标客户',
      '写针对性的开发信（不是群发模板）',
      '跟进策略：多轮触达、多渠道配合',
      '记录触达结果，积累有效话术',
    ],
    time: '持续进行',
  },
  {
    step: '06',
    icon: Rocket,
    title: '迭代优化',
    description: '基于反馈调整策略，逐步形成可复制的获客方法',
    details: [
      '分析回复率、转化率数据',
      '找出高回复话术和高转化渠道',
      '沉淀有效经验为团队标准',
      '扩展到更多目标市场',
    ],
    time: '长期迭代',
  },
];

const commonMistakes = [
  { mistake: '直接注册亚马逊开店', reason: 'B2B企业不适合B2C平台，客户画像不同' },
  { mistake: '花钱做SEO外包', reason: '新站点内容不足，SEO效果有限，应先做内容' },
  { mistake: '大规模邮件群发', reason: '没有针对性，回复率极低，浪费资源' },
  { mistake: '只参加展会', reason: '展会成本高、频率低，不能作为唯一渠道' },
  { mistake: '找外贸代理全包', reason: '代理掌握客户资源，企业无法积累自有资产' },
];

const resourceNeeds = [
  { role: '负责人', count: '1人', duty: '整体策略、客户谈判、资源协调' },
  { role: '内容/运营', count: '1人', duty: '网站维护、社媒运营、资料翻译' },
  { role: '销售/跟进', count: '1-2人', duty: '客户触达、邮件跟进、线索管理' },
];

const faqItems = [
  {
    question: '工厂转型做外贸，第一步应该做什么？',
    answer: '第一步不是注册平台或做网站，而是明确目标市场和目标客户。先回答"谁是我的海外客户"和"他们在哪里"，再决定"怎么触达他们"。盲目行动是最大的浪费。',
  },
  {
    question: '做外贸初期需要投入多少资金和人力？',
    answer: '最小启动配置：1名负责人+1名运营+基础网站（约5-10万），可维持6个月试错。如果使用智能获客系统，人力成本可降低50%以上。',
  },
  {
    question: '不懂英语，能做外贸吗？',
    answer: '可以。现在有AI翻译、AI写邮件、AI做内容等工具辅助。关键是业务逻辑清晰，而非语言能力。VertaX知识引擎可以辅助生成英文内容。',
  },
  {
    question: '传统外贸和品牌出海有什么区别？',
    answer: '传统外贸：被动接单、价格竞争、客户资源分散。品牌出海：主动获客、价值竞争、客户资源沉淀为资产。后者更适合有产品优势的制造企业。',
  },
];

export default function StartOverseasFromZeroPage() {
  const lastUpdated = "2026-04-09";

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <>
      <BreadcrumbSchema items={[
        { name: '首页', url: 'https://vertax.top' },
        { name: '关于', url: 'https://vertax.top/about' },
        { name: '从0启动海外市场', url: 'https://vertax.top/about/start-overseas-from-zero' }
      ]} />
      <ArticleSchema
        headline="没有外贸经验，只有好产品，如何从0启动海外市场？"
        description="制造业出海六步启动指南：市场定位、客户识别、内容准备、渠道选择、触达策略、迭代优化。适合没有外贸经验的中小企业。"
        url="https://vertax.top/about/start-overseas-from-zero"
        datePublished="2025-02-15"
        dateModified={lastUpdated}
        keywords={['没有外贸经验怎么出海', '制造业从0启动海外市场', '工厂转型外贸第一步', 'B2B出海启动方法']}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SemanticTripleList triples={startupTriples} />
      <div className="min-h-screen bg-[#0a0a14] text-gray-100">
        {/* Navigation */}
        <MarketingNav />

        {/* Hero Section */}
        <header className="pt-16 pb-12 px-6 border-b border-white/5">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-6">
              <Map className="w-3.5 h-3.5" />
              <span>出海启动指南</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              没有外贸经验，只有好产品，<br />如何从0启动海外市场？
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              很多制造企业有好的产品，但不知道怎么卖到海外。本文提供一套可执行的六步启动方法，帮助你从0开始，系统化建立海外获客能力。
            </p>
          </div>
        </header>

        {/* Core Semantic Statement */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">核心原则</h2>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">出海启动</strong> 需要 <strong className="text-cyan-400">系统化方法</strong>，而非盲目试错</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">制造业出海</strong> 应先明确 <strong className="text-cyan-400">目标市场和目标客户</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">获客能力</strong> 需要 <strong className="text-cyan-400">沉淀为组织资产</strong>，而非依赖个人</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">智能获客系统</strong> 可以 <strong className="text-cyan-400">降低启动人力成本</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Six Steps */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">六步启动方法</h2>
            <div className="space-y-6">
              {startSteps.map(({ step, icon: Icon, title, description, details, time }) => (
                <div key={step} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-cyan-400 font-bold">{step}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-semibold">{title}</h3>
                        <span className="text-xs text-gray-500 bg-[#222] px-2 py-0.5 rounded">{time}</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">{description}</p>
                      <ul className="space-y-2">
                        {details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                            <span className="text-cyan-500">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              常见错误做法
            </h2>
            <div className="space-y-4">
              {commonMistakes.map(({ mistake, reason }) => (
                <div key={mistake} className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 flex items-start gap-4">
                  <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-300 mb-1">&ldquo;{mistake}&rdquo;</p>
                    <p className="text-sm text-gray-500">{reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resource Needs */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-400" />
              最小启动配置
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {resourceNeeds.map(({ role, count, duty }) => (
                <div key={role} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="font-semibold mb-1">{role}</h3>
                  <p className="text-cyan-400 text-lg mb-2">{count}</p>
                  <p className="text-sm text-gray-500">{duty}</p>
                </div>
              ))}
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-6">
              <p className="text-gray-400 text-sm">
                <span className="text-cyan-400 font-medium">预算参考：</span> 最小启动配置约5-10万（人力+网站），可维持6个月试错。使用智能获客系统可降低50%人力成本。
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">常见问题</h2>
            <div className="space-y-4">
              {faqItems.map(({ question, answer }) => (
                <div key={question} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                  <h3 className="font-semibold mb-3 text-cyan-400">{question}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">
              想系统化启动出海？
            </h2>
            <p className="text-gray-400 mb-8">
              VertaX 提供从市场定位、客户识别、内容准备到持续触达的完整出海获客系统。<br />
              预约演示，了解智能获客系统如何降低你的启动成本。
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

        {/* Footer */}
        <MarketingFooter />
      </div>
    </>
  );
}
