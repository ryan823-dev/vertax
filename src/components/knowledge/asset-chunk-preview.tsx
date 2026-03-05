"use client";

import { useState, useCallback, useEffect } from 'react';
import { X, FileText, ChevronLeft, ChevronRight, Loader2, Hash } from 'lucide-react';
import { getAssetChunks } from '@/actions/assets';
import type { ChunkData, ChunkListResponse } from '@/types/knowledge';

interface AssetChunkPreviewProps {
  assetId: string;
  assetName: string;
  open: boolean;
  onClose: () => void;
}

export function AssetChunkPreview({ assetId, assetName, open, onClose }: AssetChunkPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ChunkListResponse | null>(null);
  const [page, setPage] = useState(1);

  const loadChunks = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const result = await getAssetChunks(assetId, { page: p, pageSize: 10 });
      setData(result);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (open) {
      setPage(1);
      loadChunks(1);
    }
  }, [open, loadChunks]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadChunks(newPage);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-[#FFFCF6] border-l border-[#E7E0D3] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D3]">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={18} className="text-[#D4AF37] shrink-0" />
          <h3 className="text-sm font-bold text-[#0B1B2B] truncate">{assetName}</h3>
          {data && (
            <span className="text-[10px] text-slate-400 shrink-0">{data.total} 个片段</span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-[#E7E0D3]/50 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-[#D4AF37] animate-spin" />
          </div>
        ) : data && data.items.length > 0 ? (
          data.items.map((chunk: ChunkData) => (
            <div
              key={chunk.id}
              className="p-4 border border-[#E7E0D3] rounded-xl bg-white hover:border-[#D4AF37]/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#F7F3EA] rounded text-[10px] font-medium text-[#0B1B2B]">
                  <Hash size={10} />
                  {chunk.chunkIndex + 1}
                </span>
                {chunk.pageNumber && (
                  <span className="text-[10px] text-slate-400">第 {chunk.pageNumber} 页</span>
                )}
                {chunk.tokenCount && (
                  <span className="text-[10px] text-slate-400 ml-auto">~{chunk.tokenCount} tokens</span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                {chunk.content}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-sm text-slate-400">暂无文本片段</div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#E7E0D3]">
          <span className="text-xs text-slate-400">
            第 {data.page} / {data.totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-[#E7E0D3]/50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-[#E7E0D3]/50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
