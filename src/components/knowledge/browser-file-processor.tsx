"use client";

import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  processFileInBrowser,
  shouldProcessInBrowser,
  isSupportedBrowserType,
  splitTextIntoChunks,
  type ProcessProgress,
} from '@/lib/browser-processor';

interface FileProcessorProps {
  onUploadComplete: (assetId: string) => void;
  folderId?: string;
}

interface ProcessingState {
  file: File | null;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: ProcessProgress | null;
  error: string | null;
  result: {
    textLength: number;
    chunkCount: number;
    processor: 'browser' | 'server';
  } | null;
}

export function BrowserFileProcessor({ onUploadComplete, folderId }: FileProcessorProps) {
  const [state, setState] = useState<ProcessingState>({
    file: null,
    status: 'idle',
    progress: null,
    error: null,
    result: null,
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setState({
      file,
      status: 'uploading',
      progress: null,
      error: null,
      result: null,
    });

    try {
      // Step 1: 创建上传会话
      setState(prev => ({
        ...prev,
        progress: { stage: 'reading', progress: 10, message: '创建上传会话...' },
      }));

      const createSessionRes = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            folderId,
          }],
        }),
      });

      if (!createSessionRes.ok) {
        throw new Error('创建上传会话失败');
      }

      const sessionData = await createSessionRes.json();
      const session = sessionData.sessions[0];

      // Step 2: 上传文件到 OSS
      setState(prev => ({
        ...prev,
        progress: { stage: 'reading', progress: 30, message: '上传文件中...' },
      }));

      const uploadRes = await fetch(session.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('文件上传失败');
      }

      // Step 3: 确认上传（这会触发服务端处理）
      await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          assetId: session.assetId,
        }),
      });

      // Step 4: 判断处理方式
      const useBrowser = shouldProcessInBrowser(file) && isSupportedBrowserType(file.type);

      if (useBrowser) {
        // 浏览器端处理
        setState(prev => ({
          ...prev,
          status: 'processing',
          progress: { stage: 'processing', progress: 40, message: '本地处理中...' },
        }));

        const result = await processFileInBrowser(file, (progress) => {
          setState(prev => ({ ...prev, progress }));
        });

        const chunks = splitTextIntoChunks(result.text);

        // 保存处理结果（覆盖服务端处理的结果）
        const processRes = await fetch('/api/assets/process-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: session.assetId,
            text: result.text,
            chunks,
            processor: 'browser',
          }),
        });

        if (!processRes.ok) {
          throw new Error('保存处理结果失败');
        }

        setState(prev => ({
          ...prev,
          status: 'success',
          result: {
            textLength: result.text.length,
            chunkCount: chunks.length,
            processor: 'browser',
          },
        }));
      } else {
        // 服务端处理（已在 confirm 时通过 after() 触发）
        setState(prev => ({
          ...prev,
          status: 'success',
          result: {
            textLength: 0,
            chunkCount: 0,
            processor: 'server',
          },
          progress: { stage: 'done', progress: 100, message: '已提交服务器处理' },
        }));
      }

      onUploadComplete(session.assetId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '处理失败',
      }));
    }
  }, [onUploadComplete, folderId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const willUseBrowser = state.file && shouldProcessInBrowser(state.file) && isSupportedBrowserType(state.file.type);

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      {state.status === 'idle' && (
        <div
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{
            borderColor: 'var(--ci-border)',
            background: '#FFFCF6',
          }}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--ci-accent)';
            e.currentTarget.style.background = 'rgba(79,141,246,0.05)';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--ci-border)';
            e.currentTarget.style.background = '#FFFCF6';
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload size={40} className="mx-auto mb-3" style={{ color: '#94A3B8' }} />
          <p className="text-sm font-medium" style={{ color: '#0B1B2B' }}>
            拖拽文件到此处，或点击选择
          </p>
          <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
            支持 PDF、Word、文本文件 · 小于 8MB 文件在本地处理（更快）
          </p>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md,.csv"
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* 处理中状态 */}
      {(state.status === 'uploading' || state.status === 'processing') && state.file && (
        <div
          className="rounded-xl p-6"
          style={{ background: '#FFFCF6', border: '1px solid var(--ci-border)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText size={24} style={{ color: '#3B82F6' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#0B1B2B' }}>
                {state.file.name}
              </p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                {formatBytes(state.file.size)}
                {willUseBrowser && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                    本地处理
                  </span>
                )}
              </p>
            </div>
            <Loader2 size={20} className="animate-spin" style={{ color: '#3B82F6' }} />
          </div>

          {/* 进度条 */}
          {state.progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span style={{ color: '#64748B' }}>{state.progress.message}</span>
                <span style={{ color: '#94A3B8' }}>{state.progress.progress}%</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--ci-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${state.progress.progress}%`,
                    background: 'var(--ci-accent)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 成功状态 */}
      {state.status === 'success' && state.file && state.result && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={24} style={{ color: '#22C55E' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#0B1B2B' }}>
                {state.file.name} 处理完成
              </p>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                {state.result.processor === 'browser' ? (
                  <>
                    本地处理 · {state.result.textLength.toLocaleString()} 字符 · {state.result.chunkCount} 片段
                  </>
                ) : (
                  <>已提交服务器处理，请稍后刷新查看结果</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {state.status === 'error' && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={24} style={{ color: '#EF4444' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#0B1B2B' }}>
                处理失败
              </p>
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                {state.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {state.status === 'success' && (
        <button
          onClick={() => setState({ file: null, status: 'idle', progress: null, error: null, result: null })}
          className="w-full py-2 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'rgba(79,141,246,0.08)',
            color: '#0B1B2B',
            border: '1px solid rgba(79,141,246,0.25)',
          }}
        >
          上传更多文件
        </button>
      )}

      {state.status === 'error' && state.file && (
        <button
          onClick={() => handleFileSelect(state.file!)}
          className="w-full py-2 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'rgba(239,68,68,0.08)',
            color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          重试
        </button>
      )}
    </div>
  );
}