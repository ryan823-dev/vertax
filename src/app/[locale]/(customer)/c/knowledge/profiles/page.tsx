"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Users2, LayoutGrid, Pencil, Trash2, Sparkles,
  ChevronRight, MessageSquare,
} from 'lucide-react';
import {
  getICPSegments, createICPSegment, deleteICPSegment,
  getPersonasBySegment, createPersona, deletePersona,
  getMessagingMatrix, upsertMessagingMatrixEntry, generatePersonaMessaging,
} from '@/actions/personas';
import type { ICPSegmentData, PersonaData, MessagingMatrixData, CreatePersonaInput } from '@/types/knowledge';

export default function ProfilesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [segments, setSegments] = useState<ICPSegmentData[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MessagingMatrixData[]>([]);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);

  // Create segment
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentIndustry, setSegmentIndustry] = useState('');

  // Create persona
  const [showCreatePersona, setShowCreatePersona] = useState(false);
  const [personaForm, setPersonaForm] = useState<CreatePersonaInput>({ name: '', title: '' });

  // AI generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [valuePropInput, setValuePropInput] = useState('');

  // Load data
  const loadSegments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getICPSegments();
      setSegments(data);
      if (data.length > 0 && !selectedSegmentId) setSelectedSegmentId(data[0].id);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, []);

  const loadPersonas = useCallback(async () => {
    if (!selectedSegmentId) return;
    try {
      const data = await getPersonasBySegment(selectedSegmentId);
      setPersonas(data);
    } catch { /* silent */ }
  }, [selectedSegmentId]);

  const loadMatrix = useCallback(async () => {
    if (!selectedPersonaId) return;
    setIsLoadingMatrix(true);
    try {
      const data = await getMessagingMatrix(selectedPersonaId);
      setMatrix(data);
    } catch { /* silent */ } finally { setIsLoadingMatrix(false); }
  }, [selectedPersonaId]);

  useEffect(() => { loadSegments(); }, [loadSegments]);
  useEffect(() => { loadPersonas(); }, [selectedSegmentId, loadPersonas]);
  useEffect(() => { loadMatrix(); }, [selectedPersonaId, loadMatrix]);

  const handleCreateSegment = async () => {
    if (!segmentName) return;
    await createICPSegment({ name: segmentName, industry: segmentIndustry || undefined });
    setShowCreateSegment(false);
    setSegmentName('');
    setSegmentIndustry('');
    loadSegments();
  };

  const handleDeleteSegment = async (id: string) => {
    await deleteICPSegment(id);
    if (selectedSegmentId === id) setSelectedSegmentId(null);
    loadSegments();
  };

  const handleCreatePersona = async () => {
    if (!personaForm.name || !personaForm.title) return;
    await createPersona({ ...personaForm, segmentId: selectedSegmentId || undefined });
    setShowCreatePersona(false);
    setPersonaForm({ name: '', title: '' });
    loadPersonas();
  };

  const handleDeletePersona = async (id: string) => {
    await deletePersona(id);
    if (selectedPersonaId === id) { setSelectedPersonaId(null); setMatrix([]); }
    loadPersonas();
  };

  const handleAIGenerate = async () => {
    if (!selectedPersonaId || !valuePropInput.trim()) return;
    setIsGenerating(true);
    try {
      const props = valuePropInput.split('\n').filter(Boolean).map(s => s.trim());
      await generatePersonaMessaging(selectedPersonaId, props);
      loadMatrix();
    } catch { /* silent */ } finally { setIsGenerating(false); }
  };

  const handleEditMessage = async (item: MessagingMatrixData, newMessage: string) => {
    await upsertMessagingMatrixEntry(item.personaId, {
      valueProp: item.valueProp,
      message: newMessage,
      channel: item.channel ?? undefined,
    });
    loadMatrix();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">人设中心</h1>
          <p className="text-sm text-slate-500 mt-1">管理 ICP 细分市场、买家角色和定制化信息矩阵</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateSegment(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0B1B2B] border border-[#E7E0D3] rounded-xl hover:bg-[#F7F3EA] transition-colors">
            <Plus size={16} />
            新建细分
          </button>
          <button onClick={() => setShowCreatePersona(true)} disabled={!selectedSegmentId}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50">
            <Plus size={16} />
            新建角色
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-[#C7A56A] animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-5 gap-6 min-h-[500px]">
          {/* Left: Segments */}
          <div className="col-span-1 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">细分市场</p>
            {segments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">暂无细分市场</p>
            ) : segments.map((seg) => (
              <button key={seg.id} onClick={() => { setSelectedSegmentId(seg.id); setSelectedPersonaId(null); setMatrix([]); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedSegmentId === seg.id ? 'border-[#C7A56A] bg-[#C7A56A]/5' : 'border-[#E7E0D3] bg-[#FFFCF6] hover:border-[#C7A56A]/30'
                }`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#0B1B2B] truncate">{seg.name}</p>
                  {selectedSegmentId === seg.id && <ChevronRight size={14} className="text-[#C7A56A]" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {seg.industry && <span className="text-[10px] text-slate-400">{seg.industry}</span>}
                  <span className="text-[10px] text-slate-400">{seg.personaCount || 0} 角色</span>
                </div>
              </button>
            ))}
          </div>

          {/* Middle: Personas */}
          <div className="col-span-2 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">买家角色</p>
            {personas.length === 0 ? (
              <div className="text-center py-12 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3]">
                <Users2 size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">{selectedSegmentId ? '暂无角色，请创建' : '请先选择细分市场'}</p>
              </div>
            ) : personas.map((p) => (
              <div key={p.id} onClick={() => setSelectedPersonaId(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPersonaId === p.id ? 'border-[#C7A56A] bg-[#C7A56A]/5' : 'border-[#E7E0D3] bg-[#FFFCF6] hover:border-[#C7A56A]/30'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-[#0B1B2B]">{p.name}</h4>
                  <button onClick={(e) => { e.stopPropagation(); handleDeletePersona(p.id); }} className="p-1 text-slate-400 hover:text-red-500 rounded">
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-2">{p.title}{p.seniority ? ` · ${p.seniority}` : ''}</p>
                {p.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.concerns.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] bg-[#F7F3EA] text-slate-500 rounded-full">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: Messaging Matrix */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">信息矩阵</p>
              {selectedPersonaId && (
                <button onClick={() => {}} className="text-[10px] text-[#C7A56A] hover:underline flex items-center gap-1">
                  <Sparkles size={10} />
                  AI 生成
                </button>
              )}
            </div>
            {!selectedPersonaId ? (
              <div className="text-center py-12 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3]">
                <MessageSquare size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">选择角色查看信息矩阵</p>
              </div>
            ) : isLoadingMatrix ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-[#C7A56A] animate-spin" /></div>
            ) : (
              <>
                {matrix.length > 0 && (
                  <div className="space-y-2">
                    {matrix.map((m) => (
                      <div key={m.id} className="p-3 border border-[#E7E0D3] rounded-xl bg-[#FFFCF6]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-[#C7A56A]/10 text-[#C7A56A] rounded">{m.valueProp}</span>
                          {m.channel && <span className="text-[10px] text-slate-400">{m.channel}</span>}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* AI Generate Section */}
                <div className="p-4 bg-[#F7F3EA] rounded-xl border border-[#E7E0D3] mt-3">
                  <p className="text-xs font-medium text-[#0B1B2B] mb-2">AI 生成定制信息</p>
                  <textarea value={valuePropInput} onChange={(e) => setValuePropInput(e.target.value)}
                    rows={3} placeholder="输入价值主张（每行一条），如：&#10;降低运营成本&#10;提升产品质量&#10;加速交付周期"
                    className="w-full px-3 py-2 text-xs border border-[#E7E0D3] rounded-lg bg-white mb-2 text-[#0B1B2B]" />
                  <button onClick={handleAIGenerate} disabled={isGenerating || !valuePropInput.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#0B1B2B] text-[#C7A56A] rounded-lg font-medium disabled:opacity-50">
                    {isGenerating ? <><Loader2 size={12} className="animate-spin" />生成中...</> : <><Sparkles size={12} />生成</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Segment Dialog */}
      {showCreateSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreateSegment(false)}>
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] shadow-xl w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-4">新建细分市场</h3>
            <div className="space-y-3">
              <input value={segmentName} onChange={(e) => setSegmentName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="细分市场名称" />
              <input value={segmentIndustry} onChange={(e) => setSegmentIndustry(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="目标行业（可选）" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreateSegment(false)} className="px-4 py-2 text-sm border border-[#E7E0D3] rounded-xl text-slate-500">取消</button>
              <button onClick={handleCreateSegment} disabled={!segmentName} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Persona Dialog */}
      {showCreatePersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreatePersona(false)}>
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] shadow-xl w-[450px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-4">新建买家角色</h3>
            <div className="space-y-3">
              <input value={personaForm.name} onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="角色名称，如：采购经理" />
              <input value={personaForm.title} onChange={(e) => setPersonaForm({ ...personaForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="典型职位，如：采购部总监" />
              <select value={personaForm.seniority || ''} onChange={(e) => setPersonaForm({ ...personaForm, seniority: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]">
                <option value="">级别（可选）</option>
                <option value="junior">初级</option>
                <option value="mid">中级</option>
                <option value="senior">高级</option>
                <option value="executive">高管</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreatePersona(false)} className="px-4 py-2 text-sm border border-[#E7E0D3] rounded-xl text-slate-500">取消</button>
              <button onClick={handleCreatePersona} disabled={!personaForm.name || !personaForm.title} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
