import type { ContactEnrichmentQuery } from '@/lib/osint/contact-enrichment';
import { normalizeCountryCode } from './country-utils';

export type RadarContactEnrichmentOverrides = Partial<
  Omit<ContactEnrichmentQuery, 'companyName' | 'domain'>
>;

export function resolveRadarContactEnrichmentLanguage(
  country: string | null | undefined
): string | undefined {
  const normalized = normalizeCountryCode(country);
  if (!normalized) {
    return undefined;
  }

  if (['CN', 'CHN', 'PRC'].includes(normalized)) {
    return 'zh-CN';
  }

  if (['TW', 'TWN', 'HK', 'HKG', 'MO', 'MAC'].includes(normalized)) {
    return 'zh-TW';
  }

  return undefined;
}

export function buildRadarContactEnrichmentOverrides(input: {
  country?: string | null;
  city?: string | null;
  industry?: string | null;
  workingWebsite?: string | null;
}): RadarContactEnrichmentOverrides {
  const normalizedCountry =
    normalizeCountryCode(input.country) ?? input.country?.trim() ?? undefined;

  return {
    country: normalizedCountry,
    city: input.city || undefined,
    industry: input.industry || undefined,
    depth: input.workingWebsite ? 'standard' : 'deep',
    options: {
      checkForms: true,
      checkSocialMedia: true,
      inferEmailFormat: true,
      validateMX: true,
      maxResults: 5,
      language: resolveRadarContactEnrichmentLanguage(normalizedCountry),
    },
  };
}
