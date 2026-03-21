"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  TestTube,
  CheckCircle2,
  XCircle,
  Globe,
  Shield,
  Zap,
} from "lucide-react";
import {
  getWebsiteConfigDetail,
  saveWebsiteConfig,
  testWebsiteConnection,
} from "@/actions/website-config";
import type { WebsiteConfigDetail } from "@/actions/website-config.types";

export default function WebsitePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);

  // 表单状态
  const [url, setUrl] = useState("");
  const [siteType, setSiteType] = useState("supabase");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [pushSecret, setPushSecret] = useState("");
  const [approvalTimeoutHours, setApprovalTimeoutHours] = useState(24);
  const [isActive, setIsActive] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getWebsiteConfigDetail();
      if (config) {
        setUrl(config.url || "");
        setSiteType(config.siteType || "supabase");
        setSupabaseUrl(config.supabaseUrl || "");
        setFunctionName(config.functionName || "");
        setPushSecret(config.pushSecret || "");
        setApprovalTimeoutHours(config.approvalTimeoutHours || 24);
        setIsActive(config.isActive);
      }
    } catch (err) {
      console.error("加载配置失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await saveWebsiteConfig({
        url,
        siteType,
        supabaseUrl,
        functionName,
        pushSecret,
        approvalTimeoutHours,
        isActive,
      });
      setSaveResult(result);
    } catch (err) {
      setSaveResult({ success: false, error: "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testWebsiteConnection();
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "测试请求失败" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="网站配置" description="配置您的海外网站连接和发布设置" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="网站配置" description="配置您的海外网站连接和内容推送设置" />

      <div className="max-w-2xl space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              网站连接
            </CardTitle>
            <CardDescription>配置目标独立站的访问地址</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">网站地址</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tdpaint.com"
              />
              <p className="text-xs text-muted-foreground">
                客户海外官网的完整域名
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>启用推送</Label>
                <p className="text-xs text-muted-foreground">开启后营销内容可推送到此站点</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>

        {/* Supabase 配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Supabase Edge Function
            </CardTitle>
            <CardDescription>
              内容通过 Supabase Edge Function 推送到目标站点的 resources_posts 表
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteType">站点类型</Label>
              <div className="flex gap-2">
                {["supabase"].map((type) => (
                  <Badge
                    key={type}
                    variant={siteType === type ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSiteType(type)}
                  >
                    {type === "supabase" ? "Supabase" : type}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabaseUrl">Supabase 项目 URL</Label>
              <Input
                id="supabaseUrl"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxxxxxx.supabase.co"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="functionName">Edge Function 名称</Label>
              <Input
                id="functionName"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                placeholder="receive-content-push"
              />
            </div>
          </CardContent>
        </Card>

        {/* 安全配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              安全与审批
            </CardTitle>
            <CardDescription>
              推送密钥需要与目标站点 Supabase Secrets 中的 VERTAX_PUSH_SECRET 一致
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pushSecret">推送密钥 (Push Secret)</Label>
              <Input
                id="pushSecret"
                type="password"
                value={pushSecret}
                onChange={(e) => setPushSecret(e.target.value)}
                placeholder="与目标站点共享的 VERTAX_PUSH_SECRET"
              />
              <p className="text-xs text-muted-foreground">
                此密钥用于 Bearer Token 认证，需同步设置到目标站点的 Supabase Secrets
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">审批超时（小时）</Label>
              <Input
                id="timeout"
                type="number"
                min={1}
                max={168}
                value={approvalTimeoutHours}
                onChange={(e) => setApprovalTimeoutHours(parseInt(e.target.value) || 24)}
              />
              <p className="text-xs text-muted-foreground">
                推送后超过此时间未确认，将自动标记为超时
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存配置
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !supabaseUrl || !functionName}>
            {testing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            测试连接
          </Button>
        </div>

        {/* 保存结果 */}
        {saveResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            saveResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {saveResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {saveResult.success ? "配置已保存" : saveResult.error}
          </div>
        )}

        {/* 测试结果 */}
        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            testResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
