import { Metadata } from 'next';
import { ArrowRight, Building2, Target, TrendingUp, Zap, Globe, Brain, CheckCircle2, Users, BarChart3, MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'VertaX 客户案例｜如何帮助企业打开全球市场',
  description: 'VertaX 客户案例：工业装备、智能制造、新能源、医疗器械等行业的出海获客实践。了解企业如何通过知识引擎、获客雷达、增长系统实现海外业务增长。',
  keywords: ['VertaX案例', '制造业出海案例', '工业品出海案例', 'B2B获客案例', '海外增长案例'],
  openGraph: {
    title: 'VertaX 客户案例｜如何帮助企业打开全球市场',
    description: '制造业、工业品、技术服务型企业的出海获客实践案例。',
    type: 'article',
    url: 'https://vertax.top/cases',
  },
};

// 案例数据 - 按专家建议的结构
const cases = [
  {
    id: 'industrial-robot',
    industry: '工业装备',
    title: '某工业机器人企业如何用 VertaX 实现 3 倍线索增长',
    summary: '从 0 到 1 搭建 GTM 系统，3 个月内实现海外线索质量与数量的双重提升。',
    client: {
      type: '工业机器人制造商',
      scale: '年营收 2 亿+，员工 300+',
      market: '目标市场：欧洲、东南亚',
      product: '六轴工业机器人、协作机器人',
    },
    problem: [
      '海外获客完全依赖展会和代理商，成本高、效率低',
      '销售团队每天花大量时间筛选线索，真正的高价值客户反而被遗漏',
      '企业资料分散在各处，新人上手慢，经验难以复制',
      '内容产出靠外包，质量不稳定，品牌表达不统一',
    ],
    modules: ['知识引擎', '获客雷达', '增长系统', '推进中台'],
    solution: [
      {
        title: '搭建知识引擎',
        desc: '将产品手册、技术文档、成功案例、竞品分析等资料沉淀为私有知识库，让 AI 真正理解企业业务。',
      },
      {
        title: '部署获客雷达',
        desc: '基于 ICP 画像，围绕欧洲和东南亚市场自动发现潜在客户，并对线索进行分层评分。',
      },
      {
        title: '启动增长系统',
        desc: '围绕目标市场的搜索习惯，持续产出多语言技术内容和行业洞察，提升品牌可见度。',
      },
      {
        title: '上线推进中台',
        desc: '将线索识别、内容触达、销售跟进连接成闭环，让团队协作有据可依。',
      },
    ],
    results: [
      { metric: '线索数量', value: '3倍增长', detail: '从月均 30 条提升至 90+ 条' },
      { metric: '线索质量', value: '显著提升', detail: 'A 级线索占比从 15% 提升至 40%' },
      { metric: '响应效率', value: '提升 60%', detail: '从线索发现到首次触达，从 7 天缩短至 3 天' },
      { metric: '新人上手', value: '缩短 50%', detail: '销售新人从入职到独立作战，从 3 个月缩短至 1.5 个月' },
    ],
    lessons: [
      '知识库是基础，先把企业自己的东西整理好，AI 才能真正发挥作用',
      '获客不是一蹴而就，需要持续优化 ICP 画像和触达策略',
      '系统要和团队配合，不能只靠工具，更要改变工作方式',
    ],
  },
  {
    id: 'new-energy',
    industry: '新能源',
    title: '某光伏设备企业如何用 VertaX 打开欧洲市场',
    summary: '通过 SEO + GEO 双轨策略，6 个月内实现欧洲市场品牌可见度大幅提升。',
    client: {
      type: '光伏设备制造商',
      scale: '年营收 5 亿+，员工 500+',
      market: '目标市场：德国、荷兰、西班牙',
      product: '光伏逆变器、储能系统',
    },
    problem: [
      '产品技术领先，但在欧洲市场品牌认知度低',
      '官网流量主要来自中国，海外访问占比不足 10%',
      '传统 SEO 代运营效果有限，内容与产品脱节',
      'ChatGPT、豆包等 AI 搜索中搜索不到公司信息',
    ],
    modules: ['知识引擎', '增长系统', '声量枢纽'],
    solution: [
      {
        title: '沉淀技术知识库',
        desc: '将技术白皮书、认证证书、项目案例、技术博客等整合，形成企业专属知识底座。',
      },
      {
        title: 'SEO + GEO 双轨布局',
        desc: '既优化传统搜索引擎排名，也优化 AI 搜索的引用逻辑，让品牌在 ChatGPT、Perplexity 中被推荐。',
      },
      {
        title: '多语言内容矩阵',
        desc: '围绕德语、荷兰语、西班牙语市场，持续产出本地化的技术内容和行业洞察。',
      },
    ],
    results: [
      { metric: '海外流量', value: '5倍增长', detail: '官网海外访问占比从 10% 提升至 35%' },
      { metric: 'AI 可见度', value: '从无到有', detail: '在 ChatGPT、Perplexity 搜索相关关键词可被推荐' },
      { metric: '询盘数量', value: '月均 20+', detail: '来自欧洲市场的询盘从月均 3 条提升至 20+ 条' },
      { metric: '内容产出', value: '效率提升 10 倍', detail: '技术内容从每月 2 篇提升至每周 5 篇' },
    ],
    lessons: [
      'GEO 是新机会，越早布局越有先发优势',
      '技术型企业要善用自己的技术资产，内容要真实、专业、有价值',
      '多语言不是简单翻译，要结合当地市场的搜索习惯和表达方式',
    ],
  },
  {
    id: 'medical-device',
    industry: '医疗器械',
    title: '某医疗器械企业如何用 VertaX 实现精准客户发现',
    summary: '通过获客雷达 + AI 外联，大幅提升海外客户开发效率，销售团队从「大海捞针」升级为「精准制导」。',
    client: {
      type: '医疗器械制造商',
      scale: '年营收 1 亿+，员工 150+',
      market: '目标市场：中东、拉美、东南亚',
      product: '诊断设备、康复器械',
    },
    problem: [
      '目标市场分散，传统展会获客成本越来越高',
      '销售团队每天花 4-5 小时找客户信息，真正用于沟通的时间很少',
      '开发信群发效果差，回复率不足 1%',
      '客户信息散落在各销售的个人电脑里，难以统一管理和跟进',
    ],
    modules: ['知识引擎', '获客雷达', '推进中台'],
    solution: [
      {
        title: '定义 ICP 画像',
        desc: '基于现有优质客户，提炼出理想客户特征：医院规模、科室类型、采购周期、预算范围等。',
      },
      {
        title: '部署获客雷达',
        desc: '围绕 ICP 画像，自动扫描目标市场的潜在客户，识别决策人并进行线索评分。',
      },
      {
        title: '千人千面触达',
        desc: '为每个高价值客户生成个性化的开发内容和触达策略，告别模板群发。',
      },
      {
        title: '统一线索管理',
        desc: '所有线索进入推进中台，销售团队可追踪每条线索的状态、跟进记录和下一步动作。',
      },
    ],
    results: [
      { metric: '客户发现效率', value: '提升 5 倍', detail: '从每天手动找 5 家，到系统自动推荐 25+ 家' },
      { metric: '开发信回复率', value: '从 1% 到 8%', detail: '千人千面触达让回复率提升 8 倍' },
      { metric: '销售人效', value: '提升 40%', detail: '销售花在找客户的时间减少 60%，沟通时间增加' },
      { metric: '线索转化', value: '提升 3 倍', detail: '从线索到商机 Demo 的转化率显著提升' },
    ],
    lessons: [
      'ICP 画像要持续优化，不是定义一次就结束',
      '千人千面触达的核心是「懂客户」，而不是「换个称呼」',
      '系统和流程要配合，销售团队需要适应新的工作方式',
    ],
  },
];

export default function CasesPage() {
  return (
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
            <a href="/cases" className="text-white font-medium">案例</a>
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
            <Building2 className="w-3.5 h-3.5" />
            <span>客户案例</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
            VertaX 客户案例｜如何帮助企业打开全球市场
          </h1>
          <p className="text-xl text-gray-400">
            制造业、工业品、技术服务型企业的出海获客实践。每个案例都来自真实客户，成果真实、克制、可验证。
          </p>
        </div>
      </header>

      {/* Case List */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          {cases.map((caseItem, index) => (
            <article key={caseItem.id} id={caseItem.id} className="scroll-mt-20">
              {/* Case Header */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded">{caseItem.industry}</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{caseItem.title}</h2>
                <p className="text-gray-400">{caseItem.summary}</p>
              </div>

              {/* Client Background */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  客户背景
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">客户类型</p>
                    <p className="text-sm">{caseItem.client.type}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">企业规模</p>
                    <p className="text-sm">{caseItem.client.scale}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">目标市场</p>
                    <p className="text-sm">{caseItem.client.market}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">产品类型</p>
                    <p className="text-sm">{caseItem.client.product}</p>
                  </div>
                </div>
              </div>

              {/* Problem */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-400" />
                  面临问题
                </h3>
                <ul className="space-y-2">
                  {caseItem.problem.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-red-400/60 mt-1">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Modules Used */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  使用模块
                </h3>
                <div className="flex flex-wrap gap-2">
                  {caseItem.modules.map(m => (
                    <span key={m} className="text-sm bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Solution */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  解决方案
                </h3>
                <div className="space-y-3">
                  {caseItem.solution.map((s, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-400">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  阶段成果
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {caseItem.results.map((r, i) => (
                    <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 text-center">
                      <p className="text-lg font-bold text-emerald-400 mb-1">{r.value}</p>
                      <p className="text-xs text-gray-400 mb-1">{r.metric}</p>
                      <p className="text-xs text-gray-500">{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lessons */}
              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-5">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  适合借鉴的经验
                </h3>
                <ul className="space-y-2">
                  {caseItem.lessons.map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Divider */}
              {index < cases.length - 1 && (
                <div className="border-t border-white/5 mt-12" />
              )}
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            想要成为下一个成功案例？
          </h2>
          <p className="text-gray-400 mb-8">
            预约演示，获取你行业的 GTM 路径样板与 ICP 示例。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/faq"
              className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium"
            >
              常见问题
            </a>
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
            <span className="text-xs text-gray-600 ml-2">© {new Date().getFullYear()} VERTAX LIMITED</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>contact@vertax.top</span>
            <a href="/faq" className="hover:text-gray-300 transition-colors">常见问题</a>
          </div>
        </div>
      </footer>
    </div>
  );
}