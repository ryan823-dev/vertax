"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  TestTube,
  CheckCircle2,
  XCircle,
  Globe,
  Shield,
  Zap,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getWebsiteConfigs,
  saveWebsiteConfig,
  deleteWebsiteConfig,
  testWebsiteConnection,
} from "@/actions/website-config";
import type {
  WebsiteConfigDetail,
  WebsiteConfigFormData,
} from "@/actions/website-config.types";

const SITE_TYPES = [
  { value: "supabase", label: "Supabase" },
  { value: "nextjs", label: "Next.js Webhook" },
  { value: "wordpress", label: "WordPress" },
  { value: "rest", label: "REST API" },
];

const EMPTY_FORM: WebsiteConfigFormData = {
  siteName: "",
  url: "",
  siteType: "supabase",
  supabaseUrl: "",
  functionName: "",
  webhookUrl: "",
  wpUrl: "",
  wpUsername: "",
  wpPassword: "",
  pushSecret: "",
  approvalTimeoutHours: 24,
  isActive: true,
};

function configToForm(c: WebsiteConfigDetail): WebsiteConfigFormData {
  return {
    id: c.id,
    siteName: c.siteName ?? "",
    url: c.url ?? "",
    siteType: c.siteType,
    supabaseUrl: c.supabaseUrl ?? "",
    functionName: c.functionName ?? "",
    webhookUrl: c.webhookUrl ?? "",
    wpUrl: c.wpUrl ?? "",
    wpUsername: c.wpUsername ?? "",
    wpPassword: c.wpPassword ?? "",
    pushSecret: c.pushSecret ?? "",
    approvalTimeoutHours: c.approvalTimeoutHours,
    isActive: c.isActive,
  };
}

export default function WebsitePage() {
  const [configs, setConfigs] = useState<WebsiteConfigDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<WebsiteConfigFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Test
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWebsiteConfigs();
      setConfigs(data);
    } catch (err) {
      console.error("加载配置失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSaveResult(null);
    setDialogOpen(true);
  };

  const openEdit = (config: WebsiteConfigDetail) => {
    setForm(configToForm(config));
    setSaveResult(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await saveWebsiteConfig(form);
      setSaveResult(result);
      if (result.success) {
        await loadConfigs();
        setTimeout(() => setDialogOpen(false), 800);
      }
    } catch {
      setSaveResult({ success: false, error: "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testWebsiteConnection(id);
      setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { success: false, message: "测试请求失败" } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteWebsiteConfig(deleteId);
      setConfigs((prev) => prev.filter((c) => c.id !== deleteId));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const setField = <K extends keyof WebsiteConfigFormData>(
    key: K,
    value: WebsiteConfigFormData[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div>
        <PageHeader title="目标站配置" description="管理内容推送的目标海外独立站" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="目标站配置" description="管理内容推送的目标海外独立站，支持多站点配置" />

      <div className="max-w-3xl space-y-4">
        {/* Site list */}
        {configs.map((config) => {
          const testResult = testResults[config.id];
          const isTesting = testingId === config.id;
          return (
            <Card key={config.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Globe className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {config.siteName || config.url || "未命名站点"}
                        </span>
                        <Badge variant={config.isActive ? "default" : "secondary"} className="text-xs">
                          {config.isActive ? "已启用" : "已停用"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {SITE_TYPES.find((t) => t.value === config.siteType)?.label ?? config.siteType}
                        </Badge>
                      </div>
                      {config.url && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{config.url}</p>
                      )}
                      {testResult && (
                        <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${testResult.success ? "text-emerald-600" : "text-red-500"}`}>
                          {testResult.success ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(config.id)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <TestTube className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(config)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(config.id)}
                      className="text-red-500 hover:text-red-600 hover:border-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty state */}
        {configs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">还没有配置目标站，点击下方添加</p>
            </CardContent>
          </Card>
        )}

        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          添加目标站
        </Button>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "编辑目标站" : "添加目标站"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Basic */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="siteName">站点名称</Label>
                  <Input
                    id="siteName"
                    value={form.siteName}
                    onChange={(e) => setField("siteName", e.target.value)}
                    placeholder="如：涂豆英文官网"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="url">网站地址</Label>
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setField("url", e.target.value)}
                    placeholder="https://www.tdpaint.com"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用推送</Label>
                    <p className="text-xs text-muted-foreground">关闭后暂停向此站点推送</p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setField("isActive", v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Site type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  推送方式
                </CardTitle>
                <CardDescription className="text-xs">根据目标站技术栈选择</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {SITE_TYPES.map((type) => (
                    <Badge
                      key={type.value}
                      variant={form.siteType === type.value ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setField("siteType", type.value)}
                    >
                      {type.label}
                    </Badge>
                  ))}
                </div>

                {form.siteType === "supabase" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Supabase 项目 URL</Label>
                      <Input
                        value={form.supabaseUrl ?? ""}
                        onChange={(e) => setField("supabaseUrl", e.target.value)}
                        placeholder="https://xxxxxxxx.supabase.co"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Edge Function 名称</Label>
                      <Input
                        value={form.functionName ?? ""}
                        onChange={(e) => setField("functionName", e.target.value)}
                        placeholder="receive-content-push"
                      />
                    </div>
                  </>
                )}

                {(form.siteType === "nextjs" || form.siteType === "rest") && (
                  <div className="space-y-1.5">
                    <Label>Webhook URL</Label>
                    <Input
                      value={form.webhookUrl ?? ""}
                      onChange={(e) => setField("webhookUrl", e.target.value)}
                      placeholder="https://your-site.com/api/vertax/push"
                    />
                  </div>
                )}

                {form.siteType === "wordpress" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>WordPress 站点 URL</Label>
                      <Input
                        value={form.wpUrl ?? ""}
                        onChange={(e) => setField("wpUrl", e.target.value)}
                        placeholder="https://www.tdpaint.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>用户名</Label>
                      <Input
                        value={form.wpUsername ?? ""}
                        onChange={(e) => setField("wpUsername", e.target.value)}
                        placeholder="admin"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Application Password</Label>
                      <Input
                        type="password"
                        value={form.wpPassword ?? ""}
                        onChange={(e) => setField("wpPassword", e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                      />
                      <p className="text-xs text-muted-foreground">
                        在 WordPress 后台 → 用户 → 应用密码 生成
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  安全与审批
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>推送密钥 (Push Secret)</Label>
                  <Input
                    type="password"
                    value={form.pushSecret ?? ""}
                    onChange={(e) => setField("pushSecret", e.target.value)}
                    placeholder="与目标站共享的签名密钥"
                  />
                  <p className="text-xs text-muted-foreground">
                    用于 HMAC-SHA256 签名验证，需同步设置到目标站
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>审批超时（小时）</Label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={form.approvalTimeoutHours}
                    onChange={(e) => setField("approvalTimeoutHours", parseInt(e.target.value) || 24)}
                  />
                  <p className="text-xs text-muted-foreground">
                    推送后超过此时间未确认，自动标记超时
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save result */}
            {saveResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                saveResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}>
                {saveResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {saveResult.success ? "保存成功" : saveResult.error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            删除后该站点的推送配置将永久移除，历史推送记录仍会保留。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
