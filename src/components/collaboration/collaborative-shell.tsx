"use client";

import { useState, useEffect, useCallback } from "react";
import { GitBranch, MessageSquare, ListTodo, Clock, RefreshCw, Lock } from "lucide-react";
import { ShellVersionTab } from "./shell-version-tab";
import { ShellCommentsTab } from "./shell-comments-tab";
import { ShellTasksTab } from "./shell-tasks-tab";
import { ShellHistoryTab, convertActivityToHistory } from "./shell-history-tab";
import { getVersionHistory, getVersionDetails } from "@/actions/approval";
import { getCommentsByVersion, getTasksByVersion, getEntityActivities, type ActivityEntry } from "@/actions/collaboration";
import { listVersions, getLatestVersion, revertToVersion } from "@/actions/versions";
import type { EntityType, AnchorSpec, AnchorType, ArtifactStatusValue, CommentData, TaskData } from "@/types/artifact";

type TabId = "versions" | "comments" | "tasks" | "history";

interface CollaborativeShellProps {
  entityType: EntityType;
  entityId: string;
  versionId?: string;
  anchorType: AnchorType;
  activeAnchor?: AnchorSpec | null;
  onAnchorClick?: (anchor: AnchorSpec) => void;
  onStatusChange?: (newStatus: ArtifactStatusValue) => void;
  onVersionChange?: (versionId: string) => void;
  variant?: "light" | "dark";
  className?: string;
}

interface VersionData {
  id: string;
  version: number;
  status: ArtifactStatusValue;
  createdAt: Date;
  createdByName?: string;
  changeNote?: string;
}

export function CollaborativeShell({
  entityType,
  entityId,
  versionId: initialVersionId,
  anchorType,
  activeAnchor,
  onAnchorClick,
  onStatusChange,
  onVersionChange,
  variant = "light",
  className = "",
}: CollaborativeShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("versions");
  const [isLoading, setIsLoading] = useState(true);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(initialVersionId || null);
  
  // Data
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [history, setHistory] = useState<ReturnType<typeof convertActivityToHistory>>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load versions
      const versionList = await listVersions(entityType, entityId);
      const mappedVersions: VersionData[] = versionList.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status as ArtifactStatusValue,
        createdAt: v.createdAt,
        createdByName: v.createdByName,
        changeNote: (v.meta as Record<string, unknown>)?.changeNote as string | undefined,
      }));
      setVersions(mappedVersions);

      // Determine current version
      let verId = currentVersionId;
      if (!verId && mappedVersions.length > 0) {
        // Use latest version
        verId = mappedVersions[0].id;
        setCurrentVersionId(verId);
        onVersionChange?.(verId);
      }

      if (verId) {
        // Load version details
        const details = await getVersionDetails(verId);
        setIsReadOnly(details.isReadOnly);

        // Load comments and tasks for this version
        const [commentList, taskList] = await Promise.all([
          getCommentsByVersion(verId),
          getTasksByVersion(verId),
        ]);
        setComments(commentList as CommentData[]);
        setTasks(taskList as TaskData[]);

        // Load activity history for this entity
        const activityList = await getEntityActivities(entityType, entityId);
        setHistory(convertActivityToHistory(activityList as any));
      }
    } catch (err) {
      console.error("Failed to load collaboration data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, currentVersionId, onVersionChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle version selection
  const handleVersionSelect = (verId: string) => {
    setCurrentVersionId(verId);
    onVersionChange?.(verId);
  };

  // Handle status change
  const handleStatusChange = (newStatus: ArtifactStatusValue) => {
    setIsReadOnly(newStatus === "approved" || newStatus === "archived");
    onStatusChange?.(newStatus);
    loadData(); // Reload data
  };

  // Handle revert
  const handleRevert = async (verId: string) => {
    if (!confirm("确定要回滚到此版本？这将创建一个新版本。")) return;
    
    try {
      const newVersion = await revertToVersion(verId);
      setCurrentVersionId(newVersion.id);
      onVersionChange?.(newVersion.id);
      loadData();
    } catch (err) {
      console.error("Failed to revert:", err);
      alert("回滚失败，请重试");
    }
  };

  // Styles
  const containerStyles = variant === "light"
    ? "bg-[#FFFCF6] border-[#E7E0D3]"
    : "bg-[#10263B]/20 border-[#10263B]/50";

  const tabStyles = (isActive: boolean) => {
    if (isActive) {
      return variant === "light"
        ? "bg-[#D4AF37] text-[#0B1B2B]"
        : "bg-[#D4AF37] text-[#0B1B2B]";
    }
    return variant === "light"
      ? "text-slate-500 hover:bg-[#F7F3EA]"
      : "text-slate-400 hover:bg-white/10";
  };

  const currentVersion = versions.find((v) => v.id === currentVersionId);

  const tabs: { id: TabId; label: string; icon: typeof GitBranch; count?: number }[] = [
    { id: "versions", label: "版本", icon: GitBranch, count: versions.length },
    { id: "comments", label: "批注", icon: MessageSquare, count: comments.filter((c) => !c.resolvedAt).length },
    { id: "tasks", label: "任务", icon: ListTodo, count: tasks.filter((t) => t.status !== "done").length },
    { id: "history", label: "历史", icon: Clock },
  ];

  return (
    <div className={`rounded-2xl border ${containerStyles} ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-inherit">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${variant === "light" ? "text-[#0B1B2B]" : "text-white"}`}>
            协作面板
          </h3>
          <div className="flex items-center gap-2">
            {isReadOnly && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                variant === "light" ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-[#D4AF37]/20 text-[#D4AF37]"
              }`}>
                <Lock size={10} />
                只读
              </span>
            )}
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className={`p-1.5 rounded-lg transition-colors ${
                variant === "light" ? "hover:bg-[#F7F3EA]" : "hover:bg-white/10"
              }`}
              title="刷新"
            >
              <RefreshCw size={14} className={`${isLoading ? "animate-spin" : ""} ${
                variant === "light" ? "text-slate-500" : "text-slate-400"
              }`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tabStyles(isActive)}`}
              >
                <Icon size={12} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? "bg-[#0B1B2B]/20"
                      : variant === "light" ? "bg-slate-200" : "bg-white/20"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-3 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className={`text-center py-8 ${variant === "light" ? "text-slate-500" : "text-slate-400"}`}>
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === "versions" && currentVersionId && (
              <ShellVersionTab
                versions={versions}
                currentVersionId={currentVersionId}
                onVersionSelect={handleVersionSelect}
                onStatusChange={handleStatusChange}
                onRevert={handleRevert}
                variant={variant}
              />
            )}
            {activeTab === "comments" && currentVersionId && (
              <ShellCommentsTab
                versionId={currentVersionId}
                comments={comments}
                activeAnchor={activeAnchor}
                onAnchorClick={onAnchorClick}
                onCommentCreated={loadData}
                variant={variant}
                isReadOnly={isReadOnly}
              />
            )}
            {activeTab === "tasks" && currentVersionId && (
              <ShellTasksTab
                versionId={currentVersionId}
                tasks={tasks}
                onTaskCreated={loadData}
                variant={variant}
                isReadOnly={isReadOnly}
              />
            )}
            {activeTab === "history" && (
              <ShellHistoryTab
                history={history}
                variant={variant}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
