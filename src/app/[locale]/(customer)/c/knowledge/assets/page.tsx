"use client";

import { useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, RefreshCw, FolderOpen, Search as SearchIcon } from 'lucide-react';
import { getKnowledgeAssets } from '@/actions/assets';
import { KnowledgeAssetCard } from '@/components/knowledge/knowledge-asset-card';
import { AssetChunkPreview } from '@/components/knowledge/asset-chunk-preview';
import { ContentSearchBar } from '@/components/knowledge/content-search-bar';
import type { AssetWithProcessingStatus } from '@/types/assets';
import type { AssetProcessingStatus } from '@/types/knowledge';

const STATUS_TABS: Array<{ value: AssetProcessingStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'ready', label: '已就绪' },
  { value: 'processing', label: '处理中' },
  { value: 'unprocessed', label: '未处理' },
  { value: 'failed', label: '失败' },
];

export default function KnowledgeAssetsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [assets, setAssets] = useState<AssetWithProcessingStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetProcessingStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  // Chunk preview state
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [previewAssetName, setPreviewAssetName] = useState('');

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
    loadAssets();
  }, [loadAssets]);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handleViewChunks = (assetId: string, assetName: string) => {
    setPreviewAssetId(assetId);
    setPreviewAssetName(assetName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">素材资源</h1>
          <p className="text-sm text-slate-500 mt-1">管理知识引擎的文档素材，处理并提取文本内容</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAssets()}
            className="p-2 text-slate-400 hover:text-[#C7A56A] transition-colors rounded-lg hover:bg-[#F7F3EA]"
            title="刷新"
          >
            <RefreshCw size={18} />
          </button>
          <a
            href="/c/assets"
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
          >
            <Upload size={16} />
            上传素材
          </a>
        </div>
      </div>

      {/* Toolbar: Search + Status Tabs */}
      <div className="flex items-center gap-4">
        <div className="w-80">
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
        <span className="text-xs text-slate-400 ml-auto">{total} 个素材</span>
      </div>

      {/* Asset Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="text-[#C7A56A] animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3]">
          {search || statusFilter !== 'all' ? (
            <>
              <SearchIcon size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">没有找到匹配的素材</p>
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="text-xs text-[#C7A56A] hover:underline mt-2"
              >
                清除过滤
              </button>
            </>
          ) : (
            <>
              <FolderOpen size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">暂无可分析的素材</p>
              <a href="/c/assets" className="text-xs text-[#C7A56A] hover:underline mt-2 inline-block">
                前往素材中心上传文档
              </a>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <KnowledgeAssetCard
              key={asset.id}
              asset={asset}
              onViewChunks={handleViewChunks}
              onProcessingUpdate={loadAssets}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 24 && (
        <div className="flex items-center justify-center gap-2 pt-4">
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
