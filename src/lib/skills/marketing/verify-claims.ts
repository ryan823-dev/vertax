import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  contentPiece: z.record(z.string(), z.unknown()).describe('待校验的内容'),
});

const missingProofSchema = z.object({
  claim: z.string(),
  locationHint: z.string(),
  whyRisky: z.string(),
  suggestedEvidenceType: z.array(z.string()),
  questionToAskClient: z.string(),
});

const okClaimSchema = z.object({
  claim: z.string(),
  evidenceId: z.string(),
});

const outputSchema = z.object({
  missingProof: z.array(missingProofSchema),
  okClaims: z.array(okClaimSchema),
});

// ==================== Skill Definition ====================

export const verifyClaimsSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.MARKETING_VERIFY_CLAIMS,
  displayName: '校验主张证据',
  engine: 'marketing',
  outputEntityType: 'ClaimsVerification',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.MARKETING_BUILD_PUBLISH_PACK,
  ],
  model: 'qwen-plus',
  temperature: 0.2,
  
  systemPrompt: `你是事实核查官。检查contentPiece中所有"承诺/对比/效果/能力"类表述，判断是否有Evidence支撑。

要求：
1. 输出缺证据主张列表、建议补充的证据类型或需要向客户追问的问题
2. 不得编造证据
3. 对每个缺证据的主张，说明为什么有风险
4. 同时列出已有证据支撑的主张（okClaims）`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, evidences } = ctx;
    
    let prompt = '';
    
    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }
    
    prompt += `
=== 待校验的内容 ===
${JSON.stringify(input.contentPiece, null, 2)}

=== 任务要求 ===
请检查以上内容中的所有主张，判断是否有证据支撑。输出 missingProof（缺证据的主张）和 okClaims（有证据的主张）。`;
    
    return prompt;
  },
};
