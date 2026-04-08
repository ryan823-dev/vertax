"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Filter,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  getContentPieces,
  getContentStats,
  deleteContentPiece,
  type ContentPieceData,
} from "@/actions/contents";
import { getBriefs, type BriefListItem } from "@/actions/briefs";
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
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-[#F7F3E8]0" },
  review: { label: "待审核", color: "bg-amber-500" },
  approved: { label: "已批准", color: "bg-blue-500" },
  awaiting_publish: { label: "待发布", color: "bg-orange-500" },
  published: { label: "已发布", color: "bg-emerald-500" },
};

export default function ContentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [contents, setContents] = useState<ContentPieceData[]>([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, review: 0, published: 0 });
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New content dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: { status?: string; search?: string } = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (search.trim()) filters.search = search.trim();

      const [contentsData, statsData, briefsData] = await Promise.all([
        getContentPieces(filters),
        getContentStats(),
        getBriefs({ status: "ready" }),
      ]);
      setContents(contentsData);
      setStats(statsData);
      setBriefs(briefsData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此内容？")) return;
    try {
      await deleteContentPiece(id);
      toast.success("已删除");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleStartFromBrief = () => {
    if (!selectedBriefId) {
      toast.error("请选择一个内容规划");
      return;
    }
    // Navigate to editor with briefId
    window.location.href = `/customer/marketing/contents/new?briefId=${selectedBriefId}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F3E8]">
      {/* Header - 指令台 深蓝舞台风格 */}
      <div className="border-b border-[#E8E0D0]">
        <div className="px-8 py-6" style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
          }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                <Layers className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">内容管理</h1>
                <p className="text-sm text-slate-400 mt-0.5">基于 Brief 创作，引用证据，遵循规范</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => setShowNewDialog(true)}
                style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                className="hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建内容
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 relative">
            {[
              { label: "全部内容", value: stats.total, color: "text-slate-300" },
              { label: "草稿", value: stats.draft, color: "text-slate-400" },
              { label: "待审核", value: stats.review, color: "text-amber-400" },
              { label: "已发布", value: stats.published, color: "text-emerald-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[#E8E0D0] bg-[#F0EBD8]">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B] placeholder:text-slate-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B]">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#FFFCF7] border-[#E8E0D0]">
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="review">待审核</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={loadData} disabled={isLoading} className="text-slate-500 hover:text-[#D4AF37]">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content List */}
      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{
            background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
          }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <FileText className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">暂无内容</h3>
            <p className="text-sm text-slate-500 mt-1">从内容规划开始创作第一篇内容</p>
            <Button
              size="sm"
              onClick={() => setShowNewDialog(true)}
              className="mt-4 hover:opacity-90"
              style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新建内容
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {contents.map((content) => {
              const statusConf = STATUS_CONFIG[content.status] || STATUS_CONFIG.draft;
              return (
                <div
                  key={content.id}
                  className="bg-[#FFFCF7] border border-[#E8E0D0] rounded-xl p-5 hover:border-[#D4AF37]/40 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/customer/marketing/contents/${content.id}`}
                          className="text-base font-semibold text-[#0B1B2B] group-hover:text-[#D4AF37] transition-colors"
                        >
                          {content.title}
                        </Link>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full text-white ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        {content.briefTitle && (
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                            {content.briefTitle}
                          </span>
                        )}
                        {content.categoryName && (
                          <span className="px-2 py-0.5 bg-[#F0EBD8] rounded text-xs text-slate-600">
                            {content.categoryName}
                          </span>
                        )}
                        {content.evidenceRefs.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {content.evidenceRefs.length} 条证据引用
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(content.updatedAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      {content.excerpt && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{content.excerpt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/customer/marketing/contents/${content.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-[#D4AF37]">
                          <Edit className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#FFFCF7] border-[#E8E0D0]">
                          <DropdownMenuItem className="text-slate-600 focus:bg-[#F0EBD8] focus:text-[#0B1B2B]">
                            <Eye className="w-4 h-4 mr-2" />
                            预览
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-500 focus:bg-red-50 focus:text-red-500"
                            onClick={() => handleDelete(content.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Content Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-[#FFFCF7] border-[#E8E0D0] text-[#0B1B2B] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1B2B]">新建内容</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              选择一个内容规划（Brief）作为起点，AI 将根据规划生成内容大纲。
            </p>
            <div className="space-y-2">
              <Label className="text-slate-500">选择内容规划</Label>
              <Select value={selectedBriefId} onValueChange={setSelectedBriefId}>
                <SelectTrigger className="bg-[#F7F3E8] border-[#E8E0D0] text-[#0B1B2B]">
                  <SelectValue placeholder="选择 Brief" />
                </SelectTrigger>
                <SelectContent className="bg-[#FFFCF7] border-[#E8E0D0]">
                  {briefs.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {briefs.length === 0 && (
              <p className="text-xs text-amber-600 mt-3">
                暂无就绪的内容规划，请先在内容规划中创建并设为「就绪」状态。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewDialog(false)} className="text-slate-500">
              取消
            </Button>
            <Button
              onClick={handleStartFromBrief}
              disabled={!selectedBriefId}
              style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
              className="hover:opacity-90 disabled:opacity-50"
            >
              开始创作
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
