"use client";

/**
 * 资料库页面 - 知识引擎主入口
 * 视觉规范：驾驶舱延伸风格
 * - 顶部深蓝舞台容器（与驾驶舱一致）
 * - 工具栏 + 内容区用奶油白卡片
 * - 金色点缀、深蓝按钮
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, Loader2, RefreshCw, Search as SearchIcon, 
  FileText, AlertCircle, CheckCircle2, Clock, RotateCw,
  Grid3X3, List, Sparkles, Database, ChevronRight,
} from 'lucide-react';
import { getKnowledgeAssets, triggerAssetProcessing } from '@/actions/assets';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
import { KnowledgeAssetCard } from '@/components/knowledge/knowledge-asset-card';
import { AssetChunkPreview } from '@/components/knowledge/asset-chunk-preview';
import { ContentSearchBar } from '@/components/knowledge/content-search-bar';
import { EngineHeader, EmptyStateGuide } from '@/components/knowledge/engine-header';
import type { AssetWithProcessingStatus } from '@/types/assets';
import type { AssetProcessingStatus } from '@/types/knowledge';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

const STATUS_TABS: Array<{ value: AssetProcessingStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'ready', label: '已就绪' },
  { value: 'processing', label: '处理中' },
  { value: 'unprocessed', label: '未处理' },
  { value: 'failed', label: '失败' },
];

export default function KnowledgeAssetsPage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assets, setAssets] = useState<AssetWithProcessingStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetProcessingStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [previewAssetName, setPreviewAssetName] = useState('');
  // 正在处理中的资产ID集合（用于轮询）
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch { /* silent */ }
  }, []);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (search) filters.search = search;
      if (statusFilter !== 'all') filters.processingStatus = statusFilter;
      const result = await getKnowledgeAssets(
        filters as Parameters<typeof getKnowledgeAssets>[0],
        { page, pageSize: 24 }
      );
      setAssets(result.items);
      setTotal(result.total);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadPipelineStatus();
    loadAssets();
  }, [loadPipelineStatus, loadAssets]);

  // 轮询：当有资产处于"processing"状态时，每4秒查询一次状态
  useEffect(() => {
    const processingFromList = assets
      .filter(a => a.processingMeta.processingStatus === 'processing')
      .map(a => a.id);
    const allProcessingIds = new Set([...processingFromList, ...processingIds]);

    if (allProcessingIds.size === 0) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
      return;
    }

    if (pollingTimerRef.current) return; // 已在轮询中

    pollingTimerRef.current = setInterval(async () => {
      let anyFinished = false;
      const remaining = new Set<string>();

      await Promise.all(
        Array.from(allProcessingIds).map(async (id) => {
          try {
            const res = await fetch(`/api/assets/status?assetId=${id}`);
            if (!res.ok) return;
            const data = await res.json() as { processingStatus: string };
            if (data.processingStatus === 'processing') {
              remaining.add(id);
            } else {
              anyFinished = true;
            }
          } catch { /* ignore */ }
        })
      );

      setProcessingIds(remaining);
      if (anyFinished) {
        loadAssets();
        loadPipelineStatus();
      }
      if (remaining.size === 0 && pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }, 4000);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, processingIds]);

  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);
  const handleViewChunks = (assetId: string, assetName: string) => {
    setPreviewAssetId(assetId);
    setPreviewAssetName(assetName);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(`正在上传 ${files.length} 个文件...`);
    try {
      // 使用 API 路由代替 Server Action，避免 Next.js Server Action 环境变量问题
      const fileInputs = Array.from(files).map(file => ({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }));

      const sessionRes = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileInputs }),
      });

      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        throw new Error(err.error || `上传会话创建失败 (${sessionRes.status})`);
      }

      const { sessions } = await sessionRes.json();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const session = sessions[i];
        setUploadProgress(`上传中 (${i + 1}/${files.length}): ${file.name}`);

        // 直传 OSS
        const ossRes = await fetch(session.presignedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (!ossRes.ok) throw new Error(`OSS 上传失败 (${ossRes.status})`);

        // 确认上传完成
        await fetch('/api/assets/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', assetId: session.assetId }),
        });
        // 将该资产加入轮询队列
        setProcessingIds(prev => new Set([...prev, session.assetId]));
      }

      setUploadProgress('文件已上传，正在后台解析...');
      setTimeout(() => setUploadProgress(null), 3000);
      loadAssets();
      loadPipelineStatus();
    } catch (err) {
      setUploadProgress(`上传失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setTimeout(() => setUploadProgress(null), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessAsset = async (assetId: string) => {
    try {
      await triggerAssetProcessing(assetId);
      loadAssets();
      loadPipelineStatus();
    } catch { /* silent */ }
  };

  const processingAssets = assets.filter(a =>
    a.processingMeta.processingStatus === 'processing' || a.processingMeta.processingStatus === 'unprocessed'
  );
  const failedAssets = assets.filter(a => a.processingMeta.processingStatus === 'failed');
  const showProcessingQueue = processingAssets.length > 0 || failedAssets.length > 0;

  return (
    <div className="space-y-0">
      {/* Pipeline步进条（保持原有逻辑） */}
      {pipelineStatus && (
        <EngineHeader
          title="资料库"
          description="上传企业资料，系统自动解析提取文本内容"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
          primaryAction={{
            label: '上传资料',
            onClick: () => fileInputRef.current?.click(),
            loading: isUploading,
          }}
        />
      )}

      <div className="p-5 space-y-4">

        {/* ═══════════════════════════════════════════
            顶部深蓝舞台区 —— 上传指令台
        ═══════════════════════════════════════════ */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          {/* 金色光晕 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
            }}
          />

          <div className="relative z-10 px-6 py-5 flex items-center gap-5">
            {/* 图标 */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.3)',
              }}
            >
              <Database size={20} style={{ color: '#D4AF37' }} />
            </div>

            {/* 文案 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles size={13} style={{ color: '#D4AF37' }} />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#D4AF37' }}>
                  企业知识资料库
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: 'rgba(212,175,55,0.15)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    color: '#D4AF37CC',
                  }}
                >
                  {total} 份资料
                </span>
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                支持 PDF、Word、PPT、Excel、MP4/MOV/AVI 视频 · 单文件最大 50MB · 上传后自动解析
              </p>
            </div>

            {/* 上传按钮 + 进度 */}
            <div className="flex items-center gap-3 shrink-0">
              {uploadProgress && (
                <div className="flex items-center gap-2 text-xs" style={{ color: '#D4AF37' }}>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: '#D4AF37',
                  color: '#0B1220',
                  boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px -2px rgba(212,175,55,0.5)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px -2px rgba(212,175,55,0.35)';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                }}
              >
                {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                上传资料
              </button>
            </div>
          </div>

          {/* 底部拖拽区 */}
          <div
            className="mx-5 mb-5 rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all"
            style={{
              border: '1.5px dashed rgba(212,175,55,0.22)',
              background: 'rgba(212,175,55,0.04)',
              padding: '14px 0',
            }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.45)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.07)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.22)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.04)';
            }}
          >
            <Upload size={16} style={{ color: 'rgba(212,175,55,0.6)' }} />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              或将文件拖拽至此处
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.avi,.webm,.mkv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* ═══════════════════════════════════════════
            处理队列（条件展示）
        ═══════════════════════════════════════════ */}
        {showProcessingQueue && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#F7F3E8',
              border: '1px solid #E8E0D0',
              boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)',
            }}
          >
            {/* 标题栏 */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid #E8E0D0', background: '#F0EBD8' }}
            >
              <div className="flex items-center gap-2">
                <Clock size={15} style={{ color: '#D4AF37' }} />
                <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>处理队列</span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: '#718096' }}>
                {processingAssets.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" style={{ color: '#F59E0B' }} />
                    {processingAssets.length} 处理中
                  </span>
                )}
                {failedAssets.length > 0 && (
                  <span className="flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                    <AlertCircle size={11} />
                    {failedAssets.length} 失败
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto">
              {processingAssets.map(asset => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}
                >
                  <FileText size={15} style={{ color: '#F59E0B' }} />
                  <span className="flex-1 text-sm truncate" style={{ color: '#1A1A1A' }}>{asset.originalName}</span>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#F59E0B' }}>
                    <Loader2 size={11} className="animate-spin" />
                    {asset.processingMeta.processingStatus === 'unprocessed' ? '等待处理' : '解析中'}
                  </div>
                </div>
              ))}
              {failedAssets.map(asset => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <FileText size={15} style={{ color: '#EF4444' }} />
                  <span className="flex-1 text-sm truncate" style={{ color: '#1A1A1A' }}>{asset.originalName}</span>
                  <span className="text-xs truncate max-w-[150px]" style={{ color: '#EF4444' }}>
                    {asset.processingMeta.processingError || '处理失败'}
                  </span>
                  <button
                    onClick={() => handleProcessAsset(asset.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors"
                    style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <RotateCw size={11} />
                    重试
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            文件列表主区
        ═══════════════════════════════════════════ */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#F7F3E8',
            border: '1px solid #E8E0D0',
            boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)',
          }}
        >
          {/* 工具栏 */}
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{ borderBottom: '1px solid #E8E0D0', background: '#F0EBD8' }}
          >
            {/* 搜索框 */}
            <div className="w-64">
              <ContentSearchBar onSearch={handleSearch} placeholder="搜索文件名..." />
            </div>

            {/* 状态 Tab */}
            <div
              className="flex items-center gap-0.5 rounded-xl p-1"
              style={{ background: '#E8E0D0' }}
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                  style={
                    statusFilter === tab.value
                      ? {
                          background: '#0B1220',
                          color: '#D4AF37',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }
                      : { color: '#4A5568' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 右侧工具 */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs mr-2" style={{ color: '#718096' }}>{total} 个文件</span>
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 rounded-lg transition-colors"
                style={viewMode === 'grid'
                  ? { background: '#0B1220', color: '#D4AF37' }
                  : { color: '#718096' }}
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded-lg transition-colors"
                style={viewMode === 'list'
                  ? { background: '#0B1220', color: '#D4AF37' }
                  : { color: '#718096' }}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => { loadAssets(); loadPipelineStatus(); }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#718096' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#D4AF37'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#718096'}
                title="刷新"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* 内容区 */}
          <div className="p-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={32} className="animate-spin" style={{ color: '#D4AF37' }} />
                <span className="text-sm" style={{ color: '#718096' }}>加载中...</span>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-12">
                {search || statusFilter !== 'all' ? (
                  <div className="text-center space-y-3">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
                    >
                      <SearchIcon size={28} style={{ color: '#D4AF37' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>没有找到匹配的文件</p>
                    <button
                      onClick={() => { setSearch(''); setStatusFilter('all'); }}
                      className="text-xs font-medium transition-colors"
                      style={{ color: '#D4AF37' }}
                    >
                      清除过滤条件
                    </button>
                  </div>
                ) : pipelineStatus ? (
                  <EmptyStateGuide
                    currentStep={pipelineStatus.currentStep}
                    steps={pipelineStatus.steps}
                    blocker={pipelineStatus.steps[0]?.blocker}
                  />
                ) : (
                  /* 全空态 —— 深蓝舞台风格 */
                  <div
                    className="relative rounded-2xl overflow-hidden py-14 text-center"
                    style={{
                      background: 'linear-gradient(135deg, #0B1220 0%, #0D1525 100%)',
                      border: '1px solid rgba(212,175,55,0.15)',
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.1) 0%, transparent 60%)',
                      }}
                    />
                    <div className="relative z-10 space-y-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                        style={{
                          background: 'rgba(212,175,55,0.12)',
                          border: '1px solid rgba(212,175,55,0.3)',
                          boxShadow: '0 0 30px rgba(212,175,55,0.15)',
                        }}
                      >
                        <Database size={28} style={{ color: '#D4AF37' }} />
                      </div>
                      <div>
                        <p className="text-base font-bold" style={{ color: '#FFFFFF' }}>知识库尚未建立</p>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          上传企业资料，AI 自动解析并构建专属知识图谱
                        </p>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          background: '#D4AF37',
                          color: '#0B1220',
                          boxShadow: '0 4px 16px -2px rgba(212,175,55,0.4)',
                        }}
                      >
                        <Upload size={15} />
                        立即上传第一份资料
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                : "space-y-2"
              }>
                {assets.map((asset) => (
                  <KnowledgeAssetCard
                    key={asset.id}
                    asset={asset}
                    onViewChunks={handleViewChunks}
                    onProcessingUpdate={() => { loadAssets(); loadPipelineStatus(); }}
                  />
                ))}
              </div>
            )}

            {/* 分页 */}
            {total > 24 && (
              <div
                className="flex items-center justify-center gap-2 pt-4 mt-4"
                style={{ borderTop: '1px solid #E8E0D0' }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-30"
                  style={{ border: '1px solid #E8E0D0', color: '#4A5568', background: '#FFFCF7' }}
                >
                  <ChevronRight size={13} className="rotate-180" />
                  上一页
                </button>
                <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#0B1220', color: '#D4AF37' }}>
                  第 {page} 页
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={assets.length < 24}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-30"
                  style={{ border: '1px solid #E8E0D0', color: '#4A5568', background: '#FFFCF7' }}
                >
                  下一页
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chunk Preview Sheet */}
      {previewAssetId && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(11,18,32,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setPreviewAssetId(null)}
          />
          <AssetChunkPreview
            assetId={previewAssetId}
            assetName={previewAssetName}
            open={!!previewAssetId}
            onClose={() => setPreviewAssetId(null)}
          />
        </>
      )}
    </div>
  );
}
