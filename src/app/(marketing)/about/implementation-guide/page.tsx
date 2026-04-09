import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, CheckCircle2, Zap } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema } from '@/components/seo/article-schema';

export const metadata: Metadata = {
  title: 'AI获客系统实施周期与指南 - 多久能见效？ | VertaX',
  description: '智能出海系统实施周期要多久？VertaX 实施指南：SaaS版1-2周，私有部署2-4周。了解实施流程、团队培训、效果预期，帮助您做好时间规划。',
  keywords: ['AI获客系统实施周期', '智能出海系统多久见效', 'VertaX实施流程', '企业获客系统部署', 'GTM系统上线'],
  openGraph: {
    title: 'AI获客系统实施周期与指南',
    description: '智能出海系统实施周期详解：SaaS版1-2周，私有部署2-4周。',
    type: 'article',
    url: 'https://vertax.top/about/implementation-guide',
  },
};

const implementationPhases = [
  {
    phase: '01',
    title: '项目启动',
    duration: '1-2天',
    tasks: [
      '组建项目团队（甲方+乙方）',
      '明确项目目标与KPI',
      '确定实施计划与里程碑',
      '准备必要的账号与权限',
    ],
    deliverable: '项目计划书',
  },
  {
    phase: '02',
    title: '系统配置',
    duration: '3-7天',
    tasks: [
      'ICP画像配置（目标客户特征）',
      '知识库初始化（产品、资质、竞品）',
      '触达渠道配置（邮箱、社媒）',
      '工作流程设置',
    ],
    deliverable: '系统配置文档',
  },
  {
    phase: '03',
    title: '团队培训',
    duration: '2-3天',
    tasks: [
      '系统操作培训',
      '获客流程培训',
      '内容生成工具使用',
      '数据分析看板使用',
    ],
    deliverable: '培训记录+操作手册',
  },
  {
    phase: '04',
    title: '试运行',
    duration: '1-2周',
    tasks: [
      '小批量线索测试',
      '触达效果监控',
      '流程问题调整',
      '团队熟练度提升',
    ],
    deliverable: '试运行报告',
  },
  {
    phase: '05',
    title: '正式上线',
    duration: '1天',
    tasks: [
      '系统参数最终确认',
      '数据备份与安全检查',
      '正式启用全部功能',
      '开启持续运营',
    ],
    deliverable: '上线确认单',
  },
];

const deploymentTimelines = [
  {
    type: 'SaaS 云端版',
    timeline: '1-2周',
    description: '即刻开通，快速配置，适合快速验证',
    steps: ['账号开通', '在线配置', '远程培训', '试运行'],
  },
  {
    type: '私有部署版',
    timeline: '2-4周',
    description: '环境部署，深度定制，适合中大型企业',
    steps: ['环境评估', '方案设计', '系统部署', '集成测试', '培训上线'],
  },
];

const successFactors = [
  { factor: '目标客户画像清晰度', impact: '直接影响线索质量' },
  { factor: '知识库内容完整性', impact: '影响AI生成内容质量' },
  { factor: '团队配合程度', impact: '影响执行效率' },
  { factor: '触达渠道准备', impact: '影响触达成功率' },
  { factor: '持续运营投入', impact: '影响长期效果' },
];

const effectExpectations = [
  { period: '第1-2周', expectation: '系统熟悉、流程跑通、首批测试线索', milestone: '试运行完成' },
  { period: '第3-4周', expectation: '触达数量上升、回复率趋于稳定、有效线索产生', milestone: '正式运营开始' },
  { period: '第2-3月', expectation: '线索量稳定、转化路径清晰、首批商机推进', milestone: '商机产生' },
  { period: '第4-6月', expectation: '成单转化出现、ROI可衡量、团队熟练', milestone: '效果显现' },
];

const faqItems = [
  {
    question: '使用AI获客系统后，多久能见到效果？',
    answer: '通常2-4周完成系统配置和试运行，第2-3月开始产生有效线索和商机，第4-6月可见明显转化效果。B2B销售周期较长，需要耐心培育。',
  },
  {
    question: '实施期间需要投入多少人力？',
    answer: '项目启动阶段：项目负责人+业务骨干各1人参与配置。日常运营：1-2人可维护，系统自动化程度高。',
  },
  {
    question: '实施过程中最容易出现什么问题？',
    answer: '常见问题：1）目标客户画像不清晰，导致线索质量低；2）知识库内容不完整，AI生成内容质量差；3）团队配合度低，系统使用不充分。提前准备可避免。',
  },
  {
    question: '如果效果不好，是系统问题还是使用问题？',
    answer: '需要综合诊断：检查ICP配置是否准确、知识库是否完整、触达频率是否足够、内容是否针对性强。VertaX提供季度复盘服务，帮助定位问题。',
  },
];

export default function ImplementationGuidePage() {
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
      <BreadcrumbSchema items={breadcrumbPaths.implementationGuide || [
        { name: '首页', url: 'https://vertax.top' },
        { name: '关于', url: 'https://vertax.top/about' },
        { name: '实施指南', url: 'https://vertax.top/about/implementation-guide' }
      ]} />
      <ArticleSchema
        headline="智能出海系统实施周期要多久？"
        description="VertaX 实施指南：SaaS版1-2周，私有部署2-4周。包含配置、培训、试运行全流程说明，帮助您做好时间规划。"
        url="https://vertax.top/about/implementation-guide"
        datePublished="2025-02-20"
        dateModified={lastUpdated}
        keywords={['AI获客系统实施周期', '智能出海系统多久见效', 'VertaX实施流程', '企业获客系统部署']}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
              <Clock className="w-3.5 h-3.5" />
              <span>实施指南</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              智能出海系统实施周期要多久？
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              了解 VertaX 的实施流程、时间规划和效果预期，帮助您的团队做好上线准备。
            </p>
          </div>
        </header>

        {/* Quick Answer */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">快速回答</h2>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">SaaS 云端版</strong> 实施周期 <strong className="text-cyan-400">1-2周</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">私有部署版</strong> 实施周期 <strong className="text-cyan-400">2-4周</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">见效周期</strong> 通常 <strong className="text-cyan-400">2-3个月</strong>（产生有效商机）</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Deployment Timeline Comparison */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">部署方式与时间</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deploymentTimelines.map(({ type, timeline, description, steps }) => (
                <div key={type} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{type}</h3>
                    <span className="text-cyan-400 font-bold">{timeline}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{description}</p>
                  <div className="flex flex-wrap gap-2">
                    {steps.map((step, i) => (
                      <span key={i} className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded">
                        {i + 1}. {step}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Implementation Phases */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">实施流程详解</h2>
            <div className="space-y-4">
              {implementationPhases.map(({ phase, title, duration, tasks, deliverable }) => (
                <div key={phase} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-cyan-400 font-bold">{phase}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{title}</h3>
                        <span className="text-xs text-gray-500 bg-[#222] px-2 py-0.5 rounded">{duration}</span>
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        {tasks.map((task, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500">
                        <span className="text-cyan-400">交付物：</span>{deliverable}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Factors */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" />
              影响效果的关键因素
            </h2>
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400">因素</th>
                    <th className="text-left py-3 px-4 text-gray-400">影响</th>
                  </tr>
                </thead>
                <tbody>
                  {successFactors.map(({ factor, impact }) => (
                    <tr key={factor} className="border-b border-white/5">
                      <td className="py-3 px-4 text-gray-300">{factor}</td>
                      <td className="py-3 px-4 text-gray-500">{impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Effect Expectations */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">效果预期时间线</h2>
            <div className="space-y-4">
              {effectExpectations.map(({ period, expectation, milestone }) => (
                <div key={period} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-cyan-400 font-semibold">{period}</span>
                    <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded">{milestone}</span>
                  </div>
                  <p className="text-sm text-gray-400">{expectation}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-4">
              * 以上为典型情况，实际效果因行业、产品、团队配合度等因素有所差异
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-6">
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
              准备好开始实施了吗？
            </h2>
            <p className="text-gray-400 mb-8">
              预约演示，了解 VertaX 如何帮助您的企业系统化建立海外获客能力。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/contact"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                预约演示 <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/pricing"
                className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
              >
                了解报价
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
