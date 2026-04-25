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
  GrowthAgentChat,
  type ChatMessage,
  type QuickPrompt,
  type StructuredResponse,
} from "@/components/customer/GrowthAgentChat";
import {
  askGrowthAgent,
  executeGrowthAgentAction,
  getLatestGrowthAgentState,
} from "@/actions/growth-agent";
import { deleteConversation, type MessageData } from "@/actions/chat";
import type { AssistantAction } from "@/lib/growth-agent/types";
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
        getLatestGrowthAgentState().catch((error) => {
          console.warn(
            "[customer-home] failed to load growth agent state:",
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
        const result = await askGrowthAgent(prompt, conversationId);
        setConversationId(result.conversation.id);
        setRetryPrompt(null);
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
        const result = await executeGrowthAgentAction(
          action,
          conversationId,
        );
        toast.success(result.message);
        setRetryPrompt(null);

        if (action.type === "open_module" && result.href) {
          router.push(result.href);
          return;
        }

        const assistantState = await getLatestGrowthAgentState().catch(
          (error) => {
            console.warn(
              "[customer-home] failed to refresh growth agent state:",
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
      return `在线 · 正在跟进 ${tenantInfo.companyName} 的出海进展`;
    }
    return "在线 · 正在跟进当前出海进展";
  }, [tenantInfo?.companyName]);

  const metricCards = useMemo(
    () => [
      {
        label: "出海准备度",
        value: `${stats?.knowledgeCompleteness ?? 0}%`,
        detail:
          (stats?.knowledgeCompleteness ?? 0) >= 60
            ? "基础判断已稳定"
            : "需要继续完善表达基础",
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
        label: "待推进表达",
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
            `已有 ${stats?.totalContents ?? 0} 个市场表达成果，可继续转化为触达动作。`,
            `当前识别到 ${stats?.highIntentLeads ?? 0} 条高意向商机，可进入跟进节奏。`,
            "今日重点已经整理好，可以直接推进下一步。",
          ],
    [briefing?.highlights, stats?.highIntentLeads, stats?.totalContents],
  );

  const recommendations = useMemo(
    () =>
      briefing?.recommendations?.length
        ? briefing.recommendations.slice(0, 3)
        : [
            tenantInfo?.isPublishingSetupPending
              ? "先打通一个外部触达通路，避免后续动作停在系统内。"
              : "保持市场表达和商机跟进并行推进，避免工作台只剩静态汇报。",
            actions.length > 0
              ? "把待拍板事项压缩到最少，优先清掉真正阻塞增长推进的项目。"
              : "可以把精力转向放大已验证有效的动作，而不是继续补更多仪表盘。",
            "让 AI 助理直接给出下一步动作，再把事项推进到对应位置。",
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
        label: "表达基础",
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
        label: "市场表达",
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

  const journeyStage = useMemo(() => {
    if (tenantInfo?.isPublishingSetupPending) {
      return {
        label: "出海启动期",
        status: "基础通路待打通",
        detail:
          "先打通一个外部触达通路，让后续动作可以真正进入市场。",
        tone: "warning" as const,
      };
    }

    if ((stats?.knowledgeCompleteness ?? 0) < 60) {
      return {
        label: "市场认知建设期",
        status: "市场表达待加强",
        detail:
          "当前重点是让海外客户更快理解你们的价值、适配场景和合作理由。",
        tone: "accent" as const,
      };
    }

    if ((stats?.highIntentLeads ?? 0) > 0 || actions.length > 0) {
      return {
        label: "商机推进期",
        status: "需要聚焦跟进",
        detail:
          "已经出现值得推进的客户或事项，下一步要把判断转成明确跟进动作。",
        tone: "warning" as const,
      };
    }

    return {
      label: "增长资产建设期",
      status: "系统稳定运行",
      detail:
        "继续放大已经有效的市场表达、主动触达和商机跟进节奏。",
      tone: "success" as const,
    };
  }, [
    actions.length,
    stats?.highIntentLeads,
    stats?.knowledgeCompleteness,
    tenantInfo?.isPublishingSetupPending,
  ]);

  const capabilityRows = useMemo(
    () => [
      {
        label: "市场表达基础",
        value: `${stats?.knowledgeCompleteness ?? 0}%`,
        detail:
          (stats?.knowledgeCompleteness ?? 0) >= 60
            ? "对外表达已经有稳定基础"
            : "需要继续明确价值、场景和客户方向",
        status:
          (stats?.knowledgeCompleteness ?? 0) >= 60
            ? ("success" as const)
            : ("accent" as const),
      },
      {
        label: "市场声量成果",
        value: `${stats?.totalContents ?? 0} 篇`,
        detail:
          (stats?.pendingContents ?? 0) > 0
            ? `${stats?.pendingContents ?? 0} 项内容仍需推进`
            : "当前表达节奏平稳，可继续扩大覆盖面",
        status:
          (stats?.pendingContents ?? 0) > 0
            ? ("warning" as const)
            : ("success" as const),
      },
      {
        label: "主动触达通路",
        value: `${tenantInfo?.socialConnectedCount ?? 0} 个`,
        detail:
          (tenantInfo?.socialConnectedCount ?? 0) > 0
            ? "外部触达已经可以开始推进"
            : "先打通一个通路，形成最小外部触达闭环",
        status:
          (tenantInfo?.socialConnectedCount ?? 0) > 0
            ? ("success" as const)
            : ("warning" as const),
      },
      {
        label: "商机推进",
        value: `${stats?.highIntentLeads ?? 0} 条`,
        detail:
          (stats?.highIntentLeads ?? 0) > 0
            ? "已有高意向线索，建议进入跟进节奏"
            : "继续寻找更明确的需求信号",
        status:
          (stats?.highIntentLeads ?? 0) > 0
            ? ("warning" as const)
            : ("neutral" as const),
      },
    ],
    [
      stats?.highIntentLeads,
      stats?.knowledgeCompleteness,
      stats?.pendingContents,
      stats?.totalContents,
      tenantInfo?.socialConnectedCount,
    ],
  );

  const assistantSignals = useMemo(
    () => [
      {
        label: "准备度",
        value: `${stats?.knowledgeCompleteness ?? 0}%`,
      },
      {
        label: "声量",
        value: `${stats?.totalContents ?? 0} 篇`,
      },
      {
        label: "商机",
        value: `${stats?.totalLeads ?? 0} 条`,
      },
      {
        label: "事项",
        value: `${actions.length} 项`,
      },
    ],
    [
      actions.length,
      stats?.knowledgeCompleteness,
      stats?.totalContents,
      stats?.totalLeads,
    ],
  );

  const topDecision = priorityActions[0];
  const journeyToneClass =
    journeyStage.tone === "success"
      ? "border-[rgba(15,159,110,0.16)] bg-[rgba(15,159,110,0.08)] text-[var(--ci-success)]"
      : journeyStage.tone === "warning"
        ? "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.1)] text-[var(--ci-warning)]"
        : "border-[rgba(79,141,246,0.18)] bg-[rgba(79,141,246,0.1)] text-[var(--ci-accent-strong)]";

  return (
    <div className="space-y-5 pb-6">
      <section className="animate-slide-up relative -mx-4 space-y-5 border-y border-[var(--ci-border)] bg-white/45 px-4 py-5 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7 lg:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ci-kicker">0-1 Overseas Growth System</span>
              <span className="rounded-full border border-[rgba(79,141,246,0.16)] bg-[rgba(79,141,246,0.08)] px-3 py-1 text-xs font-medium text-[var(--ci-accent-strong)]">
                AI virtual overseas team
              </span>
            </div>
            <div>
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-[var(--ci-text)] sm:text-4xl lg:text-5xl">
                把零散出海尝试，
                变成持续运转的海外增长系统。
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ci-text-secondary)]">
                VertaX 会把每天的出海进展转成清晰判断和下一步动作，
                让团队知道现在先做什么、为什么、哪里需要拍板。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--ci-border)] bg-white/75 px-3 py-2 text-sm text-[var(--ci-text-secondary)] transition-colors hover:border-[var(--ci-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-accent)]/30"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : undefined}
            />
            <span>{updatedLabel} 更新</span>
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.86fr)]">
          <div className="order-2 space-y-4 xl:order-1">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <section className="ci-data-panel p-4">
                <div className="flex items-center gap-2">
                  <Orbit size={16} className="text-[var(--ci-accent-strong)]" />
                  <span className="ci-kicker text-[var(--ci-accent-strong)]">
                    Journey Stage
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--ci-text)]">
                    {journeyStage.label}
                  </h2>
                  <span className={`ci-status-pill ${journeyToneClass}`}>
                    {journeyStage.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--ci-text-secondary)]">
                  {journeyStage.detail}
                </p>
              </section>

              <section className="ci-data-panel p-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit
                    size={16}
                    className="text-[var(--ci-accent-strong)]"
                  />
                  <span className="ci-kicker text-[var(--ci-accent-strong)]">
                    Capability Map
                  </span>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {capabilityRows.map((row) => (
                    <CapabilityRow key={row.label} {...row} />
                  ))}
                </div>
              </section>
            </div>

            {tenantInfo?.isPublishingSetupPending ? (
              <div className="rounded-xl border border-[rgba(217,119,6,0.18)] bg-[rgba(255,251,235,0.72)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="ci-status-pill border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.1)] text-[var(--ci-warning)]">
                        Setup
                      </span>
                      <span className="text-sm font-semibold text-[var(--ci-text)]">
                        最小外部触达通路还没有打通。
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[var(--ci-text-secondary)]">
                      建议先打通一个可持续触达渠道，让后续动作真正进入市场，再继续扩大节奏。
                    </p>
                  </div>
                  <Link
                    href="/customer/social/accounts"
                    className="inline-flex items-center justify-center rounded-md bg-[var(--ci-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ci-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-accent)]/30"
                  >
                    打通触达通路
                  </Link>
                </div>
              </div>
            ) : null}

            <section className="ci-data-panel p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--ci-accent-strong)]" />
                <span className="ci-kicker text-[var(--ci-accent-strong)]">
                  Daily Briefing
                </span>
              </div>
              <p className="mt-4 text-[18px] leading-8 text-[var(--ci-text)]">
                {briefing?.summary ||
                  "今日重点已经整理好。接下来优先减少阻塞，让有效动作进入持续推进节奏。"}
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
          </div>

          <aside className="animate-slide-up-delay-2 order-1 flex flex-col gap-3 xl:sticky xl:top-24 xl:order-2 xl:self-start">
            <section className="ci-data-panel order-2 border-[rgba(79,141,246,0.22)] bg-[var(--ci-surface-focus-strong)] p-4">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-[var(--ci-accent-strong)]" />
                <span className="ci-kicker text-[var(--ci-accent-strong)]">
                  AI Growth Agent
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--ci-text)]">
                问 VertaX AI 出海助理
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--ci-text-secondary)]">
                你可以把今天的判断交给它：先推进什么、哪个客户值得跟进、哪里需要你拍板。
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {assistantSignals.map((signal) => (
                  <ContextSignal key={signal.label} {...signal} />
                ))}
              </div>
            </section>

            <div className="home-assistant-frame order-1" data-open="true">
              <GrowthAgentChat
                messages={messages}
                onSend={handleAsk}
                onAction={handleAssistantAction}
                onRetryPrompt={handleAsk}
                isLoading={isSending}
                quickPrompts={quickPrompts}
                quickPromptMode="send"
                retryPrompt={retryPrompt}
                retryDescription="上一条问题没有成功发送，点击后会原样重试。"
                placeholder="直接问：现在最该推进哪一步？哪个客户值得触达？哪里卡住了？"
                welcomeMessage="我会把当前进展整理成清晰判断和可推进动作，帮助你把出海节奏往前推。"
                onReset={() => void handleResetConversation()}
                title="VertaX AI 出海助理"
                subtitle={assistantSubtitle}
                className="h-full"
              />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {metricCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>

          <section className="ci-data-panel p-5">
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
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {priorityActions.length > 0 ? (
                priorityActions.map((action) => (
                  <QueuedActionCard key={action.id} action={action} />
                ))
              ) : (
                <p className="rounded-lg border border-[var(--ci-border)] bg-white/72 px-4 py-4 text-sm leading-7 text-[var(--ci-text-secondary)] md:col-span-2">
                  当前没有明显阻塞项。可以继续向 AI 助理追问：哪些市场动作或客户信号值得放大。
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="ci-data-panel bg-[var(--ci-surface-focus)] p-5">
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
                <p className="rounded-lg border border-[var(--ci-border)] bg-white/72 px-4 py-4 text-sm leading-7 text-[var(--ci-text-secondary)]">
                  当前没有明确的待拍板事项。你可以直接问 AI 助理“下一步最该做什么”。
                </p>
              )}
            </div>
          </section>

          <section className="ci-data-panel p-5">
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

          <section className="ci-data-panel p-5">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-[var(--ci-accent-strong)]" />
              <span className="ci-kicker text-[var(--ci-accent-strong)]">
                Workbench Summary
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-[var(--ci-text)]">
              本轮出海系统状态
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
                label="当前工作区"
                value={tenantInfo?.name ?? "当前项目"}
                status="neutral"
                href="/customer/home"
              />
            </div>
          </section>
        </aside>
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
      className="ci-object-card group p-4 transition-colors hover:border-[var(--ci-border-strong)]"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div className="mt-5">
        <p className="text-sm font-medium text-[var(--ci-text-secondary)]">
          {label}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-2xl font-semibold text-[var(--ci-text)]">
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
    <div className="rounded-xl border border-[var(--ci-border)] bg-[rgba(248,250,252,0.7)] p-4">
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

function CapabilityRow({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status: "success" | "warning" | "accent" | "neutral";
}) {
  const statusClass =
    status === "success"
      ? "bg-[rgba(15,159,110,0.1)] text-[var(--ci-success)]"
      : status === "warning"
        ? "bg-[rgba(217,119,6,0.1)] text-[var(--ci-warning)]"
        : status === "accent"
          ? "bg-[rgba(79,141,246,0.1)] text-[var(--ci-accent-strong)]"
          : "bg-[rgba(148,163,184,0.12)] text-[var(--ci-text-secondary)]";

  return (
    <div className="rounded-lg border border-[var(--ci-border)] bg-white/68 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[var(--ci-text-secondary)]">
          {label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--ci-text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function ContextSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(79,141,246,0.14)] bg-white/70 px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--ci-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--ci-text)]">
        {value}
      </p>
    </div>
  );
}

function DecisionCallout({ action }: { action: PendingAction }) {
  return (
    <div className="rounded-xl border border-[rgba(79,141,246,0.18)] bg-[rgba(237,244,251,0.84)] p-4">
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
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--ci-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ci-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-accent)]/30"
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
      className="group flex items-center gap-3 rounded-lg border border-[var(--ci-border)] bg-white/74 px-4 py-3 transition-colors hover:border-[rgba(79,141,246,0.28)] hover:bg-white"
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
    <div className="ci-object-card p-4">
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
      className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--ci-border)] bg-white/68 px-4 py-3 transition-colors hover:border-[var(--ci-border-strong)] hover:bg-white"
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
