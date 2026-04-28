type ProductModel = 'project' | 'procurement';

export interface TenantIndustryProfileInput {
  tenantSlug?: string | null;
  companyName?: string | null;
  companyIntro?: string | null;
  coreProducts?: unknown;
  targetIndustries?: unknown;
  scenarios?: unknown;
  buyerPersonas?: unknown;
  painPoints?: unknown;
  buyingTriggers?: unknown;
}

export interface TenantIndustrySourcePack {
  id: 'painting_automation' | 'mro_industrial_supplies';
  label: string;
  productModel: ProductModel;
  matchTerms: string[];
  discoveryKeywords: string[];
  triggerKeywords: string[];
  competitorKeywords: string[];
  targetIndustries: string[];
  buyerRoles: string[];
  sourceSignals: string[];
  negativeKeywords: string[];
}

export interface TenantIndustryRadarHints {
  packIds: TenantIndustrySourcePack['id'][];
  keywords: string[];
  targetIndustries: string[];
  buyerRoles: string[];
  buyingTriggers: string[];
  sourceSignals: string[];
  negativeKeywords: string[];
  productModels: ProductModel[];
}

const TENANT_INDUSTRY_SOURCE_PACKS: TenantIndustrySourcePack[] = [
  {
    id: 'painting_automation',
    label: 'Robotic spray painting cells and automated paint line upgrades',
    productModel: 'project',
    matchTerms: [
      'tdpaint',
      'td paint',
      'paintcell',
      'robotic painting system',
      'robotic painting',
      'spray painting',
      'spray painting automation',
      'robotic spray cell',
      'robotic spray painting cell',
      'industrial paint automation',
      'automatic paint spraying system',
      'liquid paint finishing',
      'paint finishing line',
      'paint coating',
      'industrial painting',
      'automated spray painting line',
      'manual spray painting',
      'semi-automatic spray painting',
      'paint booth',
      'spray booth',
      'paint booth automation',
      'paint shop',
      'paint line',
      'paint line automation',
      'paint robot',
      'paint automation',
      'atex',
      'nfpa 33',
      'abb',
      'fanuc',
      'kuka',
      'yaskawa',
      'graco',
      'sames',
    ],
    discoveryKeywords: [
      'robotic painting system',
      'spray painting automation',
      'industrial paint automation',
      'automatic paint spraying system',
      'liquid paint finishing line',
      'manufacturer upgrading manual spray painting to robots',
      'manual spray painting automation project',
      'semi-automatic spray painting line upgrade',
      'robotic spray painting cell integration',
      'automated spray painting line integrator',
      'paint booth automation integrator',
      'paint booth robot retrofit project',
      'paint shop automation retrofit',
      'automotive component robotic painting line',
      'appliance spray painting line automation',
      'metal parts spray painting robot cell',
      'plastic parts robotic spray painting line',
      'industrial equipment paint line upgrade',
      'paint supply system integration for spray robots',
      'ATEX spray booth robot upgrade',
      'VOC compliant robotic paint booth',
      'paint atomization and film thickness control',
      'paint color change system automation',
    ],
    triggerKeywords: [
      'paint line expansion',
      'manual spray painting bottleneck',
      'semi-automatic paint line upgrade',
      'spray booth retrofit',
      'robotic paint cell feasibility',
      'paint booth automation project',
      'finish quality consistency',
      'paint waste reduction',
      'VOC compliance',
      'ATEX compliance',
      'manual spray painting labor shortage',
      'film thickness variation',
      'paint color change waste',
      'paint atomization quality issue',
      'paint shop throughput improvement',
      'paint shop commissioning',
    ],
    competitorKeywords: [
      'ABB painting robot customer',
      'FANUC paint robot customer',
      'KUKA painting robot customer',
      'Yaskawa paint robot customer',
      'Graco paint spray system integrator',
      'SAMES Kremlin paint finishing customer',
      'Binks spray booth automation',
    ],
    targetIndustries: [
      'manufacturers upgrading manual spray painting',
      'manufacturers upgrading semi-automatic spray painting',
      'automotive component manufacturing',
      'EV component manufacturing',
      'appliance manufacturing',
      'metal parts manufacturing',
      'industrial equipment manufacturing',
      'furniture manufacturers with spray painting lines',
      'woodworking manufacturers with liquid paint finishing lines',
      'plastic parts manufacturers with spray painting lines',
      'construction machinery manufacturers with paint shops',
    ],
    buyerRoles: [
      'Plant Manager',
      'Production Manager',
      'Paint Shop Manager',
      'Process Engineer',
      'Automation Engineer',
      'EHS Manager',
      'Maintenance Manager',
      'Project Manager',
      'Purchasing Manager',
    ],
    sourceSignals: [
      'case studies',
      'robot OEM ecosystem',
      'paint booth integrator directories',
      'paint shop upgrade projects',
      'industrial painting trade shows',
      'hiring pages',
      'safety compliance pages',
      'project references',
    ],
    negativeKeywords: [
      'body shop repair',
      'car detailing',
      'residential painting',
      'house painting',
      'powder coating only',
      'dip coating',
      'adhesive dispensing',
      'glue dispensing',
      'sealant dispensing',
      'battery slurry coating',
      'medical coating',
      'functional film coating',
      'electroplating',
      'anodizing',
      'pvd coating',
      'thermal spray',
      'floor coating',
      'roof coating',
      'waterproof coating',
      'generic coating equipment',
      'coating materials supplier',
      'artist paint',
      'paint store',
    ],
  },
  {
    id: 'mro_industrial_supplies',
    label: 'MRO industrial supplies and RFQ procurement',
    productModel: 'procurement',
    matchTerms: [
      'machrio',
      'mach rio',
      'mro',
      'maintenance repair operations',
      'industrial essentials',
      'industrial supplies',
      'tools parts',
      'fasteners',
      'abrasives',
      'adhesives',
      'safety ppe',
      'ppe',
      'material handling',
      'hvac',
      'hydraulics',
      'electrical supplies',
      'hardware',
      'rfq',
      'volume pricing',
      'net 30',
    ],
    discoveryKeywords: [
      'MRO industrial supplies buyer',
      'maintenance repair operations procurement',
      'industrial supplies RFQ',
      'factory maintenance supplies',
      'plant maintenance spare parts',
      'bulk fasteners procurement',
      'abrasives supplier bulk order',
      'safety PPE procurement',
      'material handling supplies buyer',
      'electrical supplies procurement',
      'hardware and fasteners distributor',
      'facility maintenance supplies',
      'warehouse operations supplies',
      'industrial consumables buyer',
    ],
    triggerKeywords: [
      'supplier consolidation',
      'volume pricing request',
      'bulk order industrial supplies',
      'replacement parts shortage',
      'maintenance downtime reduction',
      'new warehouse opening',
      'facility maintenance contract',
      'procurement cost reduction',
      'MRO vendor onboarding',
      'RFQ industrial supplies',
    ],
    competitorKeywords: [
      'Grainger alternative supplier',
      'Fastenal customer procurement',
      'MSC Industrial supply buyer',
      'McMaster Carr alternative',
      'Motion Industries MRO customer',
      'Zoro industrial supplies customer',
      'MROSupply customer',
    ],
    targetIndustries: [
      'manufacturing',
      'construction',
      'automotive',
      'healthcare facilities',
      'food and beverage manufacturing',
      'warehouse and logistics',
      'facility management',
      'plant maintenance',
    ],
    buyerRoles: [
      'Procurement Manager',
      'MRO Buyer',
      'Maintenance Manager',
      'Facility Manager',
      'Operations Manager',
      'Warehouse Manager',
      'Plant Manager',
      'Supply Chain Manager',
    ],
    sourceSignals: [
      'industrial catalogs',
      'procurement pages',
      'supplier portals',
      'hiring pages',
      'facility management directories',
      'warehouse directories',
      'maintenance service pages',
    ],
    negativeKeywords: [
      'aviation MRO',
      'aircraft maintenance',
      'consumer hardware',
      'home improvement retail',
      'used machinery marketplace',
    ],
  },
];

function flattenText(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenText(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => flattenText(item));
  }

  return [];
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function matchesTerm(haystack: string, term: string): boolean {
  const normalizedTerm = term.toLowerCase();
  if (normalizedTerm.length <= 3 && /^[a-z0-9]+$/.test(normalizedTerm)) {
    return new RegExp(`\\b${normalizedTerm}\\b`, 'i').test(haystack);
  }

  return haystack.includes(normalizedTerm);
}

function scorePack(pack: TenantIndustrySourcePack, input: TenantIndustryProfileInput): number {
  const slug = input.tenantSlug?.toLowerCase() || '';
  const companyName = input.companyName?.toLowerCase() || '';
  const text = flattenText(input).join(' ').toLowerCase();
  let score = 0;

  for (const term of pack.matchTerms) {
    if (matchesTerm(slug, term)) {
      score += 4;
    }
    if (matchesTerm(companyName, term)) {
      score += 3;
    }
    if (matchesTerm(text, term)) {
      score += 1;
    }
  }

  return score;
}

export function selectTenantIndustrySourcePacks(
  input: TenantIndustryProfileInput
): TenantIndustrySourcePack[] {
  return TENANT_INDUSTRY_SOURCE_PACKS
    .map((pack) => ({ pack, score: scorePack(pack, input) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .map(({ pack }) => pack);
}

export function buildTenantIndustryRadarHints(
  input: TenantIndustryProfileInput
): TenantIndustryRadarHints {
  const packs = selectTenantIndustrySourcePacks(input);

  return {
    packIds: packs.map((pack) => pack.id),
    keywords: dedupe(
      packs.flatMap((pack) => [
        ...pack.discoveryKeywords,
        ...pack.triggerKeywords,
        ...pack.competitorKeywords,
      ])
    ),
    targetIndustries: dedupe(packs.flatMap((pack) => pack.targetIndustries)),
    buyerRoles: dedupe(packs.flatMap((pack) => pack.buyerRoles)),
    buyingTriggers: dedupe(packs.flatMap((pack) => pack.triggerKeywords)),
    sourceSignals: dedupe(packs.flatMap((pack) => pack.sourceSignals)),
    negativeKeywords: dedupe(packs.flatMap((pack) => pack.negativeKeywords)),
    productModels: dedupe(packs.map((pack) => pack.productModel)) as ProductModel[],
  };
}

export function mergeRadarKeywordHints(
  keywords: Record<string, string[]> | null | undefined,
  hints: TenantIndustryRadarHints
): Record<string, string[]> {
  return {
    ...(keywords || {}),
    en: dedupe([...(keywords?.en || []), ...hints.keywords]),
  };
}
