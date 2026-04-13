"use client";

/**
 * 获客雷达首页
 * 
 * 四段式布局：
 * A) Top: RadarStepper 显示5步流程进度
 * B) Mid: Daily brief cards 统计卡片
 * C) Main: 快速操作区 + 候选预览
 * D) Right: Secretary reminder panel 秘书提醒
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Radar, 
  Search, 
  Building2, 
  TrendingUp,
  Loader2,
  Target,
  Users,
  ChevronRight,
  Zap,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileSearch,
  Send,
  MessageSquare,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { getRadarPipelineStatus } from '@/actions/radar-pipeline';
import type { RadarPipelineStatus, StepState } from '@/lib/radar/pipeline';
import { RadarHeader, StatCard, SecretaryPanel, RadarEmptyGuide } from '@/components/radar/radar-header';

// 子模块快捷入口
const radarModules = [
  { label: '目标客户画像', href: '/customer/radar/targeting', icon: Target, description: '确认系统按什么画像找客户', badge: null },
  { label: '自动搜索', href: '/customer/radar/search', icon: Search, description: '一键启动并观察系统执行状态', badge: null },
  { label: '候选池', href: '/customer/radar/candidates', icon: Users, description: '审核和分层候选', badge: 'pendingReviewCount' },
  { label: '线索库', href: '/customer/radar/prospects', icon: Building2, description: '沉淀已确认值得跟进的线索', badge: null },
  { label: '采购机会', href: '/customer/radar/opportunities', icon: Radar, description: '单独管理采购与招投标商机', badge: null },
];

export default function RadarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<RadarPipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelineLoaded, setPipelineLoaded] = useState(false);

  // 自然语言需求输入
  const [showChatInput, setShowChatInput] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [requestResult, setRequestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 处理自然语言需求
  const handleUserRequest = async () => {
    if (!userRequest.trim()) return;
    
    setIsProcessingRequest(true);
    setRequestResult(null);
    
    try {
      const res = await fetch('/api/radar/parse-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: userRequest }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setRequestResult({ 
          success: true, 
          message: `已创建自动搜索任务"${data.profile.name}"，正在执行中...` 
        });
        setUserRequest('');
        // 刷新状态
        setTimeout(() => {
          loadPipelineStatus(true);
          setRequestResult(null);
        }, 2000);
      } else {
        setRequestResult({ 
          success: false, 
          message: data.error || '解析失败，请重试' 
        });
      }
    } catch {
      setRequestResult({ 
        success: false, 
        message: '网络错误，请重试' 
      });
    } finally {
      setIsProcessingRequest(false);
    }
  };


  // 加载流水线状态
  const loadPipelineStatus = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    
    setError(null);
    try {
      const status = await getRadarPipelineStatus().catch(() => null);
      setPipelineStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载状态失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setPipelineLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadPipelineStatus();
  }, [loadPipelineStatus]);

  // 刷新处理
  const handleRefresh = () => {
    loadPipelineStatus(true);
  };

  if (isLoading && !pipelineLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  // pipeline 加载失败或 null：降级为纯快捷入口页面（仍可用）
  if (!pipelineStatus) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, #0B1220 0%, #0A1018 100%)'}}>
        {/* 舞台标题区 */}
        <div className="relative px-6 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,175,55,0.12) 0%, transparent 65%)'}} />
          <div className="flex items-center gap-3 mb-1">
            <Radar size={22} className="text-[#D4AF37]" />
            <h1 className="text-xl font-bold text-white">获客雷达</h1>
          </div>
          <p className="text-sm text-slate-400 ml-9">基于目标客户画像自动发现、补全并沉淀线索</p>
          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 flex-1">{error}</span>
              <button onClick={() => loadPipelineStatus()} className="text-xs text-amber-400 hover:text-amber-200 font-medium">重试</button>
            </div>
          )}
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* 快速入口卡片组 */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {radarModules.map((mod) => (
              <Link
                key={mod.label}
                href={mod.href}
                className="group flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.01]"
                style={{background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)'}}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                  style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                  <mod.icon size={22} className="text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white">{mod.label}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-[#D4AF37] transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {/* 起步引导 */}
          <div className="rounded-2xl p-6" style={{background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-[#D4AF37]">五步启动获客雷达</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { step: 1, label: '目标客户画像', href: '/customer/radar/targeting', icon: Target },
                { step: 2, label: '自动搜索', href: '/customer/radar/search', icon: Search },
                { step: 3, label: '候选池', href: '/customer/radar/candidates', icon: Users },
                { step: 4, label: '线索库', href: '/customer/radar/prospects', icon: Building2 },
                { step: 5, label: '采购机会', href: '/customer/radar/opportunities', icon: Radar },
              ].map((s) => (
                <Link key={s.step} href={s.href}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all hover:bg-[rgba(212,175,55,0.08)]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)'}}>
                    {s.step}
                  </div>
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors leading-tight">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { steps, counts, currentStep, primaryCTA, errors } = pipelineStatus!;

  // 计算模块徽章
  const getModuleBadge = (badgeKey: string | null) => {
    if (!badgeKey) return null;
    const value = counts[badgeKey as keyof typeof counts];
    if (typeof value === 'number' && value > 0) return value;
    return null;
  };

  // 是否处于初始状态（第1步未完成）
  const isInitialState = currentStep === 1 && steps[0].status !== 'DONE';

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* A) RadarHeader with Stepper */}
      <RadarHeader
        title="获客雷达"
        description="AI驱动的全球潜在客户智能发现系统"
        steps={steps}
        counts={counts}
        currentStep={currentStep}
        primaryCTA={primaryCTA}
        errors={errors}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <div className="p-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-600 text-sm"
            >
              关闭
            </button>
          </div>
        )}

        {/* 智能对话输入 - 自然语言需求 */}
        <div className="bg-gradient-to-r from-[#0B1220] to-[#152942] rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.1) 0%, transparent 60%)'}} />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-[#D4AF37]" />
              <h3 className="font-bold text-white">智能获客助手</h3>
            </div>
            
            {!showChatInput ? (
              <button
                onClick={() => setShowChatInput(true)}
                className="w-full py-3 px-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl text-left text-slate-400 hover:border-[#D4AF37]/50 transition-all flex items-center gap-2"
              >
                <Sparkles size={16} className="text-[#D4AF37]" />
                <span>描述你的目标客户，AI 会按画像帮你发起自动搜索...</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userRequest}
                    onChange={e => setUserRequest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleUserRequest()}
                    placeholder="例如：帮我寻找美国的冰箱制造企业，需要喷漆机器人设备"
                    className="flex-1 py-3 px-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                    disabled={isProcessingRequest}
                  />
                  <button
                    onClick={handleUserRequest}
                    disabled={isProcessingRequest || !userRequest.trim()}
                    className="px-4 py-3 bg-[#D4AF37] text-[#0B1220] rounded-xl font-medium hover:bg-[#C5A030] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessingRequest ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => { setShowChatInput(false); setUserRequest(''); setRequestResult(null); }}
                    className="px-3 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {requestResult && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    requestResult.success 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {requestResult.success ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                    {requestResult.message}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-slate-500">试试：</span>
                  {[
                    '寻找美国汽车零部件制造商',
                    '欧洲家电企业需要喷涂设备',
                    '日本精密制造工厂',
                  ].map(example => (
                    <button
                      key={example}
                      onClick={() => setUserRequest(example)}
                      className="px-2 py-1 text-xs bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded text-slate-400 hover:text-white hover:border-[#D4AF37]/50 transition-all"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 初始状态引导 */}
        {isInitialState ? (
          <div className="max-w-2xl mx-auto">
            <RadarEmptyGuide 
              currentStep={currentStep} 
              steps={steps} 
              primaryCTA={primaryCTA}
            />
            
            {/* 快速入门步骤 */}
            <div className="mt-8 bg-[#FFFCF7] rounded-2xl border border-[#E8E0D0] p-6">
              <h3 className="font-bold text-[#0B1B2B] mb-4">快速入门</h3>
              <div className="space-y-4">
                {steps.map((step: StepState, idx: number) => (
                  <Link
                    key={step.key}
                    href={step.href}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#F0EBD8] transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.status === 'DONE' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : step.status === 'BLOCKED'
                          ? 'bg-red-50 text-red-400'
                          : idx + 1 === currentStep
                            ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                            : 'bg-slate-100 text-slate-400'
                    }`}>
                      {step.status === 'DONE' ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#0B1B2B]">{step.label}</div>
                      {step.blocker && (
                        <div className="text-xs text-slate-500 mt-0.5">{step.blocker}</div>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-[#D4AF37] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* 正常工作状态 */
          <div className="grid grid-cols-12 gap-6">
            {/* Main Content Area (8 cols) */}
            <div className="col-span-8 space-y-6">
              {/* B) Daily Brief Stats */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="animate-slide-up">
                  <StatCard
                    label="本周新增"
                    value={counts.candidatesNew7d}
                    icon={<Zap size={18} className="text-blue-500" />}
                    href="/customer/radar/candidates?period=7d"
                    highlight={counts.candidatesNew7d > 0}
                  />
                </div>
                <div className="animate-slide-up-delay-1">
                  <StatCard
                    label="高质量候选"
                    value={counts.candidatesQualifiedAB7d}
                    icon={<TrendingUp size={18} className="text-emerald-500" />}
                    href="/customer/radar/candidates?tier=A,B"
                    highlight={counts.candidatesQualifiedAB7d > 0}
                  />
                </div>
                <div className="animate-slide-up-delay-2">
                  <StatCard
                    label="待审核"
                    value={counts.pendingReviewCount}
                    icon={<FileSearch size={18} className="text-amber-500" />}
                    href="/customer/radar/candidates?status=NEW"
                    highlight={counts.pendingReviewCount > 0}
                  />
                </div>
                <div className="animate-slide-up-delay-3">
                  <StatCard
                    label="已导入"
                    value={counts.candidatesImported7d}
                    icon={<CheckCircle2 size={18} className="text-[#D4AF37]" />}
                    href="/customer/radar/prospects"
                  />
                </div>
              </div>

              {/* Module Quick Access */}
              <div className="bg-[#FFFCF7] rounded-2xl border border-[#E8E0D0] p-5">
                <h3 className="font-bold text-[#0B1B2B] mb-4">快捷入口</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {radarModules.map((mod) => {
                    const badge = getModuleBadge(mod.badge);
                    return (
                      <Link
                        key={mod.label}
                        href={mod.href}
                        className="relative p-4 rounded-xl border border-[#E8E0D0] hover:border-[#D4AF37]/50 hover:shadow-md transition-all group bg-[#FFFCF7]"
                      >
                        {badge && (
                          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {badge}
                          </span>
                        )}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 bg-[#F0EBD8] rounded-lg flex items-center justify-center group-hover:bg-[#D4AF37]/10 transition-colors">
                            <mod.icon size={18} className="text-[#D4AF37]" />
                          </div>
                          <h4 className="font-medium text-[#0B1B2B]">{mod.label}</h4>
                        </div>
                        <p className="text-xs text-slate-500">{mod.description}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Current Step Action Card */}
              <div style={{background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)'}} className="rounded-2xl p-6 relative overflow-hidden">
                <div style={{background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)'}} className="absolute inset-0 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Radar size={20} className="text-[#D4AF37]" />
                      <span className="text-xs text-slate-400">当前步骤</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {steps[currentStep - 1]?.label || '获客雷达'}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {steps[currentStep - 1]?.blocker || '系统正常运行中'}
                    </p>
                  </div>
                  
                  <Link
                    href={primaryCTA.href}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                      primaryCTA.disabled
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-[#D4AF37] text-[#0B1B2B] hover:bg-[#D4B57A]'
                    }`}
                  >
                    <Sparkles size={16} />
                    {primaryCTA.label}
                    <ArrowRight size={16} />
                  </Link>
                </div>
                
                {/* Progress Indicator */}
                <div className="mt-6 flex items-center gap-2">
                  {steps.map((step: StepState, idx: number) => (
                    <div key={step.key} className="flex-1 flex items-center gap-1">
                      <div className={`h-1.5 flex-1 rounded-full ${
                        step.status === 'DONE' 
                          ? 'bg-emerald-500' 
                          : step.status === 'BLOCKED'
                            ? 'bg-red-400'
                            : idx + 1 === currentStep
                              ? 'bg-[#D4AF37]'
                              : 'bg-slate-600'
                      }`} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>目标客户画像</span>
                  <span>自动搜索</span>
                  <span>候选池</span>
                  <span>线索库</span>
                  <span>采购机会</span>
                </div>
              </div>

              {/* Scan Status Summary */}
              {counts.lastScanAt && (
                <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm text-slate-600">
                        扫描系统运行中
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        已配置 {counts.profilesActiveCount} 个自动执行策略
                      </span>
                      <span>
                        可用 {counts.sourcesConfiguredCount} 个数据源
                      </span>
                      <Link 
                        href="/customer/radar/search" 
                        className="text-[#D4AF37] hover:underline"
                      >
                        查看自动搜索
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* D) Right Sidebar - Secretary Panel (4 cols) */}
            <div className="col-span-4 space-y-6">
              <SecretaryPanel counts={counts} errors={errors} />
              
              {/* Knowledge Sync Card */}
              {(!counts.targetingSpecFresh || !counts.targetingSpecExists) && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        {counts.targetingSpecExists ? '画像需要更新' : '缺少买家画像'}
                      </h4>
                      <p className="text-xs text-amber-600 mb-3">
                        {counts.targetingSpecExists 
                          ? '买家画像已超过30天未同步，建议从知识引擎同步最新数据'
                          : '请先在知识引擎中生成买家画像，以启用智能匹配'}
                      </p>
                      <Link
                        href="/customer/knowledge/profiles"
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
                      >
                        前往知识引擎
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8E0D0] bg-[#F7F3E8]">
                  <h3 className="text-sm font-medium text-[#0B1B2B]">最近活动</h3>
                </div>
                <div className="p-4">
                  {counts.candidatesNew7d > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <CalendarCheck size={14} className="text-slate-400" />
                        <span className="text-slate-600">
                          过去7天发现 <strong>{counts.candidatesNew7d}</strong> 个新候选
                        </span>
                      </div>
                      {counts.candidatesQualifiedAB7d > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <TrendingUp size={14} className="text-emerald-500" />
                          <span className="text-slate-600">
                            其中 <strong className="text-emerald-600">{counts.candidatesQualifiedAB7d}</strong> 个高质量(A/B级)
                          </span>
                        </div>
                      )}
                      {counts.candidatesImported7d > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 size={14} className="text-[#D4AF37]" />
                          <span className="text-slate-600">
                            已导入 <strong>{counts.candidatesImported7d}</strong> 个到线索库
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      暂无最近活动
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
