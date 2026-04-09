"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Trash2,
  Save,
  X,
  Calendar,
  User,
  HardDrive,
  FileType,
  Folder,
} from "lucide-react";
import {
  formatFileSize,
  getFileCategoryLabel,
  getFileCategoryColor,
  isPreviewable,
} from "@/lib/utils/file-utils";
import type {
  AssetWithUrls,
  UpdateAssetInput,
  AssetPurpose,
  FolderWithChildren,
  FileCategory,
} from "@/types/assets";

interface AssetDetailPanelProps {
  asset: AssetWithUrls | null;
  folders: FolderWithChildren[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: UpdateAssetInput) => Promise<void>;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

const PURPOSES: { value: AssetPurpose; label: string }[] = [
  { value: "knowledge", label: "知识提取" },
  { value: "marketing", label: "营销素材" },
  { value: "reference", label: "参考资料" },
];

export function AssetDetailPanel({
  asset,
  folders,
  open,
  onOpenChange,
  onSave,
  onDownload,
  onDelete,
}: AssetDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<UpdateAssetInput>({});
  const [newTag, setNewTag] = useState("");

  // 当 asset 变化时重置编辑状态
  useEffect(() => {
    if (asset) {
      setEditData({
        title: asset.title,
        description: asset.description || "",
        tags: asset.tags || [],
        purpose: asset.purpose as AssetPurpose[],
        folderId: asset.folderId,
      });
      setIsEditing(false);
    }
  }, [asset?.id]);

  if (!asset) return null;

  const canPreview = isPreviewable(
    asset.fileCategory as FileCategory,
    asset.mimeType
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(asset.id, editData);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editData.tags?.includes(newTag.trim())) {
      setEditData({
        ...editData,
        tags: [...(editData.tags || []), newTag.trim()],
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditData({
      ...editData,
      tags: editData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const handlePurposeChange = (purpose: AssetPurpose, checked: boolean) => {
    const current = editData.purpose || [];
    if (checked) {
      setEditData({ ...editData, purpose: [...current, purpose] });
    } else {
      setEditData({ ...editData, purpose: current.filter((p) => p !== purpose) });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{asset.title || asset.originalName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 预览区域 */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {asset.fileCategory === "image" && asset.viewUrl ? (
              <Image
                src={asset.viewUrl}
                alt={asset.title}
                fill
                className="object-contain"
                unoptimized
              />
            ) : asset.fileCategory === "video" && asset.viewUrl && canPreview ? (
              <video
                src={asset.viewUrl}
                controls
                className="w-full h-full"
                poster={asset.thumbnailUrl || undefined}
              />
            ) : asset.fileCategory === "audio" && asset.viewUrl && canPreview ? (
              <div className="flex items-center justify-center h-full">
                <audio src={asset.viewUrl} controls className="w-full max-w-sm" />
              </div>
            ) : asset.thumbnailUrl ? (
              <Image
                src={asset.thumbnailUrl}
                alt={asset.title}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                无法预览
              </div>
            )}
          </div>

          {/* 文件信息 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileType className="h-4 w-4" />
              <span>类型</span>
            </div>
            <div>
              <Badge className={getFileCategoryColor(asset.fileCategory as FileCategory)}>
                {getFileCategoryLabel(asset.fileCategory as FileCategory)}
              </Badge>
              <span className="ml-2 text-muted-foreground">{asset.extension}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              <span>大小</span>
            </div>
            <div>{formatFileSize(asset.fileSize)}</div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>上传时间</span>
            </div>
            <div>{new Date(asset.createdAt).toLocaleString("zh-CN")}</div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>上传者</span>
            </div>
            <div>{asset.uploadedBy?.name || asset.uploadedBy?.email || "-"}</div>

            {asset.folder && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Folder className="h-4 w-4" />
                  <span>文件夹</span>
                </div>
                <div>{asset.folder.name}</div>
              </>
            )}
          </div>

          {/* 可编辑字段 */}
          <div className="space-y-4 pt-4 border-t">
            {/* 标题 */}
            <div className="space-y-2">
              <Label>标题</Label>
              {isEditing ? (
                <Input
                  value={editData.title || ""}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              ) : (
                <p className="text-sm">{asset.title || asset.originalName}</p>
              )}
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label>描述</Label>
              {isEditing ? (
                <Textarea
                  value={editData.description || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {asset.description || "无描述"}
                </p>
              )}
            </div>

            {/* 用途 */}
            <div className="space-y-2">
              <Label>用途</Label>
              {isEditing ? (
                <div className="flex flex-wrap gap-3">
                  {PURPOSES.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`purpose-${value}`}
                        checked={editData.purpose?.includes(value)}
                        onCheckedChange={(checked) =>
                          handlePurposeChange(value, checked as boolean)
                        }
                      />
                      <Label htmlFor={`purpose-${value}`} className="font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {asset.purpose.length > 0 ? (
                    asset.purpose.map((p) => (
                      <Badge key={p} variant="secondary">
                        {PURPOSES.find((x) => x.value === p)?.label || p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">未设置</span>
                  )}
                </div>
              )}
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label>标签</Label>
              <div className="flex flex-wrap gap-1">
                {(isEditing ? editData.tags : asset.tags)?.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    {isEditing && (
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    )}
                  </Badge>
                ))}
                {isEditing && (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="添加标签..."
                      className="h-7 w-24"
                    />
                    <Button size="sm" variant="ghost" onClick={handleAddTag}>
                      添加
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 文件夹 */}
            {isEditing && (
              <div className="space-y-2">
                <Label>文件夹</Label>
                <Select
                  value={editData.folderId || "none"}
                  onValueChange={(v) =>
                    setEditData({ ...editData, folderId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择文件夹" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无（根目录）</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  编辑
                </Button>
                <Button variant="outline" onClick={() => onDownload(asset.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  下载
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-600"
                  onClick={() => onDelete(asset.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
