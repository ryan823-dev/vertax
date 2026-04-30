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
  { label: 'AI 推荐', href: '/customer/radar/candidates', icon: Users, description: '查看 AI 筛选的高匹配客户', badge: 'pendingReviewCount' },
  { label: '线索库', href: '/customer/radar/prospects', icon: Building2, description: '沉淀已确认值得跟进的线索', badge: null },
  { label: '采购机会', href: '/customer/radar/opportunities', icon: Radar, description: '单独管理采购与招投标商机', badge: null },
];

type RefinementPayload = {
  summary?: string;
  targetCountries?: string[];
  targetIndustries?: string[];
  keywords?: string[];
  negativeKeywords?: string[];
  useCases?: string[];
  triggers?: string[];
};

type RequestResult = {
  success: boolean;
  message: string;
  refinement?: RefinementPayload;
  targetingSpec?: {
    id?: string;
    version?: number;
    name?: string;
  };
};

export default function RadarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<RadarPipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelineLoaded, setPipelineLoaded] = useState(false);

  // 客户专家判断输入
  const [showChatInput, setShowChatInput] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null);

  // 处理客户专家判断
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
          message: `已写入目标客户画像：${data.refinement?.summary || data.targetingSpec?.name || '客户行业判断补充'}`,
          refinement: data.refinement,
          targetingSpec: data.targetingSpec,
        });
        setUserRequest('');
        // 刷新状态
        setTimeout(() => {
          loadPipelineStatus(true);
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
        <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
      </div>
    );
  }

  // pipeline 加载失败或 null：降级为纯快捷入口页面（仍可用）
  if (!pipelineStatus) {
    return (
      <div className="space-y-6">
        {/* 标题区 */}
        <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] px-6 py-6 shadow-[var(--ci-shadow-soft)]">
          <div className="flex items-center gap-3 mb-1">
            <Radar size={22} className="text-[var(--ci-accent)]" />
            <h1 className="text-xl font-bold text-[#0B1B2B]">获客雷达</h1>
          </div>
          <p className="text-sm text-slate-500 ml-9">基于目标客户画像自动发现、补全并沉淀线索</p>
          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span className="text-xs text-amber-700 flex-1">{error}</span>
              <button onClick={() => loadPipelineStatus()} className="text-xs text-amber-700 hover:text-amber-900 font-medium">重试</button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* 快速入口卡片组 */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {radarModules.map((mod) => (
              <Link
                key={mod.label}
                href={mod.href}
                className="group flex items-center gap-4 rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-5 transition-all hover:border-[var(--ci-accent)]/40 hover:shadow-[var(--ci-shadow-soft)]"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                  style={{background: 'rgba(79,141,246,0.12)', border: '1px solid rgba(79,141,246,0.3)'}}>
                  <mod.icon size={22} className="text-[var(--ci-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#0B1B2B]">{mod.label}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-[var(--ci-accent)] transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {/* 起步引导 */}
          <div className="rounded-xl p-6" style={{background: 'rgba(79,141,246,0.06)', border: '1px solid rgba(79,141,246,0.15)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-[var(--ci-accent)]" />
              <h3 className="font-bold text-[var(--ci-accent)]">五步启动获客雷达</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { step: 1, label: '目标客户画像', href: '/customer/radar/targeting', icon: Target },
                { step: 2, label: '自动搜索', href: '/customer/radar/search', icon: Search },
                { step: 3, label: 'AI 推荐', href: '/customer/radar/candidates', icon: Users },
                { step: 4, label: '线索库', href: '/customer/radar/prospects', icon: Building2 },
                { step: 5, label: '采购机会', href: '/customer/radar/opportunities', icon: Radar },
              ].map((s) => (
                <Link key={s.step} href={s.href}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all hover:bg-[rgba(79,141,246,0.08)]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{background: 'rgba(79,141,246,0.15)', color: 'var(--ci-accent)', border: '1px solid rgba(79,141,246,0.3)'}}>
                    {s.step}
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-[var(--ci-accent)] transition-colors leading-tight">{s.label}</span>
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
    <div className="space-y-6">
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

        {/* 客户专家判断输入 */}
        <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-5 shadow-[var(--ci-shadow-soft)]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-[var(--ci-accent)]" />
              <h3 className="font-bold text-[#0B1B2B]">画像校正助手</h3>
            </div>
            
            {!showChatInput ? (
              <button
                onClick={() => setShowChatInput(true)}
                className="w-full py-3 px-4 bg-[var(--ci-surface-muted)] border border-[var(--ci-border)] rounded-xl text-left text-slate-500 hover:border-[var(--ci-accent)]/50 transition-all flex items-center gap-2"
              >
                <Sparkles size={16} className="text-[var(--ci-accent)]" />
                <span>补充你对目标客户的行业判断，系统会写入画像再用于自动匹配...</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userRequest}
                    onChange={e => setUserRequest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleUserRequest()}
                    placeholder="例如：美国制造企业中有喷涂产线升级、机器人喷涂、paint booth 改造需求的客户；先不要看住宅刷漆和汽修喷漆。"
                    className="flex-1 py-3 px-4 bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl text-[#0B1B2B] placeholder-slate-400 focus:outline-none focus:border-[var(--ci-accent)]"
                    disabled={isProcessingRequest}
                  />
                  <button
                    onClick={handleUserRequest}
                    disabled={isProcessingRequest || !userRequest.trim()}
                    className="px-4 py-3 bg-[var(--ci-accent)] text-white rounded-xl font-medium hover:bg-[var(--ci-accent-strong)] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessingRequest ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => { setShowChatInput(false); setUserRequest(''); setRequestResult(null); }}
                    className="px-3 py-3 bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl text-slate-500 hover:text-[var(--ci-accent)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {requestResult && (
                  <div className={`rounded-xl border px-4 py-3 text-sm ${
                    requestResult.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      {requestResult.success ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{requestResult.message}</div>
                        {requestResult.success && requestResult.targetingSpec?.version ? (
                          <div className="mt-1 text-xs text-emerald-700">TargetingSpec v{requestResult.targetingSpec.version} 已生成，后续自动匹配会按这版画像执行。</div>
                        ) : null}
                      </div>
                      <button
                        onClick={() => setRequestResult(null)}
                        className={`rounded-lg p-1 transition-colors ${
                          requestResult.success
                            ? 'text-emerald-700/60 hover:bg-emerald-100 hover:text-emerald-800'
                            : 'text-red-700/60 hover:bg-red-100 hover:text-red-800'
                        }`}
                        aria-label="关闭画像校正结果"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {requestResult.success ? (
                      <>
                        <RefinementSummary refinement={requestResult.refinement} />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href="/customer/radar/search"
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ci-accent)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--ci-accent-strong)]"
                          >
                            按最新画像重新搜索
                            <ArrowRight size={14} />
                          </Link>
                          <Link
                            href="/customer/radar/targeting"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                          >
                            查看目标客户画像
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-slate-500">试试：</span>
                  {[
                    '美国汽车零部件工厂，有paint booth改造需求',
                    '欧洲家电企业，关注喷涂自动化和VOC合规',
                    '日本精密制造工厂，优先看机器人喷涂升级',
                  ].map(example => (
                    <button
                      key={example}
                      onClick={() => setUserRequest(example)}
                      className="px-2 py-1 text-xs bg-[#FFFFFF] border border-[var(--ci-border)] rounded text-slate-500 hover:text-[var(--ci-accent)] hover:border-[var(--ci-accent)]/50 transition-all"
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
            <div className="mt-8 bg-[#FFFFFF] rounded-xl border border-[var(--ci-border)] p-6">
              <h3 className="font-bold text-[#0B1B2B] mb-4">快速入门</h3>
              <div className="space-y-4">
                {steps.map((step: StepState, idx: number) => (
                  <Link
                    key={step.key}
                    href={step.href}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--ci-surface-muted)] transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.status === 'DONE' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : step.status === 'BLOCKED'
                          ? 'bg-red-50 text-red-400'
                          : idx + 1 === currentStep
                            ? 'bg-[var(--ci-accent)]/20 text-[var(--ci-accent)]'
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
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-[var(--ci-accent)] transition-colors" />
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
                    label="AI 高评分"
                    value={counts.candidatesQualifiedAB7d}
                    icon={<TrendingUp size={18} className="text-emerald-500" />}
                    href="/customer/radar/candidates?tier=A,B"
                    highlight={counts.candidatesQualifiedAB7d > 0}
                  />
                </div>
                <div className="animate-slide-up-delay-2">
                  <StatCard
                    label="新发现"
                    value={counts.pendingReviewCount}
                    icon={<FileSearch size={18} className="text-amber-500" />}
                    href="/customer/radar/candidates?status=NEW"
                    highlight={counts.pendingReviewCount > 0}
                  />
                </div>
                <div className="animate-slide-up-delay-3">
                  <StatCard
                    label="已跟进"
                    value={counts.candidatesImported7d}
                    icon={<CheckCircle2 size={18} className="text-[var(--ci-accent)]" />}
                    href="/customer/radar/prospects"
                  />
                </div>
              </div>

              {/* Module Quick Access */}
              <div className="bg-[#FFFFFF] rounded-xl border border-[var(--ci-border)] p-5">
                <h3 className="font-bold text-[#0B1B2B] mb-4">快捷入口</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {radarModules.map((mod) => {
                    const badge = getModuleBadge(mod.badge);
                    return (
                      <Link
                        key={mod.label}
                        href={mod.href}
                        className="relative p-4 rounded-xl border border-[var(--ci-border)] hover:border-[var(--ci-accent)]/50 hover:shadow-md transition-all group bg-[#FFFFFF]"
                      >
                        {badge && (
                          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {badge}
                          </span>
                        )}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 bg-[var(--ci-surface-muted)] rounded-lg flex items-center justify-center group-hover:bg-[var(--ci-accent)]/10 transition-colors">
                            <mod.icon size={18} className="text-[var(--ci-accent)]" />
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
              <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6 shadow-[var(--ci-shadow-soft)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Radar size={20} className="text-[var(--ci-accent)]" />
                      <span className="text-xs text-slate-500">当前步骤</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0B1B2B] mb-1">
                      {steps[currentStep - 1]?.label || '获客雷达'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {steps[currentStep - 1]?.blocker || '系统正常运行中'}
                    </p>
                  </div>
                  
                  <Link
                    href={primaryCTA.href}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                      primaryCTA.disabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-[var(--ci-accent)] text-white hover:bg-[var(--ci-accent-strong)]'
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
                              ? 'bg-[var(--ci-accent)]'
                              : 'bg-slate-200'
                      }`} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>目标客户画像</span>
                  <span>自动搜索</span>
                  <span>AI 推荐</span>
                  <span>线索库</span>
                  <span>采购机会</span>
                </div>
              </div>

              {/* Scan Status Summary */}
              {counts.lastScanAt && (
                <div className="bg-[#FFFFFF] rounded-xl border border-[var(--ci-border)] p-4">
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
                        className="text-[var(--ci-accent)] hover:underline"
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
              <div className="bg-[#FFFFFF] rounded-xl border border-[var(--ci-border)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--ci-border)] bg-[var(--ci-surface-strong)]">
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
                          <CheckCircle2 size={14} className="text-[var(--ci-accent)]" />
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

function RefinementSummary({ refinement }: { refinement?: RefinementPayload }) {
  const groups = [
    { label: '目标市场', values: refinement?.targetCountries },
    { label: '目标行业', values: refinement?.targetIndustries },
    { label: '需求关键词', values: refinement?.keywords },
    { label: '排除对象', values: refinement?.negativeKeywords },
    { label: '应用场景', values: refinement?.useCases },
    { label: '购买触发器', values: refinement?.triggers },
  ]
    .map((group) => ({ ...group, values: normalizePreviewValues(group.values) }))
    .filter((group) => group.values.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.label} className="rounded-xl border border-emerald-200 bg-[#FFFFFF] px-3 py-3">
          <div className="text-[11px] font-semibold text-emerald-700">{group.label}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.values.slice(0, 8).map((value) => (
              <span key={value} className="max-w-full rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] leading-4 text-emerald-800">
                {value}
              </span>
            ))}
            {group.values.length > 8 ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] leading-4 text-emerald-700">
                +{group.values.length - 8}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizePreviewValues(values?: string[]) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
