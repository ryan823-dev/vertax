'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import {
  ArrowRight, X, Target, TrendingUp, Send,
  Brain, Megaphone, Radar,
  Shield, BarChart3,
  Building2, CheckCircle2, Users,
  Search, MessageCircle, Database,
  BarChart, Globe, AlertTriangle, Menu, Sparkles
} from 'lucide-react';
import { colors, shadows, gradients } from '@/lib/design-tokens';

/* ── Modal ── */
function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-md p-8 relative"
        style={{
          background: colors.bg.secondary,
          border: `1px solid ${colors.border.brand}`,
          boxShadow: shadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: colors.border.glow }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: colors.data.positive }} />
            </div>
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
              <input
                required placeholder="公司名称" type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
              <input
                required placeholder="邮箱" type="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
              <textarea
                placeholder="简述需求（选填）" rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none resize-none"
              />
              <button
                type="submit"
                className="w-full font-semibold py-3 rounded-lg transition-all text-sm hover:scale-[1.02]"
                style={{
                  background: colors.brand.gradient,
                  color: colors.text.inverse,
                }}
              >
                提交预约
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
    <div className="min-h-screen" style={{ background: colors.bg.primary, fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── Navigation ── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.border.brand}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
              style={{
                background: colors.brand.gradient,
                color: colors.text.inverse,
                boxShadow: shadows.glow,
              }}
            >
              V
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">VertaX</span>
              <span className="hidden sm:inline text-[9px] ml-2 px-2 py-0.5 rounded font-bold uppercase tracking-widest" style={{ color: colors.brand.primary, background: colors.border.glow }}>
                Intelligence OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="/features" className="text-gray-300 hover:text-white transition-colors">产品功能</a>
            <a href="/solutions" className="text-gray-300 hover:text-white transition-colors">解决方案</a>
            <a href="/cases" className="text-gray-300 hover:text-white transition-colors">客户案例</a>
            <a href="/about/what-is-vertax" className="text-gray-300 hover:text-white transition-colors">关于我们</a>
            <a href="/faq" className="text-gray-300 hover:text-white transition-colors">FAQ</a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="/en"
              className="hidden sm:flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5"
            >
              <Globe className="w-4 h-4" /> EN
            </a>
            <button
              onClick={openModal}
              className="font-semibold px-5 py-2 rounded-lg transition-all text-sm hover:scale-105"
              style={{
                background: colors.brand.gradient,
                color: colors.text.inverse,
              }}
            >
              预约演示
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
              aria-label="菜单"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-4 space-y-1" style={{ background: colors.bg.primary }}>
            <a href="/features" className="block text-sm text-gray-300 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5">产品功能</a>
            <a href="/solutions" className="block text-sm text-gray-300 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5">解决方案</a>
            <a href="/cases" className="block text-sm text-gray-300 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5">客户案例</a>
            <a href="/about/what-is-vertax" className="block text-sm text-gray-300 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5">关于我们</a>
            <a href="/faq" className="block text-sm text-gray-300 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5">FAQ</a>
            <div className="pt-3 border-t border-white/5 mt-3">
              <a href="/en" className="block text-sm text-gray-400 py-3 px-3 rounded-lg hover:bg-white/5 flex items-center gap-2">
                <Globe className="w-4 h-4" /> English Version
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section
        className="py-16 md:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{ background: colors.bg.heroGradient }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: gradients.mesh }}>
          <div className="absolute inset-0" style={{ background: gradients.grid, backgroundSize: '60px 60px' }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
            style={{
              background: colors.border.glow,
              border: `1px solid ${colors.border.brand}`,
              color: colors.brand.primary,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligence OS for Global Growth</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
            让每一家中国企业
            <br />
            <span style={{ background: colors.brand.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>拥有自主进化的全球增长大脑</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto px-4 leading-relaxed">
            以知识引擎、内容增长、商机挖掘与协同推进能力，
            帮助企业构建可持续、可进化的全球增长体系。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={openModal}
              className="w-full sm:w-auto font-semibold px-8 py-4 rounded-xl transition-all inline-flex items-center justify-center gap-2 text-base hover:scale-105"
              style={{
                background: colors.brand.gradient,
                color: colors.text.inverse,
                boxShadow: shadows.glowLg,
              }}
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={openModal}
              className="w-full sm:w-auto border px-8 py-4 rounded-xl transition-colors font-medium text-base text-white hover:bg-white/5"
              style={{ borderColor: colors.border.strong }}
            >
              获取行业方案
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: colors.data.positive }} />
              面向制造业、工业品企业
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: colors.brand.accent }} />
              数据安全合规
            </span>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: colors.brand.primary }} />
              100+ 企业信赖
            </span>
          </div>
        </div>
      </section>

      {/* ── Value Proposition Banner ── */}
      <section
        className="py-12 px-4 sm:px-6"
        style={{ background: 'linear-gradient(180deg, #F7F3EA 0%, #FFFFFF 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3" style={{ color: '#0B1B2B' }}>
            方法论与系统缺位，才是出海获客的瓶颈。
          </h2>
          <p className="text-base sm:text-lg" style={{ color: '#334155' }}>
            VertaX 提供从0到1的出海辅导，让获客从靠人变成靠系统。
          </p>
        </div>
      </section>

      {/* ── Target Customers ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest mb-3 inline-block"
              style={{ color: colors.brand.primary }}
            >
              目标客户
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text.primary }}>
              VertaX 服务这样的企业
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: '产品具有核心竞争力',
                desc: '拥有优质产品或技术，希望在海外市场扩大影响力、获取订单的企业。'
              },
              {
                icon: Globe,
                title: '在海外有潜在的市场需求',
                desc: '目标市场对产品或服务存在明确需求，等待被系统化开发和转化的企业。'
              },
              {
                icon: Target,
                title: '暂不具备专业的出海能力和团队',
                desc: '需要借助专业平台和系统化的方法，以更低成本实现出海增长的企业。'
              }
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{
                  background: colors.bg.secondary,
                  border: `1px solid ${colors.border.light}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: colors.border.glow }}
                >
                  <Icon className="w-6 h-6" style={{ color: colors.brand.primary }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: colors.text.primary }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest mb-3 inline-block"
              style={{ color: colors.brand.primary }}
            >
              行业痛点
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text.primary }}>
              出海企业面临的八大挑战
            </h2>
          </div>

          {/* 第一部分：内部准备不足 */}
          <div className="mb-10">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold" style={{ color: colors.text.primary }}>
                第一部分：内部准备不足
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                企业还没真正具备出海起步能力
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {[
                { icon: AlertTriangle, num: '1', title: '路径不清', desc: '不知道该做 B2B 还是 B2C，不清楚先做哪个市场、哪个渠道、哪种出海模式，缺乏明确方向。' },
                { icon: Database, num: '2', title: '资料不全', desc: '企业介绍、产品资料、案例内容、技术说明等准备不足，无法支撑海外市场启动。' },
                { icon: MessageCircle, num: '3', title: '表达不专业', desc: '缺少面向海外客户的专业表达，企业价值、产品优势、服务能力说不清，难以建立第一轮信任。' },
                { icon: Shield, num: '4', title: '配套缺失', desc: '在认证、资质、进出口、关务、海外仓、海外收款等环节上缺少经验和资源，出海落地困难。' }
              ].map(({ icon: Icon, num, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl p-5 flex gap-4"
                  style={{
                    background: colors.bg.primary,
                    border: `1px solid ${colors.border.light}`,
                  }}
                >
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6" style={{ color: colors.data.neutral }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: colors.border.medium, color: colors.brand.primary }}>{num}</span>
                      <h3 className="font-bold" style={{ color: colors.text.primary }}>{title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 第二部分：外部启动困难 */}
          <div className="mb-10">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold" style={{ color: colors.text.primary }}>
                第二部分：外部启动困难
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                市场还没有真正跑起来
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { icon: Search, num: '5', title: '获客无从下手', desc: '不知道该从 SEO、广告、社媒、展会、平台还是主动开发切入，渠道选择混乱，启动效率低。' },
                { icon: BarChart, num: '6', title: '投入门槛高', desc: '建团队、跑展会、买平台、做推广都需要持续投入，前期成本高，试错压力大。' },
                { icon: Target, num: '7', title: '冷启动困难', desc: '没有稳定渠道，没有品牌基础，也缺乏海外客户触达能力，第一批客户难启动。' },
                { icon: Users, num: '8', title: '人员依赖', desc: '过度依赖业务员个人能力和经验，一旦换人，客户沟通、资源积累和推进能力都容易中断。' }
              ].map(({ icon: Icon, num, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl p-5 flex gap-4"
                  style={{
                    background: colors.bg.primary,
                    border: `1px solid ${colors.border.light}`,
                  }}
                >
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6" style={{ color: colors.data.neutral }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: colors.border.medium, color: colors.brand.primary }}>{num}</span>
                      <h3 className="font-bold" style={{ color: colors.text.primary }}>{title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solution Highlight */}
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: colors.border.glow,
              border: `1px solid ${colors.border.medium}`,
            }}
          >
            <p className="text-lg font-medium" style={{ color: colors.brand.primary }}>
              这些挑战不是靠多招人就能解决的，需要一套系统化的增长机制。
            </p>
          </div>
        </div>
      </section>

      {/* ── Core Value ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest mb-3 inline-block"
              style={{ color: colors.brand.primary }}
            >
              核心价值
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.text.primary }}>
              VertaX 的价值主张
            </h2>
            <p className="text-sm" style={{ color: colors.text.muted }}>
              不是工具集合，是工业出海获客的操作系统
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: '资产化', desc: '每一次获客动作都沉淀为可复用的组织资产，不因人员流动归零。', color: colors.brand.primary },
              { icon: Shield, title: '标准化', desc: '从 ICP 定义到跟进节奏，全流程有标准、可度量。', color: colors.brand.secondary },
              { icon: BarChart3, title: '可审计', desc: '动作记录、效果归因、成本核算，全链路透明可追溯。', color: colors.brand.accent }
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{
                  background: colors.bg.secondary,
                  border: `1px solid ${colors.border.light}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <Icon className="w-8 h-8 mb-4" style={{ color }} />
                <h3 className="text-lg font-bold mb-2" style={{ color }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Six Modules ── */}
      <section
        className="py-16 sm:py-20 px-4 sm:px-6"
        style={{
          background: 'linear-gradient(180deg, #0B1220 0%, #0D1526 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest mb-3 inline-block"
              style={{ color: colors.brand.primary }}
            >
              六大模块
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              VertaX 六大核心模块
            </h2>
            <p className="text-sm text-gray-500">
              从知识沉淀到商机推进，构建完整的出海增长闭环
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: '知识引擎', desc: '产品、资质、竞品、行业知识结构化沉淀，让 AI 真正理解你的业务。' },
              { icon: TrendingUp, title: '增长系统', desc: '多语言 SEO 内容持续生产，吸引高意向海外客户自然询盘。' },
              { icon: Radar, title: '获客雷达', desc: '围绕 ICP 识别潜在线索，分层判断优先级，高效发现目标客户。' },
              { icon: Megaphone, title: '声量枢纽', desc: '社媒矩阵运营与 PR 协同，提升品牌在目标市场的声量与可信度。' },
              { icon: Send, title: '推进中台', desc: '从建联到跟进的协同推进系统，跨部门协作可视化、节奏可控。' },
              { icon: BarChart3, title: '决策中心', desc: '一屏看清投入、节奏、结果，支持周报月报自动生成。' }
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-5 transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Icon className="w-7 h-7 mb-3" style={{ color: colors.brand.primary }} />
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: colors.bg.primary }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest mb-3 inline-block"
              style={{ color: colors.brand.primary }}
            >
              方案对比
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text.primary }}>
              VertaX vs 传统方案
            </h2>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {[
              { dim: '获客方式', traditional: '散点式投放、展会、平台', vertax: '系统化增长飞轮' },
              { dim: '知识管理', traditional: '散落在个人电脑或表格', vertax: '结构化知识引擎' },
              { dim: '内容生产', traditional: '外包或临时创作', vertax: '持续 SEO 内容资产' },
              { dim: '客户识别', traditional: '靠经验判断，无标准', vertax: 'ICP + 分层判断模型' },
              { dim: '协同方式', traditional: '微信群 + 表格', vertax: '系统化推进流程' },
              { dim: '效果评估', traditional: '模糊，难归因', vertax: '全链路数据，可追溯' },
              { dim: '资产沉淀', traditional: '人员离职即归零', vertax: '组织知识，可持续复用' }
            ].map(({ dim, traditional, vertax }) => (
              <div
                key={dim}
                className="rounded-xl p-4"
                style={{
                  background: colors.bg.secondary,
                  border: `1px solid ${colors.border.light}`,
                }}
              >
                <p className="font-bold mb-3" style={{ color: colors.text.primary }}>{dim}</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(107,114,128,0.1)', color: colors.text.muted }}>传统</span>
                    <span className="text-sm" style={{ color: colors.text.secondary }}>{traditional}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium" style={{ background: colors.border.glow, color: colors.brand.primary }}>VertaX</span>
                    <span className="text-sm font-medium" style={{ color: colors.brand.primary }}>{vertax}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                  <th className="text-left py-4 px-4 font-bold" style={{ color: colors.text.primary }}>维度</th>
                  <th className="text-center py-4 px-4 font-bold" style={{ color: colors.text.muted }}>传统方案</th>
                  <th className="text-center py-4 px-4 font-bold" style={{ color: colors.brand.primary }}>VertaX</th>
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
                  <tr key={dim} style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                    <td className="py-4 px-4 font-medium" style={{ color: colors.text.primary }}>{dim}</td>
                    <td className="py-4 px-4 text-center" style={{ color: colors.text.muted }}>{traditional}</td>
                    <td className="py-4 px-4 text-center font-medium" style={{ color: colors.brand.primary }}>{vertax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest mb-3 inline-block"
              style={{ color: colors.brand.primary }}
            >
              实力验证
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text.primary }}>
              数字背后的实力
            </h2>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { value: '11', unit: '个', label: '全球市场区域覆盖' },
              { value: '6', unit: '大模块', label: '一站式增长闭环' },
              { value: '7×24', unit: 'h', label: 'AI 智能体在线' },
              { value: '<1', unit: 'min', label: '从资料到画像' },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center p-5 rounded-2xl"
                style={{
                  background: colors.bg.primary,
                  border: `1px solid ${colors.border.light}`,
                }}
              >
                <div className="text-3xl font-bold mb-1" style={{ color: colors.brand.primary }}>
                  {s.value}<span className="text-base text-gray-400 ml-0.5">{s.unit}</span>
                </div>
                <p className="text-xs font-medium" style={{ color: colors.text.primary }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Industry Coverage */}
          <div
            className="rounded-2xl p-6 mb-10"
            style={{
              background: colors.bg.primary,
              border: `1px solid ${colors.border.light}`,
            }}
          >
            <p className="font-semibold mb-4" style={{ color: colors.text.primary }}>已覆盖行业</p>
            <div className="flex flex-wrap gap-2">
              {['工业自动化', '机械装备', '新能源', '电子元器件', '医疗器械', '化工新材料',
                '汽车零部件', '建筑建材', '物流装备', 'IoT 智能硬件', 'SaaS 技术服务', '环保设备'].map((ind) => (
                <span
                  key={ind}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{
                    background: colors.bg.secondary,
                    border: `1px solid ${colors.border.light}`,
                    color: colors.text.secondary,
                  }}
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
              <div
                key={i}
                className="rounded-2xl p-6"
                style={{
                  background: colors.bg.primary,
                  border: `1px solid ${colors.border.light}`,
                }}
              >
                <p className="text-sm leading-relaxed mb-4" style={{ color: colors.text.primary }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-xs font-medium" style={{ color: colors.text.primary }}>{t.person}</p>
                  <p className="text-xs" style={{ color: colors.text.muted }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section
        className="py-20 sm:py-28 px-4 sm:px-6"
        style={{
          background: 'linear-gradient(180deg, #0B1220 0%, #0D1526 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            预约演示，拿到你行业的 GTM 路径样板
          </h2>
          <p className="text-gray-400 mb-8 text-sm sm:text-base">
            我们会根据你的行业、产品和目标市场，提供针对性的增长建议。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openModal}
              className="w-full sm:w-auto font-semibold px-8 py-4 rounded-xl transition-all inline-flex items-center justify-center gap-2 text-base hover:scale-105"
              style={{
                background: colors.brand.gradient,
                color: colors.text.inverse,
                boxShadow: shadows.glowLg,
              }}
            >
              预约演示 <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={openModal}
              className="w-full sm:w-auto border px-8 py-4 rounded-xl transition-colors font-medium text-base text-white hover:bg-white/5"
              style={{ borderColor: colors.border.strong }}
            >
              获取行业方案
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-12 px-4 sm:px-6"
        style={{
          background: colors.bg.dark,
          borderTop: `1px solid ${colors.border.brand}`,
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-start justify-between gap-8">
            {/* Logo & Copyright */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                  style={{
                    background: colors.brand.gradient,
                    color: colors.text.inverse,
                  }}
                >
                  V
                </div>
                <span className="text-base font-bold text-white">VertaX</span>
              </Link>
              <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} VERTAX LIMITED</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-12 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>产品</span>
                <a href="/features" className="text-gray-400 hover:text-white transition-colors">产品功能</a>
                <a href="/features/modules" className="text-gray-400 hover:text-white transition-colors">六大模块</a>
                <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">价格</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>解决方案</span>
                <a href="/solutions" className="text-gray-400 hover:text-white transition-colors">解决方案</a>
                <a href="/cases" className="text-gray-400 hover:text-white transition-colors">客户案例</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>关于</span>
                <a href="/about/what-is-vertax" className="text-gray-400 hover:text-white transition-colors">关于我们</a>
                <a href="/faq" className="text-gray-400 hover:text-white transition-colors">常见问题</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>联系</span>
                <span className="text-gray-500">contact@vertax.top</span>
                <a href="/en" className="text-gray-400 hover:text-white transition-colors">English</a>
              </div>
            </div>

            {/* QR Codes */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <Image src="/wechat-qr.jpg" alt="微信公众号" width={64} height={64} className="w-16 h-16 rounded-lg" />
                <span className="text-[10px] text-gray-600">微信公众号</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Image src="/contact-wechat.jpg" alt="业务联系人微信" width={64} height={64} className="w-16 h-16 rounded-lg" />
                <span className="text-[10px] text-gray-600">业务联系</span>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                  style={{
                    background: colors.brand.gradient,
                    color: colors.text.inverse,
                  }}
                >
                  V
                </div>
                <span className="text-sm font-bold text-white">VertaX</span>
              </Link>
              <span className="text-xs text-gray-600">&copy; {new Date().getFullYear()} VERTAX LIMITED</span>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <a href="/features" className="text-gray-400 py-2">产品功能</a>
              <a href="/solutions" className="text-gray-400 py-2">解决方案</a>
              <a href="/cases" className="text-gray-400 py-2">客户案例</a>
              <a href="/pricing" className="text-gray-400 py-2">价格</a>
              <a href="/about/what-is-vertax" className="text-gray-400 py-2">关于我们</a>
              <a href="/faq" className="text-gray-400 py-2">常见问题</a>
            </div>

            {/* Contact & QR */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-xs text-gray-500">contact@vertax.top</span>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <Image src="/wechat-qr.jpg" alt="微信公众号" width={48} height={48} className="w-12 h-12 rounded" />
                  <span className="text-[10px] text-gray-600">公众号</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Image src="/contact-wechat.jpg" alt="业务联系人微信" width={48} height={48} className="w-12 h-12 rounded" />
                  <span className="text-[10px] text-gray-600">业务联系</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
