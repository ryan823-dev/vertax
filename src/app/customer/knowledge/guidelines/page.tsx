"use client";

/**
 * 品牌手册页面 - 定义品牌规范
 * 
 * 重构重点：
 * - 集成 EngineHeader + Stepper
 * - 输入来源提示（依赖企业档案）
 * - 明确前置条件
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Loader2, Pencil, Trash2, BookOpen, Building2, AlertCircle, 
  ThumbsUp, ThumbsDown, Sparkles, Mic, Palette, MessageSquare, X
} from 'lucide-react';
import {
  getGuidelines, createGuideline, updateGuideline, deleteGuideline,
} from '@/actions/guidelines';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
import { EngineHeader } from '@/components/knowledge/engine-header';
import type { GuidelineData, GuidelineCategoryValue, CreateGuidelineInput } from '@/types/knowledge';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

const CATEGORY_TABS: Array<{ value: GuidelineCategoryValue; label: string; icon: any }> = [
  { value: 'tone', label: '语气风格', icon: Mic },
  { value: 'terminology', label: '术语规范', icon: BookOpen },
  { value: 'visual', label: '视觉规范', icon: Palette },
  { value: 'messaging', label: '信息规范', icon: MessageSquare },
];

export default function GuidelinesPage() {
  // Pipeline status
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [guidelines, setGuidelines] = useState<GuidelineData[]>([]);
  const [activeCategory, setActiveCategory] = useState<GuidelineCategoryValue>('tone');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success'|'error'} | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGuidelineInput>({
    category: 'tone', title: '', content: '',
    examples: { do: [''], dont: [''] },
  });

  // Load pipeline status
  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      setToast({ message: '加载管线状态失败', type: 'error' });
    }
  }, []);

  const loadGuidelines = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getGuidelines(activeCategory);
      setGuidelines(data);
    } catch { 
      setToast({ message: '加载品牌手册失败', type: 'error' });
    } finally { 
      setIsLoading(false); 
    }
  }, [activeCategory]);

  useEffect(() => { 
    loadPipelineStatus();
    loadGuidelines(); 
  }, [loadPipelineStatus, loadGuidelines]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.content) return;
    setIsCreating(true);
    try {
      const cleaned = {
        ...createForm,
        category: activeCategory,
        examples: {
          do: createForm.examples?.do?.filter(Boolean) || [],
          dont: createForm.examples?.dont?.filter(Boolean) || [],
        },
      };
      await createGuideline(cleaned);
      setShowCreate(false);
      setCreateForm({ category: activeCategory, title: '', content: '', examples: { do: [''], dont: [''] } });
      setToast({ message: '规范创建成功', type: 'success' });
      await Promise.all([loadGuidelines(), loadPipelineStatus()]);
    } catch { 
      setToast({ message: '创建失败', type: 'error' });
    } finally { 
      setIsCreating(false); 
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateGuideline(id, { isActive: !isActive });
      loadGuidelines();
    } catch {
      setToast({ message: '更新状态失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGuideline(id);
      setDeleteTarget(null);
      setToast({ message: '规范已删除', type: 'success' });
      await Promise.all([loadGuidelines(), loadPipelineStatus()]);
    } catch {
      setToast({ message: '删除失败', type: 'error' });
    }
  };

  const addExample = (type: 'do' | 'dont') => {
    setCreateForm({
      ...createForm,
      examples: {
        ...createForm.examples!,
        [type]: [...(createForm.examples?.[type] || []), ''],
      },
    });
  };

  const updateExample = (type: 'do' | 'dont', idx: number, val: string) => {
    const arr = [...(createForm.examples?.[type] || [])];
    arr[idx] = val;
    setCreateForm({ ...createForm, examples: { ...createForm.examples!, [type]: arr } });
  };

  // Check prerequisites
  const hasCompanyProfile = pipelineStatus?.counts.companyProfileHasContent;

  // Primary CTA config
  const getPrimaryCTA = () => {
    return {
      label: '生成品牌手册',
      onClick: () => setShowCreate(true),
      disabled: !hasCompanyProfile,
    };
  };

  return (
    <div className="space-y-0">
      {/* Engine Header with Stepper */}
      {pipelineStatus && (
        <EngineHeader
          title="品牌手册"
          description="定义品牌语气、术语和信息规范，指导内容生成"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
          primaryAction={getPrimaryCTA()}
        />
      )}

      <div className="p-5 space-y-5">
        {/* Input Source Hint */}
        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <span className="text-xs text-slate-500">输入来源：</span>
                <span className={`text-xs font-medium ${hasCompanyProfile ? 'text-[#B8860B]' : 'text-slate-400'}`}>
                  企业档案 {hasCompanyProfile ? '✓ 已生成' : '× 未生成'}
                </span>
              </div>
              {!hasCompanyProfile && (
                <div className="flex items-center gap-2 text-[#B8860B] text-xs">
                  <AlertCircle size={14} />
                  <span>请先生成企业档案</span>
                  <Link href="/customer/knowledge/company" className="text-[#D4AF37] hover:underline">去企业档案</Link>
                </div>
              )}
            </div>
            <button 
              onClick={() => { setShowCreate(true); setCreateForm({ ...createForm, category: activeCategory }); }} 
              disabled={!hasCompanyProfile}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-[#E8E0D0] rounded-lg hover:bg-[#F0EBD8] transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              手动添加
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-[#F0EBD8] rounded-lg p-1">
          {CATEGORY_TABS.map((tab) => (
            <button key={tab.value} onClick={() => setActiveCategory(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                activeCategory === tab.value ? 'bg-[#0B1220] text-[#D4AF37] shadow-sm' : 'text-slate-500 hover:text-[#0B1220]'
              }`}>
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Guidelines List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-[#D4AF37] animate-spin" /></div>
        ) : guidelines.length === 0 ? (
          <div className="text-center py-16 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0]">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 24px rgba(212,175,55,0.1)' }}>
              <BookOpen size={32} className="text-[#D4AF37]" />
            </div>
            <p className="text-sm text-slate-500 mb-2">暂无{CATEGORY_TABS.find(t => t.value === activeCategory)?.label}规范</p>
            {hasCompanyProfile ? (
              <>
                <p className="text-xs text-slate-400 mb-4">从企业档案中提取或手动创建规范</p>
                <button
                  onClick={() => setShowCreate(true)}
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)' }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[#0B1220] rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-[0_4px_16px_-2px_rgba(212,175,55,0.35)]"
                >
                  <Sparkles size={16} />
                  创建规范
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-4">需要先生成企业档案</p>
                <Link
                  href="/customer/knowledge/company"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors shadow-[0_4px_16px_-2px_rgba(212,175,55,0.35)]"
                >
                  <Building2 size={16} />
                  去企业档案
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {guidelines.map((g) => (
              <div key={g.id} 
                onMouseEnter={() => setHoveredId(g.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderColor: hoveredId === g.id ? 'rgba(212,175,55,0.4)' : '#E8E0D0',
                  boxShadow: hoveredId === g.id ? '0 4px 16px -4px rgba(212,175,55,0.15)' : 'none',
                  transform: hoveredId === g.id ? 'translateY(-1px)' : 'none'
                }}
                className={`p-5 border rounded-xl transition-all ${g.isActive ? 'bg-[#FFFCF7]' : 'bg-[#F7F3E8] opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#0B1220]">{g.title}</h4>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleActive(g.id, g.isActive)}
                      style={g.isActive 
                        ? { background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#B8860B' }
                        : { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#94A3B8' }
                      }
                      className="px-2.5 py-1 text-[10px] rounded-full transition-colors font-medium">
                      {g.isActive ? '启用' : '禁用'}
                    </button>
                    <button onClick={() => setDeleteTarget(g.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{g.content}</p>
                {(g.examples?.do?.length > 0 || g.examples?.dont?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    {g.examples?.do?.length > 0 && (
                      <div className="p-3 rounded-lg border" style={{ background: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.15)' }}>
                        <p className="text-[10px] font-medium mb-1.5 flex items-center gap-1" style={{ color: '#B8860B' }}><ThumbsUp size={10} /> Do</p>
                        {g.examples.do.map((ex, i) => (
                          <p key={i} className="text-[11px] text-slate-600 leading-relaxed">• {ex}</p>
                        ))}
                      </div>
                    )}
                    {g.examples?.dont?.length > 0 && (
                      <div className="p-3 rounded-lg border" style={{ background: 'rgba(148,130,100,0.06)', borderColor: 'rgba(148,130,100,0.15)' }}>
                        <p className="text-[10px] font-medium mb-1.5 flex items-center gap-1" style={{ color: '#8B7D5A' }}><ThumbsDown size={10} /> Don&apos;t</p>
                        {g.examples.dont.map((ex, i) => (
                          <p key={i} className="text-[11px] text-slate-600 leading-relaxed">• {ex}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreate(false)}>
          <div className="rounded-2xl w-[520px] max-h-[85vh] overflow-y-auto p-6" 
            style={{ background: '#0F1728', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">新建规范</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>标题</label>
                <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-[#D4AF37]/50" placeholder="规范标题" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>内容描述</label>
                <textarea value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  rows={3} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-[#D4AF37]/50" placeholder="详细描述这条规范..." />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>正例 (Do)</label>
                {createForm.examples?.do?.map((ex, i) => (
                  <input key={i} value={ex} onChange={(e) => updateExample('do', i, e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg mb-1 focus:outline-none focus:border-[#D4AF37]/50" placeholder="正确的示例..." />
                ))}
                <button onClick={() => addExample('do')} className="text-xs text-[#D4AF37] hover:underline">+ 添加正例</button>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>反例 (Don&apos;t)</label>
                {createForm.examples?.dont?.map((ex, i) => (
                  <input key={i} value={ex} onChange={(e) => updateExample('dont', i, e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg mb-1 focus:outline-none focus:border-[#D4AF37]/50" placeholder="错误的示例..." />
                ))}
                <button onClick={() => addExample('dont')} className="text-xs text-[#D4AF37] hover:underline">+ 添加反例</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} 
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                className="px-4 py-2 text-sm rounded-xl hover:bg-white/5 transition-colors">取消</button>
              <button onClick={handleCreate} disabled={isCreating || !createForm.title || !createForm.content} 
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C4A028 100%)', color: '#0B1220' }}
                className="px-4 py-2 text-sm rounded-xl font-bold disabled:opacity-50 transition-opacity">
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#0F1728] border border-white/10 rounded-2xl p-6 w-[360px] shadow-2xl">
            <h4 className="text-white font-bold mb-2">确认删除？</h4>
            <p className="text-white/50 text-xs mb-6 text-pretty">此操作无法撤销，该品牌规范将被永久移除。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">取消</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-[100] animate-slide-up">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {toast.type === 'success' ? <ThumbsUp size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
