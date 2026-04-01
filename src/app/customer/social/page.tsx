"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Calendar, 
  TrendingUp, 
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  X,
  Send,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  MessageSquare,
  Heart,
  Share2,
  Plus,
} from 'lucide-react';
import {
  getSocialPosts,
  getSocialAccounts,
  generateAIContent,
  createSocialPost,
  deleteSocialPost,
  publishSocialPost,
} from '@/actions/social';

type ViewMode = 'list' | 'create';

// Platform icons and info
const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700', textColor: 'text-blue-700' },
  { id: 'x', name: 'Twitter/X', color: 'bg-slate-800', textColor: 'text-slate-800' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', textColor: 'text-red-600' },
];

type SocialAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
};

type PostVersion = {
  id: string;
  platform: string;
  content: string;
  platformPostId: string | null;
  publishedAt: Date | null;
  metrics: Record<string, number>;
};

type SocialPost = {
  id: string;
  title: string | null;
  status: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  versions: PostVersion[];
  createdAt: Date;
};

export default function SocialPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);

  // Create post state
  const [topic, setTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'x']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accountsData, postsData] = await Promise.all([
        getSocialAccounts(),
        getSocialPosts(),
      ]);
      setAccounts(accountsData as SocialAccount[]);
      setPosts((postsData || []) as SocialPost[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 计算统计数据
  const stats = {
    totalPosts: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    accountCount: accounts.filter(a => a.isActive).length,
    totalEngagement: posts.reduce((sum, post) => {
      return sum + post.versions.reduce((vSum, v) => {
        const metrics = v.metrics || {};
        return vSum + (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      }, 0);
    }, 0),
  };

  // 生成内容
  const handleGenerate = async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateAIContent({
        topic,
        tone: 'professional',
        platforms: selectedPlatforms,
        language: 'zh-CN',
      });
      setGeneratedContents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '内容生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存帖子
  const handleSavePost = async (publish: boolean = false) => {
    if (Object.keys(generatedContents).length === 0) return;
    
    try {
      const versions = Object.entries(generatedContents).map(([platform, content]) => ({
        platform,
        content,
      }));

      const post = await createSocialPost({
        title: topic,
        status: publish ? 'draft' : 'draft',
        versions,
      });

      if (publish && post.id) {
        setIsPublishing(true);
        await publishSocialPost(post.id);
        setIsPublishing(false);
      }

      // 重置表单
      setViewMode('list');
      setTopic('');
      setGeneratedContents({});
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setIsPublishing(false);
    }
  };

  // 删除帖子
  const handleDelete = async (postId: string) => {
    if (!confirm('确定删除此帖子？')) return;
    try {
      await deleteSocialPost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
    } catch (err) {
      setError('删除失败');
    }
  };

  // 获取状态标签
  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: '草稿', color: 'bg-slate-100 text-slate-600' },
      scheduled: { label: '已排期', color: 'bg-blue-50 text-blue-600' },
      published: { label: '已发布', color: 'bg-emerald-50 text-emerald-600' },
      failed: { label: '发布失败', color: 'bg-red-50 text-red-600' },
    };
    return map[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  };

  // 获取平台信息
  const getPlatformInfo = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId) || { id: platformId, name: platformId, color: 'bg-[#F7F3E8]0', textColor: 'text-slate-500' };
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
      {/* Header - 指令台 深蓝舞台风格 */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">声量枢纽</h1>
            <p className="text-sm text-slate-400 mt-1">社交媒体管理与品牌传播</p>
          </div>
          <div className="flex items-center gap-3">
            {viewMode === 'list' ? (
              <button 
                onClick={() => setViewMode('create')}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
              >
                <Plus size={16} />
                创建内容
              </button>
            ) : (
              <button 
                onClick={() => {
                  setViewMode('list');
                  setTopic('');
                  setGeneratedContents({});
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

      {/* Account Status */}
      {accounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <Globe size={20} className="text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">社媒账号未授权</p>
            <p className="text-xs text-amber-600">授权接入社交媒体账号以启用自动发布功能</p>
          </div>
          <Link
            href="/customer/social/accounts"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
            style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
          >
            前往授权
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '内容数', value: stats.totalPosts, icon: Calendar, color: 'text-[#D4AF37]' },
          { label: '已发布', value: stats.published, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: '总互动', value: stats.totalEngagement, icon: Heart, color: 'text-pink-500' },
          { label: '已授权账号', value: stats.accountCount, icon: Globe, color: 'text-blue-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#F7F3E8] rounded-xl border border-[#E8E0D0] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Content Area */}
      {viewMode === 'create' ? (
        <div className="grid grid-cols-2 gap-6">
          {/* Step 1: Generate Content */}
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0B1220] text-[#D4AF37] rounded-full text-xs flex items-center justify-center">1</span>
              AI生成多平台内容
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">输入内容主题</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如：发布新产品上线公告、分享行业洞察、公司活动回顾..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E8E0D0] rounded-xl text-sm focus:outline-none focus:border-[#D4AF37] resize-none bg-[#FFFCF7]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-2 block">选择目标平台</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatforms(prev =>
                        prev.includes(platform.id)
                          ? prev.filter(p => p !== platform.id)
                          : [...prev, platform.id]
                      )}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        selectedPlatforms.includes(platform.id)
                          ? `${platform.color} text-white`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {platform.name}
                      {selectedPlatforms.includes(platform.id) && (
                        <CheckCircle2 size={12} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || selectedPlatforms.length === 0 || isGenerating}
                className="w-full py-3 bg-gradient-to-r from-[#0B1B2B] to-[#152942] text-[#D4AF37] rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    AI生成中...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    生成多平台内容
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Preview & Publish */}
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0B1220] text-[#D4AF37] rounded-full text-xs flex items-center justify-center">2</span>
              预览与发布
            </h3>

            {Object.keys(generatedContents).length > 0 ? (
              <div className="space-y-4">
                {/* Platform Tabs Content */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {Object.entries(generatedContents).map(([platform, content]) => {
                    const info = getPlatformInfo(platform);
                    return (
                      <div key={platform} className="border border-[#E8E0D0] rounded-xl p-4 bg-[#FFFCF7]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 ${info.color} rounded flex items-center justify-center`}>
                            <span className="text-white text-[10px] font-bold">
                              {info.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className={`text-sm font-medium ${info.textColor}`}>{info.name}</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-6">
                          {content}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2">
                          {content.length} 字符
                        </p>
                        {platform === 'linkedin' && (
                          <button
                            onClick={() => {
                              const text = encodeURIComponent(content);
                              window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
                            }}
                            className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                          >
                            <Share2 size={10} />
                            Share on LinkedIn
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-[#E8E0D0]">
                  <button
                    onClick={() => handleSavePost(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: '#0B1220', color: '#D4AF37' }}
                  >
                    <Edit2 size={14} />
                    保存草稿
                  </button>
                  <button
                    onClick={() => handleSavePost(true)}
                    disabled={isPublishing || accounts.length === 0}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        发布中...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        立即发布
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <MessageSquare size={28} className="text-[#D4AF37]" />
                </div>
                <p className="text-sm text-slate-500">输入主题并选择平台</p>
                <p className="text-xs text-slate-400 mt-1">AI将为每个平台生成定制化内容</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Post List */}
          <div className="col-span-2 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0]">
            <div className="px-6 py-4 border-b border-[#E8E0D0]" style={{ background: '#F0EBD8' }}>
              <h3 className="font-bold text-[#0B1B2B]">内容列表</h3>
            </div>
            <div className="p-6">
            {posts.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{
                background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
              }}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Calendar size={28} className="text-[#D4AF37]" />
                </div>
                <p className="text-slate-400 mb-4">暂无社媒内容</p>
                <button
                  onClick={() => setViewMode('create')}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                >
                  创建第一条内容
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {posts.map((post) => {
                  const statusInfo = getStatusInfo(post.status);
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedPost?.id === post.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                          : 'border-[#E8E0D0] hover:border-[#D4AF37]/50 bg-[#FFFCF7]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-[#0B1B2B] truncate">
                              {post.title || '无标题'}
                            </h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {post.versions.map((v) => {
                              const info = getPlatformInfo(v.platform);
                              return (
                                <div
                                  key={v.id}
                                  className={`w-5 h-5 ${info.color} rounded flex items-center justify-center`}
                                  title={info.name}
                                >
                                  <span className="text-white text-[8px] font-bold">
                                    {info.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">
                            {new Date(post.createdAt).toLocaleString('zh-CN')}
                          </p>
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

          {/* Post Detail */}
          <div className="col-span-1 space-y-4">
            {selectedPost ? (
              <>
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0B1B2B]">内容详情</h3>
                    <button
                      onClick={() => handleDelete(selectedPost.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h4 className="font-medium text-[#0B1B2B] mb-3">
                    {selectedPost.title || '无标题'}
                  </h4>

                  {/* Versions */}
                  <div className="space-y-3">
                    {selectedPost.versions.map((version) => {
                      const info = getPlatformInfo(version.platform);
                      return (
                        <div key={version.id} className="p-3 bg-[#F0EBD8] rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-5 h-5 ${info.color} rounded flex items-center justify-center`}>
                              <span className="text-white text-[8px] font-bold">
                                {info.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className={`text-xs font-medium ${info.textColor}`}>{info.name}</span>
                            {version.platformPostId && (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">
                            {version.content}
                          </p>

                          {/* LinkedIn Share Button */}
                          {version.platform === 'linkedin' && !version.platformPostId && (
                            <button
                              onClick={() => {
                                const text = encodeURIComponent(version.content);
                                window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
                              }}
                              className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                            >
                              <Share2 size={10} />
                              Share on LinkedIn
                            </button>
                          )}
                          {version.platform === 'linkedin' && version.metrics && (version.metrics as unknown as Record<string, string>).shareUrl && (
                            <button
                              onClick={() => {
                                window.open((version.metrics as unknown as Record<string, string>).shareUrl, '_blank');
                              }}
                              className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                            >
                              <Share2 size={10} />
                              Open LinkedIn Share
                            </button>
                          )}
                          
                          {/* Metrics */}
                          {version.metrics && Object.keys(version.metrics).length > 0 && (
                            <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                              {version.metrics.likes !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Heart size={10} /> {version.metrics.likes}
                                </span>
                              )}
                              {version.metrics.comments !== undefined && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={10} /> {version.metrics.comments}
                                </span>
                              )}
                              {version.metrics.shares !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Share2 size={10} /> {version.metrics.shares}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Timestamps */}
                  <div className="mt-4 pt-4 border-t border-[#E8E0D0] text-[10px] text-slate-400 space-y-1">
                    <p>创建：{new Date(selectedPost.createdAt).toLocaleString('zh-CN')}</p>
                    {selectedPost.publishedAt && (
                      <p>发布：{new Date(selectedPost.publishedAt).toLocaleString('zh-CN')}</p>
                    )}
                    {selectedPost.scheduledAt && (
                      <p className="flex items-center gap-1">
                        <Clock size={10} />
                        排期：{new Date(selectedPost.scheduledAt).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={{
                background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
              }}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Eye size={28} className="text-[#D4AF37]" />
                </div>
                <p className="text-sm text-slate-400">选择内容查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
          <h3 className="font-bold text-[#0B1B2B] mb-4">已授权账号</h3>
          <div className="flex flex-wrap gap-3">
            {accounts.filter(a => a.isActive).map((account) => {
              const info = getPlatformInfo(account.platform);
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-2 px-3 py-2 bg-[#FFFCF7] border border-[#E8E0D0] rounded-lg"
                >
                  <div className={`w-6 h-6 ${info.color} rounded flex items-center justify-center`}>
                    <span className="text-white text-[10px] font-bold">
                      {info.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#0B1B2B]">{account.accountName}</p>
                    <p className="text-[10px] text-slate-400">{info.name}</p>
                  </div>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
