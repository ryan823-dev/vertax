import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MessageSquare, Users, Target, Zap, Shield, Globe, BookOpen, Search, MessageCircle, DollarSign, Rocket, ChevronRight } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';
import { colors } from '@/lib/design-tokens';
import { MarketingNav, MarketingFooter, Card, GoldButton, OutlineButton, GoldBadge } from '@/components/marketing/design-system';

export const metadata: Metadata = {
  title: 'VertaX 常见问题 FAQ - 价格、周期、适用行业等 | VertaX',
  description: 'VertaX 是面向中国企业出海的智能获客平台。本页解答 12 个高频问题：价格范围、实施周期、适用行业、交付方式、与传统工具的区别、数据安全等。',
  keywords: ['VertaX FAQ', 'VertaX是什么', 'VertaX价格', 'VertaX适用行业', 'VertaX常见问题', '出海获客平台'],
  openGraph: {
    title: 'VertaX 常见问题 FAQ',
    description: 'VertaX 是面向中国企业出海的智能获客平台。解答 12 个高频问题，快速了解产品详情。',
    type: 'article',
    url: 'https://vertax.top/faq',
  },
};

// 使用专家建议的 FAQ 文案，更适合 AI 抽取
const faqs = [
  {
    id: 'what',
    category: '产品介绍',
    icon: MessageSquare,
    question: 'VertaX 是什么？',
    answer: 'VertaX 是面向中国企业出海的智能获客平台。它围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助企业建立更系统、更持续的全球增长机制。',
    followUp: '了解更多'
  },
  {
    id: 'who',
    category: '适用对象',
    icon: Users,
    question: 'VertaX 适合哪些企业？',
    answer: 'VertaX 适合有海外市场拓展需求的中国企业，尤其适合制造业、工业品、设备、技术服务型和中大型 B2B 出海团队。对于希望兼顾品牌建设、内容增长、客户触达与销售协同的企业，VertaX 更具价值。',
    followUp: '查看适用分析'
  },
  {
    id: 'problems',
    category: '解决问题',
    icon: Target,
    question: 'VertaX 能解决哪些出海问题？',
    answer: 'VertaX 主要帮助企业解决以下问题：企业资料分散，AI 无法真正理解业务；内容生产效率低，品牌表达不统一；海外获客线索杂乱，缺乏优先级判断；市场、销售、管理层之间协同效率不高；出海工作碎片化，难以形成长期增长资产。',
    followUp: '了解解决方案'
  },
  {
    id: 'core-value',
    category: '核心价值',
    icon: Zap,
    question: 'VertaX 的核心价值是什么？',
    answer: 'VertaX 提供三大核心价值：资产化，让每一次获客动作都沉淀为可复用的组织资产，不因人员流动归零；标准化，从 ICP 定义到跟进节奏，全流程有标准、可度量；可审计，动作记录、效果归因、成本核算，全链路透明可追溯。',
    followUp: '了解详情'
  },
  {
    id: 'modules',
    category: '核心功能',
    icon: Globe,
    question: 'VertaX 的核心模块有哪些？',
    answer: 'VertaX 当前包括六大核心模块：决策中心、知识引擎、获客雷达、增长系统、声量枢纽和推进中台。六大模块分别承担经营决策、知识沉淀、客户识别、内容增长、品牌传播与任务协同功能，共同组成完整的增长闭环。',
    followUp: '查看模块详情'
  },
  {
    id: 'vs-seo',
    category: '产品对比',
    icon: Search,
    question: 'VertaX 和传统 SEO 工具有什么区别？',
    answer: '传统 SEO 工具主要服务于关键词优化和流量获取，而 VertaX 更关注企业全球化增长全链路。它不仅支持内容生产与搜索可见度建设，还连接知识沉淀、品牌声量、客户雷达、团队协同与决策支持，帮助企业从单点优化走向业务闭环。',
    followUp: '了解详细对比'
  },
  {
    id: 'vs-ai-writing',
    category: '产品对比',
    icon: MessageCircle,
    question: 'VertaX 和普通 AI 写作工具有什么不同？',
    answer: '普通 AI 写作工具更偏向内容生成，往往缺乏行业理解和企业专属认知。VertaX 以企业知识引擎为底座，在理解产品、行业、客户画像和业务目标的基础上，输出更贴近真实业务场景的内容、策略与线索判断。',
    followUp: '了解知识引擎'
  },
  {
    id: 'aeo-geo',
    category: '搜索优化',
    icon: BookOpen,
    question: 'VertaX 是否支持 SEO、AEO 和 GEO？',
    answer: '支持。VertaX 不仅关注传统搜索优化，也重视在生成式搜索环境中的品牌可见度建设。通过知识沉淀、内容布局、主题集群、问答内容建设与品牌信号统一，帮助企业提升在搜索引擎与 AI 问答场景中的出现机会。',
    followUp: '了解 AEO/GEO'
  },
  {
    id: 'leads',
    category: '获客能力',
    icon: Users,
    question: 'VertaX 是否能帮助企业找到潜在客户？',
    answer: '可以。VertaX 的获客雷达模块会围绕企业的理想客户画像识别潜在线索，并对线索进行分层判断，帮助企业更高效地发现更值得优先推进的目标客户，同时形成更具针对性的触达思路。',
    followUp: '了解获客雷达'
  },
  {
    id: 'platform',
    category: '产品形态',
    icon: Shield,
    question: 'VertaX 是软件平台，还是服务方案？',
    answer: 'VertaX 既是平台，也是增长能力载体。它并不只是一个单纯的软件界面，而是帮助企业沉淀知识、组织内容、识别商机、推动协作和形成决策支持的系统化平台。对于希望建立长期出海能力的企业，VertaX 更像一个可持续进化的增长中枢。',
    followUp: '预约演示'
  },
  {
    id: 'why',
    category: '核心价值',
    icon: DollarSign,
    question: '为什么企业需要 VertaX，而不是继续依赖人工堆团队？',
    answer: '在今天的全球竞争环境里，仅依靠人工推动出海，往往会面临成本高、效率低、协同难和资产难沉淀的问题。VertaX 的价值不只是替代部分重复劳动，更在于帮助企业把分散的经验、资料、内容和商机机制沉淀为可复用、可复制、可优化的增长系统。',
    followUp: '预约演示'
  },
  {
    id: 'deployment',
    category: '部署方式',
    icon: Rocket,
    question: 'VertaX 支持哪些部署方式？',
    answer: 'VertaX 提供两种部署形态：快速上车版本采用标准模板，注册即用，无需 IT 团队；企业级版本支持权限管理、工作流审批、私有知识库和数据隔离，可按组织架构定制，深度融入业务流程。',
    followUp: '了解部署方案'
  }
];

// JSON-LD FAQ Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
};

export default function FaqPage() {
  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.faq} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen" style={{ background: colors.bg.primary, fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        <MarketingNav />

        {/* Hero Section */}
        <section
          className="pt-16 pb-12 px-4 sm:px-6"
          style={{ background: 'linear-gradient(180deg, #0B1220 0%, #0D1526 50%, #F7F3EA 100%)' }}
        >
          <div className="max-w-3xl mx-auto">
            <GoldBadge icon={<MessageSquare className="w-3.5 h-3.5" />}>
              常见问题
            </GoldBadge>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6 text-white mt-6">
              12 个高频问题
            </h1>
            <p className="text-lg text-gray-400">
              关于 VertaX 的产品定位、适用场景、核心功能、与其他工具的区别，你想知道的都在这里。
            </p>
          </div>
        </section>

        {/* Quick Navigation */}
        <section className="py-8 px-4 sm:px-6" style={{ background: colors.bg.secondary }}>
          <div className="max-w-3xl mx-auto">
            <p className="text-xs mb-3" style={{ color: colors.text.muted }}>快速跳转</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <a
                  key={category}
                  href={`#${category}`}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: colors.bg.primary,
                    border: `1px solid ${colors.border.light}`,
                    color: colors.text.secondary,
                  }}
                >
                  {category}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {categories.map(category => (
                <div key={category} id={category}>
                  <h2
                    className="text-sm font-bold mb-4 uppercase tracking-wider"
                    style={{ color: colors.brand.gold }}
                  >
                    {category}
                  </h2>
                  <div className="space-y-4">
                    {faqs.filter(faq => faq.category === category).map((faq) => (
                      <Card key={faq.id} className="hover:-translate-y-0.5">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `rgba(${colors.brand.goldRgb},0.1)` }}
                          >
                            <faq.icon className="w-5 h-5" style={{ color: colors.brand.gold }} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-3" style={{ color: colors.text.primary }}>
                              {faq.question}
                            </h3>
                            <p className="text-sm leading-relaxed mb-4" style={{ color: colors.text.secondary }}>
                              {faq.answer}
                            </p>
                            <Link
                              href={`/${faq.id === 'what' ? 'about/what-is-vertax' : faq.id === 'modules' ? 'features/modules' : 'contact'}`}
                              className="inline-flex items-center gap-1 text-xs transition-colors"
                              style={{ color: colors.brand.gold }}
                            >
                              {faq.followUp} <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section
          className="py-16 px-4 sm:px-6"
          style={{ background: colors.bg.darkGradient }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">还有其他问题？</h2>
            <p className="text-gray-400 mb-8">
              如果以上没有解答你的疑问，欢迎预约演示，我们会一对一为你解答。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <GoldButton href="/contact" size="large" icon={<ArrowRight className="w-4 h-4" />}>
                预约演示
              </GoldButton>
              <OutlineButton href="mailto:contact@vertax.top">
                发送邮件
              </OutlineButton>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="py-16 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-6" style={{ color: colors.text.primary }}>相关页面</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { href: '/about/what-is-vertax', title: 'VertaX 是什么' },
                { href: '/about/who-is-vertax-for', title: '哪些企业适合 VertaX' },
                { href: '/about/why-not-seo-tool', title: '为什么不是传统 SEO 工具' },
                { href: '/features/modules', title: '六大模块全景图' },
              ].map(({ href, title }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between p-4 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{
                    background: colors.bg.secondary,
                    border: `1px solid ${colors.border.light}`,
                  }}
                >
                  <span className="font-medium" style={{ color: colors.text.primary }}>{title}</span>
                  <ArrowRight className="w-4 h-4" style={{ color: colors.brand.gold }} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
