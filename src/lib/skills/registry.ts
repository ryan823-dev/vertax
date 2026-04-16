import type { SkillDefinition, SkillEngine } from './types';

export { SKILL_NAMES } from './names';
export type { SkillName } from './names';

const skillRegistry = new Map<string, SkillDefinition>();

export function registerSkill(skill: SkillDefinition): void {
  if (skillRegistry.has(skill.name)) {
    console.warn(`Skill "${skill.name}" is already registered, overwriting...`);
  }

  skillRegistry.set(skill.name, skill);
}

export function getSkill(name: string): SkillDefinition | null {
  return skillRegistry.get(name) || null;
}

export function listSkills(engine?: SkillEngine): SkillDefinition[] {
  const skills = Array.from(skillRegistry.values());
  return engine ? skills.filter((skill) => skill.engine === engine) : skills;
}

export function hasSkill(name: string): boolean {
  return skillRegistry.has(name);
}

export function getSkillNames(): string[] {
  return Array.from(skillRegistry.keys());
}

let registered = false;

export async function ensureSkillsRegistered(): Promise<void> {
  if (registered) {
    return;
  }

  console.log('[Skills] Starting dynamic import...');

  const [radarSkills, marketingSkills] = await Promise.all([
    import('./radar/index')
      .then((mod) => {
        console.log('[Skills] radar module loaded, exports:', Object.keys(mod));
        return mod as Record<string, unknown>;
      })
      .catch((error) => {
        console.error('[Skills] Failed to load radar skills:', error);
        return {} as Record<string, unknown>;
      }),
    import('./marketing/index')
      .then((mod) => {
        console.log('[Skills] marketing module loaded, exports:', Object.keys(mod));
        return mod as Record<string, unknown>;
      })
      .catch((error) => {
        console.error('[Skills] Failed to load marketing skills:', error);
        return {} as Record<string, unknown>;
      }),
  ]);

  const radarCount = Object.values(radarSkills).filter((skill) => {
    if (skill && typeof skill === 'object' && 'name' in skill) {
      registerSkill(skill as SkillDefinition);
      return true;
    }

    return false;
  }).length;
  console.log(`[Skills] Registered ${radarCount} radar skills`);

  const marketingCount = Object.values(marketingSkills).filter((skill) => {
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

export function getRegistryStats(): {
  total: number;
  byEngine: Record<SkillEngine, number>;
} {
  const skills = Array.from(skillRegistry.values());

  return {
    total: skills.length,
    byEngine: {
      radar: skills.filter((skill) => skill.engine === 'radar').length,
      marketing: skills.filter((skill) => skill.engine === 'marketing').length,
    },
  };
}
