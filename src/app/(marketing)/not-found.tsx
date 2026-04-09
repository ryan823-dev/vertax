import { Metadata } from 'next';
import Link from 'next/link';
import { Home, ArrowRight, Search, HelpCircle, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: '页面未找到 - 404 | VertaX',
  description: '您访问的页面不存在。返回 VertaX 首页或浏览其他页面。',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">VertaX</span>
          </Link>
          <Link
            href="/contact"
            className="bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            预约演示
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-lg text-center">
          {/* 404 Visual */}
          <div className="mb-8">
            <span className="text-8xl font-bold text-gray-800">404</span>
          </div>

          {/* Message */}
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            页面不存在
          </h1>
          <p className="text-gray-400 mb-8">
            您访问的页面可能已被移除、名称已更改或暂时不可用。
          </p>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Link
              href="/"
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 hover:border-cyan-500/20 transition-colors text-left"
            >
              <Home className="w-5 h-5 text-cyan-400 mb-2" />
              <h3 className="text-sm font-semibold mb-1">返回首页</h3>
              <p className="text-xs text-gray-500">了解 VertaX 出海获客智能体</p>
            </Link>
            <Link
              href="/features"
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 hover:border-cyan-500/20 transition-colors text-left"
            >
              <Search className="w-5 h-5 text-cyan-400 mb-2" />
              <h3 className="text-sm font-semibold mb-1">产品功能</h3>
              <p className="text-xs text-gray-500">查看六大核心模块</p>
            </Link>
            <Link
              href="/faq"
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 hover:border-cyan-500/20 transition-colors text-left"
            >
              <HelpCircle className="w-5 h-5 text-cyan-400 mb-2" />
              <h3 className="text-sm font-semibold mb-1">常见问题</h3>
              <p className="text-xs text-gray-500">快速了解 VertaX</p>
            </Link>
            <Link
              href="/blog"
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 hover:border-cyan-500/20 transition-colors text-left"
            >
              <FileText className="w-5 h-5 text-cyan-400 mb-2" />
              <h3 className="text-sm font-semibold mb-1">博客文章</h3>
              <p className="text-xs text-gray-500">阅读出海获客洞察</p>
            </Link>
          </div>

          {/* Primary CTA */}
          <Link
            href="/"
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            返回首页 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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
            <Link href="/faq" className="hover:text-gray-300 transition-colors">常见问题</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}