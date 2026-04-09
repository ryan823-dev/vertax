"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Globe, X, ArrowRight, Loader2, CheckCircle2,
  AlertCircle, ExternalLink, RefreshCcw, Play, Pause,
} from "lucide-react";

interface PollStatus {
  id: string;
  batchId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalPages: number;
  processedPages: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface WebImportDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function WebImportDialog({ open, onClose, onComplete }: WebImportDialogProps) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [maxPages, setMaxPages] = useState(500);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<PollStatus | null>(null);
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setUrl("");
    setMaxPages(500);
    setTaskId(null);
    setStatus(null);
    setError("");
    setIsPolling(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleClose = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    reset();
    onClose();
  };

  // Polling effect
  useEffect(() => {
    if (!taskId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/assets/web-import?taskId=${taskId}`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await res.json();
        setStatus(data);

        if (data.status === "completed" || data.status === "failed") {
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("[polling] Error:", err);
        setError("Failed to fetch progress");
        setIsPolling(false);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [taskId, isPolling]);

  const handleSubmit = async () => {
    setError("");

    // URL validation
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      setUrlError("Invalid URL format. Please enter a valid URL.");
      return;
    }

    try {
      const res = await fetch("/api/assets/web-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url, maxPages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start crawl task");
      }

      // Task queued successfully
      setTaskId(data.taskId);
      setStatus({
        id: data.taskId,
        batchId: data.batchId,
        status: "pending",
        totalPages: data.discoveredPages,
        processedPages: 0,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsPolling(true);
    } catch (err) {
      console.error("[web-import] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to start crawl task");
    }
  };

  const progress = status ? (status.processedPages / status.totalPages) * 100 : 0;
  const isComplete = status?.status === "completed";
  const isFailed = status?.status === "failed";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6" style={{ color: "#D4AF37" }} />
            <h2 className="text-xl font-semibold" style={{ color: "#FFFFFF" }}>
              网站智采
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: "#FFFFFF" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* === INPUT PHASE === */}
          {!taskId && (
            <>
              {/* URL Input */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  目标网站 URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlError("");
                    }}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  {urlError && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{urlError}</p>
                  )}
                </div>
              </div>

              {/* Max Pages Slider */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  最大采集页面数
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={1000}
                    step={50}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="flex-1 accent-[#D4AF37]"
                  />
                  <span
                    className="text-sm font-mono w-16 text-right"
                    style={{ color: "#D4AF37" }}
                  >
                    {maxPages}
                  </span>
                </div>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  建议值：企业官网 200-500，大型网站 500-1000
                </p>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                系统将自动发现网站页面（优先通过 sitemap.xml，否则链接爬取），提取文本内容并导入知识库。
              </p>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!url}
                className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
                  color: "#000000",
                }}
              >
                开始采集
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* === PROCESSING / POLLING PHASE === */}
          {taskId && status && (
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
                  ) : isFailed ? (
                    <AlertCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#D4AF37" }} />
                  )}
                  <div>
                    <h3 className="text-lg font-medium" style={{ color: "#FFFFFF" }}>
                      {isComplete
                        ? "采集完成"
                        : isFailed
                        ? "采集失败"
                        : "后台采集中..."}
                    </h3>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {status.totalPages} pages total
                    </p>
                  </div>
                </div>

                {/* Manual Refresh */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/assets/web-import?taskId=${taskId}`, {
                        credentials: "include",
                      });
                      const data = await res.json();
                      setStatus(data);
                    } catch (err) {
                      console.error("[manual refresh] Error:", err);
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Refresh status"
                >
                  <RefreshCcw className="w-5 h-5" style={{ color: "#D4AF37" }} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: isFailed
                        ? "#ef4444"
                        : isComplete
                        ? "#22c55e"
                        : "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span>Processed: {status.processedPages}</span>
                  <span>Total: {status.totalPages}</span>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Status</span>
                  <span style={{ color: "#D4AF37" }}>{status.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Batch ID</span>
                  <span style={{ color: "rgba(255,255,255,0.7)" }} className="font-mono">
                    {status.batchId.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Started</span>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    {new Date(status.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isComplete || isFailed ? (
                  <>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-3 rounded-xl font-medium transition-colors border border-white/20 hover:bg-white/10"
                      style={{ color: "#FFFFFF" }}
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        onComplete?.();
                        handleClose();
                      }}
                      className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
                        color: "#000000",
                      }}
                    >
                      View Assets
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsPolling(!isPolling)}
                      className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-white/20 hover:bg-white/10"
                      style={{ color: "#FFFFFF" }}
                    >
                      {isPolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPolling ? "Pause Updates" : "Resume Updates"}
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-3 rounded-xl font-medium transition-colors"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)",
                        color: "#000000",
                      }}
                    >
                      Close (Running in Background)
                    </button>
                  </>
                )}
              </div>

              {/* Info Note */}
              {(isComplete || isFailed) && (
                <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {isComplete
                    ? `Successfully imported ${status.processedPages} pages to your knowledge base.`
                    : "Crawl task failed. Check logs for details."}
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Error</p>
                <p className="text-sm mt-1" style={{ color: "rgba(239, 68, 68, 0.8)" }}>{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
