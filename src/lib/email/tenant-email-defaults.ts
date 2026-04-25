export interface TenantEmailDefaultInput {
  slug?: string | null;
}

export interface TenantEmailDefaults {
  replyToEmail?: string;
}

const REPLY_TO_BY_TENANT: Record<string, string> = {
  tdpaint: 'engineering@tdpaint.com',
  tdpaintcell: 'engineering@tdpaint.com',
  machrio: 'sales@machrio.com',
};

export function getTenantEmailDefaults(tenant?: TenantEmailDefaultInput | null): TenantEmailDefaults {
  const slug = tenant?.slug?.trim().toLowerCase();
  if (slug && REPLY_TO_BY_TENANT[slug]) {
    return { replyToEmail: REPLY_TO_BY_TENANT[slug] };
  }

  return {};
}
