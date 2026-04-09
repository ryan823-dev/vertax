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
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { colors } from '@/lib/design-tokens';
import { MarketingNav, MarketingFooter, SectionHeader, Card, GoldButton, OutlineButton, GoldBadge } from '@/components/marketing/design-system';

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
    <>
      <BreadcrumbSchema items={breadcrumbPaths.features} />
      <div className="min-h-screen" style={{ background: colors.bg.primary, fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        <MarketingNav />

        {/* Hero Section */}
        <section
          className="pt-16 pb-20 px-4 sm:px-6"
          style={{ background: 'linear-gradient(180deg, #0B1220 0%, #0D1526 50%, #F7F3EA 100%)' }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <GoldBadge icon={<Zap className="w-3.5 h-3.5" />}>
              GTM Intelligence OS
            </GoldBadge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-white mt-6">
              完整的<span style={{ color: colors.brand.gold }}>GTM 增长操作系统</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              不是工具集合，是工业出海获客的操作系统。把海外获客做成「可计算、可复制、可审计」的增长系统。
            </p>
          </div>
        </section>

        {/* Three Core Capabilities */}
        <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              badge="核心能力"
              title="三大核心能力"
              align="center"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover:-translate-y-1">
                  <feature.icon className="w-8 h-8 mb-4" style={{ color: colors.brand.gold }} />
                  <p className="text-xs font-medium tracking-wide mb-1" style={{ color: colors.brand.gold }}>{feature.tag}</p>
                  <h3 className="text-lg font-bold mb-2" style={{ color: colors.text.primary }}>{feature.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: colors.text.secondary }}>{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-xs" style={{ color: colors.text.muted }}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: colors.brand.gold }} />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* GTM Flywheel */}
        <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.secondary }}>
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              badge="增长飞轮"
              title="GTM 增长飞轮（闭环）"
              subtitle="Knowledge → ICP → Content → Traffic → Leads → Outreach → Pipeline → Feedback"
              align="center"
            />

            {/* Flywheel visual */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {['Knowledge', 'ICP', 'Content', 'Traffic', 'Leads', 'Outreach', 'Pipeline', 'Feedback'].map((step, i) => (
                <React.Fragment key={step}>
                  <span
                    className="rounded-md px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: `rgba(${colors.brand.goldRgb},0.1)`,
                      color: colors.brand.gold,
                      border: `1px solid rgba(${colors.brand.goldRgb},0.15)`,
                    }}
                  >
                    {step}
                  </span>
                  {i < 7 && <ArrowRight className="w-4 h-4 self-center" style={{ color: colors.text.muted }} />}
                </React.Fragment>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capabilities.map((cap) => (
                <div
                  key={cap.title}
                  className="flex items-start gap-3 rounded-lg p-4"
                  style={{
                    background: colors.bg.primary,
                    border: `1px solid ${colors.border.light}`,
                  }}
                >
                  <cap.icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: colors.brand.gold }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>{cap.title}</p>
                    <p className="text-xs" style={{ color: colors.text.muted }}>{cap.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Decision Cockpit */}
        <section
          className="py-16 sm:py-20 px-4 sm:px-6"
          style={{ background: colors.bg.darkGradient }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-widest mb-3 inline-block" style={{ color: colors.brand.gold }}>
                决策中心
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Decision Cockpit｜<span style={{ color: colors.brand.gold }}>一屏看清</span>
              </h2>
              <p className="text-gray-500 text-sm">投入、节奏、结果</p>
            </div>

            <div className="space-y-4">
              {[
                { icon: BarChart3, text: '新增有效线索、行业热度、关键客户名单' },
                { icon: Gauge, text: '团队进度与瓶颈：谁在卡、卡在哪' },
                { icon: Megaphone, text: '一键生成：周报 / 月报 / 战略简报（可直接发群）' },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-4 rounded-lg p-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon className="w-5 h-5 shrink-0" style={{ color: colors.brand.gold }} />
                  <p className="text-sm text-white">{text}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: colors.text.muted }}>老板要的不是功能，是可控感。</p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-24 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: colors.text.primary }}>
              让出海获客从项目制升级为系统工程。
            </h2>
            <p className="mb-8" style={{ color: colors.text.secondary }}>
              预约演示，拿到你行业的 GTM 路径样板与 ICP 示例。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <GoldButton href="/contact" size="large" icon={<ArrowRight className="w-4 h-4" />}>
                预约演示
              </GoldButton>
              <OutlineButton href="/about/what-is-vertax" dark={false}>
                了解更多
              </OutlineButton>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
