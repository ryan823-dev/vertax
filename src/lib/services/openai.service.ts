import OpenAI from "openai";
import { getPlatformPrompt, getPlatformCharLimit, type PlatformId } from "@/lib/marketing/platform-rules";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export type GenerateContentParams = {
  topic: string;
  context?: string;
  tone: string;
  platform: string;
  language: string;
};

export type GenerateMultiParams = {
  topic: string;
  context?: string;
  tone: string;
  platforms: string[];
  language: string;
};

// 平台提示词现在从 platform-rules.ts 获取（整合了 marketing-skills 框架的最佳实践）
// 旧的 PLATFORM_PROMPTS 已被替换

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Use a professional, authoritative tone suitable for B2B audiences.",
  casual: "Use a friendly, casual tone that feels approachable and relatable.",
  humorous: "Use a witty, humorous tone while staying relevant and professional.",
  informative: "Use an educational, informative tone that provides value to the reader.",
};

const DEMO_CONTENT: Record<string, string> = {
  x: "🚀 Discover how our industrial solutions help manufacturers expand globally. Quality meets innovation at competitive prices. #Manufacturing #GlobalTrade",
  facebook: "🌍 Expanding your industrial business overseas?\n\nOur comprehensive platform helps manufacturers reach global markets with:\n✅ Product catalog management\n✅ Multi-language SEO content\n✅ Social media automation\n✅ AI-powered lead generation\n\nStart your global journey today! 🚀\n\n#IndustrialExport #GlobalManufacturing #B2BMarketing",
};

export async function generateSocialContent(
  params: GenerateContentParams
): Promise<string> {
  if (isDemoMode) {
    return DEMO_CONTENT[params.platform] || DEMO_CONTENT.facebook;
  }

  const client = getClient();
  const platformPrompt = getPlatformPrompt(params.platform as PlatformId);
  const toneInstruction = TONE_INSTRUCTIONS[params.tone] || TONE_INSTRUCTIONS.professional;
  const charLimit = getPlatformCharLimit(params.platform as PlatformId);
  const langInstruction = params.language === "zh-CN"
    ? "Write the content in Chinese (简体中文)."
    : "Write the content in English.";

  const userPrompt = [
    `Topic: ${params.topic}`,
    params.context ? `Additional context: ${params.context}` : "",
    `Character limit: ${charLimit}`,
    toneInstruction,
    langInstruction,
    "Generate ONLY the post content. No explanations, no quotation marks wrapping the output.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: platformPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("AI returned empty content");
  return content;
}

export async function generateMultiPlatformContent(
  params: GenerateMultiParams
): Promise<Record<string, string>> {
  if (isDemoMode) {
    const result: Record<string, string> = {};
    for (const platform of params.platforms) {
      result[platform] = DEMO_CONTENT[platform] || DEMO_CONTENT.facebook;
    }
    return result;
  }

  const results = await Promise.all(
    params.platforms.map(async (platform) => {
      const content = await generateSocialContent({
        topic: params.topic,
        context: params.context,
        tone: params.tone,
        platform,
        language: params.language,
      });
      return { platform, content };
    })
  );

  const output: Record<string, string> = {};
  for (const r of results) {
    output[r.platform] = r.content;
  }
  return output;
}

// ==================== SEO AUDIT SUMMARY ====================

export type GenerateAuditSummaryParams = {
  url: string;
  scores: Record<string, number>;
  findings: Array<{ factor: string; status: string; message: string }>;
  language: string;
};

const DEMO_AUDIT_SUMMARY = `## Overall Assessment
This website has a moderate SEO foundation with several critical issues that need immediate attention. The technical basics are partially in place, but structured data and AI engine optimization are significantly lacking.

## Top 3 Priorities
1. **Fix critical on-page issues** — Ensure every page has exactly one H1 tag, proper meta descriptions, and descriptive image alt text.
2. **Add structured data** — Implement Organization, Product, and FAQ schemas to enable rich snippets and improve AI engine understanding.
3. **Unblock AI crawlers** — Update robots.txt to allow GPTBot, ClaudeBot, and Google-Extended to access your content.

## GEO Strategy
To improve visibility in AI-generated answers, focus on creating structured, citable content with comparison tables, FAQ sections, and authoritative author bylines. AI engines prioritize well-organized content with clear data points over generic marketing copy.`;

export async function generateAuditSummary(
  params: GenerateAuditSummaryParams
): Promise<string> {
  if (isDemoMode) {
    return DEMO_AUDIT_SUMMARY;
  }

  const client = getClient();

  const failedFindings = params.findings
    .filter((f) => f.status === "fail")
    .map((f) => `- [FAIL] ${f.factor}: ${f.message}`)
    .join("\n");

  const warnFindings = params.findings
    .filter((f) => f.status === "warn")
    .map((f) => `- [WARN] ${f.factor}: ${f.message}`)
    .join("\n");

  const langInstruction =
    params.language === "zh-CN"
      ? "Write the summary in Chinese (简体中文)."
      : "Write the summary in English.";

  const userPrompt = `Analyze the following SEO/GEO audit results for ${params.url}:

Overall Score: ${params.scores.overall}/100
Technical SEO: ${params.scores.technical ?? "N/A"}/100
On-Page SEO: ${params.scores.onPage ?? "N/A"}/100
Structured Data: ${params.scores.structuredData ?? "N/A"}/100
Social Sharing: ${params.scores.social ?? "N/A"}/100
GEO (AI Engine): ${params.scores.geo ?? "N/A"}/100

Critical Issues:
${failedFindings || "None"}

Warnings:
${warnFindings || "None"}

Provide a concise executive summary with:
1. Overall health assessment (2-3 sentences)
2. Top 3 priority recommendations with specific actions
3. GEO strategy advice for AI engine visibility

Use markdown formatting with ## headings. Keep it under 300 words.
${langInstruction}`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a senior SEO and GEO (Generative Engine Optimization) expert. Provide actionable, specific, and professional audit analysis.",
      },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("AI returned empty summary");
  return content;
}
