"use client";

import { useState } from 'react';
import { FileText, FileSpreadsheet, Presentation, Play, Eye, RotateCw, Loader2, File, Globe, ExternalLink } from 'lucide-react';
import { ProcessingStatusBadge } from './processing-status-badge';
import { triggerAssetProcessing } from '@/actions/assets';
import type { AssetWithProcessingStatus } from '@/types/assets';

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.startsWith('text/')) {
    return { icon: FileText, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' };
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return { icon: FileSpreadsheet, color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' };
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: Presentation, color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' };
  }
  return { icon: File, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
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
  const [currentStatus, setCurrentStatus] = useState(asset.processingMeta.processingStatus);
  const isWebAsset = asset.storageKey?.startsWith('web://');
  const fileIcon = isWebAsset
    ? { icon: Globe, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' }
    : getFileIcon(asset.mimeType);
  const Icon = fileIcon.icon;
  const status = currentStatus;
  const webSourceUrl = isWebAsset ? asset.storageKey.replace('web://', '') : null;
  const webHostname = webSourceUrl ? (() => { try { return new URL(webSourceUrl).hostname; } catch { return ''; } })() : null;

  const handleProcess = async () => {
    setIsProcessing(true);
    setCurrentStatus('processing');
    try {
      const result = await triggerAssetProcessing(asset.id);
      setCurrentStatus(result.processingStatus);
      onProcessingUpdate?.();
    } catch {
      setCurrentStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="p-4 rounded-xl transition-all group"
      style={{
        background: '#FFFCF6',
        border: '1px solid #E7E0D3',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)';
        e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(212,175,55,0.15)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E7E0D3';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.transform = '';
      }}
    >
      <div className="flex items-start gap-3">
        {/* File type icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: fileIcon.bg, border: `1px solid ${fileIcon.border}` }}
        >
          <Icon size={20} style={{ color: fileIcon.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold truncate" style={{ color: '#0B1B2B' }}>
              {asset.originalName}
            </p>
            <ProcessingStatusBadge status={status} size="xs" />
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: '#94A3B8' }}>
            {isWebAsset && webHostname ? (
              <>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6' }}
                >
                  <Globe size={9} />
                  {webHostname}
                </span>
                <span style={{ color: '#CBD5E1' }}>·</span>
              </>
            ) : (
              <>
                <span>{formatSize(asset.fileSize)}</span>
                <span style={{ color: '#CBD5E1' }}>·</span>
              </>
            )}
            <span>{new Date(asset.createdAt).toLocaleDateString('zh-CN')}</span>
            {asset.processingMeta.chunkCount !== undefined && (
              <>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span
                  className="px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(212,175,55,0.08)', color: '#D4AF37' }}
                >
                  {asset.processingMeta.chunkCount} 片段
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #EDE8DF' }}>
        {(status === 'unprocessed' || status === 'failed') && (
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: 'rgba(212,175,55,0.08)',
              color: '#0B1B2B',
              border: '1px solid rgba(212,175,55,0.25)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
          >
            {isProcessing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : status === 'failed' ? (
              <RotateCw size={12} />
            ) : (
              <Play size={12} />
            )}
            {isProcessing ? '处理中...' : status === 'failed' ? '重试' : '开始处理'}
          </button>
        )}

        {status === 'ready' && (
          <button
            onClick={() => onViewChunks(asset.id, asset.originalName)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: '#F0EBD8',
              color: '#4A5568',
              border: '1px solid #E7E0D3',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E8E0D0';
              e.currentTarget.style.color = '#0B1B2B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F0EBD8';
              e.currentTarget.style.color = '#4A5568';
            }}
          >
            <Eye size={12} />
            查看文本
          </button>
        )}

        {status === 'processing' && (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
            style={{ background: 'rgba(59,130,246,0.06)', color: '#3B82F6' }}
          >
            <Loader2 size={12} className="animate-spin" />
            正在提取文本...
          </span>
        )}

        {status === 'failed' && asset.processingMeta.processingError && (
          <span
            className="text-[10px] truncate max-w-[200px]"
            style={{ color: '#EF4444' }}
            title={asset.processingMeta.processingError}
          >
            {asset.processingMeta.processingError}
          </span>
        )}

        {isWebAsset && webSourceUrl && (
          <a
            href={webSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ml-auto"
            style={{
              background: 'rgba(139,92,246,0.06)',
              color: '#8B5CF6',
              border: '1px solid rgba(139,92,246,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139,92,246,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139,92,246,0.06)';
            }}
          >
            <ExternalLink size={11} />
            查看原文
          </a>
        )}
      </div>
    </div>
  );
}
