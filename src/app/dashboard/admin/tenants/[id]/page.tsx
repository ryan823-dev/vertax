"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getTenantDetail, updateTenantStatus } from "@/actions/admin";
import {
  getTenantEmailConfig,
  updateTenantEmailConfig,
} from "@/actions/admin-email-config";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: Date;
  users: {
    id: string;
    name: string | null;
    email: string;
    lastLoginAt: Date | null;
    role: { displayName: string };
  }[];
  _count: {
    products: number;
    seoContents: number;
    socialPosts: number;
    leads: number;
  };
};

type EmailConfigState = {
  website: string;
  resendApiKey: string;
  fromEmail: string;
  replyToEmail: string;
  hasResendApiKey: boolean;
  resendApiKeyPrefix: string;
  usePlatformKey: boolean;
};

const emptyEmailConfig: EmailConfigState = {
  website: "",
  resendApiKey: "",
  fromEmail: "",
  replyToEmail: "",
  hasResendApiKey: false,
  resendApiKeyPrefix: "",
  usePlatformKey: true,
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const locale = params.locale as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [emailConfig, setEmailConfig] =
    useState<EmailConfigState>(emptyEmailConfig);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    async function loadTenant() {
      try {
        const data = await getTenantDetail(tenantId);
        setTenant(data as TenantDetail | null);
      } catch {
        // Ignore and show fallback state.
      } finally {
        setLoading(false);
      }
    }

    loadTenant();
  }, [tenantId]);

  useEffect(() => {
    async function loadEmailConfig() {
      setConfigLoading(true);
      try {
        const result = await getTenantEmailConfig(tenantId);
        if (result.success && result.config) {
          setEmailConfig({
            website: result.config.website || "",
            resendApiKey: "",
            fromEmail: result.config.fromEmail || "",
            replyToEmail: result.config.replyToEmail || "",
            hasResendApiKey: result.config.hasResendApiKey,
            resendApiKeyPrefix: result.config.resendApiKeyPrefix || "",
            usePlatformKey: result.config.usePlatformKey,
          });
        }
      } catch {
        // Ignore and keep defaults.
      } finally {
        setConfigLoading(false);
      }
    }

    loadEmailConfig();
  }, [tenantId]);

  async function handleToggleStatus() {
    if (!tenant) {
      return;
    }

    setStatusLoading(true);
    const newStatus = tenant.status === "active" ? "suspended" : "active";

    try {
      const result = await updateTenantStatus(tenant.id, newStatus);
      if (result.success) {
        setTenant({ ...tenant, status: newStatus });
        toast.success(newStatus === "active" ? "租户已激活" : "租户已暂停");
      } else {
        toast.error("操作失败");
      }
    } catch {
      toast.error("操作失败");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleSaveEmailConfig() {
    setConfigSaving(true);

    try {
      const result = await updateTenantEmailConfig(tenantId, {
        website: emailConfig.website || undefined,
        resendApiKey: emailConfig.resendApiKey || undefined,
        fromEmail: emailConfig.fromEmail || undefined,
        replyToEmail: emailConfig.replyToEmail || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "保存失败");
        return;
      }

      toast.success("邮件配置已保存");
      const reloadResult = await getTenantEmailConfig(tenantId);
      if (reloadResult.success && reloadResult.config) {
        setEmailConfig((prev) => ({
          ...prev,
          resendApiKey: "",
          hasResendApiKey: reloadResult.config?.hasResendApiKey ?? false,
          resendApiKeyPrefix: reloadResult.config?.resendApiKeyPrefix || "",
          usePlatformKey: reloadResult.config?.usePlatformKey ?? true,
        }));
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setConfigSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="租户详情" />
        <div className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div>
        <PageHeader title="租户详情" />
        <div className="py-8 text-center text-sm text-muted-foreground">
          未找到租户
        </div>
      </div>
    );
  }

  const isActive = tenant.status === "active";

  return (
    <div>
      <PageHeader title={tenant.name} description={tenant.slug}>
        <Button variant="ghost" onClick={() => router.push(`/${locale}/admin`)}>
          返回列表
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant={isActive ? "outline" : "default"}
              disabled={statusLoading}
            >
              {isActive ? "暂停" : "激活"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isActive ? "暂停租户" : "激活租户"}</DialogTitle>
              <DialogDescription>
                {isActive
                  ? "确认暂停该租户后，该租户下的用户将无法继续访问系统。"
                  : "确认激活该租户后，该租户将恢复正常访问。"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={handleToggleStatus}
                disabled={statusLoading}
                variant={isActive ? "destructive" : "default"}
              >
                {statusLoading ? "处理中..." : isActive ? "确认暂停" : "确认激活"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="租户名称" value={tenant.name} />
            <DetailRow label="租户标识" value={tenant.slug} />
            <DetailRow
              label="租户套餐"
              value={
                tenant.plan === "free"
                  ? "免费版"
                  : tenant.plan === "pro"
                    ? "专业版"
                    : "企业版"
              }
            />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">租户状态</span>
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "border-green-200 text-green-600"
                    : "border-red-200 text-red-600"
                }
              >
                {isActive ? "正常" : "已暂停"}
              </Badge>
            </div>
            <DetailRow
              label="创建日期"
              value={new Date(tenant.createdAt).toLocaleDateString(locale)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>使用统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="产品数量" value={String(tenant._count.products)} />
            <DetailRow
              label="内容数量"
              value={String(tenant._count.seoContents)}
            />
            <DetailRow
              label="社媒帖子"
              value={String(tenant._count.socialPosts)}
            />
            <DetailRow label="线索数量" value={String(tenant._count.leads)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            邮件配置
            {configLoading ? (
              <span className="text-sm font-normal text-muted-foreground">
                加载中...
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">外贸网站域名</Label>
              <Input
                id="website"
                placeholder="例如：example.com"
                value={emailConfig.website}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, website: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                用于生成个性化内容和站点链接。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resendApiKey">Resend API Key</Label>
              <Input
                id="resendApiKey"
                type="password"
                placeholder={
                  emailConfig.hasResendApiKey
                    ? `已配置 (${emailConfig.resendApiKeyPrefix})`
                    : "re_xxx..."
                }
                value={emailConfig.resendApiKey}
                onChange={(e) =>
                  setEmailConfig({
                    ...emailConfig,
                    resendApiKey: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                {emailConfig.usePlatformKey
                  ? "当前使用平台统一 Key，填写后将切换为客户专属 Key。"
                  : "当前使用客户专属 Key，留空则保持不变。"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromEmail">发件人邮箱</Label>
              <Input
                id="fromEmail"
                placeholder="例如：公司名称 <noreply@example.com>"
                value={emailConfig.fromEmail}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                显示在邮件的发件人字段中。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyToEmail">回复邮箱</Label>
              <Input
                id="replyToEmail"
                placeholder="例如：sales@example.com"
                value={emailConfig.replyToEmail}
                onChange={(e) =>
                  setEmailConfig({
                    ...emailConfig,
                    replyToEmail: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                客户回复邮件时会发送到这个地址。
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveEmailConfig} disabled={configSaving}>
              {configSaving ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>用户列表 ({tenant.users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenant.users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{user.name || "-"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{user.role.displayName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {user.lastLoginAt
                      ? `最后登录：${new Date(user.lastLoginAt).toLocaleDateString(locale)}`
                      : "从未登录"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
