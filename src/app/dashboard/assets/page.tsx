"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { LayoutGrid, List, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { AssetUploadZone } from "@/components/assets/asset-upload-zone";
import { AssetCard } from "@/components/assets/asset-card";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetToolbar } from "@/components/assets/asset-toolbar";
import { AssetStatsBar } from "@/components/assets/asset-stats-bar";
import { AssetDetailPanel } from "@/components/assets/asset-detail-panel";
import { FolderTree } from "@/components/assets/folder-tree";

import {
  getAssets,
  getAssetStats,
  getFolders,
  getAsset,
  updateAsset,
  deleteAssets,
  moveAssets,
  createFolder,
  updateFolder,
  deleteFolder,
  getAssetDownloadUrl,
  getAssetThumbnailUrls,
} from "@/actions/assets";

import type {
  AssetFilters as AssetFiltersType,
  AssetWithFolder,
  AssetWithUrls,
  AssetStats,
  FolderTree as FolderTreeType,
  FolderWithChildren,
  UpdateAssetInput,
} from "@/types/assets";

type ViewMode = "grid" | "list";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function AssetsPage() {
  const [_isPending, startTransition] = useTransition();

  // 视图状态
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showUploadZone, setShowUploadZone] = useState(false);

  // 数据状态
  const [assets, setAssets] = useState<AssetWithFolder[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [folders, setFolders] = useState<FolderTreeType>({ folders: [], totalAssets: 0 });
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string | null>>({});

  // 筛选和分页
  const [filters, setFilters] = useState<AssetFiltersType>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 48;

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 详情面板
  const [detailAsset, setDetailAsset] = useState<AssetWithUrls | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 文件夹对话框
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "rename">("create");
  const [folderDialogParentId, setFolderDialogParentId] = useState<string | undefined>();
  const [folderDialogFolder, setFolderDialogFolder] = useState<FolderWithChildren | null>(null);
  const [folderName, setFolderName] = useState("");

  // 移动对话框
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    startTransition(async () => {
      try {
        const [assetsRes, statsRes, foldersRes] = await Promise.all([
          getAssets(
            { ...filters, folderId: selectedFolderId },
            { page, pageSize },
            { field: "createdAt", direction: "desc" }
          ),
          getAssetStats(),
          getFolders(),
        ]);

        setAssets(assetsRes.items);
        setTotalAssets(assetsRes.total);
        setStats(statsRes);
        setFolders(foldersRes);

        // 加载缩略图 URL
        const urls = await getAssetThumbnailUrls(
          assetsRes.items.map((asset) => ({
            id: asset.id,
            storageKey: asset.storageKey,
            fileCategory: asset.fileCategory,
            mimeType: asset.mimeType,
          }))
        );
        setThumbnailUrls(urls);
      } catch (error) {
        toast.error("加载数据失败");
        console.error(error);
      }
    });
  }, [filters, selectedFolderId, page]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 保存视图模式
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("asset-view-mode", mode);
  };

  // 上传完成
  const handleUploadComplete = () => {
    loadData();
    setShowUploadZone(false);
  };

  // 选择资产
  const handleSelectAsset = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // 清除选择
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // 打开详情
  const handleOpenDetail = async (asset: AssetWithFolder) => {
    try {
      const detail = await getAsset(asset.id);
      if (detail) {
        setDetailAsset(detail);
        setDetailOpen(true);
      }
    } catch {
      toast.error("加载详情失败");
    }
  };

  // 保存资产
  const handleSaveAsset = async (id: string, data: UpdateAssetInput) => {
    try {
      await updateAsset(id, data);
      toast.success("保存成功");
      loadData();
    } catch {
      toast.error("保存失败");
    }
  };

  // 下载
  const handleDownload = async (id: string) => {
    try {
      const url = await getAssetDownloadUrl(id);
      window.open(url, "_blank");
    } catch {
      toast.error("获取下载链接失败");
    }
  };

  // 删除
  const handleDelete = async (ids?: string[]) => {
    const idsToDelete = ids || Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    try {
      await deleteAssets(idsToDelete);
      toast.success(`已删除 ${idsToDelete.length} 个文件`);
      setSelectedIds(new Set());
      setDetailOpen(false);
      loadData();
    } catch {
      toast.error("删除失败");
    }
  };

  // 移动
  const handleMove = async () => {
    const idsToMove = Array.from(selectedIds);
    if (idsToMove.length === 0) return;

    try {
      await moveAssets(idsToMove, moveTargetFolderId);
      toast.success(`已移动 ${idsToMove.length} 个文件`);
      setSelectedIds(new Set());
      setMoveDialogOpen(false);
      loadData();
    } catch {
      toast.error("移动失败");
    }
  };

  // 文件夹操作
  const handleCreateFolder = (parentId?: string) => {
    setFolderDialogMode("create");
    setFolderDialogParentId(parentId);
    setFolderDialogFolder(null);
    setFolderName("");
    setFolderDialogOpen(true);
  };

  const handleRenameFolder = (folder: FolderWithChildren) => {
    setFolderDialogMode("rename");
    setFolderDialogFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  };

  const handleDeleteFolder = async (folder: FolderWithChildren) => {
    try {
      await deleteFolder(folder.id);
      toast.success("文件夹已删除");
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
      }
      loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "删除失败"));
    }
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      toast.error("请输入文件夹名称");
      return;
    }

    try {
      if (folderDialogMode === "create") {
        await createFolder({
          name: folderName.trim(),
          parentId: folderDialogParentId,
        });
        toast.success("文件夹已创建");
      } else if (folderDialogFolder) {
        await updateFolder(folderDialogFolder.id, { name: folderName.trim() });
        toast.success("文件夹已重命名");
      }
      setFolderDialogOpen(false);
      loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "操作失败"));
    }
  };

  const totalPages = Math.ceil(totalAssets / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <PageHeader title="客户素材中心" description="管理您的所有多媒体资源" />
        <Button onClick={() => setShowUploadZone(!showUploadZone)}>
          <Upload className="h-4 w-4 mr-2" />
          上传素材
        </Button>
      </div>

      {/* 上传区域 */}
      {showUploadZone && (
        <Card className="p-6">
          <AssetUploadZone
            folderId={selectedFolderId}
            onUploadComplete={handleUploadComplete}
          />
        </Card>
      )}

      {/* 统计栏 */}
      {stats && <AssetStatsBar stats={stats} />}

      {/* 主内容区域 */}
      <div className="flex gap-6">
        {/* 左侧文件夹树 */}
        <Card className="w-64 p-4 flex-shrink-0 h-fit">
          <FolderTree
            data={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </Card>

        {/* 右侧内容 */}
        <div className="flex-1 space-y-4">
          {/* 筛选和视图切换 */}
          <div className="flex items-center justify-between gap-4">
            <AssetFilters filters={filters} onChange={setFilters} className="flex-1" />
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => handleViewModeChange("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => handleViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 批量操作栏 */}
          <AssetToolbar
            selectedCount={selectedIds.size}
            onClearSelection={handleClearSelection}
            onMove={() => setMoveDialogOpen(true)}
            onAddTags={() => toast.info("标签功能开发中")}
            onSetPurpose={() => toast.info("用途标记功能开发中")}
            onDelete={() => setDeleteDialogOpen(true)}
          />

          {/* 资产网格/列表 */}
          {assets.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-muted-foreground">
                {filters.search || filters.fileCategory || selectedFolderId
                  ? "没有符合条件的素材"
                  : "还没有上传任何素材"}
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowUploadZone(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                上传素材
              </Button>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                  : "space-y-2"
              }
            >
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  thumbnailUrl={thumbnailUrls[asset.id]}
                  isSelected={selectedIds.has(asset.id)}
                  onSelect={(selected) => handleSelectAsset(asset.id, selected)}
                  onOpen={() => handleOpenDetail(asset)}
                  onDownload={() => handleDownload(asset.id)}
                  onMove={() => {
                    setSelectedIds(new Set([asset.id]));
                    setMoveDialogOpen(true);
                  }}
                  onDelete={() => handleDelete([asset.id])}
                />
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} 页，共 {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 详情面板 */}
      <AssetDetailPanel
        asset={detailAsset}
        folders={folders.folders}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSave={handleSaveAsset}
        onDownload={handleDownload}
        onDelete={(id) => handleDelete([id])}
      />

      {/* 文件夹对话框 */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderDialogMode === "create" ? "新建文件夹" : "重命名文件夹"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>文件夹名称</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="输入文件夹名称"
                onKeyDown={(e) => e.key === "Enter" && handleSaveFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveFolder}>
              {folderDialogMode === "create" ? "创建" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移动对话框 */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移动到文件夹</DialogTitle>
            <DialogDescription>
              选择目标文件夹，将 {selectedIds.size} 个文件移动到该位置
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FolderTree
              data={folders}
              selectedFolderId={moveTargetFolderId}
              onSelectFolder={setMoveTargetFolderId}
              onCreateFolder={() => {}}
              onRenameFolder={() => {}}
              onDeleteFolder={() => {}}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleMove}>移动</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedIds.size} 个文件吗？此操作可以撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDelete();
                setDeleteDialogOpen(false);
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
