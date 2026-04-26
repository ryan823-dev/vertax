import { normalizeCountryCode } from './country-utils';

type JsonRecord = Record<string, unknown>;

export interface TargetingRefinement {
  summary: string;
  description: string;
  targetCountries: string[];
  targetIndustries: string[];
  keywords: string[];
  negativeKeywords: string[];
  useCases: string[];
  triggers: string[];
}

interface FirmographicData {
  industries: string[];
  countries: string[];
  companySize: Record<string, unknown>;
  exclude: string[];
}

interface TechnographicData {
  keywords: string[];
  standards: string[];
  systems: string[];
  exclude: string[];
}

interface UseCaseData {
  name: string;
  signals: string[];
  excludeSignals: string[];
}

interface TriggerData {
  name: string;
  signals: string[];
  whereToObserve: string[];
  confidence: number;
}

interface DecisionUnitData {
  role?: string;
  influence?: string;
}

interface ExclusionRuleData {
  rule: string;
  why: string;
}

interface SegmentationData {
  firmographic: FirmographicData;
  technographic: TechnographicData;
  useCases: UseCaseData[];
  triggers: TriggerData[];
  decisionUnit: DecisionUnitData[];
  exclusionRules: ExclusionRuleData[];
}

export interface TargetingSpecContent {
  targetingSpec: {
    icpName: string;
    segmentation: SegmentationData;
    evidenceUsed: string[];
  };
  openQuestions?: string[];
  confidence?: number;
  expertRefinements?: Array<{
    source: 'customer_expert_input';
    summary: string;
    originalText: string;
    fields: Omit<TargetingRefinement, 'description'>;
    submittedAt: string;
  }>;
}

type ExpertRefinementRecord = NonNullable<TargetingSpecContent['expertRefinements']>[number];

export interface CompanyProfileRefinementPatch {
  targetIndustries: string[];
  targetRegions: unknown[];
  sectionEdits: JsonRecord;
}

export function normalizeTargetingRefinement(
  raw: JsonRecord,
  originalText = '',
): TargetingRefinement {
  const summary = firstString(raw.summary, raw.name) || '客户行业判断补充';
  const description = firstString(raw.description) || originalText || summary;

  return {
    summary,
    description,
    targetCountries: normalizeCountries(raw.targetCountries ?? raw.countries),
    targetIndustries: cleanList(raw.targetIndustries ?? raw.industries ?? raw.industryCodes),
    keywords: cleanList(raw.keywords),
    negativeKeywords: cleanList(raw.negativeKeywords ?? raw.exclusions),
    useCases: cleanList(raw.useCases ?? raw.scenarios),
    triggers: cleanList(raw.triggers ?? raw.buyingTriggers),
  };
}

export function applyTargetingRefinement(
  existingContent: unknown,
  refinement: TargetingRefinement,
  options: { originalText: string; submittedAt?: string },
): TargetingSpecContent {
  const submittedAt = options.submittedAt ?? new Date().toISOString();
  const content = asRecord(existingContent);
  const existingSpec = asRecord(content.targetingSpec);
  const existingSegmentation = asRecord(existingSpec.segmentation);
  const firmographic = asRecord(existingSegmentation.firmographic);
  const technographic = asRecord(existingSegmentation.technographic);

  const nextFirmographic: FirmographicData = {
    industries: mergeLists(toStringList(firmographic.industries), refinement.targetIndustries),
    countries: mergeLists(toStringList(firmographic.countries), refinement.targetCountries),
    companySize: asRecord(firmographic.companySize),
    exclude: mergeLists(toStringList(firmographic.exclude), refinement.negativeKeywords),
  };

  const nextTechnographic: TechnographicData = {
    keywords: mergeLists(toStringList(technographic.keywords), refinement.keywords),
    standards: toStringList(technographic.standards),
    systems: toStringList(technographic.systems),
    exclude: mergeLists(toStringList(technographic.exclude), refinement.negativeKeywords),
  };

  const nextSegmentation: SegmentationData = {
    firmographic: nextFirmographic,
    technographic: nextTechnographic,
    useCases: mergeUseCases(existingSegmentation.useCases, refinement),
    triggers: mergeTriggers(existingSegmentation.triggers, refinement),
    decisionUnit: toRecordList(existingSegmentation.decisionUnit) as DecisionUnitData[],
    exclusionRules: mergeExclusionRules(existingSegmentation.exclusionRules, refinement.negativeKeywords),
  };

  const evidenceLabel = `客户专家判断：${refinement.description}`;
  const expertRefinements: ExpertRefinementRecord[] = [
    ...toExpertRefinements(content.expertRefinements).slice(-19),
    {
      source: 'customer_expert_input' as const,
      summary: refinement.summary,
      originalText: options.originalText,
      fields: {
        summary: refinement.summary,
        targetCountries: refinement.targetCountries,
        targetIndustries: refinement.targetIndustries,
        keywords: refinement.keywords,
        negativeKeywords: refinement.negativeKeywords,
        useCases: refinement.useCases,
        triggers: refinement.triggers,
      },
      submittedAt,
    },
  ];

  return {
    ...content,
    targetingSpec: {
      ...existingSpec,
      icpName: firstString(existingSpec.icpName) || refinement.summary || '目标客户画像',
      segmentation: {
        ...existingSegmentation,
        ...nextSegmentation,
      },
      evidenceUsed: mergeLists(toStringList(existingSpec.evidenceUsed), [evidenceLabel]),
    },
    expertRefinements,
  };
}

export function buildCompanyProfileRefinementPatch(
  existingProfile: {
    targetIndustries?: unknown;
    targetRegions?: unknown;
    sectionEdits?: unknown;
  } | null,
  refinement: TargetingRefinement,
  options: { originalText: string; submittedAt?: string },
): CompanyProfileRefinementPatch {
  const submittedAt = options.submittedAt ?? new Date().toISOString();
  const sectionEdits = asRecord(existingProfile?.sectionEdits);
  const radarExpertRefinements = asRecord(sectionEdits.radarExpertRefinements);
  const existingItems = toRecordList(radarExpertRefinements.items);

  return {
    targetIndustries: mergeLists(
      cleanList(existingProfile?.targetIndustries),
      refinement.targetIndustries,
    ),
    targetRegions: mergeTargetRegions(
      existingProfile?.targetRegions,
      refinement.targetCountries,
      refinement.description,
    ),
    sectionEdits: {
      ...sectionEdits,
      radarExpertRefinements: {
        items: [
          ...existingItems.slice(-19),
          {
            summary: refinement.summary,
            originalText: options.originalText,
            fields: {
              targetCountries: refinement.targetCountries,
              targetIndustries: refinement.targetIndustries,
              keywords: refinement.keywords,
              negativeKeywords: refinement.negativeKeywords,
              useCases: refinement.useCases,
              triggers: refinement.triggers,
            },
            updatedAt: submittedAt,
          },
        ],
        updatedAt: submittedAt,
      },
    },
  };
}

function cleanList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupe(value.flatMap((item) => cleanList(item)));
  }

  if (isRecord(value)) {
    return dedupe(Object.values(value).flatMap((item) => cleanList(item)));
  }

  if (typeof value !== 'string') {
    return [];
  }

  return dedupe(
    value
      .split(/[,，;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 120),
  );
}

function normalizeCountries(value: unknown): string[] {
  return dedupe(
    cleanList(value)
      .map((country) => normalizeCountryCode(country))
      .filter((country): country is string => Boolean(country)),
  );
}

function mergeUseCases(value: unknown, refinement: TargetingRefinement): UseCaseData[] {
  const existing = toRecordList(value)
    .map((item) => ({
      name: firstString(item.name) || '',
      signals: toStringList(item.signals),
      excludeSignals: toStringList(item.excludeSignals),
    }))
    .filter((item) => item.name);

  const additions = refinement.useCases.map((name) => ({
    name,
    signals: refinement.keywords.slice(0, 8),
    excludeSignals: refinement.negativeKeywords.slice(0, 8),
  }));

  return mergeByName(existing, additions);
}

function mergeTriggers(value: unknown, refinement: TargetingRefinement): TriggerData[] {
  const existing = toRecordList(value)
    .map((item) => ({
      name: firstString(item.name) || '',
      signals: toStringList(item.signals),
      whereToObserve: toStringList(item.whereToObserve),
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.6,
    }))
    .filter((item) => item.name);

  const additions = refinement.triggers.map((name) => ({
    name,
    signals: refinement.keywords.slice(0, 8),
    whereToObserve: [],
    confidence: 0.65,
  }));

  return mergeByName(existing, additions);
}

function mergeExclusionRules(value: unknown, negativeKeywords: string[]): ExclusionRuleData[] {
  const existing = toRecordList(value)
    .map((item) => ({
      rule: firstString(item.rule) || '',
      why: firstString(item.why) || '来自画像规则',
    }))
    .filter((item) => item.rule);

  const additions = negativeKeywords.map((keyword) => ({
    rule: keyword,
    why: '来自客户行业判断，用于降低无效候选噪音',
  }));

  return mergeByName(existing, additions, 'rule');
}

function mergeTargetRegions(value: unknown, countries: string[], description: string): unknown[] {
  const existing = Array.isArray(value) ? [...value] : [];
  const existingCountries = new Set<string>();

  for (const item of existing) {
    if (typeof item === 'string') {
      const country = normalizeCountryCode(item);
      if (country) existingCountries.add(country);
      continue;
    }

    if (isRecord(item)) {
      for (const country of normalizeCountries(item.countries)) {
        existingCountries.add(country);
      }
    }
  }

  const missingCountries = countries.filter((country) => !existingCountries.has(country));
  if (missingCountries.length === 0) {
    return existing;
  }

  return [
    ...existing,
    {
      region: '客户指定市场',
      countries: missingCountries,
      rationale: `客户专家判断：${description}`,
    },
  ];
}

function mergeByName<T extends Record<string, unknown>>(
  existing: T[],
  additions: T[],
  key: keyof T = 'name',
): T[] {
  const seen = new Set(existing.map((item) => String(item[key]).trim().toLowerCase()));
  const merged = [...existing];
  for (const item of additions) {
    const normalized = String(item[key]).trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      merged.push(item);
    }
  }
  return merged;
}

function mergeLists(...values: string[][]): string[] {
  return dedupe(values.flat());
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function toStringList(value: unknown): string[] {
  return cleanList(value);
}

function toRecordList(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function toExpertRefinements(value: unknown): ExpertRefinementRecord[] {
  return toRecordList(value)
    .map((item) => {
      const fields = asRecord(item.fields);
      return {
        source: item.source === 'customer_expert_input' ? item.source : 'customer_expert_input',
        summary: firstString(item.summary) || '客户行业判断补充',
        originalText: firstString(item.originalText) || '',
        fields: {
          summary: firstString(fields.summary) || '客户行业判断补充',
          targetCountries: toStringList(fields.targetCountries),
          targetIndustries: toStringList(fields.targetIndustries),
          keywords: toStringList(fields.keywords),
          negativeKeywords: toStringList(fields.negativeKeywords),
          useCases: toStringList(fields.useCases),
          triggers: toStringList(fields.triggers),
        },
        submittedAt: firstString(item.submittedAt) || new Date(0).toISOString(),
      };
    });
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
