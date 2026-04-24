// Contact enrichment types for public B2B contact discovery and identity locking.

export type ContactConfidenceScore = number;

export const CONFIDENCE_SCORE_RULES: Record<
  ContactConfidenceScore,
  { label: string; description: string }
> = {
  100: {
    label: "Directly verified on official site",
    description:
      "Listed directly on the official contact page or repeated across official pages.",
  },
  90: {
    label: "Repeated official evidence",
    description:
      "Repeated on the official homepage, footer, about, or other official surfaces.",
  },
  80: {
    label: "Official social confirmation",
    description:
      "Confirmed by an official LinkedIn, Facebook, or YouTube company presence.",
  },
  70: {
    label: "Industry directory corroboration",
    description:
      "Found in an industry directory with matching company details such as domain, phone, or address.",
  },
  50: {
    label: "Third-party database",
    description: "Found in a third-party database without strong official corroboration.",
  },
  30: {
    label: "Format inference",
    description: "Inferred from an email pattern such as info@domain.",
  },
  0: {
    label: "Do not use",
    description: "Unreliable or non-compliant source.",
  },
};

export type ContactSourceType =
  | "official_contact_page"
  | "official_footer"
  | "official_about_page"
  | "official_homepage"
  | "official_service_page"
  | "official_quote_page"
  | "official_inquiry_page"
  | "official_policy_page"
  | "official_team_page"
  | "official_linkedin"
  | "official_facebook"
  | "official_youtube"
  | "industry_directory"
  | "association_member"
  | "chamber_member"
  | "trade_show_exhibitor"
  | "chamber_of_commerce"
  | "bbb"
  | "partner_page"
  | "third_party_database"
  | "email_format_inferred"
  | "search_result"
  | "mx_validated";

export interface ContactEntry {
  value: string;
  confidence: ContactConfidenceScore;
  sources: ContactSourceType[];
  sourceUrls?: string[];
  note?: string;
  isPrimary?: boolean;
  lastVerified?: Date;
}

export interface PhoneContact extends ContactEntry {
  type: "main" | "sales" | "support" | "service" | "mobile" | "unknown";
  countryCode?: string;
  dialVerified?: boolean;
}

export interface EmailContact extends ContactEntry {
  type: "role" | "personal" | "unknown";
  roleType?:
    | "sales"
    | "info"
    | "support"
    | "service"
    | "engineering"
    | "quotes"
    | "rfq"
    | "contact";
  mxValid?: boolean;
  emailVerified?: boolean;
}

export interface AddressContact extends ContactEntry {
  type:
    | "headquarters"
    | "office"
    | "warehouse"
    | "service"
    | "manufacturing"
    | "unknown";
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  hasConflict?: boolean;
}

export interface ContactForm {
  url: string;
  type:
    | "general"
    | "contact"
    | "sales"
    | "support"
    | "quote"
    | "rfq"
    | "inquiry"
    | "demo"
    | "unknown";
  fields?: string[];
  requiresLogin?: boolean;
  source: ContactSourceType;
}

export type IdentityEvidenceType =
  | "input_domain"
  | "official_domain_search"
  | "official_domain_match"
  | "official_website_signal"
  | "linkedin_company_page"
  | "linkedin_slug_match"
  | "contact_domain_match"
  | "contact_domain_conflict"
  | "location_match"
  | "industry_match"
  | "duplicate_conflict"
  | "domain_conflict";

export type IdentityEvidenceStrength = "strong" | "supporting" | "conflict";

export interface IdentityResolutionEvidence {
  type: IdentityEvidenceType;
  strength: IdentityEvidenceStrength;
  source: "input" | "search" | "website" | "directory" | "linkedin";
  value: string;
  scoreDelta: number;
  note?: string;
}

export interface IdentityResolution {
  canonicalName: string;
  normalizedName: string;
  officialDomain?: string;
  officialUrl?: string;
  linkedinSlug?: string;
  country?: string;
  city?: string;
  confidence: number;
  verdict: "verified" | "probable" | "ambiguous" | "unverified";
  writebackAllowed: boolean;
  strongEvidenceCount: number;
  evidence: IdentityResolutionEvidence[];
  blockingIssues: string[];
}

export interface CompanyIdentity {
  inputName: string;
  legalName?: string;
  displayName?: string;
  domain?: string;
  country?: string;
  state?: string;
  city?: string;
  industry?: string;
  officialUrl?: string;
  linkedinUrl?: string;
  identityConfidence: number;
  duplicateRisk: "none" | "low" | "medium" | "high";
  duplicateWarnings?: string[];
  resolution: IdentityResolution;
}

export interface ContactEnrichmentQuery {
  companyName: string;
  domain?: string;
  country?: string;
  state?: string;
  city?: string;
  industry?: string;
  depth: "quick" | "standard" | "deep";
  enrichTypes?: ("phone" | "email" | "address" | "form" | "capabilities")[];
  options?: {
    validateMX?: boolean;
    checkForms?: boolean;
    checkDirectories?: boolean;
    checkSocialMedia?: boolean;
    inferEmailFormat?: boolean;
    maxResults?: number;
    language?: string;
    preferredDirectories?: string[];
  };
}

export interface CompanyCapabilities {
  keywords: string[];
  descriptions?: string[];
  products?: string[];
  markets?: string[];
  targetIndustries?: string[];
  sources: ContactSourceType[];
  sourceUrls?: string[];
}

export type Capabilities = CompanyCapabilities;

export interface ContactEnrichmentResult {
  identity: CompanyIdentity;
  phones: PhoneContact[];
  emails: EmailContact[];
  addresses: AddressContact[];
  contactForms: ContactForm[];
  capabilities?: CompanyCapabilities;
  recommendedChannels: RecommendedChannel[];
  leadQualityScore: number;
  completenessScore: number;
  informationGaps: InformationGap[];
  sourcesSummary: string[];
  duration: number;
  enrichedAt: Date;
}

export interface RecommendedChannel {
  type: "phone" | "email" | "form" | "linkedin";
  value: string;
  confidence: ContactConfidenceScore;
  reason: string;
  priority: number;
}

export interface InformationGap {
  type:
    | "email"
    | "phone"
    | "address"
    | "industry"
    | "capabilities"
    | "decision_maker"
    | "business_match";
  description: string;
  importance: "high" | "medium" | "low";
  suggestedAction?: string;
}

export type SourceComplianceLevel =
  | "compliant"
  | "borderline"
  | "non_compliant";

export interface ComplianceCheckResult {
  source: ContactSourceType;
  compliance: SourceComplianceLevel;
  reason: string;
  usable: boolean;
  usageNote?: string;
}

export type ComplianceResult = ComplianceCheckResult;

export const COMPLIANCE_BOUNDARY = {
  compliantSources: [
    "official_contact_page",
    "official_footer",
    "official_about_page",
    "official_homepage",
    "official_service_page",
    "official_quote_page",
    "official_team_page",
    "official_linkedin",
    "official_facebook",
    "official_youtube",
    "industry_directory",
    "association_member",
    "trade_show_exhibitor",
    "chamber_of_commerce",
    "bbb",
    "partner_page",
  ] as ContactSourceType[],

  borderlineSources: [
    "third_party_database",
    "search_result",
    "email_format_inferred",
  ] as ContactSourceType[],

  nonCompliantSources: [] as ContactSourceType[],

  allowedContactTypes: [
    "company main line",
    "public sales inbox",
    "official contact form",
    "public address",
    "industry directory listing",
    "public LinkedIn info",
    "public trade show info",
  ],

  requiresConfidenceLabel: [
    "inferred email address",
    "third-party database info",
    "search-result extraction",
  ],
};

export interface CRMContactOutput {
  company: string;
  company_name?: string;
  domain: string;
  official_website: string;
  primary_phone?: {
    value: string;
    confidence: number;
    sources: string[];
  };
  primary_email?: {
    value: string;
    confidence: number;
    sources: string[];
    note?: string;
  };
  addresses?: Array<{
    value: string;
    confidence: number;
    source: string;
    note?: string;
  }>;
  industry?: string;
  capabilities?: string[];
  recommended_contact?: string;
  recommended_contact_channel: string[];
  lead_quality_score: number;
  data_sources: string[];
  compliance_note: string;
  information_gaps?: string[];
  enriched_at: string;
}
