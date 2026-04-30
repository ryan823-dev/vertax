"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Radar,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  PrimaryCTA,
  RadarPipelineCounts,
  StepState,
  StepStatus,
} from "@/lib/radar/pipeline";

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

function formatRelativeTime(date: Date | null) {
  if (!date) return "暂无记录";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(date).toLocaleDateString("zh-CN");
}

function getStatusTone(status: StepStatus) {
  if (status === "DONE") return "text-emerald-600";
  if (status === "BLOCKED") return "text-red-500";
  return "text-[var(--ci-accent)]";
}

function getStepBadge(status: StepStatus, isCurrent: boolean) {
  if (status === "DONE") {
    return <CheckCircle2 size={14} className="text-emerald-500" />;
  }

  if (status === "BLOCKED") {
    return <AlertCircle size={14} className="text-red-500" />;
  }

  return (
    <span
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
        isCurrent ? "border-[var(--ci-accent)] bg-[var(--ci-accent)]/15" : "border-slate-300 bg-transparent"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "bg-[var(--ci-accent)]" : "bg-slate-300"}`} />
    </span>
  );
}

function RadarStepper({
  steps,
  currentStep,
}: {
  steps: StepState[];
  currentStep: number;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="radar-stepper">
      {steps.map((step, idx) => {
        const isCurrent = idx + 1 === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(step.href)}
              title={step.blocker || step.label}
              className={`group flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left transition-all ${
                isCurrent
                  ? "border-[var(--ci-accent)]/30 bg-[var(--ci-surface-strong)] shadow-[0_8px_18px_-14px_rgba(79,141,246,0.8)]"
                  : "border-transparent bg-white/0 hover:border-[var(--ci-border)] hover:bg-white/60"
              }`}
            >
              {getStepBadge(step.status, isCurrent)}
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${getStatusTone(step.status)} ${
                  isCurrent ? "font-semibold" : ""
                }`}
              >
                {step.label}
              </span>
            </button>

            {!isLast && <ChevronRight size={12} className="flex-none text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

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
  const hasErrors = errors.length > 0;
  // 系统主动处理中（enriching）→ 旋转动画；新发现 → 静态提示
  const isEnriching = counts.candidatesEnriching > 0;
  const pendingHint =
    counts.pendingReviewCount > 0
      ? `${counts.pendingReviewCount} 新发现`
      : isEnriching
        ? `${counts.candidatesEnriching} 正在补全`
        : null;

  return (
    <div className="sticky top-0 z-20 px-0 pt-0">
      <div className="rounded-xl border border-[var(--ci-border)] bg-white/85 px-4 py-4 shadow-[var(--ci-shadow-soft)] backdrop-blur-md sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ci-surface-muted)] text-[var(--ci-accent)] ring-1 ring-[var(--ci-accent)]/15">
                <Radar size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ci-accent-strong)]">
                  获客雷达
                </div>
                <h1 className="truncate text-[18px] font-bold tracking-tight text-[#0B1B2B] sm:text-[20px]">
                  {title}
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <MiniStat label="新发现" value={counts.pendingReviewCount} tone={counts.pendingReviewCount > 0 ? "warning" : "neutral"} />
              <MiniStat label="AI 高评分" value={counts.candidatesQualifiedAB7d} tone={counts.candidatesQualifiedAB7d > 0 ? "success" : "neutral"} />
              <MiniStat label="已跟进" value={counts.prospectCompanyCount} tone="neutral" />
              <MiniStat label="最后扫描" value={formatRelativeTime(counts.lastScanAt)} tone="neutral" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 xl:w-[460px]">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {hasErrors && (
                <StatusChip
                  tone="danger"
                  icon={<AlertTriangle size={12} />}
                  label="扫描异常"
                  hint={errors[0]}
                />
              )}

              {!hasErrors && pendingHint && (
                <StatusChip
                  tone="warning"
                  icon={isEnriching ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                  label={pendingHint}
                />
              )}

              <StatusChip
                tone="neutral"
                icon={<Clock size={12} />}
                label={formatRelativeTime(counts.lastScanAt)}
              />

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-border)] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[var(--ci-accent)]/35 hover:text-[var(--ci-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
                  刷新
                </button>
              )}
            </div>

            <div className="flex justify-end">
              {primaryCTA && (
                <Link
                  href={primaryCTA.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    primaryCTA.disabled
                      ? "pointer-events-none cursor-not-allowed border border-[var(--ci-border)] bg-slate-100 text-slate-400"
                      : "border border-[var(--ci-accent)]/30 bg-[var(--ci-accent)] text-white shadow-[0_12px_24px_-16px_rgba(79,141,246,0.9)]"
                  }`}
                  onClick={(event) => primaryCTA.disabled && event.preventDefault()}
                  aria-disabled={primaryCTA.disabled}
                >
                  <Sparkles size={14} />
                  <span>{primaryCTA.label}</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] px-3 py-2">
          <RadarStepper steps={steps} currentStep={currentStep} />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  trend?: "up" | "down" | "neutral";
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
    <div
      className={`group h-full rounded-xl border p-4 transition-all duration-200 ${
        highlight
          ? "border-[var(--ci-accent)]/30 bg-[var(--ci-surface-strong)] shadow-[0_14px_32px_-24px_rgba(79,141,246,0.8)]"
          : "border-[var(--ci-border)] bg-white hover:border-[var(--ci-accent)]/30 "
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${
            highlight ? "bg-[var(--ci-accent)]/12 text-[var(--ci-accent-strong)] ring-[var(--ci-accent)]/10" : "bg-[var(--ci-surface-muted)] text-slate-500 ring-[var(--ci-border)]"
          }`}
        >
          {icon}
        </div>
        {trend && trendValue && (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-600"
                : trend === "down"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {trendValue}
          </span>
        )}
      </div>

      <div className={`text-2xl font-bold tracking-tight ${highlight ? "text-[var(--ci-accent-strong)]" : "text-[#0B1B2B]"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

interface RadarEmptyGuideProps {
  currentStep: number;
  steps: StepState[];
  primaryCTA?: PrimaryCTA;
}

export function RadarEmptyGuide({ currentStep, steps, primaryCTA }: RadarEmptyGuideProps) {
  const currentStepData = steps[currentStep - 1];
  const nextStepData = steps[currentStep] || null;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ci-border)] bg-white/80 px-6 py-14 text-center shadow-[var(--ci-shadow-soft)]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--ci-surface-strong)] text-[var(--ci-accent)] ring-1 ring-[var(--ci-accent)]/10">
        {currentStep === 1 ? <Radar size={28} /> : currentStep === 2 ? <Sparkles size={28} /> : <AlertCircle size={28} />}
      </div>

      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ci-accent-strong)]">
        当前处于第 {currentStep} 步
      </div>
      <h3 className="mt-2 text-lg font-bold text-[#0B1B2B]">
        {currentStepData?.label}
      </h3>

      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {currentStepData?.blocker || `完成这一环节后，系统会继续推进到 ${nextStepData?.label || "下一步"}`}
      </p>

      {primaryCTA && (
        <Link
          href={primaryCTA.href}
          className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
            primaryCTA.disabled
              ? "pointer-events-none cursor-not-allowed bg-slate-100 text-slate-400"
              : "bg-[var(--ci-accent)] text-white shadow-[0_12px_24px_-16px_rgba(79,141,246,0.75)] hover:bg-[var(--ci-accent-strong)]"
          }`}
          onClick={(event) => primaryCTA.disabled && event.preventDefault()}
        >
          <Sparkles size={15} />
          {primaryCTA.label}
        </Link>
      )}
    </div>
  );
}

interface SecretaryPanelProps {
  counts: RadarPipelineCounts;
  errors: string[];
}

export function SecretaryPanel({ counts, errors }: SecretaryPanelProps) {
  const items: Array<{
    type: "warning" | "info" | "action";
    title: string;
    description: string;
    href?: string;
  }> = [];

  if (errors.length > 0) {
    items.push({
      type: "warning",
      title: "扫描异常",
      description: errors[0],
    });
  }

  if (counts.pendingReviewCount > 0) {
    items.push({
      type: "action",
      title: `${counts.pendingReviewCount} 个新发现的潜在客户`,
      description: "系统刚刚发现的新匹配公司，AI 正在评估中。",
      href: "/customer/radar/candidates?status=NEW",
    });
  }

  if (counts.candidatesQualifiedAB7d > 0) {
    items.push({
      type: "info",
      title: `${counts.candidatesQualifiedAB7d} 个 AI 推荐客户`,
      description: "过去 7 天 AI 评为 A/B 的高匹配目标，建议优先跟进。",
      href: "/customer/radar/candidates?tier=A,B",
    });
  }

  if (!counts.targetingSpecFresh && counts.targetingSpecExists) {
    items.push({
      type: "warning",
      title: "画像需要更新",
      description: "目标客户画像已经超过 30 天未同步，建议先刷新知识引擎。",
      href: "/customer/knowledge/profiles",
    });
  }

  if (items.length === 0) {
    items.push({
      type: "info",
      title: "一切正常",
      description: "雷达系统正在稳定运行，持续为你积累新的目标客户。",
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--ci-border)] bg-white/90 shadow-[var(--ci-shadow-soft)]">
      <div className="flex items-center gap-2 border-b border-[var(--ci-border)] bg-[#FFFFFF] px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-[var(--ci-accent)] animate-pulse" />
        <h3 className="text-sm font-semibold text-[#0B1B2B]">秘书提醒</h3>
        <span className="ml-auto rounded-full bg-[var(--ci-surface-strong)] px-2.5 py-1 text-[10px] font-medium text-[var(--ci-accent-strong)]">
          {items.length} 条
        </span>
      </div>

      <div className="divide-y divide-[var(--ci-border)]">
        {items.map((item, index) => {
          const tone =
            item.type === "warning"
              ? "text-amber-500"
              : item.type === "action"
                ? "text-[var(--ci-accent)]"
                : "text-emerald-500";

          const card = (
            <div className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-[#FFFFFF]">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${tone.replace("text-", "bg-")}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#0B1B2B]">{item.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
              </div>
              {item.href && <ChevronRight size={13} className="mt-1 text-slate-300 group-hover:text-[var(--ci-accent)]" />}
            </div>
          );

          return item.href ? (
            <Link key={index} href={item.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={index}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-[var(--ci-border)] bg-[#FFFFFF] text-slate-600";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${toneClass}`}>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="font-semibold text-[#0B1B2B]">{value}</span>
    </div>
  );
}

function StatusChip({
  tone,
  icon,
  label,
  hint,
}: {
  tone: "neutral" | "warning" | "danger";
  icon: ReactNode;
  label: string;
  hint?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-600"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-[var(--ci-border)] bg-[#FFFFFF] text-slate-600";

  return (
    <div className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${toneClass}`}>
      <span className="flex-none">{icon}</span>
      <span className="max-w-[180px] truncate font-medium">{label}</span>
      {hint ? <span className="hidden text-[10px] text-slate-400 xl:inline">{hint}</span> : null}
    </div>
  );
}
