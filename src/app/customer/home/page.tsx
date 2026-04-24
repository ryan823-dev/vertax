"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileStack,
  Orbit,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
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
import {
  BigChat,
  type ChatMessage,
  type QuickPrompt,
  type StructuredResponse,
} from "@/components/executive/BigChat";
import {
  askExecutiveAssistant,
  executeExecutiveAssistantAction,
  getLatestExecutiveAssistantState,
} from "@/actions/executive-assistant";
import { deleteConversation, type MessageData } from "@/actions/chat";
import type { AssistantAction } from "@/lib/executive-assistant/types";
import { formatError } from "@/lib/format-error";

const quickPrompts: QuickPrompt[] = [
  {
    label: "生成今日简报",
    icon: Sparkles,
    prompt: "请用一页简报总结今天最值得关注的经营变化和下一步动作。",
  },
  {
    label: "回顾本周推进",
    icon: TrendingUp,
    prompt: "请回顾本周已经推进的事项，并告诉我哪里已经形成成果。",
  },
  {
    label: "聚焦高意向客户",
    icon: Target,
    prompt: "当前最值得优先跟进的高意向客户是谁？为什么？",
  },
  {
    label: "需要我拍板什么",
    icon: CheckCircle2,
    prompt: "有哪些事项已经到需要我确认或拍板的阶段？",
  },
  {
    label: "识别增长阻塞",
    icon: AlertTriangle,
    prompt: "目前最影响增长推进速度的阻塞点是什么？",
  },
];

function toChatMessage(message: MessageData): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    structuredContent:
      (message.payload as StructuredResponse | null | undefined) ?? undefined,
    timestamp: new Date(message.createdAt),
  };
}

export default function CustomerWorkbenchPage() {
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
      const [
        statsData,
        actionsData,
        tenantData,
        briefingData,
        assistantState,
      ] = await Promise.all([
        getDashboardStats(),
        getPendingActions(),
        getTenantInfo(),
        generateAIBriefing().catch(() => null),
        getLatestExecutiveAssistantState().catch((error) => {
          console.warn(
            "[customer-home] failed to load executive assistant state:",
            error,
          );
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
            content: `这次没有成功发出去。我已经保留了你的问题，你可以直接重试。\n\n原因：${formatError(
              error,
              "服务暂时不可用，请稍后重试",
            )}`,
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
    [conversationId, isSending],
  );

  const handleAssistantAction = useCallback(
    async (action: AssistantAction) => {
      try {
        assistantInteractionVersionRef.current += 1;
        const result = await executeExecutiveAssistantAction(
          action,
          conversationId,
        );
        toast.success(result.message);
        setRetryPrompt(null);

        if (action.type === "open_module" && result.href) {
          router.push(result.href);
          return;
        }

        const assistantState = await getLatestExecutiveAssistantState().catch(
          (error) => {
            console.warn(
              "[customer-home] failed to refresh executive assistant state:",
              error,
            );
            return {
              conversationId: null,
              messages: [],
            };
          },
        );

        setConversationId(assistantState.conversationId);
        setMessages(assistantState.messages.map(toChatMessage));
        await loadData();
      } catch (error) {
        toast.error("执行失败", {
          description: formatError(error, "请稍后重试"),
        });
      }
    },
    [conversationId, loadData, router],
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
      toast.error("旧对话清理失败", {
        description: formatError(error, "你仍然可以继续开启新对话"),
      });
    }
  }, [conversationId]);

  const updatedLabel = useMemo(
    () =>
      lastUpdated.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lastUpdated],
  );

  const assistantSubtitle = useMemo(() => {
    if (tenantInfo?.companyName) {
      return `在线 · 已连接 ${tenantInfo.companyName} 的经营上下文`;
    }
    return "在线 · 已连接当前租户的经营上下文";
  }, [tenantInfo?.companyName]);

  const metricCards = useMemo(
    () => [
      {
        label: "知识完整度",
        value: `${stats?.knowledgeCompleteness ?? 0}%`,
        detail:
          (stats?.knowledgeCompleteness ?? 0) >= 60
            ? "基础上下文已形成"
            : "仍需补齐关键素材",
        href: "/customer/knowledge/assets",
        icon: BrainCircuit,
        tone: "accent" as const,
      },
      {
        label: "高意向线索",
        value: `${stats?.highIntentLeads ?? 0} 条`,
        detail:
          (stats?.highIntentLeads ?? 0) > 0
            ? "建议优先安排跟进"
            : "当前没有高优线索",
        href: "/customer/radar",
        icon: Target,
        tone: "success" as const,
      },
      {
        label: "待发布内容",
        value: `${stats?.pendingContents ?? 0} 篇`,
        detail:
          (stats?.pendingContents ?? 0) > 0
            ? "还有内容未完成发布"
            : "内容节奏较为平稳",
        href: "/customer/marketing/contents",
        icon: FileStack,
        tone: "warning" as const,
      },
      {
        label: "待决事项",
        value: `${actions.length} 项`,
        detail:
          actions.length > 0 ? "需要你明确方向或审批" : "当前没有待拍板事项",
        href: "/customer/hub",
        icon: Compass,
        tone: "neutral" as const,
      },
    ],
    [actions.length, stats?.highIntentLeads, stats?.knowledgeCompleteness, stats?.pendingContents],
  );

  const highlights = useMemo(
    () =>
      briefing?.highlights?.length
        ? briefing.highlights.slice(0, 3)
        : [
            `系统已沉淀 ${stats?.totalContents ?? 0} 篇内容素材，可继续转化为投放与获客动作。`,
            `当前识别到 ${stats?.highIntentLeads ?? 0} 条高意向线索，可直接进入跟进节奏。`,
            "工作台已经把知识、内容、线索和待办集中到一个协作入口。",
          ],
    [briefing?.highlights, stats?.highIntentLeads, stats?.totalContents],
  );

  const recommendations = useMemo(
    () =>
      briefing?.recommendations?.length
        ? briefing.recommendations.slice(0, 3)
        : [
            tenantInfo?.isPublishingSetupPending
              ? "先完成发布账号与分发配置，避免后续内容和声量动作卡住。"
              : "保持内容和线索两个节奏并行推进，避免工作台只剩静态汇报。",
            actions.length > 0
              ? "把待拍板事项压缩到最少，优先清掉真正阻塞增长推进的项目。"
              : "可以把精力转向放大已验证有效的动作，而不是继续补更多仪表盘。",
            "让 AI 助理直接生成下一步动作清单，再把它分派到对应模块执行。",
          ],
    [actions.length, briefing?.recommendations, tenantInfo?.isPublishingSetupPending],
  );

  const priorityActions = useMemo(() => actions.slice(0, 4), [actions]);

  const systemRows = useMemo(
    (): Array<{
      label: string;
      value: string;
      status: "success" | "warning" | "accent" | "neutral";
      href: string;
    }> => [
      {
        label: "发布准备",
        value: tenantInfo?.isPublishingSetupPending ? "待完成" : "已就绪",
        status: tenantInfo?.isPublishingSetupPending ? "warning" : "success",
        href: "/customer/social/accounts",
      },
      {
        label: "知识引擎",
        value: `${stats?.knowledgeCompleteness ?? 0}%`,
        status:
          (stats?.knowledgeCompleteness ?? 0) >= 60 ? "success" : "accent",
        href: "/customer/knowledge/assets",
      },
      {
        label: "线索跟进",
        value: `${stats?.highIntentLeads ?? 0} 条高意向`,
        status: (stats?.highIntentLeads ?? 0) > 0 ? "warning" : "success",
        href: "/customer/radar",
      },
      {
        label: "内容节奏",
        value: `${stats?.pendingContents ?? 0} 篇待发布`,
        status: (stats?.pendingContents ?? 0) > 0 ? "accent" : "success",
        href: "/customer/marketing/contents",
      },
    ],
    [
      stats?.highIntentLeads,
      stats?.knowledgeCompleteness,
      stats?.pendingContents,
      tenantInfo?.isPublishingSetupPending,
    ],
  );

  const topDecision = priorityActions[0];

  return (
    <div className="space-y-6 pb-6">
      <section className="ci-panel-strong ci-grid animate-slide-up relative overflow-hidden rounded-[32px] p-6 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,141,246,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(15,159,110,0.08),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ci-kicker">Calm Intelligence OS</span>
                  <span className="rounded-full border border-[rgba(79,141,246,0.16)] bg-[rgba(79,141,246,0.08)] px-3 py-1 text-xs font-medium text-[var(--ci-accent-strong)]">
                    AI-native tenant workspace
                  </span>
                </div>
                <div>
                  <h1 className="max-w-4xl text-[clamp(2rem,4vw,3.6rem)] font-semibold tracking-[-0.04em] text-[var(--ci-text)]">
                    把增长判断、待决事项和 AI 执行
                    放进同一个工作系统。
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ci-text-secondary)]">
                    这不是一张给老板看的仪表盘，而是一个能直接承接经营判断、
                    模块推进和 AI 交互的工作台。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--ci-border)] bg-white/75 px-4 py-2 text-sm text-[var(--ci-text-secondary)] transition hover:border-[var(--ci-border-strong)] hover:bg-white"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : undefined}
                />
                <span>{updatedLabel} 更新</span>
              </button>
            </div>

            {tenantInfo?.isPublishingSetupPending ? (
              <div className="rounded-[26px] border border-[rgba(217,119,6,0.14)] bg-[linear-gradient(135deg,rgba(255,251,235,0.94),rgba(255,247,237,0.92))] p-5 shadow-[0_18px_34px_-26px_rgba(217,119,6,0.45)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-[rgba(217,119,6,0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ci-warning)]">
                        Setup
                      </span>
                      <span className="text-sm font-semibold text-[var(--ci-text)]">
                        发布配置还没有完成，系统会自动保持在安全模式。
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[var(--ci-text-secondary)]">
                      建议先接入至少一个分发账号，让内容与声量动作真正能流转起来，再继续扩大素材、AI
                      输出和线索动作。
                    </p>
                  </div>
                  <Link
                    href="/customer/social/accounts"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--ci-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--ci-accent-strong)]"
                  >
                    完成发布配置
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="animate-slide-up-delay-1 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {metricCards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </div>

            <div className="animate-slide-up-delay-2 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.85fr)]">
              <section className="rounded-[28px] border border-[var(--ci-border)] bg-white/82 p-5 shadow-[0_24px_48px_-34px_rgba(15,23,38,0.28)]">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--ci-accent-strong)]" />
                  <span className="ci-kicker text-[var(--ci-accent-strong)]">
                    Daily Briefing
                  </span>
                </div>
                <p className="mt-4 text-[18px] leading-8 text-[var(--ci-text)]">
                  {briefing?.summary ||
                    "工作台已经把内容、线索和待办集中到同一个入口，现在的重点是减少阻塞并把有效动作继续放大。"}
                </p>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <BriefingBlock
                    title="已确认的推进"
                    items={highlights}
                    tone="accent"
                  />
                  <BriefingBlock
                    title="下一步建议"
                    items={recommendations}
                    tone="neutral"
                  />
                </div>
              </section>

              <section className="ci-focus-panel-strong rounded-[28px] p-5">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-[var(--ci-accent-strong)]" />
                  <span className="ci-kicker text-[var(--ci-accent-strong)]">
                    Quick Delegation
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-[var(--ci-text)]">
                  一句话把任务交给 AI。
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--ci-text-secondary)]">
                  这里保留的是最常用的动作入口。点击后会直接把问题送进对话面板，不再经过上一阶段那种“汇报式”壳层。
                </p>
                <div className="mt-5 grid gap-2">
                  {quickPrompts.map((prompt) => (
                    <CommandPromptCard
                      key={prompt.label}
                      label={prompt.label}
                      icon={prompt.icon}
                      onClick={() => void handleAsk(prompt.prompt)}
                      disabled={isSending}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="animate-slide-up-delay-3 space-y-4">
            <section className="ci-focus-panel rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Orbit size={16} className="text-[var(--ci-accent-strong)]" />
                <span className="ci-kicker text-[var(--ci-accent-strong)]">
                  Decision Focus
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-[var(--ci-text)]">
                现在最值得你拍板的事
              </h2>
              <div className="mt-4 space-y-3">
                {topDecision ? (
                  <>
                    <DecisionCallout action={topDecision} />
                    {priorityActions.slice(1, 3).map((action) => (
                      <CompactDecisionRow key={action.id} action={action} />
                    ))}
                  </>
                ) : (
                  <p className="rounded-[22px] border border-[var(--ci-border)] bg-white/72 px-4 py-4 text-sm leading-7 text-[var(--ci-text-secondary)]">
                    当前没有明确的待拍板事项。你可以直接通过下方 AI 助理追问“下一步最该做什么”。
                  </p>
                )}
              </div>
            </section>

            <section className="ci-panel rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Building2
                  size={16}
                  className="text-[var(--ci-accent-strong)]"
                />
                <span className="ci-kicker text-[var(--ci-accent-strong)]">
                  System Pulse
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {systemRows.map((row) => (
                  <ModuleStatusRow key={row.label} {...row} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="ci-kicker">AI Copilot</span>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ci-text)]">
                工作对话面板
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                void handleAsk(
                  "请基于当前工作台数据，给我一个最值得立即执行的下一步动作。",
                )
              }
              className="hidden rounded-full border border-[var(--ci-border)] bg-white/80 px-4 py-2 text-sm text-[var(--ci-text-secondary)] transition hover:border-[var(--ci-border-strong)] hover:bg-white md:inline-flex"
            >
              直接生成下一步动作
            </button>
          </div>

          <div
            className="home-assistant-frame"
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
              retryDescription="上一条问题没有成功发送，点击后会原样重试。"
              placeholder="你可以直接问：今天先推进什么？本周哪里形成了结果？还有什么需要我拍板？"
              welcomeMessage="我会结合这个租户的知识、内容、线索与审批上下文，把回答整理成能直接执行的结论。"
              onReset={() => void handleResetConversation()}
              title="AI 执行助理"
              subtitle={assistantSubtitle}
              collapsed={!assistantExpanded}
              onExpand={() => setAssistantExpanded(true)}
              className="h-full"
            />
          </div>
        </div>

        <div className="space-y-4">
          <section className="ci-panel rounded-[28px] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={16}
                className="text-[var(--ci-warning)]"
              />
              <span className="ci-kicker text-[var(--ci-warning)]">
                Action Queue
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-[var(--ci-text)]">
              推进清单
            </h3>
            <div className="mt-4 space-y-3">
              {priorityActions.length > 0 ? (
                priorityActions.map((action) => (
                  <QueuedActionCard key={action.id} action={action} />
                ))
              ) : (
                <p className="rounded-[22px] border border-[var(--ci-border)] bg-white/72 px-4 py-4 text-sm leading-7 text-[var(--ci-text-secondary)]">
                  当前没有明显的阻塞项，可以继续通过 AI 助理放大已经有效的动作。
                </p>
              )}
            </div>
          </section>

          <section className="ci-panel rounded-[28px] p-5">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-[var(--ci-accent-strong)]" />
              <span className="ci-kicker text-[var(--ci-accent-strong)]">
                Secretary View
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-[var(--ci-text)]">
              工作台摘要
            </h3>
            <div className="mt-4 space-y-2">
              <ModuleStatusRow
                label="待拍板事项"
                value={`${actions.length} 项`}
                status={actions.length > 0 ? "warning" : "success"}
                href="/customer/hub"
              />
              <ModuleStatusRow
                label="内容库存"
                value={`${stats?.totalContents ?? 0} 篇`}
                status="accent"
                href="/customer/marketing/contents"
              />
              <ModuleStatusRow
                label="待处理任务"
                value={`${stats?.pendingTasks ?? 0} 项`}
                status={
                  (stats?.blockedTasks ?? 0) > 0 ? "warning" : "success"
                }
                href="/customer/hub"
              />
              <ModuleStatusRow
                label="租户名称"
                value={tenantInfo?.name ?? "当前租户"}
                status="neutral"
                href="/customer/home"
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ElementType;
  tone: "accent" | "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent-strong)]"
      : tone === "success"
        ? "bg-[rgba(15,159,110,0.12)] text-[var(--ci-success)]"
        : tone === "warning"
          ? "bg-[rgba(217,119,6,0.12)] text-[var(--ci-warning)]"
          : "bg-[rgba(148,163,184,0.14)] text-[var(--ci-text-secondary)]";

  return (
    <Link
      href={href}
      className="ci-stat-card group rounded-[24px] p-4 transition-transform hover:-translate-y-0.5"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div className="mt-5">
        <p className="text-sm font-medium text-[var(--ci-text-secondary)]">
          {label}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--ci-text)]">
            {value}
          </span>
          <ChevronRight
            size={16}
            className="text-[var(--ci-text-muted)] transition group-hover:text-[var(--ci-accent-strong)]"
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--ci-text-muted)]">
          {detail}
        </p>
      </div>
    </Link>
  );
}

function BriefingBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "accent" | "neutral";
}) {
  const markerClass =
    tone === "accent"
      ? "bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent-strong)]"
      : "bg-[rgba(15,23,38,0.08)] text-[var(--ci-text-secondary)]";

  return (
    <div className="rounded-[24px] border border-[var(--ci-border)] bg-[rgba(248,250,252,0.7)] p-4">
      <h3 className="text-sm font-semibold text-[var(--ci-text)]">{title}</h3>
      <div className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-semibold ${markerClass}`}
            >
              {index + 1}
            </span>
            <p className="text-sm leading-7 text-[var(--ci-text-secondary)]">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommandPromptCard({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-3 rounded-[22px] border border-[rgba(123,145,173,0.18)] bg-white/74 px-4 py-3.5 text-left text-sm shadow-[0_18px_30px_-26px_rgba(15,23,38,0.26)] transition hover:-translate-y-0.5 hover:border-[rgba(79,141,246,0.28)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(79,141,246,0.12)] text-[var(--ci-accent-strong)]">
        {Icon ? <Icon size={15} /> : <Sparkles size={15} />}
      </div>
      <span className="flex-1 truncate text-[var(--ci-text-secondary)] transition group-hover:text-[var(--ci-text)]">
        {label}
      </span>
      <ChevronRight
        size={15}
        className="text-[var(--ci-text-muted)] transition group-hover:text-[var(--ci-accent-strong)]"
      />
    </button>
  );
}

function DecisionCallout({ action }: { action: PendingAction }) {
  return (
    <div className="rounded-[24px] border border-[rgba(79,141,246,0.16)] bg-[linear-gradient(135deg,rgba(223,233,245,0.98),rgba(255,255,255,0.9)_72%)] p-4 shadow-[0_28px_50px_-34px_rgba(79,141,246,0.34)]">
      <div className="flex items-center gap-2">
        <PriorityPill priority={action.priority} />
        <span className="text-xs text-[var(--ci-text-secondary)]">
          {action.module}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-8 text-[var(--ci-text)]">
        {action.title}
      </h3>
      <Link
        href={action.actionLink}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--ci-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ci-accent-strong)]"
      >
        {action.action || "立即处理"}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function CompactDecisionRow({ action }: { action: PendingAction }) {
  return (
    <Link
      href={action.actionLink}
      className="group flex items-center gap-3 rounded-[22px] border border-[var(--ci-border)] bg-white/74 px-4 py-3 transition hover:border-[rgba(79,141,246,0.28)] hover:bg-white"
    >
      <PriorityPill priority={action.priority} compact />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ci-text)]">
          {action.title}
        </p>
        <p className="mt-1 text-xs text-[var(--ci-text-muted)]">
          {action.module}
        </p>
      </div>
      <ChevronRight
        size={14}
        className="text-[var(--ci-text-muted)] transition group-hover:text-[var(--ci-accent-strong)]"
      />
    </Link>
  );
}

function QueuedActionCard({ action }: { action: PendingAction }) {
  return (
    <div className="rounded-[24px] border border-[var(--ci-border)] bg-white/76 p-4 shadow-[0_18px_34px_-28px_rgba(15,23,38,0.18)]">
      <div className="flex items-center gap-2">
        <PriorityPill priority={action.priority} />
        <span className="text-xs text-[var(--ci-text-muted)]">{action.module}</span>
      </div>
      <p className="mt-3 text-sm font-medium leading-7 text-[var(--ci-text)]">
        {action.title}
      </p>
      <Link
        href={action.actionLink}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--ci-accent-strong)] hover:text-[var(--ci-accent)]"
      >
        {action.action || "立即处理"}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function ModuleStatusRow({
  label,
  value,
  status,
  href,
}: {
  label: string;
  value: string;
  status: "success" | "warning" | "accent" | "neutral";
  href: string;
}) {
  const statusClass =
    status === "success"
      ? "bg-[rgba(15,159,110,0.1)] text-[var(--ci-success)]"
      : status === "warning"
        ? "bg-[rgba(217,119,6,0.1)] text-[var(--ci-warning)]"
        : status === "accent"
          ? "bg-[rgba(79,141,246,0.1)] text-[var(--ci-accent-strong)]"
          : "bg-[rgba(148,163,184,0.14)] text-[var(--ci-text-secondary)]";

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-[20px] border border-[var(--ci-border)] bg-white/68 px-4 py-3 transition hover:border-[var(--ci-border-strong)] hover:bg-white"
    >
      <span className="text-sm text-[var(--ci-text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[var(--ci-text)]">
          {value}
        </span>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
          {status === "success"
            ? "稳定"
            : status === "warning"
              ? "关注"
              : status === "accent"
                ? "推进中"
                : "已记录"}
        </span>
        <ChevronRight
          size={14}
          className="text-[var(--ci-text-muted)] transition group-hover:text-[var(--ci-accent-strong)]"
        />
      </div>
    </Link>
  );
}

function PriorityPill({
  priority,
  compact = false,
}: {
  priority: PendingAction["priority"];
  compact?: boolean;
}) {
  const className =
    priority === "P0"
      ? "bg-[rgba(220,38,38,0.14)] text-[var(--ci-danger)]"
      : priority === "P1"
        ? "bg-[rgba(217,119,6,0.14)] text-[var(--ci-warning)]"
        : "bg-[rgba(79,141,246,0.14)] text-[var(--ci-accent-strong)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className} ${
        compact ? "min-w-[46px] justify-center" : ""
      }`}
    >
      {priority}
    </span>
  );
}
