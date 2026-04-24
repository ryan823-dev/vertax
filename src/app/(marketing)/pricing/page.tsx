import { Metadata } from 'next';
import { ArrowRight, Building2, Check, Handshake, Layers, Rocket } from 'lucide-react';
import { ArticleSchema } from '@/components/seo/article-schema';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
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
  title: '出海获客平台报价 - VertaX 合作方式 | VertaX',
  description:
    'VertaX 采用商务洽谈与项目制报价，根据企业规模、目标市场、部署方式与服务范围定制合作方案。了解典型投入区间、交付内容与合作流程。',
  keywords: ['出海获客平台报价', '出海获客系统多少钱', '企业获客系统报价', 'GTM 系统报价', 'VertaX 报价'],
  openGraph: {
    title: '出海获客平台报价 - VertaX 合作方式',
    description: '企业级出海获客平台报价说明。VertaX 采用商务洽谈与项目制合作，根据企业实际需求制定交付范围与投入方案。',
    type: 'article',
    url: 'https://vertax.top/pricing',
  },
};

const collaborationScopes = [
  {
    icon: Rocket,
    name: '启动合作',
    description: '适合希望快速验证增长引擎的团队。',
    bestFor: '初次搭建出海增长基础设施的企业',
    features: [
      '基础知识引擎搭建',
      '核心 ICP 与买家画像梳理',
      '官网内容结构初始优化',
      '首批增长主题与内容建议',
      '基础线索发现与工作台配置',
      '上线辅导与使用培训',
    ],
    note: '目标是尽快跑通第一套增长闭环。',
    highlight: false,
  },
  {
    icon: Building2,
    name: '增长运营',
    description: '适合已经有团队、需要持续放大增长效率的企业。',
    bestFor: '有明确目标市场和持续获客需求的企业',
    features: [
      '完整知识引擎与增长引擎接入',
      '目标客户提问地图与内容策略',
      '官网主发布与内容生产协同',
      '线索发现、跟进与管理视图',
      '团队权限与协作流程',
      '季度复盘与持续优化建议',
    ],
    note: '这是最常见的合作范围。',
    highlight: true,
  },
  {
    icon: Handshake,
    name: '深度定制',
    description: '适合对集成、安全或组织流程有更高要求的企业。',
    bestFor: '大型企业、集团客户或有合规要求的团队',
    features: [
      '私有部署或混合部署支持',
      '定制知识结构与审批流程',
      'SSO 与内部系统集成',
      '数据隔离与权限控制',
      '专项实施与培训支持',
      '长期顾问式协作',
    ],
    note: '更强调集成深度、组织适配与长期协同。',
    highlight: false,
  },
];

const processSteps = [
  {
    step: '01',
    title: '需求沟通',
    description: '了解行业、目标市场、团队配置与增长目标。',
  },
  {
    step: '02',
    title: '方案演示',
    description: '结合你的业务，展示知识引擎、增长引擎与工作台方案。',
  },
  {
    step: '03',
    title: '商务确认',
    description: '根据交付范围、部署方式与支持深度确认报价与周期。',
  },
  {
    step: '04',
    title: '实施上线',
    description: '完成配置、培训与上线，进入持续优化阶段。',
  },
];

const heroSignals = [
  {
    label: 'Typical starting point',
    value: '20 万元左右起',
    detail: '根据交付范围、部署方式和支持深度浮动。',
  },
  {
    label: 'Delivery mode',
    value: 'SaaS 或私有部署',
    detail: '同一套产品逻辑，可适配不同组织成熟度与合规要求。',
  },
  {
    label: 'Collaboration type',
    value: '项目制 + 顾问式推进',
    detail: '不是卖单点工具，而是帮助团队把系统真正跑起来。',
  },
];

export default function PricingPage() {
  const lastUpdated = '2026-04-17';
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '出海获客平台一般多少钱？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '出海获客平台的投入取决于交付范围、部署方式、企业规模与服务深度。VertaX 采用商务洽谈与项目制报价，典型首年投入通常从 20 万元左右起，具体会根据官网接入、知识引擎建设、增长运营支持与定制集成范围来确定。',
        },
      },
      {
        '@type': 'Question',
        name: '为什么不采用固定套餐定价？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '不同企业的目标市场、团队能力、数据要求、部署方式与协作深度差异很大。固定套餐很难覆盖真实业务场景，所以 VertaX 采用商务洽谈方式，根据实际交付范围与目标制定合作方案。',
        },
      },
      {
        '@type': 'Question',
        name: '报价通常包含哪些内容？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '通常会包含平台接入、知识引擎与增长引擎配置、工作台能力、培训支持以及约定范围内的交付服务。如涉及私有部署、定制开发或额外持续运营支持，也会在方案中单独说明。',
        },
      },
      {
        '@type': 'Question',
        name: '是否有隐藏费用？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'VertaX 的报价会在合作前明确交付范围、支持方式与可能的额外项目。若存在超出约定范围的定制开发、私有部署运维或额外服务需求，也会在商务阶段提前说明，不会在执行中临时追加。',
        },
      },
    ],
  };

  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.pricing} />
      <ArticleSchema
        dateModified={lastUpdated}
        datePublished="2025-01-15"
        description="VertaX 采用商务洽谈与项目制报价，根据企业规模、目标市场、交付范围和部署方式制定合作方案。"
        headline="出海获客平台一般多少钱？"
        keywords={['出海获客平台报价', '出海获客系统多少钱', '企业获客系统报价']}
        url="https://vertax.top/pricing"
      />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} type="application/ld+json" />

      <MarketingPageWrapper>
        <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20" style={{ background: colors.bg.heroGradient }}>
          <div className="mx-auto max-w-5xl text-center">
            <GoldBadge icon={<Layers className="h-3.5 w-3.5" />}>Flexible engagement, not fixed package</GoldBadge>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
              VertaX 的合作方式
              <br />
              更像产品实施，而不是单纯订阅
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              我们采用商务洽谈与项目制报价，根据企业目标、部署方式与交付范围，给出更贴近实际业务的合作方案。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GoldButton href="/contact" icon={<ArrowRight className="h-4 w-4" />} size="large">
                预约演示
              </GoldButton>
              <OutlineButton dark href="#process">
                了解合作流程
              </OutlineButton>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <MetricBand dark items={heroSignals} />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.primary }}>
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              badge="合作范围"
              subtitle="不是套套餐，而是根据阶段目标与交付深度组合的合作范围。"
              title="典型合作方式"
            />

            <SurfacePanel>
              <div className="space-y-4">
                {collaborationScopes.map((scope) => (
                  <div
                    className="rounded-[24px] border px-5 py-5"
                    key={scope.name}
                    style={{
                      background: scope.highlight ? colors.border.glow : colors.bg.secondary,
                      borderColor: scope.highlight ? colors.border.brand : colors.border.light,
                    }}
                  >
                    <div className="grid gap-5 xl:grid-cols-[240px_220px_1fr]">
                      <div>
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl"
                          style={{
                            background: scope.highlight ? 'rgba(255,255,255,0.75)' : 'rgba(15, 23, 42, 0.04)',
                            border: `1px solid ${scope.highlight ? colors.border.brand : colors.border.light}`,
                          }}
                        >
                          <scope.icon
                            className="h-5 w-5"
                            style={{ color: scope.highlight ? colors.brand.primary : colors.text.secondary }}
                          />
                        </div>
                        <h3 className="mt-4 text-xl font-semibold" style={{ color: colors.text.primary }}>
                          {scope.name}
                        </h3>
                        <p className="mt-2 text-sm leading-7" style={{ color: colors.text.secondary }}>
                          {scope.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
                          Best for
                        </p>
                        <p className="mt-3 text-sm leading-7" style={{ color: colors.text.primary }}>
                          {scope.bestFor}
                        </p>
                        <div
                          className="mt-4 rounded-[18px] px-4 py-3 text-sm leading-7"
                          style={{
                            background: scope.highlight ? 'rgba(255,255,255,0.72)' : 'rgba(15, 23, 42, 0.04)',
                            color: scope.highlight ? colors.brand.primary : colors.text.secondary,
                          }}
                        >
                          {scope.note}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {scope.features.map((feature) => (
                          <div className="flex items-start gap-2 text-sm leading-7" key={feature} style={{ color: colors.text.secondary }}>
                            <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: colors.brand.primary }} />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SurfacePanel>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.tertiary }}>
          <div className="mx-auto max-w-4xl">
            <SectionHeader
              badge="报价说明"
              subtitle="我们更希望先把交付边界、目标和节奏说清楚，而不是给一个看似整齐但不真实的固定价目表。"
              title="关于报价"
            />
            <SurfacePanel>
              <p className="text-lg leading-8" style={{ color: colors.text.primary }}>
                VertaX 是面向企业增长的基础设施产品。我们采用
                <span style={{ color: colors.brand.primary, fontWeight: 600 }}> 商务洽谈与项目制报价 </span>
                ，因为每家企业的行业特性、目标市场、团队结构、官网基础与交付目标都不同。
              </p>
              <p className="mt-4 text-sm leading-8" style={{ color: colors.text.secondary }}>
                我们建议先预约演示。在了解你的业务情况后，我们会提供更贴合实际的交付建议与投入评估。典型首年投入通常从
                <span style={{ color: colors.brand.primary, fontWeight: 600 }}> 20 万元左右起 </span>
                ，具体会根据范围与服务深度浮动。
              </p>
            </SurfacePanel>
          </div>
        </section>

        <section id="process" className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.primary }}>
          <div className="mx-auto max-w-5xl">
            <SectionHeader badge="合作流程" title="从对齐需求到正式上线" />
            <SurfacePanel>
              <div className="space-y-4">
                {processSteps.map((step) => (
                  <div
                    className="grid gap-4 rounded-[22px] border px-4 py-4 md:grid-cols-[88px_180px_1fr]"
                    key={step.step}
                    style={{
                      background: colors.bg.secondary,
                      borderColor: colors.border.light,
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: colors.brand.primary }}>
                      {step.step}
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                      {step.title}
                    </h3>
                    <p className="text-sm leading-7" style={{ color: colors.text.secondary }}>
                      {step.description}
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
              badge="部署方式"
              dark
              subtitle="同一套产品逻辑，可以根据组织成熟度与合规要求选择更合适的交付方式。"
              title="SaaS 或私有部署"
            />
            <SurfacePanel dark>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: 'SaaS 云端交付',
                    description: '更适合希望快速上线、降低运维成本的企业团队。',
                    points: ['云端托管，自动更新', '按需配置，快速接入', '支持后续扩展与升级'],
                  },
                  {
                    title: '私有部署',
                    description: '更适合对数据、权限或合规有明确要求的企业。',
                    points: ['本地或专属环境部署', '数据与访问权限更可控', '支持深度集成与定制'],
                  },
                ].map((item) => (
                  <div
                    className="rounded-[22px] border px-5 py-5"
                    key={item.title}
                    style={{
                      background: 'rgba(248, 251, 255, 0.04)',
                      borderColor: 'rgba(248, 251, 255, 0.1)',
                    }}
                  >
                    <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                    <div className="mt-5 space-y-3">
                      {item.points.map((point) => (
                        <div className="flex items-start gap-2 text-sm leading-7 text-slate-300" key={point}>
                          <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: colors.brand.secondary }} />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SurfacePanel>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24" style={{ background: colors.bg.primary }}>
          <div className="mx-auto max-w-3xl text-center">
            <GoldBadge icon={<Handshake className="h-3.5 w-3.5" />}>Next step</GoldBadge>
            <h2 className="mt-6 text-3xl font-bold sm:text-4xl" style={{ color: colors.text.primary }}>
              如果你们已经在认真看增长系统这件事
            </h2>
            <p className="mt-4 text-base leading-8" style={{ color: colors.text.secondary }}>
              预约演示会比继续看价目表更有效。我们会把你们行业相关的知识引擎和增长工作流示例提前准备好。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GoldButton href="/contact" icon={<ArrowRight className="h-4 w-4" />} size="large">
                预约演示
              </GoldButton>
              <OutlineButton dark={false} href="/features">
                了解功能
              </OutlineButton>
            </div>
          </div>
        </section>
      </MarketingPageWrapper>
    </>
  );
}
