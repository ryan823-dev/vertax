"use client";

/**
 * 资料库页面 - 知识引擎主入口
 * 
 * 三段式布局：
 * 1. Upload Bar - 紧凑上传条
 * 2. Processing Queue - 处理中队列
 * 3. File List - 文件列表
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, Loader2, RefreshCw, Search as SearchIcon, 
  FileText, AlertCircle, CheckCircle2, Clock, RotateCw,
  Grid3X3, List, ChevronRight, Sparkles,
} from 'lucide-react';
import { getKnowledgeAssets, createAssetUploadSession, confirmAssetUpload, triggerAssetProcessing } from '@/actions/assets';
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
  // Pipeline status
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  // Assets data
  const [isLoading, setIsLoading] = useState(true);
  const [assets, setAssets] = useState<AssetWithProcessingStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetProcessingStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chunk preview state
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [previewAssetName, setPreviewAssetName] = useState('');

  // Load pipeline status
  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      // silent
    }
  }, []);

  // Load assets
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
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadPipelineStatus();
    loadAssets();
  }, [loadPipelineStatus, loadAssets]);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handleViewChunks = (assetId: string, assetName: string) => {
    setPreviewAssetId(assetId);
    setPreviewAssetName(assetName);
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`正在上传 ${files.length} 个文件...`);

    try {
      // Prepare file inputs
      const fileInputs = Array.from(files).map(file => ({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }));
      
      // Create upload sessions for all files
      const sessions = await createAssetUploadSession(fileInputs);
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const session = sessions[i];
        setUploadProgress(`上传中 (${i + 1}/${files.length}): ${file.name}`);
        
        // Upload file to presigned URL
        await fetch(session.presignedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        
        // Confirm upload
        await confirmAssetUpload(session.assetId);
      }
      
      setUploadProgress(null);
      loadAssets();
      loadPipelineStatus();
    } catch (err) {
      setUploadProgress(`上传失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setTimeout(() => setUploadProgress(null), 3000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle process/retry
  const handleProcessAsset = async (assetId: string) => {
    try {
      await triggerAssetProcessing(assetId);
      loadAssets();
      loadPipelineStatus();
    } catch {
      // silent
    }
  };

  // Categorize assets
  const processingAssets = assets.filter(a => 
    a.processingMeta.processingStatus === 'processing' || a.processingMeta.processingStatus === 'unprocessed'
  );
  const failedAssets = assets.filter(a => a.processingMeta.processingStatus === 'failed');
  const readyAssets = assets.filter(a => a.processingMeta.processingStatus === 'ready');

  // Show processing queue if there are items
  const showProcessingQueue = processingAssets.length > 0 || failedAssets.length > 0;

  return (
    <div className="space-y-0">
      {/* Engine Header with Stepper */}
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

      <div className="p-5 space-y-5">
        {/* Section 1: Upload Bar */}
        <div className="bg-white rounded-xl border border-[#E7E0D3] p-4">
          <div className="flex items-center gap-4">
            {/* Drop zone */}
            <div 
              className="flex-1 flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[#E7E0D3] rounded-lg hover:border-[#C7A56A]/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} className="text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-600">点击或拖拽文件上传</p>
                <p className="text-[10px] text-slate-400">支持 PDF、Word、PPT、Excel，单文件最大 50MB</p>
              </div>
              {uploadProgress && (
                <div className="flex items-center gap-2 text-xs text-[#C7A56A]">
                  <Loader2 size={14} className="animate-spin" />
                  {uploadProgress}
                </div>
              )}
            </div>
            
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-3 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              上传资料
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Section 2: Processing Queue (conditional) */}
        {showProcessingQueue && (
          <div className="bg-white rounded-xl border border-[#E7E0D3] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#0B1B2B] flex items-center gap-2">
                <Clock size={16} className="text-[#C7A56A]" />
                处理队列
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {processingAssets.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin text-amber-500" />
                    {processingAssets.length} 处理中
                  </span>
                )}
                {failedAssets.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={12} />
                    {failedAssets.length} 失败
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {/* Processing items */}
              {processingAssets.map(asset => (
                <div key={asset.id} className="flex items-center gap-3 px-3 py-2 bg-amber-50/50 rounded-lg border border-amber-100">
                  <FileText size={16} className="text-amber-500" />
                  <span className="flex-1 text-sm text-slate-700 truncate">{asset.originalName}</span>
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <Loader2 size={12} className="animate-spin" />
                    {asset.processingMeta.processingStatus === 'unprocessed' ? '等待处理' : '解析中'}
                  </div>
                </div>
              ))}
              
              {/* Failed items */}
              {failedAssets.map(asset => (
                <div key={asset.id} className="flex items-center gap-3 px-3 py-2 bg-red-50/50 rounded-lg border border-red-100">
                  <FileText size={16} className="text-red-400" />
                  <span className="flex-1 text-sm text-slate-700 truncate">{asset.originalName}</span>
                  <span className="text-xs text-red-500 truncate max-w-[150px]">
                    {asset.processingMeta.processingError || '处理失败'}
                  </span>
                  <button
                    onClick={() => handleProcessAsset(asset.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    <RotateCw size={12} />
                    重试
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: File List */}
        <div className="bg-white rounded-xl border border-[#E7E0D3] p-4">
          {/* Toolbar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-72">
              <ContentSearchBar onSearch={handleSearch} placeholder="搜索文件名..." />
            </div>
            <div className="flex items-center gap-1 bg-[#F7F3EA] rounded-lg p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-white text-[#0B1B2B] shadow-sm'
                      : 'text-slate-500 hover:text-[#0B1B2B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-slate-400 mr-2">{total} 个文件</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[#F7F3EA] text-[#0B1B2B]' : 'text-slate-400'}`}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[#F7F3EA] text-[#0B1B2B]' : 'text-slate-400'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => { loadAssets(); loadPipelineStatus(); }}
                className="p-1.5 text-slate-400 hover:text-[#C7A56A] transition-colors"
                title="刷新"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="text-[#C7A56A] animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12">
              {search || statusFilter !== 'all' ? (
                <div className="text-center">
                  <SearchIcon size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">没有找到匹配的文件</p>
                  <button
                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                    className="text-xs text-[#C7A56A] hover:underline mt-2"
                  >
                    清除过滤
                  </button>
                </div>
              ) : pipelineStatus ? (
                <EmptyStateGuide
                  currentStep={pipelineStatus.currentStep}
                  steps={pipelineStatus.steps}
                  blocker={pipelineStatus.steps[0]?.blocker}
                />
              ) : (
                <div className="text-center">
                  <Upload size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">暂无资料</p>
                  <p className="text-xs text-slate-400 mt-1">上传企业资料开始构建知识库</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
                  >
                    <Upload size={14} className="inline mr-2" />
                    上传资料
                  </button>
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

          {/* Pagination */}
          {total > 24 && (
            <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-[#E7E0D3]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-[#E7E0D3] rounded-lg disabled:opacity-30 hover:bg-[#F7F3EA] transition-colors"
              >
                上一页
              </button>
              <span className="text-xs text-slate-400">第 {page} 页</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={assets.length < 24}
                className="px-3 py-1.5 text-xs border border-[#E7E0D3] rounded-lg disabled:opacity-30 hover:bg-[#F7F3EA] transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chunk Preview Sheet */}
      {previewAssetId && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
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
