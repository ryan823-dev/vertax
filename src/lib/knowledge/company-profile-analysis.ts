import { chatCompletion, parseStructuredJsonObjectResponse } from "@/lib/ai-client";
import type { EvidenceTypeValue } from "@/types/knowledge";

export const MAX_COMPANY_PROFILE_ANALYSIS_CONTEXT_CHARS = 58000;

const MAX_COMPANY_PROFILE_ANALYSIS_CHUNK_CHARS = 900;
const MAX_COMPANY_PROFILE_ANALYSIS_TOTAL_CHUNKS = 64;
const MAX_COMPANY_PROFILE_ANALYSIS_CHUNKS_PER_ASSET = 2;
const MAX_COMPANY_PROFILE_ANALYSIS_TOTAL_EVIDENCES = 18;
const MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_CHARS = 260;
const MAX_COMPANY_PROFILE_ANALYSIS_OVERVIEW_SAMPLE = 12;
const MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_SEEDS = 12;
const MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_SEED_CHARS = 420;
const MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_TAGS = 4;
const CONTEXT_SECTION_BUFFER = 1800;

type AssetMetadata = {
  sourceUrl?: unknown;
  chunkCount?: unknown;
};

export type CompanyProfileAnalysisAssetCandidate = {
  id: string;
  originalName: string;
  title: string;
  description: string | null;
  storageKey: string;
  mimeType: string;
  fileCategory: string;
  fileSize: bigint | number;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
};

export type CompanyProfileAnalysisSelectionMode =
  | "requested"
  | "all-ready-assets";

export type CompanyProfileAnalysisSelection<
  T extends CompanyProfileAnalysisAssetCandidate = CompanyProfileAnalysisAssetCandidate,
> = {
  mode: CompanyProfileAnalysisSelectionMode;
  requestedCount: number;
  availableCount: number;
  selected: T[];
};

export type CompanyProfileAnalysisContextStats = {
  assetCount: number;
  rawChunkCount: number;
  fallbackAssetCount: number;
  evidenceCount: number;
  evidenceSeedCount: number;
  reusedEvidenceCount: number;
  generatedEvidenceCount: number;
  selectedAssetCount: number;
  selectedChunkCount: number;
  selectedEvidenceCount: number;
  contextChars: number;
};

export type CompanyProfileAnalysisContext = {
  sections: string[];
  stats: CompanyProfileAnalysisContextStats;
};

type CompanyProfileAnalysisChunkInput = {
  id?: string;
  assetId: string;
  content: string;
  chunkIndex: number;
  pageNumber?: number | null;
  charStart?: number | null;
  charEnd?: number | null;
};

type CompanyProfileAnalysisEvidenceInput = {
  id: string;
  assetId: string | null;
  chunkId?: string | null;
  title: string;
  content: string;
  type: string;
  tags?: string[];
  updatedAt: Date;
};

export type CompanyProfileAnalysisEvidenceSeed = {
  assetId: string;
  assetLabel: string;
  bucket: string;
  score: number;
  chunkId?: string;
  chunkIndex: number;
  sourceUrl: string;
  content: string;
  pageNumber?: number | null;
};

export type CompanyProfileAnalysisEvidenceMaterialization = {
  evidences: CompanyProfileAnalysisEvidenceInput[];
  stats: Pick<
    CompanyProfileAnalysisContextStats,
    "evidenceCount" | "evidenceSeedCount" | "reusedEvidenceCount" | "generatedEvidenceCount"
  >;
};

type AssetBucket =
  | "home"
  | "about"
  | "products"
  | "solutions"
  | "industries"
  | "technology"
  | "capabilities"
  | "trust"
  | "default"
  | "utility";

type ScoredAsset = {
  asset: CompanyProfileAnalysisAssetCandidate;
  bucket: AssetBucket;
  score: number;
  rank: number;
  sourceUrl: string;
};

type ChunkCandidate = {
  assetId: string;
  assetLabel: string;
  bucket: AssetBucket;
  score: number;
  chunkId?: string;
  chunkIndex: number;
  sourceUrl: string;
  content: string;
  pageNumber?: number | null;
  charStart?: number | null;
  charEnd?: number | null;
  entry: string;
};

type EvidenceCandidate = {
  id: string;
  assetId: string | null;
  score: number;
  entry: string;
};

const BUCKET_PRIORITY: AssetBucket[] = [
  "home",
  "about",
  "products",
  "solutions",
  "industries",
  "technology",
  "capabilities",
  "trust",
];

const BUCKET_LABELS: Record<AssetBucket, string> = {
  home: "首页/总览",
  about: "企业介绍",
  products: "产品目录",
  solutions: "解决方案",
  industries: "行业应用",
  technology: "技术研发",
  capabilities: "制造能力",
  trust: "资质背书",
  default: "通用资料",
  utility: "低价值页面",
};

const BUCKET_KEYWORDS: Record<Exclude<AssetBucket, "default" | "utility">, string[]> =
  {
    home: ["home", "index", "welcome"],
    about: [
      "about",
      "about us",
      "company",
      "profile",
      "overview",
      "who we are",
      "mission",
      "vision",
      "story",
      "history",
      "team",
      "enterprise",
      "introduction",
      "介绍",
      "关于",
      "公司简介",
      "企业简介",
    ],
    products: [
      "product",
      "products",
      "catalog",
      "catalogue",
      "brochure",
      "linecard",
      "portfolio",
      "产品",
      "产品中心",
      "产品目录",
    ],
    solutions: [
      "solution",
      "solutions",
      "service",
      "services",
      "offering",
      "offerings",
      "方案",
      "解决方案",
      "服务",
    ],
    industries: [
      "industry",
      "industries",
      "application",
      "applications",
      "market",
      "markets",
      "sector",
      "sectors",
      "行业",
      "应用",
      "市场",
    ],
    technology: [
      "technology",
      "technologies",
      "tech",
      "innovation",
      "r&d",
      "research",
      "研发",
      "技术",
      "创新",
    ],
    capabilities: [
      "capability",
      "capabilities",
      "manufacturing",
      "factory",
      "production",
      "process",
      "facility",
      "facilities",
      "plant",
      "equipment",
      "capacity",
      "capability statement",
      "制造",
      "工厂",
      "产能",
      "设备",
      "能力",
    ],
    trust: [
      "quality",
      "certificate",
      "certification",
      "compliance",
      "standard",
      "advantage",
      "advantages",
      "case study",
      "case studies",
      "client",
      "clients",
      "customer",
      "customers",
      "testimonial",
      "testimonials",
      "资质",
      "认证",
      "优势",
      "客户",
      "案例",
    ],
  };

const NEGATIVE_KEYWORDS = [
  "blog",
  "news",
  "article",
  "post",
  "posts",
  "privacy",
  "policy",
  "terms",
  "cookie",
  "cookies",
  "career",
  "careers",
  "job",
  "jobs",
  "login",
  "sign in",
  "sign-in",
  "signup",
  "sign up",
  "register",
  "cart",
  "checkout",
  "account",
  "search",
  "tag",
  "tags",
  "archive",
  "feed",
  "legal",
  "404",
  "contact",
  "support",
  "help center",
  "privacy policy",
  "terms of service",
  "博客",
  "新闻",
  "登录",
  "注册",
  "隐私",
  "条款",
  "招聘",
  "联系",
];

const HIGH_SIGNAL_PATTERNS = [
  /\biso\b/i,
  /\bce\b/i,
  /\bfda\b/i,
  /\bul\b/i,
  /\brohs\b/i,
  /\boem\b/i,
  /\bodm\b/i,
  /\bddp\b/i,
  /\bexport\b/i,
  /\bfactory\b/i,
  /\bmanufactur/i,
  /\bcapacity\b/i,
  /\blead time\b/i,
  /\bmoq\b/i,
  /认证/,
  /资质/,
  /专利/,
  /出口/,
  /全球/,
  /海外/,
  /工厂/,
  /产能/,
  /交期/,
];

const BOILERPLATE_PATTERNS = [
  /all rights reserved/i,
  /copyright/i,
  /privacy policy/i,
  /terms of service/i,
  /cookie/i,
  /sign in/i,
  /log in/i,
  /subscribe/i,
  /购物车/,
  /加入购物车/,
];

function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[%+]/g, " ")
    .replace(/[_/\\|.-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxChars: number): string {
  const text = collapseWhitespace(value);
  if (text.length <= maxChars) {
    return text;
  }

  const sliced = text.slice(0, maxChars - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.6) {
    return `${sliced.slice(0, lastSpace).trim()}…`;
  }
  return `${sliced.trim()}…`;
}

function getMetadata(asset: CompanyProfileAnalysisAssetCandidate): AssetMetadata {
  if (!asset.metadata || typeof asset.metadata !== "object") {
    return {};
  }
  return asset.metadata as AssetMetadata;
}

function getSourceUrl(asset: CompanyProfileAnalysisAssetCandidate): string {
  const metadata = getMetadata(asset);
  if (typeof metadata.sourceUrl === "string" && metadata.sourceUrl.length > 0) {
    return metadata.sourceUrl;
  }
  if (asset.storageKey.startsWith("web://")) {
    return asset.storageKey.replace("web://", "");
  }
  return "";
}

function getPathname(sourceUrl: string): string {
  if (!sourceUrl) return "";
  try {
    return new URL(sourceUrl).pathname || "/";
  } catch {
    return "";
  }
}

function getPathDepth(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}

function includesKeyword(text: string, keyword: string): boolean {
  return text.includes(normalizeText(keyword));
}

function getChunkCount(asset: CompanyProfileAnalysisAssetCandidate): number {
  const metadata = getMetadata(asset);
  return typeof metadata.chunkCount === "number" ? metadata.chunkCount : 0;
}

function getNumericFileSize(asset: CompanyProfileAnalysisAssetCandidate): number {
  return typeof asset.fileSize === "bigint" ? Number(asset.fileSize) : asset.fileSize;
}

function getAssetLabel(asset: CompanyProfileAnalysisAssetCandidate): string {
  return asset.originalName || asset.title || getSourceUrl(asset) || asset.id;
}

function detectBucket(asset: CompanyProfileAnalysisAssetCandidate): AssetBucket {
  const sourceUrl = getSourceUrl(asset);
  const pathname = getPathname(sourceUrl);
  const normalizedText = normalizeText(
    [asset.originalName, asset.title, asset.description, sourceUrl, pathname].join(" "),
  );

  if (NEGATIVE_KEYWORDS.some((keyword) => includesKeyword(normalizedText, keyword))) {
    return "utility";
  }

  if (!pathname || pathname === "/" || pathname === "") {
    return "home";
  }

  for (const bucket of BUCKET_PRIORITY) {
    if (
      BUCKET_KEYWORDS[bucket].some((keyword) =>
        includesKeyword(normalizedText, keyword),
      )
    ) {
      return bucket;
    }
  }

  return "default";
}

function scoreAsset(
  asset: CompanyProfileAnalysisAssetCandidate,
  index: number,
): { bucket: AssetBucket; score: number } {
  const bucket = detectBucket(asset);
  const sourceUrl = getSourceUrl(asset);
  const pathname = getPathname(sourceUrl);
  const pathDepth = getPathDepth(pathname);
  const normalizedText = normalizeText(
    [asset.originalName, asset.title, asset.description, sourceUrl, pathname].join(" "),
  );

  let score = 0;

  if (asset.fileCategory === "document") {
    score += 20;
  }

  if (sourceUrl) {
    score += 18;
  }

  if (asset.tags.includes("web-import")) {
    score += 6;
  }

  if (bucket === "home") score += 85;
  if (bucket === "about") score += 75;
  if (bucket === "products") score += 68;
  if (bucket === "solutions") score += 62;
  if (bucket === "industries") score += 58;
  if (bucket === "technology") score += 54;
  if (bucket === "capabilities") score += 64;
  if (bucket === "trust") score += 42;
  if (bucket === "utility") score -= 80;

  for (const keywords of Object.values(BUCKET_KEYWORDS)) {
    for (const keyword of keywords) {
      if (includesKeyword(normalizedText, keyword)) {
        score += 4;
      }
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (includesKeyword(normalizedText, keyword)) {
      score -= 18;
    }
  }

  if (pathname === "/" || pathname === "") {
    score += 25;
  } else {
    score += Math.max(0, 18 - pathDepth * 4);
  }

  score += Math.min(getChunkCount(asset), 6) * 3;
  score += Math.min(Math.floor(getNumericFileSize(asset) / 12000), 18);
  score += Math.max(0, 8 - index);

  return { bucket, score };
}

function rankAssets(
  assets: CompanyProfileAnalysisAssetCandidate[],
): ScoredAsset[] {
  const scored = assets
    .map((asset, index) => ({
      asset,
      sourceUrl: getSourceUrl(asset),
      ...scoreAsset(asset, index),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightFileSize = getNumericFileSize(right.asset);
      const leftFileSize = getNumericFileSize(left.asset);
      if (rightFileSize !== leftFileSize) {
        return rightFileSize - leftFileSize;
      }

      return right.asset.createdAt.getTime() - left.asset.createdAt.getTime();
    });

  return scored.map((item, index) => ({
    ...item,
    rank: index,
  }));
}

function scoreChunkCandidate(
  content: string,
  asset: ScoredAsset,
  chunkIndex: number,
): number {
  const normalizedText = normalizeText(content);
  const collapsed = collapseWhitespace(content);
  const length = collapsed.length;

  let score = asset.score;

  if (chunkIndex === 0) {
    score += 24;
  } else if (chunkIndex < 3) {
    score += 10;
  }

  if (length >= 180 && length <= 1400) {
    score += 14;
  } else if (length < 80) {
    score -= 24;
  } else if (length > 2200) {
    score -= 12;
  }

  if (/\d/.test(collapsed)) {
    score += 6;
  }

  if (asset.bucket !== "default" && asset.bucket !== "utility") {
    for (const keyword of BUCKET_KEYWORDS[asset.bucket]) {
      if (includesKeyword(normalizedText, keyword)) {
        score += 6;
      }
    }
  }

  for (const pattern of HIGH_SIGNAL_PATTERNS) {
    if (pattern.test(collapsed)) {
      score += 8;
    }
  }

  for (const pattern of BOILERPLATE_PATTERNS) {
    if (pattern.test(collapsed)) {
      score -= 18;
    }
  }

  return score;
}

function scoreEvidenceCandidate(
  evidence: CompanyProfileAnalysisEvidenceInput,
  asset: ScoredAsset | undefined,
): number {
  const combinedText = `${evidence.title} ${evidence.content}`;
  let score = asset?.score ?? 20;

  if (evidence.title.trim()) {
    score += 8;
  }

  if (/\d/.test(combinedText)) {
    score += 4;
  }

  for (const pattern of HIGH_SIGNAL_PATTERNS) {
    if (pattern.test(combinedText)) {
      score += 6;
    }
  }

  for (const pattern of BOILERPLATE_PATTERNS) {
    if (pattern.test(combinedText)) {
      score -= 12;
    }
  }

  return score;
}

function createChunkEntry(candidate: ChunkCandidate): string {
  return candidate.entry;
}

function createEvidenceEntry(candidate: EvidenceCandidate): string {
  return candidate.entry;
}

function createChunkCandidates(
  scoredAssets: ScoredAsset[],
  chunks: CompanyProfileAnalysisChunkInput[],
): Map<string, ChunkCandidate[]> {
  const chunksByAsset = new Map<string, CompanyProfileAnalysisChunkInput[]>();
  for (const chunk of chunks) {
    const cleaned = collapseWhitespace(chunk.content);
    if (!cleaned) continue;

    if (!chunksByAsset.has(chunk.assetId)) {
      chunksByAsset.set(chunk.assetId, []);
    }
    chunksByAsset.get(chunk.assetId)?.push({
      ...chunk,
      content: cleaned,
    });
  }

  const candidatesByAsset = new Map<string, ChunkCandidate[]>();

  for (const scoredAsset of scoredAssets) {
    const assetChunks = chunksByAsset.get(scoredAsset.asset.id) ?? [];
    if (assetChunks.length === 0) {
      continue;
    }

    const seenExcerpts = new Set<string>();
    const candidates = assetChunks
      .map((chunk) => {
        const excerpt = truncateText(
          chunk.content,
          MAX_COMPANY_PROFILE_ANALYSIS_CHUNK_CHARS,
        );
        const dedupeKey = excerpt.slice(0, 160);
        if (seenExcerpts.has(dedupeKey)) {
          return null;
        }
        seenExcerpts.add(dedupeKey);

        const sourceLabel = scoredAsset.sourceUrl || "资料库文档";
        return {
          assetId: scoredAsset.asset.id,
          assetLabel: getAssetLabel(scoredAsset.asset),
          bucket: scoredAsset.bucket,
          score: scoreChunkCandidate(chunk.content, scoredAsset, chunk.chunkIndex),
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          sourceUrl: scoredAsset.sourceUrl,
          content: excerpt,
          pageNumber: chunk.pageNumber,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          entry: `- [${BUCKET_LABELS[scoredAsset.bucket]}] ${getAssetLabel(scoredAsset.asset)} | ${sourceLabel} | 片段${chunk.chunkIndex + 1}: ${excerpt}`,
        } satisfies ChunkCandidate;
      })
      .filter((candidate): candidate is ChunkCandidate => Boolean(candidate))
      .sort((left, right) => right.score - left.score);

    if (candidates.length > 0) {
      candidatesByAsset.set(scoredAsset.asset.id, candidates);
    }
  }

  return candidatesByAsset;
}

function createEvidenceCandidates(
  scoredAssets: ScoredAsset[],
  evidences: CompanyProfileAnalysisEvidenceInput[],
): EvidenceCandidate[] {
  const assetMap = new Map(scoredAssets.map((item) => [item.asset.id, item]));
  const seenEntries = new Set<string>();

  return evidences
    .map((evidence) => {
      const asset = evidence.assetId ? assetMap.get(evidence.assetId) : undefined;
      const label = asset ? getAssetLabel(asset.asset) : "补充证据";
      const excerpt = truncateText(
        `${evidence.title}: ${evidence.content}`,
        MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_CHARS,
      );
      const dedupeKey = `${evidence.title}::${excerpt}`.slice(0, 200);
      if (seenEntries.has(dedupeKey)) {
        return null;
      }
      seenEntries.add(dedupeKey);

      return {
        id: evidence.id,
        assetId: evidence.assetId,
        score: scoreEvidenceCandidate(evidence, asset),
        entry: `- (${evidence.type}) ${label}: ${excerpt}`,
      } satisfies EvidenceCandidate;
    })
    .filter((candidate): candidate is EvidenceCandidate => Boolean(candidate))
    .sort((left, right) => right.score - left.score);
}

function buildOverviewSection(
  scoredAssets: ScoredAsset[],
  rawChunkCount: number,
  evidenceCount: number,
): string {
  const bucketCounts = BUCKET_PRIORITY.map((bucket) => {
    const count = scoredAssets.filter((asset) => asset.bucket === bucket).length;
    return count > 0 ? `${BUCKET_LABELS[bucket]} ${count}` : null;
  }).filter(Boolean);

  const defaultCount = scoredAssets.filter((asset) => asset.bucket === "default").length;
  if (defaultCount > 0) {
    bucketCounts.push(`${BUCKET_LABELS.default} ${defaultCount}`);
  }

  const utilityCount = scoredAssets.filter((asset) => asset.bucket === "utility").length;
  if (utilityCount > 0) {
    bucketCounts.push(`${BUCKET_LABELS.utility} ${utilityCount}`);
  }

  const sampleAssets = scoredAssets
    .slice(0, MAX_COMPANY_PROFILE_ANALYSIS_OVERVIEW_SAMPLE)
    .map((item) => getAssetLabel(item.asset));
  const remaining = Math.max(0, scoredAssets.length - sampleAssets.length);

  return [
    "【全量素材覆盖概览】",
    `- 已综合素材数: ${scoredAssets.length}`,
    `- 已解析文本片段数: ${rawChunkCount}`,
    `- 已纳入结构化证据数: ${evidenceCount}`,
    `- 素材类型分布: ${bucketCounts.join("，") || "暂无明确分类"}`,
    `- 高信号来源样例: ${sampleAssets.join("；") || "暂无"}${remaining > 0 ? `；其余 ${remaining} 份素材也已参与候选排序与片段抽取。` : ""}`,
  ].join("\n");
}

function selectEvidenceEntries(
  evidenceCandidates: EvidenceCandidate[],
  maxChars: number,
): EvidenceCandidate[] {
  const selected: EvidenceCandidate[] = [];
  const usedAssets = new Set<string>();
  let usedChars = 0;

  for (const candidate of evidenceCandidates) {
    if (selected.length >= MAX_COMPANY_PROFILE_ANALYSIS_TOTAL_EVIDENCES) {
      break;
    }

    if (candidate.assetId && usedAssets.has(candidate.assetId)) {
      continue;
    }

    const entry = createEvidenceEntry(candidate);
    if (usedChars + entry.length > maxChars) {
      continue;
    }

    selected.push(candidate);
    usedChars += entry.length;
    if (candidate.assetId) {
      usedAssets.add(candidate.assetId);
    }
  }

  return selected;
}

function selectChunkEntries(
  scoredAssets: ScoredAsset[],
  candidatesByAsset: Map<string, ChunkCandidate[]>,
  maxChars: number,
): ChunkCandidate[] {
  const selected: ChunkCandidate[] = [];
  const selectedKeys = new Set<string>();
  const perAssetCount = new Map<string, number>();
  let usedChars = 0;

  const tryAdd = (candidate: ChunkCandidate | undefined) => {
    if (!candidate) return false;

    const key = `${candidate.assetId}:${candidate.chunkIndex}`;
    if (selectedKeys.has(key)) {
      return false;
    }

    const currentCount = perAssetCount.get(candidate.assetId) ?? 0;
    if (currentCount >= MAX_COMPANY_PROFILE_ANALYSIS_CHUNKS_PER_ASSET) {
      return false;
    }

    const entry = createChunkEntry(candidate);
    if (usedChars + entry.length > maxChars) {
      return false;
    }

    selected.push(candidate);
    selectedKeys.add(key);
    perAssetCount.set(candidate.assetId, currentCount + 1);
    usedChars += entry.length;
    return true;
  };

  // Round 1: guarantee category coverage for strategic buckets.
  for (const bucket of BUCKET_PRIORITY) {
    const candidate = scoredAssets
      .filter((asset) => asset.bucket === bucket)
      .flatMap((asset) => candidatesByAsset.get(asset.asset.id) ?? [])
      .sort((left, right) => right.score - left.score)[0];

    tryAdd(candidate);
  }

  const strategicAssets = scoredAssets.filter((asset) => asset.bucket !== "utility");

  // Round 2: give every strategic asset one chance to contribute.
  for (const asset of strategicAssets) {
    const candidate = (candidatesByAsset.get(asset.asset.id) ?? [])[0];
    tryAdd(candidate);
    if (selected.length >= MAX_COMPANY_PROFILE_ANALYSIS_TOTAL_CHUNKS) {
      return selected;
    }
  }

  // Round 3: allow a second high-value chunk from strong assets.
  for (let round = 1; round < MAX_COMPANY_PROFILE_ANALYSIS_CHUNKS_PER_ASSET; round += 1) {
    for (const asset of strategicAssets) {
      const candidate = (candidatesByAsset.get(asset.asset.id) ?? [])[round];
      tryAdd(candidate);
      if (selected.length >= MAX_COMPANY_PROFILE_ANALYSIS_TOTAL_CHUNKS) {
        return selected;
      }
    }
  }

  return selected;
}

function selectEvidenceSeedCandidates(
  scoredAssets: ScoredAsset[],
  candidatesByAsset: Map<string, ChunkCandidate[]>,
  maxCandidates = MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_SEEDS,
): ChunkCandidate[] {
  const selected: ChunkCandidate[] = [];
  const selectedKeys = new Set<string>();
  const usedAssets = new Set<string>();

  const tryAdd = (candidate: ChunkCandidate | undefined) => {
    if (!candidate?.chunkId) {
      return false;
    }

    const key = `${candidate.assetId}:${candidate.chunkId}`;
    if (selectedKeys.has(key) || usedAssets.has(candidate.assetId)) {
      return false;
    }

    selected.push(candidate);
    selectedKeys.add(key);
    usedAssets.add(candidate.assetId);
    return true;
  };

  for (const bucket of BUCKET_PRIORITY) {
    const candidate = scoredAssets
      .filter((asset) => asset.bucket === bucket)
      .flatMap((asset) => candidatesByAsset.get(asset.asset.id) ?? [])
      .filter((candidate) => Boolean(candidate.chunkId))
      .sort((left, right) => right.score - left.score)[0];

    tryAdd(candidate);
    if (selected.length >= maxCandidates) {
      return selected;
    }
  }

  const remaining = scoredAssets
    .filter((asset) => asset.bucket !== "utility")
    .flatMap((asset) => candidatesByAsset.get(asset.asset.id) ?? [])
    .filter((candidate) => Boolean(candidate.chunkId))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.chunkIndex - right.chunkIndex;
    });

  for (const candidate of remaining) {
    tryAdd(candidate);
    if (selected.length >= maxCandidates) {
      return selected;
    }
  }

  return selected;
}

export function selectCompanyProfileAnalysisEvidenceSeeds({
  assets,
  chunks,
  maxCandidates = MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_SEEDS,
}: {
  assets: CompanyProfileAnalysisAssetCandidate[];
  chunks: CompanyProfileAnalysisChunkInput[];
  maxCandidates?: number;
}): CompanyProfileAnalysisEvidenceSeed[] {
  const selectedAssets = selectCompanyProfileAnalysisAssets(assets);
  const scoredAssets = rankAssets(selectedAssets);
  const candidatesByAsset = createChunkCandidates(scoredAssets, chunks);

  return selectEvidenceSeedCandidates(scoredAssets, candidatesByAsset, maxCandidates).map(
    (candidate) => ({
      assetId: candidate.assetId,
      assetLabel: candidate.assetLabel,
      bucket: candidate.bucket,
      score: candidate.score,
      chunkId: candidate.chunkId,
      chunkIndex: candidate.chunkIndex,
      sourceUrl: candidate.sourceUrl,
      content: candidate.content,
      pageNumber: candidate.pageNumber,
    }),
  );
}

type StructuredEvidenceDraft = {
  candidateIndex: number;
  type: EvidenceTypeValue;
  title: string;
  content: string;
  tags: string[];
};

type LoadedCompanyProfileAnalysisMaterials = {
  chunks: CompanyProfileAnalysisChunkInput[];
  evidences: CompanyProfileAnalysisEvidenceInput[];
  fallbackAssetCount: number;
};

const VALID_EVIDENCE_TYPES = new Set<EvidenceTypeValue>([
  "claim",
  "statistic",
  "testimonial",
  "case_study",
  "certification",
]);

function normalizeEvidenceType(value: unknown): EvidenceTypeValue {
  if (typeof value === "string" && VALID_EVIDENCE_TYPES.has(value as EvidenceTypeValue)) {
    return value as EvidenceTypeValue;
  }

  return "claim";
}

function normalizeEvidenceTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = collapseWhitespace(item).toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(normalized);
    if (tags.length >= MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_TAGS) {
      break;
    }
  }

  return tags;
}

function coerceStructuredEvidenceDraft(
  value: unknown,
): StructuredEvidenceDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateIndex =
    typeof record.candidateIndex === "number"
      ? record.candidateIndex
      : typeof record.candidateIndex === "string"
        ? Number.parseInt(record.candidateIndex, 10)
        : Number.NaN;
  const title =
    typeof record.title === "string" ? collapseWhitespace(record.title) : "";
  const content =
    typeof record.content === "string"
      ? truncateText(record.content, MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_CHARS)
      : "";

  if (!Number.isFinite(candidateIndex) || candidateIndex < 1 || !title || !content) {
    return null;
  }

  return {
    candidateIndex,
    type: normalizeEvidenceType(record.type),
    title: truncateText(title, 48),
    content,
    tags: normalizeEvidenceTags(record.tags),
  };
}

async function generateStructuredEvidenceDrafts(
  candidates: ChunkCandidate[],
): Promise<StructuredEvidenceDraft[]> {
  if (candidates.length === 0) {
    return [];
  }

  const prompt = candidates
    .map((candidate, index) =>
      [
        `[Candidate ${index + 1}]`,
        `Asset: ${candidate.assetLabel}`,
        `Bucket: ${candidate.bucket}`,
        `Source: ${candidate.sourceUrl || "asset-library"}`,
        `Chunk: ${candidate.chunkIndex + 1}`,
        candidate.pageNumber ? `Page: ${candidate.pageNumber}` : null,
        `Excerpt: ${truncateText(candidate.content, MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_SEED_CHARS)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  const response = await chatCompletion(
    [
      {
        role: "system",
        content: `你是一个 B2B 证据分析助手。请从候选片段中提炼可复用的结构化证据，用于驱动企业档案和 ICP 生成。

返回严格 JSON：
{
  "evidences": [
    {
      "candidateIndex": 1,
      "type": "claim|statistic|testimonial|case_study|certification",
      "title": "不超过 24 个汉字",
      "content": "不超过 180 个汉字，只保留片段中能直接支持的事实",
      "tags": ["1-4 个简短标签"]
    }
  ]
}

规则：
- 每个 candidate 最多提炼 1 条 evidence。
- 无价值的 boilerplate、登录、隐私、法律说明不要输出。
- 优先提炼产品能力、制造能力、认证资质、交付方式、行业场景、出口经验、客户结果、海外市场信号。
- 不能编造，没有明确事实就跳过该 candidate。
- 只输出 JSON。`,
      },
      {
        role: "user",
        content: `请基于以下候选片段生成结构化 evidence：\n\n${prompt}`,
      },
    ],
    {
      model: "qwen-plus",
      temperature: 0.1,
      maxTokens: 2048,
    },
  );

  const parsed = await parseStructuredJsonObjectResponse(response.content);
  const rows = Array.isArray(parsed.evidences) ? parsed.evidences : [];

  return rows
    .map((row) => coerceStructuredEvidenceDraft(row))
    .filter((row): row is StructuredEvidenceDraft => Boolean(row));
}

function dedupeEvidenceRows(
  evidences: CompanyProfileAnalysisEvidenceInput[],
): CompanyProfileAnalysisEvidenceInput[] {
  const deduped = new Map<string, CompanyProfileAnalysisEvidenceInput>();
  for (const evidence of evidences) {
    deduped.set(evidence.id, evidence);
  }

  return [...deduped.values()].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

async function loadCompanyProfileAnalysisMaterials({
  tenantId,
  assets,
}: {
  tenantId: string;
  assets: CompanyProfileAnalysisAssetCandidate[];
}): Promise<LoadedCompanyProfileAnalysisMaterials> {
  const { db } = await import("@/lib/db");
  const { extractTextFromAsset } = await import("@/lib/utils/text-extract");

  const selectedAssets = selectCompanyProfileAnalysisAssets(assets);
  const assetIds = selectedAssets.map((asset) => asset.id);

  if (assetIds.length === 0) {
    return {
      chunks: [],
      evidences: [],
      fallbackAssetCount: 0,
    };
  }

  const [chunkRows, evidenceRows] = await Promise.all([
    db.assetChunk.findMany({
      where: { assetId: { in: assetIds }, tenantId },
      orderBy: [{ assetId: "asc" }, { chunkIndex: "asc" }],
      select: {
        id: true,
        assetId: true,
        content: true,
        chunkIndex: true,
        pageNumber: true,
        charStart: true,
        charEnd: true,
      },
    }),
    db.evidence.findMany({
      where: {
        tenantId,
        deletedAt: null,
        assetId: { in: assetIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        assetId: true,
        chunkId: true,
        title: true,
        content: true,
        type: true,
        tags: true,
        updatedAt: true,
      },
    }),
  ]);

  const chunks: CompanyProfileAnalysisChunkInput[] = chunkRows.map((chunk) => ({
    id: chunk.id,
    assetId: chunk.assetId,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
  }));

  const coveredAssetIds = new Set(chunks.map((chunk) => chunk.assetId));
  let fallbackAssetCount = 0;

  for (const asset of selectedAssets) {
    if (coveredAssetIds.has(asset.id)) continue;
    if (getNumericFileSize(asset) > 5 * 1024 * 1024) continue;

    try {
      const text = await extractTextFromAsset(asset.storageKey, asset.mimeType);
      if (text && text.length > 10) {
        chunks.push({
          assetId: asset.id,
          content: text,
          chunkIndex: 0,
        });
        fallbackAssetCount += 1;
      }
    } catch (error) {
      console.warn(`Failed to extract text from ${asset.originalName}:`, error);
    }
  }

  return {
    chunks,
    evidences: evidenceRows.map((evidence) => ({
      id: evidence.id,
      assetId: evidence.assetId,
      chunkId: evidence.chunkId,
      title: evidence.title,
      content: evidence.content,
      type: evidence.type,
      tags: evidence.tags,
      updatedAt: evidence.updatedAt,
    })),
    fallbackAssetCount,
  };
}

export async function ensureCompanyProfileAnalysisEvidence({
  tenantId,
  userId,
  assets,
  materials,
  maxCandidates = MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_SEEDS,
}: {
  tenantId: string;
  userId: string;
  assets: CompanyProfileAnalysisAssetCandidate[];
  materials?: LoadedCompanyProfileAnalysisMaterials;
  maxCandidates?: number;
}): Promise<CompanyProfileAnalysisEvidenceMaterialization> {
  const selectedAssets = selectCompanyProfileAnalysisAssets(assets);
  const resolvedMaterials =
    materials ??
    (await loadCompanyProfileAnalysisMaterials({
      tenantId,
      assets: selectedAssets,
    }));
  const baseEvidences = dedupeEvidenceRows(resolvedMaterials.evidences);
  const evidenceSeeds = selectCompanyProfileAnalysisEvidenceSeeds({
    assets: selectedAssets,
    chunks: resolvedMaterials.chunks,
    maxCandidates,
  }).filter((candidate) => Boolean(candidate.chunkId));

  if (evidenceSeeds.length === 0) {
    return {
      evidences: baseEvidences,
      stats: {
        evidenceCount: baseEvidences.length,
        evidenceSeedCount: 0,
        reusedEvidenceCount: 0,
        generatedEvidenceCount: 0,
      },
    };
  }

  const existingByChunkId = new Map<string, CompanyProfileAnalysisEvidenceInput[]>();
  for (const evidence of baseEvidences) {
    if (!evidence.chunkId) continue;
    const current = existingByChunkId.get(evidence.chunkId) ?? [];
    current.push(evidence);
    existingByChunkId.set(evidence.chunkId, current);
  }

  let reusedEvidenceCount = 0;
  const missingCandidates = evidenceSeeds.filter((candidate) => {
    const matched = candidate.chunkId
      ? existingByChunkId.get(candidate.chunkId) ?? []
      : [];
    if (matched.length > 0) {
      reusedEvidenceCount += 1;
      return false;
    }

    return true;
  });

  const generatedEvidenceRows: CompanyProfileAnalysisEvidenceInput[] = [];
  if (missingCandidates.length > 0) {
    try {
      const drafts = await generateStructuredEvidenceDrafts(
        missingCandidates.map((candidate) => ({
          assetId: candidate.assetId,
          assetLabel: candidate.assetLabel,
          bucket: candidate.bucket as AssetBucket,
          score: candidate.score,
          chunkId: candidate.chunkId,
          chunkIndex: candidate.chunkIndex,
          sourceUrl: candidate.sourceUrl,
          content: candidate.content,
          pageNumber: candidate.pageNumber,
          entry: "",
        })),
      );
      const { db } = await import("@/lib/db");

      for (const draft of drafts) {
        const candidate = missingCandidates[draft.candidateIndex - 1];
        if (!candidate?.chunkId) {
          continue;
        }

        try {
          const created = await db.evidence.create({
            data: {
              tenantId,
              title: draft.title,
              content: draft.content,
              type: draft.type,
              sourceLocator: {
                assetId: candidate.assetId,
                chunkId: candidate.chunkId,
                page: candidate.pageNumber ?? undefined,
                highlightText: candidate.content.slice(0, 200),
              },
              chunkId: candidate.chunkId,
              assetId: candidate.assetId,
              tags: ["company-profile", "icp-seed", ...draft.tags].slice(
                0,
                MAX_COMPANY_PROFILE_ANALYSIS_EVIDENCE_TAGS + 2,
              ),
              metadata: {
                generatedFrom: "company-profile-analysis",
                bucket: candidate.bucket,
                chunkIndex: candidate.chunkIndex,
                sourceUrl: candidate.sourceUrl,
              },
              createdById: userId,
            },
            select: {
              id: true,
              assetId: true,
              chunkId: true,
              title: true,
              content: true,
              type: true,
              tags: true,
              updatedAt: true,
            },
          });

          generatedEvidenceRows.push({
            id: created.id,
            assetId: created.assetId,
            chunkId: created.chunkId,
            title: created.title,
            content: created.content,
            type: created.type,
            tags: created.tags,
            updatedAt: created.updatedAt,
          });
        } catch (error) {
          console.warn(
            `[company-profile-analysis] failed to persist evidence for chunk ${candidate.chunkId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.warn(
        "[company-profile-analysis] evidence materialization skipped after AI error:",
        error,
      );
    }
  }

  const evidences = dedupeEvidenceRows([...baseEvidences, ...generatedEvidenceRows]);

  return {
    evidences,
    stats: {
      evidenceCount: evidences.length,
      evidenceSeedCount: evidenceSeeds.length,
      reusedEvidenceCount,
      generatedEvidenceCount: generatedEvidenceRows.length,
    },
  };
}

export function selectCompanyProfileAnalysisAssets<
  T extends CompanyProfileAnalysisAssetCandidate,
>(assets: T[]): T[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) {
      return false;
    }
    seen.add(asset.id);
    return true;
  });
}

export function composeCompanyProfileAnalysisContext({
  assets,
  chunks,
  evidences = [],
  maxContextChars = MAX_COMPANY_PROFILE_ANALYSIS_CONTEXT_CHARS,
}: {
  assets: CompanyProfileAnalysisAssetCandidate[];
  chunks: CompanyProfileAnalysisChunkInput[];
  evidences?: CompanyProfileAnalysisEvidenceInput[];
  maxContextChars?: number;
}): CompanyProfileAnalysisContext {
  const selectedAssets = selectCompanyProfileAnalysisAssets(assets);
  if (chunks.length === 0 && evidences.length === 0) {
    return {
      sections: [],
      stats: {
        assetCount: selectedAssets.length,
        rawChunkCount: 0,
        fallbackAssetCount: 0,
        evidenceCount: 0,
        evidenceSeedCount: 0,
        reusedEvidenceCount: 0,
        generatedEvidenceCount: 0,
        selectedAssetCount: 0,
        selectedChunkCount: 0,
        selectedEvidenceCount: 0,
        contextChars: 0,
      },
    };
  }

  const scoredAssets = rankAssets(selectedAssets);
  const chunkCandidatesByAsset = createChunkCandidates(scoredAssets, chunks);
  const evidenceCandidates = createEvidenceCandidates(scoredAssets, evidences);

  const overviewSection = buildOverviewSection(
    scoredAssets,
    chunks.length,
    evidences.length,
  );

  const safetyBuffer = Math.min(
    CONTEXT_SECTION_BUFFER,
    Math.max(300, Math.floor(maxContextChars * 0.08)),
  );
  let remainingChars = Math.max(
    0,
    maxContextChars - overviewSection.length - safetyBuffer,
  );

  const selectedEvidenceEntries = selectEvidenceEntries(
    evidenceCandidates,
    Math.floor(remainingChars * 0.22),
  );
  const evidenceSection = selectedEvidenceEntries.length
    ? ["【结构化证据摘录】", ...selectedEvidenceEntries.map(createEvidenceEntry)].join("\n")
    : null;

  if (evidenceSection) {
    remainingChars = Math.max(0, remainingChars - evidenceSection.length);
  }

  const selectedChunkEntries = selectChunkEntries(
    scoredAssets,
    chunkCandidatesByAsset,
    remainingChars,
  );
  const chunkSection = selectedChunkEntries.length
    ? ["【全量素材高价值片段】", ...selectedChunkEntries.map(createChunkEntry)].join("\n")
    : null;

  const sections = [overviewSection];
  if (evidenceSection) {
    sections.push(evidenceSection);
  }
  if (chunkSection) {
    sections.push(chunkSection);
  }

  const contextChars = sections.join("\n\n---\n\n").length;
  const selectedAssetCount = new Set(selectedChunkEntries.map((item) => item.assetId))
    .size;

  return {
    sections,
    stats: {
      assetCount: selectedAssets.length,
      rawChunkCount: chunks.length,
      fallbackAssetCount: 0,
      evidenceCount: evidences.length,
      evidenceSeedCount: 0,
      reusedEvidenceCount: 0,
      generatedEvidenceCount: 0,
      selectedAssetCount,
      selectedChunkCount: selectedChunkEntries.length,
      selectedEvidenceCount: selectedEvidenceEntries.length,
      contextChars,
    },
  };
}

export async function getCompanyProfileAnalysisAssets({
  tenantId,
  assetIds = [],
}: {
  tenantId: string;
  assetIds?: string[];
}): Promise<CompanyProfileAnalysisSelection> {
  const { db } = await import("@/lib/db");
  const normalizedAssetIds = Array.from(
    new Set(assetIds.map((assetId) => assetId.trim()).filter(Boolean)),
  );

  const assets = await db.asset.findMany({
    where: {
      tenantId,
      status: "active",
      metadata: { path: ["processingStatus"], equals: "ready" },
      ...(normalizedAssetIds.length > 0
        ? { id: { in: normalizedAssetIds } }
        : {}),
    },
    select: {
      id: true,
      originalName: true,
      title: true,
      description: true,
      storageKey: true,
      mimeType: true,
      fileCategory: true,
      fileSize: true,
      tags: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    mode: normalizedAssetIds.length > 0 ? "requested" : "all-ready-assets",
    requestedCount: normalizedAssetIds.length || assets.length,
    availableCount: assets.length,
    selected: selectCompanyProfileAnalysisAssets(assets),
  };
}

export async function buildCompanyProfileAnalysisContext({
  tenantId,
  assets,
  maxContextChars = MAX_COMPANY_PROFILE_ANALYSIS_CONTEXT_CHARS,
  userId,
}: {
  tenantId: string;
  assets: CompanyProfileAnalysisAssetCandidate[];
  maxContextChars?: number;
  userId?: string;
}): Promise<CompanyProfileAnalysisContext> {
  const selectedAssets = selectCompanyProfileAnalysisAssets(assets);
  const materials = await loadCompanyProfileAnalysisMaterials({
    tenantId,
    assets: selectedAssets,
  });
  const evidenceMaterialization = userId
    ? await ensureCompanyProfileAnalysisEvidence({
        tenantId,
        userId,
        assets: selectedAssets,
        materials,
      })
    : {
        evidences: materials.evidences,
        stats: {
          evidenceCount: materials.evidences.length,
          evidenceSeedCount: 0,
          reusedEvidenceCount: 0,
          generatedEvidenceCount: 0,
        },
      };

  const composed = composeCompanyProfileAnalysisContext({
    assets: selectedAssets,
    chunks: materials.chunks,
    evidences: evidenceMaterialization.evidences,
    maxContextChars,
  });

  return {
    sections: composed.sections,
    stats: {
      ...composed.stats,
      fallbackAssetCount: materials.fallbackAssetCount,
      evidenceCount: evidenceMaterialization.stats.evidenceCount,
      evidenceSeedCount: evidenceMaterialization.stats.evidenceSeedCount,
      reusedEvidenceCount: evidenceMaterialization.stats.reusedEvidenceCount,
      generatedEvidenceCount: evidenceMaterialization.stats.generatedEvidenceCount,
    },
  };
}
