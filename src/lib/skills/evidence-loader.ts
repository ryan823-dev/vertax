import { prisma } from '@/lib/prisma';
import type { EvidenceContext } from './types';

/**
 * 加载 Evidence 上下文用于 Prompt 注入
 */
export async function loadEvidenceContext(
  tenantId: string,
  evidenceIds: string[]
): Promise<EvidenceContext[]> {
  if (!evidenceIds.length) return [];
  
  const evidences = await prisma.evidence.findMany({
    where: {
      tenantId,
      id: { in: evidenceIds },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
    },
  });
  
  // 按 evidenceIds 的顺序排列并分配标签
  const result: EvidenceContext[] = [];
  evidenceIds.forEach((id, index) => {
    const evidence = evidences.find(e => e.id === id);
    if (evidence) {
      result.push({
        id: evidence.id,
        label: `E${index + 1}`,
        title: evidence.title,
        content: evidence.content,
        type: evidence.type,
      });
    }
  });
  return result;
}

/**
 * 根据实体类型和 ID 自动查找相关 Evidence
 */
export async function findRelatedEvidences(
  tenantId: string,
  entityType: string,
  entityId: string,
  limit: number = 10
): Promise<string[]> {
  // 根据实体类型决定查找策略
  switch (entityType) {
    case 'ContentBrief': {
      // 从 Brief 中获取关联的 evidenceIds
      const brief = await prisma.contentBrief.findUnique({
        where: { id: entityId },
        select: { evidenceIds: true },
      });
      return (brief?.evidenceIds as string[]) || [];
    }
    
    case 'CompanyProfile': {
      // 获取最近的活跃 Evidence
      const evidences = await prisma.evidence.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true },
      });
      return evidences.map(e => e.id);
    }
    
    default:
      return [];
  }
}

/**
 * 格式化 Evidence 为 Prompt 文本
 */
export function formatEvidenceForPrompt(evidences: EvidenceContext[]): string {
  if (!evidences.length) return '';
  
  const lines = evidences.map(e => {
    const typeLabel = getEvidenceTypeLabel(e.type);
    return `[${e.label}] ${e.title}（类型：${typeLabel}）
内容：${truncateContent(e.content, 500)}
---`;
  });
  
  return `
=== 可引用的证据 ===
${lines.join('\n')}

注意：引用证据时请使用 [E1]、[E2] 等格式标注，并将对应的证据 ID 加入 evidenceIds 数组。
`;
}

/**
 * 格式化企业画像为 Prompt 文本
 */
export function formatCompanyProfileForPrompt(profile: {
  companyName: string;
  companyIntro: string;
  coreProducts: Array<{ name: string; description: string }>;
  techAdvantages: Array<{ title: string; description: string }>;
  differentiators: Array<{ point: string; description: string }>;
  targetIndustries: string[];
  targetRegions: Array<{ region: string; countries: string[]; rationale: string }> | string[];
  buyerPersonas: Array<{ role: string; title: string; concerns: string[] }>;
  painPoints: Array<{ pain: string; howWeHelp: string }>;
}): string {
  return `
=== 企业认知 ===
企业名称：${profile.companyName}
企业简介：${profile.companyIntro}

核心产品：
${profile.coreProducts.map(p => `- ${p.name}：${p.description}`).join('\n')}

技术优势：
${profile.techAdvantages.map(a => `- ${a.title}：${a.description}`).join('\n')}

差异化优势：
${profile.differentiators.map(d => `- ${d.point}：${d.description}`).join('\n')}

目标行业：${profile.targetIndustries.join('、')}
海外目标市场：${profile.targetRegions.map(r => typeof r === 'string' ? r : `${r.region}(${r.countries.join('/')}): ${r.rationale}`).join('; ')}

买家角色：
${profile.buyerPersonas.map(p => `- ${p.role}（${p.title}）：关注 ${p.concerns.join('、')}`).join('\n')}

客户痛点：
${profile.painPoints.map(p => `- ${p.pain} → ${p.howWeHelp}`).join('\n')}
`;
}

// ==================== Helper Functions ====================

function getEvidenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    claim: '产品主张',
    statistic: '数据统计',
    testimonial: '客户证言',
    case_study: '案例研究',
    certification: '资质认证',
  };
  return labels[type] || type;
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}
