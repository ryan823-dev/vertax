"use client";

import { useState } from "react";
import { MessageSquarePlus, Loader2, MapPin, Send } from "lucide-react";
import { CommentCard } from "./comment-card";
import { createComment, resolveComment, convertCommentToTask } from "@/actions/collaboration";
import type { CommentData, AnchorSpec } from "@/types/artifact";

interface ShellCommentsTabProps {
  versionId: string;
  comments: CommentData[];
  activeAnchor?: AnchorSpec | null;
  onAnchorClick?: (anchor: AnchorSpec) => void;
  onCommentCreated?: () => void;
  variant?: "light" | "dark";
  isReadOnly?: boolean;
}

export function ShellCommentsTab({
  versionId,
  comments,
  activeAnchor,
  onAnchorClick,
  onCommentCreated,
  variant = "light",
  isReadOnly = false,
}: ShellCommentsTabProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await createComment({
        versionId,
        content: newComment,
        parentId: replyingTo || undefined,
        anchor: activeAnchor || undefined,
      });
      setNewComment("");
      setReplyingTo(null);
      onCommentCreated?.();
    } catch (err) {
      console.error("Failed to create comment:", err);
      alert("评论创建失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      await resolveComment(commentId);
      onCommentCreated?.();
    } catch (err) {
      console.error("Failed to resolve comment:", err);
    }
  };

  const handleConvertToTask = async (commentId: string) => {
    const title = prompt("任务标题（留空使用评论内容）:");
    if (title === null) return; // User cancelled

    try {
      await convertCommentToTask(commentId, { title: title || "" });
      onCommentCreated?.();
    } catch (err) {
      console.error("Failed to convert to task:", err);
      alert("转换失败，请重试");
    }
  };

  const baseStyles = variant === "light"
    ? "text-[#0B1B2B]"
    : "text-white";

  const subTextStyles = variant === "light"
    ? "text-slate-500"
    : "text-slate-400";

  const inputStyles = variant === "light"
    ? "bg-[#F7F3EA] border-[#E7E0D3] text-[#0B1B2B] placeholder:text-slate-400 focus:border-[#D4AF37]"
    : "bg-[#10263B]/50 border-[#10263B] text-white placeholder:text-slate-500 focus:border-[#D4AF37]";

  const unresolvedComments = comments.filter((c) => !c.resolvedAt);
  const resolvedComments = comments.filter((c) => c.resolvedAt);

  return (
    <div className="space-y-4">
      {/* New Comment Input */}
      {!isReadOnly && (
        <div className={`rounded-xl border p-3 ${
          variant === "light" ? "bg-white border-[#E7E0D3]" : "bg-[#10263B]/30 border-[#10263B]/50"
        }`}>
          {/* Active Anchor Indicator */}
          {activeAnchor && (
            <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-xs ${
              variant === "light" ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-[#D4AF37]/20 text-[#D4AF37]"
            }`}>
              <MapPin size={12} />
              <span>将锚定到: {activeAnchor.label}</span>
            </div>
          )}

          {replyingTo && (
            <div className={`flex items-center justify-between mb-2 px-2 py-1 rounded-lg text-xs ${
              variant === "light" ? "bg-blue-50 text-blue-600" : "bg-blue-500/20 text-blue-400"
            }`}>
              <span>回复评论中...</span>
              <button onClick={() => setReplyingTo(null)} className="hover:underline">取消</button>
            </div>
          )}

          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "输入回复..." : "添加评论..."}
            rows={3}
            className={`w-full p-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 ${inputStyles}`}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
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
              发送
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      {unresolvedComments.length === 0 && resolvedComments.length === 0 ? (
        <div className={`text-center py-8 ${subTextStyles}`}>
          <MessageSquarePlus size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无评论</p>
          {!isReadOnly && (
            <p className="text-xs mt-1">在内容区域选择位置后添加评论</p>
          )}
        </div>
      ) : (
        <>
          {/* Unresolved Comments */}
          {unresolvedComments.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-xs font-medium ${subTextStyles} uppercase tracking-wider`}>
                待处理 ({unresolvedComments.length})
              </h4>
              {unresolvedComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onReply={(id) => setReplyingTo(id)}
                  onResolve={handleResolve}
                  onConvertToTask={handleConvertToTask}
                  onAnchorClick={onAnchorClick}
                  variant={variant}
                />
              ))}
            </div>
          )}

          {/* Resolved Comments */}
          {resolvedComments.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-xs font-medium ${subTextStyles} uppercase tracking-wider`}>
                已解决 ({resolvedComments.length})
              </h4>
              {resolvedComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  showActions={false}
                  onAnchorClick={onAnchorClick}
                  variant={variant}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
