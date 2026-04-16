"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  Globe,
  Code2,
  ChevronRight,
  Sparkles,
  Target,
  FileText,
  ArrowUpDown,
} from "lucide-react";
import {
  getSeoAeoItems,
  persistSeoScores,
  type SeoAeoItem,
  type SeoAeoSummary,
  type SeoCheck,
} from "@/actions/seo-aeo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SkillStreamTrigger } from "@/components/skills";
import { SKILL_NAMES } from "@/lib/skills/names";

// ============================================
// Check Row
// ============================================

function CheckRow({ check }: { check: SeoCheck }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.05)] last:border-0">
      <div className="flex items-center gap-2">
        {check.passed ? (
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
        ) : check.earned > 0 ? (
          <AlertCircle size={13} className="text-amber-400 shrink-0" />
        ) : (
          <XCircle size={13} className="text-red-400 shrink-0" />
        )}
        <span className="text-[11px] text-slate-300">{check.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">{check.detail}</span>
        <span
          className={`text-[10px] font-mono font-bold ${
            check.passed
              ? "text-emerald-400"
              : check.earned > 0
              ? "text-amber-400"
              : "text-red-400"
          }`}
        >
          {check.earned}/{check.score}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Content Card
// ============================================

function ContentCard({ item, onRefresh }: { item: SeoAeoItem; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    item.seoHealthScore >= 80
      ? "text-emerald-400"
      : item.seoHealthScore >= 60
      ? "text-[#D4AF37]"
      : "text-red-400";

  const scoreBg =
    item.seoHealthScore >= 80
      ? "rgba(16,185,129,0.1)"
      : item.seoHealthScore >= 60
      ? "rgba(212,175,55,0.1)"
      : "rgba(239,68,68,0.1)";

  const scoreBorder =
    item.seoHealthScore >= 80
      ? "rgba(16,185,129,0.3)"
      : item.seoHealthScore >= 60
      ? "rgba(212,175,55,0.3)"
      : "rgba(239,68,68,0.3)";

  return (
    <div
      className="rounded-xl overflow-hidden border transition-all"
      style={{
        background: "linear-gradient(135deg, #0B1220 0%, #0A1018 70%, #0D1525 100%)",
        borderColor: expanded ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.07)",
        boxShadow: expanded ? "0 4px 24px -4px rgba(0,0,0,0.4)" : undefined,
      }}
    >
      {/* Header row */}
      <button
        className="w-full text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-4 px-4 py-3">
          {/* SEO score badge */}
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center flex-col"
            style={{ background: scoreBg, border: `1px solid ${scoreBorder}` }}
          >
            <span className={`text-base font-bold leading-none ${scoreColor}`}>
              {item.seoHealthScore}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">SEO</span>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate max-w-xs">
                {item.title}
              </span>
              {item.framework && (
                <span className="text-[10px] px-1.5 py-0.5 rounded text-slate-400 bg-slate-800 border border-slate-700 shrink-0">
                  FW-{item.framework}
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  item.status === "published"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : item.status === "draft"
                    ? "bg-slate-700 text-slate-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {item.primaryKeyword && (
                <span className="text-[10px] text-[#D4AF37] font-mono">
                  {item.primaryKeyword}
                </span>
              )}
              <span className="text-[10px] text-slate-500">
                {item.wordCount.toLocaleString()} words
              </span>
              {/* Indicator pills */}
              <span
                className={`text-[10px] flex items-center gap-0.5 ${
                  item.hasSchemaJson ? "text-emerald-400" : "text-slate-600"
                }`}
              >
                <Code2 size={10} />
                Schema
              </span>
              <span
                className={`text-[10px] flex items-center gap-0.5 ${
                  item.hasGeoVersion ? "text-[#D4AF37]" : "text-slate-600"
                }`}
              >
                <Globe size={10} />
                GEO
              </span>
              <span
                className={`text-[10px] flex items-center gap-0.5 ${
                  item.hasFaqSection ? "text-emerald-400" : "text-slate-600"
                }`}
              >
                <FileText size={10} />
                FAQ
              </span>
            </div>
          </div>

          {/* AEO score + link */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-slate-600">AEO</div>
              <div
                className={`text-sm font-bold ${
                  item.aeoScore >= 70
                    ? "text-emerald-400"
                    : item.aeoScore >= 40
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {item.aeoScore}
              </div>
            </div>
            <Link
              href={`/customer/marketing/contents/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-[rgba(212,175,55,0.1)] transition-colors"
            >
              <ChevronRight size={14} className="text-slate-500 hover:text-[#D4AF37]" />
            </Link>
          </div>
        </div>
      </button>

      {/* Expanded checks */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* SEO checks */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={12} className="text-[#D4AF37]" />
                <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">
                  SEO 检查项
                </span>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {item.checks.map((ch) => (
                  <CheckRow key={ch.key} check={ch} />
                ))}
              </div>
            </div>

            {/* AEO checks */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-[#D4AF37]" />
                <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">
                  AEO 结构检查
                </span>
              </div>
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  { label: "FAQPage JSON-LD", ok: item.hasSchemaJson, detail: item.hasSchemaJson ? "已挂载" : "缺失 — 影响 Rich Results" },
                  { label: "GEO 优化版本", ok: item.hasGeoVersion, detail: item.hasGeoVersion ? "已生成" : "缺失 — AI 引擎无法引用" },
                  { label: "FAQ 内容区块", ok: item.hasFaqSection, detail: item.hasFaqSection ? "已包含" : "建议追加 FAQ 段落" },
                  { label: "结论/总结段落", ok: item.hasConclusion, detail: item.hasConclusion ? "已包含" : "建议追加结论段" },
                ].map((aeo) => (
                  <div key={aeo.label} className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] last:border-0 pb-1.5 last:pb-0">
                    <div className="flex items-center gap-2">
                      {aeo.ok ? (
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-red-400 shrink-0" />
                      )}
                      <span className="text-[11px] text-slate-300">{aeo.label}</span>
                    </div>
                    <span className={`text-[10px] ${aeo.ok ? "text-slate-500" : "text-amber-400"}`}>
                      {aeo.detail}
                    </span>
                  </div>
                ))}
              </div>

              {/* AI Quick Actions */}
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <SkillStreamTrigger
                    skillName={SKILL_NAMES.MARKETING_FIX_SEO_ISSUES}
                    displayName="AI 修复 SEO"
                    description="自动修复标题、meta description、slug 等 SEO 缺陷"
                    entityType="SeoContent"
                    entityId={item.id}
                    input={{
                      contentId: item.id,
                      title: item.title,
                      slug: item.slug,
                      metaDescription: item.metaDescription ?? undefined,
                      seoHealthScore: item.seoHealthScore,
                      issues: item.checks.filter((c) => !c.passed).map((c) => ({ type: c.key, message: c.detail })),
                      targetKeywords: item.keywords,
                    }}
                    useCompanyProfile={true}
                    onComplete={() => { onRefresh(); }}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[11px] border-[rgba(239,68,68,0.4)] text-red-400 hover:bg-red-500/10"
                  />
                  <SkillStreamTrigger
                    skillName={SKILL_NAMES.MARKETING_OPTIMIZE_GEO}
                    displayName="AI 优化 GEO"
                    description="生成适合 AI 引擎引用的 GEO 版本与 FAQ 结构化数据"
                    entityType="SeoContent"
                    entityId={item.id}
                    input={{
                      contentId: item.id,
                      title: item.title,
                      bodyHtml: item.content.slice(0, 5000),
                      targetKeywords: item.keywords,
                      currentAeoScore: item.aeoScore,
                    }}
                    useCompanyProfile={true}
                    onComplete={() => { onRefresh(); }}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[11px] border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  />
                </div>
                <Link
                  href={`/customer/marketing/contents/${item.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
                >
                  <FileText size={11} />
                  前往编辑内容
                  <ChevronRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Page
// ============================================

type SortKey = "score_asc" | "score_desc" | "aeo_desc" | "updated";
type FilterKey = "all" | "problem" | "no_schema" | "no_geo";

export default function SeoAeoPage() {
  const [summary, setSummary] = useState<SeoAeoSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score_asc");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSeoAeoItems();
      setSummary(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScan = async () => {
    if (!summary || isScanning) return;
    setIsScanning(true);
    toast.info("正在扫描所有内容并保存评分...");
    try {
      const scores = summary.items.map((i) => ({
        id: i.id,
        seoHealthScore: i.seoHealthScore,
        aeoScore: i.aeoScore,
      }));
      await persistSeoScores(scores);
      toast.success(`已保存 ${scores.length} 条内容的 SEO/AEO 评分`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "扫描失败");
    } finally {
      setIsScanning(false);
    }
  };

  const filtered = useMemo(() => {
    if (!summary) return [];
    let items = [...summary.items];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.primaryKeyword || "").toLowerCase().includes(q) ||
          i.slug.toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter === "problem") items = items.filter((i) => i.seoHealthScore < 60);
    if (filter === "no_schema") items = items.filter((i) => !i.hasSchemaJson);
    if (filter === "no_geo") items = items.filter((i) => !i.hasGeoVersion);

    // Sort
    if (sortKey === "score_asc") items.sort((a, b) => a.seoHealthScore - b.seoHealthScore);
    if (sortKey === "score_desc") items.sort((a, b) => b.seoHealthScore - a.seoHealthScore);
    if (sortKey === "aeo_desc") items.sort((a, b) => b.aeoScore - a.aeoScore);
    if (sortKey === "updated")
      items.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    return items;
  }, [summary, search, filter, sortKey]);

  const avgColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-[#D4AF37]" : "text-red-400";

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
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse 60% 55% at 50% -15%, rgba(212,175,55,0.13) 0%, transparent 65%)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)" }}
              >
                <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SEO / AEO 工作台</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  内容质量检测 · Meta 合规 · FAQPage Schema · AI 引擎可见性
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {summary && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
                >
                  <Target className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="text-sm text-[#D4AF37] font-medium">
                    {summary.total} 条内容
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                disabled={isLoading}
                className="text-slate-400 hover:text-[#D4AF37]"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="sm"
                onClick={handleScan}
                disabled={isScanning || isLoading || !summary?.total}
                className="hover:opacity-90 disabled:opacity-50"
                style={{ background: "#D4AF37", color: "#0B1220", boxShadow: "0 4px 16px -2px rgba(212,175,55,0.35)" }}
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isScanning ? "扫描中..." : "批量扫描保存"}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          {summary && (
            <div className="grid grid-cols-5 gap-4 mt-6 relative">
              {[
                {
                  label: "平均 SEO 分",
                  value: summary.avgSeoScore,
                  color: avgColor(summary.avgSeoScore),
                },
                {
                  label: "平均 AEO 分",
                  value: summary.avgAeoScore,
                  color: avgColor(summary.avgAeoScore),
                },
                {
                  label: "有 Schema",
                  value: summary.withSchema,
                  color: "text-emerald-400",
                },
                {
                  label: "有 GEO 版本",
                  value: summary.withGeo,
                  color: "text-[#D4AF37]",
                },
                {
                  label: "问题内容 (<60)",
                  value: summary.belowThreshold,
                  color: summary.belowThreshold > 0 ? "text-red-400" : "text-emerald-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[#E8E0D0] bg-[#F0EBD8] flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索标题、关键词..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B] placeholder:text-slate-400"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger className="w-40 bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B]">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#FFFCF7] border-[#E8E0D0]">
            <SelectItem value="all">全部内容</SelectItem>
            <SelectItem value="problem">问题内容 (&lt;60分)</SelectItem>
            <SelectItem value="no_schema">缺 Schema</SelectItem>
            <SelectItem value="no_geo">缺 GEO 版本</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-40 bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B]">
            <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#FFFCF7] border-[#E8E0D0]">
            <SelectItem value="score_asc">SEO 分 ↑ 最低优先</SelectItem>
            <SelectItem value="score_desc">SEO 分 ↓ 最高优先</SelectItem>
            <SelectItem value="aeo_desc">AEO 分 ↓</SelectItem>
            <SelectItem value="updated">最近更新</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length !== summary?.total && (
          <span className="text-xs text-slate-500">
            显示 {filtered.length} / {summary?.total}
          </span>
        )}
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
              style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <BarChart3 className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">
              {search || filter !== "all" ? "未找到匹配内容" : "暂无 SEO 内容"}
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              {search || filter !== "all"
                ? "尝试清除筛选条件"
                : "在「内容规划」页面生成内容包后，这里将显示 SEO/AEO 检测结果"}
            </p>
            {!search && filter === "all" && (
              <Link href="/customer/marketing/briefs">
                <Button
                  size="sm"
                  className="mt-4 hover:opacity-90"
                  style={{ background: "#D4AF37", color: "#0B1220" }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  前往生成内容
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-slate-500 px-1 mb-4">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />≥80 优秀</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D4AF37]" />60–79 良好</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />&lt;60 需改进</span>
              <span className="ml-auto flex items-center gap-1 text-slate-600">点击行展开检查详情</span>
            </div>
            {filtered.map((item) => (
              <ContentCard key={item.id} item={item} onRefresh={loadData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
