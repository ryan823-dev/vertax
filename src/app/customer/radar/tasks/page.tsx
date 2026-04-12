"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Square,
  X,
  XCircle,
} from "lucide-react";
import {
  cancelDiscoveryTaskV2,
  createDiscoveryTaskV2,
  getDiscoveryTasksV2,
  runDiscoveryTaskV2,
} from "@/actions/radar-v2";
import { getLatestTargetingSpec } from "@/actions/sync";
import type { RadarTask, RadarSource, RadarTaskStatus } from "@prisma/client";
import type { RadarSearchQuery } from "@/lib/radar/adapters/types";
import { toast } from "sonner";

type TaskWithSource = RadarTask & { source: RadarSource };

type TargetingSpecPayload = {
  segmentation?: {
    firmographic?: {
      industries?: string[];
      countries?: string[];
    };
    technographic?: {
      keywords?: string[];
    };
  };
};

type TargetingSpecRecord = {
  id: string;
  content: Record<string, unknown>;
};

const AUTO_COLLECTION_SOURCE_CODES = new Set(["batch_discovery", "multi_search"]);

const STATUS_CONFIG: Record<
  RadarTaskStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  PENDING: { label: "待执行", color: "text-slate-500 bg-slate-100", icon: Clock },
  RUNNING: { label: "执行中", color: "text-blue-600 bg-blue-100", icon: Loader2 },
  COMPLETED: { label: "已完成", color: "text-emerald-600 bg-emerald-100", icon: CheckCircle2 },
  FAILED: { label: "失败", color: "text-red-600 bg-red-100", icon: XCircle },
  CANCELLED: { label: "已取消", color: "text-amber-600 bg-amber-100", icon: Square },
};

function buildQueryConfigFromTargetingSpec(
  payload: TargetingSpecPayload | null
): RadarSearchQuery {
  const keywords = payload?.segmentation?.technographic?.keywords?.filter(Boolean) ?? [];
  const countries = payload?.segmentation?.firmographic?.countries?.filter(Boolean) ?? [];
  const targetIndustries =
    payload?.segmentation?.firmographic?.industries?.filter(Boolean) ?? [];

  return {
    keywords: keywords.length > 0 ? keywords : undefined,
    countries: countries.length > 0 ? countries : undefined,
    targetIndustries: targetIndustries.length > 0 ? targetIndustries : undefined,
  };
}

function hasQueryScope(query: RadarSearchQuery): boolean {
  return Boolean(
    query.keywords?.length ||
      query.countries?.length ||
      query.regions?.length ||
      query.categories?.length ||
      query.targetIndustries?.length ||
      query.companyTypes?.length
  );
}

function summarizeQuery(query: RadarSearchQuery): string {
  const parts: string[] = [];

  if (query.keywords?.length) {
    parts.push(`关键词：${query.keywords.slice(0, 3).join("、")}`);
  }
  if (query.countries?.length) {
    parts.push(`国家：${query.countries.slice(0, 4).join("、")}`);
  }
  if (query.targetIndustries?.length) {
    parts.push(`行业：${query.targetIndustries.slice(0, 3).join("、")}`);
  }

  return parts.join(" · ") || "按目标客户画像自动收集线索";
}

function formatTaskTimestamp(task: TaskWithSource): string {
  const value = task.completedAt ?? task.startedAt ?? task.createdAt;
  return new Date(value).toLocaleString("zh-CN");
}

function getTaskModeLabel(task: TaskWithSource): string {
  return AUTO_COLLECTION_SOURCE_CODES.has(task.source.code)
    ? "系统自动收集与补全"
    : "线索收集任务";
}

export default function RadarTasksPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithSource[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RadarTaskStatus | "">("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const tasksData = await getDiscoveryTasksV2({
        status: statusFilter || undefined,
      });
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载任务失败");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunTask = async (taskId: string) => {
    try {
      const result = await runDiscoveryTaskV2(taskId);
      if (result.success) {
        toast.success("任务已完成", {
          description: `新增 ${result.stats.created} 条线索，去重 ${result.stats.duplicates} 条`,
        });
      }
      await loadData();
    } catch (err) {
      toast.error("执行失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelDiscoveryTaskV2(taskId);
      toast.info("任务已取消");
      await loadData();
    } catch (err) {
      toast.error("取消失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1B2B] to-[#10263B]">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/radar"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-[#D4AF37]"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">线索收集任务</h1>
              <p className="mt-1 text-sm text-slate-400">
                按目标客户画像自动收集、补全并验证客户线索，不暴露底层数据源。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-medium text-[#0B1220] transition-colors hover:bg-[#C5A030]"
            >
              <Plus size={16} />
              新建线索收集
            </button>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 transition-colors hover:text-[#D4AF37]"
              title="刷新"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="shrink-0 text-red-500" size={20} />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500">筛选</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RadarTaskStatus | "")}
            className="rounded-lg border border-[#E8E0D0] bg-[#FFFCF7] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs text-slate-400">共 {tasks.length} 个任务</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="grid gap-4">
            {tasks.map((task) => {
              const statusConf = STATUS_CONFIG[task.status];
              const StatusIcon = statusConf.icon;
              const taskQuery = (task.queryConfig || {}) as RadarSearchQuery;

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] p-5 transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0EBD8]">
                        <Search size={20} className="text-[#D4AF37]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate font-bold text-[#0B1B2B]">{task.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConf.color}`}
                          >
                            {statusConf.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <StatusIcon
                            size={12}
                            className={task.status === "RUNNING" ? "animate-spin" : ""}
                          />
                          <span>{getTaskModeLabel(task)}</span>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {summarizeQuery(taskQuery)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          最近时间：{formatTaskTimestamp(task)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.status === "PENDING" || task.status === "FAILED" ? (
                        <button
                          onClick={() => handleRunTask(task.id)}
                          className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50"
                          title="运行"
                        >
                          <Play size={18} />
                        </button>
                      ) : task.status === "RUNNING" ? (
                        <button
                          onClick={() => handleCancelTask(task.id)}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          title="取消"
                        >
                          <Square size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRunTask(task.id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#F7F3E8] hover:text-[#D4AF37]"
                          title="重新运行"
                        >
                          <RefreshCw size={18} />
                        </button>
                      )}

                      <button
                        onClick={() => {}}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#F7F3E8] hover:text-[#D4AF37]"
                        title="详情"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E8E0D0] bg-[#F7F3E8] p-12 text-center">
            <Search size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="mb-2 text-lg font-bold text-[#0B1B2B]">暂无线索收集任务</h3>
            <p className="mb-6 text-sm text-slate-500">
              基于目标客户画像创建收集任务后，系统会自动完成线索发现、信息补全和结果汇总。
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mx-auto flex items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-3 font-medium text-[#0B1220] transition-colors hover:bg-[#C5A030]"
            >
              <Plus size={18} />
              创建线索收集任务
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [targetingSpec, setTargetingSpec] = useState<TargetingSpecRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTargetingSpec() {
      setIsLoadingProfile(true);
      try {
        const spec = await getLatestTargetingSpec();
        if (!cancelled && spec) {
          setTargetingSpec({ id: spec.id, content: spec.content });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadTargetingSpec();

    return () => {
      cancelled = true;
    };
  }, []);

  const targetingPayload = ((targetingSpec?.content.targetingSpec ?? null) as
    | TargetingSpecPayload
    | null);
  const queryConfig = buildQueryConfigFromTargetingSpec(targetingPayload);
  const canCreate = Boolean(targetingSpec) && hasQueryScope(queryConfig);

  const handleCreate = async () => {
    if (!targetingSpec) {
      toast.error("请先完成目标客户画像");
      return;
    }

    if (!hasQueryScope(queryConfig)) {
      toast.error("当前画像缺少可执行的采集范围");
      return;
    }

    setIsCreating(true);
    try {
      await createDiscoveryTaskV2({
        name: "按目标客户画像自动采集线索",
        queryConfig,
        targetingRef: {
          specVersionId: targetingSpec.id,
        },
      });

      toast.success("线索收集任务已创建", {
        description: "系统将自动完成发现、补全和验证，完成后直接展示结果。",
      });
      onCreated();
    } catch (err) {
      toast.error("创建失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-[#FFFCF7]">
        <div className="border-b border-[#E8E0D0] bg-[#F0EBD8] px-6 py-4">
          <h3 className="text-lg font-bold text-[#0B1B2B]">新建线索收集任务</h3>
          <p className="mt-1 text-sm text-slate-500">
            系统会依据目标客户画像自动选择内部发现与补全能力，你只需要确认收集范围。
          </p>
        </div>

        <div className="space-y-4 p-6">
          {isLoadingProfile ? (
            <div className="flex items-center justify-center rounded-xl border border-[#E8E0D0] bg-[#F7F3E8] px-4 py-8">
              <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
            </div>
          ) : targetingSpec ? (
            <>
              <div className="rounded-xl border border-[#E8E0D0] bg-[#F7F3E8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#0B1B2B]">目标客户画像已就绪</p>
                    <p className="mt-1 text-xs text-slate-500">
                      创建后将自动执行线索发现、信息补全和关键人验证。
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">
                    自动采集
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#E8E0D0] bg-white p-4">
                <p className="mb-3 text-sm font-medium text-[#0B1B2B]">本次收集范围</p>
                <div className="space-y-2 text-xs">
                  {queryConfig.keywords?.length ? (
                    <div className="flex gap-2">
                      <span className="shrink-0 text-slate-400">关键词：</span>
                      <span className="text-[#0B1B2B]">{queryConfig.keywords.join("、")}</span>
                    </div>
                  ) : null}
                  {queryConfig.countries?.length ? (
                    <div className="flex gap-2">
                      <span className="shrink-0 text-slate-400">国家：</span>
                      <span className="text-[#0B1B2B]">{queryConfig.countries.join("、")}</span>
                    </div>
                  ) : null}
                  {queryConfig.targetIndustries?.length ? (
                    <div className="flex gap-2">
                      <span className="shrink-0 text-slate-400">行业：</span>
                      <span className="text-[#0B1B2B]">
                        {queryConfig.targetIndustries.join("、")}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {!canCreate && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <div className="text-xs text-amber-700">
                      当前画像还缺少可执行的关键词、国家或行业信息，请先补全目标客户画像。
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="text-xs text-amber-700">
                  <p className="mb-1 font-medium">未找到目标客户画像</p>
                  <p>请先在知识引擎中完成目标客户画像分析，再返回此处创建线索收集任务。</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#E8E0D0] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-slate-500 transition-colors hover:text-slate-700"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || isLoadingProfile || !canCreate}
            className="flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2 text-sm font-medium text-[#D4AF37] transition-colors hover:bg-[#152030] disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            开始收集
          </button>
        </div>
      </div>
    </div>
  );
}
