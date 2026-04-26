"use client";

/**
 * 目标客户画像配置组件
 *
 * 允许用户自定义评分规则，控制获客雷达的候选评分逻辑
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, RotateCcw,
  Target, XCircle, CheckCircle, Sparkles,
  AlertCircle, Zap, Globe, Phone, Mail
} from 'lucide-react';
import {
  getScoringProfile, saveScoringProfile, resetScoringProfile,
  addPositiveSignal, deletePositiveSignal,
  addNegativeSignal, deleteNegativeSignal,
  updateThresholds
} from '@/actions/scoring-profile';
import type { ScoringProfile, ScoringSignal, ExclusionSignal } from '@/types/scoring-profile';
import { DEFAULT_SCORING_PROFILE, SCORING_TEMPLATES } from '@/types/scoring-profile';

interface Props {
  segmentId?: string;
  onSaveSuccess?: () => void;
}

export function ScoringProfileConfig({ segmentId, onSaveSuccess }: Props) {
  const [profile, setProfile] = useState<ScoringProfile>(DEFAULT_SCORING_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showAddPositive, setShowAddPositive] = useState(false);
  const [showAddNegative, setShowAddNegative] = useState(false);

  // 新信号表单
  const [newPositiveSignal, setNewPositiveSignal] = useState<Omit<ScoringSignal, 'id'>>({
    name: '',
    keywords: [],
    weight: 3,
    description: '',
    category: '',
  });
  const [newNegativeSignal, setNewNegativeSignal] = useState<Omit<ExclusionSignal, 'id'>>({
    name: '',
    keywords: [],
    description: '',
    category: '',
  });
  const [keywordInput, setKeywordInput] = useState('');

  // 加载配置
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getScoringProfile(segmentId);
      setProfile(data);
    } catch (e) {
      console.error('Failed to load scoring profile:', e);
      setMessage({ type: 'error', text: '加载配置失败' });
    } finally {
      setIsLoading(false);
    }
  }, [segmentId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 保存配置
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await saveScoringProfile(profile, segmentId);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        onSaveSuccess?.();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 重置为默认
  const handleReset = async () => {
    if (!confirm('确定要重置为默认配置吗？您的自定义规则将被清除。')) return;
    setIsSaving(true);
    try {
      await resetScoringProfile(segmentId);
      setProfile(DEFAULT_SCORING_PROFILE);
      setMessage({ type: 'success', text: '已重置为默认配置' });
    } catch {
      setMessage({ type: 'error', text: '重置失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 应用模板
  const handleApplyTemplate = async (templateId: string) => {
    const template = SCORING_TEMPLATES[templateId];
    if (!template) return;
    if (!confirm(`确定要应用"${template.name}"模板吗？当前配置将被覆盖。`)) return;
    setIsSaving(true);
    try {
      const { applyScoringTemplate } = await import('@/actions/scoring-profile');
      const result = await applyScoringTemplate(templateId, segmentId);
      if (result.success) {
        setProfile(template.profile);
        setMessage({ type: 'success', text: `已应用模板: ${template.name}` });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch {
      setMessage({ type: 'error', text: '应用模板失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 添加正向信号
  const handleAddPositive = async () => {
    if (!newPositiveSignal.name || newPositiveSignal.keywords.length === 0) {
      setMessage({ type: 'error', text: '请填写信号名称和关键词' });
      return;
    }
    setIsSaving(true);
    try {
      const result = await addPositiveSignal(newPositiveSignal, segmentId);
      if (result.success && result.signal) {
        setProfile(prev => ({
          ...prev,
          positiveSignals: [...prev.positiveSignals, result.signal!],
        }));
        setShowAddPositive(false);
        setNewPositiveSignal({ name: '', keywords: [], weight: 3, description: '', category: '' });
        setKeywordInput('');
        setMessage({ type: 'success', text: '信号已添加' });
      } else {
        setMessage({ type: 'error', text: result.message || '添加失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '添加失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 删除正向信号
  const handleDeletePositive = async (signalId: string) => {
    if (!confirm('确定要删除这个信号吗？')) return;
    setIsSaving(true);
    try {
      await deletePositiveSignal(signalId, segmentId);
      setProfile(prev => ({
        ...prev,
        positiveSignals: prev.positiveSignals.filter(s => s.id !== signalId),
      }));
      setMessage({ type: 'success', text: '信号已删除' });
    } catch {
      setMessage({ type: 'error', text: '删除失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 添加负向信号
  const handleAddNegative = async () => {
    if (!newNegativeSignal.name || newNegativeSignal.keywords.length === 0) {
      setMessage({ type: 'error', text: '请填写信号名称和关键词' });
      return;
    }
    setIsSaving(true);
    try {
      const result = await addNegativeSignal(newNegativeSignal, segmentId);
      if (result.success && result.signal) {
        setProfile(prev => ({
          ...prev,
          negativeSignals: [...prev.negativeSignals, result.signal!],
        }));
        setShowAddNegative(false);
        setNewNegativeSignal({ name: '', keywords: [], description: '', category: '' });
        setKeywordInput('');
        setMessage({ type: 'success', text: '排除规则已添加' });
      } else {
        setMessage({ type: 'error', text: result.message || '添加失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '添加失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 删除负向信号
  const handleDeleteNegative = async (signalId: string) => {
    if (!confirm('确定要删除这个排除规则吗？')) return;
    setIsSaving(true);
    try {
      await deleteNegativeSignal(signalId, segmentId);
      setProfile(prev => ({
        ...prev,
        negativeSignals: prev.negativeSignals.filter(s => s.id !== signalId),
      }));
      setMessage({ type: 'success', text: '排除规则已删除' });
    } catch {
      setMessage({ type: 'error', text: '删除失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 更新阈值
  const handleThresholdChange = async (field: 'tierA' | 'tierB', value: number) => {
    const newThresholds = { ...profile.thresholds, [field]: value };
    setProfile(prev => ({ ...prev, thresholds: newThresholds }));

    setIsSaving(true);
    try {
      await updateThresholds(newThresholds, segmentId);
      setMessage({ type: 'success', text: '阈值已更新' });
    } catch {
      setMessage({ type: 'error', text: '更新失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 解析关键词输入
  const parseKeywords = (input: string): string[] => {
    return input.split(/[,，\n]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ci-accent)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* 快捷模板 */}
      <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--ci-accent)]" />
          <span className="text-sm font-medium text-white">快速开始：选择预设模板</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SCORING_TEMPLATES).map(([id, template]) => (
            <button
              key={id}
              onClick={() => handleApplyTemplate(id)}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* 正向信号配置 */}
      <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">正向信号（加分项）</span>
            <span className="text-xs text-white/50">匹配这些关键词会增加评分</span>
          </div>
          <button
            onClick={() => setShowAddPositive(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
          >
            <Plus className="w-3 h-3" />
            添加信号
          </button>
        </div>

        <div className="space-y-2">
          {profile.positiveSignals.map(signal => (
            <div key={signal.id} className="p-3 rounded bg-white/5 border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{signal.name}</span>
                    <span className="px-1.5 py-0.5 text-xs rounded bg-[var(--ci-accent)]/20 text-[var(--ci-accent)]">
                      +{signal.weight}分
                    </span>
                    {signal.category && (
                      <span className="text-xs text-white/40">{signal.category}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {signal.keywords.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-white/70">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePositive(signal.id)}
                  className="p-1 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 添加正向信号表单 */}
        {showAddPositive && (
          <div className="mt-3 p-3 rounded bg-green-500/10 border border-green-500/20">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">信号名称</label>
                  <input
                    type="text"
                    value={newPositiveSignal.name}
                    onChange={e => setNewPositiveSignal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：制造商信号"
                    className="w-full px-2 py-1.5 text-sm rounded bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--ci-accent)]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">加分权重</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newPositiveSignal.weight}
                    onChange={e => setNewPositiveSignal(prev => ({ ...prev, weight: parseInt(e.target.value) || 1 }))}
                    className="w-full px-2 py-1.5 text-sm rounded bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[var(--ci-accent)]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">关键词（用逗号或换行分隔）</label>
                <textarea
                  value={keywordInput}
                  onChange={e => {
                    setKeywordInput(e.target.value);
                    setNewPositiveSignal(prev => ({ ...prev, keywords: parseKeywords(e.target.value) }));
                  }}
                  placeholder="manufacturing, factory, mfg"
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm rounded bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--ci-accent)]/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddPositive(false); setKeywordInput(''); }}
                  className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddPositive}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs rounded bg-green-500/30 hover:bg-green-500/40 text-green-300 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 负向信号配置 */}
      <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-white">负向信号（排除项）</span>
            <span className="text-xs text-white/50">匹配这些关键词会被直接排除</span>
          </div>
          <button
            onClick={() => setShowAddNegative(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            <Plus className="w-3 h-3" />
            添加排除
          </button>
        </div>

        <div className="space-y-2">
          {profile.negativeSignals.map(signal => (
            <div key={signal.id} className="p-3 rounded bg-white/5 border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{signal.name}</span>
                    {signal.category && (
                      <span className="text-xs text-white/40">{signal.category}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {signal.keywords.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteNegative(signal.id)}
                  className="p-1 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 添加负向信号表单 */}
        {showAddNegative && (
          <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/20">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">排除规则名称</label>
                <input
                  type="text"
                  value={newNegativeSignal.name}
                  onChange={e => setNewNegativeSignal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：零售商"
                  className="w-full px-2 py-1.5 text-sm rounded bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">关键词（用逗号或换行分隔）</label>
                <textarea
                  value={keywordInput}
                  onChange={e => {
                    setKeywordInput(e.target.value);
                    setNewNegativeSignal(prev => ({ ...prev, keywords: parseKeywords(e.target.value) }));
                  }}
                  placeholder="supply, shop, retail"
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm rounded bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddNegative(false); setKeywordInput(''); }}
                  className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddNegative}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs rounded bg-red-500/30 hover:bg-red-500/40 text-red-300 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 阈值和联系方式评分 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 层级阈值 */}
        <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[var(--ci-accent)]" />
            <span className="text-sm font-medium text-white">层级阈值</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">A级阈值（优质客户）</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={profile.thresholds.tierA}
                  onChange={e => handleThresholdChange('tierA', parseInt(e.target.value) || 8)}
                  className="w-16 px-2 py-1 text-sm text-center rounded bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[var(--ci-accent)]/50"
                />
                <span className="text-xs text-white/50">分</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">B级阈值（潜力客户）</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={profile.thresholds.tierB}
                  onChange={e => handleThresholdChange('tierB', parseInt(e.target.value) || 5)}
                  className="w-16 px-2 py-1 text-sm text-center rounded bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[var(--ci-accent)]/50"
                />
                <span className="text-xs text-white/50">分</span>
              </div>
            </div>
            <p className="text-xs text-white/40">
              评分 ≥ A级阈值为A级客户，≥ B级阈值为B级，否则为C级
            </p>
          </div>
        </div>

        {/* 联系方式评分 */}
        <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-[var(--ci-accent)]" />
            <span className="text-sm font-medium text-white">联系方式加分</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-white/50" />
                <span className="text-sm text-white/70">有网站</span>
              </div>
              <span className="text-sm text-[var(--ci-accent)]">+{profile.contactScoring.hasWebsite}分</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white/50" />
                <span className="text-sm text-white/70">有电话</span>
              </div>
              <span className="text-sm text-[var(--ci-accent)]">+{profile.contactScoring.hasPhone}分</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white/50" />
                <span className="text-sm text-white/70">有邮箱</span>
              </div>
              <span className="text-sm text-[var(--ci-accent)]">+{profile.contactScoring.hasEmail}分</span>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重置为默认
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ci-accent)] hover:bg-[var(--ci-accent)]/90 text-[#0B1018] font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-[#0B1018]/30 border-t-[#0B1018] rounded-full animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              保存配置
            </>
          )}
        </button>
      </div>
    </div>
  );
}
