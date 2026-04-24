/**
 * AI 客户端 - DashScope (通义千问) OpenAI 兼容模式
 *
 * 使用 curl + 流式模式(stream:true) 调用 DashScope API。
 * 原因：
 *   1. Node.js https 模块在此 Windows 环境下 30s+ 请求会 ECONNRESET
 *   2. curl 使用 Windows Schannel 不受此限制
 *   3. 流式模式保持数据持续传输，避免空闲连接被中间设备重置
 *
 * 重要：使用异步 spawn（非 spawnSync）避免阻塞 Node.js 事件循环，
 * 否则 Next.js server action 长时间无法处理心跳/keep-alive 会导致连接中断。
 */

import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DASHSCOPE_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** curl max-time in seconds (default 300) */
  timeout?: number;
}

interface ChatCompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

type JsonRepairFn = (rawContent: string) => Promise<string>;

/**
 * 解析 SSE (Server-Sent Events) 流式响应，拼接为完整内容
 */
function parseSSEResponse(
  sseText: string,
  fallbackModel: string
): ChatCompletionResponse {
  let fullContent = "";
  let model = fallbackModel;
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  for (const line of sseText.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") continue;

    try {
      const parsed = JSON.parse(data);
      if (parsed.model) model = parsed.model;
      if (parsed.usage) {
        usage = {
          promptTokens: parsed.usage.prompt_tokens || 0,
          completionTokens: parsed.usage.completion_tokens || 0,
          totalTokens: parsed.usage.total_tokens || 0,
        };
      }
      const delta = parsed.choices?.[0]?.delta;
      if (delta?.content) fullContent += delta.content;
    } catch {
      /* skip malformed chunks */
    }
  }

  return { content: fullContent, model, usage };
}

/**
 * 异步执行 curl 命令，返回 stdout/stderr
 */
function execCurl(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("curl", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    proc.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill("SIGTERM");
        reject(new Error(`curl timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
          stderr: Buffer.concat(stderrChunks).toString("utf-8"),
          exitCode: code ?? 1,
        });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`curl spawn error: ${err.message}`));
      }
    });
  });
}

/**
 * 调用 DashScope AI 模型
 * 使用异步 curl + stream:true 绕过 Node.js TLS 和空闲连接超时问题
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is not configured");
  }

  const {
    model = "qwen-plus",
    temperature = 0.3,
    maxTokens = 4096,
    topP = 0.8,
    timeout = 300,
  } = options;

  const requestBody = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    stream: true,
  });

  const ts = Date.now();
  const tmpFile = join(tmpdir(), `dashscope-${ts}-${Math.random().toString(36).slice(2, 8)}.json`);
  writeFileSync(tmpFile, requestBody, "utf-8");

  console.log(
    `[chatCompletion] curl+stream (async), model=${model}, maxTokens=${maxTokens}, bodySize=${requestBody.length}`
  );

  try {
    const result = await execCurl([
      "-s", "-S",
      "--max-time", String(timeout),
      "-X", "POST",
      DASHSCOPE_BASE_URL,
      "-H", "Content-Type: application/json",
      "-H", `Authorization: Bearer ${apiKey}`,
      "--data-binary", `@${tmpFile}`,
    ], (timeout + 10) * 1000);

    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();

    if (result.exitCode !== 0) {
      throw new Error(
        `curl failed (exit ${result.exitCode}): ${stderr || "unknown"}`
      );
    }

    if (!stdout) {
      throw new Error(`curl returned empty response. stderr: ${stderr}`);
    }

    // 解析 SSE 流式响应
    const response = parseSSEResponse(stdout, model);

    if (!response.content) {
      // 可能是非流式错误响应
      try {
        const errorData = JSON.parse(stdout);
        if (errorData.error) {
          throw new Error(`DashScope error: ${JSON.stringify(errorData.error)}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("DashScope")) throw e;
      }
      throw new Error("DashScope returned empty content");
    }

    console.log(
      `[chatCompletion] done: ${response.content.length} chars, model=${response.model}, ${Date.now() - ts}ms`
    );

    return response;
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

/**
 * OpenAI-compatible client interface for server actions
 */
export const aiClient = {
  chat: {
    completions: {
      create: async (params: {
        model?: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => {
        const response = await chatCompletion(
          params.messages.map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content,
          })),
          {
            model: params.model,
            temperature: params.temperature,
            maxTokens: params.max_tokens,
          }
        );
        return {
          choices: [{ message: { content: response.content } }],
          model: response.model,
          usage: {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens,
          },
        };
      },
    },
  },
};

function stripCodeFences(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractBalancedJsonBlock(content: string): string | null {
  const text = content.trim();
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");

  let startIndex = -1;
  if (objectStart >= 0 && arrayStart >= 0) {
    startIndex = Math.min(objectStart, arrayStart);
  } else {
    startIndex = Math.max(objectStart, arrayStart);
  }

  if (startIndex < 0) {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    if (char === "}" || char === "]") {
      if (stack.length === 0) {
        return null;
      }

      const expected = stack.pop();
      if (expected !== char) {
        return null;
      }

      if (stack.length === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

function collectJsonCandidates(content: string): string[] {
  const candidates = new Set<string>();
  const stripped = stripCodeFences(content);
  if (stripped) {
    candidates.add(stripped);
  }

  const extracted = extractBalancedJsonBlock(content);
  if (extracted) {
    candidates.add(extracted);
  }

  return [...candidates];
}

async function repairJsonPayload(rawContent: string): Promise<string> {
  const truncatedRaw =
    rawContent.length > 12000
      ? `${rawContent.slice(0, 12000)}\n...(内容已截断)`
      : rawContent;

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "你是一个 JSON 修复器。请把用户提供的内容整理成严格合法的 JSON，不要输出 markdown、代码块、解释或额外文字。保留原有字段语义；无法确定的字段使用原内容中已有的空数组、空对象或空字符串风格，不要编造新事实。",
      },
      {
        role: "user",
        content: `请将下面内容修复为严格 JSON，只输出 JSON：\n\n${truncatedRaw}`,
      },
    ],
    {
      model: "qwen-plus",
      temperature: 0,
      maxTokens: 4096,
    }
  );

  return response.content;
}

export async function parseCompanyProfileAnalysisResponse(
  content: string,
  repairJson: JsonRepairFn = repairJsonPayload
): Promise<Record<string, unknown>> {
  const parseErrors: string[] = [];

  for (const candidate of collectJsonCandidates(content)) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch (error) {
      parseErrors.push(
        `initial parse failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const repairedContent = await repairJson(content);

  for (const candidate of collectJsonCandidates(repairedContent)) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch (error) {
      parseErrors.push(
        `repair parse failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.error(
    "[parseAIResponse] unable to parse company profile JSON:",
    parseErrors,
    content.slice(0, 600)
  );
  throw new Error("AI 返回的分析结果格式异常，请重试");
}

export async function parseStructuredJsonObjectResponse(
  content: string,
  repairJson: JsonRepairFn = repairJsonPayload,
): Promise<Record<string, unknown>> {
  const parseErrors: string[] = [];

  for (const candidate of collectJsonCandidates(content)) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch (error) {
      parseErrors.push(
        `initial parse failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const repairedContent = await repairJson(content);

  for (const candidate of collectJsonCandidates(repairedContent)) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch (error) {
      parseErrors.push(
        `repair parse failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.error(
    "[parseStructuredJsonObjectResponse] unable to parse JSON:",
    parseErrors,
    content.slice(0, 600),
  );
  throw new Error("AI returned invalid JSON");
}

// ==================== Streaming Support ====================

interface StreamingChunk {
  type: 'chunk' | 'done' | 'error' | 'usage';
  content?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

/**
 * 实时流式响应 - 边接收边发送
 * 使用 curl --no-buffer 实现真正的实时流
 */
export function createStreamingResponse(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Response {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "DASHSCOPE_API_KEY is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    model = "qwen-plus",
    temperature = 0.3,
    maxTokens = 4096,
    topP = 0.8,
    timeout = 300,
  } = options;

  // 构建实时流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let buffer = "";

      const sendEvent = (data: StreamingChunk) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller 可能已关闭
        }
      };

      // 构建请求体
      const requestBody = JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
      });

      const ts = Date.now();
      const tmpFile = join(tmpdir(), `dashscope-realtime-${ts}-${Math.random().toString(36).slice(2, 8)}.json`);
      writeFileSync(tmpFile, requestBody, "utf-8");

      console.log(`[realtime streaming] curl+stream, model=${model}, maxTokens=${maxTokens}`);

      // 使用 --no-buffer 实现实时流
      const proc = spawn("curl", [
        "-s", "-S",
        "-N",  // --no-buffer: 禁用缓冲，实时输出
        "--max-time", String(timeout),
        "-X", "POST",
        DASHSCOPE_BASE_URL,
        "-H", "Content-Type: application/json",
        "-H", `Authorization: Bearer ${apiKey}`,
        "--data-binary", `@${tmpFile}`,
      ], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let fullContent = "";
      let finalModel = model;
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      let settled = false;

      // 处理 stdout 数据流 - 边接收边发送
      proc.stdout.on("data", (chunk: Buffer) => {
        if (settled) return;
        buffer += chunk.toString("utf-8");

        // 处理完整的 SSE 行
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 保留不完整的行

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.model) finalModel = parsed.model;
            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens || 0,
                completionTokens: parsed.usage.completion_tokens || 0,
                totalTokens: parsed.usage.total_tokens || 0,
              };
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              // 实时发送给客户端
              sendEvent({ type: 'chunk', content: delta.content });
            }
          } catch {
            /* skip malformed chunks */
          }
        }
      });

      // 处理错误
      proc.stderr.on("data", (chunk: Buffer) => {
        console.error("[realtime streaming] stderr:", chunk.toString());
      });

      // 处理完成
      proc.on("close", (code) => {
        if (settled) return;
        settled = true;

        // 清理临时文件
        try { unlinkSync(tmpFile); } catch { /* ignore */ }

        if (code !== 0) {
          sendEvent({ type: 'error', error: `curl exited with code ${code}` });
        } else {
          sendEvent({ type: 'done', content: fullContent, model: finalModel });
          sendEvent({ type: 'usage', usage });
        }

        console.log(`[realtime streaming] done: ${fullContent.length} chars, ${Date.now() - ts}ms`);

        try {
          controller.close();
        } catch {
          // controller 可能已关闭
        }
      });

      proc.on("error", (err) => {
        if (settled) return;
        settled = true;
        console.error("[realtime streaming] spawn error:", err);
        sendEvent({ type: 'error', error: err.message });
        try { unlinkSync(tmpFile); } catch { /* ignore */ }
        try { controller.close(); } catch { /* ignore */ }
      });

      // 设置超时保护
      setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill("SIGTERM");
          sendEvent({ type: 'error', error: 'Request timeout' });
          try { unlinkSync(tmpFile); } catch { /* ignore */ }
          try { controller.close(); } catch { /* ignore */ }
        }
      }, (timeout + 30) * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 Nginx 缓冲
    },
  });
}

// ==================== 企业能力画像分析 Prompt ====================

const COMPANY_PROFILE_SYSTEM_PROMPT = `你是一个专业的B2B出海获客分析师，擅长从中国企业的资料中提炼企业能力画像，并为其推断最适合开拓的海外目标市场。

你的任务是分析用户提供的企业资料（可能包括公司介绍、产品资料、技术文档等），提炼出结构化的企业能力画像。

【核心业务语境】
本系统（VertaX）是一个“出海获客智能体”，帮助中国企业发现和开拓海外客户。
因此：
- targetRegions 必须是中国大陆以外的海外区域和国家
- 绝对不要输出“华东”、“华南”、“长三角”、“中国”等中国境内区域
- 即使企业资料中只提到国内案例或国内客户，你也要根据其产品特性、技术能力、行业应用场景，主动推断最适合出海的海外市场
- 推断海外市场时，请综合考虑：产品类型与海外需求匹配度、目标行业在各国的发展规模、技术门槛与认证要求、采购习惯与渠道偏好、价格带竞争力、基础设施投资趋势

【市场区划参考】
targetRegions 的 region 字段请参考以下出海业务常用的市场区划（按市场特征相似性划分，非严格地理或政治分类）。
你可以直接使用下列区划名，也可以根据企业实际情况做合理细分（如单独拆出"北欧"强调环保认证）：
- 北美：美国、加拿大（成熟高端市场，强认证体系）
- 拉美：墨西哥、巴西、智利、哥伦比亚、阿根廷等（新兴工业化，价格敏感）
- 西欧：德国、法国、英国、意大利、西班牙、荷兰等（成熟市场，高合规门槛）
- 东欧：波兰、捷克、罗马尼亚、匈牙利等（制造业回流，性价比导向）
- 中东：阿联酋、沙特、土耳其、以色列等（基建投资驱动，项目制采购）
- 非洲：南非、尼日利亚、肯尼亚、埃及等（基础设施缺口大，长周期）
- 南亚：印度、巴基斯坦、孟加拉等（人口红利，制造业承接）
- 东南亚：越南、泰国、印尼、菲律宾、马来西亚等（制造业转移，中国供应链延伸）
- 东亚：日本、韩国（高端制造，技术互补）
- 大洋洲：澳大利亚、新西兰（资源型经济，认证严格）
- 独联体：俄罗斯、哈萨克斯坦、乌兹别克斯坦等（资源型需求，地缘敏感）
划分核心原则：同一个 region 里的国家，出海打法和客户画像大致相似。请根据企业实际产品与能力，选择最匹配的 2-5 个区域。

请严格按照以下 JSON 格式输出，不要添加任何额外文字：

{
  "companyName": "企业名称",
  "companyIntro": "一段话概括企业定位和核心业务（100-200字）",
  "coreProducts": [
    { "name": "产品/服务名称", "description": "简要描述", "highlights": ["亮点1", "亮点2"] }
  ],
  "techAdvantages": [
    { "title": "技术优势标题", "description": "具体说明" }
  ],
  "scenarios": [
    { "industry": "适用行业", "scenario": "具体应用场景", "value": "为客户带来的价值" }
  ],
  "differentiators": [
    { "point": "差异化要点", "description": "相比竞品的优势说明" }
  ],
  "targetIndustries": ["目标行业1", "目标行业2"],
  "targetRegions": [
    { "region": "区域名称", "countries": ["国家1", "国家2"], "rationale": "基于企业产品特性和该市场需求的具体分析" },
    { "region": "另一区域", "countries": ["国家3"], "rationale": "说明为什么该区域适合这家企业出海" }
  ],
  "buyerPersonas": [
    { "role": "决策者角色", "title": "典型职位", "concerns": ["关注点1", "关注点2"] }
  ],
  "painPoints": [
    { "pain": "客户痛点", "howWeHelp": "我们如何解决" }
  ],
  "buyingTriggers": ["购买触发因素1", "购买触发因素2"]
}

注意：
- 如果某个字段从资料中无法确定，使用空数组 []
- 每个类别尽量提炼 3-5 条核心要点
- 目标客户画像(ICP)要基于企业产品特性进行合理推断
- targetRegions 必须是海外区域，每条包含 region（区域名）、countries（具体国家列表）、rationale（推荐该市场的判断依据）
- 所有内容使用中文
- 只输出 JSON，不要有任何其他文字`;

/**
 * 分析企业资料，生成能力画像
 */
export async function analyzeCompanyProfile(
  materialTexts: string[]
): Promise<{
  analysis: Record<string, unknown>;
  model: string;
  usage: ChatCompletionResponse["usage"];
}> {
  const combinedText = materialTexts.join("\n\n---\n\n");

  const truncatedText =
    combinedText.length > 60000
      ? combinedText.slice(0, 60000) + "\n...(内容已截断)"
      : combinedText;

  const response = await chatCompletion(
    [
      { role: "system", content: COMPANY_PROFILE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `请分析以下企业资料，提炼企业能力画像：\n\n${truncatedText}`,
      },
    ],
    {
      model: "qwen-plus",
      temperature: 0.2,
      maxTokens: 4096,
    }
  );

  let jsonStr = response.content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const analysis = await parseCompanyProfileAnalysisResponse(jsonStr);

  return {
    analysis,
    model: response.model,
    usage: response.usage,
  };
}
