"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Loader2,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Target,
  Zap,
  Globe,
  Users,
  TrendingUp,
  ShieldCheck,
  Package,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import {
  getCompanyProfile,
  getAnalyzableAssets,
  analyzeAssets,
  type CompanyProfileData,
} from "@/actions/knowledge";

// ==================== 素材选择面板 ====================

function AssetSelector({
  assets,
  selectedIds,
  onToggle,
}: {
  assets: Array<{
    id: string;
    originalName: string;
    fileCategory: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
  }>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>暂无可分析的文档素材</p>
        <p className="mt-1">请先到素材中心上传公司介绍、产品资料等文档</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {assets.map((asset) => (
        <label
          key={asset.id}
          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <Checkbox
            checked={selectedIds.has(asset.id)}
            onCheckedChange={() => onToggle(asset.id)}
          />
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {asset.originalName}
            </p>
            <p className="text-xs text-muted-foreground">
              {(asset.fileSize / 1024).toFixed(0)} KB ·{" "}
              {new Date(asset.createdAt).toLocaleDateString("zh-CN")}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}

// ==================== 能力画像卡片组件 ====================

function ProfileSection({
  icon: Icon,
  title,
  children,
  empty,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ProfileDisplay({ profile }: { profile: CompanyProfileData }) {
  return (
    <div className="space-y-4">
      {/* 企业概述 */}
      {profile.companyIntro && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{profile.companyName || "企业概述"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {profile.companyIntro}
            </p>
            {profile.lastAnalyzedAt && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                AI 分析于{" "}
                {new Date(profile.lastAnalyzedAt).toLocaleString("zh-CN")}
                {profile.aiModel && ` · 模型: ${profile.aiModel}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 核心产品能力 */}
        <ProfileSection
          icon={Package}
          title="核心产品/服务"
          empty={profile.coreProducts.length === 0}
        >
          <div className="space-y-3">
            {profile.coreProducts.map((product, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3">
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {product.description}
                </p>
                {product.highlights?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {product.highlights.map((h, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* 技术优势 */}
        <ProfileSection
          icon={Zap}
          title="技术优势"
          empty={profile.techAdvantages.length === 0}
        >
          <div className="space-y-2">
            {profile.techAdvantages.map((adv, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{adv.title}</p>
                <p className="text-xs text-muted-foreground">{adv.description}</p>
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* 适用场景 */}
        <ProfileSection
          icon={Target}
          title="适用场景"
          empty={profile.scenarios.length === 0}
        >
          <div className="space-y-2">
            {profile.scenarios.map((sc, i) => (
              <div key={i} className="border-l-2 border-muted pl-3">
                <p className="text-sm">
                  <span className="font-medium">{sc.industry}</span>
                  {sc.scenario && ` · ${sc.scenario}`}
                </p>
                <p className="text-xs text-muted-foreground">{sc.value}</p>
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* 差异化卖点 */}
        <ProfileSection
          icon={ShieldCheck}
          title="差异化卖点"
          empty={profile.differentiators.length === 0}
        >
          <div className="space-y-2">
            {profile.differentiators.map((d, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{d.point}</p>
                <p className="text-xs text-muted-foreground">{d.description}</p>
              </div>
            ))}
          </div>
        </ProfileSection>
      </div>

      {/* ICP 目标客户画像 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            目标客户画像 (ICP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 目标行业 & 地区 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.targetIndustries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  目标行业
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetIndustries.map((ind, i) => (
                    <Badge key={i} variant="outline">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.targetRegions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  目标地区
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetRegions.map((r, i) => (
                    <Badge key={i} variant="outline">
                      {typeof r === "string" ? r : r.region}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 买家角色 */}
          {profile.buyerPersonas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                买家角色
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {profile.buyerPersonas.map((bp, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <p className="text-sm font-medium">
                      {bp.role}
                      {bp.title && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {bp.title}
                        </span>
                      )}
                    </p>
                    {bp.concerns?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {bp.concerns.map((c, j) => (
                          <Badge
                            key={j}
                            variant="secondary"
                            className="text-xs"
                          >
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 痛点 & 触发因素 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.painPoints.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  客户痛点
                </p>
                <div className="space-y-1.5">
                  {profile.painPoints.map((pp, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{pp.pain}</span>
                      {pp.howWeHelp && (
                        <span className="text-muted-foreground">
                          {" → "}
                          {pp.howWeHelp}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.buyingTriggers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  购买触发因素
                </p>
                <div className="space-y-1">
                  {profile.buyingTriggers.map((bt, i) => (
                    <p key={i} className="text-sm">
                      • {bt}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 主页面 ====================

export default function KnowledgePage() {
  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  const [assets, setAssets] = useState<
    Array<{
      id: string;
      originalName: string;
      fileCategory: string;
      mimeType: string;
      fileSize: number;
      createdAt: Date;
    }>
  >([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    async function load() {
      try {
        const [profileData, assetsData] = await Promise.all([
          getCompanyProfile(),
          getAnalyzableAssets(),
        ]);
        setProfile(profileData);
        setAssets(assetsData);
      } catch (error) {
        console.error("Failed to load knowledge data:", error);
        toast.error("加载数据失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 切换素材选择
  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全选
  const selectAll = () => {
    const allIds = assets.map((a) => a.id);
    setSelectedAssetIds(new Set(allIds));
  };

  // AI 分析
  const handleAnalyze = async () => {
    if (assets.length === 0) {
      toast.error("暂无可分析素材");
      return;
    }

    const usingAutoSelection = selectedAssetIds.size === 0;
    setAnalyzing(true);
    try {
      const result = await analyzeAssets(
        usingAutoSelection ? assets.map((asset) => asset.id) : Array.from(selectedAssetIds)
      );
      setProfile(result);
      toast.success(
        `企业能力画像已生成，已综合 ${usingAutoSelection ? assets.length : selectedAssetIds.size} 个素材`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "分析失败，请重试";
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="企业能力画像"
          description="基于企业资料，AI 自动提炼核心产品能力、技术优势、目标客户画像"
        />
        {profile && (
          <Button
            variant="outline"
            onClick={() =>
              document
                .getElementById("analyze-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重新分析
          </Button>
        )}
      </div>

      {/* 画像展示 */}
      {profile ? (
        <ProfileDisplay profile={profile} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium">尚未生成企业能力画像</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              请在下方选择已上传的企业资料，AI
              将自动分析并提炼出企业能力画像和目标客户画像
            </p>
          </CardContent>
        </Card>
      )}

      {/* 素材分析区域 */}
      <Card id="analyze-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI 素材分析
          </CardTitle>
          <CardDescription>
            选择素材中心的文档资料，AI
            将提取内容并分析生成企业能力画像。支持 PDF、Word、纯文本等格式。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 素材选择 */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              可分析素材 ({assets.length} 个文档)
            </p>
            {assets.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                全选
              </Button>
            )}
          </div>

          <AssetSelector
            assets={assets}
            selectedIds={selectedAssetIds}
            onToggle={toggleAsset}
          />

          {/* 分析按钮 */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedAssetIds.size > 0
                ? `已选择 ${selectedAssetIds.size} 个素材`
                : `未手动选择时，系统会综合全部素材，并自动提炼高价值片段`}
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || assets.length === 0}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  {profile ? "重新生成画像" : "生成企业能力画像"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
