'use client';

import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Compass,
  FileStack,
  Layers,
  Radar,
  Sparkles,
  Workflow,
} from 'lucide-react';
import {
  AnimatedBackground,
  GoldBadge,
  GoldButton,
  MarketingPageWrapper,
  MetricBand,
  OutlineButton,
  SectionHeader,
  SurfacePanel,
  TrustIndicators,
  colors,
} from '@/components/marketing/design-system';

const operatingSurfaces = [
  {
    icon: Brain,
    title: '知识底座',
    summary: '统一产品、行业、案例与客户问题的语义层，让 AI 真正理解企业上下文。',
  },
  {
    icon: Radar,
    title: '机会雷达',
    summary: '围绕 ICP、市场信号和采购窗口持续识别高价值目标，而不是临时搜名单。',
  },
  {
    icon: Workflow,
    title: '协同工作台',
    summary: '把内容、线索、动作和复盘组织在同一个表面里，减少跨工具跳转。',
  },
  {
    icon: BarChart3,
    title: '管理视图',
    summary: '管理层看到的是一条连续的增长状态，而不是一堆孤立看板和截图。',
  },
];

const painPoints = [
  {
    title: '知识不在系统里',
    description: '内容、案例、客户问题和团队经验散落在不同工具中，AI 只能生成表面输出，无法形成企业记忆。',
  },
  {
    title: '动作很多，闭环很弱',
    description: '搜索、群发、展会和手工跟进做了不少，但信息没有沉淀成可复用的方法，下一轮还得重来。',
  },
  {
    title: '视图割裂，判断靠感觉',
    description: '市场、销售和管理层各自看自己的页面，无法在 5 秒内对齐现状、优先级和下一步动作。',
  },
];

const workflowSteps = [
  {
    title: '沉淀企业上下文',
    description: '先把产品、行业、客户问题、竞品与品牌表达整理成一套可调用的知识结构。',
  },
  {
    title: '持续识别机会',
    description: '围绕 ICP 和市场信号筛选值得优先推进的公司与联系人，而不是一次性导表。',
  },
  {
    title: '在同一界面里执行',
    description: '从内容、触达、跟进到复盘都在同一个工作台中协同完成，减少切换成本。',
  },
];

const proofStats = [
  {
    label: 'Interface style',
    value: 'AI-native',
    detail: '更像工作界面，而不是传统深色展示页。',
  },
  {
    label: 'System logic',
    value: 'Knowledge first',
    detail: '先建立上下文，再做内容、机会识别和执行动作。',
  },
  {
    label: 'Team outcome',
    value: 'Systemic',
    detail: '把增长方法沉淀为长期资产，而不是一次性项目。',
  },
];

const opportunitySignals = [
  '德国包装设备集成商，采购窗口 30 天内',
  '波兰汽车零部件工厂，自动化升级需求明确',
  '西班牙系统集成商，正在评估替代供应商',
];

export default function LandingPage() {
  return (
    <MarketingPageWrapper>
      <section
        className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-18"
        style={{ background: colors.bg.heroGradient }}
      >
        <AnimatedBackground />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <GoldBadge icon={<Sparkles className="h-3.5 w-3.5" />}>
              Calm Intelligence for industrial global growth
            </GoldBadge>
            <h1 className="mt-7 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[4rem]">
              把出海增长从零散动作
              <br />
              变成持续运行的智能系统
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              VertaX 不是把 AI 贴在旧流程上，而是把知识、内容、机会发现、跟进动作和管理视图组织成同一个
              AI-native 工作界面。
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GoldButton href="/contact" icon={<ArrowRight className="h-4 w-4" />} size="large">
                预约演示
              </GoldButton>
              <OutlineButton dark href="/features">
                查看产品能力
              </OutlineButton>
            </div>
            <div className="mt-10">
              <TrustIndicators />
            </div>
          </div>

          <SurfacePanel
            className="mt-14 backdrop-blur-[16px]"
            dark
            padding="compact"
          >
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.92fr]">
              <div
                className="rounded-[26px] border p-5"
                style={{
                  background: '#F8FBFF',
                  borderColor: colors.border.light,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: colors.border.glow,
                      color: colors.brand.primary,
                    }}
                  >
                    AI workspace
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: 'rgba(15, 23, 42, 0.06)',
                      color: colors.text.secondary,
                    }}
                  >
                    ICP / 内容 / 线索 / 动作
                  </span>
                </div>

                <div
                  className="mt-4 rounded-[22px] border px-4 py-4"
                  style={{
                    background: colors.bg.secondary,
                    borderColor: colors.border.light,
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
                    Quick ask
                  </p>
                  <p className="mt-2 text-sm font-medium leading-7" style={{ color: colors.text.primary }}>
                    本周欧洲市场里，哪些工业自动化买家最值得优先跟进？
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div
                    className="rounded-[22px] border px-4 py-4"
                    style={{
                      background: colors.bg.elevated,
                      borderColor: colors.border.light,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" style={{ color: colors.brand.primary }} />
                      <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                        知识引擎摘要
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-7" style={{ color: colors.text.secondary }}>
                      系统已识别 3 个高意向主题：自动化改造、节拍提升、替代欧洲本地供应商。
                    </p>
                  </div>

                  <div
                    className="overflow-hidden rounded-[22px] border"
                    style={{
                      background: colors.bg.elevated,
                      borderColor: colors.border.light,
                    }}
                  >
                    <div
                      className="px-4 py-3 text-sm font-semibold"
                      style={{
                        background: 'rgba(15, 23, 42, 0.04)',
                        color: colors.text.primary,
                      }}
                    >
                      机会列表
                    </div>
                    {opportunitySignals.map((item, index) => (
                      <div
                        className="flex items-start gap-3 px-4 py-3"
                        key={item}
                        style={{
                          borderTop: index === 0 ? undefined : `1px solid ${colors.border.light}`,
                        }}
                      >
                        <Radar className="mt-0.5 h-4 w-4 shrink-0" style={{ color: colors.brand.secondary }} />
                        <p className="text-sm leading-7" style={{ color: colors.text.secondary }}>
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div
                  className="rounded-[26px] border px-5 py-5"
                  style={{
                    background: 'rgba(248, 251, 255, 0.08)',
                    borderColor: colors.border.brand,
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Assistant layer</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    像 ChatGPT 一样可对话，像 Notion 一样可组织
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    AI 不再是一个悬浮按钮，而是贯穿在界面里的原生工作层。
                  </p>
                </div>

                <div
                  className="overflow-hidden rounded-[26px] border"
                  style={{
                    background: colors.bg.elevated,
                    borderColor: colors.border.light,
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" style={{ color: colors.brand.primary }} />
                      <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                        统一表面语言
                      </p>
                    </div>
                  </div>
                  {[
                    '每个模块都有一致的层级、边框、状态和动作语言。',
                    '信息扫描更快，管理层和执行层都能在 5 秒内读懂页面。',
                    '品牌金只做点缀，不再承担主交互角色。',
                  ].map((item) => (
                    <div
                      className="flex items-start gap-3 px-5 py-4"
                      key={item}
                      style={{
                        borderTop: `1px solid ${colors.border.light}`,
                      }}
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: colors.data.positive }} />
                      <p className="text-sm leading-7" style={{ color: colors.text.secondary }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SurfacePanel>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.primary }}>
        <div className="mx-auto max-w-6xl">
          <MetricBand items={proofStats} />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.tertiary }}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            align="left"
            badge="Why It Breaks"
            subtitle="很多团队的问题不是不努力，而是增长动作仍然停留在碎片化阶段。"
            title="旧流程为什么越来越难支撑出海增长"
          />
          <SurfacePanel>
            <div className="divide-y" style={{ borderColor: colors.border.light }}>
              {painPoints.map((item, index) => (
                <div className="grid gap-4 py-5 md:grid-cols-[100px_1fr]" key={item.title}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
                      0{index + 1}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7" style={{ color: colors.text.secondary }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.primary }}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            align="left"
            badge="Operating Surfaces"
            subtitle="VertaX 把增长拆成几块可复用、可协同、可持续优化的系统表面。"
            title="一套更像产品，而不是工具拼盘的增长界面"
          />
          <SurfacePanel>
            <div className="grid gap-3 md:grid-cols-2">
              {operatingSurfaces.map((surface, index) => (
                <div
                  className="rounded-[22px] border px-5 py-5"
                  key={surface.title}
                  style={{
                    background: index === 0 ? colors.border.glow : colors.bg.secondary,
                    borderColor: index === 0 ? colors.border.brand : colors.border.light,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{
                        background: colors.border.glow,
                        border: `1px solid ${colors.border.brand}`,
                      }}
                    >
                      <surface.icon className="h-5 w-5" style={{ color: colors.brand.primary }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                        {surface.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7" style={{ color: colors.text.secondary }}>
                        {surface.summary}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.darkGradient }}>
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            badge="How It Works"
            dark
            subtitle="从上下文、识别到执行，让每一步都在同一个系统中衔接。"
            title="VertaX 的工作方式更像一个智能循环"
          />
          <SurfacePanel dark>
            <div className="space-y-4">
              {workflowSteps.map((item, index) => (
                <div
                  className="grid gap-4 rounded-[22px] px-4 py-4 md:grid-cols-[120px_1fr]"
                  key={item.title}
                  style={{
                    background: 'rgba(248, 251, 255, 0.04)',
                    border: '1px solid rgba(248, 251, 255, 0.08)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4" style={{ color: colors.brand.secondary }} />
                    <span className="text-sm font-semibold text-white">0{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24" style={{ background: colors.bg.primary }}>
        <div className="mx-auto max-w-4xl text-center">
          <GoldBadge icon={<FileStack className="h-3.5 w-3.5" />}>Ready to review</GoldBadge>
          <h2 className="mt-6 text-3xl font-bold sm:text-4xl" style={{ color: colors.text.primary }}>
            如果你们要的是一套更像科技产品的出海系统
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8" style={{ color: colors.text.secondary }}>
            我们就不再把页面做成传统企业展示站，而是把它做成一个能让董事会和执行团队都感到“这套东西真的在工作”的产品界面。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GoldButton href="/contact" icon={<ArrowRight className="h-4 w-4" />} size="large">
              预约演示
            </GoldButton>
            <OutlineButton dark={false} href="/pricing">
              查看合作方式
            </OutlineButton>
          </div>
        </div>
      </section>
    </MarketingPageWrapper>
  );
}
