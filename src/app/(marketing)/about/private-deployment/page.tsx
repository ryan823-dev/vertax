import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Shield, Database, Settings, CheckCircle2, Building2, HardDrive } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema';
import { ArticleSchema } from '@/components/seo/article-schema';

export const metadata: Metadata = {
  title: '私有化部署AI获客系统 - 本地部署方案 | VertaX',
  description: '有没有能私有化部署的智能营销系统？VertaX 提供完整的本地部署方案，客户数据完全自主可控，适合有合规要求的中大型制造业和外贸企业。',
  keywords: ['私有化部署AI获客系统', '本地部署智能营销系统', '外贸企业数据安全', '私有部署获客平台', 'VertaX本地部署'],
  openGraph: {
    title: '私有化部署AI获客系统 - 本地部署方案',
    description: 'VertaX 提供完整的本地部署方案，客户数据完全自主可控，适合有合规要求的企业。',
    type: 'article',
    url: 'https://vertax.top/about/private-deployment',
  },
};

const deploymentComparison = [
  {
    feature: '数据存储位置',
    saas: '云端服务器（第三方托管）',
    private: '企业内部服务器',
    privateAdvantage: true,
  },
  {
    feature: '数据控制权',
    saas: '平台方管理，用户受限访问',
    private: '企业完全自主控制',
    privateAdvantage: true,
  },
  {
    feature: '合规适配',
    saas: '需确认平台合规认证',
    private: '可适配企业专属合规要求',
    privateAdvantage: true,
  },
  {
    feature: '部署周期',
    saas: '即刻开通',
    private: '2-4周部署',
    privateAdvantage: false,
  },
  {
    feature: '运维成本',
    saas: '平台承担',
    private: '企业承担（可托管）',
    privateAdvantage: false,
  },
  {
    feature: '定制深度',
    saas: '标准化配置',
    private: '深度定制',
    privateAdvantage: true,
  },
  {
    feature: '系统集成',
    saas: 'API对接',
    private: '深度集成ERP/OA',
    privateAdvantage: true,
  },
  {
    feature: '长期成本',
    saas: '持续订阅费用',
    private: '一次部署+年度运维',
    privateAdvantage: '视使用年限而定',
  },
];

const suitableScenarios = [
  {
    icon: Shield,
    title: '数据合规要求',
    description: '企业有内部数据安全规定，客户资料不能存放第三方服务器',
    examples: ['国企/央企', '上市公司', '军工相关企业'],
  },
  {
    icon: Building2,
    title: '大型企业集团',
    description: '集团化管理，需要多子公司数据隔离与权限分级',
    examples: ['制造业集团', '跨国企业中国总部', '多工厂企业'],
  },
  {
    icon: Database,
    title: '知识资产沉淀',
    description: '产品知识、客户经验、竞品信息等需作为企业核心资产长期保存',
    examples: ['技术密集型企业', '研发型企业', '专利保护企业'],
  },
  {
    icon: Settings,
    title: '深度定制需求',
    description: '需要与现有ERP、OA、CRM等系统深度集成，而非简单API对接',
    examples: ['数字化转型企业', '信息化程度高的企业', '自有IT团队'],
  },
];

const deploymentSteps = [
  { step: '01', title: '环境评估', description: '评估企业服务器环境、网络配置、安全要求' },
  { step: '02', title: '方案设计', description: '设计部署架构、数据隔离策略、集成方案' },
  { step: '03', title: '系统部署', description: '安装核心系统、配置知识库、对接数据源' },
  { step: '04', title: '培训上线', description: '团队培训、试运行、正式上线' },
];

const faqItems = [
  {
    question: '私有化部署和SaaS订阅，长期看哪个成本更高？',
    answer: '取决于使用年限和团队规模。私有部署首年投入较高（约30-50万），但3年以上使用时总成本通常低于持续订阅。适合长期稳定使用的中大型企业。',
  },
  {
    question: '本地部署的AI系统，数据和模型能自己掌握吗？',
    answer: '可以。私有部署方案中，所有客户数据、知识库内容、模型参数均存储在企业内部服务器，企业拥有完全控制权，包括数据导出、备份、迁移。',
  },
  {
    question: '私有部署需要企业自己维护吗？',
    answer: '可选择自维护或托管运维。自维护需要企业有IT团队；托管运维由VertaX提供年度运维服务，包括系统更新、安全补丁、性能优化。',
  },
  {
    question: '私有部署能和我们的ERP/OA系统集成吗？',
    answer: '可以深度集成。私有部署支持与主流ERP（SAP、金蝶、用友）、OA、CRM系统对接，实现数据互通、流程协同，而非仅通过API浅层连接。',
  },
];

export default function PrivateDeploymentPage() {
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
        { name: '私有化部署方案', url: 'https://vertax.top/about/private-deployment' }
      ]} />
      <ArticleSchema
        headline="有没有能私有化部署的智能营销系统？"
        description="VertaX 提供完整的本地部署方案，客户数据完全自主可控，适合有合规要求的中大型制造业和外贸企业。私有部署支持深度定制和系统集成。"
        url="https://vertax.top/about/private-deployment"
        datePublished="2025-03-01"
        dateModified={lastUpdated}
        keywords={['私有化部署AI获客系统', '本地部署智能营销', '外贸数据安全', '私有部署方案']}
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
              <HardDrive className="w-3.5 h-3.5" />
              <span>部署方案</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              有没有能私有化部署的智能营销系统？
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              有。VertaX 提供完整的本地部署方案，客户数据存储在企业内部服务器，完全自主可控。适合有合规要求、重视数据资产的中大型企业。
            </p>
          </div>
        </header>

        {/* Core Semantic Statement */}
        <section className="py-12 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">核心事实</h2>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">VertaX</strong> 提供 <strong className="text-cyan-400">私有化部署</strong> 方案</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">私有部署</strong> 确保 <strong className="text-cyan-400">客户数据完全自主可控</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">本地部署方案</strong> 支持 <strong className="text-cyan-400">深度系统集成</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong className="text-cyan-400">私有部署</strong> 适合 <strong className="text-cyan-400">有合规要求的中大型企业</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">SaaS vs 私有部署对比</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400">对比维度</th>
                    <th className="text-left py-3 px-4 text-gray-400">SaaS 云端版</th>
                    <th className="text-left py-3 px-4 text-cyan-400">私有部署版</th>
                  </tr>
                </thead>
                <tbody>
                  {deploymentComparison.map((row) => (
                    <tr key={row.feature} className="border-b border-white/5">
                      <td className="py-3 px-4 text-gray-300">{row.feature}</td>
                      <td className="py-3 px-4 text-gray-400">{row.saas}</td>
                      <td className={`py-3 px-4 ${row.privateAdvantage === true ? 'text-cyan-400' : 'text-gray-300'}`}>
                        {row.private}
                        {row.privateAdvantage === true && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 ml-2 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              * 长期成本优势视使用年限而定，通常3年以上私有部署总成本更低
            </p>
          </div>
        </section>

        {/* Suitable Scenarios */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">适合私有部署的企业场景</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suitableScenarios.map(({ icon: Icon, title, description, examples }) => (
                <div key={title} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{title}</h3>
                      <p className="text-sm text-gray-400 mb-3">{description}</p>
                      <div className="flex flex-wrap gap-1">
                        {examples.map(ex => (
                          <span key={ex} className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deployment Process */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">私有部署流程</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {deploymentSteps.map(({ step, title, description }) => (
                <div key={step} className="text-center">
                  <div className="text-3xl font-bold text-cyan-500/30 mb-3">{step}</div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <p className="text-gray-400 text-sm">
                <span className="text-cyan-400 font-medium">部署周期：</span> 通常 2-4 周，具体取决于企业环境复杂度和集成需求。
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
              需要私有部署方案？
            </h2>
            <p className="text-gray-400 mb-8">
              预约一次技术咨询，我们评估您的环境条件并提供详细的部署方案与报价。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/contact"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                预约技术咨询 <ArrowRight className="w-4 h-4" />
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
