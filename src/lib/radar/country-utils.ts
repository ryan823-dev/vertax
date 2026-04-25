const COUNTRY_CODES = [
  "US",
  "DE",
  "GB",
  "FR",
  "HK",
  "JP",
  "KR",
  "IT",
  "ES",
  "NL",
  "SE",
  "CH",
  "AT",
  "AU",
  "CA",
  "BR",
  "MX",
  "IN",
  "TH",
  "VN",
  "MY",
  "SG",
  "ID",
  "PH",
  "TR",
  "PL",
  "CZ",
  "HU",
  "SA",
  "AE",
  "EG",
  "ZA",
  "DK",
  "FI",
  "NO",
  "BE",
  "PT",
  "RO",
  "SK",
  "SI",
  "IE",
  "GR",
  "IL",
  "QA",
  "KW",
  "MA",
  "NG",
  "KE",
  "CL",
  "CO",
  "AR",
  "NZ",
  "TW",
  "CN",
  "PK",
  "BD",
  "LK",
  "KZ",
  "UA",
  "HR",
  "CY",
  "EE",
  "LV",
  "LT",
  "LU",
  "MT",
  "MO",
  "BG",
] as const;

const regionDisplay = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_DISPLAY_OVERRIDES: Partial<Record<(typeof COUNTRY_CODES)[number], string>> = {
  HK: "Hong Kong",
  MO: "Macao",
};

export const COUNTRY_NAME_BY_ISO = Object.fromEntries(
  COUNTRY_CODES.map((code) => [
    code,
    COUNTRY_DISPLAY_OVERRIDES[code] ?? regionDisplay.of(code) ?? code,
  ]),
) as Record<(typeof COUNTRY_CODES)[number], string>;

const COUNTRY_ALIAS_EXTRA: Partial<Record<(typeof COUNTRY_CODES)[number], string[]>> = {
  US: ["usa", "u.s.a", "u.s.", "united states of america", "america"],
  GB: ["uk", "u.k.", "britain", "great britain", "england"],
  KR: ["republic of korea", "korea republic of", "south korea"],
  AE: ["uae", "u.a.e."],
  CZ: ["czechia"],
  VN: ["viet nam"],
  TR: ["turkiye", "türkiye"],
  CN: ["chn", "prc", "pr china", "p.r. china", "people's republic of china", "mainland china"],
  TW: ["twn", "taiwan, province of china", "roc taiwan"],
  HK: ["hkg", "hong kong", "hong kong sar", "hong kong sar china", "hksar"],
  DE: ["deutschland"],
  JP: ["nippon", "nihon"],
  MO: ["mac", "macao", "macau", "macao sar", "macau sar"],
};

function normalizeCountryKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const COUNTRY_ISO_BY_ALIAS = new Map<string, string>();

for (const code of COUNTRY_CODES) {
  COUNTRY_ISO_BY_ALIAS.set(normalizeCountryKey(code), code);

  const englishName = COUNTRY_NAME_BY_ISO[code];
  COUNTRY_ISO_BY_ALIAS.set(normalizeCountryKey(englishName), code);

  for (const alias of COUNTRY_ALIAS_EXTRA[code] ?? []) {
    COUNTRY_ISO_BY_ALIAS.set(normalizeCountryKey(alias), code);
  }
}

export function normalizeCountryCode(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  if (upper in COUNTRY_NAME_BY_ISO) {
    return upper;
  }

  return COUNTRY_ISO_BY_ALIAS.get(normalizeCountryKey(trimmed)) ?? null;
}

export function getCountryDisplayName(value?: string | null): string | null {
  const iso = normalizeCountryCode(value);
  if (!iso) {
    return value?.trim() || null;
  }

  return COUNTRY_NAME_BY_ISO[iso as keyof typeof COUNTRY_NAME_BY_ISO] ?? iso;
}

export function toTavilyCountryName(value?: string | null): string | undefined {
  const display = getCountryDisplayName(value);
  return display ? display.toLowerCase() : undefined;
}

export function doesCountryMatchTargets(
  value: string | null | undefined,
  targets: string[] | null | undefined,
): boolean {
  const candidateIso = normalizeCountryCode(value);
  if (!candidateIso || !targets || targets.length === 0) {
    return false;
  }

  return targets.some((target) => normalizeCountryCode(target) === candidateIso);
}

export function getCountryMatchPriority(
  value: string | null | undefined,
  targets: string[] | null | undefined,
): 0 | 1 | 2 {
  const candidateIso = normalizeCountryCode(value);
  if (!candidateIso) {
    return 1;
  }

  return doesCountryMatchTargets(candidateIso, targets) ? 0 : 2;
}
