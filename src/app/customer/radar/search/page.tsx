"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  ChevronRight,
  Globe2,
  Loader2,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Search,
  ShieldX,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getLatestChannelMap, getLatestTargetingSpec } from "@/actions/sync";
import { getRadarPipelineStatus } from "@/actions/radar-pipeline";
import {
  createDiscoveryTaskV2,
  getDiscoveryTasksV2,
  getRadarSourcesV2,
  getRadarSearchProfiles,
  getRadarStatsV2,
  initializeSystemSourcesV2,
  runDiscoveryTaskV2,
  toggleRadarSearchProfileActive,
  type RadarSearchProfileData,
  type RadarSourceData,
} from "@/actions/radar-v2";
import type { RadarSearchQuery } from "@/lib/radar/adapters/types";

interface ArtifactVersion<T> {
  id: string;
  version: number;
  content: T;
  createdAt: Date;
}

interface TargetingSpecContent {
  targetingSpec?: {
    icpName?: string;
    segmentation?: {
      firmographic?: {
        industries?: string[];
        countries?: string[];
        companySize?: { label?: string; min?: number; max?: number };
        exclude?: string[];
      };
      technographic?: {
        keywords?: string[];
        standards?: string[];
        systems?: string[];
        exclude?: string[];
      };
      decisionUnit?: Array<{ role?: string }>;
      exclusionRules?: Array<{ rule?: string }>;
      triggers?: Array<{ name?: string }>;
    };
  };
}

interface ChannelMapContent {
  channelMap?: {
    channels?: Array<{ channelType?: string; name?: string }>;
  };
}

type RadarTargetingSpec = NonNullable<TargetingSpecContent["targetingSpec"]>;
type RadarSegmentation = NonNullable<RadarTargetingSpec["segmentation"]>;
type RadarCompanySize = NonNullable<NonNullable<RadarSegmentation["firmographic"]>["companySize"]>;

type PipelineStatus = Awaited<ReturnType<typeof getRadarPipelineStatus>>;
type DiscoveryTask = Awaited<ReturnType<typeof getDiscoveryTasksV2>>[number];

type ActionState = "start" | "restart" | "pause" | "resume" | null;

type Preferences = {
  priorityCountries: string;
  priorityIndustries: string;
  extraKeywords: string;
  excludedTargets: string;
  note: string;
};

const DEFAULT_PREFERENCES: Preferences = {
  priorityCountries: "",
  priorityIndustries: "",
  extraKeywords: "",
  excludedTargets: "",
  note: "",
};

const CAPABILITIES: Array<{
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  types?: string[];
  alwaysActive?: boolean;
}> = [
  { key: "directory", label: "目录 / 行业名录", description: "从名录、协会和生态伙伴中自动扩查公司。", icon: Building2, types: ["DIRECTORY", "ASSOCIATION", "ECOSYSTEM"] },
  { key: "search", label: "搜索引擎聚合", description: "组合行业、地区和技术特征自动扩展检索。", icon: Search, types: ["SEARCH", "AI_SEARCH", "MULTI_SEARCH"] },
  { key: "maps", label: "地图 / POI", description: "从地理位置、工厂和门店信号中发现目标。", icon: Globe2, types: ["MAPS", "GOOGLE_PLACES"] },
  { key: "tradeshow", label: "展会与活动", description: "追踪参展商、活动方和生态线索。", icon: Users, types: ["TRADESHOW"] },
  { key: "tender", label: "招标 / 采购源", description: "识别招投标与明确采购需求。", icon: Briefcase, types: ["TENDER", "TED", "UNGM", "SAM_GOV"] },
  { key: "enrich", label: "enrichment 能力", description: "自动补全网站、地区、行业和规模信息。", icon: Sparkles, alwaysActive: true },
  { key: "contacts", label: "联系人识别能力", description: "识别决策链角色与潜在触达路径。", icon: Target, alwaysActive: true },
];

export default function RadarSearchPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getRadarStatsV2>> | null>(null);
  const [targetingVersion, setTargetingVersion] = useState<ArtifactVersion<TargetingSpecContent> | null>(null);
  const [channelMapVersion, setChannelMapVersion] = useState<ArtifactVersion<ChannelMapContent> | null>(null);
  const [profiles, setProfiles] = useState<RadarSearchProfileData[]>([]);
  const [sources, setSources] = useState<RadarSourceData[]>([]);
  const [tasks, setTasks] = useState<DiscoveryTask[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await initializeSystemSourcesV2().catch(() => null);

      const [pipelineData, statsData, targetingData, channelData, profileData, sourceData, taskData] =
        await Promise.all([
          getRadarPipelineStatus(),
          getRadarStatsV2(),
          getLatestTargetingSpec(),
          getLatestChannelMap(),
          getRadarSearchProfiles({ limit: 6 }),
          getRadarSourcesV2(),
          getDiscoveryTasksV2({ limit: 6 }),
        ]);
      setPipeline(pipelineData);
      setStats(statsData);
      setTargetingVersion(targetingData as ArtifactVersion<TargetingSpecContent> | null);
      setChannelMapVersion(channelData as ArtifactVersion<ChannelMapContent> | null);
      setProfiles(profileData);
      setSources(sourceData);
      setTasks(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载自动搜索页失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const targetingSpec = targetingVersion?.content?.targetingSpec;
  const segmentation = targetingSpec?.segmentation;
  const activeProfiles = profiles.filter((profile) => profile.isActive);
  const pausedProfiles = profiles.filter((profile) => !profile.isActive);
  const latestTask = tasks[0];
  const latestTaskStats = parseTaskStats(latestTask?.stats);
  const effectiveQuery = useMemo(() => buildQuery(targetingSpec, preferences), [preferences, targetingSpec]);
  const canStartSearch = hasQueryScope(effectiveQuery);
  const searchStarted = Boolean(pipeline?.counts.lastScanAt || pipeline?.counts.profilesActiveCount);
  const capabilities = useMemo(() => buildCapabilities(channelMapVersion, profiles), [channelMapVersion, profiles]);
  const sourceSummary = useMemo(() => buildSourceSummary(sources), [sources]);
  const sourceCoverage = useMemo(() => buildSourceCoverage(sources), [sources]);
  const automationSummary = useMemo(() => buildAutomationSummary(profiles), [profiles]);

  const runSearch = async (mode: "start" | "restart") => {
    if (!targetingVersion?.id || !canStartSearch) {
      setError("当前画像还没有可执行的国家、行业或关键词，请先同步目标客户画像。");
      return;
    }
    setActionState(mode);
    try {
      const task = await createDiscoveryTaskV2({
        name: mode === "restart" ? "按最新画像重新搜索" : "按当前画像开始自动搜索",
        queryConfig: effectiveQuery,
        targetingRef: { specVersionId: targetingVersion.id },
      });
      const result = await runDiscoveryTaskV2(task.id);
      if (result.success) {
        toast.success(mode === "restart" ? "已按最新画像重新搜索" : "自动搜索已启动", {
          description: `新增 ${result.stats.created} 个候选，去重 ${result.stats.duplicates} 个。`,
        });
      }
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "自动搜索执行失败";
      setError(message);
      toast.error("自动搜索执行失败", { description: message });
    } finally {
      setActionState(null);
    }
  };

  const toggleAutomation = async (mode: "pause" | "resume") => {
    const targets = mode === "pause" ? activeProfiles : pausedProfiles.slice(0, 1);
    if (!targets.length) return;
    setActionState(mode);
    try {
      await Promise.all(targets.map((profile) => toggleRadarSearchProfileActive(profile.id)));
      toast.success(mode === "pause" ? "已暂停自动搜索" : "已继续自动执行");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "自动执行切换失败";
      setError(message);
      toast.error("自动执行切换失败", { description: message });
    } finally {
      setActionState(null);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--ci-accent)]" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6 shadow-[var(--ci-shadow-soft)]">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(79,141,246,0.18)] bg-[rgba(79,141,246,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ci-accent)]"><Radar size={12} />画像驱动自动执行</div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B1B2B]">自动搜索</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">系统会按目标客户画像自动找客户、补全信息、评估价值并沉淀结果。你只需要决定何时启动，确认系统按什么找，审核结果，然后推进跟进。</p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <Pill label="当前画像" value={targetingSpec?.icpName || "尚未同步"} />
              <Pill label="自动搜索状态" value={searchStarted ? "已启动" : "未启动"} tone={searchStarted ? "success" : "warning"} />
              <Pill label="最近运行" value={formatRelative(pipeline?.counts.lastScanAt || null)} />
              <Pill label="可用数据源" value={sourceSummary.total ? `${sourceSummary.enabled}/${sourceSummary.total}` : "待初始化"} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard label="开始自动搜索" hint="按当前画像立即执行一轮" icon={Play} active={actionState === "start"} disabled={!canStartSearch} onClick={() => runSearch("start")} primary />
            <ActionCard label="按最新画像重新搜索" hint="用当前画像摘要再跑一轮" icon={RefreshCw} active={actionState === "restart"} disabled={!canStartSearch} onClick={() => runSearch("restart")} />
            <ActionCard label={activeProfiles.length ? "暂停自动搜索" : "继续自动执行"} hint={activeProfiles.length ? "暂停当前持续执行策略" : "恢复一个已有策略"} icon={activeProfiles.length ? Pause : Play} active={actionState === "pause" || actionState === "resume"} disabled={!activeProfiles.length && !pausedProfiles.length} onClick={() => toggleAutomation(activeProfiles.length ? "pause" : "resume")} />
            <Link href="/customer/radar/candidates" className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] px-4 py-4 transition-colors hover:border-[var(--ci-accent)]/35 hover:bg-[var(--ci-surface-muted)]"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-[#0B1B2B]">查看候选结果</div><div className="mt-1 text-xs text-slate-500">直接进入候选池审核系统发现的对象</div></div><ChevronRight size={18} className="text-[var(--ci-accent)]" /></div></Link>
          </div>
        </div>
      </section>

      {error ? <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />{error}</div> : null}
      {pipeline?.errors?.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">最近一次自动搜索有异常：{pipeline.errors[0]}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6">
<SectionHeader
  eyebrow="A. 搜索边界"
  title="先看结果，再决定下一步"
  description="先把你想赢的对象范围讲清楚：国家、行业、关键词优先级。接下来直接从执行结果里确认是否可推进。"
/>
          {targetingSpec ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard title="当前使用的画像" value={targetingSpec.icpName || "未命名画像"} lines={[summarize(segmentation?.firmographic?.industries, "未提炼目标行业"), summarize(segmentation?.firmographic?.countries, "未提炼目标国家 / 区域"), formatCompanySize(segmentation?.firmographic?.companySize)]} />
              <InfoCard title="关键特征摘要" value={summarize(segmentation?.technographic?.keywords, "未提炼关键技术特征")} lines={[summarize(segmentation?.technographic?.standards, "暂无相关标准"), summarize(segmentation?.technographic?.systems, "暂无系统特征")]} />
              <InfoCard title="决策链角色" value={summarize(segmentation?.decisionUnit?.map((item) => item.role || "").filter(Boolean), "暂无角色信息")} lines={[summarize(segmentation?.triggers?.map((item) => item.name || "").filter(Boolean), "暂无触发信号")]} />
              <InfoCard title="排除规则摘要" value={summarize(getExclusions(segmentation), "暂无明确排除规则")} lines={[`同步版本：v${targetingVersion?.version ?? "-"}`, `同步时间：${formatDateTime(targetingVersion?.createdAt || null)}`]} />
            </div>
          ) : (
            <EmptyCard title="还没有目标客户画像" description="先从知识引擎同步最新画像，自动搜索才会知道该按什么特征执行。" href="/customer/radar/targeting" cta="去同步目标客户画像" />
          )}
        </section>

        <section className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6">
          <SectionHeader eyebrow="B. 系统将调用的能力" title="这里展示系统会做什么，而不是让用户自己选什么" description="能力卡片用于解释自动执行范围，避免自动搜索被误解成高级搜索表单。" />
          <div className="grid gap-3 md:grid-cols-2">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className={`rounded-xl border p-4 ${item.active ? "border-[var(--ci-accent)]/35 bg-[var(--ci-surface-strong)]" : "border-[var(--ci-border)] bg-[var(--ci-surface-muted)]"}`}>
                  <div className="mb-3 flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.active ? "bg-[var(--ci-accent)]/15 text-[var(--ci-accent)]" : "bg-[#FFFFFF] text-slate-500"}`}><Icon size={18} /></div><div><div className="text-sm font-semibold text-[#0B1B2B]">{item.label}</div><div className="text-xs text-slate-500">{item.active ? "已纳入当前自动执行" : "当前画像暂无明确命中"}</div></div></div>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
          {channelMapVersion?.content?.channelMap?.channels?.length ? <div className="mt-4 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] px-4 py-3 text-sm text-slate-600"><span className="font-semibold text-[#0B1B2B]">系统推导来源：</span>{channelMapVersion.content.channelMap.channels.slice(0, 4).map((channel) => channel.name).filter(Boolean).join("、") || "自动聚合"}</div> : null}
          {sourceSummary.total ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="数据源总数" value={sourceSummary.total} compact />
                <MetricCard label="可用数据源" value={sourceSummary.enabled} compact />
                <MetricCard label="健康数据源" value={sourceSummary.healthy} compact />
                <MetricCard label="官方数据源" value={sourceSummary.official} compact />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {sourceCoverage.map((item) => (
                  <div key={item.key} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#0B1B2B]">{item.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.names.join("、")}
                        </div>
                      </div>
                      <span className="rounded-full bg-[var(--ci-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[#0B1B2B]">
                        {item.total} 个来源
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2.5 py-1">健康 {item.healthy}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">官方 {item.official}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">{item.coverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6">
        <SectionHeader eyebrow="C. 执行状态" title="自动搜索是否在跑、跑出了什么，以及下一步该看哪里" description="默认不要求任何输入就能启动，先解释执行状态，再给出动作。" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="自动搜索状态" value={searchStarted ? "已启动" : "未启动"} />
          <MetricCard label="最近运行" value={formatRelative(pipeline?.counts.lastScanAt || null)} />
          <MetricCard label="本轮抓取" value={latestTaskStats?.fetched ?? "—"} />
          <MetricCard label="去重数量" value={latestTaskStats?.duplicates ?? "—"} />
          <MetricCard label="待审核候选" value={pipeline?.counts.pendingReviewCount ?? stats?.newCandidates ?? 0} />
          <MetricCard label="已导入线索" value={pipeline?.counts.prospectCompanyCount ?? stats?.companies ?? 0} />
        </div>
      </section>

      <section className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
<SectionHeader eyebrow="D. 本轮画像校准" title="把专家判断临时叠加到本轮匹配" description="这里不是让客户改成搜索员，而是在长期画像之上补一层本轮优先级，帮助系统更接近客户的行业判断。" compact />
          <button onClick={() => setShowPreferences((value) => !value)} className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#0B1B2B] transition-colors hover:border-[var(--ci-accent)]/35 hover:bg-[var(--ci-surface-muted)]">{showPreferences ? "收起校准" : "补充本轮校准（可选）"}<ChevronRight className={`h-4 w-4 transition-transform ${showPreferences ? "rotate-90" : ""}`} /></button>
        </div>
        {showPreferences ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="优先国家" value={preferences.priorityCountries} placeholder="例如：DE, US, MX" onChange={(value) => setPreferences((prev) => ({ ...prev, priorityCountries: value }))} />
              <TextField label="优先行业" value={preferences.priorityIndustries} placeholder="例如：汽车零部件、工业涂装" onChange={(value) => setPreferences((prev) => ({ ...prev, priorityIndustries: value }))} />
              <TextField label="额外关注关键词" value={preferences.extraKeywords} placeholder="例如：robotic spray painting cell, paint booth automation" onChange={(value) => setPreferences((prev) => ({ ...prev, extraKeywords: value }))} />
              <TextField label="想排除的特殊对象" value={preferences.excludedTargets} placeholder="例如：贸易商、维修服务商" onChange={(value) => setPreferences((prev) => ({ ...prev, excludedTargets: value }))} />
            </div>
            <TextField label="一句补充说明" value={preferences.note} placeholder="例如：本轮优先看德国本地制造企业，先不要看渠道商。" onChange={(value) => setPreferences((prev) => ({ ...prev, note: value }))} textarea />
            <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] px-4 py-3 text-sm text-slate-600">本轮会把 <span className="font-semibold text-[#0B1B2B]">国家 / 行业 / 关键词优先级</span> 临时叠加到画像匹配里。需要长期生效的行业判断，请回到总览页用 <span className="font-semibold text-[#0B1B2B]">画像校正助手</span> 写入目标客户画像。</div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6">
<SectionHeader eyebrow="E. 最近活动" title="最近发生了什么" description="帮你确认执行是否在推进：哪些值得继续跟进，哪些可以延后。" />
          {tasks.length ? (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-[#0B1B2B]">{task.name || "自动搜索任务"}</div><div className="mt-1 text-xs text-slate-500">{formatTaskStatus(task.status)} · {task.source.name}</div></div><div className="text-xs text-slate-400">{formatRelative(task.completedAt ?? task.startedAt ?? task.createdAt)}</div></div>
                  {parseTaskStats(task.stats) ? <div className="mt-3 flex flex-wrap gap-2 text-xs">{renderTaskBadge("抓取", parseTaskStats(task.stats)?.fetched)}{renderTaskBadge("新增", parseTaskStats(task.stats)?.created)}{renderTaskBadge("去重", parseTaskStats(task.stats)?.duplicates)}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard title="还没有自动搜索活动" description="当你开始自动搜索后，这里会按时间线展示系统执行过什么。" />
          )}
        </section>

        <section className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6">
          <SectionHeader eyebrow="F. 自动执行现状" title="目前有哪些持续执行策略" description="这部分承接旧版任务 / 策略能力，但不再把它们作为主入口。" />
          {profiles.length ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="运行中策略" value={automationSummary.active} compact />
              <MetricCard label="暂停中策略" value={automationSummary.paused} compact />
              <MetricCard label="自动补全开启" value={automationSummary.autoEnrich} compact />
              <MetricCard label="自动评估开启" value={automationSummary.autoQualify} compact />
            </div>
          ) : null}
          {profiles.length ? (
            <div className="space-y-3">
              {profiles.slice(0, 5).map((profile) => (
                <div key={profile.id} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-[#0B1B2B]">{profile.name}</div><div className="mt-1 text-xs text-slate-500">{profile.segment?.name || "未关联画像分群"} · {profile.enabledChannels.length} 个渠道 · {formatScheduleRule(profile.scheduleRule)}</div></div><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${profile.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{profile.isActive ? "运行中" : "暂停中"}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {summarizeProfileKeywords(profile).map((item) => (
                      <span key={item} className="rounded-full bg-white px-2.5 py-1">
                        {item}
                      </span>
                    ))}
                    {profile.targetCountries.slice(0, 3).map((country) => (
                      <span key={country} className="rounded-full bg-white px-2.5 py-1">
                        国家 {country}
                      </span>
                    ))}
                    {profile.targetCountries.length > 3 ? (
                      <span className="rounded-full bg-white px-2.5 py-1">
                        +{profile.targetCountries.length - 3} 个国家
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><div>上次运行：{formatDateTime(profile.lastRunAt)}</div><div>下次运行：{formatDateTime(profile.nextRunAt)}</div><div>自动补全：{profile.autoEnrich ? "开启" : "关闭"}</div><div>自动评估：{profile.autoQualify ? "开启" : "关闭"}</div></div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard title="当前没有持续执行策略" description="这不影响你直接按当前画像启动一轮自动搜索，旧版持续策略会在下一阶段继续收敛。" />
          )}
<div className="mt-4 rounded-xl border border-dashed border-[var(--ci-accent)]/35 bg-[var(--ci-surface-strong)] px-4 py-3 text-sm text-slate-600">旧有渠道与策略已聚合到本页执行摘要。当前你只需要确认结果：是否值得推进、谁先推进、下一步动作是什么。</div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, compact = false }: { eyebrow: string; title: string; description: string; compact?: boolean }) {
  return <div className={compact ? "" : "mb-5"}><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ci-accent-strong)]">{eyebrow}</div><h2 className="mt-2 text-xl font-bold tracking-tight text-[#0B1B2B]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>;
}

function InfoCard({ title, value, lines }: { title: string; value: string; lines: string[] }) {
  return <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</div><div className="mt-3 text-sm font-semibold leading-6 text-[#0B1B2B]">{value}</div><div className="mt-3 space-y-2 text-sm text-slate-500">{lines.filter(Boolean).map((line) => <div key={line}>{line}</div>)}</div></div>;
}

function MetricCard({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) {
  return <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] px-4 py-4"><div className="text-xs font-medium text-slate-500">{label}</div><div className={`font-bold tracking-tight text-[#0B1B2B] ${compact ? "mt-2 text-xl" : "mt-3 text-2xl"}`}>{value}</div></div>;
}

function EmptyCard({ title, description, href, cta }: { title: string; description: string; href?: string; cta?: string }) {
  return <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface-muted)] px-6 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFFFFF] text-[var(--ci-accent)]"><ShieldX size={22} /></div><div className="text-lg font-bold text-[#0B1B2B]">{title}</div><div className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</div>{href && cta ? <Link href={href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--ci-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ci-accent-strong)]">{cta}<ChevronRight size={14} /></Link> : null}</div>;
}

function TextField({ label, value, onChange, placeholder, textarea = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; textarea?: boolean }) {
  return <div><label className="mb-2 block text-sm font-medium text-[#0B1B2B]">{label}</label>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} placeholder={placeholder} className="w-full rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] px-4 py-3 text-sm text-[#0B1B2B] placeholder:text-slate-400 focus:border-[var(--ci-accent)]/45 focus:outline-none" /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] px-4 py-3 text-sm text-[#0B1B2B] placeholder:text-slate-400 focus:border-[var(--ci-accent)]/45 focus:outline-none" />}</div>;
}

function Pill({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-[var(--ci-border)] bg-[var(--ci-surface-muted)] text-slate-700";
  return <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClass}`}><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span><span className="text-xs font-semibold text-[#0B1B2B]">{value}</span></div>;
}

function ActionCard({ label, hint, icon: Icon, onClick, active, disabled, primary = false }: { label: string; hint: string; icon: LucideIcon; onClick: () => void; active: boolean; disabled: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || active}
      className={`rounded-xl border px-4 py-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? "border-[var(--ci-accent)]/35 bg-[var(--ci-accent)] text-white shadow-[var(--ci-shadow-soft)] hover:bg-[var(--ci-accent-strong)]"
          : "border-[var(--ci-border)] bg-[#FFFFFF] text-[#0B1B2B] hover:border-[var(--ci-accent)]/30 hover:bg-[var(--ci-surface-muted)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className={`mt-1 text-xs ${primary ? "text-blue-50" : "text-slate-500"}`}>{hint}</div>
        </div>
        {active ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
      </div>
    </button>
  );
}

function buildQuery(targetingSpec: TargetingSpecContent["targetingSpec"], preferences: Preferences): RadarSearchQuery {
  return {
    countries: mergeLists(targetingSpec?.segmentation?.firmographic?.countries, splitText(preferences.priorityCountries, true)) || undefined,
    targetIndustries: mergeLists(targetingSpec?.segmentation?.firmographic?.industries, splitText(preferences.priorityIndustries)) || undefined,
    keywords: mergeLists(targetingSpec?.segmentation?.technographic?.keywords, splitText(preferences.extraKeywords)) || undefined,
    maxResults: 40,
  };
}

function buildCapabilities(channelMapVersion: ArtifactVersion<ChannelMapContent> | null, profiles: RadarSearchProfileData[]) {
  const activeTypes = new Set<string>();
  channelMapVersion?.content?.channelMap?.channels?.forEach((channel) => activeTypes.add(normalizeType(channel.channelType)));
  profiles.forEach((profile) => profile.enabledChannels.forEach((item) => activeTypes.add(normalizeType(item))));
  return CAPABILITIES.map((item) => ({ ...item, active: item.alwaysActive || Boolean(item.types?.some((type) => activeTypes.has(normalizeType(type)))) }));
}

function getExclusions(segmentation: RadarSegmentation | undefined) {
  return mergeLists(segmentation?.firmographic?.exclude, segmentation?.technographic?.exclude, segmentation?.exclusionRules?.map((item) => item.rule || "").filter(Boolean)) || [];
}

function mergeLists(...values: Array<string[] | undefined>) {
  const merged = [...new Set(values.flatMap((value) => value || []).filter(Boolean))];
  return merged.length ? merged : null;
}

function splitText(value: string, uppercase = false) {
  return value.split(/[,，\n]+/).map((item) => uppercase ? item.trim().toUpperCase() : item.trim()).filter(Boolean);
}

function summarize(values: string[] | undefined, fallback: string) {
  return values?.length ? values.join("、") : fallback;
}

function hasQueryScope(query: RadarSearchQuery) {
  return Boolean(query.countries?.length || query.targetIndustries?.length || query.keywords?.length);
}

function parseTaskStats(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const stats = value as Record<string, unknown>;
  return {
    fetched: typeof stats.fetched === "number" ? stats.fetched : undefined,
    created: typeof stats.created === "number" ? stats.created : undefined,
    duplicates: typeof stats.duplicates === "number" ? stats.duplicates : undefined,
  };
}

function renderTaskBadge(label: string, value?: number) {
  if (value === undefined) return null;
  return <span className="rounded-full bg-[var(--ci-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[#0B1B2B]">{label} {value}</span>;
}

function formatRelative(value: Date | null) {
  if (!value) return "暂无记录";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(value).toLocaleDateString("zh-CN");
}

function formatDateTime(value: Date | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "暂无记录";
}

function formatCompanySize(value: RadarCompanySize | undefined) {
  if (!value) return "未定义公司规模";
  if (value.label) return `公司规模：${value.label}`;
  if (value.min || value.max) return `公司规模：${value.min ?? "?"} - ${value.max ?? "?"}`;
  return "未定义公司规模";
}

function formatTaskStatus(status: string) {
  switch (status) {
    case "RUNNING":
      return "执行中";
    case "COMPLETED":
      return "已完成";
    case "FAILED":
      return "执行失败";
    case "CANCELLED":
      return "已取消";
    default:
      return "待执行";
  }
}

function normalizeType(value?: string) {
  return value?.trim().replace(/[-\s]/g, "_").toUpperCase() || "";
}

function buildSourceSummary(sources: RadarSourceData[]) {
  const healthy = sources.filter((source) => getSourceHealth(source)).length;
  const enabled = sources.filter((source) => source.isEnabled).length;
  const official = sources.filter((source) => source.isOfficial).length;

  return {
    total: sources.length,
    healthy,
    enabled,
    official,
  };
}

function buildSourceCoverage(sources: RadarSourceData[]) {
  return CAPABILITIES.filter((item) => item.types?.length)
    .map((item) => {
      const matchedSources = sources.filter((source) =>
        item.types?.some((type) => normalizeType(type) === normalizeType(source.channelType))
      );

      if (!matchedSources.length) {
        return null;
      }

      const countries = new Set(
        matchedSources.flatMap((source) => source.countries || []).filter(Boolean)
      );

      return {
        key: item.key,
        label: item.label,
        total: matchedSources.length,
        healthy: matchedSources.filter((source) => getSourceHealth(source)).length,
        official: matchedSources.filter((source) => source.isOfficial).length,
        coverage: countries.size ? `覆盖 ${countries.size} 个国家` : "全球 / 多区域覆盖",
        names: matchedSources.slice(0, 3).map((source) => source.name),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildAutomationSummary(profiles: RadarSearchProfileData[]) {
  return {
    active: profiles.filter((profile) => profile.isActive).length,
    paused: profiles.filter((profile) => !profile.isActive).length,
    autoEnrich: profiles.filter((profile) => profile.autoEnrich).length,
    autoQualify: profiles.filter((profile) => profile.autoQualify).length,
  };
}

function getSourceHealth(source: RadarSourceData) {
  const stats = source.syncStats as Record<string, unknown> | null;
  return stats?.healthy === true;
}

function summarizeProfileKeywords(profile: RadarSearchProfileData) {
  const keywords = Object.values(profile.keywords || {}).flat().filter(Boolean);
  const summary = keywords.slice(0, 2).map((keyword) => `关键词 ${keyword}`);
  if (!summary.length) {
    summary.push("按画像摘要自动执行");
  }
  return summary;
}

function formatScheduleRule(rule: string) {
  switch (rule) {
    case "*/5 * * * *":
      return "每 5 分钟";
    case "*/15 * * * *":
      return "每 15 分钟";
    case "0 * * * *":
      return "每小时";
    case "0 6 * * *":
      return "每日 06:00";
    case "0 6 * * 1":
      return "每周一 06:00";
    default:
      return "按既定节奏运行";
  }
}
