export interface TenantEmailDefaultInput {
  slug?: string | null;
}

export interface TenantEmailDefaults {
  replyToEmail?: string;
  fromEmail?: string;
}

const REPLY_TO_BY_TENANT: Record<string, string> = {
  tdpaint: 'engineering@tdpaint.com',
  tdpaintcell: 'engineering@tdpaint.com',
  machrio: 'sales@machrio.com',
};

const FROM_EMAIL_BY_TENANT: Record<string, string> = {
  machrio: 'VertaX <noreply@mail.machrio.com>',
};

export function getTenantEmailDefaults(tenant?: TenantEmailDefaultInput | null): TenantEmailDefaults {
  const slug = tenant?.slug?.trim().toLowerCase();
  if (!slug) {
    return {};
  }

  const replyToEmail = REPLY_TO_BY_TENANT[slug];
  const fromEmail = FROM_EMAIL_BY_TENANT[slug];

  if (!replyToEmail && !fromEmail) {
    return {};
  }

  const defaults: TenantEmailDefaults = {};
  if (replyToEmail) {
    defaults.replyToEmail = replyToEmail;
  }
  if (fromEmail) {
    defaults.fromEmail = fromEmail;
  }

  return defaults;
}
