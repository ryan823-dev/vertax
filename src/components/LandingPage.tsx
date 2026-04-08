'use client';

import React, { useState } from 'react';
import {
  ArrowRight, X, Target, TrendingUp, Send,
  Layers, Brain, Megaphone, Radar, Gauge,
  ChevronRight, Zap, Shield, BarChart3,
  Rocket, Building2, CheckCircle2, Users,
  BookOpen, Search, MessageCircle, ClipboardList,
  Database, BarChart, Globe, DollarSign, Clock, AlertTriangle, Menu
} from 'lucide-react';

/* ── Modal ── */
function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">提交成功</h3>
            <p className="text-gray-400 text-sm">我们会在 1 个工作日内联系您。</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-1">预约演示</h3>
            <p className="text-gray-400 text-sm mb-6">留下信息，获取您行业的 GTM 路径样板。</p>
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-4"
            >
              <input
                required placeholder="姓名" type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              <input
                required placeholder="公司名称" type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              <input
                required placeholder="邮箱" type="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              <textarea
                placeholder="简述需求（选填）" rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                提交
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100" style={{ fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
                <span className="text-black font-bold text-xs">V</span>
              </div>
              <span className="text-lg font-bold tracking-tight">VertaX</span>
            </a>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="/features" className="hover:text-white transition-colors">产品功能</a>
            <a href="/solutions" className="hover:text-white transition-colors">解决方案</a>
            <a href="/cases" className="hover:text-white transition-colors">客户案例</a>
            <a href="/about/what-is-vertax" className="hover:text-white transition-colors">关于</a>
            <a href="/faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/en" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button
              onClick={openModal}
              className="bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              预约演示
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a14] px-6 py-4 space-y-3">
            <a href="/features" className="block text-sm text-gray-400 hover:text-white">产品功能</a>
            <a href="/solutions" className="block text-sm text-gray-400 hover:text-white">解决方案</a>
            <a href="/cases" className="block text-sm text-gray-400 hover:text-white">客户案例</a>
            <a href="/about/what-is-vertax" className="block text-sm text-gray-400 hover:text-white">关于</a>
            <a href="/faq" className="block text-sm text-gray-400 hover:text-white">FAQ</a>
          </div>
        )}
      </nav>

      {/* ── 01. Hero Banner ── */}
      <section className="pt-20 pb-24 px-6" aria-label="首屏">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-medium mb-8 tracking-wide">
            <Zap className="w-3.5 h-3.5" /> 出海获客智能体
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            VertaX
            <br />
            <span className="text-cyan-400">让每一家中国企业，都拥有自主进化的全球增长大脑</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            以知识引擎、内容增长、商机挖掘与协同推进能力，帮助企业构建可持续、可进化的全球增长体系。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button onClick={openModal} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2">
              预约演示 <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={openModal} className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium">
              获取行业方案
            </button>
          </div>
          <p className="text-xs text-gray-600 tracking-wide">面向制造业、工业品、技术服务型企业的出海增长平台</p>
        </div>
      </section>

      {/* ── 02. One-liner Positioning ── */}
      <section className="py-16 px-6 border-t border-white/5 bg-white/[0.02]" aria-label="核心定位">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">方法论与系统缺位，才是出海获客的瓶颈。</h2>
          <p className="text-gray-400 text-lg">VertaX 提供工业出海获客操作系统，让获客从靠人变成靠系统。</p>
        </div>
      </section>

      {/* ── 03. Target Customers ── */}
      <section className="py-20 px-6" aria-label="目标客户">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">VertaX 服务这样的企业</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: '制造业出海企业',
                desc: '希望在海外建立品牌、获取询盘、实现持续增长的工业制造商。'
              },
              {
                icon: Globe,
                title: 'B2B 出海团队',
                desc: '需要系统化管理海外客户、沉淀内容资产、协同多部门的企业。'
              },
              {
                icon: Target,
                title: '成长型出海公司',
                desc: '希望以更低成本、更高效率突破海外市场的中小型企业。'
              }
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors">
                <Icon className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04. Industry Pain Points ── */}
      <section className="py-20 px-6 bg-white/[0.02]" aria-label="行业痛点">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">出海企业面临的五大挑战</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Database,
                title: '知识散落',
                desc: '产品资料、行业知识、客户案例分散在个人手中，无法形成组织能力。'
              },
              {
                icon: MessageCircle,
                title: '表达碎片',
                desc: '品牌声音不统一，销售与市场各说各话，无法形成合力。'
              },
              {
                icon: Search,
                title: '获客迷茫',
                desc: 'SEO、社交、展会、B2B平台做了很多，但没有清晰的增长路径。'
              },
              {
                icon: Users,
                title: '线索混乱',
                desc: '获取的客户信息残缺，无法判断质量，团队跟进效率低下。'
              },
              {
                icon: BarChart,
                title: '结果模糊',
                desc: '做了很多工作，但不知道哪些有效，无法持续优化。'
              },
              {
                icon: AlertTriangle,
                title: '人员依赖',
                desc: '过度依赖个人经验，人员变动后能力归零，风险极高。'
              }
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                <Icon className="w-6 h-6 text-amber-400 mb-3" />
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6 text-center">
            <p className="text-cyan-300 text-lg font-medium">这些挑战不是靠多招人就能解决的，需要一套系统化的增长机制。</p>
          </div>
        </div>
      </section>

      {/* ── 05. Core Value Proposition ── */}
      <section className="py-20 px-6" aria-label="核心价值">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">VertaX 的价值主张</h2>
          <p className="text-gray-500 text-center mb-12 text-sm">不是工具集合，是工业出海获客的操作系统</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: '资产化',
                desc: '每一次获客动作都沉淀为可复用的组织资产，不因人员流动归零。',
                color: 'cyan'
              },
              {
                icon: Shield,
                title: '标准化',
                desc: '从 ICP 定义到跟进节奏，全流程有标准、可度量。',
                color: 'violet'
              },
              {
                icon: BarChart3,
                title: '可审计',
                desc: '动作记录、效果归因、成本核算，全链路透明可追溯。',
                color: 'amber'
              }
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 ${color === 'violet' ? 'hover:border-violet-500/20' : color === 'amber' ? 'hover:border-amber-500/20' : 'hover:border-cyan-500/20'} transition-colors`}>
                <Icon className={`w-8 h-8 mb-4 ${color === 'violet' ? 'text-violet-400' : color === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`} />
                <h3 className={`text-lg font-bold mb-2 ${color === 'violet' ? 'text-violet-400' : color === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`}>{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 06. Six Modules ── */}
      <section className="py-20 px-6 bg-white/[0.02]" aria-label="六大模块">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">VertaX 六大核心模块</h2>
          <p className="text-gray-500 text-center mb-12 text-sm">从知识沉淀到商机推进，构建完整的出海增长闭环</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: '知识引擎',
                desc: '产品、资质、竞品、行业知识结构化沉淀，让 AI 真正理解你的业务。'
              },
              {
                icon: TrendingUp,
                title: '增长系统',
                desc: '多语言 SEO 内容持续生产，吸引高意向海外客户自然询盘。'
              },
              {
                icon: Radar,
                title: '获客雷达',
                desc: '围绕 ICP 识别潜在线索，分层判断优先级，高效发现目标客户。'
              },
              {
                icon: Megaphone,
                title: '声量枢纽',
                desc: '社媒矩阵运营与 PR 协同，提升品牌在目标市场的声量与可信度。'
              },
              {
                icon: Send,
                title: '推进中台',
                desc: '从建联到跟进的协同推进系统，跨部门协作可视化、节奏可控。'
              },
              {
                icon: BarChart3,
                title: '决策中心',
                desc: '一屏看清投入、节奏、结果，支持周报月报自动生成。'
              }
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors">
                <Icon className="w-7 h-7 text-cyan-400 mb-4" />
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 07. Why Choose VertaX ── */}
      <section className="py-20 px-6" aria-label="选择理由">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">为什么选择 VertaX</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: '从单点到闭环',
                desc: '不是提供一堆独立工具，而是构建从认知到成交的完整增长闭环。'
              },
              {
                title: '从经验到系统',
                desc: '把分散的个人经验转化为组织可用的知识资产，降低人员依赖。'
              },
              {
                title: '从模糊到可见',
                desc: '所有动作可记录、效果可归因、投入可核算，让增长可见可控。'
              },
              {
                title: '从中国到全球',
                desc: '专为理解中国出海企业设计，真正解决制造业出海的实际问题。'
              }
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 08. Comparison with Traditional Solutions ── */}
      <section className="py-20 px-6 bg-white/[0.02]" aria-label="方案对比">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">VertaX vs 传统方案</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 font-bold">维度</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-400">传统方案</th>
                  <th className="text-center py-4 px-4 font-bold text-cyan-400">VertaX</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['获客方式', '散点式投放、展会、平台', '系统化增长飞轮'],
                  ['知识管理', '散落在个人电脑或表格', '结构化知识引擎'],
                  ['内容生产', '外包或临时创作', '持续 SEO 内容资产'],
                  ['客户识别', '靠经验判断，无标准', 'ICP + 分层判断模型'],
                  ['协同方式', '微信群 + 表格', '系统化推进流程'],
                  ['效果评估', '模糊，难归因', '全链路数据，可追溯'],
                  ['资产沉淀', '人员离职即归零', '组织知识，可持续复用']
                ].map(([dim, traditional, vertax]) => (
                  <tr key={dim} className="border-b border-white/5">
                    <td className="py-4 px-4 font-medium">{dim}</td>
                    <td className="py-4 px-4 text-center text-gray-500">{traditional}</td>
                    <td className="py-4 px-4 text-center text-cyan-400 font-medium">{vertax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 09. Use Cases ── */}
      <section className="py-20 px-6" aria-label="应用场景">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">典型应用场景</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: '工业机器人企业',
                challenge: '海外代理商难以触达，品牌在目标市场认知度低',
                solution: '通过知识引擎建立完整产品库，SEO 内容覆盖目标市场关键词，获客雷达识别代理商线索，推进中台协同海外团队。'
              },
              {
                title: '新能源装备制造商',
                challenge: 'B2B 平台竞争激烈，获客成本不断上升',
                solution: '构建品牌独立站 + 行业知识中心，通过 GEO 优化提升在 AI 搜索中的可见度，降低对付费平台的依赖。'
              },
              {
                title: '医疗设备出口商',
                challenge: '产品专业性强，需要建立专业信任背书',
                solution: '知识引擎沉淀产品技术资料与认证文档，内容系统持续输出行业洞察，建立行业专家形象后再推进销售。'
              }
            ].map(({ title, challenge, solution }) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-cyan-500/20 transition-colors">
                <h3 className="text-lg font-bold mb-3">{title}</h3>
                <div className="mb-4">
                  <p className="text-xs text-amber-400 font-medium mb-1">挑战</p>
                  <p className="text-sm text-gray-400">{challenge}</p>
                </div>
                <div>
                  <p className="text-xs text-cyan-400 font-medium mb-1">解决方案</p>
                  <p className="text-sm text-gray-400">{solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Value Conclusion ── */}
      <section className="py-20 px-6 bg-white/[0.02]" aria-label="价值总结">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">让出海获客从项目制升级为系统工程</h2>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            VertaX 不仅仅是一个软件平台，更是帮助企业建立持续增长能力的合作伙伴。
            我们相信，每一家中国企业都值得拥有一个自主进化的全球增长大脑。
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500/60" />
              <span>持续迭代</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-500/60" />
              <span>成本可控</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500/60" />
              <span>团队协同</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-500/60" />
              <span>效果可见</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. CTA ── */}
      <section className="py-24 px-6" aria-label="行动号召">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">预约演示，拿到你行业的 GTM 路径样板</h2>
          <p className="text-gray-400 mb-8">我们会根据你的行业、产品和目标市场，提供针对性的增长建议。</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={openModal} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2">
              预约演示 <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={openModal} className="border border-white/10 text-gray-300 hover:bg-white/5 px-8 py-3 rounded-lg transition-colors font-medium">
              获取行业方案
            </button>
          </div>
        </div>
      </section>

      {/* ── Deployment Options ── */}
      <section className="py-16 px-6 border-t border-white/5" aria-label="部署方式">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8">两种部署形态</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <Rocket className="w-6 h-6 text-cyan-400 mb-3" />
              <h3 className="text-base font-bold mb-2">快速上车</h3>
              <p className="text-sm text-gray-400 leading-relaxed">标准模板，即刻跑通。无需 IT 团队，注册即用，数据随时导出。</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <Building2 className="w-6 h-6 text-violet-400 mb-3" />
              <h3 className="text-base font-bold mb-2">企业级落地</h3>
              <p className="text-sm text-gray-400 leading-relaxed">权限/审批/私有知识库/数据隔离。按组织架构定制，深度融入业务流程。</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">先跑通，再沉淀成组织能力。</p>
        </div>
      </section>

            {/* ── Social Proof ── */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-cyan-500 font-semibold tracking-widest uppercase mb-3">已验证的增长引擎</p>
          <h2 className="text-2xl font-bold text-center mb-10">数字背后的实力</h2>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { value: '11', unit: '个', label: '全球市场区域覆盖', desc: '从北美到东南亚，系统性探索每个机会' },
              { value: '6', unit: '大模块', label: '一站式增长闭环', desc: '从知识沉淀到商机推进，无缝衔接' },
              { value: '7×24', unit: 'h', label: 'AI 智能体在线', desc: '不睡觉的数字员工，持续扫描全球商机' },
              { value: '<1', unit: 'min', label: '从资料到画像', desc: '上传企业资料，即刻生成客户画像' },
            ].map((s, i) => (
              <div key={i} className="text-center p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="text-3xl font-bold text-cyan-400 mb-0.5">{s.value}<span className="text-lg text-gray-500 ml-0.5">{s.unit}</span></div>
                <p className="text-sm font-medium text-white mb-1">{s.label}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Industry Coverage */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 mb-12">
            <p className="text-sm font-semibold text-white mb-4">已覆盖行业</p>
            <div className="flex flex-wrap gap-2">
              {['工业自动化', '机械装备', '新能源', '电子元器件', '医疗器械', '化工新材料',
                '汽车零部件', '建筑建材', '物流装备', 'IoT 智能硬件', 'SaaS 技术服务', '环保设备'].map((ind, i) => (
                <span key={i} className="px-3 py-1.5 text-xs rounded-full border border-white/10 text-gray-400">{ind}</span>
              ))}
            </div>
          </div>

          {/* Early Adopter Testimonials */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: '以前找客户靠展会和老关系，现在系统每周自动推送精准线索，我们只需要做筛选和跟进。',
                role: '某自动化设备企业',
                person: '海外事业部负责人',
              },
              {
                quote: '最意外的是知识引擎——把我们十几年的产品资料吃透了，生成的客户画像比我们自己写的还准。',
                role: '某新能源装备企业',
                person: '市场总监',
              },
              {
                quote: '终于有一个系统能让我看到整个出海获客链路的全貌，而不是各个岗位各报各的。',
                role: '某工业集团',
                person: '副总裁',
              },
            ].map((t, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                <p className="text-sm text-gray-300 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-xs font-medium text-white">{t.person}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
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
            <div className="flex flex-col items-center gap-1">
              <img src="/wechat-qr.jpg" alt="WeChat" className="w-16 h-16 rounded opacity-80" />
              <span className="text-[10px] text-gray-600">微信公众号</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
