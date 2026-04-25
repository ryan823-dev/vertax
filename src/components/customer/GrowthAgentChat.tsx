"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
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
import type {
  AssistantAction,
  AssistantReference,
  GrowthAgentPayload,
} from "@/lib/growth-agent/types";

export type Reference = AssistantReference;
export type StructuredResponse = GrowthAgentPayload;

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

export interface GrowthAgentChatProps {
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

export function GrowthAgentChat({
  messages,
  onSend,
  onAction,
  onRetryPrompt,
  isLoading = false,
  quickPrompts = [],
  placeholder = "把今天的判断或问题交给我，我会整理成下一步动作。",
  welcomeMessage = "你可以直接问我：现在该先推进什么、哪个客户值得跟进、哪里需要拍板。",
  onReset,
  retryPrompt = null,
  retryDescription = "上一条问题没有成功发出，你可以直接重试。",
  title = "AI 出海助理",
  subtitle = "在线 · 正在跟进当前进展",
  className,
  collapsed = false,
  onExpand,
  quickPromptMode = "fill",
}: GrowthAgentChatProps) {
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!collapsed) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [collapsed, messages, isLoading]);

  const resizeTextarea = useCallback(
    (target: HTMLTextAreaElement | null) => {
      if (!target) return;

      target.style.height = "auto";
      target.style.height = `${Math.min(
        target.scrollHeight,
        collapsed ? 84 : 160,
      )}px`;
    },
    [collapsed],
  );

  const handleInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
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

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
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
          "ci-panel-strong rounded-xl border border-[var(--ci-border)] p-3",
          className,
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
            className="min-h-[60px] flex-1 resize-none rounded-lg border border-[var(--ci-border)] bg-white/85 px-4 py-4 text-[15px] leading-6 text-[var(--ci-text)] outline-none transition placeholder:text-[var(--ci-text-muted)] focus:border-[var(--ci-accent)] focus:ring-2 focus:ring-[rgba(79,141,246,0.18)]"
            aria-label="AI 助理输入框"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--ci-accent)] text-white transition-colors hover:bg-[var(--ci-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发送消息"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "ci-panel-strong flex h-full flex-col overflow-hidden rounded-xl border border-[var(--ci-border)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--ci-border)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent-strong)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--ci-text)] sm:text-base">
              {title}
            </h3>
            <p className="text-xs text-[var(--ci-text-muted)]">{subtitle}</p>
          </div>
        </div>

        {onReset && hasMessages ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-border)] bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--ci-text-secondary)] transition hover:border-[var(--ci-border-strong)] hover:bg-white"
          >
            <RotateCcw size={14} />
            新对话
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto bg-[rgba(248,250,252,0.72)] px-4 py-5 sm:px-6">
        {!hasMessages ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent-strong)]">
              <Sparkles size={28} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-[var(--ci-text)]">
                可以开始推进
              </p>
              <p className="mx-auto max-w-[42rem] text-sm leading-7 text-[var(--ci-text-secondary)]">
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
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--ci-border)] bg-white/75 px-3 py-2 text-xs font-medium text-[var(--ci-text-secondary)] transition hover:border-[rgba(79,141,246,0.24)] hover:bg-white hover:text-[var(--ci-text)]"
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
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--ci-border)] bg-white/80 px-4 py-3 text-sm text-[var(--ci-accent-strong)]">
                  <Loader2 size={16} className="animate-spin" />
                  正在形成建议...
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {hasMessages && quickPrompts.length > 0 ? (
        <div className="border-t border-[var(--ci-border)] bg-[rgba(255,255,255,0.64)] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => void handleQuickPrompt(prompt.prompt)}
                className="rounded-md border border-[var(--ci-border)] bg-white/70 px-3 py-1.5 text-xs text-[var(--ci-text-secondary)] transition hover:border-[rgba(79,141,246,0.24)] hover:bg-white hover:text-[var(--ci-text)]"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 border-t border-[var(--ci-border)] bg-[rgba(247,250,252,0.88)] px-4 py-4 backdrop-blur sm:px-6">
        {retryPrompt && onRetryPrompt ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[rgba(217,119,6,0.16)] bg-[rgba(217,119,6,0.08)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ci-text)]">
                发送未完成
              </p>
              <p className="text-xs leading-6 text-[var(--ci-text-secondary)]">
                {retryDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRetryPrompt(retryPrompt)}
              disabled={isLoading}
              className="shrink-0 rounded-md border border-[rgba(79,141,246,0.18)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ci-accent-strong)] transition hover:border-[rgba(79,141,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
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
            className="min-h-[64px] flex-1 resize-none rounded-lg border border-[var(--ci-border)] bg-white/85 px-4 py-4 text-[15px] leading-6 text-[var(--ci-text)] outline-none transition placeholder:text-[var(--ci-text-muted)] focus:border-[var(--ci-accent)] focus:ring-2 focus:ring-[rgba(79,141,246,0.18)]"
            aria-label="AI 助理输入框"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--ci-accent)] text-white transition-colors hover:bg-[var(--ci-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发送消息"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--ci-text-muted)]">
          Enter 发送，Shift + Enter 换行
        </p>
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
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-[var(--ci-accent)] px-4 py-3 text-sm leading-7 text-white">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <MessageTimestamp timestamp={message.timestamp} tone="inverse" />
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
      <div className="max-w-[88%] rounded-lg rounded-bl-sm border border-[var(--ci-border)] bg-white/88 px-4 py-3 text-sm leading-7 text-[var(--ci-text)]">
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
    if (!onAction) return;

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
        <div className="rounded-xl border border-[var(--ci-border)] bg-white/92 px-5 py-4">
          <div className="mb-2 flex items-start gap-2">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0 text-[var(--ci-accent-strong)]"
            />
            <span className="ci-kicker text-[var(--ci-accent-strong)]">
              判断
            </span>
          </div>
          <p className="text-[15px] leading-7 text-[var(--ci-text)]">
            {content.conclusion}
          </p>
        </div>

        {content.evidence?.length ? (
          <div className="rounded-lg border border-[var(--ci-border)] bg-[rgba(255,255,255,0.7)] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowEvidence((value) => !value)}
              className="flex w-full items-center gap-2 text-left"
            >
              <FileText size={14} className="text-[var(--ci-text-muted)]" />
              <span className="flex-1 text-xs font-medium text-[var(--ci-text-secondary)]">
                判断依据 ({content.evidence.length})
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "text-[var(--ci-text-muted)] transition-transform",
                  showEvidence ? "rotate-180" : undefined,
                )}
              />
            </button>

            {showEvidence ? (
              <div className="mt-3 space-y-2 border-t border-[var(--ci-border)] pt-3">
                {content.evidence.map((item) => (
                  <p
                    key={item}
                    className="flex gap-2 text-sm leading-6 text-[var(--ci-text-secondary)]"
                  >
                    <span className="text-[var(--ci-accent)]">•</span>
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {content.suggestions?.length ? (
          <div className="rounded-lg border border-[rgba(79,141,246,0.16)] bg-[rgba(79,141,246,0.08)] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb size={14} className="text-[var(--ci-accent-strong)]" />
              <span className="ci-kicker text-[var(--ci-accent-strong)]">
                建议动作
              </span>
            </div>
            <div className="space-y-2">
              {content.suggestions.map((item, index) => (
                <p
                  key={item}
                  className="flex gap-2 text-sm leading-6 text-[var(--ci-text)]"
                >
                  <span className="min-w-4 text-[var(--ci-accent-strong)]">
                    {index + 1}.
                  </span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {content.pendingConfirmation?.length ? (
          <div className="rounded-lg border border-[rgba(217,119,6,0.16)] bg-[rgba(217,119,6,0.08)] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={14} className="text-[var(--ci-warning)]" />
              <span className="ci-kicker text-[var(--ci-warning)]">
                需要确认
              </span>
            </div>
            <div className="space-y-2">
              {content.pendingConfirmation.map((item) => (
                <p
                  key={item}
                  className="flex gap-2 text-sm leading-6 text-[var(--ci-text)]"
                >
                  <span className="text-[var(--ci-warning)]">•</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {content.actions?.length ? (
          <div className="rounded-lg border border-[var(--ci-border)] bg-white/75 px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--ci-accent-strong)]" />
              <span className="ci-kicker text-[var(--ci-accent-strong)]">
                继续推进
              </span>
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
                    className="inline-flex items-center gap-2 rounded-md border border-[rgba(79,141,246,0.18)] bg-[rgba(79,141,246,0.08)] px-4 py-2 text-xs font-semibold text-[var(--ci-accent-strong)] transition hover:border-[rgba(79,141,246,0.3)] hover:bg-[rgba(79,141,246,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ArrowUpRight size={13} />
                    )}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {content.references?.length ? (
          <div className="px-1">
            <p className="mb-2 text-xs text-[var(--ci-text-muted)]">相关记录</p>
            <div className="flex flex-wrap gap-2">
              {content.references.map((reference) => (
                <ReferenceChip
                  key={`${reference.type}:${reference.id}`}
                  reference={reference}
                />
              ))}
            </div>
          </div>
        ) : null}

        <MessageTimestamp timestamp={timestamp} />
      </div>
    </div>
  );
}

function MessageTimestamp({
  timestamp,
  tone = "normal",
}: {
  timestamp: Date;
  tone?: "normal" | "inverse";
}) {
  return (
    <p
      className={cn(
        "mt-2 text-xs",
        tone === "inverse"
          ? "text-white/72"
          : "text-[var(--ci-text-muted)]",
      )}
    >
      {timestamp.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>
  );
}

function ReferenceChip({ reference }: { reference: Reference }) {
  const content = (
    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--ci-border)] bg-white/70 px-3 py-1.5 text-xs text-[var(--ci-text-secondary)] transition hover:border-[rgba(79,141,246,0.24)] hover:text-[var(--ci-text)]">
      <FileText size={11} />
      {reference.title}
      {reference.href ? <ExternalLink size={10} /> : null}
    </span>
  );

  return reference.href ? <Link href={reference.href}>{content}</Link> : content;
}
