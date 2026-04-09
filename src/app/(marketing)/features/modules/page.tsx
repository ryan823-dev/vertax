import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Brain, Target, TrendingUp, Globe, MessageSquare, Building2, Layers, Database, Search, Send, BarChart3, Users, FileText, Zap, Shield } from 'lucide-react';
import { BreadcrumbSchema, breadcrumbPaths } from '@/components/seo/breadcrumb-schema';

export const metadata: Metadata = {
  title: 'VertaX 六大模块全景图 - 决策中心、知识引擎、获客雷达、增长系统、声量枢纽、推进中台 | VertaX',
  description: 'VertaX 六大核心模块：决策中心（经营决策）、知识引擎（知识沉淀）、获客雷达（客户识别）、增长系统（内容增长）、声量枢纽（品牌传播）、推进中台（任务协同）。帮助制造业、工业品、技术服务型企业建立完整的全球增长闭环。',
  keywords: ['VertaX功能', '决策中心', '知识引擎', '获客雷达', '增长系统', '声量枢纽', '推进中台'],
  openGraph: {
    title: 'VertaX 六大模块全景图',
    description: 'VertaX 六大核心模块，帮助制造业、工业品、技术服务型企业建立完整的全球增长闭环。',
    type: 'article',
    url: 'https://vertax.top/features/modules',
  },
};

const modules = [
  {
    id: 'knowledge-engine',
    name: '知识引擎',
    nameEn: 'Knowledge Engine · 知识引擎',
    icon: Brain,
    color: 'cyan',
    description: '企业私有知识库，沉淀产品、资质、竞品、市场知识，形成专属智能底座。',
    value: '让 AI 智能体彻底吃透企业业务，越用越懂你。',
    features: [
      { icon: Database, title: '多源导入', desc: '支持文档、网页、图片等多种格式导入' },
      { icon: Search, title: '智能检索', desc: '语义搜索，快速找到所需信息' },
      { icon: Layers, title: '知识图谱', desc: '自动构建知识关联，形成结构化知识网络' },
      { icon: Zap, title: '持续迭代', desc: '在使用中不断学习优化，越来越精准' },
    ],
    useCases: ['产品知识沉淀', '销售话术库', '常见问答整理', '竞品分析归档']
  },
  {
    id: 'acquisition-radar',
    name: '获客雷达',
    nameEn: 'Acquisition Radar · 获客雷达',
    icon: Target,
    color: 'violet',
    description: 'AI 驱动的客户发现与背调，基于 ICP 画像精准锁定目标客户，告别盲目拓客。',
    value: '从「广撒网」升级为「精准制导」，大幅提升线索质量。',
    features: [
      { icon: Users, title: 'ICP 画像', desc: '智能分析并优化理想客户画像' },
      { icon: Globe, title: '全网检索', desc: '100+ 付费数据源，200+ 实时数据源' },
      { icon: Shield, title: '深度背调', desc: '企业背景、决策人信息全面分析' },
      { icon: BarChart3, title: '智能评分', desc: '线索质量自动评分，优先级排序' },
    ],
    useCases: ['新市场开拓', '精准客户发现', '决策人穿透', '线索质量筛选']
  },
  {
    id: 'growth-system',
    name: '增长系统',
    nameEn: 'Inbound Growth Engine',
    icon: TrendingUp,
    color: 'emerald',
    description: 'SEO + GEO 双轨内容生产与分发，持续吸引高意向客户，抢占 AI 搜索流量红利。',
    value: '既适配传统搜索引擎，也适配 ChatGPT、豆包等 AI 搜索的新推荐逻辑。',
    features: [
      { icon: FileText, title: '智能内容', desc: '基于知识库生成专业、有深度的内容' },
      { icon: Search, title: 'SEO 优化', desc: '关键词研究、内容优化、外链建设' },
      { icon: Zap, title: 'GEO 适配', desc: '结构化内容，便于 AI 引用和推荐' },
      { icon: Globe, title: '多语言分发', desc: '自动翻译并分发到多个海外渠道' },
    ],
    useCases: ['SEO 内容生产', '多语言站点', '行业内容矩阵', 'AI 搜索优化']
  },
  {
    id: 'decision-cockpit',
    name: '决策驾驶舱',
    nameEn: 'Decision Cockpit',
    icon: BarChart3,
    color: 'amber',
    description: 'GTM 数据看板与战略简报，一屏看清投入、节奏与产出，让决策有据可依。',
    value: '老板要的不是功能，是可控感。一键生成周报、月报、战略简报。',
    features: [
      { icon: BarChart3, title: '实时数据', desc: '线索、转化、ROI 等关键指标一览' },
      { icon: Users, title: '团队进度', desc: '谁在卡、卡在哪，瓶颈一目了然' },
      { icon: FileText, title: '智能简报', desc: '一键生成周报/月报，可直接发群' },
      { icon: TrendingUp, title: '趋势分析', desc: '发现问题，预测趋势，辅助决策' },
    ],
    useCases: ['周报月报生成', '团队效率监控', 'ROI 追踪', '战略复盘']
  },
  {
    id: 'outreach-agent',
    name: '外联智能体',
    nameEn: 'Outreach Agent',
    icon: MessageSquare,
    color: 'rose',
    description: '自动化客户触达，为每个客户生成千人千面的沟通内容，告别群发内卷。',
    value: '从「模板群发」升级为「精准沟通」，大幅提升回复率和转化率。',
    features: [
      { icon: Send, title: '智能触达', desc: '基于客户画像生成个性化内容' },
      { icon: Zap, title: '多渠道发送', desc: '邮件、LinkedIn、WhatsApp 等' },
      { icon: Layers, title: '序列跟进', desc: '自动化多轮跟进，不遗漏机会' },
      { icon: BarChart3, title: '效果追踪', desc: '打开率、回复率、转化率全追踪' },
    ],
    useCases: ['冷邮件开发', 'LinkedIn 触达', '客户跟进', '询盘转化']
  },
  {
    id: 'social-media',
    name: '社交媒体管理',
    nameEn: 'Social Media Management',
    icon: Building2,
    color: 'blue',
    description: '多平台协同运营，统一内容分发与效果追踪，打造社媒矩阵增长飞轮。',
    value: '一次创作，多平台分发，数据统一看，效率翻倍。',
    features: [
      { icon: Globe, title: '多平台管理', desc: 'LinkedIn、Facebook、X、YouTube 等' },
      { icon: FileText, title: '内容日历', desc: '可视化排期，定时发布' },
      { icon: BarChart3, title: '效果分析', desc: '各平台数据对比，发现最佳渠道' },
      { icon: Users, title: '团队协作', desc: '审批流程、权限管理、版本记录' },
    ],
    useCases: ['社媒矩阵运营', '品牌声量管理', '内容排期', '效果分析']
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
};

export default function ModulesPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbPaths.featuresModules} />
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
            <a href="/features" className="text-white font-medium">功能</a>
            <a href="/about" className="text-gray-400 hover:text-white transition-colors">关于</a>
            <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
              预约演示
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-16 pb-12 px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-6">
            <Layers className="w-3.5 h-3.5" />
            <span>功能全景</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
            VertaX 六大模块全景图
          </h1>
          <p className="text-xl text-gray-400">
            从知识沉淀到客户触达，六大模块协同发力，构建完整的海外增长系统。
          </p>
        </div>
      </header>

      {/* Module Overview */}
      <section className="py-12 px-6 bg-[#111111]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {modules.map((module) => {
              const colors = colorMap[module.color];
              return (
                <a
                  key={module.id}
                  href={`#${module.id}`}
                  className={`bg-[#1A1A1A] border ${colors.border} rounded-xl p-4 text-center hover:bg-[#222222] transition-colors`}
                >
                  <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                    <module.icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <h3 className="text-sm font-semibold">{module.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{module.nameEn}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detailed Modules */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {modules.map((module) => {
            const colors = colorMap[module.color];
            return (
              <article key={module.id} id={module.id} className="mb-16 last:mb-0">
                {/* Module Header */}
                <div className={`bg-[#1A1A1A] border ${colors.border} rounded-xl p-6 mb-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <module.icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{module.name}</h2>
                      <p className={`text-sm ${colors.text}`}>{module.nameEn}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 mb-4">{module.description}</p>
                  <div className={`bg-[#1A1A1A] rounded-lg p-4 border-l-2 ${colors.border.replace('border-', 'border-l-')}`}>
                    <p className={`text-sm ${colors.text} font-medium`}>核心价值：{module.value}</p>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {module.features.map((feature) => (
                    <div key={feature.title} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 flex items-start gap-3">
                      <feature.icon className={`w-5 h-5 ${colors.text} shrink-0 mt-0.5`} />
                      <div>
                        <h4 className="text-sm font-semibold mb-1">{feature.title}</h4>
                        <p className="text-xs text-gray-500">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Use Cases */}
                <div className="bg-[#111111] border border-white/[0.05] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">典型应用场景：</p>
                  <div className="flex flex-wrap gap-2">
                    {module.useCases.map((uc) => (
                      <span key={uc} className="text-xs bg-[#222222] text-gray-400 px-3 py-1 rounded-full">
                        {uc}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#111111] border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            想深入了解某个模块？
          </h2>
          <p className="text-gray-400 mb-8">
            预约演示，获取你行业定制化的模块配置方案。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/about/who-is-vertax-for"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              查看适合谁
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
