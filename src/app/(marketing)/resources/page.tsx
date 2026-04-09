import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, BookOpen, Download, ExternalLink } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';

export const metadata: Metadata = {
  title: 'VertaX 资源中心 - 白皮书、案例与工具',
  description: '下载《2026 中国企业出海获客趋势白皮书》、查看客户案例、使用获客工具，助力企业全球化增长。',
  keywords: '出海白皮书，获客指南，企业出海，跨境电商，GTM 策略，VertaX 资源',
};

const resources = [
  {
    type: 'whitepaper',
    icon: BookOpen,
    title: '2026 中国企业出海获客趋势白皮书',
    description: '深度解析 2026-2028 中国企业出海获客趋势，涵盖市场规模、渠道策略、CAC 基准、合规框架与实施路线图。',
    href: '/resources/whitepaper/2026-china-enterprise-overseas-growth',
    tags: ['白皮书', '趋势报告', '获客策略'],
    featured: true,
  },
  {
    type: 'case',
    icon: FileText,
    title: '客户案例库',
    description: '查看制造业、工业品、技术服务企业如何通过 VertaX 建立可持续的全球增长体系。',
    href: '/cases',
    tags: ['客户案例', '实战经验'],
    featured: false,
  },
  {
    type: 'tool',
    icon: Download,
    title: '出海获客工具包',
    description: 'GTM 路径模板、ICP 定义框架、内容日历、ROI 计算器等实用工具，即刻下载即用。',
    href: '/resources/tools',
    tags: ['工具模板', '实用指南'],
    featured: false,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: '首页', url: 'https://vertax.top' },
        { name: '资源中心', url: 'https://vertax.top/resources' }
      ]} />

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
              <a href="/features" className="text-gray-400 hover:text-white transition-colors">产品功能</a>
              <a href="/solutions" className="text-gray-400 hover:text-white transition-colors">解决方案</a>
              <a href="/cases" className="text-gray-400 hover:text-white transition-colors">客户案例</a>
              <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
                预约演示
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="pt-16 pb-12 px-6 border-b border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-6">
              <FileText className="w-3.5 h-3.5" />
              <span>资源中心</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              出海获客实战资源
            </h1>
            <p className="text-xl text-gray-400">
              白皮书、客户案例、工具模板，助力企业建立可持续的全球增长体系。
            </p>
          </div>
        </header>

        {/* Resources List */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Featured Resource */}
            {resources.filter(r => r.featured).map((resource) => (
              <article
                key={resource.title}
                className="mb-8 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-2xl p-6 md:p-8 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <resource.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-1 rounded">重磅发布</span>
                      {resource.tags.map(tag => (
                        <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{tag}</span>
                      ))}
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-3">{resource.title}</h2>
                    <p className="text-gray-400 mb-6 leading-relaxed">{resource.description}</p>
                    <a
                      href={resource.href}
                      className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
                    >
                      立即下载 <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}

            {/* Other Resources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resources.filter(r => !r.featured).map((resource) => (
                <article
                  key={resource.title}
                  className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                      <resource.icon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {resource.tags.map(tag => (
                          <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{tag}</span>
                        ))}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{resource.title}</h3>
                      <p className="text-sm text-gray-400 mb-4 leading-relaxed">{resource.description}</p>
                      <a
                        href={resource.href}
                        className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                      >
                        了解更多 <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 bg-[#111111] border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">需要定制化方案？</h2>
            <p className="text-gray-400 mb-8">
              预约演示，获取针对你行业和目标市场的 GTM 路径规划。
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-6 h-6 bg-cyan-500 rounded flex items-center justify-center">
                  <span className="text-black font-bold text-xs">V</span>
                </div>
                <span className="text-sm font-medium">VertaX</span>
              </Link>
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
