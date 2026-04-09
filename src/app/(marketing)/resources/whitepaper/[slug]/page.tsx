import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Download, Share2, Mail, FileText, BookOpen, TrendingUp, BarChart3, Shield, CheckCircle2 } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema';

// 白皮书元数据
const whitepaper = {
  slug: '2026-china-enterprise-overseas-growth',
  title: '2026 中国企业出海获客趋势白皮书',
  subtitle: '从"规模优先"到"效率优先 + 可持续品牌资产沉淀"',
  publishDate: '2026 年 4 月',
  pages: 48,
  format: 'PDF',
  size: '5.2 MB',
  description: '深度解析 2026-2028 中国企业出海获客趋势，涵盖市场规模、渠道策略、CAC 基准、合规框架与实施路线图。',
  keywords: '出海获客，白皮书，趋势报告，跨境电商，GTM 策略，CAC 基准，合规框架',
  coverImage: '/whitepapers/2026-overseas-growth-cover.png',
};

export const metadata: Metadata = {
  title: `${whitepaper.title} | VertaX 资源中心`,
  description: whitepaper.description,
  keywords: whitepaper.keywords,
  openGraph: {
    title: whitepaper.title,
    description: whitepaper.description,
    type: 'article',
    url: `https://vertax.top/resources/whitepaper/${whitepaper.slug}`,
    images: [
      {
        url: `https://vertax.top${whitepaper.coverImage}`,
        width: 1200,
        height: 630,
        alt: whitepaper.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: whitepaper.title,
    description: whitepaper.description,
    images: [whitepaper.coverImage!],
  },
};

// Article Schema
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": whitepaper.title,
  "description": whitepaper.description,
  "image": `https://vertax.top${whitepaper.coverImage}`,
  "datePublished": "2026-04-08",
  "author": {
    "@type": "Organization",
    "name": "VertaX",
    "url": "https://vertax.top"
  },
  "publisher": {
    "@type": "Organization",
    "name": "VertaX",
    "logo": {
      "@type": "ImageObject",
      "url": "https://vertax.top/logo.png"
    }
  },
  "keywords": whitepaper.keywords,
  "proficiencyLevel": "Expert",
  "articleBody": whitepaper.description
};

export default function WhitepaperPage({ params }: { params: { slug: string } }) {
  // 验证 slug
  if (params.slug !== whitepaper.slug) {
    notFound();
  }

  return (
    <>
      <BreadcrumbSchema items={[
        { name: '首页', url: 'https://vertax.top' },
        { name: '资源中心', url: 'https://vertax.top/resources' },
        { name: '白皮书', url: 'https://vertax.top/resources/whitepaper' },
        { name: whitepaper.title, url: `https://vertax.top/resources/whitepaper/${whitepaper.slug}` }
      ]} />

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
              <a href="/features" className="text-gray-400 hover:text-white transition-colors">产品功能</a>
              <a href="/resources" className="text-gray-400 hover:text-white transition-colors">资源中心</a>
              <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
                预约演示
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="pt-16 pb-12 px-6 border-b border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-6">
              <BookOpen className="w-3.5 h-3.5" />
              <span>白皮书 · 2026 年 4 月发布</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              {whitepaper.title}
            </h1>
            <p className="text-xl text-cyan-400 mb-6">
              {whitepaper.subtitle}
            </p>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              {whitepaper.description}
            </p>
            
            {/* Download CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <button className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-4 rounded-lg transition-colors text-base">
                <Download className="w-5 h-5" />
                立即下载白皮书
              </button>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" /> PDF 格式
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" /> 48 页
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4" /> 免费注册下载
                </span>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-4 pt-6 border-t border-white/5">
              <span className="text-sm text-gray-500">分享：</span>
              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                <Share2 className="w-4 h-4" /> 微信
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                <Share2 className="w-4 h-4" /> 朋友圈
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4" /> 邮件
              </button>
            </div>
          </div>
        </header>

        {/* Key Findings */}
        <section className="py-16 px-6 bg-[#111111]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">核心发现</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: TrendingUp,
                  title: '市场规模高增',
                  description: '2022-2026E 出海营销市场年复合增速约 24%，2026E 规模达 643 亿美元',
                  color: 'cyan'
                },
                {
                  icon: BarChart3,
                  title: '成本上行压力',
                  description: '电商平均 CPA 同比上升约 18.89%，转化率处于 1.59% 低位',
                  color: 'amber'
                },
                {
                  icon: Shield,
                  title: '合规即能力',
                  description: '数据出境、隐私法规、第三方 Cookie 淘汰推动合规成为核心竞争力',
                  color: 'violet'
                },
                {
                  icon: CheckCircle2,
                  title: 'AI 驱动提效',
                  description: '生成式 AI 重构内容生产与投放优化，成为 2026-2028 关键变量',
                  color: 'emerald'
                },
              ].map(({ icon: Icon, title, description, color }) => (
                <div key={title} className={`bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6 ${color === 'violet' ? 'hover:border-violet-500/20' : color === 'amber' ? 'hover:border-amber-500/20' : color === 'emerald' ? 'hover:border-emerald-500/20' : 'hover:border-cyan-500/20'} transition-colors`}>
                  <Icon className={`w-8 h-8 mb-4 ${color === 'violet' ? 'text-violet-400' : color === 'amber' ? 'text-amber-400' : color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                  <h3 className={`text-lg font-bold mb-2 ${color === 'violet' ? 'text-violet-400' : color === 'amber' ? 'text-amber-400' : color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}`}>{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">目录概览</h2>
            <div className="space-y-4">
              {[
                { chapter: '执行摘要', pages: 'P1-P3' },
                { chapter: '方法论与数据来源', pages: 'P4-P5' },
                { chapter: '关键发现与市场格局', pages: 'P6-P12' },
                { chapter: '获客渠道、CAC 与转化效率', pages: 'P13-P22' },
                { chapter: '合规、隐私与基础设施约束', pages: 'P23-P28' },
                { chapter: '竞争格局与案例研究', pages: 'P29-P36' },
                { chapter: '2026-2028 趋势预测与情景分析', pages: 'P37-P42' },
                { chapter: '策略建议与实施路线图', pages: 'P43-P48' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-4 py-3">
                  <span className="text-sm font-medium">{item.chapter}</span>
                  <span className="text-xs text-gray-500">{item.pages}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Download CTA Section */}
        <section className="py-16 px-6 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-t border-cyan-500/20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">立即下载完整白皮书</h2>
            <p className="text-gray-400 mb-8">
              获取 48 页深度报告，包含完整数据、图表、案例与实施路线图。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-4 rounded-lg transition-colors text-base w-full sm:w-auto">
                <Download className="w-5 h-5" />
                免费下载 PDF
              </button>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-4 rounded-lg transition-colors font-medium text-base w-full sm:w-auto"
              >
                预约演示获取解读
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              填写邮箱即可下载，我们不会发送垃圾邮件。
            </p>
          </div>
        </section>

        {/* Related Resources */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6">相关资源</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { href: '/resources', title: '资源中心首页' },
                { href: '/cases', title: '客户案例库' },
                { href: '/about/aeo-geo-b2b', title: 'AEO/GEO 方法论' },
                { href: '/faq', title: '常见问题' },
              ].map(({ href, title }) => (
                <a
                  key={href}
                  href={href}
                  className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between hover:border-cyan-500/20 transition-colors"
                >
                  <span className="font-medium">{title}</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </a>
              ))}
            </div>
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
