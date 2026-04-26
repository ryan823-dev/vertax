"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  FileText,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lock,
  MessageSquarePlus,
  Globe,
  Copy,
  Check,
  BarChart3,
  Code2,
  Clock,
  GitCompare,
} from "lucide-react";
import Link from "next/link";
import {
  getContentPieceById,
  createContentPiece,
  updateContentPiece,
  generateOutlineFromBrief,
  generateContentFromOutline,
  getContentCategories,
  type ContentPieceData,
  type ContentOutline,
} from "@/actions/contents";
import { getBriefById, type BriefDetail } from "@/actions/briefs";
import { getEvidences } from "@/actions/evidence";
import { getGuidelines } from "@/actions/guidelines";
import { getLatestVersion, createVersion, listVersions } from "@/actions/versions";
import type { EvidenceData, GuidelineData } from "@/types/knowledge";
import type { AnchorSpec, ArtifactStatusValue, ArtifactVersionData } from "@/types/artifact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { CollaborativeShell } from "@/components/collaboration";
import { ContentCandidatePanel } from "@/components/radar/content-candidate-panel";
import { VersionDiffView } from "@/components/collaboration/version-diff-view";

export default function ContentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const isNew = contentId === "new";
  const briefIdFromQuery = searchParams.get("briefId");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  // Data
  const [content, setContent] = useState<ContentPieceData | null>(null);
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [evidences, setEvidences] = useState<EvidenceData[]>([]);
  const [guidelines, setGuidelines] = useState<GuidelineData[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    slug: "",
    categoryId: "",
    content: "",
    excerpt: "",
    metaTitle: "",
    metaDescription: "",
    keywords: [] as string[],
    outline: null as ContentOutline | null,
    evidenceRefs: [] as string[],
    scheduledAt: null as Date | null,
  });

  // UI state
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    outline: true,
    evidence: true,
    guidelines: false,
    seo: false,
    geo: true,
  });
  const [geoCopied, setGeoCopied] = useState(false);
  const [schemaCopied, setSchemaCopied] = useState(false);

  // 协作相关状态
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<AnchorSpec | null>(null);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);

  // Guideline validation
  const [guidelineHints, setGuidelineHints] = useState<Array<{
    guideline: GuidelineData;
    matched: boolean;
    matches: string[];
  }>>([]);

  // Version history & diff
  const [versions, setVersions] = useState<ArtifactVersionData[]>([]);
  const [showDiffDialog, setShowDiffDialog] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesData, evidencesData, guidelinesData] = await Promise.all([
        getContentCategories(),
        getEvidences({ status: "active" }, { page: 1, pageSize: 100 }),
        getGuidelines(),
      ]);
      setCategories(categoriesData);
      setEvidences(evidencesData.items);
      setGuidelines(guidelinesData);

      if (isNew && briefIdFromQuery) {
        // Load brief for new content
        const briefData = await getBriefById(briefIdFromQuery);
        if (briefData) {
          setBrief(briefData);
          setForm((prev) => ({
            ...prev,
            title: briefData.title,
            keywords: briefData.targetKeywords,
          }));
        }
      } else if (!isNew) {
        // Load existing content
        const contentData = await getContentPieceById(contentId);
        if (contentData) {
          setContent(contentData);
          setForm({
            title: contentData.title,
            slug: contentData.slug,
            categoryId: contentData.categoryId,
            content: contentData.content,
            excerpt: contentData.excerpt || "",
            metaTitle: contentData.metaTitle || "",
            metaDescription: contentData.metaDescription || "",
            keywords: contentData.keywords,
            outline: contentData.outline,
            evidenceRefs: contentData.evidenceRefs,
            scheduledAt: contentData.scheduledAt ? new Date(contentData.scheduledAt) : null,
          });
          if (contentData.briefId) {
            const briefData = await getBriefById(contentData.briefId);
            setBrief(briefData);
          }
          
          // 加载版本信息
          try {
            const latestVersion = await getLatestVersion('ContentPiece', contentId);
            if (latestVersion) {
              setCurrentVersionId(latestVersion.id);
              const status = latestVersion.status as ArtifactStatusValue;
              setIsReadOnly(status === 'approved' || status === 'archived');
            }

            // Load all versions for diff view
            const allVersions = await listVersions('SeoContent', contentId);
            setVersions(allVersions);
          } catch {
            // 如果没有版本，创建初始版本
            const newVersion = await createVersion(
              'SeoContent',
              contentId,
              contentData as unknown as Record<string, unknown>,
              { changeNote: '初始版本' }
            );
            setCurrentVersionId(newVersion.id);
            setIsReadOnly(false);
            setVersions([newVersion]);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setIsLoading(false);
    }
  }, [contentId, isNew, briefIdFromQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validate content against guidelines
  useEffect(() => {
    if (!form.content || guidelines.length === 0) {
      setGuidelineHints([]);
      return;
    }

    const hints = guidelines
      .filter((g) => g.isActive)
      .map((g) => {
        // Extract keywords from guideline content (simple implementation)
        const keywords: string[] = g.content
          .split(/[，,、\s]+/)
          .filter((w: string) => w.length >= 2 && w.length <= 10)
          .slice(0, 5);

        const matches: string[] = [];
        keywords.forEach((kw: string) => {
          if (form.content.toLowerCase().includes(kw.toLowerCase())) {
            matches.push(kw);
          }
        });

        return {
          guideline: g,
          matched: matches.length > 0,
          matches,
        };
      });

    setGuidelineHints(hints);
  }, [form.content, guidelines]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    if (!form.categoryId) {
      toast.error("请选择分类");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await createContentPiece({
          briefId: briefIdFromQuery || undefined,
          title: form.title,
          slug: form.slug || undefined,
          categoryId: form.categoryId,
          content: form.content,
          excerpt: form.excerpt || undefined,
          metaTitle: form.metaTitle || undefined,
          metaDescription: form.metaDescription || undefined,
          keywords: form.keywords,
          outline: form.outline || undefined,
          evidenceRefs: form.evidenceRefs,
          scheduledAt: form.scheduledAt,
        });
        toast.success("内容已创建");
        router.push(`/customer/marketing/contents/${created.id}`);
      } else {
        await updateContentPiece(contentId, {
          title: form.title,
          slug: form.slug,
          categoryId: form.categoryId,
          content: form.content,
          excerpt: form.excerpt || undefined,
          metaTitle: form.metaTitle || undefined,
          metaDescription: form.metaDescription || undefined,
          keywords: form.keywords,
          outline: form.outline || undefined,
          evidenceRefs: form.evidenceRefs,
          scheduledAt: form.scheduledAt,
        });
        toast.success("已保存");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateOutline = async () => {
    const targetBriefId = brief?.id || briefIdFromQuery;
    if (!targetBriefId) {
      toast.error("请先关联内容规划");
      return;
    }

    setIsGeneratingOutline(true);
    try {
      const outline = await generateOutlineFromBrief(targetBriefId);
      setForm((prev) => ({ ...prev, outline }));
      toast.success("大纲已生成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateContent = async () => {
    const targetBriefId = brief?.id || briefIdFromQuery;
    if (!targetBriefId || !form.outline) {
      toast.error("请先生成大纲");
      return;
    }

    setIsGeneratingContent(true);
    try {
      const result = await generateContentFromOutline(
        targetBriefId,
        form.outline,
        form.evidenceRefs
      );
      setForm((prev) => ({
        ...prev,
        content: result.content,
        evidenceRefs: result.usedEvidences,
      }));
      toast.success("内容已生成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const toggleEvidence = (id: string) => {
    setForm((prev) => ({
      ...prev,
      evidenceRefs: prev.evidenceRefs.includes(id)
        ? prev.evidenceRefs.filter((e) => e !== id)
        : [...prev.evidenceRefs, id],
    }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 锚点相关函数
  const handleAnchorClick = (anchor: AnchorSpec) => {
    setHighlightedBlockId(anchor.value);
    // 3秒后清除高亮
    setTimeout(() => setHighlightedBlockId(null), 3000);
  };

  const handleStatusChange = (newStatus: ArtifactStatusValue) => {
    setIsReadOnly(newStatus === 'approved' || newStatus === 'archived');
    loadData();
  };

  const setAnchorForBlock = (blockId: string, label: string) => {
    if (isReadOnly) return;
    setActiveAnchor({
      type: 'blockId',
      value: blockId,
      label,
    });
  };

  const getBlockHighlightClass = (blockId: string) => {
    if (highlightedBlockId === blockId) {
      return 'ring-2 ring-[var(--ci-accent)] ring-offset-2 ring-offset-[#070E15] transition-all duration-300';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ci-surface-strong)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
      </div>
    );
  }

  const selectedEvidences = evidences.filter((e) => form.evidenceRefs.includes(e.id));

  return (
    <div className="min-h-screen bg-[var(--ci-surface-strong)]">
      {/* Header - 指令台 深蓝舞台风格 */}
      <div className="border-b border-[var(--ci-border)] sticky top-0 z-10" style={{
        background: 'var(--ci-sidebar-shell)',
        boxShadow: 'var(--ci-shadow-soft)',
      }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/customer/marketing/contents">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-[var(--ci-accent)]">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {isNew ? "新建内容" : "编辑内容"}
                </h1>
                {brief && (
                  <p className="text-xs text-[var(--ci-accent)] mt-0.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    基于: {brief.title}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isReadOnly && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(79,141,246,0.1)', border: '1px solid rgba(79,141,246,0.3)' }}>
                  <Lock className="w-3.5 h-3.5 text-[var(--ci-accent)]" />
                  <span className="text-xs text-[var(--ci-accent)]">已批准 · 只读</span>
                </div>
              )}
              {!isNew && versions.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setShowDiffDialog(true)}
                  className="border-[var(--ci-border)] text-[#0B1B2B] hover:bg-[var(--ci-surface-muted)]"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  版本对比
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || isReadOnly}
                style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
                className="hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Editor */}
        <div className="flex-1 p-6 max-w-4xl">
          {/* Title & Category */}
          <div className="space-y-4 mb-6">
            <div>
              <Input
                placeholder="输入标题..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="text-xl font-bold bg-transparent border-none text-[#0B1B2B] placeholder:text-slate-400 focus-visible:ring-0 px-0"
              />
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger className="w-40 bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] text-sm">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent className="bg-[#FFFFFF] border-[var(--ci-border)]">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="自定义 Slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 max-w-xs bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] text-sm"
              />
            </div>
            {/* Scheduled Publish */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <Label className="text-sm text-slate-500">定时发布</Label>
              </div>
              <DateTimePicker
                value={form.scheduledAt}
                onChange={(date) => setForm({ ...form, scheduledAt: date })}
                placeholder="选择发布时间"
                minDate={new Date()}
                className="w-64 bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] text-sm"
              />
              {form.scheduledAt && (
                <span className="text-xs text-slate-500">
                  将在 {form.scheduledAt.toLocaleString("zh-CN")} 自动发布
                </span>
              )}
            </div>
          </div>

          {/* Outline Section */}
          <div className="bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl mb-6">
            <button
              onClick={() => toggleSection("outline")}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--ci-accent)]" />
                <span className="font-medium text-[#0B1B2B]">内容大纲</span>
              </div>
              {expandedSections.outline ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.outline && (
              <div className="px-4 pb-4 border-t border-[var(--ci-border)] pt-4">
                {form.outline ? (
                  <div className="space-y-3">
                    {form.outline.sections.map((section, idx) => {
                      const blockId = `outline-section-${idx}`;
                      return (
                        <div 
                          key={idx} 
                          className={`bg-[var(--ci-surface-muted)] rounded-lg p-3 relative group ${getBlockHighlightClass(blockId)}`}
                          data-block-id={blockId}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium text-[#0B1B2B] flex-1">
                              {idx + 1}. {section.heading}
                            </h4>
                            {!isReadOnly && (
                              <button
                                onClick={() => setAnchorForBlock(blockId, `大纲: ${section.heading}`)}
                                className="p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-[var(--ci-accent)] transition-all"
                                title="添加评论"
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <ul className="space-y-1">
                            {section.keyPoints.map((point, pIdx) => (
                              <li key={pIdx} className="text-xs text-slate-500 flex items-start gap-2">
                                <span className="text-[var(--ci-accent)]">•</span>
                                {String(point)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mb-3">尚未生成大纲</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateOutline}
                  disabled={isGeneratingOutline || !brief || isReadOnly}
                  className="mt-3 border-[var(--ci-accent)]/30 text-[var(--ci-accent)] hover:bg-[var(--ci-accent)]/10 bg-transparent"
                >
                  {isGeneratingOutline ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {form.outline ? "重新生成大纲" : "AI 生成大纲"}
                </Button>
              </div>
            )}
          </div>

          {/* Content Editor */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Label className="text-slate-500">正文内容</Label>
                {!isReadOnly && (
                  <button
                    onClick={() => setAnchorForBlock('content-body', '正文内容')}
                    className="p-1 text-slate-400 hover:text-[var(--ci-accent)] transition-colors"
                    title="添加评论"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateContent}
                disabled={isGeneratingContent || !form.outline || isReadOnly}
                className="border-[var(--ci-accent)]/30 text-[var(--ci-accent)] hover:bg-[var(--ci-accent)]/10 bg-transparent"
              >
                {isGeneratingContent ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI 生成内容
              </Button>
            </div>
            <Textarea
              placeholder="开始写作..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              disabled={isReadOnly}
              className={`min-h-[400px] bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] placeholder:text-slate-400 resize-none disabled:opacity-60 ${getBlockHighlightClass('content-body')}`}
            />
          </div>

          {/* Excerpt */}
          <div className="mb-6">
            <Label className="text-slate-500 mb-2 block">摘要</Label>
            <Textarea
              placeholder="内容摘要..."
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="h-24 bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* SEO Section */}
          <div className="bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl">
            <button
              onClick={() => toggleSection("seo")}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-[#0B1B2B]">SEO 设置</span>
              {expandedSections.seo ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.seo && (
              <div className="px-4 pb-4 border-t border-[var(--ci-border)] pt-4 space-y-4">
                <div>
                  <Label className="text-slate-500 text-sm">Meta 标题</Label>
                  <Input
                    placeholder="SEO 标题"
                    value={form.metaTitle}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    className="mt-1 bg-[var(--ci-surface-muted)] border-[var(--ci-border)] text-[#0B1B2B]"
                  />
                </div>
                <div>
                  <Label className="text-slate-500 text-sm">Meta 描述</Label>
                  <Textarea
                    placeholder="SEO 描述"
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    className="mt-1 h-20 bg-[var(--ci-surface-muted)] border-[var(--ci-border)] text-[#0B1B2B] resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[340px] border-l border-[var(--ci-border)] bg-[var(--ci-surface-strong)] p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Collaborative Shell */}
          {!isNew && content?.id && currentVersionId && (
            <CollaborativeShell
              entityType="ContentPiece"
              entityId={content.id}
              versionId={currentVersionId}
              anchorType="blockId"
              activeAnchor={activeAnchor}
              onAnchorClick={handleAnchorClick}
              onStatusChange={handleStatusChange}
              onVersionChange={(verId) => setCurrentVersionId(verId)}
              variant="light"
              className="mb-4"
            />
          )}

          {/* Radar Content Linkage */}
          {!isNew && content?.id && (
            <ContentCandidatePanel contentId={content.id} />
          )}

          {/* Evidence References */}
          <div className="bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl">
            <button
              onClick={() => toggleSection("evidence")}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-[#0B1B2B]">证据引用</span>
                <span className="text-xs text-slate-400">({form.evidenceRefs.length})</span>
              </div>
              {expandedSections.evidence ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.evidence && (
              <div className="px-3 pb-3 border-t border-[var(--ci-border)] pt-3">
                {selectedEvidences.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {selectedEvidences.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start gap-2 bg-[var(--ci-surface-muted)] rounded p-2"
                      >
                        <span className="text-xs text-emerald-600 font-mono">
                          [E{selectedEvidences.indexOf(e) + 1}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#0B1B2B] truncate">{e.title}</p>
                        </div>
                        <button
                          onClick={() => toggleEvidence(e.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mb-3">未引用证据</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEvidencePicker(true)}
                  className="w-full border-[var(--ci-border)] text-slate-500 hover:text-[#0B1B2B] hover:bg-[var(--ci-surface-muted)]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加证据
                </Button>
              </div>
            )}
          </div>

          {/* Guideline Validation */}
          <div className="bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl">
            <button
              onClick={() => toggleSection("guidelines")}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-[#0B1B2B]">规范校验</span>
              </div>
              {expandedSections.guidelines ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.guidelines && (
              <div className="px-3 pb-3 border-t border-[var(--ci-border)] pt-3">
                {guidelineHints.length > 0 ? (
                  <div className="space-y-2">
                    {guidelineHints.map((hint, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-2 rounded text-xs ${
                          hint.matched
                            ? "bg-emerald-50 border border-emerald-200"
                            : "bg-amber-50 border border-amber-200"
                        }`}
                      >
                        {hint.matched ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={hint.matched ? "text-emerald-700" : "text-amber-700"}>
                            {hint.guideline.title}
                          </p>
                          {hint.matched && hint.matches.length > 0 && (
                            <p className="text-emerald-600/70 mt-0.5">
                              匹配: {hint.matches.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5" />
                    输入内容后自动校验规范
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEO / GEO Panel — shown only for AI-generated content */}
          {content && !!(((content as unknown as Record<string, unknown>).geoVersion || (content as unknown as Record<string, unknown>).schemaJson)) && ((): ReactNode => {
            const meta = ((content as unknown as Record<string, unknown>).aiMetadata || {}) as Record<string, unknown>;
            const geoVersion = (content as unknown as Record<string, unknown>).geoVersion as string | null;
            const schemaJson = (content as unknown as Record<string, unknown>).schemaJson as Record<string, unknown> | null;
            const framework = meta.seoFramework as string | undefined;
            const primaryKeyword = meta.primaryKeyword as string | undefined;
            const supportingKeywords = (meta.supportingKeywords || []) as string[];
            const wordCount = meta.wordCount as number | undefined;
            const metaTitleLen = form.metaTitle.length;
            const metaDescLen = form.metaDescription.length;

            return (
              <div className="rounded-xl overflow-hidden border border-[rgba(79,141,246,0.3)]" style={{
                background: 'var(--ci-sidebar-shell)',
              }}>
                {/* SEO Score Card */}
                <div className="p-3 border-b border-[rgba(79,141,246,0.12)]">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-3.5 h-3.5 text-[var(--ci-accent)]" />
                    <span className="text-[11px] font-semibold text-[var(--ci-accent)] uppercase tracking-wider">SEO · AEO 指标</span>
                    {framework && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded text-slate-400 bg-slate-800 border border-slate-700">
                        Framework {framework}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {primaryKeyword && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">主关键词</span>
                        <span className="text-[11px] text-[var(--ci-accent)] font-mono">{primaryKeyword}</span>
                      </div>
                    )}
                    {wordCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">文章字数</span>
                        <span className={`text-[11px] font-mono ${wordCount >= 1500 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {wordCount.toLocaleString()} {wordCount >= 1500 ? '✓' : '⚠'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Meta Title</span>
                      <span className={`text-[11px] font-mono ${metaTitleLen > 0 && metaTitleLen <= 60 ? 'text-emerald-400' : metaTitleLen > 60 ? 'text-red-400' : 'text-slate-500'}`}>
                        {metaTitleLen > 0 ? `${metaTitleLen}/60 ${metaTitleLen <= 60 ? '✓' : '✗'}` : '未填写'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Meta Desc</span>
                      <span className={`text-[11px] font-mono ${metaDescLen >= 150 && metaDescLen <= 160 ? 'text-emerald-400' : metaDescLen > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {metaDescLen > 0 ? `${metaDescLen}/160 ${metaDescLen >= 150 ? '✓' : '⚠'}` : '未填写'}
                      </span>
                    </div>
                    {schemaJson && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">FAQPage Schema</span>
                        <span className="text-[11px] text-emerald-400">已生成 ✓</span>
                      </div>
                    )}
                  </div>
                  {supportingKeywords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] text-slate-600 mb-1.5">支撑关键词</p>
                      <div className="flex flex-wrap gap-1">
                        {supportingKeywords.slice(0, 6).map((kw: string) => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded text-slate-400" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FAQ Schema block */}
                {schemaJson && (
                  <div className="p-3 border-b border-[rgba(79,141,246,0.12)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-medium text-emerald-400">FAQPage JSON-LD</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(schemaJson, null, 2));
                          setSchemaCopied(true);
                          setTimeout(() => setSchemaCopied(false), 1800);
                        }}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[var(--ci-accent)] transition-colors"
                      >
                        {schemaCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {schemaCopied ? '已复制' : '复制'}
                      </button>
                    </div>
                    <div className="rounded p-2 text-[10px] text-slate-400 font-mono line-clamp-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {JSON.stringify(schemaJson, null, 2)}
                    </div>
                  </div>
                )}

                {/* GEO version */}
                {geoVersion && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[var(--ci-accent)]" />
                        <span className="text-[11px] font-medium text-[var(--ci-accent)]">GEO 版本</span>
                        <span className="text-[10px] text-slate-600">AI 引擎可引用</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(geoVersion);
                          setGeoCopied(true);
                          setTimeout(() => setGeoCopied(false), 1800);
                        }}
                        className="flex items-center gap-1 text-[10px] text-[var(--ci-accent)] hover:opacity-80 transition-opacity"
                      >
                        {geoCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {geoCopied ? '已复制' : '复制'}
                      </button>
                    </div>
                    <div className="rounded p-2.5 text-[11px] text-slate-300 leading-relaxed line-clamp-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {geoVersion}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5">{geoVersion.split(/\s+/).length} words · 粘贴至 About / FAQ</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Brief Context */}
          {brief && (
            <div className="bg-[#FFFFFF] border border-[var(--ci-border)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(79,141,246,0.12)', border: '1px solid rgba(79,141,246,0.3)' }}>
                  <Sparkles className="w-3 h-3 text-[var(--ci-accent)]" />
                </div>
                <span className="text-sm font-medium text-[#0B1B2B]">内容规划</span>
              </div>
              <div className="space-y-2 text-xs">
                <p className="text-slate-500">
                  <span className="text-slate-400">关键词:</span>{" "}
                  {brief.targetKeywords.join(", ")}
                </p>
                <p className="text-slate-500">
                  <span className="text-slate-400">意图:</span> {brief.intent}
                </p>
                {brief.notes && (
                  <p className="text-slate-500">
                    <span className="text-slate-400">备注:</span> {brief.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Picker Dialog */}
      <Dialog open={showEvidencePicker} onOpenChange={setShowEvidencePicker}>
        <DialogContent className="bg-[#FFFFFF] border-[var(--ci-border)] text-[#0B1B2B] max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1B2B]">选择证据</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {evidences.length > 0 ? (
              <div className="space-y-2">
                {evidences.map((e) => {
                  const isSelected = form.evidenceRefs.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEvidence(e.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-[var(--ci-accent)]/10 border-[var(--ci-accent)]/40"
                          : "bg-[var(--ci-surface-strong)] border-[var(--ci-border)] hover:border-[var(--ci-accent)]/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-[var(--ci-accent)]"
                              : "border-slate-300"
                          }`}
                          style={isSelected ? { background: 'var(--ci-accent)' } : {}}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-[#0B1220]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0B1B2B]">{e.title}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{e.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-1.5 py-0.5 bg-[var(--ci-surface-muted)] rounded text-[10px] text-slate-500">
                              {e.type}
                            </span>
                            {e.assetName && (
                              <span className="text-[10px] text-slate-400 truncate">
                                来源: {e.assetName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">暂无可用证据</p>
            )}
          </div>
          <div className="pt-3 border-t border-[var(--ci-border)]">
            <Button
              onClick={() => setShowEvidencePicker(false)}
              className="w-full hover:opacity-90"
              style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
            >
              完成选择 ({form.evidenceRefs.length} 条)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Diff Dialog */}
      <VersionDiffView
        versions={versions}
        open={showDiffDialog}
        onOpenChange={setShowDiffDialog}
      />
    </div>
  );
}
