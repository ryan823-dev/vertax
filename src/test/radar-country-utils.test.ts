import { describe, expect, it } from 'vitest';
import {
  doesCountryMatchTargets,
  getCountryDisplayName,
  getCountryMatchPriority,
  normalizeCountryCode,
  toTavilyCountryName,
} from '@/lib/radar/country-utils';

describe('radar country utils', () => {
  it('normalizes common aliases to ISO codes', () => {
    expect(normalizeCountryCode('USA')).toBe('US');
    expect(normalizeCountryCode('U.S.A.')).toBe('US');
    expect(normalizeCountryCode('United States')).toBe('US');
    expect(normalizeCountryCode('CHN')).toBe('CN');
    expect(normalizeCountryCode('Deutschland')).toBe('DE');
    expect(normalizeCountryCode('Hong Kong')).toBe('HK');
    expect(normalizeCountryCode('Macau')).toBe('MO');
    expect(normalizeCountryCode('UK')).toBe('GB');
    expect(normalizeCountryCode('South Korea')).toBe('KR');
  });

  it('returns canonical display names', () => {
    expect(getCountryDisplayName('US')).toBe('United States');
    expect(getCountryDisplayName('DE')).toBe('Germany');
    expect(getCountryDisplayName('Deutschland')).toBe('Germany');
    expect(getCountryDisplayName('HKG')).toBe('Hong Kong');
    expect(getCountryDisplayName('MAC')).toBe('Macao');
  });

  it('builds Tavily country names from ISO codes', () => {
    expect(toTavilyCountryName('DE')).toBe('germany');
    expect(toTavilyCountryName('US')).toBe('united states');
    expect(toTavilyCountryName('HKG')).toBe('hong kong');
  });

  it('scores country matches before unknown and mismatched values', () => {
    expect(getCountryMatchPriority('United States', ['US'])).toBe(0);
    expect(getCountryMatchPriority(null, ['US'])).toBe(1);
    expect(getCountryMatchPriority('Germany', ['US'])).toBe(2);
    expect(doesCountryMatchTargets('USA', ['US'])).toBe(true);
    expect(doesCountryMatchTargets('Germany', ['US'])).toBe(false);
  });
});
