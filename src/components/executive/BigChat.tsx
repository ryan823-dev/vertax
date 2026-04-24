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
  ExecutiveAssistantPayload,
} from "@/lib/executive-assistant/types";

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
  placeholder = "告诉我你想看什么，我会把上下文整理成可执行结论。",
  welcomeMessage = "我已经接入这个租户的经营、内容、线索和待办上下文。你可以直接问我：现在该先推进什么？",
  onReset,
  retryPrompt = null,
  retryDescription = "上一条问题没有成功发出，你可以直接重试，不需要重新组织表述。",
  title = "AI 执行助理",
  subtitle = "在线 · 已连接当前工作台上下文",
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
          "ci-panel-strong rounded-[28px] border border-[var(--ci-border)] p-3",
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
            className="min-h-[60px] flex-1 resize-none rounded-[22px] border border-[var(--ci-border)] bg-white/85 px-5 py-4 text-[15px] leading-6 text-[var(--ci-text)] outline-none transition placeholder:text-[var(--ci-text-muted)] focus:border-[var(--ci-accent)] focus:ring-2 focus:ring-[rgba(79,141,246,0.18)]"
            aria-label="AI 助理输入框"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[var(--ci-accent)] text-white transition hover:-translate-y-0.5 hover:bg-[var(--ci-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
        "ci-panel-strong flex h-full flex-col overflow-hidden rounded-[30px] border border-[var(--ci-border)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--ci-border)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(79,141,246,0.18),rgba(15,159,110,0.14))] text-[var(--ci-accent-strong)]">
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

      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,248,252,0.92))] px-4 py-5 sm:px-6">
        {!hasMessages ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent-strong)]">
              <Sparkles size={28} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-[var(--ci-text)]">
                上下文已连接
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
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--ci-border)] bg-white/75 px-4 py-2 text-xs font-medium text-[var(--ci-text-secondary)] transition hover:border-[rgba(79,141,246,0.24)] hover:bg-white hover:text-[var(--ci-text)]"
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
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--ci-border)] bg-white/80 px-4 py-3 text-sm text-[var(--ci-accent-strong)] shadow-[0_16px_30px_-24px_rgba(15,23,38,0.4)]">
                  <Loader2 size={16} className="animate-spin" />
                  正在整理工作台上下文...
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
                className="rounded-full border border-[var(--ci-border)] bg-white/70 px-3 py-1.5 text-xs text-[var(--ci-text-secondary)] transition hover:border-[rgba(79,141,246,0.24)] hover:bg-white hover:text-[var(--ci-text)]"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 border-t border-[var(--ci-border)] bg-[rgba(247,250,252,0.88)] px-4 py-4 backdrop-blur sm:px-6">
        {retryPrompt && onRetryPrompt ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[20px] border border-[rgba(217,119,6,0.16)] bg-[rgba(217,119,6,0.08)] px-4 py-3">
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
              className="shrink-0 rounded-full border border-[rgba(79,141,246,0.18)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ci-accent-strong)] transition hover:border-[rgba(79,141,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
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
            className="min-h-[64px] flex-1 resize-none rounded-[24px] border border-[var(--ci-border)] bg-white/85 px-5 py-4 text-[15px] leading-6 text-[var(--ci-text)] outline-none transition placeholder:text-[var(--ci-text-muted)] focus:border-[var(--ci-accent)] focus:ring-2 focus:ring-[rgba(79,141,246,0.18)]"
            aria-label="AI 助理输入框"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--ci-accent)] text-white transition hover:-translate-y-0.5 hover:bg-[var(--ci-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
        <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-[linear-gradient(135deg,var(--ci-accent),var(--ci-accent-strong))] px-4 py-3 text-sm leading-7 text-white shadow-[0_20px_36px_-24px_rgba(29,78,216,0.8)]">
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
      <div className="max-w-[88%] rounded-[22px] rounded-bl-md border border-[var(--ci-border)] bg-white/88 px-4 py-3 text-sm leading-7 text-[var(--ci-text)] shadow-[0_16px_30px_-26px_rgba(15,23,38,0.3)]">
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
        <div className="rounded-[24px] border border-[var(--ci-border)] bg-white/92 px-5 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,38,0.3)]">
          <div className="mb-2 flex items-start gap-2">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0 text-[var(--ci-accent-strong)]"
            />
            <span className="ci-kicker text-[var(--ci-accent-strong)]">
              Conclusion
            </span>
          </div>
          <p className="text-[15px] leading-7 text-[var(--ci-text)]">
            {content.conclusion}
          </p>
        </div>

        {content.evidence?.length ? (
          <div className="rounded-[20px] border border-[var(--ci-border)] bg-[rgba(255,255,255,0.7)] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowEvidence((value) => !value)}
              className="flex w-full items-center gap-2 text-left"
            >
              <FileText size={14} className="text-[var(--ci-text-muted)]" />
              <span className="flex-1 text-xs font-medium text-[var(--ci-text-secondary)]">
                证据 ({content.evidence.length})
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
          <div className="rounded-[20px] border border-[rgba(79,141,246,0.16)] bg-[rgba(79,141,246,0.08)] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb size={14} className="text-[var(--ci-accent-strong)]" />
              <span className="ci-kicker text-[var(--ci-accent-strong)]">
                Suggestions
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
          <div className="rounded-[20px] border border-[rgba(217,119,6,0.16)] bg-[rgba(217,119,6,0.08)] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={14} className="text-[var(--ci-warning)]" />
              <span className="ci-kicker text-[var(--ci-warning)]">
                Pending
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
          <div className="rounded-[20px] border border-[var(--ci-border)] bg-white/75 px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--ci-accent-strong)]" />
              <span className="ci-kicker text-[var(--ci-accent-strong)]">
                Actions
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
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,141,246,0.18)] bg-[rgba(79,141,246,0.08)] px-4 py-2 text-xs font-semibold text-[var(--ci-accent-strong)] transition hover:border-[rgba(79,141,246,0.3)] hover:bg-[rgba(79,141,246,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="mb-2 text-xs text-[var(--ci-text-muted)]">引用来源</p>
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
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ci-border)] bg-white/70 px-3 py-1.5 text-xs text-[var(--ci-text-secondary)] transition hover:border-[rgba(79,141,246,0.24)] hover:text-[var(--ci-text)]">
      <FileText size={11} />
      {reference.title}
      {reference.href ? <ExternalLink size={10} /> : null}
    </span>
  );

  return reference.href ? <Link href={reference.href}>{content}</Link> : content;
}
