"use client";

/**
 * 获客雷达顶部条 - 统一显示在所有雷达子页面
 * 
 * 包含：
 * - 左：页面标题 + 说明
 * - 中：5步 Stepper（进度指示器）
 * - 右：主 CTA 按钮 + 最近扫描时间 + 错误提示
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Radar, Sparkles, CheckCircle2, Circle, AlertCircle, 
  ChevronRight, Clock, Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import type { StepState, StepStatus, RadarPipelineCounts, PrimaryCTA } from '@/lib/radar/pipeline';

// ============================================
// 类型定义
// ============================================

interface RadarHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面说明 */
  description: string;
  /** 流水线步骤状态 */
  steps: StepState[];
  /** 计数数据 */
  counts: RadarPipelineCounts;
  /** 当前步骤 (1-5) */
  currentStep: number;
  /** 主 CTA 配置 */
  primaryCTA?: PrimaryCTA;
  /** 近期错误列表 */
  errors?: string[];
  /** 是否正在刷新 */
  isRefreshing?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
}

// ============================================
// Stepper 组件
// ============================================

function RadarStepper({ 
  steps, 
  currentStep 
}: { 
  steps: StepState[]; 
  currentStep: number;
}) {
  const router = useRouter();
  
  const getStepIcon = (status: StepStatus, isCurrentStep: boolean) => {
    if (status === 'DONE') {
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    }
    if (status === 'BLOCKED') {
      return <AlertCircle size={16} className="text-red-400" />;
    }
    if (isCurrentStep) {
      return <Circle size={16} className="text-[#D4AF37] fill-[#D4AF37]/20" />;
    }
    return <Circle size={16} className="text-slate-300" />;
  };

  const getStepTextColor = (status: StepStatus, isCurrentStep: boolean) => {
    if (status === 'DONE') return 'text-emerald-600';
    if (status === 'BLOCKED') return 'text-red-500';
    if (isCurrentStep) return 'text-[#D4AF37] font-medium';
    return 'text-slate-400';
  };

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const isCurrentStep = idx + 1 === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step */}
            <button
              onClick={() => router.push(step.href)}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:bg-[#F7F3EA] ${
                isCurrentStep ? 'bg-[#F7F3EA]' : ''
              }`}
              title={step.blocker || step.label}
            >
              {getStepIcon(step.status, isCurrentStep)}
              <span className={`text-[11px] whitespace-nowrap ${getStepTextColor(step.status, isCurrentStep)}`}>
                {step.label}
              </span>
            </button>
            
            {/* Connector */}
            {!isLast && (
              <ChevronRight size={12} className="text-slate-300 mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function RadarHeader({
  title,
  description,
  steps,
  counts,
  currentStep,
  primaryCTA,
  errors = [],
  isRefreshing = false,
  onRefresh,
}: RadarHeaderProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '暂无记录';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return new Date(date).toLocaleDateString('zh-CN');
  };

  // 是否有扫描错误
  const hasErrors = errors.length > 0;
  
  // 待处理提示
  const pendingHint = counts.pendingReviewCount > 0 
    ? `${counts.pendingReviewCount} 个待审核` 
    : counts.candidatesEnriching > 0
      ? `${counts.candidatesEnriching} 个补全中`
      : null;

  return (
    <div className="module-header-bar px-5 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Description */}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <Radar size={20} className="text-[#D4AF37]" />
            <h1 className="text-lg font-bold text-[#0B1B2B]">{title}</h1>
          </div>
          <p className="text-xs text-slate-500 ml-7">{description}</p>
        </div>

        {/* Center: Stepper */}
        <div className="flex-1 flex justify-center">
          <RadarStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Right: CTA + Meta */}
        <div className="shrink-0 flex items-center gap-3">
          {/* Error Indicator */}
          {hasErrors && (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] cursor-help"
              title={errors[0]}
            >
              <AlertTriangle size={12} />
              扫描异常
            </div>
          )}
          
          {/* Pending Indicator */}
          {pendingHint && !hasErrors && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px]">
              <Loader2 size={12} className="animate-spin" />
              {pendingHint}
            </div>
          )}
          
          {/* Last Scan Time + Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={10} />
              <span>{formatDate(counts.lastScanAt)}</span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                title="刷新状态"
              >
                <RefreshCw size={12} className={`text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Primary CTA */}
          {primaryCTA && (
            <div className="relative">
              <Link
                href={primaryCTA.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  primaryCTA.disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
                    : 'bg-[#0B1B2B] text-[#D4AF37] hover:bg-[#10263B] hover:shadow-lg hover:shadow-[#D4AF37]/10'
                }`}
                onClick={(e) => primaryCTA.disabled && e.preventDefault()}
              >
                <Sparkles size={16} />
                {primaryCTA.label}
              </Link>
              
              {/* Disabled Reason Tooltip */}
              {primaryCTA.disabled && primaryCTA.disabledReason && (
                <div className="absolute top-full mt-1 right-0 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] rounded whitespace-nowrap border border-slate-200">
                  {primaryCTA.disabledReason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 统计卡片组件（用于 Radar Home）
// ============================================

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  highlight?: boolean;
}

export function StatCard({ 
  label, 
  value, 
  icon, 
  href, 
  trend, 
  trendValue,
  highlight = false,
}: StatCardProps) {
  const content = (
    <div className={`p-4 rounded-xl border transition-all ${
      highlight 
        ? 'bg-[#F7F3E8] border-[#E8E0D0] hover:border-[#D4AF37]' 
        : 'bg-[#FFFCF7] border-[#E8E0D0] hover:border-[#D4AF37]/50'
    } ${href ? 'cursor-pointer hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-white' : 'bg-slate-50'}`}>
          {icon}
        </div>
        {trend && trendValue && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
            trend === 'down' ? 'bg-red-50 text-red-600' :
            'bg-slate-50 text-slate-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-[#0B1B2B] mb-0.5">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ============================================
// 空态引导组件
// ============================================

interface RadarEmptyGuideProps {
  /** 当前处于第几步 */
  currentStep: number;
  /** 步骤数据 */
  steps: StepState[];
  /** 主 CTA */
  primaryCTA?: PrimaryCTA;
}

export function RadarEmptyGuide({ currentStep, steps, primaryCTA }: RadarEmptyGuideProps) {
  const currentStepData = steps[currentStep - 1];
  const nextStepData = steps[currentStep] || null;

  // 不同步骤的引导图标
  const getGuideIcon = () => {
    switch (currentStep) {
      case 1: return <Radar size={28} className="text-[#D4AF37]" />;
      case 2: return <Sparkles size={28} className="text-[#D4AF37]" />;
      default: return <AlertCircle size={28} className="text-[#D4AF37]" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F7F3EA] flex items-center justify-center mb-4">
        {getGuideIcon()}
      </div>
      
      <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">
        当前处于第 {currentStep} 步：{currentStepData?.label}
      </h3>
      
      {currentStepData?.blocker ? (
        <p className="text-sm text-red-500 mb-4">{currentStepData.blocker}</p>
      ) : (
        <p className="text-sm text-slate-500 mb-4">
          完成此步骤后，可以继续{nextStepData?.label || '下一步'}
        </p>
      )}

      {/* 引导按钮 */}
      {primaryCTA && (
        <div className="flex items-center gap-3 mt-4">
          <Link
            href={primaryCTA.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              primaryCTA.disabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#0B1B2B] text-[#D4AF37] hover:bg-[#10263B]'
            }`}
          >
            <Sparkles size={16} />
            {primaryCTA.label}
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================
// 秘书提醒面板组件（用于 Radar Home 右侧）
// ============================================

interface SecretaryPanelProps {
  counts: RadarPipelineCounts;
  errors: string[];
}

export function SecretaryPanel({ counts, errors }: SecretaryPanelProps) {
  const items: Array<{
    type: 'warning' | 'info' | 'action';
    title: string;
    description: string;
    href?: string;
  }> = [];

  // 添加错误提醒
  if (errors.length > 0) {
    items.push({
      type: 'warning',
      title: '扫描异常',
      description: errors[0],
    });
  }

  // 待审核提醒
  if (counts.pendingReviewCount > 0) {
    items.push({
      type: 'action',
      title: `${counts.pendingReviewCount} 个候选待审核`,
      description: '新发现的潜在客户等待您的分层判断',
      href: '/c/radar/candidates?status=NEW',
    });
  }

  // 高质量候选提醒
  if (counts.candidatesQualifiedAB7d > 0) {
    items.push({
      type: 'info',
      title: `${counts.candidatesQualifiedAB7d} 个高质量候选`,
      description: '过去7天已识别的 A/B 级潜在客户',
      href: '/c/radar/candidates?tier=A,B',
    });
  }

  // 画像更新提醒
  if (!counts.targetingSpecFresh && counts.targetingSpecExists) {
    items.push({
      type: 'warning',
      title: '画像需要更新',
      description: '买家画像已超过30天未同步',
      href: '/c/knowledge/profiles',
    });
  }

  // 没有任何提醒
  if (items.length === 0) {
    items.push({
      type: 'info',
      title: '一切正常',
      description: '雷达系统运行顺畅，持续为您发现商机',
    });
  }

  return (
    <div className="module-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E8E0D0] bg-[#F7F3E8]">
        <h3 className="text-sm font-medium text-[#0B1B2B]">秘书提醒</h3>
      </div>
      <div className="divide-y divide-[#E8E0D0]">
        {items.map((item, idx) => (
          <div key={idx} className="p-3">
            {item.href ? (
              <Link href={item.href} className="block group">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${
                    item.type === 'warning' ? 'text-amber-500' :
                    item.type === 'action' ? 'text-blue-500' :
                    'text-slate-400'
                  }`}>
                    {item.type === 'warning' ? <AlertTriangle size={14} /> :
                     item.type === 'action' ? <Circle size={14} className="fill-current" /> :
                     <CheckCircle2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0B1B2B] group-hover:text-[#D4AF37] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-[#D4AF37] transition-colors mt-0.5" />
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 ${
                  item.type === 'warning' ? 'text-amber-500' :
                  item.type === 'action' ? 'text-blue-500' :
                  'text-slate-400'
                }`}>
                  {item.type === 'warning' ? <AlertTriangle size={14} /> :
                   item.type === 'action' ? <Circle size={14} className="fill-current" /> :
                   <CheckCircle2 size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0B1B2B]">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
