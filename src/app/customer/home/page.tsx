"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateAIBriefing,
  getDashboardStats,
  getPendingActions,
  getTenantInfo,
  type AIBriefing,
  type DashboardStats,
  type PendingAction,
  type TenantInfo,
} from "@/actions/dashboard";
import { BigChat, type ChatMessage, type QuickPrompt, type StructuredResponse } from "@/components/executive/BigChat";
import {
  askExecutiveAssistant,
  executeExecutiveAssistantAction,
  getLatestExecutiveAssistantState,
} from "@/actions/executive-assistant";
import { deleteConversation, type MessageData } from "@/actions/chat";
import type { AssistantAction } from "@/lib/executive-assistant/types";
import { formatError } from "@/lib/format-error";

const quickPrompts: QuickPrompt[] = [
  { label: "一分钟汇报", icon: Clock, prompt: "请用一分钟给我汇报当前经营进展。" },
  { label: "本周战果", icon: TrendingUp, prompt: "总结一下本周已经推进出的成果。" },
  { label: "商机概览", icon: Target, prompt: "现在最值得我关注的商机是什么？" },
  { label: "待我审批", icon: CheckCircle2, prompt: "目前有哪些事情需要我确认或拍板？" },
  { label: "增长瓶颈", icon: AlertTriangle, prompt: "当前增长推进最卡的地方是什么？" },
];

function toChatMessage(message: MessageData): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    structuredContent: (message.payload as StructuredResponse | null | undefined) ?? undefined,
    timestamp: new Date(message.createdAt),
  };
}

export default function CEOCockpitPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assistantExpanded, setAssistantExpanded] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const assistantInteractionVersionRef = useRef(0);
  const assistantSyncLockRef = useRef(false);
  const assistantStateSnapshotRef = useRef({
    conversationId: null as string | null,
    messageCount: 0,
  });

  useEffect(() => {
    assistantStateSnapshotRef.current = {
      conversationId,
      messageCount: messages.length,
    };
  }, [conversationId, messages.length]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const assistantVersionAtStart = assistantInteractionVersionRef.current;

    try {
      const [statsData, actionsData, tenantData, briefingData, assistantState] = await Promise.all([
        getDashboardStats(),
        getPendingActions(),
        getTenantInfo(),
        generateAIBriefing().catch(() => null),
        getLatestExecutiveAssistantState().catch((error) => {
          console.warn("[customer-home] failed to load executive assistant state:", error);
          return {
            conversationId: null,
            messages: [],
          };
        }),
      ]);

      setStats(statsData);
      setActions(actionsData);
      setTenantInfo(tenantData);
      setBriefing(briefingData);

      if (
        !assistantSyncLockRef.current &&
        assistantVersionAtStart === assistantInteractionVersionRef.current &&
        !assistantStateSnapshotRef.current.conversationId &&
        assistantStateSnapshotRef.current.messageCount === 0
      ) {
        setConversationId(assistantState.conversationId);
        setMessages(assistantState.messages.map(toChatMessage));
        setAssistantExpanded(assistantState.messages.length > 0);
      }

      setRetryPrompt(null);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error("首页数据加载失败", {
        description: formatError(error, "请稍后再试"),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAsk = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isSending) {
        return;
      }

      assistantInteractionVersionRef.current += 1;
      assistantSyncLockRef.current = true;
      setAssistantExpanded(true);
      setIsSending(true);

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        role: "user",
        content: prompt,
        timestamp: new Date(),
      };

      setMessages((current) => [...current, optimisticMessage]);

      try {
        const result = await askExecutiveAssistant(prompt, conversationId);
        setConversationId(result.conversation.id);
        setRetryPrompt(null);
        setAssistantExpanded(true);
        setMessages((current) => [
          ...current.filter((item) => item.id !== optimisticId),
          toChatMessage(result.userMessage),
          toChatMessage(result.assistantMessage),
        ]);
      } catch (error) {
        setMessages((current) => [
          ...current.filter((item) => item.id !== optimisticId),
          optimisticMessage,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content: `这次没有成功发出去。我已经保留了你的问题，你可以直接重试。\n\n原因：${formatError(error, "服务暂时不可用，请稍后重试")}`,
            timestamp: new Date(),
          },
        ]);
        setRetryPrompt(prompt);

        toast.error("发送失败", {
          description: formatError(error, "请稍后重试"),
        });
      } finally {
        assistantSyncLockRef.current = false;
        setIsSending(false);
      }
    },
    [conversationId, isSending]
  );

  const handleAssistantAction = useCallback(
    async (action: AssistantAction) => {
      try {
        assistantInteractionVersionRef.current += 1;
        const result = await executeExecutiveAssistantAction(action, conversationId);
        toast.success(result.message);
        setRetryPrompt(null);

        if (action.type === "open_module" && result.href) {
          router.push(result.href);
          return;
        }

        const assistantState = await getLatestExecutiveAssistantState().catch((error) => {
          console.warn("[customer-home] failed to refresh executive assistant state:", error);
          return {
            conversationId: null,
            messages: [],
          };
        });
        setConversationId(assistantState.conversationId);
        setMessages(assistantState.messages.map(toChatMessage));
        await loadData();
      } catch (error) {
        toast.error("执行失败", {
          description: formatError(error, "请稍后重试"),
        });
      }
    },
    [conversationId, loadData, router]
  );

  const handleResetConversation = useCallback(async () => {
    const currentConversationId = conversationId;
    assistantInteractionVersionRef.current += 1;
    setConversationId(null);
    setMessages([]);
    setAssistantExpanded(false);
    setRetryPrompt(null);

    if (!currentConversationId) {
      return;
    }

    try {
      await deleteConversation(currentConversationId);
    } catch (error) {
      toast.error("旧会话清理失败", {
        description: formatError(error, "你仍然可以继续开启新对话"),
      });
    }
  }, [conversationId]);

  const assistantSubtitle = useMemo(() => {
    if (tenantInfo?.companyName) {
      return `在线 · 已接入 ${tenantInfo.companyName} 的首页经营上下文`;
    }
    return "在线 · 已接入首页经营上下文";
  }, [tenantInfo?.companyName]);

  const topPendingActions = actions.slice(0, 2);

  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto max-w-[1720px]">
        <div className="grid grid-cols-12 gap-5">
          <main className="col-span-12 lg:col-span-8 xl:col-span-9">
            <div className="cockpit-container-v2 p-6 lg:p-7">
              <div className="relative z-10 mb-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-navy)] bg-navy-elevated">
                    <ChevronRight size={16} className="text-gold" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-light">
                      VertaX AI <span className="text-gold">出海获客智能体</span>
                    </h1>
                    <p className="mt-1 flex items-center gap-2 text-xs text-light-muted">
                      <span className="status-dot status-dot-success" />
                      AI 驱动 · 全球市场情报 · 经营决策辅助
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-navy)] px-3 py-1.5 text-xs text-light-muted transition-colors hover:text-light"
                >
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : undefined} />
                  <span>{lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              </div>

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row">
                <div className="report-card-v2 flex-1 p-5 lg:p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <Sparkles size={18} className="text-gold" />
                    <h2 className="text-base font-bold text-dark">CEO 专属增长快报</h2>
                    <span className="ml-auto text-xs text-dark-muted">
                      {lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 更新
                    </span>
                  </div>

                  {tenantInfo?.isPublishingSetupPending ? (
                    <div className="mb-5 rounded-xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[rgba(245,158,11,0.14)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
                              待配置
                            </span>
                            <span className="text-sm font-semibold text-dark">发布配置未完成，系统已自动进入安全模式</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-dark-muted">
                            先授权至少一个发布账号后，声量枢纽的创建与发布入口才会开放，避免在未完成配置前误操作。
                          </p>
                        </div>
                        <Link
                          href="/customer/social/accounts"
                          className="btn-gold-sm inline-flex items-center justify-center px-4 py-2 text-sm"
                        >
                          完成发布配置
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-gold" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-[104px_1fr] gap-3 items-start">
                        <span className="pt-0.5 text-sm font-medium text-dark-secondary">核心结论</span>
                        <p className="text-[15px] leading-relaxed text-dark">
                          {briefing?.summary || "当前经营节奏整体稳定，重点在于把已有商机和内容动作继续往前推进。"}
                        </p>
                      </div>

                      <div className="grid grid-cols-[104px_1fr] gap-3 items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-dark-secondary">关键成果</span>
                          <span className="badge-gold px-1.5 py-0.5 text-[9px]">AI</span>
                        </div>
                        <div className="space-y-2">
                          {(briefing?.highlights?.length ? briefing.highlights.slice(0, 3) : [
                            `累计沉淀 ${stats?.totalContents || 0} 篇内容资产`,
                            `当前识别到 ${stats?.highIntentLeads || 0} 条高意向线索`,
                            `首页经营数据已汇总，可直接展开对话追问`,
                          ]).map((item) => (
                            <div key={item} className="flex items-start gap-2 text-[15px] text-dark">
                              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-[104px_1fr] gap-3 items-start">
                        <span className="pt-1 text-sm font-medium text-dark-secondary">阻塞卡点</span>
                        <div className="space-y-2">
                          {topPendingActions.length > 0 ? (
                            topPendingActions.map((action) => (
                              <div key={action.id} className="alert-block-warning p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-dark">{action.title}</p>
                                    <p className="mt-0.5 text-xs text-dark-muted">影响模块：{action.module}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="alert-block-warning p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-dark">暂无显著阻塞项</p>
                                  <p className="mt-0.5 text-xs text-dark-muted">可以直接通过下方对话框追问“下一步建议”。</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full shrink-0 xl:w-36">
                  <p className="mb-2 px-1 text-xs text-light-muted">快捷预案</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1 xl:gap-1.5">
                    {quickPrompts.map((prompt, index) => {
                      const PromptIcon = prompt.icon;

                      return (
                        <button
                          key={prompt.label}
                          type="button"
                          onClick={() => void handleAsk(prompt.prompt)}
                          disabled={isSending}
                          className="btn-cockpit-v2 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {index === 0 ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /> : null}
                          {PromptIcon ? <PromptIcon size={13} /> : null}
                          <span className="truncate">{prompt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="home-assistant-frame relative z-10 mt-6"
                data-open={assistantExpanded ? "true" : "false"}
              >
                <BigChat
                  messages={messages}
                  onSend={handleAsk}
                  onAction={handleAssistantAction}
                  onRetryPrompt={handleAsk}
                  isLoading={isSending}
                  quickPrompts={quickPrompts}
                  quickPromptMode="send"
                  retryPrompt={retryPrompt}
                  retryDescription="点击后会直接重发刚才那条问题，不需要重新输入。"
                  placeholder="董事长您请吩咐：想看本周商机、内容进度，还是让我直接给出下一步建议？"
                  welcomeMessage="我已经接入首页经营数据。你可以直接问“本周商机怎么样”“内容推进到哪了”“下一步我该怎么拍板”。"
                  onReset={() => void handleResetConversation()}
                  title="CEO 助手"
                  subtitle={assistantSubtitle}
                  collapsed={!assistantExpanded}
                  onExpand={() => setAssistantExpanded(true)}
                  className="h-full"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-gold" />
                  <h2 className="text-sm font-bold text-dark">AI 缺口识别与待您决策</h2>
                </div>
                <span className="text-xs text-dark-muted">P0 优先级：{actions.filter((item) => item.priority === "P0").length}</span>
              </div>

              {actions.slice(0, 2).map((action) => (
                <div key={action.id} className="secretary-card-v2 flex items-center gap-4 p-4">
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${
                      action.priority === "P0"
                        ? "bg-[rgba(239,68,68,0.1)] text-danger"
                        : "bg-[rgba(245,158,11,0.1)] text-warning"
                    }`}
                  >
                    {action.priority === "P0" ? "老板决策" : "待推进"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark">{action.title}</p>
                    <p className="mt-0.5 truncate text-xs text-dark-muted">来自 {action.module}，建议尽快处理以免拖慢本周推进节奏。</p>
                  </div>
                  <Link href={action.actionLink} className="btn-gold-sm shrink-0 px-4 py-2 text-sm">
                    {action.action || "立即处理"}
                  </Link>
                </div>
              ))}
            </div>
          </main>

          <aside className="col-span-12 space-y-3 lg:col-span-4 xl:col-span-3">
            <div className="secretary-card-v2 p-4">
              <div className="mb-4 flex items-center gap-2 border-b border-[var(--border-cream)] pb-3">
                <FileText size={14} className="text-dark-secondary" />
                <span className="text-sm font-bold text-dark">秘书汇报</span>
                <span className="ml-auto text-[10px] text-dark-muted">实时</span>
              </div>

              <div className="space-y-0">
                <SecretaryRow
                  label="知识完整度"
                  value={`${stats?.knowledgeCompleteness || 0}%`}
                  status={(stats?.knowledgeCompleteness || 0) >= 60 ? "progress" : "attention"}
                  href="/customer/knowledge/assets"
                />
                <SecretaryRow
                  label="高意向线索"
                  value={`${stats?.highIntentLeads || 0} 条`}
                  status={(stats?.highIntentLeads || 0) > 0 ? "attention" : "progress"}
                  href="/customer/radar"
                />
                <SecretaryRow
                  label="待您确认"
                  value={`${actions.length} 项`}
                  status={actions.length > 0 ? "attention" : "progress"}
                  href="/customer/hub"
                />
                <SecretaryRow
                  label="待处理内容"
                  value={`${stats?.pendingContents || 0} 篇`}
                  status={(stats?.pendingContents || 0) > 0 ? "attention" : "progress"}
                  href="/customer/marketing/contents"
                  isLast
                />
              </div>
            </div>

            <div className="highlight-card-v2 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={13} className="text-gold" />
                <span className="text-xs font-semibold text-gold">AI 执行官建议</span>
              </div>
              <p className="text-sm leading-relaxed text-dark-secondary">
                {briefing?.recommendations?.[0] || "建议先补齐企业档案与发布配置，再继续放大内容和商机动作。"}
              </p>
              <button
                type="button"
                onClick={() => void handleAsk("请根据当前首页数据，直接给我一个最值得执行的下一步建议。")}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gold hover:underline"
              >
                <Send size={12} />
                让我直接生成建议
              </button>
            </div>

            <div className="secretary-card-v2 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-dark-secondary" />
                <span className="text-sm font-bold text-dark">待您审批</span>
                {actions.length > 0 ? <span className="ml-auto badge-attention text-[10px]">{actions.length}</span> : null}
              </div>

              {actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.slice(0, 3).map((action) => (
                    <Link
                      key={action.id}
                      href={action.actionLink}
                      className="group flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-cream-warm"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          action.priority === "P0" ? "bg-danger" : "bg-warning"
                        }`}
                      />
                      <span className="flex-1 truncate text-sm text-dark">{action.title}</span>
                      <ChevronRight size={12} className="text-dark-muted transition-colors group-hover:text-gold" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-sm text-dark-muted">当前没有需要老板拍板的事项，可以直接通过对话框继续追问。</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SecretaryRow({
  label,
  value,
  subtext,
  status,
  href,
  isLast = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  status: "progress" | "attention";
  href: string;
  isLast?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-cream-warm ${
        !isLast ? "border-b border-[var(--border-cream)]" : ""
      }`}
    >
      <span className="text-sm text-dark-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className="font-tabular text-sm font-bold text-dark">{value}</span>
          {subtext ? <span className="ml-1 text-[10px] text-dark-muted">{subtext}</span> : null}
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            status === "attention"
              ? "bg-[rgba(245,158,11,0.12)] text-warning"
              : "bg-[rgba(34,197,94,0.12)] text-success"
          }`}
        >
          {status === "attention" ? "需关注" : "稳步"}
        </span>
        <ChevronRight size={12} className="text-dark-muted transition-colors group-hover:text-gold" />
      </div>
    </Link>
  );
}
