"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { requestChanges, approveVersion } from "@/actions/approval";
import type { ArtifactStatusValue } from "@/types/artifact";

interface ApprovalActionBarProps {
  versionId: string;
  currentStatus: ArtifactStatusValue;
  onStatusChange?: (newStatus: ArtifactStatusValue) => void;
  variant?: "light" | "dark";
}

export function ApprovalActionBar({
  versionId,
  currentStatus,
  onStatusChange,
  variant = "light",
}: ApprovalActionBarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isLoading, setIsLoading] = useState<"approve" | "reject" | null>(null);

  // 只在 in_review 状态显示审批操作
  if (currentStatus !== "in_review") {
    return null;
  }

  const handleApprove = async () => {
    if (!confirm("确定批准此版本？批准后内容将被锁定。")) return;
    
    setIsLoading("approve");
    try {
      const result = await approveVersion(versionId);
      onStatusChange?.(result.newStatus);
    } catch (err) {
      console.error("Failed to approve:", err);
      alert("批准失败，请重试");
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      alert("请填写修改原因");
      return;
    }

    setIsLoading("reject");
    try {
      const result = await requestChanges(versionId, rejectNote);
      onStatusChange?.(result.newStatus);
      setShowRejectDialog(false);
      setRejectNote("");
    } catch (err) {
      console.error("Failed to request changes:", err);
      alert("操作失败，请重试");
    } finally {
      setIsLoading(null);
    }
  };

  const baseStyles = variant === "light"
    ? "bg-[#FFFCF6] border-[#E7E0D3]"
    : "bg-[#10263B]/30 border-[#10263B]/50";

  return (
    <>
      <div className={`rounded-xl border p-3 ${baseStyles}`}>
        <p className={`text-xs mb-3 ${variant === "light" ? "text-slate-500" : "text-slate-400"}`}>
          此版本正在等待审批
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading !== null}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${variant === "light" 
                ? "border border-orange-300 text-orange-600 hover:bg-orange-50" 
                : "border border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              }
              disabled:opacity-50
            `}
          >
            {isLoading === "reject" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <AlertTriangle size={14} />
            )}
            请求修改
          </button>
          <button
            onClick={handleApprove}
            disabled={isLoading !== null}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${variant === "light"
                ? "bg-[#D4AF37] text-[#0B1B2B] hover:bg-[#B8965B]"
                : "bg-[#D4AF37] text-[#0B1B2B] hover:bg-[#B8965B]"
              }
              disabled:opacity-50
            `}
          >
            {isLoading === "approve" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            批准此版本
          </button>
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${
            variant === "light" ? "bg-white" : "bg-[#0B1B2B]"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                variant === "light" ? "text-[#0B1B2B]" : "text-white"
              }`}>
                请求修改
              </h3>
              <button
                onClick={() => setShowRejectDialog(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  variant === "light" ? "hover:bg-slate-100" : "hover:bg-white/10"
                }`}
              >
                <X size={18} className={variant === "light" ? "text-slate-500" : "text-slate-400"} />
              </button>
            </div>
            <p className={`text-sm mb-3 ${
              variant === "light" ? "text-slate-500" : "text-slate-400"
            }`}>
              请说明需要修改的原因，这将作为评论记录在版本历史中。
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="请输入修改原因..."
              rows={4}
              className={`w-full p-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 ${
                variant === "light"
                  ? "bg-[#F7F3EA] border-[#E7E0D3] text-[#0B1B2B] placeholder:text-slate-400"
                  : "bg-[#10263B]/50 border-[#10263B] text-white placeholder:text-slate-500"
              }`}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRejectDialog(false)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  variant === "light"
                    ? "border border-[#E7E0D3] text-slate-600 hover:bg-slate-50"
                    : "border border-[#10263B] text-slate-400 hover:bg-white/5"
                }`}
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading === "reject" || !rejectNote.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isLoading === "reject" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <AlertTriangle size={14} />
                )}
                确认请求修改
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
