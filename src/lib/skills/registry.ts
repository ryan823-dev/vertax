import type { SkillDefinition, SkillEngine } from './types';

// ==================== Skill Registry ====================

const skillRegistry = new Map<string, SkillDefinition>();

/**
 * 注册一个 Skill
 */
export function registerSkill(skill: SkillDefinition): void {
  if (skillRegistry.has(skill.name)) {
    console.warn(`Skill "${skill.name}" is already registered, overwriting...`);
  }
  skillRegistry.set(skill.name, skill);
}

/**
 * 获取指定 Skill
 */
export function getSkill(name: string): SkillDefinition | null {
  return skillRegistry.get(name) || null;
}

/**
 * 列出所有 Skills（可按引擎过滤）
 */
export function listSkills(engine?: SkillEngine): SkillDefinition[] {
  const skills = Array.from(skillRegistry.values());
  if (engine) {
    return skills.filter(s => s.engine === engine);
  }
  return skills;
}

/**
 * 检查 Skill 是否存在
 */
export function hasSkill(name: string): boolean {
  return skillRegistry.has(name);
}

/**
 * 获取所有已注册的 Skill 名称
 */
export function getSkillNames(): string[] {
  return Array.from(skillRegistry.keys());
}

// ==================== Skill Names (Type-Safe) ====================

export const SKILL_NAMES = {
  // 获客雷达
  RADAR_BUILD_TARGETING_SPEC: 'radar.buildTargetingSpec',
  RADAR_BUILD_CHANNEL_MAP: 'radar.buildChannelMap',
  RADAR_PLAN_ACCOUNT_DISCOVERY: 'radar.planAccountDiscovery',
  RADAR_QUALIFY_ACCOUNTS: 'radar.qualifyAccounts',
  RADAR_BUILD_CONTACT_ROLE_MAP: 'radar.buildContactRoleMap',
  RADAR_GENERATE_OUTREACH_PACK: 'radar.generateOutreachPack',
  RADAR_GENERATE_WEEKLY_CADENCE: 'radar.generateWeeklyCadence',
  RADAR_GENERATE_PROSPECT_DOSSIER: 'radar.generateProspectDossier',
  
  // 增长系统
  MARKETING_BUILD_TOPIC_CLUSTER: 'marketing.buildTopicCluster',
  MARKETING_GENERATE_CONTENT_BRIEF: 'marketing.generateContentBrief',
  MARKETING_GENERATE_CONTENT_DRAFT: 'marketing.generateContentDraft',
  MARKETING_VERIFY_CLAIMS: 'marketing.verifyClaims',
  MARKETING_BUILD_PUBLISH_PACK: 'marketing.buildPublishPack',
  MARKETING_FIX_SEO_ISSUES: 'marketing.fixSeoIssues',
  MARKETING_OPTIMIZE_GEO: 'marketing.optimizeGeo',
} as const;

export type SkillName = typeof SKILL_NAMES[keyof typeof SKILL_NAMES];

// ==================== Auto-Registration ====================

// 延迟导入以避免循环依赖
let registered = false;

export async function ensureSkillsRegistered(): Promise<void> {
  if (registered) return;
  
  console.log('[Skills] Starting dynamic import...');
  
  // 动态导入所有 Skills
  const [radarSkills, marketingSkills] = await Promise.all([
    import('./radar').then((mod) => {
      console.log('[Skills] radar module loaded, exports:', Object.keys(mod));
      return mod as Record<string, unknown>;
    }).catch((err) => {
      console.error('[Skills] Failed to load radar skills:', err);
      return {} as Record<string, unknown>;
    }),
    import('./marketing').then((mod) => {
      console.log('[Skills] marketing module loaded, exports:', Object.keys(mod));
      return mod as Record<string, unknown>;
    }).catch((err) => {
      console.error('[Skills] Failed to load marketing skills:', err);
      return {} as Record<string, unknown>;
    }),
  ]);

  // 注册雷达 Skills
  const radarCount = Object.values(radarSkills).filter(skill => {
    if (skill && typeof skill === 'object' && 'name' in skill) {
      registerSkill(skill as SkillDefinition);
      return true;
    }
    return false;
  }).length;
  console.log(`[Skills] Registered ${radarCount} radar skills`);

  // 注册营销 Skills
  const marketingCount = Object.values(marketingSkills).filter(skill => {
    if (skill && typeof skill === 'object' && 'name' in skill) {
      registerSkill(skill as SkillDefinition);
      return true;
    }
    return false;
  }).length;
  console.log(`[Skills] Registered ${marketingCount} marketing skills`);
  
  registered = true;
  console.log(`[Skills] Total registered: ${skillRegistry.size} skills`);
}

// ==================== Debug Helpers ====================

export function getRegistryStats(): {
  total: number;
  byEngine: Record<SkillEngine, number>;
} {
  const skills = Array.from(skillRegistry.values());
  return {
    total: skills.length,
    byEngine: {
      radar: skills.filter(s => s.engine === 'radar').length,
      marketing: skills.filter(s => s.engine === 'marketing').length,
    },
  };
}
