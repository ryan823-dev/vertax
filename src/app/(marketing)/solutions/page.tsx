import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Zap, Target, Globe, TrendingUp, CheckCircle2 } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { colors } from '@/lib/design-tokens';
import { MarketingNav, MarketingFooter, SectionHeader, Card, GoldButton, OutlineButton } from '@/components/marketing/design-system';

export const metadata: Metadata = {
  title: '解决方案 - VertaX 行业化 GTM 方案',
  description: '针对制造业、机器人、工业设备、新能源等行业的定制化 GTM 解决方案。了解 VertaX 如何帮助不同行业企业实现海外增长。',
  keywords: ['GTM 解决方案', '行业方案', '制造业出海', '机器人获客', '工业设备营销', '新能源出海'],
  openGraph: {
    title: '解决方案 - VertaX 行业化 GTM 方案',
    description: '针对制造业、机器人、工业设备、新能源等行业的定制化 GTM 解决方案。',
    type: 'website',
  },
};

const industries = [
  {
    icon: Building2,
    name: '制造业',
    description: '机械设备、零部件、OEM/ODM 制造商',
    challenges: [
      '传统 B2B 获客依赖展会与老客户推荐',
      '海外市场信息不对称，难以精准定位目标客户',
      '缺乏数字化获客体系，过度依赖外贸团队个人能力',
      '难以触达海外决策者，邮件回复率低',
    ],
    solutions: [
      '行业 ICP 画像：基于产品特性与目标市场定义理想客户',
      '获客雷达：自动发现并 enrich 目标公司信息与联系人',
      'AI 内容引擎：生成多语言技术文档与营销内容',
      '决策链穿透：找到采购经理、技术总监等关键决策人',
    ],
    metrics: {
      leadsIncrease: '3-5 倍',
      responseRate: '提升 2-3 倍',
      conversionTime: '缩短 40%',
    },
  },
  {
    icon: Zap,
    name: '机器人/自动化',
    description: '工业机器人、协作机器人、自动化产线',
    challenges: [
      '产品复杂度高，需要教育市场与技术支持',
      '目标客户分散，涵盖汽车、3C、医疗等多个行业',
      '销售周期长，需要持续培育线索',
      '竞争激烈，需要差异化定位',
    ],
    solutions: [
      '场景化 ICP：按应用行业与工艺环节细分目标客户',
      '知识引擎：沉淀产品知识、案例库、技术文档',
      '内容营销：生成行业解决方案与技术白皮书',
      '智能培育：自动化跟进与线索评分',
    ],
    metrics: {
      leadsIncrease: '4-6 倍',
      responseRate: '提升 3 倍',
      conversionTime: '缩短 50%',
    },
  },
  {
    icon: Target,
    name: '工业设备',
    description: '涂装设备、激光设备、数控机床、检测设备',
    challenges: [
      '客单价高，决策链复杂',
      '需要证明 ROI 与技术优势',
      '目标客户分散在全球各地',
      '售后服务要求高',
    ],
    solutions: [
      '高价值客户识别：基于信号评分优先跟进高意向客户',
      '案例驱动营销：生成行业案例与效果对比',
      '技术内容库：自动化生成技术文档与 FAQ',
      '全生命周期管理：从线索到售后的全流程跟进',
    ],
    metrics: {
      leadsIncrease: '2-4 倍',
      responseRate: '提升 2 倍',
      conversionTime: '缩短 30%',
    },
  },
  {
    icon: Globe,
    name: '新能源',
    description: '储能系统、光伏设备、电池制造',
    challenges: [
      '海外市场政策驱动，需要快速响应',
      '项目制销售，周期长金额大',
      '需要本地化合作伙伴网络',
      '合规与技术认证要求高',
    ],
    solutions: [
      '市场情报：监控目标市场政策与项目信息',
      '渠道发现：识别并触达本地 EPC、分销商',
      '项目跟进：从线索到项目落地的全流程管理',
      '合规文档：自动生成认证资料与技术文档',
    ],
    metrics: {
      leadsIncrease: '3-5 倍',
      responseRate: '提升 2-3 倍',
      conversionTime: '缩短 35%',
    },
  },
];

const commonBenefits = [
  {
    icon: Target,
    title: '精准获客',
    description: '基于知识引擎的 ICP 画像，让获客目标更清晰，不再大海捞针。',
  },
  {
    icon: Zap,
    title: '效率提升',
    description: 'AI 驱动的自动化流程，让 1 个人完成 3 个人的工作量。',
  },
  {
    icon: TrendingUp,
    title: '可预测增长',
    description: '数据驱动的决策驾驶舱，让增长可量化、可预测、可优化。',
  },
  {
    icon: CheckCircle2,
    title: '资产沉淀',
    description: '每一次获客动作都沉淀为组织资产，不因人员流动归零。',
  },
];

export default function SolutionsPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.solutions} />
      <div className="min-h-screen" style={{ background: colors.bg.primary, fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        <MarketingNav />

        {/* Hero Section */}
        <section
          className="pt-16 pb-20 px-4 sm:px-6"
          style={{ background: colors.bg.heroGradient }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-white">
              行业化<span style={{ color: colors.brand.gold }}>解决方案</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              针对不同行业的特性与挑战，提供定制化的 GTM 增长方案。
              <br />
              <span className="text-sm text-gray-500">
                已服务制造业、机器人、工业设备、新能源等多个行业。
              </span>
            </p>
          </div>
        </section>

        {/* Common Benefits */}
        <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              badge="核心价值"
              title="VertaX 核心价值"
              align="center"
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {commonBenefits.map((benefit) => (
                <div key={benefit.title} className="text-center">
                  <benefit.icon className="w-10 h-10 mx-auto mb-4" style={{ color: colors.brand.gold }} />
                  <h3 className="text-base font-bold mb-2" style={{ color: colors.text.primary }}>{benefit.title}</h3>
                  <p className="text-sm" style={{ color: colors.text.secondary }}>{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions */}
        <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.secondary }}>
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              badge="行业方案"
              title="行业解决方案"
              align="center"
            />
            <div className="space-y-12">
              {industries.map((industry, index) => (
                <div
                  key={industry.name}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                >
                  {/* Left: Industry Info */}
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <industry.icon className="w-10 h-10" style={{ color: colors.brand.gold }} />
                      <div>
                        <h3 className="text-2xl font-bold" style={{ color: colors.text.primary }}>{industry.name}</h3>
                        <p className="text-sm" style={{ color: colors.text.secondary }}>{industry.description}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-base font-bold mb-3" style={{ color: '#F59E0B' }}>行业挑战</h4>
                      <ul className="space-y-2">
                        {industry.challenges.map((challenge) => (
                          <li key={challenge} className="flex items-start gap-2 text-sm" style={{ color: colors.text.primary }}>
                            <span className="mt-1" style={{ color: '#F59E0B' }}>•</span>
                            <span>{challenge}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-base font-bold mb-3" style={{ color: colors.brand.gold }}>VertaX 方案</h4>
                      <ul className="space-y-2">
                        {industry.solutions.map((solution) => (
                          <li key={solution} className="flex items-start gap-2 text-sm" style={{ color: colors.text.primary }}>
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colors.brand.gold }} />
                            <span>{solution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>

                  {/* Right: Metrics */}
                  <div className="flex flex-col justify-center">
                    <div
                      className="rounded-2xl p-8"
                      style={{
                        background: `rgba(${colors.brand.goldRgb},0.08)`,
                        border: `1px solid rgba(${colors.brand.goldRgb},0.2)`,
                      }}
                    >
                      <h4 className="text-lg font-bold mb-6" style={{ color: colors.brand.gold }}>客户成果</h4>
                      <div className="space-y-6">
                        <div>
                          <div className="text-3xl font-bold text-white mb-1">
                            {industry.metrics.leadsIncrease}
                          </div>
                          <div className="text-sm text-gray-400">线索数量增长</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-white mb-1">
                            {industry.metrics.responseRate}
                          </div>
                          <div className="text-sm text-gray-400">邮件回复率提升</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-white mb-1">
                            {industry.metrics.conversionTime}
                          </div>
                          <div className="text-sm text-gray-400">转化周期缩短</div>
                        </div>
                      </div>
                      <Link
                        href="/contact"
                        className="mt-8 block w-full font-semibold py-3 rounded-lg text-center transition-colors"
                        style={{
                          background: colors.brand.gold,
                          color: colors.bg.dark,
                        }}
                      >
                        获取该行业方案
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          className="py-20 sm:py-24 px-4 sm:px-6"
          style={{ background: colors.bg.darkGradient }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              您的行业方案是什么？
            </h2>
            <p className="text-gray-400 mb-8">
              预约演示，获取为您行业定制的 GTM 路径样板与 ICP 示例。
              <br />
              <span className="text-sm text-gray-500">
                我们会根据您的产品特性、目标市场、竞争格局提供定制化方案。
              </span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <GoldButton href="/contact" size="large" icon={<ArrowRight className="w-4 h-4" />}>
                预约演示
              </GoldButton>
              <OutlineButton href="/features">
                了解功能
              </OutlineButton>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
