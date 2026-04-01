"use client";

/**
 * GeoDistributionPanel - Track GEO content distribution and AI engine citations
 *
 * Shows distribution status per channel, citation status, and allows
 * registering distributions and triggering citation checks.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  getDistributionsForContent,
  registerDistribution,
  batchRegisterDistribution,
  deleteDistribution,
  getChannelLabel,
  type GeoDistributionData,
} from "@/actions/geo-distribution";
import type { GeoChannel, CitationStatus } from "@/actions/geo-distribution";

// ==================== Types ====================

interface GeoDistributionPanelProps {
  contentId: string;
  keywords: string[];
}

const ALL_CHANNELS: GeoChannel[] = [
  "CHATGPT",
  "PERPLEXITY",
  "CLAUDE",
  "GEMINI",
  "BING_COPILOT",
];

// ==================== Component ====================

export function GeoDistributionPanel({
  contentId,
  keywords,
}: GeoDistributionPanelProps) {
  const [records, setRecords] = useState<GeoDistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDistributionsForContent(contentId);
      setRecords(data);
    } catch (err) {
      console.error("Failed to load distributions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    loadRecords();
  }, [contentId, loadRecords]);

  const registeredChannels = new Set(records.map((r) => r.channel));
  const unregisteredChannels = ALL_CHANNELS.filter(
    (ch) => !registeredChannels.has(ch)
  );

  const handleRegisterAll = async () => {
    if (unregisteredChannels.length === 0) return;
    setIsRegistering(true);
    try {
      await batchRegisterDistribution({
        contentId,
        channels: unregisteredChannels,
        queryKeywords: keywords,
      });
      await loadRecords();
    } catch (err) {
      console.error("Register failed:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterChannel = async (channel: GeoChannel) => {
    try {
      await registerDistribution({
        contentId,
        channel,
        queryKeywords: keywords,
      });
      await loadRecords();
    } catch (err) {
      console.error("Register channel failed:", err);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      await deleteDistribution(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const statusIcon = (status: CitationStatus) => {
    switch (status) {
      case "CITED":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "NOT_CITED":
        return <XCircle size={14} className="text-red-400" />;
      case "PARTIAL":
        return <AlertCircle size={14} className="text-amber-500" />;
      case "ERROR":
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-slate-400" />;
    }
  };

  const statusLabel = (status: CitationStatus) => {
    switch (status) {
      case "CITED": return "已引用";
      case "NOT_CITED": return "未引用";
      case "PARTIAL": return "部分引用";
      case "PENDING": return "待检测";
      case "ERROR": return "检测失败";
      default: return status;
    }
  };

  const statusColor = (status: CitationStatus) => {
    switch (status) {
      case "CITED": return "bg-emerald-100 text-emerald-700";
      case "NOT_CITED": return "bg-red-50 text-red-600";
      case "PARTIAL": return "bg-amber-50 text-amber-600";
      case "PENDING": return "bg-slate-100 text-slate-500";
      case "ERROR": return "bg-red-50 text-red-500";
      default: return "bg-slate-100 text-slate-500";
    }
  };

  const channelIcon = (channel: GeoChannel) => {
    // Simple emoji/character icons for each AI engine
    switch (channel) {
      case "CHATGPT": return "G";
      case "PERPLEXITY": return "P";
      case "CLAUDE": return "C";
      case "GEMINI": return "Ge";
      case "BING_COPILOT": return "B";
      case "CUSTOM_SITE": return "S";
      default: return "?";
    }
  };

  return (
    <div
      className="rounded-2xl border border-[rgba(212,175,55,0.2)] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0B1220 0%, #0A1018 70%, #0D1525 100%)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-[rgba(212,175,55,0.12)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-[#D4AF37]" />
          <span className="text-sm font-medium text-white">AI 引擎分发追踪</span>
          <span className="text-xs text-slate-500">
            {records.length} / {ALL_CHANNELS.length} 渠道
          </span>
        </div>
        <div className="flex items-center gap-2">
          {unregisteredChannels.length > 0 && (
            <button
              onClick={handleRegisterAll}
              disabled={isRegistering}
              className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                color: "#D4AF37",
              }}
            >
              {isRegistering ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Plus size={10} />
              )}
              全部注册
            </button>
          )}
          <button
            onClick={loadRecords}
            disabled={isLoading}
            className="text-slate-400 hover:text-[#D4AF37] transition-colors p-1"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Records */}
      <div className="p-4">
        {isLoading && records.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="text-[#D4AF37] animate-spin" />
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Channel icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: "rgba(212,175,55,0.12)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    color: "#D4AF37",
                  }}
                >
                  {channelIcon(record.channel)}
                </div>

                {/* Channel info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white">
                    {getChannelLabel(record.channel)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor(record.citationStatus)}`}
                    >
                      {statusLabel(record.citationStatus)}
                    </span>
                    {record.citationScore !== null && (
                      <span className="text-[10px] text-slate-500">
                        质量 {record.citationScore}%
                      </span>
                    )}
                    {record.lastCheckedAt && (
                      <span className="text-[10px] text-slate-600">
                        {new Date(record.lastCheckedAt).toLocaleDateString("zh-CN")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Citation URL */}
                {record.citationUrl && (
                  <a
                    href={record.citationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4AF37] hover:text-[#E5C040] p-1"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}

                {/* Status icon */}
                {statusIcon(record.citationStatus)}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(record.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Globe size={24} className="text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 mb-3">
              尚未注册任何 AI 引擎分发渠道
            </p>
            <button
              onClick={handleRegisterAll}
              disabled={isRegistering}
              className="px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{
                background: "#D4AF37",
                color: "#0B1220",
              }}
            >
              {isRegistering ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              注册全部 AI 引擎
            </button>
          </div>
        )}

        {/* Unregistered channels */}
        {unregisteredChannels.length > 0 && records.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-slate-600 mb-2">
              未注册渠道
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unregisteredChannels.map((ch) => (
                <button
                  key={ch}
                  onClick={() => handleRegisterChannel(ch)}
                  className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(212,175,55,0.2)",
                    color: "rgba(212,175,55,0.6)",
                  }}
                >
                  <Plus size={8} />
                  {getChannelLabel(ch)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
