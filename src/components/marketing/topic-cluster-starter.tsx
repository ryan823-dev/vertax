"use client";

/**
 * 主题集群启动向导
 * 
 * 三条启动路径：
 * 1. 从知识引擎同步（推荐）
 * 2. 手动快速起步
 * 3. 导入参考材料
 */

import { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  BookOpen, 
  Upload,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Globe,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { syncMarketingFromKnowledge } from '@/actions/sync';
import { executeSkill } from '@/actions/skills';
import { toast } from 'sonner';
import type { GrowthPipelineCounts } from '@/lib/marketing/growth-pipeline';

// ============================================
// 类型定义
// ============================================

/** 当 pipeline 状态加载失败时使用的空白默认值 */
const EMPTY_COUNTS: GrowthPipelineCounts = {
  topicClusterExists: false,
  topicClusterVersion: 0,
  topicClusterUpdatedAt: null,
  clustersCount: 0,
  contentMapCount: 0,
  briefsTotal: 0,
  briefsDraft: 0,
  briefsReady: 0,
  briefsInProgress: 0,
  briefsDone: 0,
  draftsTotal: 0,
  draftsPublished: 0,
  draftsPending: 0,
  evidenceCount: 0,
  missingProofCount: 0,
  publishPacksTotal: 0,
  publishPacksPending: 0,
  publishPacksPublished: 0,
  knowledgeCompleteness: 0,
  hasCompanyProfile: false,
  hasPersonas: false,
  hasEvidence: false,
  lastUpdatedAt: null,
};

interface StarterProps {
  counts?: GrowthPipelineCounts | null;
  onSuccess: () => void;
}

type StarterPath = 'sync' | 'manual' | 'import' | null;

// ============================================
// 主组件
// ============================================

export function TopicClusterStarter({ counts: countsProp, onSuccess }: StarterProps) {
  const counts = countsProp ?? EMPTY_COUNTS;
  const [selectedPath, setSelectedPath] = useState<StarterPath>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 手动输入状态
  const [manualKeywords, setManualKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [customerType, setCustomerType] = useState('');
  
  // 导入状态
  const [importText, setImportText] = useState('');

  // 知识引擎状态
  const canSyncFromKnowledge = counts.hasCompanyProfile || counts.hasEvidence;

  // 路径 1: 从知识引擎同步
  const handleSyncFromKnowledge = async () => {
    setIsProcessing(true);
    try {
      const result = await syncMarketingFromKnowledge();
      if (result.success) {
        toast.success('主题集群已生成', {
          description: '基于知识引擎数据自动生成了内容规划',
        });
        onSuccess();
      } else {
        toast.error('生成失败', { description: result.error });
      }
    } catch (err) {
      toast.error('生成失败', { 
        description: err instanceof Error ? err.message : '未知错误' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 路径 2: 手动快速起步
  const handleManualStart = async () => {
    if (manualKeywords.length === 0) {
      toast.error('请至少输入一个产品关键词');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await executeSkill('marketing.buildTopicCluster', {
        input: {
          keywords: manualKeywords,
          targetCountries: targetCountries.length > 0 ? targetCountries : undefined,
          customerType: customerType || undefined,
          source: 'manual_input',
        },
        entityType: 'TopicCluster',
        entityId: `topic-cluster-manual-${Date.now()}`,
        useCompanyProfile: false,
        evidenceIds: [],
        mode: 'generate',
      });
      
      if (result.ok) {
        toast.success('主题集群已生成', {
          description: '基于您输入的关键词生成了内容规划',
        });
        onSuccess();
      } else {
        toast.error('生成失败', { description: '请稍后重试' });
      }
    } catch (err) {
      toast.error('生成失败', { 
        description: err instanceof Error ? err.message : '未知错误' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 路径 3: 导入参考材料
  const handleImportStart = async () => {
    if (!importText.trim()) {
      toast.error('请输入参考材料');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await executeSkill('marketing.buildTopicCluster', {
        input: {
          referenceText: importText,
          source: 'user_import',
          assumptions: ['内容基于用户提供的参考材料生成'],
        },
        entityType: 'TopicCluster',
        entityId: `topic-cluster-import-${Date.now()}`,
        useCompanyProfile: false,
        evidenceIds: [],
        mode: 'generate',
      });
      
      if (result.ok) {
        toast.success('主题集群已生成', {
          description: '基于您提供的参考材料生成了内容规划',
        });
        onSuccess();
      } else {
        toast.error('生成失败', { description: '请稍后重试' });
      }
    } catch (err) {
      toast.error('生成失败', { 
        description: err instanceof Error ? err.message : '未知错误' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 添加关键词
  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !manualKeywords.includes(kw) && manualKeywords.length < 10) {
      setManualKeywords([...manualKeywords, kw]);
      setNewKeyword('');
    }
  };

  // 移除关键词
  const removeKeyword = (kw: string) => {
    setManualKeywords(manualKeywords.filter(k => k !== kw));
  };

  // 常用目标国家
  const COMMON_COUNTRIES = ['US', 'DE', 'GB', 'JP', 'AU', 'FR', 'CA'];
  const COUNTRY_NAMES: Record<string, string> = {
    US: '美国', DE: '德国', GB: '英国', JP: '日本', AU: '澳大利亚', FR: '法国', CA: '加拿大',
  };

  // 切换国家
  const toggleCountry = (code: string) => {
    setTargetCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7E0D3] p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/70 flex items-center justify-center mx-auto mb-4">
          <Layers size={28} className="text-[#0B1B2B]" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1B2B] mb-2">启动内容增长</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          选择一种方式开始生成主题集群，为 TOFU → MOFU → BOFU 全漏斗内容规划
        </p>
      </div>

      {/* 三条路径卡片 */}
      {selectedPath === null && (
        <div className="grid grid-cols-3 gap-4">
          {/* 路径 1: 从知识引擎同步 */}
          <button
            onClick={() => setSelectedPath('sync')}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              canSyncFromKnowledge 
                ? 'border-[#C7A56A] bg-[#F7F3EA] hover:shadow-md' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${canSyncFromKnowledge ? 'bg-[#C7A56A]/20' : 'bg-slate-100'}`}>
                <Sparkles size={18} className={canSyncFromKnowledge ? 'text-[#C7A56A]' : 'text-slate-400'} />
              </div>
              {canSyncFromKnowledge && (
                <span className="text-[10px] px-2 py-0.5 bg-[#C7A56A] text-[#0B1B2B] rounded-full font-medium">
                  推荐
                </span>
              )}
            </div>
            <h3 className="font-bold text-[#0B1B2B] mb-1">从知识引擎同步</h3>
            <p className="text-xs text-slate-500 mb-3">
              基于企业档案、买家画像、证据库自动生成高质量内容规划
            </p>
            <div className="flex items-center gap-1.5 text-xs">
              {counts.hasCompanyProfile ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={12} /> 企业档案
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <AlertCircle size={12} /> 企业档案
                </span>
              )}
              {counts.hasEvidence ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={12} /> 证据库
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <AlertCircle size={12} /> 证据库
                </span>
              )}
            </div>
          </button>

          {/* 路径 2: 手动快速起步 */}
          <button
            onClick={() => setSelectedPath('manual')}
            className="p-5 rounded-xl border-2 border-slate-200 text-left hover:border-[#C7A56A]/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <BookOpen size={18} className="text-slate-500" />
              </div>
            </div>
            <h3 className="font-bold text-[#0B1B2B] mb-1">手动快速起步</h3>
            <p className="text-xs text-slate-500 mb-3">
              输入产品关键词和目标市场，即可快速生成内容规划
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Globe size={12} />
              无需知识引擎数据
            </div>
          </button>

          {/* 路径 3: 导入参考材料 */}
          <button
            onClick={() => setSelectedPath('import')}
            className="p-5 rounded-xl border-2 border-slate-200 text-left hover:border-[#C7A56A]/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Upload size={18} className="text-slate-500" />
              </div>
            </div>
            <h3 className="font-bold text-[#0B1B2B] mb-1">导入参考材料</h3>
            <p className="text-xs text-slate-500 mb-3">
              粘贴竞品介绍、产品说明等文本，AI 提取关键信息生成规划
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Users size={12} />
              快速借鉴竞品
            </div>
          </button>
        </div>
      )}

      {/* 路径 1: 从知识引擎同步 - 详情 */}
      {selectedPath === 'sync' && (
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setSelectedPath(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#C7A56A] mb-4"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回选择
          </button>
          
          <div className="bg-[#F7F3EA] rounded-xl p-6 mb-6">
            <h3 className="font-bold text-[#0B1B2B] mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-[#C7A56A]" />
              从知识引擎同步生成
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              系统将读取您的企业档案、买家画像和证据库，自动生成覆盖全漏斗的主题集群。
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                {counts.hasCompanyProfile ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-amber-500" />
                )}
                <span className={counts.hasCompanyProfile ? 'text-slate-700' : 'text-slate-500'}>
                  企业档案 {counts.hasCompanyProfile ? '就绪' : '未完善'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {counts.hasPersonas ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-amber-500" />
                )}
                <span className={counts.hasPersonas ? 'text-slate-700' : 'text-slate-500'}>
                  买家画像 {counts.hasPersonas ? '就绪' : '未生成'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {counts.hasEvidence ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-amber-500" />
                )}
                <span className={counts.hasEvidence ? 'text-slate-700' : 'text-slate-500'}>
                  证据库 {counts.evidenceCount} 条
                </span>
              </div>
            </div>

            {!canSyncFromKnowledge && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">
                  建议先完善知识引擎数据以获得更好的生成效果。您也可以选择其他路径手动起步。
                </p>
                <Link 
                  href="/c/knowledge" 
                  className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium mt-2 hover:underline"
                >
                  前往知识引擎 <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={handleSyncFromKnowledge}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                从知识引擎生成主题集群
              </>
            )}
          </button>
        </div>
      )}

      {/* 路径 2: 手动快速起步 - 详情 */}
      {selectedPath === 'manual' && (
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setSelectedPath(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#C7A56A] mb-4"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回选择
          </button>
          
          <div className="space-y-5">
            {/* 产品关键词 */}
            <div>
              <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                产品关键词 <span className="text-red-500">*</span>
                <span className="text-xs text-slate-400 font-normal ml-2">(最多10个)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {manualKeywords.map((kw) => (
                  <span 
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#C7A56A]/20 text-[#0B1B2B] rounded text-sm"
                  >
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="输入关键词后回车"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#C7A56A]"
                />
                <button
                  onClick={addKeyword}
                  disabled={manualKeywords.length >= 10}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                >
                  <Plus size={16} className="text-slate-500" />
                </button>
              </div>
            </div>

            {/* 目标国家 */}
            <div>
              <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                目标国家
                <span className="text-xs text-slate-400 font-normal ml-2">(可选)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_COUNTRIES.map((code) => (
                  <button
                    key={code}
                    onClick={() => toggleCountry(code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      targetCountries.includes(code)
                        ? 'bg-[#C7A56A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {COUNTRY_NAMES[code]}
                  </button>
                ))}
              </div>
            </div>

            {/* 目标客户类型 */}
            <div>
              <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                目标客户类型
                <span className="text-xs text-slate-400 font-normal ml-2">(可选)</span>
              </label>
              <input
                type="text"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                placeholder="如：制造业采购经理、电商卖家..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#C7A56A]"
              />
            </div>
          </div>

          <button
            onClick={handleManualStart}
            disabled={isProcessing || manualKeywords.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50 mt-6"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                生成主题集群（手动）
              </>
            )}
          </button>
        </div>
      )}

      {/* 路径 3: 导入参考材料 - 详情 */}
      {selectedPath === 'import' && (
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setSelectedPath(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#C7A56A] mb-4"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回选择
          </button>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                参考材料
                <span className="text-xs text-slate-400 font-normal ml-2">
                  粘贴产品介绍、竞品信息或网站URL
                </span>
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="粘贴以下任意内容：&#10;- 产品介绍文案&#10;- 竞品网站URL&#10;- 公司简介&#10;- 行业关键词列表"
                rows={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#C7A56A] resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">
                注：系统不会抓取网页正文，仅将您输入的文本作为参考
              </p>
            </div>
          </div>

          <button
            onClick={handleImportStart}
            disabled={isProcessing || !importText.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50 mt-6"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                生成主题集群（参考导入）
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
