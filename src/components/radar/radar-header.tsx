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
  title: string;
  description: string;
  steps: StepState[];
  counts: RadarPipelineCounts;
  currentStep: number;
  primaryCTA?: PrimaryCTA;
  errors?: string[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

// ============================================
// Stepper 组件
// ============================================

function RadarStepper({
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

  const hasErrors = errors.length > 0;

  const pendingHint =
    counts.pendingReviewCount > 0
      ? `${counts.pendingReviewCount} 个待审核`
      : counts.candidatesEnriching > 0
      ? `${counts.candidatesEnriching} 个补全中`
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
            <Radar size={18} style={{ color: '#D4AF37' }} />
            <h1 className="text-[15px] font-bold text-white">{title}</h1>
          </div>
          <p className="text-[11px] ml-[26px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {description}
          </p>
        </div>

        {/* Center: Stepper */}
        <div className="flex-1 flex justify-center">
          <RadarStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Right: CTA + Meta */}
        <div className="shrink-0 flex items-center gap-2.5">
          {/* Error Indicator */}
          {hasErrors && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] cursor-help"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
              title={errors[0]}
            >
              <AlertTriangle size={11} />
              扫描异常
            </div>
          )}

          {/* Pending Indicator */}
          {pendingHint && !hasErrors && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
              style={{
                background: 'rgba(245,158,11,0.1)',
                color: '#F59E0B',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <Loader2 size={11} className="animate-spin" />
              {pendingHint}
            </div>
          )}

          {/* Last Scan Time + Refresh */}
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 text-[10px]"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              <Clock size={10} />
              <span>{formatDate(counts.lastScanAt)}</span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1 rounded transition-all disabled:opacity-40"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                title="刷新状态"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#D4AF37')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {/* Primary CTA */}
          {primaryCTA && (
            <div className="relative">
              <Link
                href={primaryCTA.href}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                style={
                  primaryCTA.disabled
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
                onClick={(e) => primaryCTA.disabled && e.preventDefault()}
              >
                <Sparkles size={14} />
                {primaryCTA.label}
              </Link>

              {primaryCTA.disabled && primaryCTA.disabledReason && (
                <div
                  className="absolute top-full mt-1.5 right-0 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap z-20"
                  style={{
                    background: '#0F1728',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
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
  const inner = (
    <div
      className="p-4 rounded-xl transition-all group cursor-default"
      style={
        highlight
          ? {
              background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%)',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 2px 16px -4px rgba(212,175,55,0.1)',
            }
          : {
              background: '#FFFCF7',
              border: '1px solid #E8E0D0',
            }
      }
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = highlight ? 'rgba(212,175,55,0.5)' : '#D4AF37';
        el.style.boxShadow = '0 4px 20px -4px rgba(212,175,55,0.2)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = highlight ? 'rgba(212,175,55,0.25)' : '#E8E0D0';
        el.style.boxShadow = highlight ? '0 2px 16px -4px rgba(212,175,55,0.1)' : '';
        el.style.transform = '';
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-lg"
          style={
            highlight
              ? { background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }
              : { background: '#F7F3E8', border: '1px solid #E8E0D0' }
          }
        >
          {icon}
        </div>
        {trend && trendValue && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={
              trend === 'up'
                ? { background: 'rgba(34,197,94,0.1)', color: '#22C55E' }
                : trend === 'down'
                ? { background: 'rgba(239,68,68,0.1)', color: '#EF4444' }
                : { background: 'rgba(255,255,255,0.1)', color: 'rgba(0,0,0,0.4)' }
            }
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
          </span>
        )}
      </div>
      <div
        className="text-2xl font-bold mb-0.5 font-tabular"
        style={{ color: highlight ? '#D4AF37' : '#0B1B2B' }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: 'rgba(0,0,0,0.45)' }}>
        {label}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ============================================
// 空态引导组件
// ============================================

interface RadarEmptyGuideProps {
  currentStep: number;
  steps: StepState[];
  primaryCTA?: PrimaryCTA;
}

export function RadarEmptyGuide({ currentStep, steps, primaryCTA }: RadarEmptyGuideProps) {
  const currentStepData = steps[currentStep - 1];
  const nextStepData = steps[currentStep] || null;

  const getGuideIcon = () => {
    switch (currentStep) {
      case 1: return <Radar size={28} style={{ color: '#D4AF37' }} />;
      case 2: return <Sparkles size={28} style={{ color: '#D4AF37' }} />;
      default: return <AlertCircle size={28} style={{ color: '#D4AF37' }} />;
    }
  };

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
        {getGuideIcon()}
      </div>

      <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">
        当前处于第 {currentStep} 步：{currentStepData?.label}
      </h3>

      {currentStepData?.blocker ? (
        <p className="text-sm mb-5" style={{ color: '#EF4444' }}>
          {currentStepData.blocker}
        </p>
      ) : (
        <p className="text-sm mb-5" style={{ color: 'rgba(0,0,0,0.45)' }}>
          完成此步骤后，可以继续{nextStepData?.label || '下一步'}
        </p>
      )}

      {primaryCTA && (
        <Link
          href={primaryCTA.href}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={
            primaryCTA.disabled
              ? {
                  background: 'rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.3)',
                  cursor: 'not-allowed',
                  pointerEvents: 'none',
                }
              : {
                  background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)',
                  color: '#0B1220',
                  boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)',
                }
          }
          onClick={(e) => primaryCTA.disabled && e.preventDefault()}
        >
          <Sparkles size={15} />
          {primaryCTA.label}
        </Link>
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

  if (errors.length > 0) {
    items.push({
      type: 'warning',
      title: '扫描异常',
      description: errors[0],
    });
  }

  if (counts.pendingReviewCount > 0) {
    items.push({
      type: 'action',
      title: `${counts.pendingReviewCount} 个候选待审核`,
      description: '新发现的潜在客户等待您的分层判断',
      href: '/customer/radar/candidates?status=NEW',
    });
  }

  if (counts.candidatesQualifiedAB7d > 0) {
    items.push({
      type: 'info',
      title: `${counts.candidatesQualifiedAB7d} 个高质量候选`,
      description: '过去7天已识别的 A/B 级潜在客户',
      href: '/customer/radar/candidates?tier=A,B',
    });
  }

  if (!counts.targetingSpecFresh && counts.targetingSpecExists) {
    items.push({
      type: 'warning',
      title: '画像需要更新',
      description: '买家画像已超过30天未同步',
      href: '/customer/knowledge/profiles',
    });
  }

  if (items.length === 0) {
    items.push({
      type: 'info',
      title: '一切正常',
      description: '雷达系统运行顺畅，持续为您发现商机',
    });
  }

  const getTypeStyle = (type: 'warning' | 'info' | 'action') => {
    if (type === 'warning') return { dot: '#F59E0B', icon: 'text-amber-500' };
    if (type === 'action') return { dot: '#D4AF37', icon: 'text-[#D4AF37]' };
    return { dot: '#22C55E', icon: 'text-emerald-500' };
  };

  return (
    <div className="module-card overflow-hidden">
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: 'rgba(212,175,55,0.04)',
          borderBottom: '1px solid #E8E0D0',
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
        <h3 className="text-[13px] font-semibold" style={{ color: '#0B1B2B' }}>
          秘书提醒
        </h3>
        <span
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}
        >
          {items.length} 条
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: '#E8E0D0' }}>
        {items.map((item, idx) => {
          const style = getTypeStyle(item.type);
          const inner = (
            <div className="flex items-start gap-2.5 p-3.5 group transition-colors hover:bg-[#F7F3E8]">
              <div
                className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{ background: style.dot }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-medium transition-colors"
                  style={{ color: '#0B1B2B' }}
                >
                  {item.title}
                </div>
                <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'rgba(0,0,0,0.45)' }}>
                  {item.description}
                </div>
              </div>
              {item.href && (
                <ChevronRight
                  size={13}
                  className="mt-0.5 shrink-0 transition-colors group-hover:text-[#D4AF37]"
                  style={{ color: 'rgba(0,0,0,0.2)' }}
                />
              )}
            </div>
          );

          return item.href ? (
            <Link key={idx} href={item.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={idx}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
