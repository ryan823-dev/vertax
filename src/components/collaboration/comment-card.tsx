"use client";

import { useState } from "react";
import { MessageSquare, Check, ListTodo, Reply } from "lucide-react";
import { AnchorBadge } from "./anchor-badge";
import type { CommentData, AnchorSpec } from "@/types/artifact";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface CommentCardProps {
  comment: CommentData;
  onReply?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
  onConvertToTask?: (commentId: string) => void;
  onAnchorClick?: (anchor: AnchorSpec) => void;
  showActions?: boolean;
  variant?: "light" | "dark";
}

export function CommentCard({
  comment,
  onReply,
  onResolve,
  onConvertToTask,
  onAnchorClick,
  showActions = true,
  variant = "light",
}: CommentCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const isResolved = !!comment.resolvedAt;
  const hasAnchor = comment.anchorType && comment.anchorValue && comment.anchorLabel;

  const baseStyles = variant === "light" 
    ? "bg-white border-[#E7E0D3] text-[#0B1B2B]"
    : "bg-[#10263B]/30 border-[#10263B]/50 text-white";

  const subTextStyles = variant === "light"
    ? "text-slate-500"
    : "text-slate-400";

  const handleAnchorClick = () => {
    if (hasAnchor && onAnchorClick) {
      onAnchorClick({
        type: comment.anchorType!,
        value: comment.anchorValue!,
        label: comment.anchorLabel!,
      });
    }
  };

  return (
    <div className={`rounded-xl border p-3 ${baseStyles} ${isResolved ? "opacity-60" : ""}`}>
      {/* Header: Author + Time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            variant === "light" ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-[#D4AF37]/30 text-[#D4AF37]"
          }`}>
            {comment.authorName?.charAt(0) || "U"}
          </div>
          <span className="text-sm font-medium">{comment.authorName || "未知用户"}</span>
          <span className={`text-xs ${subTextStyles}`}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN })}
          </span>
        </div>
        {isResolved && (
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <Check size={12} />
            已解决
          </span>
        )}
      </div>

      {/* Anchor Badge */}
      {hasAnchor && (
        <div className="mb-2">
          <AnchorBadge
            type={comment.anchorType!}
            label={comment.anchorLabel!}
            onClick={handleAnchorClick}
          />
        </div>
      )}

      {/* Content */}
      <p className={`text-sm ${subTextStyles} whitespace-pre-wrap`}>{comment.content}</p>

      {/* Actions */}
      {showActions && !isResolved && (
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-dashed border-slate-200/50">
          {onReply && (
            <button
              onClick={() => onReply(comment.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                variant === "light" ? "hover:bg-slate-100" : "hover:bg-white/10"
              }`}
              title="回复"
            >
              <Reply size={14} className={subTextStyles} />
            </button>
          )}
          {onResolve && (
            <button
              onClick={() => onResolve(comment.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                variant === "light" ? "hover:bg-emerald-50 text-emerald-600" : "hover:bg-emerald-500/20 text-emerald-400"
              }`}
              title="标记为已解决"
            >
              <Check size={14} />
            </button>
          )}
          {onConvertToTask && !comment.linkedTaskId && (
            <button
              onClick={() => onConvertToTask(comment.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                variant === "light" ? "hover:bg-blue-50 text-blue-600" : "hover:bg-blue-500/20 text-blue-400"
              }`}
              title="转为任务"
            >
              <ListTodo size={14} />
            </button>
          )}
          {comment.linkedTaskId && (
            <span className={`text-xs ${subTextStyles} flex items-center gap-1 ml-2`}>
              <ListTodo size={12} />
              已关联任务
            </span>
          )}
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className={`text-xs ${subTextStyles} hover:underline flex items-center gap-1`}
          >
            <MessageSquare size={12} />
            {showReplies ? "收起" : `${comment.replies.length} 条回复`}
          </button>
          {showReplies && (
            <div className="mt-2 pl-3 border-l-2 border-slate-200/50 space-y-2">
              {comment.replies.map((reply) => (
                <div key={reply.id} className={`text-sm ${subTextStyles}`}>
                  <span className="font-medium">{reply.authorName}</span>
                  <span className="mx-1">·</span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: zhCN })}
                  </span>
                  <p className="mt-1">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
