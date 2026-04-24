"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Package,
  Share2,
  UserSearch,
} from "lucide-react";
import { getTenantDetail, updateTenantStatus } from "@/actions/admin";
import {
  getTenantEmailConfig,
  updateTenantEmailConfig,
} from "@/actions/admin-email-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  domain: string | null;
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

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "email" | "users">(
    "info"
  );
  const [emailConfig, setEmailConfig] =
    useState<EmailConfigState>(emptyEmailConfig);
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tenantData, emailResult] = await Promise.all([
          getTenantDetail(tenantId),
          getTenantEmailConfig(tenantId),
        ]);

        setTenant(tenantData as TenantDetail | null);

        if (emailResult.success && emailResult.config) {
          setEmailConfig({
            website: emailResult.config.website || "",
            resendApiKey: "",
            fromEmail: emailResult.config.fromEmail || "",
            replyToEmail: emailResult.config.replyToEmail || "",
            hasResendApiKey: emailResult.config.hasResendApiKey,
            resendApiKeyPrefix: emailResult.config.resendApiKeyPrefix || "",
            usePlatformKey: emailResult.config.usePlatformKey,
          });
        }
      } catch {
        // Ignore and show fallback state.
      } finally {
        setLoading(false);
      }
    }

    load();
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

  async function handleSaveEmail() {
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
      const reload = await getTenantEmailConfig(tenantId);
      if (reload.success && reload.config) {
        setEmailConfig((prev) => ({
          ...prev,
          resendApiKey: "",
          hasResendApiKey: reload.config?.hasResendApiKey ?? false,
          resendApiKeyPrefix: reload.config?.resendApiKeyPrefix || "",
          usePlatformKey: reload.config?.usePlatformKey ?? true,
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
      <div className="py-20 text-center text-sm text-gray-400">加载中...</div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-400">未找到租户</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push("/tower")}
        >
          返回总览
        </Button>
      </div>
    );
  }

  const isActive = tenant.status === "active";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";
  const tabs = [
    { key: "info" as const, label: "基本信息" },
    { key: "email" as const, label: "邮件配置" },
    { key: "users" as const, label: `用户 (${tenant.users.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/tower")}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${
                  isActive
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                {isActive ? "正常" : "已暂停"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-400">
              {tenant.slug}.{baseDomain} · 创建于{" "}
              {new Date(tenant.createdAt).toLocaleDateString("zh-CN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://${tenant.slug}.${baseDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            访问工作台
          </a>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant={isActive ? "outline" : "default"}
                size="sm"
                disabled={statusLoading}
                className={
                  isActive ? "border-red-200 text-red-600 hover:bg-red-50" : ""
                }
              >
                {isActive ? "暂停" : "激活"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isActive ? "暂停租户" : "激活租户"}</DialogTitle>
                <DialogDescription>
                  {isActive
                    ? "暂停后，该租户下的所有用户都将无法继续访问系统。"
                    : "激活后，该租户将恢复正常访问。"}
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
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Package, label: "产品", value: tenant._count.products },
          { icon: FileText, label: "内容", value: tenant._count.seoContents },
          { icon: Share2, label: "社媒", value: tenant._count.socialPosts },
          { icon: UserSearch, label: "线索", value: tenant._count.leads },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
              {activeTab === tab.key ? (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "info" ? (
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <InfoRow label="租户名称" value={tenant.name} />
              <InfoRow label="租户标识" value={tenant.slug} />
              <InfoRow
                label="租户套餐"
                value={
                  tenant.plan === "free"
                    ? "免费版"
                    : tenant.plan === "pro"
                      ? "专业版"
                      : "企业版"
                }
              />
              <InfoRow label="外贸域名" value={tenant.domain || "未设置"} />
              <InfoRow
                label="创建日期"
                value={new Date(tenant.createdAt).toLocaleDateString("zh-CN")}
              />
              <InfoRow
                label="登录地址"
                value={`${tenant.slug}.${baseDomain}`}
              />
              <InfoRow label="租户状态" value={isActive ? "正常" : "已暂停"} />
            </div>
          ) : null}

          {activeTab === "email" ? (
            <div className="max-w-2xl space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-website">外贸网站域名</Label>
                  <Input
                    id="t-website"
                    placeholder="example.com"
                    value={emailConfig.website}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, website: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-resend">Resend API Key</Label>
                  <Input
                    id="t-resend"
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
                  <p className="text-xs text-gray-400">
                    {emailConfig.usePlatformKey
                      ? "当前使用平台统一 Key"
                      : "当前使用客户专属 Key"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-from">发件人邮箱</Label>
                  <Input
                    id="t-from"
                    placeholder="公司名称 <noreply@example.com>"
                    value={emailConfig.fromEmail}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        fromEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-reply">回复邮箱</Label>
                  <Input
                    id="t-reply"
                    placeholder="sales@example.com"
                    value={emailConfig.replyToEmail}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        replyToEmail: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveEmail} disabled={configSaving}>
                  {configSaving ? "保存中..." : "保存配置"}
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === "users" ? (
            <div className="overflow-x-auto">
              {tenant.users.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  暂无用户
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                      <th className="pb-3 font-medium">姓名</th>
                      <th className="pb-3 font-medium">邮箱</th>
                      <th className="pb-3 font-medium">角色</th>
                      <th className="pb-3 font-medium">最后登录</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tenant.users.map((user) => (
                      <tr key={user.id}>
                        <td className="py-3 font-medium text-gray-900">
                          {user.name || "-"}
                        </td>
                        <td className="py-3 text-gray-600">{user.email}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-xs">
                            {user.role.displayName}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-gray-400">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString(
                                "zh-CN"
                              )
                            : "从未登录"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
