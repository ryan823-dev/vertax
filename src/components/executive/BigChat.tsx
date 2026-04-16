"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantAction, AssistantReference, ExecutiveAssistantPayload } from "@/lib/executive-assistant/types";

export type Reference = AssistantReference;
export type StructuredResponse = ExecutiveAssistantPayload;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structuredContent?: StructuredResponse;
  timestamp: Date;
}

export interface QuickPrompt {
  label: string;
  icon?: React.ElementType;
  prompt: string;
}

export interface BigChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void>;
  onAction?: (action: AssistantAction) => Promise<void> | void;
  onRetryPrompt?: (prompt: string) => Promise<void> | void;
  isLoading?: boolean;
  quickPrompts?: QuickPrompt[];
  placeholder?: string;
  welcomeMessage?: string;
  onReset?: () => void;
  retryPrompt?: string | null;
  retryDescription?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  collapsed?: boolean;
  onExpand?: () => void;
  quickPromptMode?: "fill" | "send";
}

export function BigChat({
  messages,
  onSend,
  onAction,
  onRetryPrompt,
  isLoading = false,
  quickPrompts = [],
  placeholder = "告诉我你想看什么，我会把重点捞出来。",
  welcomeMessage = "我会结合首页经营数据、内容进度和商机状态，给你一个适合现在这一步的答案。",
  onReset,
  retryPrompt = null,
  retryDescription = "上一次提问没有成功发出，原问题还在这里。",
  title = "CEO 助手",
  subtitle = "在线 · 首页经营上下文已接入",
  className,
  collapsed = false,
  onExpand,
  quickPromptMode = "fill",
}: BigChatProps) {
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!collapsed) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [collapsed, messages, isLoading]);

  const resizeTextarea = useCallback((target: HTMLTextAreaElement | null) => {
    if (!target) {
      return;
    }

    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, collapsed ? 72 : 160)}px`;
  }, [collapsed]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    resizeTextarea(event.target);
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const value = inputValue.trim();
    onExpand?.();
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    await onSend(value);
  }, [inputValue, isLoading, onExpand, onSend]);

  const handleQuickPrompt = async (prompt: string) => {
    onExpand?.();

    if (quickPromptMode === "send") {
      await onSend(prompt);
      return;
    }

    setInputValue(prompt);
    requestAnimationFrame(() => {
      resizeTextarea(inputRef.current);
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  if (collapsed) {
    return (
      <div
        className={cn(
          "rounded-[28px] border border-[#E8E0D0] bg-[#F7F3E8] p-3 shadow-[0_12px_30px_-18px_rgba(11,18,32,0.55)]",
          className
        )}
      >
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-[56px] flex-1 resize-none rounded-[22px] border border-[#E8E0D0] bg-[#FCF8EF] px-5 py-4 text-[15px] leading-6 text-[#102034] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.22)]"
            aria-label="CEO 助手输入框"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#D4AF37] text-[#0B1220] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            aria-label="发送消息"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(10,16,24,0.96),rgba(8,12,20,0.98))] shadow-[0_22px_60px_-26px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(212,175,55,0.16)] text-[#D4AF37] shadow-[0_12px_30px_-18px_rgba(212,175,55,0.75)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F8F5EE] sm:text-base">{title}</h3>
            <p className="text-xs text-[rgba(248,245,238,0.62)]">{subtitle}</p>
          </div>
        </div>
        {onReset && hasMessages ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-medium text-[rgba(248,245,238,0.76)] transition hover:border-[rgba(212,175,55,0.32)] hover:text-[#F8F5EE]"
          >
            <RotateCcw size={14} />
            新对话
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {!hasMessages ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(212,175,55,0.14)] text-[#D4AF37]">
              <Sparkles size={28} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-[#F8F5EE]">首页经营上下文已就绪</p>
              <p className="mx-auto max-w-[42rem] text-sm leading-7 text-[rgba(248,245,238,0.68)]">
                {welcomeMessage}
              </p>
            </div>
            {quickPrompts.length > 0 ? (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => void handleQuickPrompt(prompt.prompt)}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.24)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-xs font-medium text-[rgba(248,245,238,0.76)] transition hover:border-[rgba(212,175,55,0.45)] hover:text-[#F8F5EE]"
                  >
                    {prompt.icon ? <prompt.icon size={13} /> : null}
                    {prompt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onAction={onAction}
              />
            ))}
            {isLoading ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[#D4AF37]">
                  <Loader2 size={16} className="animate-spin" />
                  正在整理经营结论...
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {hasMessages && quickPrompts.length > 0 ? (
        <div className="border-t border-[rgba(255,255,255,0.05)] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => void handleQuickPrompt(prompt.prompt)}
                className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-[rgba(248,245,238,0.72)] transition hover:border-[rgba(212,175,55,0.32)] hover:text-[#F8F5EE]"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 border-t border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(9,13,21,0.82),rgba(9,13,21,0.96))] px-4 py-4 backdrop-blur sm:px-6">
        {retryPrompt && onRetryPrompt ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[20px] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.1)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#F8F5EE]">发送未完成</p>
              <p className="text-xs leading-6 text-[rgba(248,245,238,0.72)]">{retryDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => void onRetryPrompt(retryPrompt)}
              disabled={isLoading}
              className="shrink-0 rounded-full border border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.14)] px-4 py-2 text-xs font-semibold text-[#F8F5EE] transition hover:border-[rgba(212,175,55,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              重试上一条
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-[64px] flex-1 resize-none rounded-[24px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-[15px] leading-6 text-[#F8F5EE] outline-none transition placeholder:text-[rgba(248,245,238,0.38)] focus:border-[rgba(212,175,55,0.45)] focus:ring-2 focus:ring-[rgba(212,175,55,0.2)]"
            aria-label="CEO 助手输入框"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#D4AF37] text-[#0B1220] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            aria-label="发送消息"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <p className="mt-2 text-xs text-[rgba(248,245,238,0.45)]">Enter 发送，Shift + Enter 换行</p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction?: (action: AssistantAction) => Promise<void> | void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-[#D4AF37] px-4 py-3 text-sm leading-7 text-[#0B1220] shadow-[0_16px_40px_-24px_rgba(212,175,55,0.75)]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.structuredContent) {
    return (
      <StructuredMessage
        content={message.structuredContent}
        timestamp={message.timestamp}
        onAction={onAction}
      />
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-[22px] rounded-bl-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm leading-7 text-[#F8F5EE]">
        <p className="whitespace-pre-wrap">{message.content}</p>
        <MessageTimestamp timestamp={message.timestamp} />
      </div>
    </div>
  );
}

function StructuredMessage({
  content,
  timestamp,
  onAction,
}: {
  content: StructuredResponse;
  timestamp: Date;
  onAction?: (action: AssistantAction) => Promise<void> | void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (action: AssistantAction) => {
    if (!onAction) {
      return;
    }

    const key =
      action.type === "open_module"
        ? `${action.type}:${action.href}`
        : action.type === "create_task"
          ? `${action.type}:${action.title}`
          : action.type;

    setActiveAction(key);
    try {
      await onAction(action);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-3">
        <div className="rounded-[22px] rounded-bl-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] px-5 py-4">
          <div className="mb-2 flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#D4AF37]" />
            <span className="text-xs font-semibold tracking-[0.18em] text-[#D4AF37] uppercase">Conclusion</span>
          </div>
          <p className="text-[15px] leading-7 text-[#F8F5EE]">{content.conclusion}</p>
        </div>

        {content.evidence?.length ? (
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowEvidence((value) => !value)}
              className="flex w-full items-center gap-2 text-left"
            >
              <FileText size={14} className="text-[rgba(248,245,238,0.58)]" />
              <span className="flex-1 text-xs font-medium text-[rgba(248,245,238,0.72)]">
                依据 ({content.evidence.length})
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "text-[rgba(248,245,238,0.58)] transition-transform",
                  showEvidence ? "rotate-180" : undefined
                )}
              />
            </button>
            {showEvidence ? (
              <div className="mt-3 space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
                {content.evidence.map((item) => (
                  <p key={item} className="flex gap-2 text-sm leading-6 text-[rgba(248,245,238,0.78)]">
                    <span className="text-[#D4AF37]">•</span>
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {content.suggestions?.length ? (
          <div className="rounded-[20px] border border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.08)] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb size={14} className="text-[#D4AF37]" />
              <span className="text-xs font-semibold tracking-[0.18em] text-[#D4AF37] uppercase">Suggestions</span>
            </div>
            <div className="space-y-2">
              {content.suggestions.map((item, index) => (
                <p key={item} className="flex gap-2 text-sm leading-6 text-[rgba(248,245,238,0.9)]">
                  <span className="min-w-4 text-[#D4AF37]">{index + 1}.</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {content.pendingConfirmation?.length ? (
          <div className="rounded-[20px] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.09)] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={14} className="text-[#F59E0B]" />
              <span className="text-xs font-semibold tracking-[0.18em] text-[#F59E0B] uppercase">Pending</span>
            </div>
            <div className="space-y-2">
              {content.pendingConfirmation.map((item) => (
                <p key={item} className="flex gap-2 text-sm leading-6 text-[rgba(248,245,238,0.86)]">
                  <span className="text-[#F59E0B]">•</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {content.actions?.length ? (
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-[#D4AF37]" />
              <span className="text-xs font-semibold tracking-[0.18em] text-[#D4AF37] uppercase">Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {content.actions.map((action) => {
                const key =
                  action.type === "open_module"
                    ? `${action.type}:${action.href}`
                    : action.type === "create_task"
                      ? `${action.type}:${action.title}`
                      : action.type;
                const isBusy = activeAction === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleAction(action)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.08)] px-4 py-2 text-xs font-semibold text-[#F8F5EE] transition hover:border-[rgba(212,175,55,0.5)] hover:bg-[rgba(212,175,55,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? <Loader2 size={13} className="animate-spin" /> : null}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {content.references?.length ? (
          <div className="px-1">
            <p className="mb-2 text-xs text-[rgba(248,245,238,0.45)]">引用来源</p>
            <div className="flex flex-wrap gap-2">
              {content.references.map((reference) => (
                <ReferenceChip key={`${reference.type}:${reference.id}`} reference={reference} />
              ))}
            </div>
          </div>
        ) : null}

        <MessageTimestamp timestamp={timestamp} />
      </div>
    </div>
  );
}

function MessageTimestamp({ timestamp }: { timestamp: Date }) {
  return (
    <p className="mt-2 text-xs text-[rgba(248,245,238,0.42)]">
      {timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
    </p>
  );
}

function ReferenceChip({ reference }: { reference: Reference }) {
  const content = (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs text-[rgba(248,245,238,0.78)] transition hover:border-[rgba(212,175,55,0.3)] hover:text-[#F8F5EE]">
      <FileText size={11} />
      {reference.title}
      {reference.href ? <ExternalLink size={10} /> : null}
    </span>
  );

  return reference.href ? (
    <Link href={reference.href}>{content}</Link>
  ) : (
    content
  );
}
