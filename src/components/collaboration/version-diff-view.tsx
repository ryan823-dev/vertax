"use client";

import { useState, useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  FileText,
  ArrowRight,
  GitCompare,
  Plus,
  Minus,
  Edit3,
  Tag,
  Type,
  AlignLeft,
} from "lucide-react";
import type { ArtifactVersionData } from "@/types/artifact";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VersionDiffViewProps {
  versions: ArtifactVersionData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiffLine {
  type: "add" | "remove" | "unchanged";
  content: string;
  lineNumber?: number;
}

interface DiffSection {
  field: string;
  label: string;
  icon: typeof FileText;
  oldValue: unknown;
  newValue: unknown;
  diff?: DiffLine[];
}

// Simple text diff algorithm (word-level)
function computeTextDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple line-by-line comparison
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      result.push({ type: "add", content: newLine, lineNumber: i + 1 });
    } else if (newLine === undefined) {
      result.push({ type: "remove", content: oldLine, lineNumber: i + 1 });
    } else if (oldLine === newLine) {
      result.push({ type: "unchanged", content: oldLine, lineNumber: i + 1 });
    } else {
      // Line changed - show removal then addition
      result.push({ type: "remove", content: oldLine, lineNumber: i + 1 });
      result.push({ type: "add", content: newLine, lineNumber: i + 1 });
    }
  }

  return result;
}

// Highlight inline changes within a line
function highlightInlineDiff(oldStr: string, newStr: string): { oldHighlighted: React.ReactNode; newHighlighted: React.ReactNode } {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);

  const oldSet = new Set(oldWords.filter(w => w.trim()));
  const newSet = new Set(newWords.filter(w => w.trim()));

  return {
    oldHighlighted: oldWords.map((word, i) => {
      if (!word.trim()) return word;
      if (!newSet.has(word)) {
        return <span key={i} className="bg-red-200 text-red-800">{word}</span>;
      }
      return word;
    }),
    newHighlighted: newWords.map((word, i) => {
      if (!word.trim()) return word;
      if (!oldSet.has(word)) {
        return <span key={i} className="bg-green-200 text-green-800">{word}</span>;
      }
      return word;
    }),
  };
}

export function VersionDiffView({ versions, open, onOpenChange }: VersionDiffViewProps) {
  const [leftVersionId, setLeftVersionId] = useState<string | null>(null);
  const [rightVersionId, setRightVersionId] = useState<string | null>(null);

  // Initialize with last two versions
  const sortedVersions = useMemo(() =>
    [...versions].sort((a, b) => b.version - a.version),
    [versions]
  );

  // Auto-select versions on open
  const initVersions = useMemo(() => {
    if (sortedVersions.length >= 2) {
      return {
        left: sortedVersions[1]?.id || sortedVersions[0]?.id,
        right: sortedVersions[0]?.id,
      };
    }
    return { left: sortedVersions[0]?.id, right: sortedVersions[0]?.id };
  }, [sortedVersions]);

  const leftVersion = versions.find(v => v.id === (leftVersionId || initVersions.left));
  const rightVersion = versions.find(v => v.id === (rightVersionId || initVersions.right));

  // Compute diffs
  const diffs = useMemo((): DiffSection[] => {
    if (!leftVersion || !rightVersion) return [];

    const leftContent = leftVersion.content as Record<string, unknown>;
    const rightContent = rightVersion.content as Record<string, unknown>;

    const sections: DiffSection[] = [];

    // Title
    if (leftContent.title !== rightContent.title) {
      sections.push({
        field: "title",
        label: "标题",
        icon: Type,
        oldValue: leftContent.title || "",
        newValue: rightContent.title || "",
      });
    }

    // Content (main diff)
    const oldContent = String(leftContent.content || "");
    const newContent = String(rightContent.content || "");
    if (oldContent !== newContent) {
      sections.push({
        field: "content",
        label: "正文内容",
        icon: AlignLeft,
        oldValue: oldContent,
        newValue: newContent,
        diff: computeTextDiff(oldContent, newContent),
      });
    }

    // Keywords
    const oldKeywords = (leftContent.keywords as string[]) || [];
    const newKeywords = (rightContent.keywords as string[]) || [];
    if (JSON.stringify(oldKeywords) !== JSON.stringify(newKeywords)) {
      sections.push({
        field: "keywords",
        label: "关键词",
        icon: Tag,
        oldValue: oldKeywords,
        newValue: newKeywords,
      });
    }

    // Excerpt
    if (leftContent.excerpt !== rightContent.excerpt) {
      sections.push({
        field: "excerpt",
        label: "摘要",
        icon: FileText,
        oldValue: leftContent.excerpt || "",
        newValue: rightContent.excerpt || "",
      });
    }

    // Meta Title
    if (leftContent.metaTitle !== rightContent.metaTitle) {
      sections.push({
        field: "metaTitle",
        label: "SEO 标题",
        icon: Type,
        oldValue: leftContent.metaTitle || "",
        newValue: rightContent.metaTitle || "",
      });
    }

    // Meta Description
    if (leftContent.metaDescription !== rightContent.metaDescription) {
      sections.push({
        field: "metaDescription",
        label: "SEO 描述",
        icon: AlignLeft,
        oldValue: leftContent.metaDescription || "",
        newValue: rightContent.metaDescription || "",
      });
    }

    return sections;
  }, [leftVersion, rightVersion]);

  const renderValue = (value: unknown, field: string): ReactNode => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-slate-400 italic">空</span>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-sm">
              {item}
            </span>
          ))}
        </div>
      );
    }
    if (field === "content" && typeof value === "string") {
      return (
        <div className="text-sm whitespace-pre-wrap line-clamp-6 max-h-40 overflow-hidden">
          {value}
        </div>
      );
    }
    return <span className="text-sm">{String(value)}</span>;
  };

  const renderDiff = (section: DiffSection) => {
    if (section.diff && section.diff.length > 0) {
      // Show line-by-line diff for content
      const contextLines = 2;

      // Find changed line indices
      const changedIndices = new Set<number>();
      section.diff.forEach((line, i) => {
        if (line.type !== "unchanged") {
          for (let j = Math.max(0, i - contextLines); j <= Math.min(section.diff!.length - 1, i + contextLines); j++) {
            changedIndices.add(j);
          }
        }
      });

      const linesToShow = section.diff.filter((_, i) => changedIndices.has(i));

      return (
        <div className="font-mono text-xs space-y-0.5">
          {linesToShow.map((line, i) => (
            <div
              key={i}
              className={`flex ${
                line.type === "add"
                  ? "bg-green-50 text-green-800"
                  : line.type === "remove"
                  ? "bg-red-50 text-red-800"
                  : "text-slate-500"
              }`}
            >
              <span className="w-8 text-right pr-2 text-slate-400 select-none">
                {line.lineNumber}
              </span>
              <span className="w-6 text-center select-none">
                {line.type === "add" && <Plus size={12} className="inline text-green-600" />}
                {line.type === "remove" && <Minus size={12} className="inline text-red-600" />}
                {line.type === "unchanged" && " "}
              </span>
              <span className="flex-1 pl-1 whitespace-pre-wrap break-all">
                {line.content || " "}
              </span>
            </div>
          ))}
          {linesToShow.length < section.diff.length && (
            <div className="text-center text-slate-400 py-1">
              ... 省略 {section.diff.length - linesToShow.length} 行 ...
            </div>
          )}
        </div>
      );
    }

    // Simple value comparison
    const oldDisplay =
      typeof section.oldValue === "string" && typeof section.newValue === "string"
        ? highlightInlineDiff(section.oldValue, section.newValue).oldHighlighted
        : renderValue(section.oldValue, section.field);
    const newDisplay =
      typeof section.oldValue === "string" && typeof section.newValue === "string"
        ? highlightInlineDiff(section.oldValue, section.newValue).newHighlighted
        : renderValue(section.newValue, section.field);

    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
          <Minus size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-red-600 font-medium">旧版本</span>
            <div className="mt-1 text-sm text-red-900">
              {oldDisplay}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
          <Plus size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-green-600 font-medium">新版本</span>
            <div className="mt-1 text-sm text-green-900">
              {newDisplay}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#FFFCF7] border-[#E8E0D0]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0B1B2B]">
            <GitCompare size={18} className="text-[#D4AF37]" />
            版本对比
          </DialogTitle>
        </DialogHeader>

        {/* Version Selectors */}
        <div className="flex items-center gap-4 py-3 border-b border-[#E8E0D0]">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">旧版本 (基准)</label>
            <Select
              value={leftVersionId || initVersions.left}
              onValueChange={setLeftVersionId}
            >
              <SelectTrigger className="bg-white border-[#E8E0D0]">
                <SelectValue placeholder="选择版本" />
              </SelectTrigger>
              <SelectContent className="bg-[#FFFCF7] border-[#E8E0D0]">
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} - {v.createdByName || "未知"} ({format(new Date(v.createdAt), "MM/dd HH:mm", { locale: zhCN })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight size={20} className="text-slate-400 mt-5" />

          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">新版本 (对比)</label>
            <Select
              value={rightVersionId || initVersions.right}
              onValueChange={setRightVersionId}
            >
              <SelectTrigger className="bg-white border-[#E8E0D0]">
                <SelectValue placeholder="选择版本" />
              </SelectTrigger>
              <SelectContent className="bg-[#FFFCF7] border-[#E8E0D0]">
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} - {v.createdByName || "未知"} ({format(new Date(v.createdAt), "MM/dd HH:mm", { locale: zhCN })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {diffs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Edit3 size={32} className="mx-auto mb-2 opacity-50" />
              <p>两个版本内容相同，没有差异</p>
            </div>
          ) : (
            diffs.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={i} className="border border-[#E8E0D0] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#F0EBD8] border-b border-[#E8E0D0]">
                    <Icon size={16} className="text-[#D4AF37]" />
                    <span className="font-medium text-[#0B1B2B]">{section.label}</span>
                  </div>
                  <div className="p-4">
                    {renderDiff(section)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stats */}
        {diffs.length > 0 && (
          <div className="border-t border-[#E8E0D0] pt-3 flex items-center justify-between text-sm text-slate-500">
            <span>
              共 {diffs.length} 处变更
            </span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-200 rounded" /> 删除
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-200 rounded" /> 新增
              </span>
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
