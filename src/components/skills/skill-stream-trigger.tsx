"use client";

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { executeSkillStream } from '@/lib/skills/client';
import type { SkillRequest } from '@/lib/skills/types';

// ==================== Types ====================

interface SkillStreamTriggerProps {
  skillName: string;
  displayName: string;
  description?: string;
  entityType: SkillRequest['entityType'];
  entityId: string;
  input: Record<string, unknown>;
  evidenceIds?: string[];
  useCompanyProfile?: boolean;
  onComplete?: (versionId: string) => void;
  onError?: (error: Error) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
}

// ==================== Component ====================

export function SkillStreamTrigger({
  skillName,
  displayName,
  description,
  entityType,
  entityId,
  input,
  evidenceIds,
  useCompanyProfile = true,
  onComplete,
  onError,
  variant = 'outline',
  size = 'sm',
  className,
  disabled,
}: SkillStreamTriggerProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content]);

  const handleStart = async () => {
    setIsStreaming(true);
    setShowDialog(true);
    setContent('');
    setError(null);
    setIsComplete(false);

    try {
      const request: SkillRequest = {
        entityType,
        entityId,
        input,
        mode: 'generate',
        evidenceIds,
        useCompanyProfile,
      };

      await executeSkillStream(skillName, request, {
        onChunk: (chunk) => {
          setContent((prev) => prev + chunk);
        },
        onDone: (fullContent) => {
          setIsComplete(true);
          setContent(fullContent);
          // 尝试解析 versionId (从响应头或其他方式)
          // 目前先模拟一个
          setTimeout(() => {
            onComplete?.('stream-complete');
          }, 500);
        },
        onError: (err) => {
          setError(err.message);
          onError?.(err);
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClose = () => {
    if (isStreaming) {
      // 正在流式传输时不能关闭
      return;
    }
    setShowDialog(false);
    setContent('');
    setError(null);
    setIsComplete(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // 复制失败静默处理
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleStart}
        disabled={disabled || isStreaming}
        className={className}
      >
        {isStreaming ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {isStreaming ? '生成中...' : displayName}
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {isStreaming ? (
                <>
                  <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                  <span className="text-[#D4AF37]">AI 正在思考中...</span>
                </>
              ) : isComplete ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>生成完成</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-500">生成失败</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  <span>{displayName}</span>
                </>
              )}
            </DialogTitle>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </DialogHeader>

          {/* 错误显示 */}
          {error && (
            <div className="flex-shrink-0 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            </div>
          )}

          {/* 内容区域 */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto bg-slate-50 rounded-lg p-4 min-h-[300px] max-h-[500px]"
          >
            {content ? (
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
                {content}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                {isStreaming ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    等待 AI 响应...
                  </span>
                ) : (
                  <span>暂无内容</span>
                )}
              </div>
            )}
          </div>

          {/* 操作栏 */}
          <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-slate-400">
              {content.length > 0 && (
                <span>{content.length} 字符</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {content && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isStreaming}
              >
                {isStreaming ? (
                  '生成中...'
                ) : isComplete ? (
                  '关闭'
                ) : (
                  '取消'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
