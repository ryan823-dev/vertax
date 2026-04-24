import { describe, expect, it } from 'vitest';
import {
  normalizeInvestigationDepth,
  normalizeInvestigationLayers,
} from '@/lib/osint/query';

describe('osint query normalization', () => {
  it('normalizes lowercase depths to enum values', () => {
    expect(normalizeInvestigationDepth('basic')).toBe('BASIC');
    expect(normalizeInvestigationDepth('standard')).toBe('STANDARD');
    expect(normalizeInvestigationDepth('deep')).toBe('DEEP');
  });

  it('falls back to STANDARD for invalid depths', () => {
    expect(normalizeInvestigationDepth('unknown')).toBe('STANDARD');
    expect(normalizeInvestigationDepth(null)).toBe('STANDARD');
  });

  it('filters and dedupes investigation layers', () => {
    expect(
      normalizeInvestigationLayers(['identity', 'RISK', 'risk', 'unknown', 1])
    ).toEqual(['IDENTITY', 'RISK']);
  });
});
