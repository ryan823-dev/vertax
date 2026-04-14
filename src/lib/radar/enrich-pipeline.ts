/**
 * Centralized prospect enrichment pipeline.
 *
 * Responsibilities:
 * 1. Backfill missing company basics.
 * 2. Hunt decision-maker contacts.
 * 3. Persist contacts and enrichment state.
 */

import { chatCompletion } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { resolveApiKey } from '@/lib/services/api-key-resolver';
import { enrichCandidateWithExa } from './exa-enrich';

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
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    if (typeof record.name !== 'string' || typeof record.title !== 'string') {
      continue;
    }

    normalized.push({
      name: record.name,
      title: record.title,
      email: typeof record.email === 'string' ? record.email : undefined,
      phone: typeof record.phone === 'string' ? record.phone : undefined,
      linkedIn: typeof record.linkedIn === 'string' ? record.linkedIn : undefined,
      source: typeof record.source === 'string' ? record.source : undefined,
    });
  }

  return normalized;
}

function buildContactDedupWhere(companyId: string, person: DecisionMakerResult) {
  return {
    companyId,
    OR: [
      { name: person.name },
      ...(person.email ? [{ email: person.email }] : []),
    ],
  };
}

export async function enrichProspectCompany(
  companyId: string,
  options: EnrichmentOptions = {},
) {
  const company = await db.prospectCompany.findUnique({
    where: { id: companyId },
  });

  if (!company) throw new Error('Company not found');

  await db.prospectCompany.update({
    where: { id: companyId },
    data: { enrichmentStatus: 'IN_PROGRESS' },
  });

  try {
    const baseEnrich = await enrichCandidateWithExa(
      company.name,
      company.country || null,
      company.industry || null,
    );

    const targetRoles = options.targetRoles || [
      'CEO',
      'Founder',
      'Owner',
      'Procurement Manager',
      'Purchasing Manager',
    ];
    const people = await huntDecisionMakers(
      company.name,
      company.website || baseEnrich.website || null,
      targetRoles,
    );

    await db.prospectCompany.update({
      where: { id: companyId },
      data: {
        website: company.website || baseEnrich.website,
        description: company.description || baseEnrich.description,
        enrichmentStatus: 'COMPLETED',
        lastEnrichedAt: new Date(),
      },
    });

    if (people.length > 0) {
      for (const person of people) {
        const existing = await db.prospectContact.findFirst({
          where: buildContactDedupWhere(company.id, person),
        });

        if (existing) {
          continue;
        }

        await db.prospectContact.create({
          data: {
            tenantId: company.tenantId,
            companyId: company.id,
            name: person.name,
            role: person.title,
            email: person.email || null,
            phone: person.phone || null,
            linkedInUrl: person.linkedIn || null,
            status: 'new',
            notes: `AI auto-discovered via ${person.source || 'Exa'}`,
          },
        });
      }
    }

    return { success: true, personCount: people.length };
  } catch (err) {
    console.error(`[enrichProspectCompany] Error for ${company.name}:`, err);
    await db.prospectCompany.update({
      where: { id: companyId },
      data: {
        enrichmentStatus: 'FAILED',
        lastEnrichedAt: new Date(),
      },
    });
    return { success: false, error: String(err) };
  }
}

async function huntDecisionMakers(
  companyName: string,
  _website: string | null,
  roles: string[],
): Promise<DecisionMakerResult[]> {
  const EXA_API_URL = 'https://api.exa.ai/search';
  const apiKey = await resolveApiKey('exa');
  if (!apiKey) return [];

  const queries = roles.map((role) => `"${companyName}" ${role} LinkedIn profile`);

  const searchPromises: Array<Promise<ExaDecisionMakerSearchResponse>> = queries.map((query) =>
    fetch(EXA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        query,
        numResults: 2,
        type: 'neural',
        useAutoprompt: true,
        contents: { text: { maxCharacters: 1000 } },
      }),
    }).then((res) => res.json() as Promise<ExaDecisionMakerSearchResponse>),
  );

  const results = await Promise.allSettled(searchPromises);
  const allResults: ExaDecisionMakerSearchResult[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allResults.push(...(result.value.results || []));
    }
  });

  if (allResults.length === 0) return [];

  const aiResponse = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'You extract B2B decision-maker contacts from search snippets. Return only a JSON array of contacts.',
      },
      {
        role: 'user',
        content:
          `Target company: ${companyName}\nSearch results: ${JSON.stringify(allResults)}\n\n` +
          'Return JSON in this shape: [{"name":"...","title":"...","email":"...","phone":"...","linkedIn":"...","source":"..."}]',
      },
    ],
    {
      model: 'qwen-plus',
      temperature: 0.1,
    },
  );

  try {
    let jsonStr = aiResponse.content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    return normalizeDecisionMakers(JSON.parse(jsonStr));
  } catch {
    return [];
  }
}
