import { describe, expect, it } from 'vitest';

import {
  buildTenantIndustryRadarHints,
  mergeRadarKeywordHints,
  selectTenantIndustrySourcePacks,
} from '@/lib/radar/tenant-industry-source-pack';

describe('tenant industry source packs', () => {
  it('selects the painting automation pack for tdpaint-style tenants', () => {
    const packs = selectTenantIndustrySourcePacks({
      tenantSlug: 'tdpaint',
      companyName: 'TD Painting Systems',
      companyIntro:
        'Robotic painting systems, paint booth automation, paint supply systems, ABB FANUC KUKA integration, ATEX-ready site review.',
      targetIndustries: [
        'automotive component painting',
        'appliance coating automation',
        'metal parts finishing',
      ],
      buyingTriggers: ['manual spraying labor pressure', 'VOC compliance'],
    });

    expect(packs.map((pack) => pack.id)).toContain('painting_automation');
  });

  it('selects the MRO industrial supplies pack for machrio-style tenants', () => {
    const hints = buildTenantIndustryRadarHints({
      tenantSlug: 'machrio',
      companyName: 'Machrio',
      companyIntro:
        'Tools, parts, and industrial essentials for MRO buyers with RFQ, volume pricing, fasteners, abrasives, PPE, electrical supplies, and material handling.',
      coreProducts: [
        { name: 'Fasteners' },
        { name: 'Abrasives' },
        { name: 'Electrical supplies' },
      ],
      targetIndustries: ['manufacturing', 'warehouse and logistics'],
    });

    expect(hints.packIds).toEqual(['mro_industrial_supplies']);
    expect(hints.productModels).toEqual(['procurement']);
    expect(hints.keywords).toContain('MRO industrial supplies buyer');
    expect(hints.buyerRoles).toContain('Procurement Manager');
  });

  it('keeps project-style and procurement-style packs separate', () => {
    const paintingHints = buildTenantIndustryRadarHints({
      tenantSlug: 'tdpaint',
      companyIntro: 'Paint booth automation and robotic spray cell installation.',
    });
    const mroHints = buildTenantIndustryRadarHints({
      tenantSlug: 'machrio',
      companyIntro: 'MRO industrial supplies, fasteners, PPE, and material handling RFQ.',
    });

    expect(paintingHints.productModels).toEqual(['project']);
    expect(mroHints.productModels).toEqual(['procurement']);
    expect(paintingHints.buyerRoles).toContain('Paint Shop Manager');
    expect(mroHints.buyerRoles).toContain('MRO Buyer');
  });

  it('merges source-pack keywords into existing Radar keywords', () => {
    const hints = buildTenantIndustryRadarHints({
      tenantSlug: 'tdpaint',
      companyIntro: 'robotic painting and paint booth automation',
    });

    const merged = mergeRadarKeywordHints(
      { en: ['existing keyword'], zh: ['robot spraying zh seed'] },
      hints
    );

    expect(merged.en[0]).toBe('existing keyword');
    expect(merged.en).toContain('robotic painting system integrator');
    expect(merged.zh).toEqual(['robot spraying zh seed']);
  });
});
