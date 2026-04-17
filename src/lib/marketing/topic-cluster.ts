export type TopicClusterFunnel = "TOFU" | "MOFU" | "BOFU";
export type TopicClusterIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

export interface TopicQuestionDirection {
  persona?: string;
  role?: string;
  scenario?: string;
  stage?: TopicClusterFunnel;
  intent?: TopicClusterIntent;
  question: string;
  whyThisQuestion?: string;
}

export interface TopicClusterPublishingDirection {
  mode: "integrated" | "suggested";
  canAutoPublish: boolean;
  channel: string;
  reason?: string;
  purpose?: string;
  contentTypes: string[];
}

export interface TopicContentMapItem {
  type: string;
  title: string;
  briefGoal: string;
  funnel: TopicClusterFunnel;
  intent: TopicClusterIntent;
  mustUseEvidenceIds: string[];
  targetQuestion?: string;
  targetRole?: string;
  targetPersonaId?: string;
  targetPersonaName?: string;
  primaryPublishTarget?: string;
  suggestedDistributionTargets: string[];
  canAutoPublish?: boolean;
}

export interface TopicClusterCluster {
  pillar: string;
  clusterName?: string;
  intent: string;
  coreKeywords: string[];
  longTailKeywords: string[];
  aeoQuestions: string[];
  commercialKeywords: string[];
  negatives: string[];
  personaRef?: {
    entityId: string;
    versionId?: string;
  };
  targetRoles: string[];
  questionMap: TopicQuestionDirection[];
  primaryPublishTarget?: string;
  suggestedDistributionTargets: string[];
  requiredEvidenceIds: string[];
  contentMap: TopicContentMapItem[];
}

export interface TopicClusterContent {
  topicCluster: {
    name: string;
    customerUnderstanding: string[];
    buyerUnderstanding: string[];
    questionDirections: TopicQuestionDirection[];
    publishingDirections: TopicClusterPublishingDirection[];
    clusters: TopicClusterCluster[];
  };
  openQuestions?: string[];
  confidence?: number;
  assumptions?: string[];
  evidenceIds?: string[];
  suggestedNextSkills?: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeStage(value: unknown): TopicClusterFunnel | undefined {
  if (value === "TOFU" || value === "MOFU" || value === "BOFU") {
    return value;
  }

  const text = toStringValue(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("bofu") || text.includes("decision") || text.includes("成交") || text.includes("采购")) {
    return "BOFU";
  }
  if (text.includes("mofu") || text.includes("consider") || text.includes("比较") || text.includes("评估")) {
    return "MOFU";
  }
  return "TOFU";
}

function normalizeIntent(value: unknown): TopicClusterIntent {
  if (
    value === "informational" ||
    value === "commercial" ||
    value === "transactional" ||
    value === "navigational"
  ) {
    return value;
  }

  const text = toStringValue(value).toLowerCase();
  if (text.includes("trans") || text.includes("购买") || text.includes("采购")) {
    return "transactional";
  }
  if (text.includes("nav") || text.includes("品牌词") || text.includes("导航")) {
    return "navigational";
  }
  if (text.includes("com") || text.includes("比较") || text.includes("推荐") || text.includes("评估")) {
    return "commercial";
  }
  return "informational";
}

function normalizeQuestionDirection(value: unknown): TopicQuestionDirection | null {
  if (typeof value === "string" && value.trim()) {
    return { question: value.trim() };
  }

  const record = asRecord(value);
  if (!record) return null;

  const question =
    toStringValue(record.question) ||
    toStringValue(record.query) ||
    toStringValue(record.prompt) ||
    toStringValue(record.aeoQuestion);

  if (!question) return null;

  return {
    persona: toStringValue(record.persona) || undefined,
    role: toStringValue(record.role) || undefined,
    scenario: toStringValue(record.scenario) || undefined,
    stage: normalizeStage(record.stage ?? record.funnel),
    intent: normalizeIntent(record.intent),
    question,
    whyThisQuestion:
      toStringValue(record.whyThisQuestion) ||
      toStringValue(record.why) ||
      toStringValue(record.reason) ||
      undefined,
  };
}

function normalizeQuestionDirections(value: unknown): TopicQuestionDirection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeQuestionDirection)
    .filter((item): item is TopicQuestionDirection => Boolean(item));
}

function normalizePublishingDirection(value: unknown): TopicClusterPublishingDirection | null {
  if (typeof value === "string" && value.trim()) {
    return {
      mode: value.includes("官网") ? "integrated" : "suggested",
      canAutoPublish: value.includes("官网"),
      channel: value.trim(),
      contentTypes: [],
    };
  }

  const record = asRecord(value);
  if (!record) return null;

  const channel = toStringValue(record.channel) || toStringValue(record.name);
  if (!channel) return null;

  return {
    mode:
      toStringValue(record.mode) === "integrated" || channel.includes("官网")
        ? "integrated"
        : "suggested",
    canAutoPublish:
      typeof record.canAutoPublish === "boolean"
        ? Boolean(record.canAutoPublish)
        : channel.includes("官网"),
    channel,
    reason: toStringValue(record.reason) || undefined,
    purpose: toStringValue(record.purpose) || undefined,
    contentTypes: toStringArray(record.contentTypes ?? record.types),
  };
}

function normalizePublishingDirections(value: unknown): TopicClusterPublishingDirection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizePublishingDirection)
    .filter((item): item is TopicClusterPublishingDirection => Boolean(item));
}

function normalizeContentMapItems(
  value: unknown,
  cluster: TopicClusterCluster
): TopicContentMapItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, itemIdx) => {
      const record = asRecord(item);
      if (!record) return null;

      const questionCandidate =
        toStringValue(record.targetQuestion) ||
        cluster.questionMap[itemIdx]?.question ||
        cluster.questionMap[0]?.question ||
        cluster.aeoQuestions[itemIdx] ||
        cluster.aeoQuestions[0];
      const primaryPublishTarget =
        toStringValue(record.primaryPublishTarget) ||
        cluster.primaryPublishTarget ||
        "客户官网（API直发）";
      const suggestedDistributionTargets = uniqueStrings(
        toStringArray(
          record.suggestedDistributionTargets ?? record.publishTargets
        ).filter((item) => !item.includes("官网"))
      );

      const normalizedItem: TopicContentMapItem = {
        type: toStringValue(record.type, "BuyingGuide"),
        title: toStringValue(record.title, `未命名内容 ${itemIdx + 1}`),
        briefGoal: toStringValue(
          record.briefGoal,
          "围绕目标买家的关键问题，提供可验证、可引用、可转化的答案。"
        ),
        funnel: normalizeStage(record.funnel) ?? "TOFU",
        intent: normalizeIntent(record.intent),
        mustUseEvidenceIds: toStringArray(record.mustUseEvidenceIds),
        targetQuestion: questionCandidate || undefined,
        targetRole:
          toStringValue(record.targetRole) ||
          cluster.targetRoles[0] ||
          cluster.questionMap[0]?.role ||
          cluster.questionMap[0]?.persona ||
          undefined,
        targetPersonaId:
          toStringValue(record.targetPersonaId) ||
          cluster.personaRef?.entityId ||
          undefined,
        targetPersonaName: toStringValue(record.targetPersonaName) || undefined,
        primaryPublishTarget,
        suggestedDistributionTargets,
        canAutoPublish: primaryPublishTarget.includes("官网"),
      };
      return normalizedItem;
    })
    .filter((item): item is TopicContentMapItem => item !== null);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function derivePublishingDirections(
  clusters: TopicClusterCluster[]
): TopicClusterPublishingDirection[] {
  const grouped = new Map<string, Set<string>>();

  for (const cluster of clusters) {
    const channels = [
      cluster.primaryPublishTarget || "客户官网（API直发）",
      ...cluster.suggestedDistributionTargets,
    ];
    for (const channel of channels) {
      if (!grouped.has(channel)) {
        grouped.set(channel, new Set<string>());
      }
      for (const item of cluster.contentMap) {
        grouped.get(channel)?.add(item.type);
      }
    }
  }

  return Array.from(grouped.entries()).map(([channel, contentTypes]) => ({
    mode: channel.includes("官网") ? "integrated" : "suggested",
    canAutoPublish: channel.includes("官网"),
    channel,
    contentTypes: Array.from(contentTypes),
  }));
}

function deriveQuestionDirections(clusters: TopicClusterCluster[]): TopicQuestionDirection[] {
  const questions = clusters.flatMap((cluster) => cluster.questionMap);
  const seen = new Set<string>();

  return questions.filter((item) => {
    const key = `${item.persona || ""}|${item.role || ""}|${item.question}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function normalizeTopicClusterContent(value: unknown): TopicClusterContent | null {
  const root = asRecord(value);
  const topicClusterRecord = asRecord(root?.topicCluster);
  if (!root || !topicClusterRecord) {
    return null;
  }

  const rawClusters = Array.isArray(topicClusterRecord.clusters)
    ? topicClusterRecord.clusters
    : [];

  const clusters: TopicClusterCluster[] = rawClusters
    .map((clusterValue, index) => {
      const record = asRecord(clusterValue);
      if (!record) return null;

      const questionMap = normalizeQuestionDirections(
        record.questionMap ?? record.aeoQuestions
      );

      const cluster: TopicClusterCluster = {
        pillar:
          toStringValue(record.pillar) ||
          toStringValue(record.clusterName) ||
          `内容支柱 ${index + 1}`,
        clusterName:
          toStringValue(record.clusterName) ||
          toStringValue(record.pillar) ||
          undefined,
        intent: toStringValue(record.intent, "informational"),
        coreKeywords: uniqueStrings(toStringArray(record.coreKeywords)),
        longTailKeywords: uniqueStrings(toStringArray(record.longTailKeywords)),
        aeoQuestions: uniqueStrings(
          toStringArray(record.aeoQuestions).concat(
            questionMap.map((item) => item.question)
          )
        ),
        commercialKeywords: uniqueStrings(toStringArray(record.commercialKeywords)),
        negatives: uniqueStrings(toStringArray(record.negatives)),
        personaRef: asRecord(record.personaRef)
          ? {
              entityId: toStringValue(asRecord(record.personaRef)?.entityId),
              versionId: toStringValue(asRecord(record.personaRef)?.versionId) || undefined,
            }
          : undefined,
        targetRoles: uniqueStrings(
          toStringArray(record.targetRoles).concat(
            questionMap.flatMap((item) => [item.role || "", item.persona || ""])
          )
        ),
        questionMap,
        primaryPublishTarget:
          toStringValue(record.primaryPublishTarget) || "客户官网（API直发）",
        suggestedDistributionTargets: uniqueStrings(
          toStringArray(
            record.suggestedDistributionTargets ??
              record.publishTargets ??
              record.recommendedChannels
          ).filter((item) => !item.includes("官网"))
        ),
        requiredEvidenceIds: uniqueStrings(toStringArray(record.requiredEvidenceIds)),
        contentMap: [],
      };

      cluster.contentMap = normalizeContentMapItems(record.contentMap, cluster);
      return cluster;
    })
    .filter((item): item is TopicClusterCluster => Boolean(item));

  const questionDirections = normalizeQuestionDirections(
    topicClusterRecord.questionDirections
  );
  const publishingDirections = normalizePublishingDirections(
    topicClusterRecord.publishingDirections
  );

  const normalized: TopicClusterContent = {
    topicCluster: {
      name: toStringValue(topicClusterRecord.name, "未命名 Topic Cluster"),
      customerUnderstanding: uniqueStrings(
        toStringArray(
          topicClusterRecord.customerUnderstanding ?? topicClusterRecord.brandUnderstanding
        )
      ),
      buyerUnderstanding: uniqueStrings(
        toStringArray(
          topicClusterRecord.buyerUnderstanding ?? topicClusterRecord.targetCustomerInsights
        )
      ),
      questionDirections:
        questionDirections.length > 0 ? questionDirections : deriveQuestionDirections(clusters),
      publishingDirections:
        publishingDirections.length > 0
          ? publishingDirections
          : derivePublishingDirections(clusters),
      clusters,
    },
    openQuestions: toStringArray(root.openQuestions),
    confidence: typeof root.confidence === "number" ? root.confidence : undefined,
    assumptions: toStringArray(root.assumptions),
    evidenceIds: toStringArray(root.evidenceIds),
    suggestedNextSkills: toStringArray(root.suggestedNextSkills),
  };

  return normalized;
}
