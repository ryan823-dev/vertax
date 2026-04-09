"use client";

import { GitBranch, MessageSquare, ListTodo, Check, AlertTriangle, Send, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  type: "version_created" | "status_changed" | "comment_added" | "task_created" | "approved" | "rejected";
  timestamp: Date;
  actorName?: string;
  description: string;
  metadata?: { reason?: string; [key: string]: unknown };
}

interface ShellHistoryTabProps {
  history: HistoryEntry[];
  variant?: "light" | "dark";
}

const EVENT_CONFIG: Record<HistoryEntry["type"], { icon: typeof GitBranch; color: string }> = {
  version_created: { icon: GitBranch, color: "text-blue-500" },
  status_changed: { icon: Send, color: "text-purple-500" },
  comment_added: { icon: MessageSquare, color: "text-slate-500" },
  task_created: { icon: ListTodo, color: "text-orange-500" },
  approved: { icon: Check, color: "text-emerald-500" },
  rejected: { icon: AlertTriangle, color: "text-red-500" },
};

export function ShellHistoryTab({ history, variant = "light" }: ShellHistoryTabProps) {
  const baseStyles = variant === "light" ? "text-[#0B1B2B]" : "text-white";
  const subTextStyles = variant === "light" ? "text-slate-500" : "text-slate-400";
  const lineColor = variant === "light" ? "bg-[#E7E0D3]" : "bg-[#10263B]";

  if (history.length === 0) {
    return (
      <div className={`text-center py-8 ${subTextStyles}`}>
        <Clock size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className={`absolute left-3 top-2 bottom-2 w-0.5 ${lineColor}`} />

      <div className="space-y-4">
        {history.map((entry) => {
          const config = EVENT_CONFIG[entry.type];
          const Icon = config.icon;

          return (
            <div key={entry.id} className="relative flex gap-3 pl-1">
              {/* Timeline dot */}
              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                variant === "light" ? "bg-white border border-[#E7E0D3]" : "bg-[#0B1B2B] border border-[#10263B]"
              }`}>
                <Icon size={12} className={config.color} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${baseStyles}`}>
                    {entry.actorName || "系统"}
                  </span>
                  <span className={`text-xs ${subTextStyles}`}>
                    {entry.description}
                  </span>
                </div>
                <p className={`text-xs ${subTextStyles} mt-0.5`}>
                  {format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                  <span className="mx-1">·</span>
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: zhCN })}
                </p>

                {/* Additional metadata */}
                {entry.metadata?.reason && (
                  <p className={`text-xs mt-1 p-2 rounded-lg ${
                    variant === "light" ? "bg-[#F7F3EA]" : "bg-[#10263B]/50"
                  } ${subTextStyles}`}>
                    &quot;{String(entry.metadata.reason)}&quot;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 从 Activity 数据转换为 HistoryEntry
export function convertActivityToHistory(activities: Array<{
  id: string;
  action: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  user?: { name?: string | null };
}>): HistoryEntry[] {
  return activities.map((activity) => {
    let type: HistoryEntry["type"] = "status_changed";
    let description = "执行了操作";

    const context = activity.context as Record<string, unknown> | undefined;

    if (activity.action.includes("version.created")) {
      type = "version_created";
      description = "创建了新版本";
    } else if (activity.action.includes("status_changed")) {
      const newStatus = context?.newStatus as string;
      if (newStatus === "approved") {
        type = "approved";
        description = "批准了此版本";
      } else if (newStatus === "client_feedback") {
        type = "rejected";
        description = "请求修改";
      } else if (newStatus === "in_review") {
        description = "提交了审核";
      } else {
        description = `将状态更改为 ${newStatus}`;
      }
    } else if (activity.action.includes("comment")) {
      type = "comment_added";
      description = "添加了评论";
    } else if (activity.action.includes("task")) {
      type = "task_created";
      description = "创建了任务";
    }

    return {
      id: activity.id,
      type,
      timestamp: activity.createdAt,
      actorName: activity.user?.name || undefined,
      description,
      metadata: {
        ...activity.metadata,
        reason: context?.reason ? String(context.reason) : undefined,
      },
    };
  });
}
