import { Metadata } from 'next';
import React from 'react';
import {
  Target,
  TrendingUp,
  Send,
  Brain,
  Layers,
  Megaphone,
  Radar,
  Gauge,
  Zap,
  Shield,
  BarChart3,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '功能特性 - VertaX 六大核心模块 | VertaX',
  description: 'VertaX 六大核心模块：决策中心、知识引擎、获客雷达、增长系统、声量枢纽、推进中台。帮助制造业、工业品、技术服务型企业建立完整的全球增长闭环。',
  keywords: ['VertaX功能', '决策中心', '知识引擎', '获客雷达', '增长系统', '声量枢纽', '推进中台'],
  openGraph: {
    title: '功能特性 - VertaX 六大核心模块',
    description: 'VertaX 六大核心模块，帮助制造业、工业品、技术服务型企业建立完整的全球增长闭环。',
    type: 'website',
  },
};

const features = [
  {
    icon: Target,
    tag: 'ICP Intelligence',
    title: '目标计算',
    description: '把该找谁变成可量化画像与优先级。',
    details: [
      '知识引擎驱动的客户画像分析',
      '多维度 segmentation（firmographic, technographic, geographic）',
      '智能信号评分与优先级排序',
      '动态更新的目标客户数据库',
    ],
  },
  {
    icon: TrendingUp,
    tag: 'Inbound Growth Engine',
    title: '增长生产',
    description: '多语言 SEO 内容资产，持续吸引高意向客户。',
    details: [
      'AI 驱动的 SEO/GEO 内容生成',
      '关键词研究 → 内容规划 → 自动发布',
      '多语言内容自动分发',
      '社交媒体矩阵协同运营',
    ],
  },
  {
    icon: Send,
    tag: 'Outbound Execution Layer',
    title: '精准触达',
    description: '公司发现 → 穿透 → 联系人 → 建联推进。',
    details: [
      '获客雷达：ICP → 公司 → 穿透 → 联系人',
      'Hunter.io 集成：自动发现决策者邮箱',
      'AI 外联邮件生成与发送',
      '全流程跟进与协作管理',
    ],
  },
];

const capabilities = [
  {
    icon: Brain,
    title: 'Knowledge Engine · 知识引擎',
    description: '产品 / 资质 / 竞品 / 市场结构化沉淀',
  },
  {
    icon: Layers,
    title: 'GTM Copilot · 决策中心',
    description: '趋势简报 / 阶段汇报 / 动作建议',
  },
  {
    icon: Megaphone,
    title: 'Brand Station · 声量枢纽',
    description: '社媒矩阵 / PR 协同 / 声量运营',
  },
  {
    icon: Radar,
    title: 'Acquisition Radar · 获客雷达',
    description: 'ICP → 公司 → 穿透 → 联系人',
  },
  {
    icon: Gauge,
    title: 'Opportunity Accelerator · 协作审批',
    description: '审批 / 待办 / 跟进 / 协作 / 复盘',
  },
  {
    icon: Shield,
    title: 'Pipeline Discipline · 推进中台',
    description: '商机推进纪律与可审计性',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">VertaX</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-400 hover:text-white transition-colors">首页</a>
            <a href="/features" className="text-white font-medium">功能</a>
            <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">定价</a>
            <a href="/about" className="text-gray-400 hover:text-white transition-colors">关于</a>
            <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
              预约演示
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-8 tracking-wide">
            <Zap className="w-3.5 h-3.5" /> GTM Intelligence OS
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            完整的<span className="text-cyan-400">GTM 增长操作系统</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            不是工具集合，是工业出海获客的操作系统。把海外获客做成「可计算、可复制、可审计」的增长系统。
          </p>
        </div>
      </section>

      {/* Three Core Capabilities */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">三大核心能力</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors">
                <feature.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <p className="text-xs text-cyan-500/70 font-medium tracking-wide mb-1">{feature.tag}</p>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-xs text-gray-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500/60 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GTM Flywheel */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">GTM 增长飞轮（闭环）</h2>
          <p className="text-gray-500 text-center mb-12 text-sm">Knowledge → ICP → Content → Traffic → Leads → Outreach → Pipeline → Feedback</p>

          {/* Flywheel visual */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {['Knowledge', 'ICP', 'Content', 'Traffic', 'Leads', 'Outreach', 'Pipeline', 'Feedback'].map((step, i) => (
              <React.Fragment key={step}>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 rounded-md px-3 py-1.5 text-xs font-medium">{step}</span>
                {i < 7 && <ArrowRight className="w-4 h-4 text-gray-600 self-center" />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => (
              <div key={cap.title} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <cap.icon className="w-5 h-5 text-cyan-500/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{cap.title}</p>
                  <p className="text-xs text-gray-500">{cap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision Cockpit */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            Decision Cockpit｜<span className="text-cyan-400">一屏看清</span>
          </h2>
          <p className="text-gray-500 text-center mb-10 text-sm">投入、节奏、结果</p>

          <div className="space-y-4">
            {[
              { icon: BarChart3, text: '新增有效线索、行业热度、关键客户名单' },
              { icon: Gauge, text: '团队进度与瓶颈：谁在卡、卡在哪' },
              { icon: Megaphone, text: '一键生成：周报 / 月报 / 战略简报（可直接发群）' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <Icon className="w-5 h-5 text-cyan-500/60 shrink-0" />
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">老板要的不是功能，是可控感。</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">让出海获客从项目制升级为系统工程。</h2>
          <p className="text-gray-400 mb-8">预约演示，拿到你行业的 GTM 路径样板与 ICP 示例。</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/about"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              了解更多
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-cyan-500 rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <span className="text-sm font-medium">VertaX</span>
            <span className="text-xs text-gray-600 ml-2">© {new Date().getFullYear()} VERTAX LIMITED</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>contact@vertax.top</span>
            <a href="/faq" className="hover:text-gray-300 transition-colors">常见问题</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
