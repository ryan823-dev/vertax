"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  Target,
  Globe,
  Settings,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import {
  getRadarSearchProfiles,
  createRadarSearchProfile,
  updateRadarSearchProfile,
  toggleRadarSearchProfileActive,
  deleteRadarSearchProfile,
  triggerRadarSearchProfileScan,
  getRadarSourcesV2,
  type RadarSearchProfileData,
  type CreateRadarSearchProfileInput,
  type RadarSourceData,
} from '@/actions/radar-v2';
import { getICPSegments } from '@/actions/personas';
import type { ICPSegmentData } from '@/types/knowledge';

// ==================== 常量 ====================

const SCHEDULE_PRESETS = [
  { label: '每5分钟', value: '*/5 * * * *', description: '高频扫描' },
  { label: '每15分钟', value: '*/15 * * * *', description: '标准频率' },
  { label: '每小时', value: '0 * * * *', description: '低频扫描' },
  { label: '每天早6点', value: '0 6 * * *', description: '每日一次' },
  { label: '每周一早6点', value: '0 6 * * 1', description: '每周一次' },
];

const CHANNEL_TYPES = [
  { value: 'TENDER', label: '招标采购' },
  { value: 'MAPS', label: '地图 POI' },
  { value: 'DIRECTORY', label: '行业名录' },
  { value: 'HIRING', label: '招聘信号' },
  { value: 'TRADESHOW', label: '展会参展' },
];

// ==================== 工具函数 ====================

function formatRelativeTime(date: Date | null): string {
  if (!date) return '-';
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  
  if (absDiff < 60 * 1000) return diff > 0 ? '即将' : '刚刚';
  if (absDiff < 60 * 60 * 1000) {
    const mins = Math.round(absDiff / (60 * 1000));
    return diff > 0 ? `${mins}分钟后` : `${mins}分钟前`;
  }
  if (absDiff < 24 * 60 * 60 * 1000) {
    const hours = Math.round(absDiff / (60 * 60 * 1000));
    return diff > 0 ? `${hours}小时后` : `${hours}小时前`;
  }
  const days = Math.round(absDiff / (24 * 60 * 60 * 1000));
  return diff > 0 ? `${days}天后` : `${days}天前`;
}

function parseScheduleRule(rule: string): string {
  const preset = SCHEDULE_PRESETS.find(p => p.value === rule);
  if (preset) return preset.label;
  return rule;
}

// ==================== 表单对话框 ====================

interface ProfileFormDialogProps {
  profile?: RadarSearchProfileData | null;
  segments: ICPSegmentData[];
  sources: RadarSourceData[];
  onClose: () => void;
  onSave: (data: CreateRadarSearchProfileInput) => Promise<void>;
}

function ProfileFormDialog({ profile, segments, sources, onClose, onSave }: ProfileFormDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CreateRadarSearchProfileInput>({
    name: profile?.name || '',
    description: profile?.description || '',
    segmentId: profile?.segmentId || undefined,
    keywords: profile?.keywords || { en: [] },
    negativeKeywords: profile?.negativeKeywords || [],
    targetCountries: profile?.targetCountries || [],
    enabledChannels: profile?.enabledChannels || [],
    sourceIds: profile?.sourceIds || [],
    scheduleRule: profile?.scheduleRule || '*/15 * * * *',
    maxRunSeconds: profile?.maxRunSeconds || 45,
    autoQualify: profile?.autoQualify ?? true,
    autoEnrich: profile?.autoEnrich ?? false,
  });
  
  const [keywordsText, setKeywordsText] = useState(
    (profile?.keywords?.en || []).join(', ')
  );
  const [negativeText, setNegativeText] = useState(
    (profile?.negativeKeywords || []).join(', ')
  );
  const [countriesText, setCountriesText] = useState(
    (profile?.targetCountries || []).join(', ')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const keywords = keywordsText.split(/[,，\n]+/).map(k => k.trim()).filter(Boolean);
      const negativeKeywords = negativeText.split(/[,，\n]+/).map(k => k.trim()).filter(Boolean);
      const targetCountries = countriesText.split(/[,，\s]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
      
      await onSave({
        ...formData,
        keywords: { en: keywords },
        negativeKeywords,
        targetCountries,
      });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FFFCF7] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E0D0] flex items-center justify-between" style={{background: '#F0EBD8'}}>
          <h2 className="text-lg font-bold text-[#0B1B2B]">
            {profile ? '编辑扫描计划' : '新建扫描计划'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Settings size={14} />
              基本信息
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">计划名称 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：欧洲工业机器人招标"
                  className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">描述</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="简要说明此计划的目标和范围"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">关联客户画像</label>
                <select
                  value={formData.segmentId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, segmentId: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">不关联</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">执行频率</label>
                <select
                  value={formData.scheduleRule}
                  onChange={e => setFormData(prev => ({ ...prev, scheduleRule: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                >
                  {SCHEDULE_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label} - {p.description}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* 搜索配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Target size={14} />
              搜索配置
            </h3>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">关键词（每行一个或用逗号分隔）*</label>
              <textarea
                value={keywordsText}
                onChange={e => setKeywordsText(e.target.value)}
                placeholder="industrial robot&#10;automation equipment&#10;robotic arm"
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37] resize-none font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">排除词（可选）</label>
              <textarea
                value={negativeText}
                onChange={e => setNegativeText(e.target.value)}
                placeholder="maintenance, repair, used"
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37] resize-none font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">目标国家 ISO Code（可选，用逗号分隔）</label>
              <input
                type="text"
                value={countriesText}
                onChange={e => setCountriesText(e.target.value)}
                placeholder="US, DE, FR, GB"
                className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
          
          {/* 渠道选择 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Globe size={14} />
              启用渠道
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              {CHANNEL_TYPES.map(ch => (
                <label key={ch.value} className="flex items-center gap-2 p-2 border border-[#E8E0D0] rounded-lg cursor-pointer hover:bg-[#F0EBD8]">
                  <input
                    type="checkbox"
                    checked={formData.enabledChannels?.includes(ch.value) || false}
                    onChange={e => {
                      const channels = formData.enabledChannels || [];
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, enabledChannels: [...channels, ch.value] }));
                      } else {
                        setFormData(prev => ({ ...prev, enabledChannels: channels.filter(c => c !== ch.value) }));
                      }
                    }}
                    className="w-4 h-4 text-[#D4AF37] rounded border-slate-300 focus:ring-[#D4AF37]"
                  />
                  <span className="text-sm text-slate-700">{ch.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* 指定数据源 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Zap size={14} />
              指定数据源（可选）
            </h3>
            
            <div className="max-h-40 overflow-y-auto border border-[#E8E0D0] rounded-lg p-2 space-y-1">
              {sources.length === 0 ? (
                <p className="text-sm text-slate-400 p-2">暂无可用数据源</p>
              ) : (
                sources.map(s => (
                  <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#F0EBD8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sourceIds?.includes(s.id) || false}
                      onChange={e => {
                        const ids = formData.sourceIds || [];
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, sourceIds: [...ids, s.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, sourceIds: ids.filter(id => id !== s.id) }));
                        }
                      }}
                      className="w-4 h-4 text-[#D4AF37] rounded border-slate-300 focus:ring-[#D4AF37]"
                    />
                    <span className="text-sm text-slate-700">{s.name}</span>
                    <span className="text-xs text-slate-400">({s.channelType})</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-slate-400">不选则使用启用渠道下的所有数据源</p>
          </div>
          
          {/* 高级选项 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 size={14} />
              高级选项
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">单次扫描时限（秒）</label>
                <input
                  type="number"
                  value={formData.maxRunSeconds}
                  onChange={e => setFormData(prev => ({ ...prev, maxRunSeconds: parseInt(e.target.value) || 45 }))}
                  min={10}
                  max={55}
                  className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoQualify}
                    onChange={e => setFormData(prev => ({ ...prev, autoQualify: e.target.checked }))}
                    className="w-4 h-4 text-[#D4AF37] rounded border-slate-300 focus:ring-[#D4AF37]"
                  />
                  <span className="text-sm text-slate-700">自动合格化</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoEnrich}
                    onChange={e => setFormData(prev => ({ ...prev, autoEnrich: e.target.checked }))}
                    className="w-4 h-4 text-[#D4AF37] rounded border-slate-300 focus:ring-[#D4AF37]"
                  />
                  <span className="text-sm text-slate-700">自动补全</span>
                </label>
              </div>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E0D0] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0B1B2B] text-[#D4AF37] rounded-lg text-sm font-medium hover:bg-[#10263B] disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {profile ? '保存更改' : '创建计划'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function RadarProfilesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<RadarSearchProfileData[]>([]);
  const [segments, setSegments] = useState<ICPSegmentData[]>([]);
  const [sources, setSources] = useState<RadarSourceData[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RadarSearchProfileData | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profilesData, segmentsData, sourcesData] = await Promise.all([
        getRadarSearchProfiles(),
        getICPSegments(),
        getRadarSourcesV2(),
      ]);
      setProfiles(profilesData);
      setSegments(segmentsData);
      setSources(sourcesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 创建/更新
  const handleSave = async (data: CreateRadarSearchProfileInput) => {
    if (editingProfile) {
      await updateRadarSearchProfile(editingProfile.id, data);
    } else {
      await createRadarSearchProfile(data);
    }
    await loadData();
    setEditingProfile(null);
  };

  // 切换状态
  const handleToggle = async (profileId: string) => {
    setTogglingId(profileId);
    try {
      await toggleRadarSearchProfileActive(profileId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setTogglingId(null);
    }
  };

  // 删除
  const handleDelete = async (profileId: string) => {
    if (!confirm('确定要删除此扫描计划吗？相关的游标状态也会被清除。')) return;
    try {
      await deleteRadarSearchProfile(profileId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
    setActionMenuId(null);
  };

  // 手动触发
  const handleTrigger = async (profileId: string) => {
    setTriggeringId(profileId);
    try {
      const result = await triggerRadarSearchProfileScan(profileId);
      if (!result.success) {
        setError(result.message);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '触发失败');
    } finally {
      setTriggeringId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)'}} className="rounded-2xl p-6 relative overflow-hidden">
        <div style={{background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)'}} className="absolute inset-0 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">扫描计划</h1>
            <p className="text-sm text-slate-400 mt-1">配置 24/7 持续扫描任务，自动发现潜在客户</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
              title="刷新"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => { setEditingProfile(null); setShowForm(true); }}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all"
              style={{background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)'}}
            >
              <Plus size={16} />
              新建计划
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '总计划数', value: profiles.length, icon: CalendarClock, color: 'text-[#D4AF37]' },
          { label: '运行中', value: profiles.filter(p => p.isActive).length, icon: Play, color: 'text-emerald-500' },
          { label: '已暂停', value: profiles.filter(p => !p.isActive).length, icon: Pause, color: 'text-slate-400' },
          { label: '正在扫描', value: profiles.filter(p => p.lockToken).length, icon: Loader2, color: 'text-amber-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Profiles List */}
      <div className="space-y-3">
        {profiles.length === 0 ? (
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
              <CalendarClock size={28} className="text-[#D4AF37]" />
            </div>
            <p className="text-slate-500">暂无扫描计划</p>
            <p className="text-xs text-slate-400 mt-2">创建计划以启动 24/7 持续扫描</p>
            <button
              onClick={() => { setEditingProfile(null); setShowForm(true); }}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all"
              style={{background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)'}}
            >
              创建第一个计划
            </button>
          </div>
        ) : (
          profiles.map(profile => {
            const isLocked = !!profile.lockToken;
            const stats = profile.runStats;
            
            return (
              <div
                key={profile.id}
                className={`bg-[#FFFCF7] rounded-xl border ${
                  profile.isActive ? 'border-[#E8E0D0]' : 'border-slate-200 opacity-60'
                } p-5 transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[#0B1B2B] truncate">{profile.name}</h3>
                      
                      {/* Status Badge */}
                      {isLocked ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" />
                          扫描中
                        </span>
                      ) : profile.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          运行中
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full flex items-center gap-1">
                          <Pause size={10} />
                          已暂停
                        </span>
                      )}
                      
                      {/* Segment */}
                      {profile.segment && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded-full">
                          {profile.segment.name}
                        </span>
                      )}
                    </div>
                    
                    {profile.description && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-1">{profile.description}</p>
                    )}
                    
                    {/* Schedule & Stats Row */}
                    <div className="flex items-center gap-6 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={12} />
                        <span>{parseScheduleRule(profile.scheduleRule)}</span>
                      </div>
                      
                      {profile.nextRunAt && profile.isActive && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <ChevronRight size={12} />
                          <span>下次: {formatRelativeTime(new Date(profile.nextRunAt))}</span>
                        </div>
                      )}
                      
                      {profile.lastRunAt && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span>上次: {formatRelativeTime(new Date(profile.lastRunAt))}</span>
                        </div>
                      )}
                      
                      {stats?.totalRuns !== undefined && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <BarChart3 size={12} />
                          <span>{stats.totalRuns} 次运行</span>
                          {stats.totalNew !== undefined && <span>/ {stats.totalNew} 新增</span>}
                        </div>
                      )}
                      
                      {profile._count?.cursors !== undefined && profile._count.cursors > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span>{profile._count.cursors} 个游标</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Error */}
                    {stats?.lastError && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                        <XCircle size={12} />
                        <span className="truncate">{stats.lastError}</span>
                      </div>
                    )}
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {profile.enabledChannels.slice(0, 3).map(ch => (
                        <span key={ch} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">
                          {CHANNEL_TYPES.find(c => c.value === ch)?.label || ch}
                        </span>
                      ))}
                      {profile.enabledChannels.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{profile.enabledChannels.length - 3}</span>
                      )}
                      
                      {profile.targetCountries.slice(0, 5).map(c => (
                        <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] rounded">
                          {c}
                        </span>
                      ))}
                      {profile.targetCountries.length > 5 && (
                        <span className="text-[10px] text-slate-400">+{profile.targetCountries.length - 5}</span>
                      )}
                      
                      {profile.autoQualify && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-500 text-[10px] rounded">自动合格化</span>
                      )}
                      {profile.autoEnrich && (
                        <span className="px-2 py-0.5 bg-cyan-50 text-cyan-500 text-[10px] rounded">自动补全</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(profile.id)}
                      disabled={togglingId === profile.id}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        profile.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      } ${togglingId === profile.id ? 'opacity-50' : ''}`}
                      title={profile.isActive ? '点击暂停' : '点击启用'}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        profile.isActive ? 'left-6' : 'left-1'
                      }`} />
                    </button>
                    
                    {/* Trigger Button */}
                    <button
                      onClick={() => handleTrigger(profile.id)}
                      disabled={triggeringId === profile.id || isLocked}
                      className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors disabled:opacity-50"
                      title="立即触发扫描"
                    >
                      {triggeringId === profile.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    
                    {/* More Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === profile.id ? null : profile.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {actionMenuId === profile.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-[#FFFCF7] rounded-lg shadow-lg border border-[#E8E0D0] py-1 z-10">
                          <button
                            onClick={() => {
                              setEditingProfile(profile);
                              setShowForm(true);
                              setActionMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#F0EBD8] flex items-center gap-2"
                          >
                            <Pencil size={14} />
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(profile.id)}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Dialog */}
      {showForm && (
        <ProfileFormDialog
          profile={editingProfile}
          segments={segments}
          sources={sources}
          onClose={() => { setShowForm(false); setEditingProfile(null); }}
          onSave={handleSave}
        />
      )}
      
      {/* Click outside to close menu */}
      {actionMenuId && (
        <div className="fixed inset-0 z-0" onClick={() => setActionMenuId(null)} />
      )}
    </div>
  );
}
