"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Send, 
  Sparkles, 
  Loader2, 
  ChevronDown,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock,
  RotateCcw,
} from 'lucide-react';

export interface Reference {
  id: string;
  type: 'evidence' | 'product' | 'activity' | 'artifact';
  title: string;
  source?: string;
  href?: string;
}

export interface StructuredResponse {
  /** 结论 - 一句话结论 */
  conclusion: string;
  /** 依据 - 支撑结论的数据/证据 */
  evidence?: string[];
  /** 建议 - 下一步行动建议 */
  suggestions?: string[];
  /** 待确认 - 需要用户决策的事项 */
  pendingConfirmation?: string[];
  /** 引用证据 */
  references?: Reference[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredContent?: StructuredResponse;
  timestamp: Date;
  isLoading?: boolean;
}

export interface QuickPrompt {
  label: string;
  icon?: React.ElementType;
  prompt: string;
}

export interface BigChatProps {
  /** 对话消息列表 */
  messages: ChatMessage[];
  /** 发送消息回调 */
  onSend: (message: string) => Promise<void>;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 快捷指令列表 */
  quickPrompts?: QuickPrompt[];
  /** 输入框占位符 */
  placeholder?: string;
  /** 欢迎语 */
  welcomeMessage?: string;
  /** 重置对话 */
  onReset?: () => void;
}

/**
 * BigChat - 高管AI对话组件
 * 
 * 特性：
 * - 大输入框，打字舒适
 * - 结构化回复展示（结论/依据/建议/待确认）
 * - 证据溯源（可展开查看引用）
 * - 秘书式语气
 */
export function BigChat({
  messages,
  onSend,
  isLoading = false,
  quickPrompts = [],
  placeholder = '请指示…',
  welcomeMessage = '我已深度了解贵司业务，可以随时为您分析战略、解答疑问。',
  onReset,
}: BigChatProps) {
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const msg = inputValue;
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    await onSend(msg);
  }, [inputValue, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="exec-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-exec-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-exec-gold rounded-xl flex items-center justify-center shadow-exec-gold-glow">
            <Sparkles className="text-exec-base" size={20} />
          </div>
          <div>
            <h3 className="text-exec-primary font-bold">VertaX 战略顾问</h3>
            <p className="text-exec-success text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-exec-success rounded-full animate-pulse" />
              在线 · 深度了解您的业务
            </p>
          </div>
        </div>
        {onReset && hasMessages && (
          <button
            onClick={onReset}
            className="btn-exec-ghost flex items-center gap-1.5 text-xs"
          >
            <RotateCcw size={14} />
            新对话
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-exec">
        {!hasMessages && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-exec-gold-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-exec-gold" size={28} />
            </div>
            <p className="text-exec-secondary text-sm max-w-md mx-auto">
              {welcomeMessage}
            </p>
            {quickPrompts.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    className="btn-exec-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    {qp.icon && <qp.icon size={14} />}
                    {qp.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-exec-elevated rounded-2xl px-5 py-4 border border-exec-subtle">
              <div className="flex items-center gap-2 text-exec-gold">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">正在分析中…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts when has messages */}
      {hasMessages && quickPrompts.length > 0 && (
        <div className="px-6 pb-2 flex gap-2 flex-wrap">
          {quickPrompts.slice(0, 4).map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPrompt(qp.prompt)}
              className="text-exec-muted text-xs hover:text-exec-gold transition-colors"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 pt-3 border-t border-exec-subtle">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="input-exec flex-1 resize-none min-h-[56px] text-base"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="btn-exec-primary px-6 self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="text-exec-muted text-xs mt-2">
          按 Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-exec-gold text-exec-base rounded-2xl rounded-br-md px-5 py-3">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message - check for structured content
  if (message.structuredContent) {
    return <StructuredMessage content={message.structuredContent} timestamp={message.timestamp} />;
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-exec-elevated border border-exec-subtle rounded-2xl rounded-bl-md px-5 py-4">
        <p className="text-exec-primary text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
        <p className="text-exec-muted text-xs mt-2">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function StructuredMessage({ content, timestamp }: { content: StructuredResponse; timestamp: Date }) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-3 animate-exec-fade-in">
        {/* 结论 - Conclusion */}
        <div className="bg-exec-elevated border border-exec-subtle rounded-2xl rounded-bl-md px-5 py-4">
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle2 size={16} className="text-exec-gold mt-0.5 shrink-0" />
            <span className="text-exec-gold text-xs font-medium">结论</span>
          </div>
          <p className="text-exec-primary text-base font-medium leading-relaxed">
            {content.conclusion}
          </p>
        </div>

        {/* 依据 - Evidence */}
        {content.evidence && content.evidence.length > 0 && (
          <div className="bg-exec-panel border border-exec-subtle rounded-xl px-5 py-3">
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center gap-2 w-full text-left"
            >
              <FileText size={14} className="text-exec-muted" />
              <span className="text-exec-secondary text-xs flex-1">
                依据（{content.evidence.length} 条）
              </span>
              <ChevronDown
                size={14}
                className={`text-exec-muted transition-transform ${showEvidence ? 'rotate-180' : ''}`}
              />
            </button>
            {showEvidence && (
              <div className="mt-3 space-y-2 pt-3 border-t border-exec-subtle">
                {content.evidence.map((ev, idx) => (
                  <p key={idx} className="text-exec-secondary text-sm flex items-start gap-2">
                    <span className="text-exec-muted shrink-0">·</span>
                    {ev}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 建议 - Suggestions */}
        {content.suggestions && content.suggestions.length > 0 && (
          <div className="bg-exec-gold-subtle border border-exec-gold/20 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-exec-gold" />
              <span className="text-exec-gold text-xs font-medium">建议</span>
            </div>
            <div className="space-y-1.5">
              {content.suggestions.map((sug, idx) => (
                <p key={idx} className="text-exec-secondary text-sm flex items-start gap-2">
                  <span className="text-exec-gold shrink-0">{idx + 1}.</span>
                  {sug}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 待确认 - Pending Confirmation */}
        {content.pendingConfirmation && content.pendingConfirmation.length > 0 && (
          <div className="bg-warning-soft border border-exec-warning/20 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-exec-warning" />
              <span className="text-exec-warning text-xs font-medium">待您确认</span>
            </div>
            <div className="space-y-1.5">
              {content.pendingConfirmation.map((item, idx) => (
                <p key={idx} className="text-exec-secondary text-sm flex items-start gap-2">
                  <span className="text-exec-warning shrink-0">•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* References - 引用证据 */}
        {content.references && content.references.length > 0 && (
          <div className="px-2">
            <p className="text-exec-muted text-xs mb-1.5">引用来源：</p>
            <div className="flex flex-wrap gap-1.5">
              {content.references.map((ref) => (
                <ReferenceChip key={ref.id} reference={ref} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-exec-muted text-xs px-2">
          {timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function ReferenceChip({ reference }: { reference: Reference }) {
  const typeIcons = {
    evidence: FileText,
    product: FileText,
    activity: Clock,
    artifact: FileText,
  };
  const Icon = typeIcons[reference.type] || FileText;

  const content = (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-exec-elevated border border-exec-subtle rounded text-xs text-exec-secondary hover:border-exec-gold hover:text-exec-gold transition-colors">
      <Icon size={10} />
      {reference.title}
      {reference.href && <ExternalLink size={8} />}
    </span>
  );

  return reference.href ? (
    <Link href={reference.href}>{content}</Link>
  ) : (
    content
  );
}
