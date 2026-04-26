"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileEdit,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  Target,
  Users,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Edit,
  ArrowRight,
  Filter,
  Zap,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getBriefs,
  getBriefStats,
  createBrief,
  deleteBrief,
  generateBriefFromPersona,
  type BriefListItem,
  type SearchIntent,
} from "@/actions/briefs";
import { generateFullContentPackage } from "@/actions/contents";
import { getPersonasBySegment } from "@/actions/personas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PersonaItem = {
  id: string;
  name: string;
  title: string;
};

const INTENT_LABELS: Record<string, string> = {
  informational: "信息查询",
  commercial: "商业调研",
  transactional: "交易决策",
  navigational: "品牌导航",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-slate-500" },
  ready: { label: "就绪", color: "bg-blue-500" },
  in_progress: { label: "进行中", color: "bg-amber-500" },
  done: { label: "已完成", color: "bg-emerald-500" },
};

export default function BriefsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, ready: 0, inProgress: 0, done: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [personas, setPersonas] = useState<PersonaItem[]>([]);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Full content package generation state (per brief)
  const [generatingPackage, setGeneratingPackage] = useState<string | null>(null);
  const [donePackages, setDonePackages] = useState<Set<string>>(new Set());

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    targetKeywords: "",
    intent: "informational" as SearchIntent,
    targetPersonaId: "",
    notes: "",
  });
  const [selectedPersonaForAI, setSelectedPersonaForAI] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: { status?: string; search?: string } = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (search.trim()) filters.search = search.trim();

      const [briefsData, statsData, personasData] = await Promise.all([
        getBriefs(filters),
        getBriefStats(),
        getPersonasBySegment(),
      ]);
      setBriefs(briefsData);
      setStats(statsData);
      setPersonas(personasData.map(p => ({ id: p.id, name: p.name, title: p.title })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    if (!formData.targetKeywords.trim()) {
      toast.error("请输入目标关键词");
      return;
    }
    setIsCreating(true);
    try {
      await createBrief({
        title: formData.title,
        targetKeywords: formData.targetKeywords.split(",").map(k => k.trim()).filter(Boolean),
        intent: formData.intent,
        targetPersonaId: formData.targetPersonaId || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("内容规划已创建");
      setShowCreateDialog(false);
      setFormData({ title: "", targetKeywords: "", intent: "informational", targetPersonaId: "", notes: "" });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!selectedPersonaForAI) {
      toast.error("请选择一个买家角色");
      return;
    }
    setIsGenerating(true);
    try {
      await generateBriefFromPersona(selectedPersonaForAI);
      toast.success("AI 已生成内容规划");
      setShowAIDialog(false);
      setSelectedPersonaForAI("");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此内容规划？")) return;
    try {
      await deleteBrief(id);
      toast.success("已删除");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleGeneratePackage = async (briefId: string) => {
    if (generatingPackage) return;
    setGeneratingPackage(briefId);
    try {
      toast.info("正在生成 SEO+GEO 完整内容包，预计 30-60 秒...", { duration: 8000 });
      const result = await generateFullContentPackage(briefId);
      setDonePackages((prev) => new Set(prev).add(briefId));
      toast.success(
        `内容包已生成！关键词: ${result.keywords[0] || ""} · ${result.wordCount} words · Framework ${result.framework}`,
        { duration: 6000 }
      );
      // Navigate to the new content
      router.push(`/customer/marketing/contents/${result.contentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "内容包生成失败");
    } finally {
      setGeneratingPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ci-surface-strong)]">
      {/* Header */}
      <div className="border-b border-[var(--ci-border)]">
        <div
          className="px-8 py-6"
          style={{
            background: "var(--ci-sidebar-shell)",
            boxShadow: "0 8px 32px -8px rgba(0,0,0,0.45)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "transparent",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(79,141,246,0.12)",
                  border: "1px solid rgba(79,141,246,0.3)",
                }}
              >
                <FileEdit className="w-6 h-6 text-[var(--ci-accent)]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">内容规划 (Brief)</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  规划内容方向，驱动 AI 生成 SEO · GEO 全链路内容包
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIDialog(true)}
                className="border-[var(--ci-accent)]/30 text-[var(--ci-accent)] hover:bg-[var(--ci-accent)]/10 bg-transparent"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI 生成规划
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                style={{
                  background: "var(--ci-accent)",
                  color: "#0B1220",
                  boxShadow: "0 4px 16px -2px rgba(79,141,246,0.35)",
                }}
                className="hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建规划
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6 relative">
            {[
              { label: "全部", value: stats.total, color: "text-slate-300" },
              { label: "草稿", value: stats.draft, color: "text-slate-400" },
              { label: "就绪", value: stats.ready, color: "text-blue-400" },
              { label: "进行中", value: stats.inProgress, color: "text-amber-400" },
              { label: "已完成", value: stats.done, color: "text-emerald-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[var(--ci-border)] bg-[var(--ci-surface-muted)]">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索关键词或标题..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] placeholder:text-slate-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B]">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#FFFFFF] border-[var(--ci-border)]">
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="ready">就绪</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="done">已完成</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={isLoading}
            className="text-slate-500 hover:text-[var(--ci-accent)]"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
          </div>
        ) : briefs.length === 0 ? (
          <div
            className="text-center py-20 rounded-xl"
            style={{
              background: "var(--ci-sidebar-shell)",
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(79,141,246,0.12)",
                border: "1px solid rgba(79,141,246,0.3)",
              }}
            >
              <FileEdit className="w-8 h-8 text-[var(--ci-accent)]" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">暂无内容规划</h3>
            <p className="text-sm text-slate-500 mt-1">创建第一个 Brief 开始内容生产</p>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 hover:opacity-90"
              style={{ background: "var(--ci-accent)", color: "#0B1220" }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新建规划
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {briefs.map((brief) => {
              const statusConf = STATUS_CONFIG[brief.status] || STATUS_CONFIG.draft;
              const isGeneratingThis = generatingPackage === brief.id;
              const isDone = donePackages.has(brief.id);

              return (
                <div
                  key={brief.id}
                  className="bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl p-5 hover:border-[var(--ci-accent)]/40 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-[#0B1B2B] group-hover:text-[var(--ci-accent)] transition-colors truncate">
                          {brief.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full text-white shrink-0 ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          {brief.targetKeywords.slice(0, 3).join(", ")}
                          {brief.targetKeywords.length > 3 &&
                            ` +${brief.targetKeywords.length - 3}`}
                        </span>
                        <span className="px-2 py-0.5 bg-[var(--ci-surface-muted)] rounded text-xs text-slate-600">
                          {INTENT_LABELS[brief.intent] || brief.intent}
                        </span>
                        {brief.targetPersonaName && (
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {brief.targetPersonaName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {/* Full Content Package button */}
                      <Button
                        size="sm"
                        onClick={() => handleGeneratePackage(brief.id)}
                        disabled={!!generatingPackage || isDone}
                        className="h-8 px-3 text-[var(--ci-text)] hover:opacity-90 disabled:opacity-60"
                        style={{
                          background: isDone ? "#10b981" : "var(--ci-accent)",
                          boxShadow: "0 2px 12px -2px rgba(79,141,246,0.35)",
                        }}
                        title="SEO + GEO 4合1 完整内容包"
                      >
                        {isGeneratingThis ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isGeneratingThis
                          ? "生成中..."
                          : isDone
                          ? "已生成"
                          : "一键生成内容包"}
                        {!isGeneratingThis && !isDone && (
                          <span className="ml-1.5 flex items-center gap-0.5">
                            <Globe className="w-3 h-3 opacity-60" />
                          </span>
                        )}
                      </Button>

                      {/* Manual write button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-slate-500 hover:text-[var(--ci-accent)]"
                        onClick={() =>
                          (window.location.href = `/customer/marketing/contents/new?briefId=${brief.id}`)
                        }
                      >
                        手动写作
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#FFFFFF] border-[var(--ci-border)]"
                        >
                          <DropdownMenuItem className="text-slate-600 focus:bg-[var(--ci-surface-muted)] focus:text-[#0B1B2B]">
                            <Edit className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-500 focus:bg-red-50 focus:text-red-500"
                            onClick={() => handleDelete(brief.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Generation progress hint */}
                  {isGeneratingThis && (
                    <div
                      className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-[var(--ci-accent)]"
                      style={{
                        background: "rgba(79,141,246,0.06)",
                        border: "1px solid rgba(79,141,246,0.2)",
                      }}
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      关键词研究 → SERP 分析 → AI 撰写 → SEO+GEO 四合一输出中...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1B2B]">新建内容规划</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-500">标题 *</Label>
              <Input
                placeholder="输入内容规划标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[var(--ci-surface-strong)] border-[var(--ci-border)] text-[#0B1B2B]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500">目标关键词 *（逗号分隔）</Label>
              <Input
                placeholder="keyword1, keyword2, keyword3"
                value={formData.targetKeywords}
                onChange={(e) => setFormData({ ...formData, targetKeywords: e.target.value })}
                className="bg-[var(--ci-surface-strong)] border-[var(--ci-border)] text-[#0B1B2B]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500">搜索意图</Label>
                <Select
                  value={formData.intent}
                  onValueChange={(v) => setFormData({ ...formData, intent: v as SearchIntent })}
                >
                  <SelectTrigger className="bg-[var(--ci-surface-strong)] border-[var(--ci-border)] text-[#0B1B2B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#FFFFFF] border-[var(--ci-border)]">
                    <SelectItem value="informational">信息查询</SelectItem>
                    <SelectItem value="commercial">商业调研</SelectItem>
                    <SelectItem value="transactional">交易决策</SelectItem>
                    <SelectItem value="navigational">品牌导航</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500">关联 Persona</Label>
                <Select
                  value={formData.targetPersonaId}
                  onValueChange={(v) => setFormData({ ...formData, targetPersonaId: v })}
                >
                  <SelectTrigger className="bg-[var(--ci-surface-strong)] border-[var(--ci-border)] text-[#0B1B2B]">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#FFFFFF] border-[var(--ci-border)]">
                    <SelectItem value="">无</SelectItem>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500">备注（可选）</Label>
              <Textarea
                placeholder="描述内容方向和要求..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-[var(--ci-surface-strong)] border-[var(--ci-border)] text-[#0B1B2B] resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              className="text-slate-500"
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              style={{
                background: "var(--ci-accent)",
                color: "#0B1220",
                boxShadow: "0 4px 16px -2px rgba(79,141,246,0.35)",
              }}
              className="hover:opacity-90"
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#0B1B2B]">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(79,141,246,0.12)",
                  border: "1px solid rgba(79,141,246,0.3)",
                }}
              >
                <Sparkles className="w-4 h-4 text-[var(--ci-accent)]" />
              </div>
              AI 生成内容规划
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              选择一个买家角色，AI 将根据其特征自动生成针对性的内容规划。
            </p>
            <div className="space-y-2">
              <Label className="text-slate-500">选择买家角色</Label>
              <Select value={selectedPersonaForAI} onValueChange={setSelectedPersonaForAI}>
                <SelectTrigger className="bg-[var(--ci-surface-strong)] border-[var(--ci-border)] text-[#0B1B2B]">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent className="bg-[#FFFFFF] border-[var(--ci-border)]">
                  {personas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {personas.length === 0 && (
              <p className="text-xs text-amber-600 mt-3">
                暂无买家角色，请先在知识引擎 &gt; 人设中心创建。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAIDialog(false)}
              className="text-slate-500"
            >
              取消
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating || !selectedPersonaForAI}
              style={{
                background: "var(--ci-accent)",
                color: "#0B1220",
                boxShadow: "0 4px 16px -2px rgba(79,141,246,0.35)",
              }}
              className="hover:opacity-90 disabled:opacity-50"
            >
              {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              生成规划
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
