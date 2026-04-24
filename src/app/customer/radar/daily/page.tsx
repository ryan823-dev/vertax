"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock3,
  Globe,
  Loader2,
  Mail,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getDailySupplyMetrics,
  getRadarDailyWorkspace,
  type DailySupplyMetricsData,
  type DailyWorkspaceItem,
  type RadarDailyWorkspaceData,
} from "@/actions/radar-daily";

function formatRelativeLabel(isoDate: string | null) {
  if (!isoDate) return "未触达";

  const date = new Date(isoDate);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
}

function formatWorkspaceTime(isoDate: string) {
  return new Date(isoDate).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReadyTone(label: DailyWorkspaceItem["readyLabel"]) {
  if (label === "Hot") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (label === "Ready") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  testId,
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-3xl border border-[#E8E0D0] bg-[#FFFCF7] p-5 shadow-[0_18px_36px_-30px_rgba(11,27,43,0.35)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A7A1C]">{label}</p>
          <p data-testid={`${testId}-value`} className="mt-3 text-3xl font-bold text-[#0B1B2B]">{value}</p>
          <p data-testid={`${testId}-helper`} className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F3E8] text-[#9A7A1C]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function WorkspaceCard({
  item,
  bucketLabel,
}: {
  item: DailyWorkspaceItem;
  bucketLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-[#E8E0D0] bg-[#FFFCF7] p-5 shadow-[0_18px_36px_-30px_rgba(11,27,43,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[#0B1B2B]">{item.companyName}</h3>
            {item.tier && (
              <span className="rounded-full bg-[#F0EBD8] px-2 py-0.5 text-[11px] font-semibold text-[#9A7A1C]">
                Tier {item.tier}
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getReadyTone(item.readyLabel)}`}>
              {item.readyLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {item.country || "国家待补"} · {item.industry || "行业待补"} · {bucketLabel}
          </p>
        </div>
        <div className="rounded-2xl bg-[#0B1B2B] px-3 py-2 text-right text-white">
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Ready Score</div>
          <div className="text-xl font-semibold">{item.contactReadyScore}</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-[#F7F3E8] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A7A1C]">
            <Target size={13} />
            推荐切入点
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item.recommendedAngle}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E8E0D0] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">主联系人</p>
            {item.recommendedContact ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#0B1B2B]">
                    {item.recommendedContact.name}
                    {item.recommendedContact.role ? ` · ${item.recommendedContact.role}` : ""}
                  </p>
                  {!item.recommendedContact.isPersisted && (
                    <span className="rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#9A7A1C]">
                      导入快照
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={14} className="text-slate-400" />
                    <span>{item.recommendedContact.phone || "电话待补"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <span>{item.recommendedContact.email || "邮箱待补"}</span>
                  </div>
                </div>
                {item.recommendedContact.note && (
                  <p className="mt-3 rounded-xl bg-[#FCFAF4] px-3 py-2 text-xs leading-5 text-slate-500">
                    {item.recommendedContact.note}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">当前还没有可直接使用的联系人。</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#E8E0D0] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">执行提示</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{item.quickNote}</p>
            {(item.recommendedChannelLabel || item.complianceNote) && (
              <div className="mt-3 rounded-xl bg-[#FCFAF4] px-3 py-3">
                {item.recommendedChannelLabel && (
                  <p className="text-xs font-semibold text-[#0B1B2B]">
                    推荐渠道：<span className="font-normal text-slate-600">{item.recommendedChannelLabel}</span>
                  </p>
                )}
                {item.complianceNote && (
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.complianceNote}</p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1">联系人 {item.contactCount}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">
                上次触达 {formatRelativeLabel(item.lastContactedAt)}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1">
                Pack {item.outreachPackReady ? "已准备" : "待生成"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {item.recommendedContact?.phone && (
          <a
            href={`tel:${item.recommendedContact.phone}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#FFF4D6] px-4 py-2 text-sm font-semibold text-[#9A7A1C]"
          >
            <PhoneCall size={14} />
            直接拨号
          </a>
        )}
        {item.recommendedContact?.email && (
          <a
            href={`mailto:${item.recommendedContact.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E0D0] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <Mail size={14} />
            直接发邮
          </a>
        )}
        {item.website && (
          <a
            href={item.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E0D0] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <Globe size={14} />
            官网
          </a>
        )}
        <Link
          href={`/customer/radar/prospects?id=${item.companyId}`}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B1B2B] px-4 py-2 text-sm font-semibold text-white"
        >
          打开工作台
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function RadarDailyPage() {
  const [metrics, setMetrics] = useState<DailySupplyMetricsData | null>(null);
  const [workspace, setWorkspace] = useState<RadarDailyWorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const loadData = useCallback(() => {
    startRefresh(() => {
      Promise.all([getDailySupplyMetrics(), getRadarDailyWorkspace()])
        .then(([metricsData, workspaceData]) => {
          setMetrics(metricsData);
          setWorkspace(workspaceData);
          setError(null);
          setLoaded(true);
        })
        .catch((loadError) => {
          setError(loadError instanceof Error ? loadError.message : "加载 Daily Workspace 失败");
          setLoaded(true);
        });
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo(() => {
    if (!workspace) {
      return [];
    }

    return [
      {
        key: "phone",
        title: "今日电话优先",
        helper: `${workspace.phonePriority.length} 条可直接拨打`,
        items: workspace.phonePriority,
      },
      {
        key: "email",
        title: "今日邮件优先",
        helper: `${workspace.emailPriority.length} 条可直接发邮`,
        items: workspace.emailPriority,
      },
      {
        key: "pending",
        title: "今日待补全",
        helper: `${workspace.pendingEnrichment.length} 条待继续富化`,
        items: workspace.pendingEnrichment,
      },
    ] as const;
  }, [workspace]);

  if (!loaded && !metrics && !workspace) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div data-testid="radar-daily-page" className="space-y-6 pb-10">
      <div className="rounded-[32px] border border-[#E8E0D0] bg-[linear-gradient(135deg,#FFF8E8_0%,#FFFCF7_55%,#F7F3E8_100%)] p-6 shadow-[0_24px_54px_-38px_rgba(11,27,43,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B1B2B] text-[#D4AF37]">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A7A1C]">Daily 200 Workspace</p>
                <h1 className="text-2xl font-bold text-[#0B1B2B]">今日外联清单</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              把今天的新供给、可直接外联联系人、待补全公司放到同一屏。先保证团队每天都有能打、能发、能继续补全的清单。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div data-testid="radar-daily-generated-at" className="rounded-2xl border border-[#E8E0D0] bg-white px-4 py-3 text-sm text-slate-600">
              最近更新 {workspace ? formatWorkspaceTime(workspace.generatedAt) : "--"}
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-[#E8E0D0] bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              刷新清单
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {metrics && workspace && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="今日原始供给"
              value={metrics.today.rawCandidates}
              helper={`近 7 天累计 ${metrics.trailing7d.rawCandidates} 条候选`}
              icon={<TrendingUp size={20} />}
              testId="daily-metric-raw-candidates"
            />
            <MetricCard
              label="今日自动入池"
              value={metrics.today.importedProspects}
              helper={`近 7 天累计 ${metrics.trailing7d.importedProspects} 家 Prospect`}
              icon={<Building2 size={20} />}
              testId="daily-metric-imported-prospects"
            />
            <MetricCard
              label="今日新增联系人"
              value={metrics.today.contactsAdded}
              helper={`近 7 天累计 ${metrics.trailing7d.contactsAdded} 位联系人`}
              icon={<Users size={20} />}
              testId="daily-metric-contacts-added"
            />
            <MetricCard
              label="当前可直接外联"
              value={workspace.summary.readyNowCount}
              helper={`平均 ready score ${workspace.summary.avgReadyScore}`}
              icon={<PhoneCall size={20} />}
              testId="daily-metric-ready-now"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_2fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#E8E0D0] bg-[#FFFCF7] p-5 shadow-[0_18px_36px_-30px_rgba(11,27,43,0.28)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0B1B2B]">
                  <Clock3 size={16} className="text-[#9A7A1C]" />
                  7 日供给趋势
                </div>
                <div className="mt-4 space-y-3">
                  {metrics.points.map((point) => (
                    <div key={point.day} className="rounded-2xl border border-[#F0EBD8] bg-white px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#0B1B2B]">{point.day}</p>
                        <p className="text-xs text-slate-500">Ready {point.readyCompanies}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>候选 {point.rawCandidates}</span>
                        <span>合格 {point.qualifiedCompanies}</span>
                        <span>入池 {point.importedProspects}</span>
                        <span>联系人 {point.contactsAdded}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8E0D0] bg-[#FFFCF7] p-5 shadow-[0_18px_36px_-30px_rgba(11,27,43,0.28)]">
                <h2 className="text-sm font-semibold text-[#0B1B2B]">今日工作量概览</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span>电话优先</span>
                    <strong data-testid="daily-summary-phone-priority" className="text-[#0B1B2B]">{workspace.summary.phonePriorityCount}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span>邮件优先</span>
                    <strong data-testid="daily-summary-email-priority" className="text-[#0B1B2B]">{workspace.summary.emailPriorityCount}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span>待补全</span>
                    <strong data-testid="daily-summary-pending" className="text-[#0B1B2B]">{workspace.summary.pendingCount}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-[#F7F3E8] px-4 py-3">
                    <span>当前 Workspace 总量</span>
                    <strong data-testid="daily-summary-workspace-total" className="text-[#9A7A1C]">{workspace.summary.workspaceTotal}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {columns.map((column) => (
                <section key={column.key} className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0B1B2B]">{column.title}</h2>
                      <p className="text-sm text-slate-500">{column.helper}</p>
                    </div>
                    <Link
                      href="/customer/radar/prospects"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#9A7A1C]"
                    >
                      查看线索库
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  {column.items.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#E8E0D0] bg-white/70 px-5 py-10 text-center text-sm text-slate-500">
                      当前没有可展示的条目。
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {column.items.map((item) => (
                        <WorkspaceCard key={item.companyId} item={item} bucketLabel={column.title} />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
