"use client";

import { useState, useRef, useCallback } from "react";
import {
  Globe, X, ArrowRight, Loader2, CheckCircle2,
  AlertCircle, SkipForward, ExternalLink, Sparkles,
} from "lucide-react";

type Phase = "input" | "discovering" | "fetching" | "done" | "error";

interface SSEProgress {
  phase: Phase;
  message: string;
  discovered: number;
  fetched: number;
  failed: number;
  skipped: number;
  currentUrl?: string;
  currentIndex?: number;
  results?: Array<{ url: string; title: string; status: string; error?: string }>;
  error?: string;
}

interface WebImportDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function WebImportDialog({ open, onClose, onComplete }: WebImportDialogProps) {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(500);
  const [phase, setPhase] = useState<Phase>("input");
  const [progress, setProgress] = useState<SSEProgress | null>(null);
  const [urlError, setUrlError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setUrl("");
    setMaxPages(50);
    setPhase("input");
    setProgress(null);
    setUrlError("");
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleClose = () => {
    if (phase === "discovering" || phase === "fetching") {
      if (!confirm("正在导入中，确定要取消吗？")) return;
    }
    reset();
    onClose();
  };

  const validateUrl = (v: string) => {
    if (!v.trim()) return "请输入网址";
    try {
      const u = new URL(v.startsWith("http") ? v : `https://${v}`);
      if (!u.hostname.includes(".")) return "请输入有效的网址";
      return "";
    } catch {
      return "网址格式不正确";
    }
  };

  const handleStart = async () => {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const err = validateUrl(fullUrl);
    if (err) {
      setUrlError(err);
      return;
    }
    setUrlError("");
    setPhase("discovering");
    setProgress({
      phase: "discovering",
      message: "正在发现页面...",
      discovered: 0,
      fetched: 0,
      failed: 0,
      skipped: 0,
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/assets/web-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl, maxPages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as SSEProgress;
            setProgress(data);
            setPhase(data.phase);
          } catch {
            // invalid JSON line, skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPhase("error");
      setProgress((prev) => ({
        ...(prev || {
          phase: "error",
          discovered: 0,
          fetched: 0,
          failed: 0,
          skipped: 0,
        }),
        phase: "error",
        message: err instanceof Error ? err.message : "导入失败",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  };

  const handleDone = () => {
    reset();
    onComplete?.();
    onClose();
  };

  if (!open) return null;

  const isWorking = phase === "discovering" || phase === "fetching";
  const progressPercent =
    progress && progress.discovered > 0
      ? Math.round(
          ((progress.fetched + progress.failed + progress.skipped) /
            progress.discovered) *
            100
        )
      : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(11,18,32,0.65)", backdropFilter: "blur(6px)" }}
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0B1220 0%, #0D1525 100%)",
            border: "1px solid rgba(212,175,55,0.2)",
            boxShadow:
              "0 24px 64px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "radial-gradient(ellipse 80% 100% at 50% -20%, rgba(212,175,55,0.1) 0%, transparent 60%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.3)",
                }}
              >
                <Globe size={18} style={{ color: "#D4AF37" }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={12} style={{ color: "#D4AF37" }} />
                  <span
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "#D4AF37" }}
                  >
                    Web Import
                  </span>
                </div>
                <h3 className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
                  {"\u7F51\u7AD9\u667A\u91C7"}
                </h3>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* === INPUT phase === */}
            {phase === "input" && (
              <>
                <div>
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {"\u7F51\u7AD9\u5730\u5740"}
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: urlError
                        ? "1px solid rgba(239,68,68,0.5)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <Globe size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (urlError) setUrlError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleStart()}
                      placeholder="example.com"
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: "#FFFFFF" }}
                      autoFocus
                    />
                  </div>
                  {urlError && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#EF4444" }}>
                      <AlertCircle size={11} />
                      {urlError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {"\u6700\u5927\u91C7\u96C6\u9875\u9762\u6570"}
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
                </div>

                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {"\u7CFB\u7EDF\u5C06\u81EA\u52A8\u53D1\u73B0\u7F51\u7AD9\u9875\u9762\uFF08\u4F18\u5148\u901A\u8FC7 sitemap.xml\uFF0C\u5426\u5219\u94FE\u63A5\u722C\u53D6\uFF09\uFF0C\u63D0\u53D6\u6587\u672C\u5185\u5BB9\u5E76\u5BFC\u5165\u77E5\u8BC6\u5E93\u3002"}
                </p>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  建议值：企业官网 200-500，大型网站 500-1000
                </p>
              </>
            )}

            {/* === DISCOVERING / FETCHING phase === */}
            {isWorking && progress && (
              <>
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {phase === "discovering" ? "\u6B63\u5728\u53D1\u73B0\u9875\u9762..." : "\u6B63\u5728\u5BFC\u5165\u5185\u5BB9..."}
                    </span>
                    {progress.discovered > 0 && (
                      <span className="text-xs font-mono" style={{ color: "#D4AF37" }}>
                        {progressPercent}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: phase === "discovering"
                          ? (progress.discovered > 0 ? "30%" : "10%")
                          : `${Math.max(5, progressPercent)}%`,
                        background: "linear-gradient(90deg, #D4AF37, #F0D060)",
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "\u53D1\u73B0", value: progress.discovered, color: "#60A5FA" },
                    { label: "\u5DF2\u5BFC\u5165", value: progress.fetched, color: "#34D399" },
                    { label: "\u5931\u8D25", value: progress.failed, color: "#F87171" },
                    { label: "\u5DF2\u8DF3\u8FC7", value: progress.skipped, color: "#94A3B8" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="text-center py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <div className="text-lg font-bold" style={{ color: s.color }}>
                        {s.value}
                      </div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Current URL */}
                {progress.currentUrl && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "#D4AF37" }} />
                    <span
                      className="text-xs truncate"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {progress.currentUrl}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* === DONE phase === */}
            {phase === "done" && progress && (
              <>
                <div className="text-center py-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: "rgba(52,211,153,0.12)",
                      border: "1px solid rgba(52,211,153,0.3)",
                    }}
                  >
                    <CheckCircle2 size={28} style={{ color: "#34D399" }} />
                  </div>
                  <p className="text-base font-bold" style={{ color: "#FFFFFF" }}>
                    {"\u5BFC\u5165\u5B8C\u6210"}
                  </p>
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {progress.message}
                  </p>
                </div>

                {/* Stats summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "\u6210\u529F\u5BFC\u5165", value: progress.fetched, color: "#34D399" },
                    { label: "\u5931\u8D25", value: progress.failed, color: "#F87171" },
                    { label: "\u5DF2\u8DF3\u8FC7", value: progress.skipped, color: "#94A3B8" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="text-center py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <div className="text-lg font-bold" style={{ color: s.color }}>
                        {s.value}
                      </div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result list (scroll) */}
                {progress.results && progress.results.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {progress.results.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        {r.status === "fetched" ? (
                          <CheckCircle2 size={12} style={{ color: "#34D399" }} />
                        ) : r.status === "skipped" ? (
                          <SkipForward size={12} style={{ color: "#94A3B8" }} />
                        ) : (
                          <AlertCircle size={12} style={{ color: "#F87171" }} />
                        )}
                        <span
                          className="truncate flex-1"
                          style={{
                            color:
                              r.status === "fetched"
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {r.title || r.url}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* === ERROR phase === */}
            {phase === "error" && progress && (
              <div className="text-center py-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  <AlertCircle size={28} style={{ color: "#EF4444" }} />
                </div>
                <p className="text-base font-bold" style={{ color: "#FFFFFF" }}>
                  {"\u5BFC\u5165\u5931\u8D25"}
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {progress.message || progress.error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 flex items-center justify-end gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {phase === "input" && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm rounded-xl transition-colors"
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                >
                  {"\u53D6\u6D88"}
                </button>
                <button
                  onClick={handleStart}
                  disabled={!url.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "#D4AF37",
                    color: "#0B1220",
                    boxShadow: "0 4px 16px -2px rgba(212,175,55,0.35)",
                  }}
                  onMouseEnter={(e) => {
                    if (!url.trim()) return;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px -2px rgba(212,175,55,0.5)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px -2px rgba(212,175,55,0.35)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "";
                  }}
                >
                  <ArrowRight size={15} />
                  {"\u5F00\u59CB\u91C7\u96C6"}
                </button>
              </>
            )}

            {isWorking && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-xl transition-colors"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {"\u53D6\u6D88"}
              </button>
            )}

            {(phase === "done" || phase === "error") && (
              <>
                {phase === "error" && (
                  <button
                    onClick={() => { setPhase("input"); setProgress(null); }}
                    className="px-4 py-2 text-sm rounded-xl transition-colors"
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {"\u91CD\u8BD5"}
                  </button>
                )}
                <button
                  onClick={handleDone}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "#D4AF37",
                    color: "#0B1220",
                    boxShadow: "0 4px 16px -2px rgba(212,175,55,0.35)",
                  }}
                >
                  {phase === "done" ? "\u5B8C\u6210" : "\u5173\u95ED"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
