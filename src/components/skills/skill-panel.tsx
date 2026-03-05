"use client";

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Target,
  Map,
  Search,
  CheckSquare,
  Users,
  MessageSquare,
  Calendar,
  FileText,
  BookOpen,
  PenTool,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { getAvailableSkills } from '@/actions/skills';
import { SKILL_NAMES } from '@/lib/skills/registry';
import { SkillTrigger } from './skill-trigger';
import type { SkillEngine } from '@/lib/skills/types';

// ==================== Types ====================

interface SkillPanelProps {
  engine: SkillEngine;
  entityType: string;
  entityId: string;
  input?: Record<string, unknown>;
  evidenceIds?: string[];
  onSkillComplete?: (skillName: string, versionId: string) => void;
  className?: string;
}

interface SkillMeta {
  name: string;
  displayName: string;
  icon: React.ElementType;
  description: string;
}

// ==================== Skill Metadata ====================

const SKILL_META: Record<string, SkillMeta> = {
  [SKILL_NAMES.RADAR_BUILD_TARGETING_SPEC]: {
    name: SKILL_NAMES.RADAR_BUILD_TARGETING_SPEC,
    displayName: '生成 Targeting Spec',
    icon: Target,
    description: '根据企业画像生成可执行的客户筛选规则',
  },
  [SKILL_NAMES.RADAR_BUILD_CHANNEL_MAP]: {
    name: SKILL_NAMES.RADAR_BUILD_CHANNEL_MAP,
    displayName: '生成渠道地图',
    icon: Map,
    description: '规划客户发现渠道和方法',
  },
  [SKILL_NAMES.RADAR_PLAN_ACCOUNT_DISCOVERY]: {
    name: SKILL_NAMES.RADAR_PLAN_ACCOUNT_DISCOVERY,
    displayName: '规划发现任务',
    icon: Search,
    description: '生成可执行的公司发现任务清单',
  },
  [SKILL_NAMES.RADAR_QUALIFY_ACCOUNTS]: {
    name: SKILL_NAMES.RADAR_QUALIFY_ACCOUNTS,
    displayName: '合格化名单',
    icon: CheckSquare,
    description: '审核和分层目标公司列表',
  },
  [SKILL_NAMES.RADAR_BUILD_CONTACT_ROLE_MAP]: {
    name: SKILL_NAMES.RADAR_BUILD_CONTACT_ROLE_MAP,
    displayName: '联系人角色图',
    icon: Users,
    description: '确定应该联系的关键角色',
  },
  [SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK]: {
    name: SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK,
    displayName: '生成外联包',
    icon: MessageSquare,
    description: '生成邮件、消息模板和跟进剧本',
  },
  [SKILL_NAMES.RADAR_GENERATE_WEEKLY_CADENCE]: {
    name: SKILL_NAMES.RADAR_GENERATE_WEEKLY_CADENCE,
    displayName: '生成周计划',
    icon: Calendar,
    description: '规划本周研究和外联节奏',
  },
  [SKILL_NAMES.MARKETING_BUILD_TOPIC_CLUSTER]: {
    name: SKILL_NAMES.MARKETING_BUILD_TOPIC_CLUSTER,
    displayName: '生成主题集群',
    icon: BookOpen,
    description: '规划内容主题和 AEO 问题集',
  },
  [SKILL_NAMES.MARKETING_GENERATE_CONTENT_BRIEF]: {
    name: SKILL_NAMES.MARKETING_GENERATE_CONTENT_BRIEF,
    displayName: '生成内容简报',
    icon: FileText,
    description: '创建可执行的内容规划文档',
  },
  [SKILL_NAMES.MARKETING_GENERATE_CONTENT_DRAFT]: {
    name: SKILL_NAMES.MARKETING_GENERATE_CONTENT_DRAFT,
    displayName: '生成内容初稿',
    icon: PenTool,
    description: '基于简报生成 SEO 优化的内容',
  },
  [SKILL_NAMES.MARKETING_VERIFY_CLAIMS]: {
    name: SKILL_NAMES.MARKETING_VERIFY_CLAIMS,
    displayName: '校验主张证据',
    icon: ShieldCheck,
    description: '检查内容中的主张是否有证据支撑',
  },
  [SKILL_NAMES.MARKETING_BUILD_PUBLISH_PACK]: {
    name: SKILL_NAMES.MARKETING_BUILD_PUBLISH_PACK,
    displayName: '生成发布包',
    icon: Package,
    description: '打包内容准备发布',
  },
};

// ==================== Component ====================

export function SkillPanel({
  engine,
  entityType,
  entityId,
  input = {},
  evidenceIds,
  onSkillComplete,
  className,
}: SkillPanelProps) {
  const [skills, setSkills] = useState<Array<{
    name: string;
    displayName: string;
    outputEntityType: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSkills() {
      try {
        const available = await getAvailableSkills(engine);
        setSkills(available);
      } catch (err) {
        console.error('Failed to load skills:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSkills();
  }, [engine]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#D4AF37]" />
        <h3 className="font-bold text-[#0B1B2B]">
          AI Skills
        </h3>
        <span className="text-xs text-slate-400">
          {engine === 'radar' ? '获客雷达' : '营销系统'}
        </span>
      </div>

      <div className="space-y-2">
        {skills.map((skill) => {
          const meta = SKILL_META[skill.name];
          const Icon = meta?.icon || Sparkles;

          return (
            <div
              key={skill.name}
              className="flex items-center justify-between p-3 bg-[#F7F3EA] rounded-lg hover:bg-[#EDE5D4] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0B1B2B]">
                    {meta?.displayName || skill.displayName}
                  </p>
                  {meta?.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {meta.description}
                    </p>
                  )}
                </div>
              </div>

              <SkillTrigger
                skillName={skill.name}
                displayName="执行"
                entityType={entityType}
                entityId={entityId}
                input={input}
                evidenceIds={evidenceIds}
                onSuccess={(result) => {
                  onSkillComplete?.(skill.name, result.versionId);
                }}
                variant="ghost"
                size="sm"
                className="text-[#D4AF37] hover:text-[#C5A030] hover:bg-[#D4AF37]/10"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
