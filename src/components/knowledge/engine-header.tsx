"use client";

/**
 * 知识引擎顶部条 - 统一显示在所有知识引擎子页面
 *
 * 包含：
 * - 左：页面标题 + 说明
 * - 中：5步 Stepper（进度指示器）
 * - 右：主 CTA 按钮 + 最近同步时间
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, Sparkles, CheckCircle2, AlertCircle,
  ChevronRight, Clock, Loader2, BookOpen, ArrowRight,
} from 'lucide-react';
import type { StepState, StepStatus, PipelineCounts } from '@/lib/knowledge/pipeline';

// ============================================
// 类型定义
// ============================================

interface EngineHeaderProps {
  title: string;
  description: string;
  steps: StepState[];
  counts: PipelineCounts;
  currentStep: number;
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
  currentStep,
}: {
  steps: StepState[];
  currentStep: number;
}) {
  const router = useRouter();

  const getStepIcon = (status: StepStatus, isCurrentStep: boolean) => {
    if (status === 'DONE') {
      return <CheckCircle2 size={14} style={{ color: '#22C55E' }} />;
    }
    if (status === 'BLOCKED') {
      return <AlertCircle size={14} style={{ color: '#EF4444' }} />;
    }
    if (isCurrentStep) {
      return (
        <div
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(212,175,55,0.2)',
            border: '1.5px solid #D4AF37',
            boxShadow: '0 0 6px rgba(212,175,55,0.4)',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
        </div>
      );
    }
    return (
      <div
        className="w-3.5 h-3.5 rounded-full"
        style={{ border: '1.5px solid rgba(255,255,255,0.2)' }}
      />
    );
  };

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, idx) => {
        const isCurrentStep = idx + 1 === currentStep;
        const isDone = step.status === 'DONE';
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => router.push(step.href)}
              className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
              style={
                isCurrentStep
                  ? {
                      background: 'rgba(212,175,55,0.1)',
                      border: '1px solid rgba(212,175,55,0.2)',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid transparent',
                    }
              }
              title={step.blocker || step.label}
            >
              {getStepIcon(step.status, isCurrentStep)}
              <span
                className="text-[11px] whitespace-nowrap font-medium transition-colors"
                style={{
                  color: isDone
                    ? '#22C55E'
                    : step.status === 'BLOCKED'
                    ? '#EF4444'
                    : isCurrentStep
                    ? '#D4AF37'
                    : 'rgba(255,255,255,0.35)',
                }}
              >
                {step.label}
              </span>
            </button>

            {!isLast && (
              <ChevronRight
                size={11}
                style={{ color: 'rgba(255,255,255,0.15)', margin: '0 1px' }}
              />
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
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const processingHint =
    counts.assetsProcessing > 0
      ? `${counts.assetsProcessing} 个文件处理中`
      : null;

  return (
    <div
      className="px-5 py-3 sticky top-0 z-10"
      style={{
        background: 'rgba(11,18,32,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 4px 20px -4px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Description */}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: '#D4AF37' }} />
            <h1 className="text-[15px] font-bold text-white">{title}</h1>
          </div>
          <p className="text-[11px] ml-[26px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {description}
          </p>
        </div>

        {/* Center: Stepper */}
        <div className="flex-1 flex justify-center">
          <PipelineStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Right: CTA + Meta */}
        <div className="shrink-0 flex items-center gap-2.5 max-w-[40%] min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Processing Indicator */}
            {processingHint && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}
              >
                <Loader2 size={11} className="animate-spin shrink-0" />
                <span className="truncate">{processingHint}</span>
              </div>
            )}

            {/* Last Sync Time */}
            <div
              className="flex items-center gap-1 text-[10px] whitespace-nowrap"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              <Clock size={10} className="shrink-0" />
              <span className="truncate">{formatDate(counts.lastUpdatedAt)}</span>
            </div>
          </div>

          {/* Primary CTA */}
          {primaryAction && (
            <div className="relative shrink-0">
              {primaryAction.href ? (
                <Link
                  href={primaryAction.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                  style={
                    primaryAction.disabled
                      ? {
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.25)',
                          cursor: 'not-allowed',
                          pointerEvents: 'none',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }
                      : {
                          background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)',
                          color: '#0B1220',
                          boxShadow: '0 2px 12px -2px rgba(212,175,55,0.4)',
                          border: '1px solid rgba(212,175,55,0.3)',
                        }
                  }
                >
                  <Upload size={15} className="shrink-0" />
                  <span className="truncate">{primaryAction.label}</span>
                </Link>
              ) : (
                <button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
                  style={
                    primaryAction.disabled
                      ? {
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.25)',
                          cursor: 'not-allowed',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }
                      : {
                          background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)',
                          color: '#0B1220',
                          boxShadow: '0 2px 12px -2px rgba(212,175,55,0.4)',
                          border: '1px solid rgba(212,175,55,0.3)',
                        }
                  }
                >
                  {primaryAction.loading ? (
                    <Loader2 size={15} className="animate-spin shrink-0" />
                  ) : (
                    <Sparkles size={15} className="shrink-0" />
                  )}
                  <span className="truncate">{primaryAction.label}</span>
                </button>
              )}

              {/* Hint Tooltip */}
              {primaryAction.hint && !primaryAction.disabled && (
                <div
                  className="absolute top-full mt-1.5 right-0 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap z-20"
                  style={{
                    background: '#0F1728',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
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
// 下一步引导 Banner
// ============================================

/**
 * 在当前步骤完成后，在页面底部渲染"继续下一步"引导条
 * 由各页面自行在内容末尾渲染
 */
export function NextStepBanner({
  steps,
  currentStep,
}: {
  steps: StepState[];
  currentStep: number;
}) {
  const currentStepData = steps[currentStep - 1];
  const nextStepData = steps[currentStep]; // currentStep 是 1-based，steps 是 0-based，所以 steps[currentStep] 就是下一步

  // 当前步骤未完成或没有下一步，不显示
  if (!currentStepData || currentStepData.status !== 'DONE' || !nextStepData) return null;

  return (
    <div
      className="mx-5 mb-5 px-5 py-4 rounded-2xl flex items-center justify-between"
      style={{
        background: 'rgba(212,175,55,0.04)',
        border: '1px solid rgba(212,175,55,0.15)',
      }}
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 size={18} style={{ color: '#22C55E' }} />
        <div>
          <p className="text-sm font-semibold text-[#0B1220]">
            当前步骤已完成：{currentStepData.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>
            下一步：{nextStepData.label}
          </p>
        </div>
      </div>
      <Link
        href={nextStepData.href}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)',
          color: '#0B1220',
          boxShadow: '0 2px 12px -2px rgba(212,175,55,0.4)',
        }}
      >
        继续下一步
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

// ============================================
// 空态引导组件
// ============================================

interface EmptyStateGuideProps {
  currentStep: number;
  steps: StepState[];
  blocker?: string;
}

export function EmptyStateGuide({ currentStep, steps, blocker }: EmptyStateGuideProps) {
  const currentStepData = steps[currentStep - 1];
  const nextStepData = steps[currentStep] || null;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 0 24px rgba(212,175,55,0.1)',
        }}
      >
        <AlertCircle size={28} style={{ color: '#D4AF37' }} />
      </div>

      <h3 className="text-lg font-bold mb-2" style={{ color: '#0B1B2B' }}>
        当前处于第 {currentStep} 步：{currentStepData?.label}
      </h3>

      {blocker ? (
        <p className="text-sm mb-5" style={{ color: '#EF4444' }}>{blocker}</p>
      ) : (
        <p className="text-sm mb-5" style={{ color: 'rgba(0,0,0,0.45)' }}>
          完成此步骤后，可以继续{nextStepData?.label || '下一步'}
        </p>
      )}

      {currentStepData && (
        <Link
          href={currentStepData.href}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)',
            color: '#0B1220',
            boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)',
          }}
        >
          {currentStep === 1 ? <Upload size={15} /> : <Sparkles size={15} />}
          {currentStep === 1 ? '上传资料' : `去${currentStepData.label}`}
        </Link>
      )}
    </div>
  );
}
