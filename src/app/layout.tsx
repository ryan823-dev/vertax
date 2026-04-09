import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// 配置 Inter 字体，添加 display swap 并捕获错误
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false, // 禁用预加载避免构建时网络问题
});

// 主域名 SEO/GEO 优化配置
export const metadata: Metadata = {
  // 基础 SEO
  title: {
    default: "VertaX · 面向中国企业出海的智能获客平台",
    template: "%s | VertaX",
  },
  description: "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助制造业、工业品、技术服务型企业建立可持续、可进化的全球增长体系。",
  
  // 搜索引擎收录控制
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
    },
  },
  
  // 规范化 URL
  metadataBase: new URL('https://vertax.top'),
  alternates: {
    canonical: '/',
  },
  
  // Open Graph (社交媒体分享)
  openGraph: {
    title: "VertaX · 面向中国企业出海的智能获客平台",
    description: "围绕知识引擎、内容增长、商机挖掘与协同推进能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。",
    url: "https://vertax.top",
    siteName: "VertaX",
    locale: 'zh_CN',
    type: 'website',
  },
  
  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: "VertaX · 面向中国企业出海的智能获客平台",
    description: "围绕知识引擎、内容增长、商机挖掘与协同推进能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。",
  },
  
  // 其他 SEO 标签
  keywords: [
    '出海获客',
    '企业出海',
    '智能获客平台',
    '制造业出海',
    '工业品出海',
    'B2B 获客',
    '知识引擎',
    '获客雷达',
    '增长系统',
    'GTM 系统',
  ].join(', '),

  // 作者信息
  authors: [
    {
      name: 'VertaX Team',
      url: 'https://vertax.top',
    },
  ],
  
  // 创建者和发布者
  creator: 'VertaX',
  publisher: 'VertaX',
  
  // 格式检测
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  // 图标
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  
  // 站长平台验证
  verification: {
    // 搜狗站长验证
    other: {
      'sogou_site_verification': 'wCwbGndJdL',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
