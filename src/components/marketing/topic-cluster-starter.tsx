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
    <div className="space-y-6">
      {/* 顶部深蓝指令台 */}
      <div className="rounded-2xl p-8 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        {/* 金色光晕 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(212,175,55,0.18) 0%, transparent 65%)',
        }} />
        <div className="relative text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{
            background: 'rgba(212,175,55,0.12)',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 0 24px rgba(212,175,55,0.15)',
          }}>
            <Layers size={28} className="text-[#D4AF37]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">启动内容增长引擎</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            选择启动方式，AI 自动规划 TOFU → MOFU → BOFU 全漏斗内容矩阵
          </p>
          {/* 漏斗标签 */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {['TOFU 认知', 'MOFU 评估', 'BOFU 决策'].map((stage, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.25)',
                color: '#D4AF37',
              }}>
                {stage}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 三条路径卡片 */}
      {selectedPath === null && (
        <div className="grid grid-cols-3 gap-4">
          {/* 路径 1: 从知识引擎同步 */}
          <button
            onClick={() => setSelectedPath('sync')}
            className="group p-6 rounded-2xl border text-left transition-all hover:shadow-lg"
            style={{
              background: canSyncFromKnowledge
                ? 'linear-gradient(135deg, #0B1220 0%, #0D1830 100%)'
                : 'linear-gradient(135deg, #0F1620 0%, #111B28 100%)',
              border: canSyncFromKnowledge
                ? '1px solid rgba(212,175,55,0.45)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: canSyncFromKnowledge ? '0 4px 24px -4px rgba(212,175,55,0.2)' : 'none',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: canSyncFromKnowledge ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${canSyncFromKnowledge ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                <Sparkles size={18} className={canSyncFromKnowledge ? 'text-[#D4AF37]' : 'text-slate-500'} />
              </div>
              {canSyncFromKnowledge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                  background: '#D4AF37',
                  color: '#0B1220',
                }}>
                  推荐
                </span>
              )}
            </div>
            <h3 className="font-bold text-white mb-2">从知识引擎同步</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              基于企业档案、买家画像、证据库自动生成高质量内容规划
            </p>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className={`flex items-center gap-1 ${counts.hasCompanyProfile ? 'text-emerald-400' : 'text-slate-600'}`}>
                <CheckCircle2 size={11} /> 企业档案
              </span>
              <span className={`flex items-center gap-1 ${counts.hasEvidence ? 'text-emerald-400' : 'text-slate-600'}`}>
                <CheckCircle2 size={11} /> 证据库
              </span>
            </div>
          </button>

          {/* 路径 2: 手动快速起步 */}
          <button
            onClick={() => setSelectedPath('manual')}
            className="group p-6 rounded-2xl border text-left transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0F1620 0%, #111B28 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <BookOpen size={18} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
              </div>
            </div>
            <h3 className="font-bold text-white mb-2">手动快速起步</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              输入产品关键词和目标市场，即可快速生成内容规划
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Globe size={11} />
              无需知识引擎数据
            </div>
          </button>

          {/* 路径 3: 导入参考材料 */}
          <button
            onClick={() => setSelectedPath('import')}
            className="group p-6 rounded-2xl border text-left transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0F1620 0%, #111B28 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Upload size={18} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
              </div>
            </div>
            <h3 className="font-bold text-white mb-2">导入参考材料</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              粘贴竞品介绍、产品说明等文本，AI 提取关键信息生成规划
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Users size={11} />
              快速借鉴竞品
            </div>
          </button>
        </div>
      )}

      {/* 路径 1: 从知识引擎同步 - 详情 */}
      {selectedPath === 'sync' && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #0D1830 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
        }}>
          <button
            onClick={() => setSelectedPath(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#D4AF37] mb-6 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回选择
          </button>

          <div className="max-w-lg mx-auto">
            <div className="rounded-xl p-5 mb-6" style={{
              background: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}>
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-[#D4AF37]" />
                从知识引擎同步生成
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                系统将读取您的企业档案、买家画像和证据库，自动生成覆盖全漏斗的主题集群。
              </p>

              <div className="space-y-2 mb-4">
                {[
                  { label: '企业档案', ready: counts.hasCompanyProfile, note: counts.hasCompanyProfile ? '就绪' : '未完善' },
                  { label: '买家画像', ready: counts.hasPersonas, note: counts.hasPersonas ? '就绪' : '未生成' },
                  { label: '证据库', ready: counts.hasEvidence, note: `${counts.evidenceCount} 条` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {item.ready ? (
                      <CheckCircle2 size={15} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-400" />
                    )}
                    <span className={item.ready ? 'text-slate-300' : 'text-slate-500'}>
                      {item.label} {item.note}
                    </span>
                  </div>
                ))}
              </div>

              {!canSyncFromKnowledge && (
                <div className="rounded-lg p-3" style={{
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}>
                  <p className="text-xs text-amber-400">
                    建议先完善知识引擎数据以获得更好的生成效果。
                  </p>
                  <Link
                    href="/c/knowledge"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium mt-2 hover:underline"
                  >
                    前往知识引擎 <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={handleSyncFromKnowledge}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{
                background: '#D4AF37',
                color: '#0B1220',
                boxShadow: '0 4px 20px -4px rgba(212,175,55,0.5)',
              }}
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" />生成中...</>
              ) : (
                <><Sparkles size={18} />从知识引擎生成主题集群</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 路径 2: 手动快速起步 - 详情 */}
      {selectedPath === 'manual' && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #0D1830 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={() => setSelectedPath(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#D4AF37] mb-6 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回选择
          </button>

          <div className="max-w-lg mx-auto space-y-5">
            {/* 产品关键词 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                产品关键词 <span className="text-red-400">*</span>
                <span className="text-xs text-slate-500 font-normal ml-2">(最多10个)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {manualKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                    style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
                  >
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 transition-colors">
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
                  className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button
                  onClick={addKeyword}
                  disabled={manualKeywords.length >= 10}
                  className="px-3 py-2 rounded-lg disabled:opacity-50 transition-colors hover:bg-[#D4AF37]/10"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Plus size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* 目标国家 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                目标国家
                <span className="text-xs text-slate-500 font-normal ml-2">(可选)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_COUNTRIES.map((code) => (
                  <button
                    key={code}
                    onClick={() => toggleCountry(code)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={targetCountries.includes(code) ? {
                      background: '#D4AF37',
                      color: '#0B1220',
                    } : {
                      background: 'rgba(255,255,255,0.06)',
                      color: '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {COUNTRY_NAMES[code]}
                  </button>
                ))}
              </div>
            </div>

            {/* 目标客户类型 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                目标客户类型
                <span className="text-xs text-slate-500 font-normal ml-2">(可选)</span>
              </label>
              <input
                type="text"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                placeholder="如：制造业采购经理、电商卖家..."
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            <button
              onClick={handleManualStart}
              disabled={isProcessing || manualKeywords.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 mt-2"
              style={{
                background: '#D4AF37',
                color: '#0B1220',
                boxShadow: '0 4px 20px -4px rgba(212,175,55,0.5)',
              }}
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" />生成中...</>
              ) : (
                <><Sparkles size={18} />生成主题集群（手动）</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 路径 3: 导入参考材料 - 详情 */}
      {selectedPath === 'import' && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #0D1830 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={() => setSelectedPath(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#D4AF37] mb-6 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回选择
          </button>

          <div className="max-w-lg mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                参考材料
                <span className="text-xs text-slate-500 font-normal ml-2">
                  粘贴产品介绍、竞品信息或网站URL
                </span>
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"粘贴以下任意内容：\n- 产品介绍文案\n- 竞品网站URL\n- 公司简介\n- 行业关键词列表"}
                rows={8}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <p className="text-xs text-slate-600 mt-2">
                注：系统不会抓取网页正文，仅将您输入的文本作为参考
              </p>
            </div>

            <button
              onClick={handleImportStart}
              disabled={isProcessing || !importText.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{
                background: '#D4AF37',
                color: '#0B1220',
                boxShadow: '0 4px 20px -4px rgba(212,175,55,0.5)',
              }}
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" />生成中...</>
              ) : (
                <><Sparkles size={18} />生成主题集群（参考导入）</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
