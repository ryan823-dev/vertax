"use server";

/**
 * Knowledge Sync Actions
 * 
 * 将知识引擎沉淀的认知（Company/Profile/Evidence/Guideline）联动到：
 * - 增长系统：生成 TopicCluster → ContentBrief → ContentDraft
 * - 获客雷达：生成 TargetingSpec → ChannelMap → Discovery Tasks
 * 
 * 所有产物使用 ArtifactVersion.content(JSON) 存储，不新增业务表
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeSkill } from "@/lib/skills/runner";
import { SKILL_NAMES } from "@/lib/skills/names";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";

// ==================== Types ====================

export interface SyncResult {
  success: boolean;
  error?: string;
  versionId?: string;
  taskIds?: string[];
  openQuestions?: string[];
}

export interface MarketingSyncResult extends SyncResult {
  topicClusterVersionId?: string;
}

export interface RadarSyncResult extends SyncResult {
  targetingSpecVersionId?: string;
  channelMapVersionId?: string;
}

// ==================== Session Helper ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== Data Loaders ====================

/**
 * 加载最新 approved 的 CompanyProfile
 */
async function loadCompanyProfile(tenantId: string) {
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
  });
  
  return profile ? {
    companyName: profile.companyName || '',
    companyIntro: profile.companyIntro || '',
    coreProducts: profile.coreProducts as Array<{ name: string; description: string }>,
    techAdvantages: profile.techAdvantages as Array<{ title: string; description: string }>,
    scenarios: profile.scenarios as Array<{ industry: string; scenario: string }>,
    differentiators: profile.differentiators as Array<{ point: string; description: string }>,
    targetIndustries: profile.targetIndustries as string[],
    targetRegions: profile.targetRegions as Array<{ region: string; countries: string[]; rationale: string }> | string[],
    buyerPersonas: profile.buyerPersonas as Array<{ role: string; title: string; concerns: string[] }>,
    painPoints: profile.painPoints as Array<{ pain: string; howWeHelp: string }>,
    buyingTriggers: profile.buyingTriggers as string[],
  } : null;
}

/**
 * 加载 Personas（ICP/Persona/Messaging）
 */
async function loadPersonas(tenantId: string) {
  const personas = await prisma.persona.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  return personas.map(p => ({
    id: p.id,
    name: p.name,
    title: p.title,
    seniority: p.seniority,
    concerns: p.concerns,
    messagingPrefs: p.messagingPrefs,
    evidenceRefs: p.evidenceRefs,
    segmentId: p.segmentId,
  }));
}

/**
 * 加载 Evidence（最近 N 条 approved）
 */
async function loadEvidences(tenantId: string, limit = 20) {
  const evidences = await prisma.evidence.findMany({
    where: { 
      tenantId, 
      deletedAt: null,
      status: 'active',
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      tags: true,
    },
  });
  
  return evidences;
}

/**
 * 加载 BrandGuideline
 */
async function loadGuidelines(tenantId: string) {
  const guidelines = await prisma.brandGuideline.findMany({
    where: { tenantId, isActive: true },
    orderBy: { category: 'asc' },
  });
  
  return guidelines.map(g => ({
    id: g.id,
    category: g.category,
    title: g.title,
    content: g.content,
    examples: g.examples,
  }));
}

/**
 * 加载 ICP Segments
 */
async function loadICPSegments(tenantId: string) {
  const segments = await prisma.iCPSegment.findMany({
    where: { tenantId },
    orderBy: { order: 'asc' },
  });
  
  return segments.map(s => ({
    id: s.id,
    name: s.name,
    industry: s.industry,
    companySize: s.companySize,
    regions: s.regions,
    description: s.description,
    criteria: s.criteria,
  }));
}

// ==================== Sync to Marketing ====================

/**
 * 从知识引擎同步到增长系统
 * 
 * 流程：
 * 1. 加载 CompanyProfile + Personas + Evidence
 * 2. 调用 marketing.buildTopicCluster Skill
 * 3. 保存为 ArtifactVersion(entityType=TopicCluster)
 * 4. 返回 topicClusterVersionId
 */
export async function syncMarketingFromKnowledge(options?: {
  focusSegment?: string;
  evidenceIds?: string[];
}): Promise<MarketingSyncResult> {
  const session = await getSession();
  const { tenantId, id: userId } = session.user;
  
  try {
    // 1. 加载知识上下文
    const [companyProfile, personas, evidences, guidelines] = await Promise.all([
      loadCompanyProfile(tenantId),
      loadPersonas(tenantId),
      options?.evidenceIds?.length 
        ? prisma.evidence.findMany({
            where: { id: { in: options.evidenceIds }, tenantId },
            select: { id: true, title: true, content: true, type: true, tags: true },
          })
        : loadEvidences(tenantId),
      loadGuidelines(tenantId),
    ]);
    
    if (!companyProfile) {
      return {
        success: false,
        error: '请先完善企业认知（Company Profile）',
      };
    }
    
    // 2. 构建 Skill 输入
    const input = {
      profiles: {
        personas: personas,
        guidelines: guidelines,
      },
      advantages: companyProfile.techAdvantages.map(a => `${a.title}: ${a.description}`),
      focusSegment: options?.focusSegment,
    };
    
    // 3. 调用 TopicCluster Skill
    const result = await executeSkill(
      SKILL_NAMES.MARKETING_BUILD_TOPIC_CLUSTER,
      {
        input,
        entityType: 'TopicCluster',
        entityId: `topic-cluster-${tenantId}-${Date.now()}`,
        useCompanyProfile: true,
        evidenceIds: evidences.map(e => e.id),
        mode: 'generate',
      },
      { tenantId, userId }
    );
    
    if (!result.ok) {
      return {
        success: false,
        error: '生成 TopicCluster 失败',
      };
    }
    
    // 4. 记录 Activity
    await logActivity({
      tenantId,
      userId,
      action: ACTIVITY_ACTIONS.SKILL_EXECUTED,
      entityType: 'TopicCluster',
      entityId: result.versionId || '',
      eventCategory: EVENT_CATEGORIES.MARKETING,
      severity: 'info',
      context: {
        skillName: SKILL_NAMES.MARKETING_BUILD_TOPIC_CLUSTER,
        evidenceCount: evidences.length,
        openQuestions: result.openQuestions?.length || 0,
      },
    });
    
    return {
      success: true,
      topicClusterVersionId: result.versionId,
      taskIds: result.taskIds,
      openQuestions: result.openQuestions,
    };
    
  } catch (error) {
    console.error('[Sync] Marketing sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    };
  }
}

// ==================== Sync to Radar ====================

/**
 * 从知识引擎同步到获客雷达
 * 
 * 流程：
 * 1. 加载 CompanyProfile + ICPSegments + Personas + Evidence
 * 2. 调用 radar.buildTargetingSpec Skill → ArtifactVersion
 * 3. 调用 radar.buildChannelMap Skill → ArtifactVersion
 * 4. 返回 versionIds
 */
export async function syncRadarFromKnowledge(options?: {
  focusIndustries?: string[];
  focusRegions?: string[];
  evidenceIds?: string[];
}): Promise<RadarSyncResult> {
  const session = await getSession();
  const { tenantId, id: userId } = session.user;
  
  try {
    // 1. 加载知识上下文
    const [companyProfile, _icpSegments, personas, evidences] = await Promise.all([
      loadCompanyProfile(tenantId),
      loadICPSegments(tenantId),
      loadPersonas(tenantId),
      options?.evidenceIds?.length 
        ? prisma.evidence.findMany({
            where: { id: { in: options.evidenceIds }, tenantId },
            select: { id: true, title: true, content: true, type: true, tags: true },
          })
        : loadEvidences(tenantId),
    ]);
    
    if (!companyProfile) {
      return {
        success: false,
        error: '请先完善企业认知（Company Profile）',
      };
    }
    
    const evidenceIds = evidences.map(e => e.id);
    
    // 2. 调用 TargetingSpec Skill
    const targetingResult = await executeSkill(
      SKILL_NAMES.RADAR_BUILD_TARGETING_SPEC,
      {
        input: {
          icpName: companyProfile.companyName ? `${companyProfile.companyName} ICP` : 'Target ICP',
          focusIndustries: options?.focusIndustries || companyProfile.targetIndustries,
          focusRegions: options?.focusRegions || companyProfile.targetRegions,
        },
        entityType: 'TargetingSpec',
        entityId: `targeting-spec-${tenantId}-${Date.now()}`,
        useCompanyProfile: true,
        evidenceIds,
        mode: 'generate',
      },
      { tenantId, userId }
    );
    
    if (!targetingResult.ok) {
      return {
        success: false,
        error: '生成 TargetingSpec 失败',
      };
    }
    
    // 3. 调用 ChannelMap Skill（基于 TargetingSpec）
    const channelMapResult = await executeSkill(
      SKILL_NAMES.RADAR_BUILD_CHANNEL_MAP,
      {
        input: {
          targetingSpec: targetingResult.output,
          personaName: personas[0]?.name || 'Primary Persona',
          focusRegions: options?.focusRegions || companyProfile.targetRegions,
        },
        entityType: 'ChannelMap',
        entityId: `channel-map-${tenantId}-${Date.now()}`,
        useCompanyProfile: false,
        evidenceIds,
        mode: 'generate',
      },
      { tenantId, userId }
    );
    
    if (!channelMapResult.ok) {
      return {
        success: false,
        error: '生成 ChannelMap 失败',
        targetingSpecVersionId: targetingResult.versionId,
      };
    }
    
    // 4. 记录 Activity
    await logActivity({
      tenantId,
      userId,
      action: ACTIVITY_ACTIONS.SKILL_EXECUTED,
      entityType: 'RadarSync',
      entityId: targetingResult.versionId || '',
      eventCategory: EVENT_CATEGORIES.RADAR,
      severity: 'info',
      context: {
        targetingSpecVersionId: targetingResult.versionId,
        channelMapVersionId: channelMapResult.versionId,
        evidenceCount: evidences.length,
      },
    });
    
    // 5. 合并 openQuestions 和 taskIds
    const allOpenQuestions = [
      ...(targetingResult.openQuestions || []),
      ...(channelMapResult.openQuestions || []),
    ];
    const allTaskIds = [
      ...(targetingResult.taskIds || []),
      ...(channelMapResult.taskIds || []),
    ];
    
    return {
      success: true,
      targetingSpecVersionId: targetingResult.versionId,
      channelMapVersionId: channelMapResult.versionId,
      taskIds: allTaskIds,
      openQuestions: allOpenQuestions,
    };
    
  } catch (error) {
    console.error('[Sync] Radar sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    };
  }
}

// ==================== Query Actions ====================

/**
 * 获取最新的 TopicCluster 版本
 */
export async function getLatestTopicCluster() {
  const session = await getSession();
  
  const version = await prisma.artifactVersion.findFirst({
    where: {
      tenantId: session.user.tenantId,
      entityType: 'TopicCluster',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
    },
  });
  
  return version ? {
    id: version.id,
    entityId: version.entityId,
    version: version.version,
    status: version.status,
    content: version.content as Record<string, unknown>,
    meta: version.meta as Record<string, unknown>,
    createdAt: version.createdAt,
    createdBy: version.createdBy.name,
  } : null;
}

/**
 * 获取最新的 TargetingSpec 版本
 */
export async function getLatestTargetingSpec() {
  const session = await getSession();
  
  const version = await prisma.artifactVersion.findFirst({
    where: {
      tenantId: session.user.tenantId,
      entityType: 'TargetingSpec',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
    },
  });
  
  return version ? {
    id: version.id,
    entityId: version.entityId,
    version: version.version,
    status: version.status,
    content: version.content as Record<string, unknown>,
    meta: version.meta as Record<string, unknown>,
    createdAt: version.createdAt,
    createdBy: version.createdBy.name,
  } : null;
}

/**
 * 获取最新的 ChannelMap 版本
 */
export async function getLatestChannelMap() {
  const session = await getSession();
  
  const version = await prisma.artifactVersion.findFirst({
    where: {
      tenantId: session.user.tenantId,
      entityType: 'ChannelMap',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
    },
  });
  
  return version ? {
    id: version.id,
    entityId: version.entityId,
    version: version.version,
    status: version.status,
    content: version.content as Record<string, unknown>,
    meta: version.meta as Record<string, unknown>,
    createdAt: version.createdAt,
    createdBy: version.createdBy.name,
  } : null;
}

/**
 * 获取 ArtifactVersion 历史列表
 */
export async function getArtifactVersionHistory(entityType: string, limit = 10) {
  const session = await getSession();
  
  const versions = await prisma.artifactVersion.findMany({
    where: {
      tenantId: session.user.tenantId,
      entityType,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      createdBy: { select: { name: true } },
    },
  });
  
  return versions.map(v => ({
    id: v.id,
    entityId: v.entityId,
    version: v.version,
    status: v.status,
    meta: v.meta as Record<string, unknown>,
    createdAt: v.createdAt,
    createdBy: v.createdBy.name,
  }));
}
