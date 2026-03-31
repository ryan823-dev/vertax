/**
 * SEO + GEO Content Pipeline
 *
 * Implements the seo-geo-content skill as a TypeScript engine.
 * Turns one keyword + company context into a 4-block publication package:
 *   Block 1 — SEO metadata (title, description, slug, keywords)
 *   Block 2 — Full article in Markdown (1500–2000 words, English)
 *   Block 3 — FAQ + JSON-LD Schema (FAQPage)
 *   Block 4 — GEO-optimized version (300–500 words, AI-citation ready)
 *
 * Pipeline steps:
 *   Step 1: Keyword Research & Expansion  (AI)
 *   Step 2: SERP Deep Analysis             (SerpAPI → AI fallback)
 *   Step 3: Article Writing                (qwen-max, framework auto-select)
 *   Step 4: Four-Block Final Output        (AI extraction + structuring)
 */

import { chatCompletion } from '@/lib/ai-client';

// ============================================================
// Types
// ============================================================

export type ContentFramework = 'A' | 'B' | 'C' | 'D';

export interface KeywordMatrix {
  primaryKeyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  difficulty: 'Low' | 'Medium' | 'High';
  geoPotential: 'High' | 'Medium' | 'Low';
  coreVariants: string[];
  questionBased: string[];
  commercialInvestigation: string[];
  longTail: string[];
  geoPriority: string[];
  supporting: string[];
  placementPlan: string;
}

export interface SerpAnalysis {
  topResults: Array<{
    rank: number;
    type: string;
    h2Structure: string[];
    contentAngles: string[];
  }>;
  paaQuestions: string[];
  hasFeaturedSnippet: boolean;
  hasAIOverview: boolean;
  selectedFramework: ContentFramework;
  mustCover: string[];
  shouldCover: string[];
  differentiationGaps: string[];
}

export interface ContentPackage {
  // Block 1
  metaTitle: string;
  metaDescription: string;
  slug: string;
  primaryKeyword: string;
  supportingKeywords: string[];

  // Block 2
  article: string;

  // Block 3
  faqMarkdown: string;
  schemaJsonLd: object;

  // Block 4
  geoVersion: string;

  // Internal
  framework: ContentFramework;
  keywordMatrix: KeywordMatrix;
  serpAnalysis: SerpAnalysis;
  wordCount: number;
}

export interface PipelineContext {
  /** Primary seed keyword (English) */
  keyword: string;
  /** Optional company context to make content more specific */
  companyContext?: {
    name: string;
    products: string[];
    advantages: string[];
    targetMarket: string;
  };
  /** Optional evidence to weave into content */
  evidence?: Array<{ id: string; title: string; content: string }>;
  /** Force a specific framework instead of auto-selecting */
  forceFramework?: ContentFramework;
  /** Override word count target */
  targetWordCount?: number;
}

// ============================================================
// BANNED WORDS (per skill spec)
// ============================================================

const BANNED_WORDS = [
  'unlock', 'unleash', 'leverage', 'dive into', 'game-changer',
  'revolutionize', 'navigate', 'empower', 'robust', 'seamlessly',
  'cutting-edge',
];

// ============================================================
// Step 1: Keyword Research & Expansion
// ============================================================

const STEP1_PROMPT = `You are a senior SEO strategist specializing in B2B content for Chinese manufacturers targeting global buyers.

Your task: expand the seed keyword into a structured keyword matrix for content planning.

Seed keyword: "{keyword}"
Industry context: {context}

Output ONLY valid JSON in this exact structure:
{
  "primaryKeyword": "exact seed or refined version",
  "intent": "informational|commercial|transactional|navigational",
  "difficulty": "Low|Medium|High",
  "geoPotential": "High|Medium|Low",
  "coreVariants": ["variant1", "variant2", "variant3"],
  "questionBased": ["what is X", "how does X work", "why use X", "how to X", "X vs Y"],
  "commercialInvestigation": ["best X", "top X suppliers", "X comparison", "X alternatives"],
  "longTail": ["X for manufacturing", "X for B2B", "X tutorial step by step"],
  "geoPriority": ["what is X", "X explained", "X meaning", "how X works", "X best practices"],
  "supporting": ["related concept 1", "related concept 2", "related concept 3"],
  "placementPlan": "H1, first 100 words, at least one H2, conclusion, meta description"
}

Rules:
- All keywords must be English
- Focus on B2B manufacturing / industrial / trade context
- GEO-priority keywords are those an AI assistant would use to explain the topic
- Only output JSON, no other text`;

export async function step1KeywordResearch(ctx: PipelineContext): Promise<KeywordMatrix> {
  const context = ctx.companyContext
    ? `${ctx.companyContext.name} sells ${ctx.companyContext.products.join(', ')} to ${ctx.companyContext.targetMarket}`
    : 'B2B manufacturing / industrial products for global buyers';

  const prompt = STEP1_PROMPT
    .replace('{keyword}', ctx.keyword)
    .replace('{context}', context);

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'qwen-max', temperature: 0.3, maxTokens: 1500 }
  );

  try {
    let json = response.content.trim();
    if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    return JSON.parse(json) as KeywordMatrix;
  } catch {
    // Fallback keyword matrix
    return {
      primaryKeyword: ctx.keyword,
      intent: 'informational',
      difficulty: 'Medium',
      geoPotential: 'High',
      coreVariants: [ctx.keyword, `${ctx.keyword} guide`, `${ctx.keyword} 2025`],
      questionBased: [`what is ${ctx.keyword}`, `how does ${ctx.keyword} work`, `why use ${ctx.keyword}`],
      commercialInvestigation: [`best ${ctx.keyword}`, `${ctx.keyword} suppliers`, `${ctx.keyword} comparison`],
      longTail: [`${ctx.keyword} for manufacturing`, `${ctx.keyword} B2B`],
      geoPriority: [`what is ${ctx.keyword}`, `${ctx.keyword} explained`, `${ctx.keyword} best practices`],
      supporting: [`${ctx.keyword} process`, `${ctx.keyword} standards`, `${ctx.keyword} technology`],
      placementPlan: 'H1, first 100 words, at least one H2, conclusion, meta description',
    };
  }
}

// ============================================================
// Step 2: SERP Analysis
// ============================================================

interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  related_questions?: Array<{ question?: string }>;
  answer_box?: { type?: string };
}

async function fetchSerpData(keyword: string): Promise<SerpApiResponse | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('q', keyword);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('gl', 'us');
    url.searchParams.set('num', '10');

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    return await res.json() as SerpApiResponse;
  } catch {
    return null;
  }
}

const STEP2_PROMPT = `You are a senior SEO strategist. Analyze the following SERP data and keyword context to select a content framework and identify gaps.

Primary keyword: "{keyword}"
Search intent: {intent}

SERP data (top results):
{serpData}

PAA questions found:
{paaQuestions}

Output ONLY valid JSON:
{
  "topResults": [
    {
      "rank": 1,
      "type": "How-to|Top/Best|Review|Alternatives|Other",
      "h2Structure": ["heading1", "heading2"],
      "contentAngles": ["angle1", "angle2"]
    }
  ],
  "paaQuestions": ["question1", "question2", "question3"],
  "hasFeaturedSnippet": true|false,
  "hasAIOverview": false,
  "selectedFramework": "A|B|C|D",
  "mustCover": ["angle all competitors cover"],
  "shouldCover": ["differentiation angle"],
  "differentiationGaps": ["gap no competitor covers"]
}

Framework selection rules:
- A: dominant pattern is "best X", "top N X"
- B: dominant pattern is "how to X", "guide to X"
- C: dominant pattern is "[tool] review", "is [tool] worth it"
- D: dominant pattern is "[tool] alternatives", "[A] vs [B]"

Only output JSON, no other text.`;

export async function step2SerpAnalysis(
  keyword: string,
  matrix: KeywordMatrix,
  forceFramework?: ContentFramework
): Promise<SerpAnalysis> {

  const serpData = await fetchSerpData(keyword);

  let serpDataText = '(no live SERP data — using AI inference)';
  let paaText = '(no PAA data)';

  if (serpData?.organic_results?.length) {
    serpDataText = serpData.organic_results.slice(0, 5).map((r, i) =>
      `#${i + 1}: ${r.title || 'Unknown'}\n   URL: ${r.link || ''}\n   Snippet: ${r.snippet || ''}`
    ).join('\n\n');

    if (serpData.related_questions?.length) {
      paaText = serpData.related_questions.slice(0, 6).map(q => `- ${q.question || ''}`).join('\n');
    }
  }

  const prompt = STEP2_PROMPT
    .replace('{keyword}', keyword)
    .replace('{intent}', matrix.intent)
    .replace('{serpData}', serpDataText)
    .replace('{paaQuestions}', paaText);

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'qwen-max', temperature: 0.2, maxTokens: 2000 }
  );

  try {
    let json = response.content.trim();
    if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    const parsed = JSON.parse(json) as SerpAnalysis;
    if (forceFramework) parsed.selectedFramework = forceFramework;
    return parsed;
  } catch {
    const framework = forceFramework || (
      matrix.intent === 'informational' ? 'B' :
      matrix.intent === 'commercial' ? 'A' : 'B'
    );
    return {
      topResults: [],
      paaQuestions: matrix.questionBased.slice(0, 4),
      hasFeaturedSnippet: false,
      hasAIOverview: false,
      selectedFramework: framework,
      mustCover: [`What is ${keyword}`, `How ${keyword} works`, `Benefits of ${keyword}`],
      shouldCover: [`${keyword} for B2B manufacturers`, `How to choose ${keyword} supplier`],
      differentiationGaps: [`${keyword} from China manufacturers`, `Cost comparison for ${keyword}`],
    };
  }
}

// ============================================================
// Step 3: Article Writing
// ============================================================

function getFrameworkInstructions(framework: ContentFramework, keyword: string): string {
  switch (framework) {
    case 'A':
      return `Use FRAMEWORK A (Top/Best List):
H1: [Top N / Best] ${keyword} [Year] [≤60 chars, contains keyword]
- TL;DR / Key Takeaways (3–6 bullets, high information density)
- H2: What to Look for in [Category] (100–150 words, evaluation criteria)
- H2: Top [X] [Category]: Quick Comparison (table: Tool/Function/Best For/Pricing)
- H2: #1 [Option Name] — [one-line differentiator]
  - H3: Key Features
  - H3: Who It's Best For
  - H3: Limitations
[repeat for each option]
- H2: How to Choose the Right [Category] (decision table)
- H2: Frequently Asked Questions (4–6 PAA-sourced questions)
- H2: Final Thoughts (150–200 words)`;

    case 'B':
      return `Use FRAMEWORK B (How-to Tutorial):
H1: How to [Action] — [Specific Outcome] [contains keyword]
- Introduction (150–200 words, core answer within first 150 words)
- TL;DR (3–6 bullets)
- H2: What You Need Before Starting (prerequisites)
- H2: Step 1 — [Action + Outcome]
  - H3: What to Do
  - H3: Why This Matters
  - H3: Common Mistakes to Avoid
[repeat for each step, 4–7 steps]
- H2: Frequently Asked Questions (PAA questions)
- H2: Conclusion (150 words)`;

    case 'C':
      return `Use FRAMEWORK C (Product Review):
H1: [Product/Category] Review [Year]: [One-sentence verdict] [contains keyword]
- Introduction (120–150 words, core verdict in first 2 sentences)
- TL;DR / Quick Verdict (Recommended/Best for/Key limitation)
- H2: What Is [Product/Category]? (category/use case/who for)
- H2: Core Features (H3 per feature, rated Strong/Adequate/Weak)
- H2: Pros and Cons (✅ pros, ❌ cons with who they affect)
- H2: [Product] vs Competitors (comparison table 2–4 competitors)
- H2: Final Verdict (2–3 sentence summary)
- H2: Frequently Asked Questions`;

    case 'D':
      return `Use FRAMEWORK D (Alternatives / Comparison):
H1: [X] Best [Product] Alternatives in [Year] [contains keyword]
- Introduction (150 words, reader is in comparison/selection stage)
- TL;DR (3–5 key differentiators)
- H2: How to Evaluate Alternatives (100–120 words)
- H2: Top [X] Alternatives
  - H3: [Alternative #1] — [one-line positioning]
    - What it does / Best for / Key difference from original
[repeat for each alternative]
- H2: Side-by-Side Comparison (table)
- H2: Which Should You Choose? (decision framework)
- H2: Frequently Asked Questions`;
  }
}

const STEP3_SYSTEM = `You are a senior B2B content writer specializing in manufacturing and industrial trade content for Chinese exporters targeting global buyers. Your writing is authoritative, factual, and conversion-focused without being salesy.

Writing standards:
- Professional, clear, natural English — no AI-sounding phrases
- Information value over marketing language
- Every claim backed by data or named source when possible
- Minimum 5 specific data points with units
- 3–5 sentences per paragraph, no walls of text
- Target length: 1500–2000 words

BANNED WORDS (never use): ${BANNED_WORDS.join(', ')}`;

export async function step3ArticleWriting(
  ctx: PipelineContext,
  matrix: KeywordMatrix,
  serp: SerpAnalysis
): Promise<string> {
  const evidenceBlock = ctx.evidence?.length
    ? `\n\nAvailable evidence to cite (use [E1], [E2] notation when relevant):\n${
        ctx.evidence.map((e, i) => `[E${i + 1}] ${e.title}: ${e.content.slice(0, 300)}`).join('\n\n')
      }`
    : '';

  const companyBlock = ctx.companyContext
    ? `\nCompany context (weave in naturally where relevant, don't force it):\n- Company: ${ctx.companyContext.name}\n- Products: ${ctx.companyContext.products.join(', ')}\n- Key advantages: ${ctx.companyContext.advantages.join(', ')}\n- Target market: ${ctx.companyContext.targetMarket}`
    : '';

  const userPrompt = `Write a complete SEO article for the following brief.

Primary keyword: "${matrix.primaryKeyword}"
Supporting keywords to use naturally: ${[...matrix.coreVariants, ...matrix.supporting].slice(0, 6).join(', ')}
Search intent: ${matrix.intent}

${getFrameworkInstructions(serp.selectedFramework, matrix.primaryKeyword)}

Content requirements:
MUST COVER (all top competitors cover these):
${serp.mustCover.map(a => `- ${a}`).join('\n')}

SHOULD COVER (differentiation opportunities):
${serp.shouldCover.map(a => `- ${a}`).join('\n')}

DIFFERENTIATION GAPS (no competitor covers — priority content):
${serp.differentiationGaps.map(a => `- ${a}`).join('\n')}

PAA questions to address as FAQ section headings:
${serp.paaQuestions.slice(0, 5).map(q => `- ${q}`).join('\n')}

Keyword placement rules:
- Primary keyword must appear in: H1, first 100 words, at least one H2, conclusion
- Meta description must contain primary keyword (write at end as HTML comment: <!-- META: ... -->)
- Supporting keywords distributed naturally throughout
${companyBlock}${evidenceBlock}

Output the complete article in Markdown. Start directly with the H1.`;

  const response = await chatCompletion(
    [
      { role: 'system', content: STEP3_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    { model: 'qwen-max', temperature: 0.5, maxTokens: 5000 }
  );

  return response.content;
}

// ============================================================
// Step 4: Four-Block Final Output
// ============================================================

const STEP4_PROMPT = `You are an SEO metadata and schema specialist. Extract and generate the four publication blocks from the article below.

Primary keyword: "{keyword}"
Article:
---
{article}
---

Output ONLY valid JSON:
{
  "metaTitle": "≤60 chars, contains primary keyword, compelling",
  "metaDescription": "150-160 chars, contains primary keyword, ends with benefit/CTA",
  "slug": "url-friendly-lowercase-with-hyphens",
  "supportingKeywords": ["kw1", "kw2", "kw3"],
  "faqMarkdown": "## Frequently Asked Questions\\n\\n### Question 1?\\nAnswer (40-60 words, natural, factual)\\n\\n### Question 2?\\nAnswer...",
  "schemaJsonLd": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Question text?",
        "acceptedAnswer": { "@type": "Answer", "text": "Answer text." }
      }
    ]
  },
  "geoVersion": "300-500 word GEO-optimized version. Requirements: definition-focused opening (What is X), factual neutral tone, structured data presentation with specific numbers/dates, no marketing language, key takeaway in conclusion. This version will be cited by AI engines like ChatGPT and Perplexity."
}

Rules:
- Extract FAQ from the article's FAQ section (or generate from PAA patterns)
- GEO version must be 300-500 words, factual, citation-ready
- Slug should be SEO-friendly and contain the primary keyword
- Only output JSON, no other text`;

export async function step4FinalOutput(
  keyword: string,
  article: string,
  matrix: KeywordMatrix
): Promise<{
  metaTitle: string;
  metaDescription: string;
  slug: string;
  supportingKeywords: string[];
  faqMarkdown: string;
  schemaJsonLd: object;
  geoVersion: string;
}> {
  const prompt = STEP4_PROMPT
    .replace('{keyword}', keyword)
    .replace('{article}', article.slice(0, 8000)); // Limit to avoid token overflow

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'qwen-max', temperature: 0.2, maxTokens: 3000 }
  );

  try {
    let json = response.content.trim();
    if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    return JSON.parse(json);
  } catch {
    // Fallback: generate minimal metadata from article
    const h1Match = article.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1].slice(0, 60) : keyword;
    const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return {
      metaTitle: title,
      metaDescription: `Learn everything about ${keyword} — a comprehensive guide for B2B buyers and manufacturers. Get expert insights and practical advice.`,
      slug,
      supportingKeywords: matrix.supporting.slice(0, 3),
      faqMarkdown: `## Frequently Asked Questions\n\n### What is ${keyword}?\n${keyword} is an important concept in B2B manufacturing and trade. Understanding it helps businesses make informed procurement decisions.\n\n### How does ${keyword} work?\nThe ${keyword} process involves multiple stages designed to ensure quality and reliability for global buyers.`,
      schemaJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `What is ${keyword}?`,
            acceptedAnswer: { '@type': 'Answer', text: `${keyword} is an important concept in B2B manufacturing and trade that helps businesses make informed procurement decisions.` },
          },
        ],
      },
      geoVersion: `${keyword}: An Overview for Global B2B Buyers\n\n${keyword} refers to a key product or process in global manufacturing and trade. Companies sourcing ${keyword} should evaluate suppliers based on quality certifications, production capacity, and lead times.\n\nKey considerations include: quality standards compliance, minimum order quantities, customization capabilities, and after-sales support. Chinese manufacturers are a major source for ${keyword} globally, offering competitive pricing with improving quality standards.\n\nWhen evaluating suppliers, request samples, verify certifications, and review factory audit reports. Building long-term supplier relationships typically leads to better pricing, priority production slots, and improved communication.\n\nFor B2B buyers, the most important factors are: reliable delivery schedules, consistent quality control, and responsive communication. Conducting due diligence before committing to large orders is always recommended.`,
    };
  }
}

// ============================================================
// Main Pipeline: runSeoGeoPipeline
// ============================================================

export async function runSeoGeoPipeline(ctx: PipelineContext): Promise<ContentPackage> {
  console.log(`[seo-geo-pipeline] Starting for keyword: "${ctx.keyword}"`);

  // Step 1: Keyword Research
  console.log('[seo-geo-pipeline] Step 1: Keyword Research...');
  const matrix = await step1KeywordResearch(ctx);

  // Step 2: SERP Analysis
  console.log('[seo-geo-pipeline] Step 2: SERP Analysis...');
  const serp = await step2SerpAnalysis(ctx.keyword, matrix, ctx.forceFramework);

  // Step 3: Article Writing
  console.log(`[seo-geo-pipeline] Step 3: Writing article (Framework ${serp.selectedFramework})...`);
  const article = await step3ArticleWriting(ctx, matrix, serp);

  // Step 4: Four-Block Output
  console.log('[seo-geo-pipeline] Step 4: Generating final output blocks...');
  const blocks = await step4FinalOutput(ctx.keyword, article, matrix);

  // Calculate word count
  const wordCount = article.split(/\s+/).filter(Boolean).length;

  console.log(`[seo-geo-pipeline] Done. Word count: ${wordCount}, Framework: ${serp.selectedFramework}`);

  return {
    metaTitle: blocks.metaTitle,
    metaDescription: blocks.metaDescription,
    slug: blocks.slug,
    primaryKeyword: matrix.primaryKeyword,
    supportingKeywords: blocks.supportingKeywords,
    article,
    faqMarkdown: blocks.faqMarkdown,
    schemaJsonLd: blocks.schemaJsonLd,
    geoVersion: blocks.geoVersion,
    framework: serp.selectedFramework,
    keywordMatrix: matrix,
    serpAnalysis: serp,
    wordCount,
  };
}
