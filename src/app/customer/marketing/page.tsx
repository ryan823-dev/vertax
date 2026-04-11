"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  FileText, 
  PenTool, 
  Search, 
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  X,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  Send,
  Tag,
  ChevronRight,
  ArrowRight,
  Globe,
  ExternalLink,
  RotateCcw,
  Timer,
} from 'lucide-react';
import {
  getContents,
  getMarketingStats,
  generateKeywords,
  generateContent,
  saveContent,
  updateContentStatus,
  deleteContent,
  type ContentData,
  type MarketingStats,
  type KeywordSuggestion,
} from '@/actions/marketing';
import { getGrowthPipelineStatus } from '@/actions/growth-pipeline';
import {
  pushContentToWebsite,
  getPushRecords,
  confirmPushRecord,
  retryPush,
  getWebsiteConfig,
} from '@/actions/publishing';
import type { PushRecordData, WebsiteConfigData } from '@/actions/publishing.types';
import { SkillStreamPanel, SkillStreamTrigger } from '@/components/skills';
import { SKILL_NAMES } from '@/lib/skills/registry';

type ViewMode = 'list' | 'create' | 'detail';

export default function MarketingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<ContentData[]>([]);
  const [stats, setStats] = useState<MarketingStats>({ totalContents: 0, published: 0, draft: 0, scheduled: 0, awaitingPublish: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedContent, setSelectedContent] = useState<ContentData | null>(null);

  // 创建内容状态
  const [keywordTopic, setKeywordTopic] = useState('');
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'article' | 'product' | 'case'>('article');
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    metaTitle: string;
    metaDescription: string;
  } | null>(null);

  // 推送状态
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteConfigData | null>(null);
  const [pushRecords, setPushRecords] = useState<PushRecordData[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [seoHealthScore, setSeoHealthScore] = useState(0);
  const [geoCount, setGeoCount] = useState(0);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contentsData, statsData, configData, pushData, pipelineData] = await Promise.all([
        getContents(),
        getMarketingStats(),
        getWebsiteConfig(),
        getPushRecords(),
        getGrowthPipelineStatus().catch(() => null),
      ]);
      setContents(contentsData);
      setStats(statsData);
      setWebsiteConfig(configData);
      setPushRecords(pushData);
      if (pipelineData) {
        setSeoHealthScore(pipelineData.counts.seoHealthScore);
        setGeoCount(pipelineData.counts.geoMentionCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 生成关键词
  const handleGenerateKeywords = async () => {
    if (!keywordTopic.trim()) return;
    
    setIsGeneratingKeywords(true);
    setError(null);
    try {
      const result = await generateKeywords(keywordTopic);
      setKeywords(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '关键词生成失败');
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  // 生成内容
  const _handleGenerateContent = async () => {
    if (!selectedKeyword) return;
    
    setIsGeneratingContent(true);
    setError(null);
    try {
      const result = await generateContent(selectedKeyword, contentType);
      setGeneratedContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '内容生成失败');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // 保存内容
  const handleSaveContent = async (status: 'draft' | 'published') => {
    if (!generatedContent) return;
    
    try {
      const saved = await saveContent({
        title: generatedContent.title,
        content: generatedContent.content,
        metaTitle: generatedContent.metaTitle,
        metaDescription: generatedContent.metaDescription,
        keywords: selectedKeyword ? [selectedKeyword] : [],
        status,
      });
      setContents(prev => [saved, ...prev]);
      setStats(prev => ({
        ...prev,
        totalContents: prev.totalContents + 1,
        [status === 'published' ? 'published' : 'draft']: prev[status === 'published' ? 'published' : 'draft'] + 1,
      }));
      // 重置创建表单
      setViewMode('list');
      setKeywordTopic('');
      setKeywords([]);
      setSelectedKeyword(null);
      setGeneratedContent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  // 更新状态
  const handleStatusChange = async (contentId: string, newStatus: string) => {
    try {
      const updated = await updateContentStatus(contentId, newStatus);
      if (updated) {
        setContents(prev => prev.map(c => c.id === contentId ? updated : c));
        if (selectedContent?.id === contentId) {
          setSelectedContent(updated);
        }
      }
    } catch {
      setError('更新状态失败');
    }
  };

  // 删除内容
  const handleDelete = async (contentId: string) => {
    if (!confirm('确定删除此内容？')) return;
    try {
      await deleteContent(contentId);
      setContents(prev => prev.filter(c => c.id !== contentId));
      setStats(prev => ({ ...prev, totalContents: prev.totalContents - 1 }));
      if (selectedContent?.id === contentId) {
        setSelectedContent(null);
      }
    } catch {
      setError('删除失败');
    }
  };

  // 推送到官网
  const handlePushToWebsite = async (contentId: string) => {
    setIsPushing(true);
    setError(null);
    try {
      const result = await pushContentToWebsite(contentId);
      if (result.success) {
        // 刷新推送记录
        const freshRecords = await getPushRecords();
        setPushRecords(freshRecords);
        // 刷新内容列表（状态可能变为 published）
        const freshContents = await getContents();
        setContents(freshContents);
        if (selectedContent?.id === contentId) {
          const updated = freshContents.find(c => c.id === contentId);
          if (updated) setSelectedContent(updated);
        }
      } else {
        setError(result.error || '推送失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '推送失败');
    } finally {
      setIsPushing(false);
    }
  };

  // 确认推送
  const handleConfirmPush = async (recordId: string) => {
    const result = await confirmPushRecord(recordId);
    if (result.success) {
      const freshRecords = await getPushRecords();
      setPushRecords(freshRecords);
    }
  };

  // 重试推送
  const handleRetryPush = async (recordId: string) => {
    setIsPushing(true);
    try {
      const result = await retryPush(recordId);
      if (!result.success) setError(result.error || '重试失败');
      const freshRecords = await getPushRecords();
      setPushRecords(freshRecords);
    } finally {
      setIsPushing(false);
    }
  };

  // 获取内容的推送记录
  const getPushRecordForContent = (contentId: string) => {
    return pushRecords.find(r => r.contentId === contentId);
  };

  // 获取状态标签
  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: typeof Clock }> = {
      draft: { label: '草稿', color: 'bg-slate-100 text-slate-600', icon: Edit2 },
      published: { label: '已发布', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
      scheduled: { label: '已排期', color: 'bg-blue-50 text-blue-600', icon: Clock },
    };
    return map[status] || { label: status, color: 'bg-slate-100 text-slate-600', icon: FileText };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header - 指令台 */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">增长系统</h1>
            <p className="text-sm text-slate-400 mt-1">SEO内容生产与分发</p>
          </div>
          <div className="flex items-center gap-3">
            {viewMode === 'list' ? (
              <button 
                onClick={() => setViewMode('create')}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
              >
                <PenTool size={16} />
                创建内容
              </button>
            ) : (
              <button 
                onClick={() => {
                  setViewMode('list');
                  setKeywords([]);
                  setSelectedKeyword(null);
                  setGeneratedContent(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: '#0B1220', color: '#D4AF37' }}
              >
                返回列表
              </button>
            )}
            <button 
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: '内容资产', value: stats.totalContents, icon: FileText, color: 'text-[#D4AF37]', href: undefined, dark: false },
          { label: '已发布', value: stats.published, icon: CheckCircle2, color: 'text-emerald-500', href: undefined, dark: false },
          { label: '草稿', value: stats.draft, icon: Edit2, color: 'text-slate-500', href: undefined, dark: false },
          { label: '已排期', value: stats.scheduled, icon: Clock, color: 'text-blue-500', href: undefined, dark: false },
          { label: 'SEO 健康分', value: seoHealthScore, icon: BarChart3, color: 'text-[#D4AF37]', href: '/customer/marketing/seo-aeo', dark: true },
          { label: 'GEO 版本', value: geoCount, icon: Globe, color: 'text-[#D4AF37]', href: '/customer/marketing/geo-center', dark: true },
        ].map((stat) => {
          const content = (
            <div key={stat.label} className="rounded-xl p-4 border transition-all hover:scale-[1.01]" style={
              stat.dark
                ? { background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 70%, #0D1525 100%)', border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' }
                : { background: '#F7F3E8', border: '1px solid #E8E0D0' }
            }>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} className={stat.color} />
                <span className={`text-xs ${stat.dark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.dark ? 'text-[#D4AF37]' : 'text-[#0B1B2B]'}`}>{stat.value}</p>
            </div>
          );
          return stat.href
            ? <Link key={stat.label} href={stat.href}>{content}</Link>
            : <div key={stat.label}>{content}</div>;
        })}
      </div>

      {/* Content Area */}
      {viewMode === 'create' ? (
        <div className="grid grid-cols-2 gap-6">
          {/* Step 1: Keyword Research */}
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0B1B2B] text-[#D4AF37] rounded-full text-xs flex items-center justify-center">1</span>
              关键词规划
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">输入主题或产品名称</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordTopic}
                    onChange={(e) => setKeywordTopic(e.target.value)}
                    placeholder="例如：工业机器人、激光切割机..."
                    className="flex-1 px-4 py-2.5 border border-[#E8E0D0] rounded-xl text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    onClick={handleGenerateKeywords}
                    disabled={!keywordTopic.trim() || isGeneratingKeywords}
                    className="px-4 py-2.5 bg-[#0B1B2B] text-[#D4AF37] rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGeneratingKeywords ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    分析
                  </button>
                </div>
              </div>

              {/* Keywords List */}
              {keywords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">选择目标关键词：</p>
                  {keywords.map((kw, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedKeyword(kw.keyword)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all ${
                        selectedKeyword === kw.keyword
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                          : 'border-[#E8E0D0] hover:border-[#D4AF37]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#0B1B2B] text-sm">{kw.keyword}</span>
                        {selectedKeyword === kw.keyword && (
                          <CheckCircle2 size={16} className="text-[#D4AF37]" />
                        )}
                      </div>
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                          搜索量：{kw.searchVolume}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded">
                          难度：{kw.difficulty}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                          意图：{kw.intent}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Content Type */}
              {selectedKeyword && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">选择内容类型：</p>
                  <div className="flex gap-2">
                    {[
                      { value: 'article', label: 'SEO文章' },
                      { value: 'product', label: '产品页' },
                      { value: 'case', label: '案例页' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setContentType(type.value as 'article' | 'product' | 'case')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          contentType === type.value
                            ? 'bg-[#0B1B2B] text-[#D4AF37]'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 跳转 Brief 流程 */}
              {selectedKeyword && (
                <Link
                  href={`/customer/marketing/briefs?keyword=${encodeURIComponent(selectedKeyword)}&type=${contentType}`}
                  className="w-full py-3 bg-gradient-to-r from-[#0B1B2B] to-[#152942] text-[#D4AF37] rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  用此关键词创建 Brief
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>

          {/* Step 2: Content Preview */}
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0B1B2B] text-[#D4AF37] rounded-full text-xs flex items-center justify-center">2</span>
              内容预览与发布
            </h3>

            {generatedContent ? (
              <div className="space-y-4">
                {/* SEO Meta */}
                <div className="p-3 bg-[#F0EBD8] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">SEO标题</p>
                  <p className="text-sm font-medium text-[#0B1B2B]">{generatedContent.metaTitle}</p>
                  <p className="text-xs text-slate-500 mt-2 mb-1">SEO描述</p>
                  <p className="text-xs text-slate-600">{generatedContent.metaDescription}</p>
                </div>

                {/* Content Preview */}
                <div>
                  <h4 className="text-lg font-bold text-[#0B1B2B] mb-2">{generatedContent.title}</h4>
                  <div className="max-h-[300px] overflow-y-auto prose prose-sm prose-slate">
                    <div className="text-sm text-slate-600 whitespace-pre-wrap">
                      {generatedContent.content.slice(0, 800)}
                      {generatedContent.content.length > 800 && '...'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-[#E8E0D0]">
                  <button
                    onClick={() => handleSaveContent('draft')}
                    className="flex-1 py-2.5 bg-[#0B1220] text-[#D4AF37] rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} />
                    保存草稿
                  </button>
                  <button
                    onClick={() => handleSaveContent('published')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                  >
                    <Send size={14} />
                    立即发布
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <PenTool size={28} className="text-[#D4AF37]" />
                </div>
                <p className="text-sm text-slate-500">选择关键词后点击&quot;AI生成内容&quot;</p>
                <p className="text-xs text-slate-400 mt-1">AI将根据企业画像生成优质SEO内容</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Content List */}
          <div className="col-span-2 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0]">
            <div className="px-6 py-4 border-b border-[#E8E0D0]" style={{ background: '#F0EBD8' }}>
              <h3 className="font-bold text-[#0B1B2B]">内容资产库</h3>
            </div>
            <div className="p-6">
            {contents.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <FileText size={28} className="text-[#D4AF37]" />
                </div>
                <p className="text-slate-400 mb-4">暂无内容资产</p>
                <button
                  onClick={() => setViewMode('create')}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                >
                  创建第一篇内容
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {contents.map((content) => {
                  const statusInfo = getStatusInfo(content.status);
                  return (
                    <div
                      key={content.id}
                      onClick={() => setSelectedContent(content)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedContent?.id === content.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                          : 'border-[#E8E0D0] hover:border-[#D4AF37]/50 bg-[#FFFCF7]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[#0B1B2B] truncate">{content.title}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          {content.metaDescription && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {content.metaDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            {content.categoryName && (
                              <span className="flex items-center gap-1">
                                <Tag size={10} />
                                {content.categoryName}
                              </span>
                            )}
                            <span>
                              {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 shrink-0 ml-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          {/* Content Detail */}
          <div className="col-span-1 space-y-4">
            {selectedContent ? (
              <>
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0B1B2B]">内容详情</h3>
                    <button
                      onClick={() => handleDelete(selectedContent.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h4 className="font-medium text-[#0B1B2B] mb-2">{selectedContent.title}</h4>
                  
                  {selectedContent.metaTitle && (
                    <div className="mb-3 p-2 bg-[#F0EBD8] rounded-lg">
                      <p className="text-[10px] text-slate-500">SEO标题</p>
                      <p className="text-xs text-[#0B1B2B]">{selectedContent.metaTitle}</p>
                    </div>
                  )}

                  {selectedContent.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedContent.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {selectedContent.content.slice(0, 500)}
                    {selectedContent.content.length > 500 && '...'}
                  </div>

                  {/* Status Actions */}
                  <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
                    <p className="text-xs text-slate-500 mb-2">更新状态</p>
                    <div className="flex flex-wrap gap-2">
                      {['draft', 'published'].map((status) => {
                        const info = getStatusInfo(status);
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(selectedContent.id, status)}
                            className={`px-3 py-1.5 text-xs rounded transition-all ${
                              selectedContent.status === status
                                ? `${info.color} ring-1 ring-current`
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {info.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI SEO优化 */}
                  <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
                    <button
                      onClick={async () => {
                        if (!selectedContent) return;
                        setIsGeneratingContent(true);
                        try {
                          const res = await fetch('/api/marketing/ai-seo', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'optimize',
                              data: {
                                content: selectedContent.content,
                                targetQuery: selectedContent.keywords?.[0] || selectedContent.title,
                                language: 'zh',
                              },
                            }),
                          });
                          const result = await res.json();
                          if (result.success) {
                            setGeneratedContent({
                              title: selectedContent.title,
                              content: result.data.optimizedContent,
                              metaTitle: selectedContent.metaTitle || '',
                              metaDescription: selectedContent.metaDescription || '',
                            });
                          }
                        } finally {
                          setIsGeneratingContent(false);
                        }
                      }}
                      disabled={isGeneratingContent}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-all"
                    >
                      <Search size={14} />
                      {isGeneratingContent ? 'AI优化中...' : 'AI SEO优化'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      优化内容以提高AI搜索引擎可见性
                    </p>
                  </div>
                </div>

                {/* 推送到官网 */}
                {websiteConfig && websiteConfig.isActive && (
                  <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                    <h3 className="font-bold text-[#0B1B2B] mb-3 flex items-center gap-2">
                      <Globe size={16} className="text-[#D4AF37]" />
                      推送到官网
                    </h3>

                    {(() => {
                      const pushRecord = getPushRecordForContent(selectedContent.id);

                      if (!pushRecord) {
                        // 未推送
                        return (
                          <div>
                            <p className="text-xs text-slate-500 mb-3">
                              将此内容推送到 {websiteConfig.url || '客户官网'}
                            </p>
                            <button
                              onClick={() => handlePushToWebsite(selectedContent.id)}
                              disabled={isPushing}
                              className="w-full py-2.5 bg-gradient-to-r from-[#0B1B2B] to-[#152942] text-[#D4AF37] rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-all"
                            >
                              {isPushing ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  推送中...
                                </>
                              ) : (
                                <>
                                  <Send size={14} />
                                  推送到官网
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }

                      // 有推送记录 - 显示状态
                      const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                        PENDING: { label: '已推送·等待确认', color: 'text-blue-600', bg: 'bg-blue-50' },
                        CONFIRMED: { label: '已确认发布', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        TIMEOUT: { label: '超时未确认', color: 'text-amber-600', bg: 'bg-amber-50' },
                        FAILED: { label: '推送失败', color: 'text-red-600', bg: 'bg-red-50' },
                        ESCALATED: { label: '已升级处理', color: 'text-purple-600', bg: 'bg-purple-50' },
                      };
                      const st = statusMap[pushRecord.status] || statusMap.PENDING;

                      return (
                        <div className="space-y-3">
                          {/* 状态标签 */}
                          <div className={`px-3 py-2 rounded-lg ${st.bg} flex items-center justify-between`}>
                            <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                            {pushRecord.status === 'PENDING' && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Timer size={10} />
                                {new Date(pushRecord.timeoutAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 前
                              </span>
                            )}
                          </div>

                          {/* 推送详情 */}
                          <div className="text-[10px] text-slate-400 space-y-1">
                            <div>推送时间: {new Date(pushRecord.pushedAt).toLocaleString('zh-CN')}</div>
                            {pushRecord.remoteSlug && (
                              <div>远程Slug: {pushRecord.remoteSlug}</div>
                            )}
                            {pushRecord.retryCount > 0 && (
                              <div>重试次数: {pushRecord.retryCount}</div>
                            )}
                            {pushRecord.lastError && (
                              <div className="text-red-400">错误: {pushRecord.lastError}</div>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-2">
                            {pushRecord.targetUrl && (
                              <a
                                href={pushRecord.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors"
                              >
                                <ExternalLink size={12} />
                                查看
                              </a>
                            )}
                            {(pushRecord.status === 'PENDING' || pushRecord.status === 'TIMEOUT') && (
                              <button
                                onClick={() => handleConfirmPush(pushRecord.id)}
                                className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 size={12} />
                                确认发布
                              </button>
                            )}
                            {(pushRecord.status === 'FAILED' || pushRecord.status === 'TIMEOUT') && (
                              <button
                                onClick={() => handleRetryPush(pushRecord.id)}
                                disabled={isPushing}
                                className="flex-1 py-2 bg-[#0B1B2B] text-[#D4AF37] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-[#10263B] transition-colors"
                              >
                                <RotateCcw size={12} />
                                重新推送
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* AI Skills Panel (流式) */}
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <SkillStreamPanel
                    engine="marketing"
                    entityType="ContentPiece"
                    entityId={selectedContent.id}
                    input={{ title: selectedContent.title, keywords: selectedContent.keywords }}
                    onSkillComplete={(skillName, versionId) => {
                      console.log(`Skill ${skillName} completed with version ${versionId}`);
                      loadData();
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <Eye size={28} className="text-[#D4AF37]" />
                  </div>
                  <p className="text-sm text-slate-400">选择内容查看详情</p>
                </div>
                {/* Quick verify — run on the most recent unpublished content */}
                {contents.filter((c) => c.status !== 'published').slice(0, 1).map((c) => (
                  <div key={c.id} className="rounded-2xl border border-[#E8E0D0] p-5 bg-[#F7F3E8]">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-[#0B1B2B]">快速证据校验</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      针对「{c.title}」检查主张是否有证据支撑
                    </p>
                    <SkillStreamTrigger
                      skillName={SKILL_NAMES.MARKETING_VERIFY_CLAIMS}
                      displayName="AI 证据校验"
                      description="检查内容中的主张是否有证据支撑，列出缺失项"
                      entityType="ContentPiece"
                      entityId={c.id}
                      input={{ contentPiece: { id: c.id, title: c.title, content: c.content.slice(0, 4000) } }}
                      useCompanyProfile={true}
                      onComplete={() => loadData()}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
