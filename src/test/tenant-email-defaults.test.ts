import { describe, expect, it } from 'vitest';
import { getTenantEmailDefaults } from '@/lib/email/tenant-email-defaults';

describe('tenant email defaults', () => {
  it('returns reply-to defaults for known tenant slugs', () => {
    expect(getTenantEmailDefaults({ slug: 'tdpaint' })).toEqual({
      replyToEmail: 'engineering@tdpaint.com',
    });
    expect(getTenantEmailDefaults({ slug: 'tdpaintcell' })).toEqual({
      replyToEmail: 'engineering@tdpaint.com',
    });
    expect(getTenantEmailDefaults({ slug: 'machrio' })).toEqual({
      replyToEmail: 'sales@machrio.com',
    });
  });

  it('does not invent defaults for unknown tenants', () => {
    expect(getTenantEmailDefaults({ slug: 'unknown' })).toEqual({});
    expect(getTenantEmailDefaults(null)).toEqual({});
  });
});
