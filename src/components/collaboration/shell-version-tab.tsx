"use client";

import { useState } from "react";
import { GitBranch, Clock, User, RotateCcw, Loader2, Lock, Send } from "lucide-react";
import { ApprovalActionBar } from "./approval-action-bar";
import { submitForReview } from "@/actions/approval";
import type { ArtifactStatusValue } from "@/types/artifact";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface VersionData {
  id: string;
  version: number;
  status: ArtifactStatusValue;
  createdAt: Date;
  createdByName?: string;
  changeNote?: string;
}

interface ShellVersionTabProps {
  versions: VersionData[];
  currentVersionId: string;
  onVersionSelect?: (versionId: string) => void;
  onStatusChange?: (newStatus: ArtifactStatusValue) => void;
  onRevert?: (versionId: string) => void;
  variant?: "light" | "dark";
}

const STATUS_LABELS: Record<ArtifactStatusValue, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-slate-100 text-slate-600" },
  in_review: { label: "审核中", color: "bg-blue-100 text-blue-600" },
  client_feedback: { label: "待反馈", color: "bg-orange-100 text-orange-600" },
  revised: { label: "已修订", color: "bg-purple-100 text-purple-600" },
  approved: { label: "已批准", color: "bg-emerald-100 text-emerald-600" },
  published: { label: "已发布", color: "bg-green-100 text-green-600" },
  archived: { label: "已归档", color: "bg-gray-100 text-gray-500" },
};

export function ShellVersionTab({
  versions,
  currentVersionId,
  onVersionSelect,
  onStatusChange,
  onRevert,
  variant = "light",
}: ShellVersionTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentVersion = versions.find((v) => v.id === currentVersionId);

  const handleSubmitForReview = async () => {
    if (!currentVersion) return;
    
    setIsSubmitting(true);
    try {
      const result = await submitForReview(currentVersionId);
      onStatusChange?.(result.newStatus);
    } catch (err) {
      console.error("Failed to submit for review:", err);
      alert("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseStyles = variant === "light"
    ? "text-[#0B1B2B]"
    : "text-white";

  const subTextStyles = variant === "light"
    ? "text-slate-500"
    : "text-slate-400";

  const cardStyles = variant === "light"
    ? "bg-white border-[#E7E0D3] hover:border-[#D4AF37]/50"
    : "bg-[#10263B]/30 border-[#10263B]/50 hover:border-[#D4AF37]/50";

  const activeCardStyles = variant === "light"
    ? "bg-[#FFFCF6] border-[#D4AF37]"
    : "bg-[#D4AF37]/10 border-[#D4AF37]";

  return (
    <div className="space-y-4">
      {/* Current Version Status */}
      {currentVersion && (
        <div className={`rounded-xl border p-3 ${cardStyles}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${baseStyles}`}>当前版本</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[currentVersion.status].color}`}>
              {STATUS_LABELS[currentVersion.status].label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <GitBranch size={12} className={subTextStyles} />
            <span className={subTextStyles}>v{currentVersion.version}</span>
            <span className={subTextStyles}>·</span>
            <Clock size={12} className={subTextStyles} />
            <span className={subTextStyles}>
              {formatDistanceToNow(new Date(currentVersion.createdAt), { addSuffix: true, locale: zhCN })}
            </span>
          </div>

          {/* Submit for Review Button - only for draft/revised */}
          {(currentVersion.status === "draft" || currentVersion.status === "revised") && (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${variant === "light"
                  ? "bg-[#0B1B2B] text-white hover:bg-[#10263B]"
                  : "bg-[#D4AF37] text-[#0B1B2B] hover:bg-[#B8965B]"
                }
                disabled:opacity-50
              `}
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              提交审核
            </button>
          )}
        </div>
      )}

      {/* Approval Actions - only for in_review */}
      {currentVersion && (
        <ApprovalActionBar
          versionId={currentVersionId}
          currentStatus={currentVersion.status}
          onStatusChange={onStatusChange}
          variant={variant}
        />
      )}

      {/* Version History List */}
      <div className="space-y-2">
        <h4 className={`text-xs font-medium ${subTextStyles} uppercase tracking-wider`}>
          版本历史
        </h4>
        {versions.map((version) => {
          const isActive = version.id === currentVersionId;
          const isLocked = version.status === "approved" || version.status === "archived";

          return (
            <div
              key={version.id}
              onClick={() => onVersionSelect?.(version.id)}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                isActive ? activeCardStyles : cardStyles
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${baseStyles}`}>v{version.version}</span>
                  {isLocked && <Lock size={12} className={subTextStyles} />}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_LABELS[version.status].color}`}>
                  {STATUS_LABELS[version.status].label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <User size={10} className={subTextStyles} />
                <span className={subTextStyles}>{version.createdByName || "未知"}</span>
                <span className={subTextStyles}>·</span>
                <span className={subTextStyles}>
                  {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true, locale: zhCN })}
                </span>
              </div>
              {version.changeNote && (
                <p className={`text-xs mt-1 ${subTextStyles} truncate`}>{version.changeNote}</p>
              )}

              {/* Revert Button */}
              {!isActive && onRevert && !isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevert(version.id);
                  }}
                  className={`mt-2 flex items-center gap-1 text-xs ${
                    variant === "light" ? "text-[#D4AF37] hover:underline" : "text-[#D4AF37] hover:underline"
                  }`}
                >
                  <RotateCcw size={12} />
                  回滚到此版本
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
