"use client";

/**
 * 发现任务创建向导
 * 
 * 三步向导：
 * 1. 模板选择（按渠道类型）
 * 2. 参数配置（自动继承 + 可编辑）
 * 3. 执行模式（调度设置）
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Building2,
  MapPin,
  FileText,
  Users,
  Calendar,
  Loader2,
  CheckCircle2,
  Sparkles,
  Globe,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';
import { 
  createRadarSearchProfile, 
  getRadarSourcesV2,
  type CreateRadarSearchProfileInput,
} from '@/actions/radar-v2';

// ============================================
// 类型定义
// ============================================

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profileId: string) => void;
  /** 从知识引擎继承的数据 */
  inheritedData?: {
    targetIndustries?: string[];
    targetRegions?: string[];
    keywords?: string[];
    personaId?: string;
    segmentId?: string;
  };
}

interface SourceOption {
  id: string;
  code: string;
  name: string;
  channelType: string;
  description: string | null;
  isOfficial: boolean;
  countries: string[];
}

type TemplateType = 'TENDER' | 'MAPS' | 'DIRECTORY' | 'TRADESHOW' | 'CUSTOM';

interface Template {
  type: TemplateType;
  label: string;
  description: string;
  icon: React.ElementType;
  channels: string[];
}

// 模板定义
const TEMPLATES: Template[] = [
  {
    type: 'TENDER',
    label: '招标采购',
    description: '监控全球招标采购信息，发现政府和企业采购机会',
    icon: FileText,
    channels: ['TENDER'],
  },
  {
    type: 'MAPS',
    label: '地图发现',
    description: '基于地理位置发现目标企业，适合区域拓展',
    icon: MapPin,
    channels: ['MAPS'],
  },
  {
    type: 'DIRECTORY',
    label: '行业名录',
    description: '从行业协会、黄页等名录中发现潜在客户',
    icon: Building2,
    channels: ['DIRECTORY'],
  },
  {
    type: 'TRADESHOW',
    label: '展会参展商',
    description: '抓取行业展会参展商名单',
    icon: Users,
    channels: ['TRADESHOW'],
  },
  {
    type: 'CUSTOM',
    label: '自定义组合',
    description: '自由组合多个渠道，按需配置',
    icon: Sparkles,
    channels: [],
  },
];

// 常用国家/地区
const COMMON_COUNTRIES = [
  { code: 'US', name: '美国' },
  { code: 'DE', name: '德国' },
  { code: 'GB', name: '英国' },
  { code: 'FR', name: '法国' },
  { code: 'JP', name: '日本' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'CA', name: '加拿大' },
  { code: 'IT', name: '意大利' },
  { code: 'ES', name: '西班牙' },
  { code: 'NL', name: '荷兰' },
];

// 常用区域
const COMMON_REGIONS = [
  { code: 'EU', name: '欧盟' },
  { code: 'APAC', name: '亚太' },
  { code: 'LATAM', name: '拉美' },
  { code: 'MENA', name: '中东北非' },
  { code: 'NA', name: '北美' },
];

// 调度频率选项
const SCHEDULE_OPTIONS = [
  { value: '0 6 * * *', label: '每天早6点', description: '适合持续监控' },
  { value: '0 6 * * 1', label: '每周一早6点', description: '适合周期性扫描' },
  { value: '0 6 1 * *', label: '每月1日早6点', description: '适合月度检查' },
  { value: '', label: '仅运行一次', description: '适合临时任务' },
];

// ============================================
// 主组件
// ============================================

export function CreateDiscoveryWizard({ 
  isOpen, 
  onClose, 
  onSuccess,
  inheritedData,
}: WizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sources, setSources] = useState<SourceOption[]>([]);
  
  // 表单状态
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [formData, setFormData] = useState<CreateRadarSearchProfileInput>({
    name: '',
    description: '',
    keywords: { en: [], zh: [] },
    targetCountries: [],
    targetRegions: [],
    industryCodes: [],
    enabledChannels: [],
    sourceIds: [],
    scheduleRule: '0 6 * * *',
    maxRunSeconds: 45,
    autoQualify: true,
    autoEnrich: false,
  });

  // 新关键词输入
  const [newKeyword, setNewKeyword] = useState({ en: '', zh: '' });

  // 加载数据源
  const loadSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRadarSourcesV2();
      setSources(data.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        channelType: s.channelType,
        description: s.description,
        isOfficial: s.isOfficial,
        countries: s.countries,
      })));
    } catch (error) {
      console.error('Failed to load sources:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (isOpen) {
      loadSources();
      // 从继承数据初始化
      if (inheritedData) {
        setFormData(prev => ({
          ...prev,
          targetCountries: inheritedData.targetRegions || [],
          industryCodes: inheritedData.targetIndustries || [],
          keywords: {
            en: inheritedData.keywords || [],
            zh: [],
          },
          personaId: inheritedData.personaId,
          segmentId: inheritedData.segmentId,
        }));
      }
    }
  }, [isOpen, loadSources, inheritedData]);

  // 选择模板后更新渠道
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template.type);
    
    // 自动选择对应渠道的数据源
    if (template.channels.length > 0) {
      const matchingSources = sources.filter(s => 
        template.channels.includes(s.channelType)
      );
      setFormData(prev => ({
        ...prev,
        enabledChannels: template.channels,
        sourceIds: matchingSources.map(s => s.id),
        name: `${template.label}发现任务`,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        enabledChannels: [],
        sourceIds: [],
        name: '自定义发现任务',
      }));
    }
    
    setStep(2);
  };

  // 添加关键词
  const handleAddKeyword = (lang: 'en' | 'zh') => {
    const keyword = newKeyword[lang].trim();
    if (!keyword) return;
    
    setFormData(prev => ({
      ...prev,
      keywords: {
        ...prev.keywords,
        [lang]: [...(prev.keywords?.[lang] || []), keyword],
      },
    }));
    setNewKeyword(prev => ({ ...prev, [lang]: '' }));
  };

  // 移除关键词
  const handleRemoveKeyword = (lang: 'en' | 'zh', index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: {
        ...prev.keywords,
        [lang]: (prev.keywords?.[lang] || []).filter((_, i) => i !== index),
      },
    }));
  };

  // 切换国家选择
  const toggleCountry = (code: string) => {
    setFormData(prev => ({
      ...prev,
      targetCountries: prev.targetCountries?.includes(code)
        ? prev.targetCountries.filter(c => c !== code)
        : [...(prev.targetCountries || []), code],
    }));
  };

  // 切换区域选择
  const toggleRegion = (code: string) => {
    setFormData(prev => ({
      ...prev,
      targetRegions: prev.targetRegions?.includes(code)
        ? prev.targetRegions.filter(r => r !== code)
        : [...(prev.targetRegions || []), code],
    }));
  };

  // 切换数据源选择
  const toggleSource = (sourceId: string) => {
    setFormData(prev => ({
      ...prev,
      sourceIds: prev.sourceIds?.includes(sourceId)
        ? prev.sourceIds.filter(s => s !== sourceId)
        : [...(prev.sourceIds || []), sourceId],
    }));
  };

  // 提交创建
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('请输入任务名称');
      return;
    }
    if (!formData.sourceIds || formData.sourceIds.length === 0) {
      alert('请至少选择一个数据源');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await createRadarSearchProfile(formData);
      onSuccess(profile.id);
      onClose();
      // 重置状态
      setStep(1);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert('创建失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // 获取当前模板可用的数据源
  const availableSources = selectedTemplate === 'CUSTOM'
    ? sources
    : sources.filter(s => formData.enabledChannels?.includes(s.channelType));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#F7F3EA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1B2B] flex items-center justify-center">
              <Search size={20} className="text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="font-bold text-[#0B1B2B]">创建发现任务</h2>
              <p className="text-xs text-slate-500">第 {step} 步 / 共 3 步</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-200">
          <div 
            className="h-full bg-[#D4AF37] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-[#D4AF37] animate-spin" />
            </div>
          ) : (
            <>
              {/* Step 1: Template Selection */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-[#0B1B2B] mb-4">选择发现模板</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {TEMPLATES.map((template) => (
                      <button
                        key={template.type}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-4 rounded-xl border border-slate-200 hover:border-[#D4AF37] hover:bg-[#F7F3EA] transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-[#D4AF37]/20 flex items-center justify-center transition-colors">
                            <template.icon size={20} className="text-slate-500 group-hover:text-[#D4AF37]" />
                          </div>
                          <h4 className="font-medium text-[#0B1B2B]">{template.label}</h4>
                        </div>
                        <p className="text-xs text-slate-500">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Parameters */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Task Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      任务名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入任务名称"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4AF37] text-sm"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      搜索关键词
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* English Keywords */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Globe size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500">英文</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {formData.keywords?.en?.map((kw, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs"
                            >
                              {kw}
                              <button onClick={() => handleRemoveKeyword('en', i)}>
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newKeyword.en}
                            onChange={(e) => setNewKeyword(prev => ({ ...prev, en: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword('en')}
                            placeholder="添加英文关键词"
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#D4AF37]"
                          />
                          <button
                            onClick={() => handleAddKeyword('en')}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            <Plus size={14} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                      {/* Chinese Keywords */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Globe size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500">中文</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {formData.keywords?.zh?.map((kw, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs"
                            >
                              {kw}
                              <button onClick={() => handleRemoveKeyword('zh', i)}>
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newKeyword.zh}
                            onChange={(e) => setNewKeyword(prev => ({ ...prev, zh: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword('zh')}
                            placeholder="添加中文关键词"
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#D4AF37]"
                          />
                          <button
                            onClick={() => handleAddKeyword('zh')}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            <Plus size={14} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target Countries */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      目标国家
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_COUNTRIES.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => toggleCountry(country.code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            formData.targetCountries?.includes(country.code)
                              ? 'bg-[#D4AF37] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {country.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Regions */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      目标区域
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_REGIONS.map((region) => (
                        <button
                          key={region.code}
                          onClick={() => toggleRegion(region.code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            formData.targetRegions?.includes(region.code)
                              ? 'bg-[#0B1B2B] text-[#D4AF37]'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Sources */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      数据源 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                      {availableSources.length > 0 ? (
                        availableSources.map((source) => (
                          <button
                            key={source.id}
                            onClick={() => toggleSource(source.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                              formData.sourceIds?.includes(source.id)
                                ? 'bg-[#D4AF37]/20 border border-[#D4AF37]'
                                : 'bg-white border border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {formData.sourceIds?.includes(source.id) ? (
                              <CheckCircle2 size={16} className="text-[#D4AF37] shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-[#0B1B2B] truncate">{source.name}</div>
                              {source.isOfficial && (
                                <span className="text-[10px] text-emerald-600">官方</span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                          暂无可用数据源
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Schedule */}
              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="font-bold text-[#0B1B2B] mb-4">执行模式设置</h3>

                  {/* Schedule Rule */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      调度频率
                    </label>
                    <div className="space-y-2">
                      {SCHEDULE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFormData(prev => ({ ...prev, scheduleRule: option.value }))}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            formData.scheduleRule === option.value
                              ? 'border-[#D4AF37] bg-[#F7F3EA]'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {formData.scheduleRule === option.value ? (
                            <CheckCircle2 size={18} className="text-[#D4AF37] shrink-0" />
                          ) : (
                            <Clock size={18} className="text-slate-400 shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-[#0B1B2B]">{option.label}</div>
                            <div className="text-xs text-slate-500">{option.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Options */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      自动化选项
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formData.autoQualify}
                          onChange={(e) => setFormData(prev => ({ ...prev, autoQualify: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                        />
                        <div>
                          <div className="text-sm font-medium text-[#0B1B2B]">自动合格化</div>
                          <div className="text-xs text-slate-500">使用 AI 自动评估候选质量并分层</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formData.autoEnrich}
                          onChange={(e) => setFormData(prev => ({ ...prev, autoEnrich: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                        />
                        <div>
                          <div className="text-sm font-medium text-[#0B1B2B]">自动补全详情</div>
                          <div className="text-xs text-slate-500">自动调用 API 获取候选详细信息</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Max Run Time */}
                  <div>
                    <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                      单次扫描时间上限
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={15}
                        max={60}
                        step={5}
                        value={formData.maxRunSeconds}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxRunSeconds: Number(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-slate-600 w-16 text-right">
                        {formData.maxRunSeconds} 秒
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      建议保持在 45 秒以内，避免超时
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-[#F7F3EA] rounded-xl p-4">
                    <h4 className="text-sm font-medium text-[#0B1B2B] mb-3">任务摘要</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">任务名称</span>
                        <span className="text-[#0B1B2B] font-medium">{formData.name || '未命名'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">数据源</span>
                        <span className="text-[#0B1B2B] font-medium">{formData.sourceIds?.length || 0} 个</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">目标国家</span>
                        <span className="text-[#0B1B2B] font-medium">{formData.targetCountries?.length || 0} 个</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">关键词</span>
                        <span className="text-[#0B1B2B] font-medium">
                          {(formData.keywords?.en?.length || 0) + (formData.keywords?.zh?.length || 0)} 个
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-[#0B1B2B] transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 1 ? '取消' : '上一步'}
          </button>
          
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedTemplate}
              className="flex items-center gap-2 px-6 py-2 bg-[#0B1B2B] text-[#D4AF37] rounded-xl font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] text-[#0B1B2B] rounded-xl font-medium hover:bg-[#E0C04A] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  创建并启动
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
