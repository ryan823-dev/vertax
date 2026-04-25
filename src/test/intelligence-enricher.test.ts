import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompanyInvestigationReport } from '@/lib/osint';

import {
  buildRadarContactEnrichmentOverrides,
  resolveRadarContactEnrichmentLanguage,
} from '@/lib/radar/contact-enrichment-strategy';
import {
  buildRadarOsintCheckpointSummary,
  isRadarSearchEngineEnabled,
} from '@/lib/radar/enrichment-policy';
import { MultiSourceSearchAdapter } from '@/lib/radar/adapters/multi-search';

function buildInvestigationReport(
  overrides: Partial<CompanyInvestigationReport> = {}
): CompanyInvestigationReport {
  return {
    id: 'report-1',
    query: {
      companyName: 'Acme Automation',
      domain: 'https://acme.example',
      country: 'US',
    } as CompanyInvestigationReport['query'],
    generatedAt: new Date('2026-04-25T00:00:00.000Z'),
    duration: 1250,
    identity: {
      website: {
        status: 'ACTIVE',
        url: 'https://acme.example',
      },
      linkedin: {
        verified: true,
      },
    } as CompanyInvestigationReport['identity'],
    registration: {
      primary: {
        registrationNumber: '123456',
        country: 'US',
        legalName: 'Acme Automation LLC',
        status: 'ACTIVE',
        dataSource: 'registry',
      },
      sources: ['registry'],
      reliability: 'OFFICIAL',
    } as CompanyInvestigationReport['registration'],
    authenticityScore: 88,
    overallRisk: 'LOW',
    keyFindings: [],
    suspiciousSignals: [],
    recommendations: [],
    dataSources: ['test'],
    ...overrides,
  };
}

describe('radar intelligence contact-enrichment strategy helpers', () => {
  it('maps mainland China to zh-CN search language hints', () => {
    expect(resolveRadarContactEnrichmentLanguage('CN')).toBe('zh-CN');
    expect(resolveRadarContactEnrichmentLanguage('chn')).toBe('zh-CN');
  });

  it('maps traditional Chinese regions to zh-TW search language hints', () => {
    expect(resolveRadarContactEnrichmentLanguage('TW')).toBe('zh-TW');
    expect(resolveRadarContactEnrichmentLanguage('HK')).toBe('zh-TW');
    expect(resolveRadarContactEnrichmentLanguage('Hong Kong')).toBe('zh-TW');
  });

  it('leaves non-Chinese countries without a language override', () => {
    expect(resolveRadarContactEnrichmentLanguage('US')).toBeUndefined();
    expect(resolveRadarContactEnrichmentLanguage(undefined)).toBeUndefined();
  });

  it('builds the conservative Radar contact-enrichment overrides', () => {
    const overrides = buildRadarContactEnrichmentOverrides({
      country: 'CN',
      city: 'Shanghai',
      industry: 'Industrial Automation',
      workingWebsite: 'https://www.acme.example',
    });

    expect(overrides).toEqual({
      country: 'CN',
      city: 'Shanghai',
      industry: 'Industrial Automation',
      depth: 'standard',
      options: {
        checkForms: true,
        checkSocialMedia: true,
        inferEmailFormat: true,
        validateMX: true,
        maxResults: 5,
        language: 'zh-CN',
      },
    });
  });

  it('falls back to deep mode when no working website is available', () => {
    const overrides = buildRadarContactEnrichmentOverrides({
      country: 'US',
      city: null,
      industry: null,
      workingWebsite: null,
    });

    expect(overrides.depth).toBe('deep');
    expect(overrides.options).toEqual({
      checkForms: true,
      checkSocialMedia: true,
      inferEmailFormat: true,
      validateMX: true,
      maxResults: 5,
      language: undefined,
    });
  });

  it('normalizes country aliases before building overrides', () => {
    const overrides = buildRadarContactEnrichmentOverrides({
      country: 'Hong Kong',
      city: 'Hong Kong',
      industry: 'Automation',
      workingWebsite: 'https://www.acme.example',
    });

    expect(overrides.country).toBe('HK');
    expect(overrides.options?.language).toBe('zh-TW');
  });
});

describe('radar enrichment policy helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('passes strong companies for paid enrichment and primary writeback', () => {
    const summary = buildRadarOsintCheckpointSummary(buildInvestigationReport());

    expect(summary.status).toBe('passed');
    expect(summary.allowPaidEnrichment).toBe(true);
    expect(summary.allowPrimaryWriteback).toBe(true);
    expect(summary.identitySignals.signalCount).toBe(3);
    expect(summary.resolvedDomain).toBe('acme.example');
  });

  it('keeps weaker identities in review without allowing primary writeback', () => {
    const summary = buildRadarOsintCheckpointSummary(
      buildInvestigationReport({
        identity: {
          website: {
            status: 'INACTIVE',
            url: 'https://acme.example',
          },
          linkedin: {
            verified: true,
          },
        } as CompanyInvestigationReport['identity'],
        registration: {
          primary: {
            registrationNumber: '123456',
            country: 'US',
            legalName: 'Acme Automation LLC',
            status: 'UNKNOWN',
            dataSource: 'registry',
          },
          sources: ['registry'],
          reliability: 'OFFICIAL',
        } as CompanyInvestigationReport['registration'],
      })
    );

    expect(summary.status).toBe('review');
    expect(summary.allowPaidEnrichment).toBe(true);
    expect(summary.allowPrimaryWriteback).toBe(false);
    expect(summary.reasons).toContain('website_not_verified_for_writeback');
    expect(summary.reasons).toContain('identity_signals_insufficient_for_writeback');
  });

  it('disables Tavily unless the policy flag is explicitly enabled', () => {
    expect(isRadarSearchEngineEnabled('tavily')).toBe(false);

    vi.stubEnv('RADAR_ENABLE_TAVILY_FALLBACK', 'true');
    expect(isRadarSearchEngineEnabled('tavily')).toBe(true);
  });
});

describe('multi-source search adapter policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps Tavily out of multi-search by default', () => {
    const adapter = new MultiSourceSearchAdapter();

    expect(adapter.getAvailableEngines()).not.toContain('Tavily AI');
  });

  it('does not let explicit engine selection bypass the Tavily policy flag', () => {
    const adapter = new MultiSourceSearchAdapter({
      engines: ['Tavily AI', 'Exa AI Search'],
    });

    expect(adapter.getAvailableEngines()).toContain('Exa AI Search');
    expect(adapter.getAvailableEngines()).not.toContain('Tavily AI');
  });

  it('includes Tavily in multi-search when the policy flag is enabled', () => {
    vi.stubEnv('RADAR_ENABLE_TAVILY_FALLBACK', '1');

    const adapter = new MultiSourceSearchAdapter();

    expect(adapter.getAvailableEngines()).toContain('Tavily AI');
  });
});
