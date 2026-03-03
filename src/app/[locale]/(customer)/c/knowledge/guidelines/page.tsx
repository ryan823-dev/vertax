"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Pencil, Trash2, BookOpen, Check, X,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';
import {
  getGuidelines, createGuideline, updateGuideline, deleteGuideline,
} from '@/actions/guidelines';
import type { GuidelineData, GuidelineCategoryValue, CreateGuidelineInput } from '@/types/knowledge';

const CATEGORY_TABS: Array<{ value: GuidelineCategoryValue; label: string; icon: string }> = [
  { value: 'tone', label: '语气风格', icon: '🎭' },
  { value: 'terminology', label: '术语规范', icon: '📖' },
  { value: 'visual', label: '视觉规范', icon: '🎨' },
  { value: 'messaging', label: '信息规范', icon: '💬' },
];

export default function GuidelinesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [guidelines, setGuidelines] = useState<GuidelineData[]>([]);
  const [activeCategory, setActiveCategory] = useState<GuidelineCategoryValue>('tone');
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGuidelineInput>({
    category: 'tone', title: '', content: '',
    examples: { do: [''], dont: [''] },
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadGuidelines = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getGuidelines(activeCategory);
      setGuidelines(data);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [activeCategory]);

  useEffect(() => { loadGuidelines(); }, [loadGuidelines]);

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
      loadGuidelines();
    } catch { /* silent */ } finally { setIsCreating(false); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateGuideline(id, { isActive: !isActive });
    loadGuidelines();
  };

  const handleDelete = async (id: string) => {
    await deleteGuideline(id);
    loadGuidelines();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">品牌规范</h1>
          <p className="text-sm text-slate-500 mt-1">定义品牌语气、术语和信息规范，指导内容生成</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateForm({ ...createForm, category: activeCategory }); }} className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors">
          <Plus size={16} />
          新建规范
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 bg-[#F7F3EA] rounded-lg p-1">
        {CATEGORY_TABS.map((tab) => (
          <button key={tab.value} onClick={() => { setActiveCategory(tab.value); setEditingId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              activeCategory === tab.value ? 'bg-white text-[#0B1B2B] shadow-sm' : 'text-slate-500 hover:text-[#0B1B2B]'
            }`}>
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Guidelines List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-[#C7A56A] animate-spin" /></div>
      ) : guidelines.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3]">
          <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">暂无{CATEGORY_TABS.find(t => t.value === activeCategory)?.label}规范</p>
        </div>
      ) : (
        <div className="space-y-4">
          {guidelines.map((g) => (
            <div key={g.id} className={`p-5 border rounded-xl transition-all ${g.isActive ? 'border-[#E7E0D3] bg-[#FFFCF6]' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#0B1B2B]">{g.title}</h4>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleActive(g.id, g.isActive)}
                    className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${g.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    {g.isActive ? '启用' : '禁用'}
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">{g.content}</p>
              {(g.examples?.do?.length > 0 || g.examples?.dont?.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {g.examples?.do?.length > 0 && (
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <p className="text-[10px] font-medium text-emerald-600 mb-1.5 flex items-center gap-1"><ThumbsUp size={10} /> Do</p>
                      {g.examples.do.map((ex, i) => (
                        <p key={i} className="text-[11px] text-slate-600 leading-relaxed">• {ex}</p>
                      ))}
                    </div>
                  )}
                  {g.examples?.dont?.length > 0 && (
                    <div className="p-3 bg-red-50/50 rounded-lg border border-red-100">
                      <p className="text-[10px] font-medium text-red-500 mb-1.5 flex items-center gap-1"><ThumbsDown size={10} /> Don&apos;t</p>
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

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] shadow-xl w-[520px] max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-4">新建规范</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">标题</label>
                <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="规范标题" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">内容描述</label>
                <textarea value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  rows={3} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="详细描述这条规范..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">正例 (Do)</label>
                {createForm.examples?.do?.map((ex, i) => (
                  <input key={i} value={ex} onChange={(e) => updateExample('do', i, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E7E0D3] rounded-lg bg-white mb-1 text-[#0B1B2B]" placeholder="正确的示例..." />
                ))}
                <button onClick={() => addExample('do')} className="text-xs text-[#C7A56A] hover:underline">+ 添加正例</button>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">反例 (Don&apos;t)</label>
                {createForm.examples?.dont?.map((ex, i) => (
                  <input key={i} value={ex} onChange={(e) => updateExample('dont', i, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E7E0D3] rounded-lg bg-white mb-1 text-[#0B1B2B]" placeholder="错误的示例..." />
                ))}
                <button onClick={() => addExample('dont')} className="text-xs text-[#C7A56A] hover:underline">+ 添加反例</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[#E7E0D3] rounded-xl text-slate-500">取消</button>
              <button onClick={handleCreate} disabled={isCreating || !createForm.title || !createForm.content} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium disabled:opacity-50">
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
