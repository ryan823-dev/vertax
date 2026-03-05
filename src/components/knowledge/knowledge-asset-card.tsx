"use client";

import { useState } from 'react';
import { FileText, FileSpreadsheet, Presentation, Play, Eye, RotateCw, Loader2 } from 'lucide-react';
import { ProcessingStatusBadge } from './processing-status-badge';
import { triggerAssetProcessing } from '@/actions/assets';
import type { AssetWithProcessingStatus } from '@/types/assets';

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.startsWith('text/')) {
    return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' };
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' };
  }
  return { icon: FileText, color: 'text-slate-400', bg: 'bg-slate-50' };
}

function formatSize(bytes: number | bigint) {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface KnowledgeAssetCardProps {
  asset: AssetWithProcessingStatus;
  onViewChunks: (assetId: string, assetName: string) => void;
  onProcessingUpdate?: () => void;
}

export function KnowledgeAssetCard({ asset, onViewChunks, onProcessingUpdate }: KnowledgeAssetCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileIcon = getFileIcon(asset.mimeType);
  const Icon = fileIcon.icon;
  const status = asset.processingMeta.processingStatus;

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      await triggerAssetProcessing(asset.id);
      onProcessingUpdate?.();
    } catch {
      // error handled server-side
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 border border-[#E7E0D3] rounded-xl bg-[#FFFCF6] hover:border-[#D4AF37]/40 transition-all group">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${fileIcon.bg} shrink-0`}>
          <Icon size={20} className={fileIcon.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-[#0B1B2B] truncate">{asset.originalName}</p>
            <ProcessingStatusBadge status={status} size="xs" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>{formatSize(asset.fileSize)}</span>
            <span>·</span>
            <span>{new Date(asset.createdAt).toLocaleDateString('zh-CN')}</span>
            {asset.processingMeta.chunkCount !== undefined && (
              <>
                <span>·</span>
                <span>{asset.processingMeta.chunkCount} 片段</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3">
        {status === 'unprocessed' || status === 'failed' ? (
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0B1B2B] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg hover:bg-[#D4AF37]/20 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : status === 'failed' ? (
              <RotateCw size={12} />
            ) : (
              <Play size={12} />
            )}
            {isProcessing ? '处理中...' : status === 'failed' ? '重试' : '处理'}
          </button>
        ) : null}

        {status === 'ready' && (
          <button
            onClick={() => onViewChunks(asset.id, asset.originalName)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0B1B2B] bg-[#F7F3EA] border border-[#E7E0D3] rounded-lg hover:bg-[#E7E0D3] transition-colors"
          >
            <Eye size={12} />
            查看文本
          </button>
        )}

        {status === 'processing' && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-500">
            <Loader2 size={12} className="animate-spin" />
            正在提取文本...
          </span>
        )}

        {status === 'failed' && asset.processingMeta.processingError && (
          <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={asset.processingMeta.processingError}>
            {asset.processingMeta.processingError}
          </span>
        )}
      </div>
    </div>
  );
}
