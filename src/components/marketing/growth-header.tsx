"use client";

/**
 * 增长系统顶部工作台
 *
 * 深蓝金设计系统：#0B1220 背景 · var(--ci-accent) 金色强调
 * 7步 Stepper + StatCard + SecretaryPanel
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Clock,
  RefreshCw,
  Layers,
  FileText,
  FileEdit,
  CheckSquare,
  Send,
  BarChart3,
  Globe,
  ArrowRight,
} from "lucide-react";
import type {
  StepState,
  GrowthPipelineCounts,
  PrimaryCTA,
} from "@/lib/marketing/growth-pipeline";

// ============================================
// 类型
// ============================================

interface GrowthHeaderProps {
  title: string;
  description: string;
  steps: StepState[];
  counts: GrowthPipelineCounts;
  currentStep: number;
  primaryCTA?: PrimaryCTA;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

// ============================================
// 步骤图标映射
// ============================================

const STEP_ICONS: Record<string, React.ElementType> = {
  topics: Layers,
  briefs: FileText,
  drafts: FileEdit,
  verify: CheckSquare,
  publish: Send,
  "seo-aeo": BarChart3,
  geo: Globe,
};

// ============================================
// 7-Step Stepper — 深蓝金版
// ============================================

function GrowthStepper({
  steps,
  currentStep,
}: {
  steps: StepState[];
  currentStep: number;
}) {
  const router = useRouter();

  const getNodeStyle = (
    step: StepState,
    isCurrent: boolean
  ): { bg: string; border: string; shadow?: string } => {
    if (step.status === "DONE")
      return {
        bg: "rgba(16,185,129,0.15)",
        border: "1px solid rgba(16,185,129,0.5)",
      };
    if (step.status === "BLOCKED")
      return {
        bg: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.4)",
      };
    if (isCurrent)
      return {
        bg: "rgba(79,141,246,0.15)",
        border: "1px solid rgba(79,141,246,0.6)",
        shadow: "0 0 12px rgba(79,141,246,0.25)",
      };
    return {
      bg: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
    };
  };

  const getIconColor = (step: StepState, isCurrent: boolean) => {
    if (step.status === "DONE") return "text-emerald-400";
    if (step.status === "BLOCKED") return "text-red-400";
    if (isCurrent) return "text-[var(--ci-accent)]";
    return "text-slate-500";
  };

  const getLabelColor = (step: StepState, isCurrent: boolean) => {
    if (step.status === "DONE") return "text-emerald-400";
    if (step.status === "BLOCKED") return "text-red-400";
    if (isCurrent) return "text-[var(--ci-accent)] font-semibold";
    return "text-slate-500";
  };

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, idx) => {
        const isCurrent = idx + 1 === currentStep;
        const isLast = idx === steps.length - 1;
        const Icon = STEP_ICONS[step.key] || Circle;
        const nodeStyle = getNodeStyle(step, isCurrent);

        return (
          <div key={step.key} className="flex items-center">
            {/* Step node */}
            <button
              onClick={() => router.push(step.href)}
              className="group flex flex-col items-center gap-1 px-1.5 py-1 rounded-lg transition-all hover:scale-105"
              title={step.blocker || step.label}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: nodeStyle.bg,
                  border: nodeStyle.border,
                  boxShadow: nodeStyle.shadow,
                }}
              >
                {step.status === "DONE" ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : step.status === "BLOCKED" ? (
                  <AlertCircle size={14} className="text-red-400" />
                ) : (
                  <Icon size={14} className={getIconColor(step, isCurrent)} />
                )}
              </div>
              <span
                className={`text-[10px] whitespace-nowrap leading-none ${getLabelColor(step, isCurrent)}`}
              >
                {step.label}
              </span>
              {step.count !== undefined && step.count > 0 && (
                <span
                  className="text-[9px] px-1 py-0.5 rounded-sm leading-none"
                  style={{
                    background:
                      step.status === "DONE"
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(79,141,246,0.12)",
                    color:
                      step.status === "DONE" ? "#34d399" : "var(--ci-accent)",
                  }}
                >
                  {step.count}
                </span>
              )}
            </button>

            {/* Connector line */}
            {!isLast && (
              <div
                className="w-5 h-px mt-[-14px]"
                style={{
                  background:
                    step.status === "DONE"
                      ? "rgba(16,185,129,0.4)"
                      : "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 知识引擎完成度徽章
// ============================================

function KnowledgeIndicator({ counts }: { counts: GrowthPipelineCounts }) {
  const { knowledgeCompleteness } = counts;

  if (knowledgeCompleteness >= 100) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-emerald-400"
        style={{
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.3)",
        }}
      >
        <CheckCircle2 size={12} />
        知识引擎 100%
      </div>
    );
  }

  return (
    <Link
      href="/customer/knowledge"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-amber-400 hover:opacity-80 transition-opacity"
      style={{
        background: "rgba(245,158,11,0.1)",
        border: "1px solid rgba(245,158,11,0.3)",
      }}
      title={`企业档案: ${counts.hasCompanyProfile ? "✓" : "✗"} | 买家画像: ${counts.hasPersonas ? "✓" : "✗"} | 证据库: ${counts.hasEvidence ? "✓" : "✗"}`}
    >
      <AlertCircle size={12} />
      知识 {knowledgeCompleteness}%
    </Link>
  );
}

// ============================================
// 主组件
// ============================================

function formatDate(date: Date | null) {
  if (!date) return "暂无记录";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}m 前`;
  if (hours < 24) return `${hours}h 前`;
  if (days < 7) return `${days}d 前`;
  return new Date(date).toLocaleDateString("zh-CN");
}

export function GrowthHeader({
  title,
  description,
  steps,
  counts,
  currentStep,
  primaryCTA,
  isRefreshing = false,
  onRefresh,
}: GrowthHeaderProps) {

  return (
    <div
      className="sticky top-0 z-20 px-6 py-3 border-b border-[rgba(79,141,246,0.15)]"
      style={{
        background: "var(--ci-sidebar-shell)",
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.5)",
      }}
    >
      {/* Subtle gold glow top edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(79,141,246,0.4) 40%, rgba(79,141,246,0.4) 60%, transparent)",
          pointerEvents: "none",
        }}
      />

      <div className="flex items-center justify-between gap-4">
        {/* Left: Icon + Title */}
        <div className="shrink-0 flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(79,141,246,0.12)",
              border: "1px solid rgba(79,141,246,0.3)",
            }}
          >
            <TrendingUp size={16} className="text-[var(--ci-accent)]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">
              {title}
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
              {description}
            </p>
          </div>
        </div>

        {/* Center: 7-Step Stepper */}
        <div className="flex-1 flex justify-center overflow-hidden">
          <GrowthStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Right: Knowledge + time + refresh + CTA */}
        <div className="shrink-0 flex items-center gap-2 max-w-[40%] min-w-0">
          <div className="flex items-center gap-2">
            <KnowledgeIndicator counts={counts} />

            {/* Last update + refresh */}
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-600 whitespace-nowrap">
                <Clock size={10} className="shrink-0" />
                <span className="truncate">{formatDate(counts.lastUpdatedAt)}</span>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-40 shrink-0"
                  title="刷新状态"
                >
                  <RefreshCw
                    size={11}
                    className={`text-slate-500 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Primary CTA */}
          {primaryCTA && (
            <div className="relative shrink-0">
              <Link
                href={primaryCTA.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  primaryCTA.disabled
                    ? "bg-white/5 text-slate-500 cursor-not-allowed pointer-events-none"
                    : "text-white hover:opacity-90 "
                }`}
                style={
                  primaryCTA.disabled
                    ? {}
                    : {
                        background: "var(--ci-accent)",
                        boxShadow: "0 2px 12px -2px rgba(79,141,246,0.4)",
                      }
                }
                onClick={(e) => primaryCTA.disabled && e.preventDefault()}
              >
                <Sparkles size={13} className="shrink-0" />
                <span className="truncate">{primaryCTA.label}</span>
              </Link>
              {primaryCTA.disabled && primaryCTA.disabledReason && (
                <div
                  className="absolute top-full mt-1.5 right-0 px-2 py-1 rounded text-[10px] text-slate-400 whitespace-nowrap z-30"
                  style={{
                    background: "#0B1220",
                    border: "1px solid rgba(255,255,255,0.1)",
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
// StatCard — 深蓝金版
// ============================================

interface GrowthStatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  highlight?: boolean;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}

export function GrowthStatCard({
  label,
  value,
  icon,
  href,
  highlight = false,
  subValue,
}: GrowthStatCardProps) {
  const content = (
    <div
      className={`p-4 rounded-xl transition-all group ${
        href ? "cursor-pointer hover:scale-[1.01]" : ""
      }`}
      style={{
        background: highlight
          ? "var(--ci-sidebar-shell)"
          : "#FFFCF7",
        border: highlight
          ? "1px solid rgba(79,141,246,0.3)"
          : "1px solid #E8E0D0",
        boxShadow: highlight
          ? "0 4px 24px -4px rgba(0,0,0,0.3)"
          : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="p-2 rounded-lg"
          style={{
            background: highlight
              ? "rgba(79,141,246,0.12)"
              : "rgba(11,18,32,0.06)",
            border: highlight
              ? "1px solid rgba(79,141,246,0.25)"
              : "1px solid rgba(11,18,32,0.06)",
          }}
        >
          {icon}
        </div>
        {href && (
          <ArrowRight
            size={12}
            className={`transition-colors ${
              highlight
                ? "text-[var(--ci-accent)] opacity-40 group-hover:opacity-100"
                : "text-slate-300 group-hover:text-[var(--ci-accent)]"
            }`}
          />
        )}
      </div>
      <div
        className={`text-2xl font-bold mb-0.5 ${
          highlight ? "text-[var(--ci-accent)]" : "text-[#0B1B2B]"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-xs ${highlight ? "text-slate-400" : "text-slate-500"}`}
      >
        {label}
      </div>
      {subValue && (
        <div
          className={`text-[10px] mt-1 ${
            highlight ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {subValue}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ============================================
// SecretaryPanel — 深蓝金版待办栏
// ============================================

interface SecretaryPanelProps {
  counts: GrowthPipelineCounts;
}

export function GrowthSecretaryPanel({ counts }: SecretaryPanelProps) {
  type ItemType = "warning" | "info" | "action";
  const items: Array<{
    type: ItemType;
    title: string;
    description: string;
    href?: string;
  }> = [];

  if (counts.briefsDraft > 0)
    items.push({
      type: "action",
      title: `${counts.briefsDraft} 个简报待完善`,
      description: "草稿状态的简报需要补充信息",
      href: "/customer/marketing/briefs?status=draft",
    });

  if (counts.briefsReady > 0)
    items.push({
      type: "action",
      title: `${counts.briefsReady} 个简报可生成内容包`,
      description: "点击「一键生成」产出 SEO+GEO 四合一内容",
      href: "/customer/marketing/briefs?status=ready",
    });

  if (counts.draftsPending > 0)
    items.push({
      type: "info",
      title: `${counts.draftsPending} 个草稿待发布`,
      description: "完成审核后可创建发布包",
      href: "/customer/marketing/contents?status=draft",
    });

  if (counts.publishPacksPending > 0)
    items.push({
      type: "action",
      title: `${counts.publishPacksPending} 个发布包待审核`,
      description: "审核通过后可发布到目标渠道",
      href: "/customer/marketing/strategy",
    });

  if (counts.knowledgeCompleteness < 100)
    items.push({
      type: "warning",
      title: "知识引擎未完善",
      description: "完善知识引擎可提升内容质量",
      href: "/customer/knowledge",
    });

  if (items.length === 0)
    items.push({
      type: "info",
      title: "一切顺利",
      description: "内容增长流程运行正常",
    });

  const TYPE_CONFIG: Record<
    ItemType,
    { iconColor: string; Icon: React.ElementType; dotBg: string }
  > = {
    warning: {
      iconColor: "text-amber-400",
      Icon: AlertCircle,
      dotBg: "rgba(245,158,11,0.15)",
    },
    action: {
      iconColor: "text-[var(--ci-accent)]",
      Icon: Sparkles,
      dotBg: "rgba(79,141,246,0.12)",
    },
    info: {
      iconColor: "text-slate-400",
      Icon: CheckCircle2,
      dotBg: "rgba(255,255,255,0.06)",
    },
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background:
          "var(--ci-sidebar-shell)",
        border: "1px solid rgba(79,141,246,0.15)",
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.3)",
      }}
    >
      <div
        className="px-4 py-3 border-b border-[rgba(79,141,246,0.12)]"
        style={{ background: "rgba(79,141,246,0.04)" }}
      >
        <h3 className="text-xs font-semibold text-[var(--ci-accent)] uppercase tracking-wider">
          待办事项
        </h3>
      </div>
      <div className="divide-y divide-[rgba(255,255,255,0.06)]">
        {items.map((item, idx) => {
          const cfg = TYPE_CONFIG[item.type];
          const Icon = cfg.Icon;
          const inner = (
            <div className="flex items-start gap-3 p-3 group">
              <div
                className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: cfg.dotBg }}
              >
                <Icon size={12} className={cfg.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 group-hover:text-[var(--ci-accent)] transition-colors">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  {item.description}
                </div>
              </div>
              {item.href && (
                <ChevronRight
                  size={12}
                  className="text-slate-600 group-hover:text-[var(--ci-accent)] transition-colors mt-0.5 shrink-0"
                />
              )}
            </div>
          );
          return item.href ? (
            <Link key={idx} href={item.href}>
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
