"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Download,
  Search,
  FileText,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { getGeoContents, type GeoContentItem } from "@/actions/geo-center";
import { getDistributionStats, type GeoDistributionStats } from "@/actions/geo-distribution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SkillStreamTrigger } from "@/components/skills";
import { SKILL_NAMES } from "@/lib/skills/names";
import { GeoDistributionPanel } from "@/components/marketing/geo-distribution-panel";

function GeoCard({ item, onRefresh }: { item: GeoContentItem; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const geo = item.geoVersion as string;
  const meta = item.aiMetadata;
  const framework = meta?.seoFramework as string | undefined;
  const wordCount = meta?.wordCount as number | undefined;
  const keyword = meta?.primaryKeyword as string | undefined;
  const generatedAt = meta?.generatedAt as string | undefined;
  const geoWordCount = geo.split(/\s+/).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(geo).then(() => {
      setCopied(true);
      toast.success("GEO 版本已复制到剪贴板");
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([geo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geo-${item.slug || item.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已下载 GEO 文件");
  };

  return (
    <div
      className="rounded-2xl border border-[rgba(212,175,55,0.2)] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0B1220 0%, #0A1018 70%, #0D1525 100%)",
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div className="p-5 border-b border-[rgba(212,175,55,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white leading-snug line-clamp-2">
              {item.title}
            </h3>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {keyword && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-mono text-[#D4AF37]"
                  style={{
                    background: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.2)",
                  }}
                >
                  {keyword}
                </span>
              )}
              {framework && (
                <span className="text-[10px] px-2 py-0.5 rounded text-slate-300 bg-slate-800 border border-slate-700">
                  Framework {framework}
                </span>
              )}
              {wordCount && (
                <span className="text-[10px] text-slate-500">
                  {wordCount.toLocaleString()} words (article)
                </span>
              )}
              {generatedAt && (
                <span className="text-[10px] text-slate-600">
                  {new Date(generatedAt).toLocaleDateString("zh-CN")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="h-8 px-2 text-slate-400 hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)]"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className="h-8 px-3 text-[#0B1220] hover:opacity-90"
              style={{
                background: "#D4AF37",
                boxShadow: "0 2px 12px -2px rgba(212,175,55,0.4)",
              }}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
        </div>
      </div>

      {/* GEO preview */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[11px] font-medium text-[#D4AF37] uppercase tracking-wider">
            GEO-Optimized Version
          </span>
          <span className="text-[10px] text-slate-600 ml-auto">
            AI Citation Ready · ChatGPT / Perplexity / Claude
          </span>
        </div>
        <div
          className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed line-clamp-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {geo}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-slate-600">
            {geoWordCount} words · 可粘贴至 About / FAQ / Landing Page
          </span>
          <div className="flex items-center gap-2">
            <SkillStreamTrigger
              skillName={SKILL_NAMES.MARKETING_OPTIMIZE_GEO}
              displayName="AI 重新优化"
              description="重新生成更适合 AI 引擎引用的 GEO 版本与 FAQ"
              entityType="SeoContent"
              entityId={item.id}
              input={{
                contentId: item.id,
                title: item.title,
                bodyHtml: geo,
                targetKeywords: item.keywords,
              }}
              useCompanyProfile={true}
              onComplete={() => { onRefresh(); }}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)]"
            />
            <Link href={`/customer/marketing/contents/${item.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-slate-500 hover:text-[#D4AF37]"
              >
                查看完整内容{" "}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Distribution Tracking */}
      <div className="px-5 pb-5">
        <GeoDistributionPanel contentId={item.id} keywords={item.keywords} />
      </div>
    </div>
  );
}

export default function GeoCenterPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<GeoContentItem[]>([]);
  const [distStats, setDistStats] = useState<GeoDistributionStats | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, stats] = await Promise.all([
        getGeoContents(),
        getDistributionStats(),
      ]);
      setItems(data);
      setDistStats(stats);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      ((item.aiMetadata?.primaryKeyword as string) || "").toLowerCase().includes(q)
    );
  });

  const avgGeoWords = items.length
    ? Math.round(
        items.reduce((acc, i) => acc + (i.geoVersion?.split(/\s+/).length || 0), 0) /
          items.length
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#F7F3E8]">
      {/* Header */}
      <div
        className="border-b border-[#E8E0D0]"
        style={{
          background: "linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)",
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.45)",
        }}
      >
        <div className="px-8 py-6 relative overflow-hidden">
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 60% 55% at 50% -15%, rgba(212,175,55,0.13) 0%, transparent 65%)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.3)",
                }}
              >
                <Globe className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">GEO 发布中心</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  AI 引擎优化版本 · 分发至 ChatGPT / Perplexity / Claude 的可引用内容
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  background: "rgba(212,175,55,0.08)",
                  border: "1px solid rgba(212,175,55,0.2)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-sm text-[#D4AF37] font-medium">
                  {items.length} 条 GEO 内容
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                disabled={isLoading}
                className="text-slate-400 hover:text-[#D4AF37]"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 relative">
            {[
              { label: "GEO 版本总数", value: items.length, color: "text-[#D4AF37]" },
              { label: "平均 GEO 字数", value: avgGeoWords, color: "text-slate-300" },
              { label: "AI 引擎已引用", value: distStats?.cited ?? 0, color: "text-emerald-400" },
              { label: "分发渠道注册", value: distStats?.totalRecords ?? 0, color: "text-blue-400" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[#E8E0D0] bg-[#F0EBD8] flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索标题、Slug 或关键词..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B] placeholder:text-slate-400"
          />
        </div>
        <Link href="/customer/marketing/briefs">
          <Button
            size="sm"
            className="hover:opacity-90"
            style={{
              background: "#D4AF37",
              color: "#0B1220",
              boxShadow: "0 4px 16px -2px rgba(212,175,55,0.35)",
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成新 GEO 内容
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-24 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)",
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(212,175,55,0.12)",
                border: "1px solid rgba(212,175,55,0.3)",
              }}
            >
              <Globe className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">
              {search ? "未找到匹配内容" : "暂无 GEO 内容"}
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              {search
                ? "尝试搜索其他关键词"
                : "在「内容规划」页面点击「一键生成完整内容包」，可自动产出带 GEO 版本的内容"}
            </p>
            {!search && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link href="/customer/marketing/briefs">
                  <Button
                    size="sm"
                    className="hover:opacity-90"
                    style={{ background: "#D4AF37", color: "#0B1220" }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    前往内容规划
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filtered.map((item) => (
              <GeoCard key={item.id} item={item} onRefresh={loadData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
