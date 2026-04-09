"use server";

import { auth } from "@/lib/auth";
import { executeSkill as runSkill, executeSkillChain } from "@/lib/skills/runner";
import { getSkill, listSkills, ensureSkillsRegistered } from "@/lib/skills/registry";
import type { SkillRequest, SkillResponse, SkillEngine } from "@/lib/skills/types";

// ==================== Session Helper ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== Main Actions ====================

/**
 * 执行单个 Skill
 */
export async function executeSkill(
  skillName: string,
  request: SkillRequest
): Promise<SkillResponse> {
  const session = await getSession();
  
  return runSkill(skillName, request, {
    tenantId: session.user.tenantId,
    userId: session.user.id,
  });
}

/**
 * 执行 Skill 链（串行）
 */
export async function executeSkills(
  skillNames: string[],
  initialRequest: SkillRequest
): Promise<SkillResponse[]> {
  const session = await getSession();
  
  return executeSkillChain(skillNames, initialRequest, {
    tenantId: session.user.tenantId,
    userId: session.user.id,
  });
}

// ==================== Query Actions ====================

/**
 * 获取可用 Skills 列表
 */
export async function getAvailableSkills(engine?: SkillEngine): Promise<Array<{
  name: string;
  displayName: string;
  engine: SkillEngine;
  outputEntityType: string;
  suggestedNextSkills: string[];
}>> {
  await getSession(); // 认证
  await ensureSkillsRegistered();
  
  const skills = listSkills(engine);
  
  return skills.map(s => ({
    name: s.name,
    displayName: s.displayName,
    engine: s.engine,
    outputEntityType: s.outputEntityType,
    suggestedNextSkills: s.suggestedNextSkills,
  }));
}

/**
 * 获取单个 Skill 信息
 */
export async function getSkillInfo(skillName: string): Promise<{
  name: string;
  displayName: string;
  engine: SkillEngine;
  outputEntityType: string;
  suggestedNextSkills: string[];
} | null> {
  await getSession();
  await ensureSkillsRegistered();
  
  const skill = getSkill(skillName);
  if (!skill) return null;
  
  return {
    name: skill.name,
    displayName: skill.displayName,
    engine: skill.engine,
    outputEntityType: skill.outputEntityType,
    suggestedNextSkills: skill.suggestedNextSkills,
  };
}

// ！！！注意！！！
// executeSkillStream 已移动到 @/lib/skills/client.ts
// 以解决 Next.js Server Action 不支持流式返回的问题
// 这样在客户端组件中直接调用 fetch 相对路径会更稳定且符合 SSE 标准
