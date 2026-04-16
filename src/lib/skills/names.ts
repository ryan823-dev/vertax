export const SKILL_NAMES = {
  // Radar
  RADAR_BUILD_TARGETING_SPEC: 'radar.buildTargetingSpec',
  RADAR_BUILD_CHANNEL_MAP: 'radar.buildChannelMap',
  RADAR_PLAN_ACCOUNT_DISCOVERY: 'radar.planAccountDiscovery',
  RADAR_QUALIFY_ACCOUNTS: 'radar.qualifyAccounts',
  RADAR_BUILD_CONTACT_ROLE_MAP: 'radar.buildContactRoleMap',
  RADAR_GENERATE_OUTREACH_PACK: 'radar.generateOutreachPack',
  RADAR_GENERATE_WEEKLY_CADENCE: 'radar.generateWeeklyCadence',
  RADAR_GENERATE_PROSPECT_DOSSIER: 'radar.generateProspectDossier',

  // Marketing
  MARKETING_BUILD_TOPIC_CLUSTER: 'marketing.buildTopicCluster',
  MARKETING_GENERATE_CONTENT_BRIEF: 'marketing.generateContentBrief',
  MARKETING_GENERATE_CONTENT_DRAFT: 'marketing.generateContentDraft',
  MARKETING_VERIFY_CLAIMS: 'marketing.verifyClaims',
  MARKETING_BUILD_PUBLISH_PACK: 'marketing.buildPublishPack',
  MARKETING_FIX_SEO_ISSUES: 'marketing.fixSeoIssues',
  MARKETING_OPTIMIZE_GEO: 'marketing.optimizeGeo',
} as const;

export type SkillName = typeof SKILL_NAMES[keyof typeof SKILL_NAMES];
