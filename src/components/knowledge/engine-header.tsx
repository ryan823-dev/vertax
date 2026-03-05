"use client";

/**
 * 知识引擎顶部条 - 统一显示在所有知识引擎子页面
 * 
 * 包含：
 * - 左：页面标题 + 说明
 * - 中：5步 Stepper（进度指示器）
 * - 右：主 CTA 按钮 + 最近同步时间
 */

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Upload, Sparkles, CheckCircle2, Circle, AlertCircle, 
  ChevronRight, Clock, Loader2,
} from 'lucide-react';
import type { StepState, StepStatus, PipelineCounts } from '@/lib/knowledge/pipeline';

// ============================================
// 类型定义
// ============================================

interface EngineHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面说明 */
  description: string;
  /** 流水线步骤状态 */
  steps: StepState[];
  /** 计数数据 */
  counts: PipelineCounts;
  /** 当前步骤 (1-5) */
  currentStep: number;
  /** 主 CTA 配置 */
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
    loading?: boolean;
    hint?: string;
  };
}

// ============================================
// Stepper 组件
// ============================================

function PipelineStepper({ 
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

export function EngineHeader({
  title,
  description,
  steps,
  counts,
  currentStep,
  primaryAction,
}: EngineHeaderProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '暂无记录';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 计算处理中数量提示
  const processingHint = counts.assetsProcessing > 0 
    ? `${counts.assetsProcessing} 个文件处理中` 
    : null;

  return (
    <div className="module-header-bar px-5 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Description */}
        <div className="shrink-0">
          <h1 className="text-lg font-bold text-[#0B1B2B]">{title}</h1>
          <p className="text-xs text-slate-500">{description}</p>
        </div>

        {/* Center: Stepper */}
        <div className="flex-1 flex justify-center">
          <PipelineStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Right: CTA + Meta */}
        <div className="shrink-0 flex items-center gap-3">
          {/* Processing Indicator */}
          {processingHint && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px]">
              <Loader2 size={12} className="animate-spin" />
              {processingHint}
            </div>
          )}
          
          {/* Last Sync Time */}
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock size={10} />
            <span>{formatDate(counts.lastUpdatedAt)}</span>
          </div>

          {/* Primary CTA */}
          {primaryAction && (
            <div className="relative">
              {primaryAction.href ? (
                <Link
                  href={primaryAction.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    primaryAction.disabled
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[#0B1B2B] text-[#D4AF37] hover:bg-[#10263B] hover:shadow-lg hover:shadow-[#D4AF37]/10'
                  }`}
                >
                  <Upload size={16} />
                  {primaryAction.label}
                </Link>
              ) : (
                <button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    primaryAction.disabled
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[#0B1B2B] text-[#D4AF37] hover:bg-[#10263B] hover:shadow-lg hover:shadow-[#D4AF37]/10'
                  }`}
                >
                  {primaryAction.loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {primaryAction.label}
                </button>
              )}
              
              {/* Hint Tooltip */}
              {primaryAction.hint && !primaryAction.disabled && (
                <div className="absolute top-full mt-1 right-0 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] rounded whitespace-nowrap border border-amber-200">
                  {primaryAction.hint}
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
// 空态引导组件
// ============================================

interface EmptyStateGuideProps {
  /** 当前处于第几步 */
  currentStep: number;
  /** 步骤数据 */
  steps: StepState[];
  /** 当前步骤的阻塞信息 */
  blocker?: string;
}

export function EmptyStateGuide({ currentStep, steps, blocker }: EmptyStateGuideProps) {
  const currentStepData = steps[currentStep - 1];
  const nextStepData = steps[currentStep] || null;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F7F3EA] flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-[#D4AF37]" />
      </div>
      
      <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">
        当前处于第 {currentStep} 步：{currentStepData?.label}
      </h3>
      
      {blocker ? (
        <p className="text-sm text-red-500 mb-4">{blocker}</p>
      ) : (
        <p className="text-sm text-slate-500 mb-4">
          完成此步骤后，可以继续{nextStepData?.label || '下一步'}
        </p>
      )}

      {/* 引导步骤 */}
      <div className="flex items-center gap-3 mt-4">
        {currentStepData && (
          <Link
            href={currentStepData.href}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-[#D4AF37] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
          >
            {currentStep === 1 && <Upload size={16} />}
            {currentStep > 1 && <Sparkles size={16} />}
            {currentStep === 1 ? '上传资料' : `去${currentStepData.label}`}
          </Link>
        )}
      </div>
    </div>
  );
}
