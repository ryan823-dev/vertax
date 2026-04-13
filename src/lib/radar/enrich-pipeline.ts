/**
 * 集中化丰富化流水线 (Enrichment Pipeline)
 * 
 * 职责：
 * 1. 自动寻找公司官网 (如果缺失)
 * 2. 深度挖掘决策人 (Decision-Maker Hunting)
 * 3. 自动抓取并验证联系方式
 * 4. 存入数据库并更新状态
 * 
 * Task #136
 */

import { db } from "@/lib/db";
import { enrichCandidateWithExa } from "./exa-enrich";
import { chatCompletion } from "@/lib/ai-client";

interface EnrichmentOptions {
  force?: boolean;
  targetRoles?: string[];
}

interface DecisionMakerResult {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  source?: string;
}

interface ExaDecisionMakerSearchResult {
  title?: string;
  url?: string;
  text?: string;
}

interface ExaDecisionMakerSearchResponse {
  results?: ExaDecisionMakerSearchResult[];
}

function normalizeDecisionMakers(value: unknown): DecisionMakerResult[] {
  if (!Array.isArray(value)) return [];

  const normalized: DecisionMakerResult[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    if (typeof record.name !== "string" || typeof record.title !== "string") {
      continue;
    }

    normalized.push({
      name: record.name,
      title: record.title,
      email: typeof record.email === "string" ? record.email : undefined,
      phone: typeof record.phone === "string" ? record.phone : undefined,
      linkedIn: typeof record.linkedIn === "string" ? record.linkedIn : undefined,
      source: typeof record.source === "string" ? record.source : undefined,
    });
  }

  return normalized;
}

/**
 * 丰富化单个公司
 */
export async function enrichProspectCompany(
  companyId: string,
  options: EnrichmentOptions = {}
) {
  const company = await db.prospectCompany.findUnique({
    where: { id: companyId },
  });

  if (!company) throw new Error("Company not found");

  // 1. 更新状态为 IN_PROGRESS
  await db.prospectCompany.update({
    where: { id: companyId },
    data: { enrichmentStatus: "IN_PROGRESS" }
  });

  try {
    // 2. 基础公司信息丰富化 (Website, LinkedIn, Description)
    const baseEnrich = await enrichCandidateWithExa(
      company.name,
      company.country || null,
      company.industry || null
    );

    // 3. 深度决策人猎寻 (Decision-Maker Hunting)
    const targetRoles = options.targetRoles || ["CEO", "Founder", "Owner", "Procurement Manager", "Purchasing Manager"];
    const people = await huntDecisionMakers(company.name, company.website || baseEnrich.website || null, targetRoles);

    // 4. 保存结果
    await db.prospectCompany.update({
      where: { id: companyId },
      data: {
        website: company.website || baseEnrich.website,
        description: company.description || baseEnrich.description,
        enrichmentStatus: "COMPLETED",
        lastEnrichedAt: new Date(),
        // 扩展字段可以存入 rawData 或 aiDossier
      }
    });

    // 5. 保存联系人
    if (people && people.length > 0) {
      for (const p of people) {
        // 简单的去重检查
        const existing = await db.prospectContact.findFirst({
          where: { 
            companyId: company.id,
            OR: [
              { name: p.name },
              { email: p.email }
            ]
          }
        });

        if (!existing) {
          await db.prospectContact.create({
            data: {
              tenantId: company.tenantId,
              companyId: company.id,
              name: p.name,
              role: p.title,
              email: p.email || null,
              phone: p.phone || null,
              linkedInUrl: p.linkedIn || null,
              notes: `AI 自动抓取 - ${p.source || 'Exa'}`
            }
          });
        }
      }
    }

    return { success: true, personCount: people.length };
  } catch (err) {
    console.error(`[enrichProspectCompany] Error for ${company.name}:`, err);
    await db.prospectCompany.update({
      where: { id: companyId },
      data: { enrichmentStatus: "FAILED" }
    });
    return { success: false, error: String(err) };
  }
}

/**
 * 猎寻决策人
 */
async function huntDecisionMakers(
  companyName: string,
  _website: string | null,
  roles: string[]
): Promise<DecisionMakerResult[]> {
  const EXA_API_URL = "https://api.exa.ai/search";
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  // 构建搜索 Query
  const queries = roles.map(role => `"${companyName}" ${role} LinkedIn profile`);
  
  // 执行搜索
  const searchPromises: Array<Promise<ExaDecisionMakerSearchResponse>> = queries.map((q) =>
    fetch(EXA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query: q,
        numResults: 2,
        type: "neural",
        useAutoprompt: true,
        contents: { text: { maxCharacters: 1000 } }
      })
    }).then((res) => res.json() as Promise<ExaDecisionMakerSearchResponse>)
  );

  const results = await Promise.allSettled(searchPromises);
  const allResults: ExaDecisionMakerSearchResult[] = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") {
      allResults.push(...(r.value.results || []));
    }
  });

  if (allResults.length === 0) return [];

  // 使用 AI 解析人名和职位
  const aiResponse = await chatCompletion([
    { role: "system", content: "你是一个专业的 B2B 猎头。你的任务是从搜索结果摘要中识别公司的高管人名、具体职位、邮箱、电话和 LinkedIn。请输出 JSON 数组格式。" },
    { role: "user", content: `目标公司: ${companyName}\n搜索结果: ${JSON.stringify(allResults)}\n\n请识别并提取联系人。格式: [{ "name": "...", "title": "...", "email": "...", "phone": "...", "linkedIn": "..." }]` }
  ], {
    model: "qwen-plus",
    temperature: 0.1
  });

  try {
    let jsonStr = aiResponse.content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    return normalizeDecisionMakers(JSON.parse(jsonStr));
  } catch {
    return [];
  }
}
