"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Calendar, 
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  X,
  Send,
  Clock,
  KeyRound,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  MessageSquare,
  Heart,
  Share2,
  Plus,
  Library,
  CalendarClock,
  Download,
  Upload,
  Video,
} from 'lucide-react';
import {
  getSocialPosts,
  getSocialAccounts,
  generateAIContent,
  createSocialPost,
  deleteSocialPost,
  publishSocialPost,
  getTikTokCreatorInfo,
} from '@/actions/social';
import { exportSocialPostsToCSV } from '@/actions/content-export';
import { downloadCSV } from '@/lib/utils/download';
import { getContentPieces } from '@/actions/contents';

type ViewMode = 'list' | 'create';

// Platform icons and info
const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700', textColor: 'text-blue-700' },
  { id: 'x', name: 'Twitter/X', color: 'bg-slate-800', textColor: 'text-slate-800' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', textColor: 'text-red-600' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-neutral-950', textColor: 'text-neutral-900' },
];

const TIKTOK_PUBLISH_CONFIG_KEY = 'tiktokPublishConfig';

type TikTokCreatorInfo = {
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec?: number;
};

type TikTokMediaState = {
  assetId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSec?: number;
  previewUrl?: string;
};

type SocialAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
};

type PostVersion = {
  id: string;
  platform: string;
  content: string;
  platformPostId: string | null;
  publishedAt: Date | null;
  media: string[];
  metrics: Record<string, unknown>;
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
  const [inputMode, setInputMode] = useState<'manual' | 'library'>('manual');
  const [contentItems, setContentItems] = useState<Array<{ id: string; title: string; excerpt?: string | null }>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'x']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [tiktokCreator, setTikTokCreator] = useState<TikTokCreatorInfo | null>(null);
  const [isLoadingTikTokCreator, setIsLoadingTikTokCreator] = useState(false);
  const [tiktokMedia, setTikTokMedia] = useState<TikTokMediaState | null>(null);
  const [isUploadingTikTok, setIsUploadingTikTok] = useState(false);
  const [tiktokOptions, setTikTokOptions] = useState({
    privacyLevel: 'SELF_ONLY',
    disableComment: false,
    disableDuet: false,
    disableStitch: false,
    brandContentToggle: false,
    brandOrganicToggle: true,
    isAigc: false,
    userConsent: false,
  });

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

  const activeAccounts = accounts.filter(account => account.isActive);
  const hasConnectedAccounts = activeAccounts.length > 0;
  const hasTikTokAccount = activeAccounts.some(account => account.platform === 'tiktok');
  const isPendingSetup = !hasConnectedAccounts && posts.length === 0;

  useEffect(() => {
    if (!hasConnectedAccounts && viewMode === 'create') {
      setViewMode('list');
    }
  }, [hasConnectedAccounts, viewMode]);

  useEffect(() => {
    if (!selectedPlatforms.includes('tiktok')) return;
    if (!hasTikTokAccount) return;

    let cancelled = false;
    setIsLoadingTikTokCreator(true);
    getTikTokCreatorInfo()
      .then((result) => {
        if (cancelled || !result) return;
        const info = result.creatorInfo;
        setTikTokCreator(info);
        setTikTokOptions(prev => ({
          ...prev,
          privacyLevel: info.privacy_level_options.includes(prev.privacyLevel)
            ? prev.privacyLevel
            : info.privacy_level_options[0] || 'SELF_ONLY',
          disableComment: info.comment_disabled || prev.disableComment,
          disableDuet: info.duet_disabled || prev.disableDuet,
          disableStitch: info.stitch_disabled || prev.disableStitch,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setError('TikTok 创作者信息读取失败，请稍后重试');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTikTokCreator(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlatforms, hasTikTokAccount]);

  // 计算统计数据
  const stats = {
    totalPosts: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    accountCount: activeAccounts.length,
    totalEngagement: posts.reduce((sum, post) => {
      return sum + post.versions.reduce((vSum, v) => {
        const metrics = v.metrics || {};
        return vSum + getMetricNumber(metrics.likes) + getMetricNumber(metrics.comments) + getMetricNumber(metrics.shares);
      }, 0);
    }, 0),
  };

  // 生成内容
  const loadLibrary = async () => {
    if (contentItems.length > 0) return;
    setLoadingLibrary(true);
    try {
      const result = await getContentPieces({});
      setContentItems(result.slice(0, 30).map(i => ({ id: i.id, title: i.title, excerpt: i.excerpt })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleStartCreate = () => {
    if (!hasConnectedAccounts) {
      setError('请先确认至少一个渠道可用，再进入内容创建与发布。');
      return;
    }
    setViewMode('create');
  };

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

  const handleTikTokVideoUpload = async (file: File | null) => {
    if (!file) return;

    const supportedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!supportedTypes.includes(file.type)) {
      setError('仅支持 MP4、MOV、WebM 格式视频。');
      return;
    }

    setIsUploadingTikTok(true);
    setError(null);
    try {
      const durationSec = await readVideoDuration(file).catch(() => undefined);
      const createRes = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [
            {
              originalName: file.name,
              mimeType: file.type,
              fileSize: file.size,
            },
          ],
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData?.sessions?.[0]) {
        throw new Error(createData?.error || '未能创建视频上传会话');
      }

      const session = createData.sessions[0] as { assetId: string; presignedUrl: string };
      const uploadRes = await fetch(session.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`视频上传失败：${uploadRes.status}`);
      }

      const confirmRes = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          assetId: session.assetId,
          metadata: { durationSec },
        }),
      });
      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json().catch(() => ({}));
        throw new Error(confirmData?.error || '未能确认已上传视频');
      }

      setTikTokMedia({
        assetId: session.assetId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        durationSec,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TikTok 视频上传失败');
    } finally {
      setIsUploadingTikTok(false);
    }
  };

  // 保存帖子
  const handleSavePost = async (publish: boolean = false) => {
    if (Object.keys(generatedContents).length === 0) return;

    const includesTikTok = Object.keys(generatedContents).includes('tiktok');
    if (includesTikTok) {
      if (!hasTikTokAccount) {
        setError('先接通 TikTok 发布通道，再发起 TikTok 发布。');
        return;
      }
      if (!tiktokMedia) {
        setError('请先上传一条 TikTok 视频稿件。');
        return;
      }
      if (!tiktokOptions.userConsent) {
        setError('请先确认并同意 TikTok 视频发布授权。');
        return;
      }
    }
    
    try {
      const versions = Object.entries(generatedContents).map(([platform, content]) => ({
        platform,
        content,
        media: platform === 'tiktok' && tiktokMedia ? [`asset:${tiktokMedia.assetId}`] : [],
        metrics: platform === 'tiktok' && tiktokMedia ? {
          [TIKTOK_PUBLISH_CONFIG_KEY]: {
            privacyLevel: tiktokOptions.privacyLevel,
            disableComment: tiktokOptions.disableComment,
            disableDuet: tiktokOptions.disableDuet,
            disableStitch: tiktokOptions.disableStitch,
            brandContentToggle: tiktokOptions.brandContentToggle,
            brandOrganicToggle: tiktokOptions.brandOrganicToggle,
            isAigc: tiktokOptions.isAigc,
            videoDurationSec: tiktokMedia.durationSec,
            sourceAssetId: tiktokMedia.assetId,
            sourceFileName: tiktokMedia.fileName,
            userConsentAt: new Date().toISOString(),
          },
        } : {},
      }));

      const isScheduling = publishMode === 'scheduled' && scheduledAt;
      const post = await createSocialPost({
        title: topic,
        status: 'draft',
        versions,
        scheduledAt: isScheduling ? new Date(scheduledAt) : undefined,
      });

      if (publish && !isScheduling && post.id) {
        setIsPublishing(true);
        await publishSocialPost(post.id);
        setIsPublishing(false);
      }

      // 重置表单
      setViewMode('list');
      setTopic('');
      setGeneratedContents({});
      setTikTokMedia(null);
      setTikTokOptions(prev => ({ ...prev, userConsent: false }));
      setPublishMode('now');
      setScheduledAt('');
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
    } catch {
      setError('删除失败');
    }
  };

  // 导出 CSV
  const handleExport = async () => {
    try {
      const res = await exportSocialPostsToCSV();
      if (res.success && res.csvContent) {
        downloadCSV(res.csvContent, res.filename);
      } else {
        setError(res.error || '导出失败');
      }
    } catch {
      setError('导出出错');
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
    return PLATFORMS.find(p => p.id === platformId) || { id: platformId, name: platformId, color: 'bg-[var(--ci-surface-strong)]0', textColor: 'text-slate-500' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
      </div>
    );
  }

  if (isPendingSetup) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6 shadow-[var(--ci-shadow-soft)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0B1B2B]">声量枢纽</h1>
              <p className="text-sm text-slate-500 mt-1">先确认发布渠道可用，再进入内容创建与发布动作，减少空跑。</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/customer/social/accounts"
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
              >
                <KeyRound size={16} />
                去接通发布渠道
              </Link>
              <button
                onClick={loadData}
                className="p-2 text-slate-500 hover:text-[var(--ci-accent)] transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Globe size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-amber-700 uppercase">
                    未就绪
                  </span>
                  <p className="text-sm font-semibold text-amber-900">发布入口已暂停，先打通渠道后再继续</p>
                </div>
                <p className="text-sm text-amber-800">
                  当前还没有可用渠道，声量枢纽先不展示创建入口，请先完成至少一个渠道接入后再继续。
                </p>
                <p className="text-xs text-amber-700">
                  渠道接通后，可直接开启内容生成、预排和发布，推进更快。
                </p>
              </div>
            </div>
            <Link
              href="/customer/social/accounts"
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shrink-0"
              style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
            >
              去接通发布渠道
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-6">
            <h2 className="text-lg font-bold text-[#0B1B2B]">先完成这 3 步</h2>
            <div className="mt-5 space-y-4">
              {[
                {
                  title: '确认可用渠道',
                  desc: '选择至少 1 个目标平台并完成授权，保证发布路径可用。',
                },
                {
                  title: '校验发布通道',
                  desc: '连通性通过后再提交发布，避免后续因渠道问题中断工作。',
                },
                {
                  title: '返回声量枢纽推进发布',
                  desc: '完成后可直接进入创建、预览、立即发布或定时发布。',
                },
              ].map((step, index) => (
                <div key={step.title} className="flex gap-3 rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ci-accent)]/12 text-sm font-semibold text-[var(--ci-accent)] ring-1 ring-[var(--ci-accent)]/20">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0B1B2B]">{step.title}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6 shadow-[var(--ci-shadow-soft)]">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--ci-accent)] uppercase">接通后即可推进</p>
            <div className="mt-5 space-y-4">
              {[
                { icon: Sparkles, title: 'AI 多平台内容生成', desc: '按平台生成适配文案，减少重复编辑。' },
                { icon: CalendarClock, title: '立即发布与定时发布', desc: '避免内容生成后找不到发布出口。' },
                { icon: CheckCircle2, title: '统一发布状态追踪', desc: '集中查看已发布、排期中和失败内容。' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-muted)] p-4">
                  <div className="flex items-center gap-2">
                    <item.icon size={16} className="text-[var(--ci-accent)]" />
                    <p className="text-sm font-semibold text-[#0B1B2B]">{item.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-6 shadow-[var(--ci-shadow-soft)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1B2B]">声量枢纽</h1>
            <p className="text-sm text-slate-500 mt-1">社交媒体管理与品牌传播</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {viewMode === 'list' && (
              <button 
                onClick={handleExport}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border"
                style={{ borderColor: 'var(--ci-border)', color: 'var(--ci-text-muted)' }}
              >
                <Download size={16} />
                导出 CSV
              </button>
            )}
            {viewMode === 'list' ? (
              <button 
                onClick={handleStartCreate}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
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
                style={{ background: 'var(--ci-surface-muted)', color: 'var(--ci-accent)' }}
              >
                返回列表
              </button>
            )}
            <button 
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-[var(--ci-accent)] transition-colors"
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
      {!hasConnectedAccounts && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <Globe size={20} className="text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">社媒账号未授权</p>
            <p className="text-xs text-amber-600">授权接入社交媒体账号以启用自动发布功能</p>
          </div>
          <Link
            href="/customer/social/accounts"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
            style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
          >
            前往授权
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '内容数', value: stats.totalPosts, icon: Calendar, color: 'text-[var(--ci-accent)]' },
          { label: '已发布', value: stats.published, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: '总互动', value: stats.totalEngagement, icon: Heart, color: 'text-pink-500' },
          { label: '已授权账号', value: stats.accountCount, icon: Globe, color: 'text-blue-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-4">
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
          <div className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[var(--ci-accent)]/12 text-[var(--ci-accent)] ring-1 ring-[var(--ci-accent)]/20 text-xs flex items-center justify-center">1</span>
              AI生成多平台内容
            </h3>
            
            <div className="space-y-4">
              {/* 输入模式 Tab */}
              <div className="flex rounded-lg border border-[var(--ci-border)] overflow-hidden mb-1">
                <button
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    inputMode === 'manual' ? 'bg-[var(--ci-accent)] text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  手动输入
                </button>
                <button
                  onClick={() => { setInputMode('library'); loadLibrary(); }}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    inputMode === 'library' ? 'bg-[var(--ci-accent)] text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Library size={11} />
                  从内容库导入
                </button>
              </div>
              <div>
                {inputMode === 'manual' ? (
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如：发布新产品上线公告、分享行业洞察、公司活动回顾..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-[var(--ci-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--ci-accent)] resize-none bg-[#FFFFFF]"
                  />
                ) : (
                  <div className="space-y-1 max-h-[140px] overflow-y-auto">
                    {loadingLibrary ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      </div>
                    ) : contentItems.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">暂无内容</p>
                    ) : (
                      contentItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setTopic(item.excerpt ? `${item.title}\n\n${item.excerpt}` : item.title);
                            setInputMode('manual');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg border border-[var(--ci-border)] hover:border-[var(--ci-accent)] hover:bg-[#FFFDF5] transition-colors"
                        >
                          <p className="text-xs font-medium text-[#0B1B2B] truncate">{item.title}</p>
                          {item.excerpt && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{item.excerpt}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
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

              {selectedPlatforms.includes('tiktok') && (
                <div className="rounded-xl border border-[var(--ci-border)] bg-[#FFFFFF] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Video size={16} className="text-neutral-900" />
                      <div>
                          <p className="text-xs font-semibold text-[#0B1B2B]">TikTok 视频素材</p>
                        <p className="text-[10px] text-slate-500">发布 TikTok 直发前请先上传 MP4、MOV 或 WebM 视频。</p>
                      </div>
                    </div>
                    {isLoadingTikTokCreator && <Loader2 size={14} className="animate-spin text-slate-400" />}
                  </div>

                  {!hasTikTokAccount && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      使用 TikTok 前先在发布渠道完成接入配置。
                    </div>
                  )}

                  {tiktokCreator && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-slate-500">
                        Privacy
                        <select
                          value={tiktokOptions.privacyLevel}
                          onChange={(e) => setTikTokOptions(prev => ({ ...prev, privacyLevel: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-[var(--ci-border)] bg-white px-3 py-2 text-xs text-slate-700"
                        >
                          {tiktokCreator.privacy_level_options.map(option => (
                            <option key={option} value={option}>{formatTikTokPrivacy(option)}</option>
                          ))}
                        </select>
                      </label>
                      <div className="text-xs text-slate-500">
                        Account
                        <p className="mt-1 rounded-lg border border-[var(--ci-border)] bg-white px-3 py-2 text-xs text-slate-700">
                          {tiktokCreator.creator_username || tiktokCreator.creator_nickname || 'TikTok creator'}
                        </p>
                      </div>
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ci-accent)]/60 bg-[var(--ci-accent)]/10 px-4 py-3 text-xs font-medium text-[var(--ci-text)]">
                    {isUploadingTikTok ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isUploadingTikTok ? '上传中...' : tiktokMedia ? '更换视频' : '上传 TikTok 视频'}
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      disabled={isUploadingTikTok}
                      onChange={(e) => handleTikTokVideoUpload(e.target.files?.[0] || null)}
                    />
                  </label>

                  {tiktokMedia && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-emerald-900">{tiktokMedia.fileName}</p>
                          <p className="text-[10px] text-emerald-700">
                            {formatFileSize(tiktokMedia.fileSize)}
                            {tiktokMedia.durationSec ? ` - ${Math.round(tiktokMedia.durationSec)}s` : ''}
                            {tiktokCreator?.max_video_post_duration_sec ? ` - max ${tiktokCreator.max_video_post_duration_sec}s` : ''}
                          </p>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      </div>
                      {tiktokMedia.previewUrl && (
                        <video src={tiktokMedia.previewUrl} controls className="mt-3 max-h-48 w-full rounded-lg bg-black" />
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['disableComment', '关闭评论', tiktokCreator?.comment_disabled],
                      ['disableDuet', '禁止拼接', tiktokCreator?.duet_disabled],
                      ['disableStitch', '禁止拼接投稿', tiktokCreator?.stitch_disabled],
                      ['isAigc', '标记为 AI 生成', false],
                      ['brandOrganicToggle', '品牌自营内容', false],
                      ['brandContentToggle', '付费合作内容', false],
                    ].map(([key, label, locked]) => (
                      <label key={String(key)} className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] bg-white px-3 py-2 text-[11px] text-slate-600">
                        <input
                          type="checkbox"
                          disabled={Boolean(locked)}
                          checked={Boolean(tiktokOptions[key as keyof typeof tiktokOptions])}
                          onChange={(e) => setTikTokOptions(prev => ({ ...prev, [String(key)]: e.target.checked }))}
                        />
                        {String(label)}
                      </label>
                    ))}
                  </div>

                  <label className="flex items-start gap-2 rounded-lg border border-[var(--ci-border)] bg-white px-3 py-2 text-[11px] leading-5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={tiktokOptions.userConsent}
                      onChange={(e) => setTikTokOptions(prev => ({ ...prev, userConsent: e.target.checked }))}
                      className="mt-1"
                    />
                    我已确认创作者授权该视频用于 TikTok 直发发布。
                  </label>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || selectedPlatforms.length === 0 || isGenerating}
                className="w-full py-3 bg-[var(--ci-accent)] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[var(--ci-accent)]/12 text-[var(--ci-accent)] ring-1 ring-[var(--ci-accent)]/20 text-xs flex items-center justify-center">2</span>
              预览与发布
            </h3>

            {Object.keys(generatedContents).length > 0 ? (
              <div className="space-y-4">
                {/* Platform Tabs Content */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {Object.entries(generatedContents).map(([platform, content]) => {
                    const info = getPlatformInfo(platform);
                    return (
                      <div key={platform} className="border border-[var(--ci-border)] rounded-xl p-4 bg-[#FFFFFF]">
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
                            去 LinkedIn 分享
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-[var(--ci-border)] w-full">
                  <button
                    onClick={() => handleSavePost(false)}
                    className="flex-1 min-w-0 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 truncate"
                    style={{ background: '#0B1220', color: 'var(--ci-accent)' }}
                  >
                    <Edit2 size={14} className="shrink-0" />
                    <span className="truncate">保存草稿</span>
                  </button>
                  <div className="flex-1 space-y-2">
                    {/* 发布模式切换 */}
                    <div className="flex rounded-lg overflow-hidden border border-[var(--ci-accent)]/40">
                      <button
                        onClick={() => setPublishMode('now')}
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                          publishMode === 'now' ? 'bg-[var(--ci-accent)] text-white' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        立即发布
                      </button>
                      <button
                        onClick={() => setPublishMode('scheduled')}
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          publishMode === 'scheduled' ? 'bg-[var(--ci-accent)] text-white' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <CalendarClock size={11} />
                        定时发布
                      </button>
                    </div>
                    {publishMode === 'scheduled' && (
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 border border-[var(--ci-border)] rounded-xl text-xs bg-[#FFFFFF] text-[#0B1B2B] focus:outline-none focus:border-[var(--ci-accent)]"
                      />
                    )}
                    <button
                      onClick={() => handleSavePost(publishMode === 'now')}
                      disabled={isPublishing || !hasConnectedAccounts || (publishMode === 'scheduled' && !scheduledAt)}
                      className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
                    >
                      {isPublishing ? (
                        <><Loader2 size={14} className="animate-spin" />发布中...</>
                      ) : publishMode === 'scheduled' ? (
                        <><CalendarClock size={14} />加入调度</>
                      ) : (
                        <><Send size={14} />立即发布</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,141,246,0.12)', border: '1px solid rgba(79,141,246,0.3)' }}>
                  <MessageSquare size={28} className="text-[var(--ci-accent)]" />
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
          <div className="col-span-2 bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)]">
            <div className="px-6 py-4 border-b border-[var(--ci-border)]" style={{ background: 'var(--ci-surface-muted)' }}>
              <h3 className="font-bold text-[#0B1B2B]">内容列表</h3>
            </div>
            <div className="p-6">
            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--ci-border)] bg-[#FFFFFF] p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,141,246,0.12)', border: '1px solid rgba(79,141,246,0.3)' }}>
                  <Calendar size={28} className="text-[var(--ci-accent)]" />
                </div>
                <p className="text-slate-400 mb-4">暂无社媒内容</p>
                <button
                  onClick={handleStartCreate}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
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
                          ? 'border-[var(--ci-accent)] bg-[var(--ci-accent)]/5'
                          : 'border-[var(--ci-border)] hover:border-[var(--ci-accent)]/50 bg-[#FFFFFF]'
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
                <div className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-6">
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
                        <div key={version.id} className="p-3 bg-[var(--ci-surface-muted)] rounded-xl">
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
                              去 LinkedIn 分享
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
                              打开 LinkedIn 分享页
                            </button>
                          )}
                          
                          {/* Metrics */}
                          {version.platform === 'tiktok' && getTikTokPublishStatus(version.metrics) && (
                            <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                              TikTok: {getTikTokPublishStatus(version.metrics)}
                            </p>
                          )}

                          {version.metrics && Object.keys(version.metrics).length > 0 && (
                            <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                              {getMetricNumber(version.metrics.likes) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart size={10} /> {getMetricNumber(version.metrics.likes)}
                                </span>
                              )}
                              {getMetricNumber(version.metrics.comments) > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={10} /> {getMetricNumber(version.metrics.comments)}
                                </span>
                              )}
                              {getMetricNumber(version.metrics.shares) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Share2 size={10} /> {getMetricNumber(version.metrics.shares)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Timestamps */}
                  <div className="mt-4 pt-4 border-t border-[var(--ci-border)] text-[10px] text-slate-400 space-y-1">
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
              <div className="rounded-xl border border-dashed border-[var(--ci-border)] bg-[#FFFFFF] p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,141,246,0.12)', border: '1px solid rgba(79,141,246,0.3)' }}>
                  <Eye size={28} className="text-[var(--ci-accent)]" />
                </div>
                <p className="text-sm text-slate-400">选择内容查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected Accounts Summary */}
      {hasConnectedAccounts && (
        <div className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-6">
          <h3 className="font-bold text-[#0B1B2B] mb-4">已授权账号</h3>
          <div className="flex flex-wrap gap-3">
            {activeAccounts.map((account) => {
              const info = getPlatformInfo(account.platform);
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] border border-[var(--ci-border)] rounded-lg"
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

function getMetricNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('未能读取视频时长'));
    };
    video.src = url;
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTikTokPrivacy(value: string): string {
  const labels: Record<string, string> = {
    PUBLIC_TO_EVERYONE: '公开',
    MUTUAL_FOLLOW_FRIENDS: '互关可见',
    FOLLOWER_OF_CREATOR: '仅关注者',
    SELF_ONLY: '仅自己可见',
  };
  return labels[value] || value;
}

function getTikTokPublishStatus(metrics: Record<string, unknown> | undefined): string | null {
  const state = metrics?.tiktokPublish;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const status = (state as Record<string, unknown>).status;
  return typeof status === 'string' ? status : null;
}
