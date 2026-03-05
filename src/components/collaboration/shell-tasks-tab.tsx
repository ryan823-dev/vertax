"use client";

import { useState } from "react";
import { ListTodo, Plus, Loader2, Play, Pause, Check, User, Calendar, AlertCircle } from "lucide-react";
import { createTask, updateTaskStatus } from "@/actions/collaboration";
import type { TaskData as TaskDataType } from "@/types/artifact";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TaskData extends TaskDataType {
  sourceCommentId?: string | null;
}

interface ShellTasksTabProps {
  versionId: string;
  tasks: TaskData[];
  onTaskCreated?: () => void;
  variant?: "light" | "dark";
  isReadOnly?: boolean;
}

const PRIORITY_CONFIG = {
  urgent: { label: "紧急", color: "bg-red-100 text-red-600", darkColor: "bg-red-500/20 text-red-400" },
  normal: { label: "普通", color: "bg-slate-100 text-slate-600", darkColor: "bg-slate-500/20 text-slate-400" },
  low: { label: "低", color: "bg-gray-100 text-gray-500", darkColor: "bg-gray-500/20 text-gray-400" },
};

const STATUS_CONFIG = {
  open: { label: "待处理", icon: ListTodo },
  in_progress: { label: "进行中", icon: Play },
  done: { label: "已完成", icon: Check },
  cancelled: { label: "已取消", icon: AlertCircle },
};

export function ShellTasksTab({
  versionId,
  tasks,
  onTaskCreated,
  variant = "light",
  isReadOnly = false,
}: ShellTasksTabProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask({
        versionId,
        title: newTaskTitle,
      });
      setNewTaskTitle("");
      onTaskCreated?.();
    } catch (err) {
      console.error("Failed to create task:", err);
      alert("任务创建失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskData["status"]) => {
    setUpdatingTaskId(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
      onTaskCreated?.();
    } catch (err) {
      console.error("Failed to update task status:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const baseStyles = variant === "light" ? "text-[#0B1B2B]" : "text-white";
  const subTextStyles = variant === "light" ? "text-slate-500" : "text-slate-400";
  const cardStyles = variant === "light"
    ? "bg-white border-[#E7E0D3]"
    : "bg-[#10263B]/30 border-[#10263B]/50";
  const inputStyles = variant === "light"
    ? "bg-[#F7F3EA] border-[#E7E0D3] text-[#0B1B2B] placeholder:text-slate-400 focus:border-[#D4AF37]"
    : "bg-[#10263B]/50 border-[#10263B] text-white placeholder:text-slate-500 focus:border-[#D4AF37]";

  const openTasks = tasks.filter((t) => t.status === "open");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "cancelled");

  const TaskCard = ({ task }: { task: TaskData }) => {
    const isUpdating = updatingTaskId === task.id;
    const priorityConfig = PRIORITY_CONFIG[task.priority];
    const statusConfig = STATUS_CONFIG[task.status];
    const StatusIcon = statusConfig.icon;

    return (
      <div className={`rounded-xl border p-3 ${cardStyles}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${baseStyles} ${task.status === "done" ? "line-through opacity-60" : ""}`}>
              {task.title}
            </p>
            {task.sourceCommentId && (
              <span className={`text-[10px] ${subTextStyles}`}>来自评论</span>
            )}
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
            variant === "light" ? priorityConfig.color : priorityConfig.darkColor
          }`}>
            {priorityConfig.label}
          </span>
        </div>

        <div className={`flex items-center gap-3 text-xs ${subTextStyles}`}>
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {task.assigneeName}
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: zhCN })}
            </span>
          )}
        </div>

        {/* Status Actions */}
        {!isReadOnly && task.status !== "done" && task.status !== "cancelled" && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-dashed border-slate-200/30">
            {task.status === "open" && (
              <button
                onClick={() => handleStatusChange(task.id, "in_progress")}
                disabled={isUpdating}
                className={`p-1.5 rounded-lg transition-colors ${
                  variant === "light" ? "hover:bg-blue-50 text-blue-600" : "hover:bg-blue-500/20 text-blue-400"
                }`}
                title="开始"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              </button>
            )}
            {task.status === "in_progress" && (
              <>
                <button
                  onClick={() => handleStatusChange(task.id, "open")}
                  disabled={isUpdating}
                  className={`p-1.5 rounded-lg transition-colors ${
                    variant === "light" ? "hover:bg-slate-100" : "hover:bg-white/10"
                  }`}
                  title="暂停"
                >
                  <Pause size={14} className={subTextStyles} />
                </button>
                <button
                  onClick={() => handleStatusChange(task.id, "done")}
                  disabled={isUpdating}
                  className={`p-1.5 rounded-lg transition-colors ${
                    variant === "light" ? "hover:bg-emerald-50 text-emerald-600" : "hover:bg-emerald-500/20 text-emerald-400"
                  }`}
                  title="完成"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
              </>
            )}
          </div>
        )}

        {/* Done indicator */}
        {task.status === "done" && (
          <div className={`flex items-center gap-1 mt-2 text-xs text-emerald-500`}>
            <Check size={12} />
            已完成
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Quick Create Task */}
      {!isReadOnly && (
        <div className={`rounded-xl border p-3 ${cardStyles}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
              placeholder="快速添加任务..."
              className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 ${inputStyles}`}
            />
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isSubmitting}
              className={`p-2 rounded-lg transition-colors
                ${variant === "light"
                  ? "bg-[#0B1B2B] text-white hover:bg-[#10263B]"
                  : "bg-[#D4AF37] text-[#0B1B2B] hover:bg-[#B8965B]"
                }
                disabled:opacity-50
              `}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className={`text-center py-8 ${subTextStyles}`}>
          <ListTodo size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无任务</p>
          {!isReadOnly && (
            <p className="text-xs mt-1">从评论转换或直接创建任务</p>
          )}
        </div>
      ) : (
        <>
          {/* Open Tasks */}
          {openTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-xs font-medium ${subTextStyles} uppercase tracking-wider`}>
                待处理 ({openTasks.length})
              </h4>
              {openTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* In Progress Tasks */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-xs font-medium ${subTextStyles} uppercase tracking-wider`}>
                进行中 ({inProgressTasks.length})
              </h4>
              {inProgressTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* Done Tasks */}
          {doneTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-xs font-medium ${subTextStyles} uppercase tracking-wider`}>
                已完成 ({doneTasks.length})
              </h4>
              {doneTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
