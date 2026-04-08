import { Metadata } from 'next';
import { ArrowRight, MessageSquare, Users, Target, Zap, Shield, Globe, BookOpen, Search, MessageCircle, DollarSign, Clock, Rocket, ChevronRight } from 'lucide-react';

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
    followUp: '了解更多 →'
  },
  {
    id: 'who',
    category: '适用对象',
    icon: Users,
    question: 'VertaX 适合哪些企业？',
    answer: 'VertaX 适合有海外市场拓展需求的中国企业，尤其适合制造业、工业品、设备、技术服务型和中大型 B2B 出海团队。对于希望兼顾品牌建设、内容增长、客户触达与销售协同的企业，VertaX 更具价值。',
    followUp: '查看适用分析 →'
  },
  {
    id: 'problems',
    category: '解决问题',
    icon: Target,
    question: 'VertaX 能解决哪些出海问题？',
    answer: 'VertaX 主要帮助企业解决以下问题：企业资料分散，AI 无法真正理解业务；内容生产效率低，品牌表达不统一；海外获客线索杂乱，缺乏优先级判断；市场、销售、管理层之间协同效率不高；出海工作碎片化，难以形成长期增长资产。',
    followUp: '了解解决方案 →'
  },
  {
    id: 'core-value',
    category: '核心价值',
    icon: Zap,
    question: 'VertaX 的核心价值是什么？',
    answer: 'VertaX 提供三大核心价值：资产化，让每一次获客动作都沉淀为可复用的组织资产，不因人员流动归零；标准化，从 ICP 定义到跟进节奏，全流程有标准、可度量；可审计，动作记录、效果归因、成本核算，全链路透明可追溯。',
    followUp: '了解详情 →'
  },
  {
    id: 'modules',
    category: '核心功能',
    icon: Globe,
    question: 'VertaX 的核心模块有哪些？',
    answer: 'VertaX 当前包括六大核心模块：决策中心、知识引擎、获客雷达、增长系统、声量枢纽和推进中台。六大模块分别承担经营决策、知识沉淀、客户识别、内容增长、品牌传播与任务协同功能，共同组成完整的增长闭环。',
    followUp: '查看模块详情 →'
  },
  {
    id: 'vs-seo',
    category: '产品对比',
    icon: Search,
    question: 'VertaX 和传统 SEO 工具有什么区别？',
    answer: '传统 SEO 工具主要服务于关键词优化和流量获取，而 VertaX 更关注企业全球化增长全链路。它不仅支持内容生产与搜索可见度建设，还连接知识沉淀、品牌声量、客户雷达、团队协同与决策支持，帮助企业从单点优化走向业务闭环。',
    followUp: '了解详细对比 →'
  },
  {
    id: 'vs-ai-writing',
    category: '产品对比',
    icon: MessageCircle,
    question: 'VertaX 和普通 AI 写作工具有什么不同？',
    answer: '普通 AI 写作工具更偏向内容生成，往往缺乏行业理解和企业专属认知。VertaX 以企业知识引擎为底座，在理解产品、行业、客户画像和业务目标的基础上，输出更贴近真实业务场景的内容、策略与线索判断。',
    followUp: '了解知识引擎 →'
  },
  {
    id: 'aeo-geo',
    category: '搜索优化',
    icon: BookOpen,
    question: 'VertaX 是否支持 SEO、AEO 和 GEO？',
    answer: '支持。VertaX 不仅关注传统搜索优化，也重视在生成式搜索环境中的品牌可见度建设。通过知识沉淀、内容布局、主题集群、问答内容建设与品牌信号统一，帮助企业提升在搜索引擎与 AI 问答场景中的出现机会。',
    followUp: '了解 AEO/GEO →'
  },
  {
    id: 'leads',
    category: '获客能力',
    icon: Users,
    question: 'VertaX 是否能帮助企业找到潜在客户？',
    answer: '可以。VertaX 的获客雷达模块会围绕企业的理想客户画像识别潜在线索，并对线索进行分层判断，帮助企业更高效地发现更值得优先推进的目标客户，同时形成更具针对性的触达思路。',
    followUp: '了解获客雷达 →'
  },
  {
    id: 'platform',
    category: '产品形态',
    icon: Shield,
    question: 'VertaX 是软件平台，还是服务方案？',
    answer: 'VertaX 既是平台，也是增长能力载体。它并不只是一个单纯的软件界面，而是帮助企业沉淀知识、组织内容、识别商机、推动协作和形成决策支持的系统化平台。对于希望建立长期出海能力的企业，VertaX 更像一个可持续进化的增长中枢。',
    followUp: '预约演示 →'
  },
  {
    id: 'why',
    category: '核心价值',
    icon: DollarSign,
    question: '为什么企业需要 VertaX，而不是继续依赖人工堆团队？',
    answer: '在今天的全球竞争环境里，仅依靠人工推动出海，往往会面临成本高、效率低、协同难和资产难沉淀的问题。VertaX 的价值不只是替代部分重复劳动，更在于帮助企业把分散的经验、资料、内容和商机机制沉淀为可复用、可复制、可优化的增长系统。',
    followUp: '预约演示 →'
  },
  {
    id: 'deployment',
    category: '部署方式',
    icon: Rocket,
    question: 'VertaX 支持哪些部署方式？',
    answer: 'VertaX 提供两种部署形态：快速上车版本采用标准模板，注册即用，无需 IT 团队；企业级版本支持权限管理、工作流审批、私有知识库和数据隔离，可按组织架构定制，深度融入业务流程。',
    followUp: '了解部署方案 →'
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
  return (
    <>
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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
              <MessageSquare className="w-3.5 h-3.5" />
              <span>常见问题</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              12 个高频问题
            </h1>
            <p className="text-xl text-gray-400">
              关于 VertaX 的产品定位、适用场景、核心功能、与其他工具的区别，你想知道的都在这里。
            </p>
          </div>
        </header>

        {/* Quick Navigation */}
        <section className="py-8 px-6 bg-white/[0.02] border-b border-white/5">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-gray-500 mb-3">快速跳转</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(faqs.map(faq => faq.category))).map(category => (
                <span
                  key={category}
                  className="text-xs bg-white/[0.05] text-gray-400 px-3 py-1.5 rounded-lg"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {faqs.map((faq) => (
                <article
                  key={faq.id}
                  id={faq.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <faq.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-cyan-500/70 font-medium">{faq.category}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-4">{faq.answer}</p>
                      <a href="/" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                        {faq.followUp} <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="py-16 px-6 bg-white/[0.02]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">还有其他问题？</h2>
            <p className="text-gray-400 mb-8">
              如果以上没有解答你的疑问，欢迎预约演示，我们会一对一为你解答。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/contact"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                预约演示 <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="mailto:contact@vertax.top"
                className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
              >
                发送邮件
              </a>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-6">相关页面</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { href: '/about/what-is-vertax', title: 'VertaX 是什么' },
                { href: '/about/who-is-vertax-for', title: '哪些企业适合 VertaX' },
                { href: '/about/why-not-seo-tool', title: '为什么不是传统 SEO 工具' },
                { href: '/features/modules', title: '六大模块全景图' },
              ].map(({ href, title }) => (
                <a
                  key={href}
                  href={href}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between hover:border-cyan-500/20 transition-colors"
                >
                  <span className="font-medium">{title}</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </a>
              ))}
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
              <span className="text-xs text-gray-600 ml-2">&copy; {new Date().getFullYear()} VERTAX LIMITED</span>
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
