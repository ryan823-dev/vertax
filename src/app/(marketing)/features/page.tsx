import { Metadata } from 'next';
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Gauge,
  Layers,
  Megaphone,
  Radar,
  Rocket,
  Send,
  Shield,
  Target,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import {
  GoldBadge,
  GoldButton,
  MarketingPageWrapper,
  MetricBand,
  OutlineButton,
  SectionHeader,
  SurfacePanel,
} from '@/components/marketing/design-system';
import { colors } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: '功能特色 - VertaX 核心模块 | VertaX',
  description:
    'VertaX 通过知识引擎、增长引擎、机会雷达、品牌分发、协同工作台和管理视图，帮助工业 B2B 企业建立更完整的全球增长闭环。',
  keywords: ['VertaX 功能', '知识引擎', '获客雷达', '增长引擎', '品牌分发', '协同工作台'],
  openGraph: {
    title: '功能特色 - VertaX 核心模块',
    description: '不是一组零散工具，而是一套更完整的增长工作系统。',
    type: 'website',
  },
};

const coreCapabilities = [
  {
    icon: Target,
    tag: 'ICP Intelligence',
    title: '目标识别',
    description: '把该找谁、先找谁、为什么找，变成持续更新的客户上下文。',
    details: [
      '基于知识引擎的客户画像分析',
      '按行业、国家、技术栈和组织阶段分层',
      '机会信号评分与优先级排序',
      '动态更新的目标客户数据库',
    ],
  },
  {
    icon: TrendingUp,
    tag: 'Growth Engine',
    title: '增长生产',
    description: '把内容、搜索、品牌叙事和站点更新组织成同一条增长生产线。',
    details: [
      'AI 驱动的 SEO / GEO 内容生成',
      '关键词研究、内容规划与发布协同',
      '多语言内容与渠道分发',
      '面向 AI 搜索的知识引用结构优化',
    ],
  },
  {
    icon: Send,
    tag: 'Execution Layer',
    title: '精准触达',
    description: '从线索发现到联系动作，不再依赖群发和人工拼接流程。',
    details: [
      '围绕 ICP 持续发现目标公司与联系人',
      'AI 生成更贴近业务场景的触达内容',
      '跟进动作、反馈与下一步建议联动',
      '把执行节奏沉淀成可复用方法',
    ],
  },
];

const systemSurfaces = [
  {
    icon: Brain,
    title: 'Knowledge Engine',
    description: '产品、案例、竞品、行业问题和客户话术的统一知识层。',
  },
  {
    icon: Layers,
    title: 'Assistant Workspace',
    description: '让对话式 AI 真正成为界面中的工作层，而不是一个附属按钮。',
  },
  {
    icon: Megaphone,
    title: 'Brand Station',
    description: '把品牌表达、内容分发与市场信号连接起来，形成长期可见度。',
  },
  {
    icon: Radar,
    title: 'Acquisition Radar',
    description: '持续识别高价值线索，并把目标判断标准沉淀到系统里。',
  },
  {
    icon: Workflow,
    title: 'Collaboration Layer',
    description: '内容、机会、审批和执行动作在同一个工作流里协同推进。',
  },
  {
    icon: BarChart3,
    title: 'Management View',
    description: '管理层看到的不是装饰性看板，而是可解释、可追踪的增长状态。',
  },
];

const flywheel = ['Knowledge', 'ICP', 'Content', 'Traffic', 'Signals', 'Outreach', 'Pipeline', 'Feedback'];

const aiWorkspacePoints = [
  {
    icon: Gauge,
    title: '把问题和动作放在同一表面',
    description: '先问、再看、再执行，而不是在多个页面里跳转找功能。',
  },
  {
    icon: Shield,
    title: '让组织经验成为系统能力',
    description: '每一次内容产出、机会判断和跟进节奏都会沉淀为下一次工作的基础。',
  },
  {
    icon: Rocket,
    title: '让系统真的参与工作',
    description: 'AI 不再只是写一段文案，而是参与判断、整理、提醒与协同。',
  },
];

const summaryMetrics = [
  {
    label: 'System model',
    value: '3 大核心能力',
    detail: '识别、生产、执行，不再由彼此割裂的模块承担。',
  },
  {
    label: 'Operating surface',
    value: '6 个统一表面',
    detail: '从知识到管理视图共用同一套层级和交互语言。',
  },
  {
    label: 'Working style',
    value: '1 条连续闭环',
    detail: '知识、内容、线索、动作与反馈在同一系统内流动。',
  },
];

export default function FeaturesPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VertaX',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'VertaX 是 AI 驱动的出海增长工作系统，通过知识引擎、增长引擎、机会雷达与协同工作台，帮助企业建立更完整的全球增长闭环。',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
      description: '预约演示获取报价',
    },
    provider: {
      '@type': 'Organization',
      name: 'VERTAX LIMITED',
      url: 'https://vertax.top',
    },
  };

  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.features} />
      <OrganizationSchema />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} type="application/ld+json" />

      <MarketingPageWrapper>
        <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20" style={{ background: colors.bg.heroGradient }}>
          <div className="mx-auto max-w-5xl text-center">
            <GoldBadge icon={<Zap className="h-3.5 w-3.5" />}>GTM Intelligence System</GoldBadge>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
              一套更像工作系统的
              <br />
              出海增长界面
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              不是把工具堆在一起，而是把知识、内容、线索、动作和管理视图组织成一套可持续工作的 AI-native 产品。
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <MetricBand dark items={summaryMetrics} />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.primary }}>
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              badge="Core capabilities"
              subtitle="三类能力分别负责识别、生产和执行，但它们不会彼此断开。"
              title="三大核心能力"
            />
            <div className="space-y-4">
              {coreCapabilities.map((feature) => (
                <SurfacePanel key={feature.title}>
                  <div className="grid gap-5 xl:grid-cols-[220px_1fr_1.1fr]">
                    <div>
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl"
                        style={{
                          background: colors.border.glow,
                          border: `1px solid ${colors.border.brand}`,
                        }}
                      >
                        <feature.icon className="h-5 w-5" style={{ color: colors.brand.primary }} />
                      </div>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
                        {feature.tag}
                      </p>
                      <h3 className="mt-3 text-xl font-semibold" style={{ color: colors.text.primary }}>
                        {feature.title}
                      </h3>
                    </div>

                    <div>
                      <p className="text-sm leading-7" style={{ color: colors.text.secondary }}>
                        {feature.description}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {feature.details.map((detail) => (
                        <div className="flex items-start gap-2 text-sm leading-7" key={detail} style={{ color: colors.text.secondary }}>
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: colors.brand.primary }} />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SurfacePanel>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.tertiary }}>
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              badge="Growth loop"
              subtitle="系统不是静态模块集合，而是一条会持续回流、更新和变强的工作循环。"
              title="增长飞轮"
            />

            <div className="flex flex-wrap justify-center gap-2">
              {flywheel.map((step) => (
                <span
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  key={step}
                  style={{
                    background: colors.bg.secondary,
                    border: `1px solid ${colors.border.light}`,
                    color: colors.text.primary,
                  }}
                >
                  {step}
                </span>
              ))}
            </div>

            <SurfacePanel className="mt-10">
              <div className="grid gap-3 md:grid-cols-2">
                {systemSurfaces.map((surface, index) => (
                  <div
                    className="rounded-[22px] border px-5 py-5"
                    key={surface.title}
                    style={{
                      background: index === 1 ? colors.border.glow : colors.bg.secondary,
                      borderColor: index === 1 ? colors.border.brand : colors.border.light,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <surface.icon className="h-4 w-4" style={{ color: colors.brand.primary }} />
                      <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                        {surface.title}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-7" style={{ color: colors.text.secondary }}>
                      {surface.description}
                    </p>
                  </div>
                ))}
              </div>
            </SurfacePanel>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.darkGradient }}>
          <div className="mx-auto max-w-5xl">
            <SectionHeader
              badge="AI workspace"
              dark
              subtitle="这不是驾驶舱式的陈列，而是更像一个会持续协助团队工作的界面。"
              title="为什么它更像 AI 工作台，而不是传统看板"
            />
            <SurfacePanel dark>
              <div className="space-y-4">
                {aiWorkspacePoints.map((item) => (
                  <div
                    className="grid gap-4 rounded-[22px] border px-4 py-4 md:grid-cols-[240px_1fr]"
                    key={item.title}
                    style={{
                      background: 'rgba(248, 251, 255, 0.04)',
                      borderColor: 'rgba(248, 251, 255, 0.1)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" style={{ color: colors.brand.secondary }} />
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                    </div>
                    <p className="text-sm leading-7 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </SurfacePanel>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24" style={{ background: colors.bg.primary }}>
          <div className="mx-auto max-w-3xl text-center">
            <GoldBadge icon={<Layers className="h-3.5 w-3.5" />}>See the system in action</GoldBadge>
            <h2 className="mt-6 text-3xl font-bold sm:text-4xl" style={{ color: colors.text.primary }}>
              如果你们想看到这套系统如何真正参与工作
            </h2>
            <p className="mt-4 text-base leading-8" style={{ color: colors.text.secondary }}>
              预约演示，我们会结合你们的行业背景展示知识引擎、机会识别和协同工作台如何连成一套闭环。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GoldButton href="/contact" icon={<ArrowRight className="h-4 w-4" />} size="large">
                预约演示
              </GoldButton>
              <OutlineButton dark={false} href="/about/what-is-vertax">
                了解更多
              </OutlineButton>
            </div>
          </div>
        </section>
      </MarketingPageWrapper>
    </>
  );
}
