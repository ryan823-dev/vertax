import { describe, expect, it } from 'vitest';

import {
  applyTargetingRefinement,
  buildCompanyProfileRefinementPatch,
  normalizeTargetingRefinement,
} from '@/lib/radar/targeting-refinement';

describe('targeting refinement', () => {
  it('normalizes customer expert input before applying it to targeting spec', () => {
    const refinement = normalizeTargetingRefinement(
      {
        summary: '美国喷涂自动化客户',
        targetCountries: ['United States', 'US'],
        targetIndustries: ['automotive components', 'appliance manufacturing'],
        keywords: { en: ['paint booth automation', 'robotic spray cell'] },
        negativeKeywords: ['residential painting', 'auto body repair'],
        useCases: ['paint line retrofit'],
        triggers: ['VOC compliance upgrade'],
      },
      '美国制造企业中有喷涂产线升级需求',
    );

    expect(refinement.targetCountries).toEqual(['US']);
    expect(refinement.keywords).toContain('robotic spray cell');
    expect(refinement.negativeKeywords).toContain('auto body repair');
  });

  it('merges customer judgment into the portrait instead of replacing the existing ICP', () => {
    const existing = {
      targetingSpec: {
        icpName: 'TD Paint ICP',
        segmentation: {
          firmographic: {
            industries: ['industrial coating'],
            countries: ['DE'],
            companySize: { label: 'Mid-market' },
            exclude: ['paint store'],
          },
          technographic: {
            keywords: ['spray painting robot'],
            standards: [],
            systems: [],
            exclude: [],
          },
          useCases: [],
          triggers: [],
          decisionUnit: [{ role: 'Plant Manager', influence: 'decision_maker' }],
          exclusionRules: [],
        },
        evidenceUsed: ['知识引擎画像'],
      },
    };

    const next = applyTargetingRefinement(
      existing,
      normalizeTargetingRefinement(
        {
          summary: '美国喷涂自动化客户',
          targetCountries: ['US'],
          targetIndustries: ['automotive components'],
          keywords: ['paint booth automation'],
          negativeKeywords: ['residential painting'],
          useCases: ['paint booth retrofit'],
          triggers: ['VOC compliance upgrade'],
        },
        '美国喷涂自动化客户',
      ),
      { originalText: '美国喷涂自动化客户', submittedAt: '2026-04-26T00:00:00.000Z' },
    );

    expect(next.targetingSpec.icpName).toBe('TD Paint ICP');
    expect(next.targetingSpec.segmentation.firmographic.countries).toEqual(['DE', 'US']);
    expect(next.targetingSpec.segmentation.firmographic.industries).toContain('automotive components');
    expect(next.targetingSpec.segmentation.technographic.keywords).toContain('paint booth automation');
    expect(next.targetingSpec.segmentation.exclusionRules[0]).toEqual({
      rule: 'residential painting',
      why: '来自客户行业判断，用于降低无效候选噪音',
    });
    expect(next.expertRefinements?.[0].source).toBe('customer_expert_input');
    expect(next.targetingSpec.evidenceUsed).toContain('知识引擎画像');
  });

  it('keeps customer direction durable in the company profile source fields', () => {
    const patch = buildCompanyProfileRefinementPatch(
      {
        targetIndustries: ['industrial coating'],
        targetRegions: [{ region: 'Europe', countries: ['DE'], rationale: 'existing' }],
        sectionEdits: {
          radarExpertRefinements: {
            items: [{ summary: 'old note' }],
          },
        },
      },
      normalizeTargetingRefinement(
        {
          summary: '美国喷涂自动化客户',
          targetCountries: ['US', 'DE'],
          targetIndustries: ['automotive components'],
          keywords: ['paint booth automation'],
        },
        '美国喷涂自动化客户',
      ),
      { originalText: '美国喷涂自动化客户', submittedAt: '2026-04-26T00:00:00.000Z' },
    );

    expect(patch.targetIndustries).toEqual(['industrial coating', 'automotive components']);
    expect(patch.targetRegions).toEqual([
      { region: 'Europe', countries: ['DE'], rationale: 'existing' },
      {
        region: '客户指定市场',
        countries: ['US'],
        rationale: '客户专家判断：美国喷涂自动化客户',
      },
    ]);
    expect(
      (patch.sectionEdits.radarExpertRefinements as { items: Array<{ summary: string }> }).items,
    ).toHaveLength(2);
  });
});
