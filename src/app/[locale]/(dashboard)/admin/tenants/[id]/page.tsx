"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getTenantDetail, updateTenantStatus } from "@/actions/admin";

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

export default function TenantDetailPage() {
  const t = useTranslations("admin");
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const tenantId = params.id as string;
  const locale = params.locale as string;

  useEffect(() => {
    async function loadTenant() {
      try {
        const data = await getTenantDetail(tenantId);
        setTenant(data as TenantDetail | null);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, [tenantId]);

  async function handleToggleStatus() {
    if (!tenant) return;
    setStatusLoading(true);
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    try {
      const result = await updateTenantStatus(tenant.id, newStatus);
      if (result.success) {
        setTenant({ ...tenant, status: newStatus });
        toast.success(
          newStatus === "active" ? t("activateSuccess") : t("suspendSuccess")
        );
      }
    } catch {
      toast.error(t("createError"));
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t("tenantDetails")} />
        <div className="text-sm text-muted-foreground py-8 text-center">
          {t("loading")}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div>
        <PageHeader title={t("tenantDetails")} />
        <div className="text-sm text-muted-foreground py-8 text-center">
          {t("notFound")}
        </div>
      </div>
    );
  }

  const isActive = tenant.status === "active";

  return (
    <div>
      <PageHeader title={tenant.name} description={tenant.slug}>
        <Button variant="ghost" onClick={() => router.push(`/${locale}/admin`)}>
          {t("backToList")}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant={isActive ? "outline" : "default"}
              disabled={statusLoading}
            >
              {isActive ? t("suspend") : t("activate")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isActive ? t("suspend") : t("activate")}
              </DialogTitle>
              <DialogDescription>
                {isActive ? t("confirmSuspend") : t("confirmActivate")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={handleToggleStatus}
                disabled={statusLoading}
                variant={isActive ? "destructive" : "default"}
              >
                {statusLoading ? "..." : isActive ? t("suspend") : t("activate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("tenantName")}</span>
              <span className="font-medium">{tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("tenantSlug")}</span>
              <span className="font-medium">{tenant.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("tenantPlan")}</span>
              <Badge variant="secondary">
                {t(`plan${tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}`)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("tenantStatus")}</span>
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "text-green-600 border-green-200"
                    : "text-red-600 border-red-200"
                }
              >
                {isActive ? t("statusActive") : t("statusSuspended")}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("createdDate")}</span>
              <span className="font-medium">
                {new Date(tenant.createdAt).toLocaleDateString(locale)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t("usageStats")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("statProducts")}</span>
              <span className="font-medium">{tenant._count.products}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("statContents")}</span>
              <span className="font-medium">{tenant._count.seoContents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("statPosts")}</span>
              <span className="font-medium">{tenant._count.socialPosts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("statLeads")}</span>
              <span className="font-medium">{tenant._count.leads}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {t("users")} ({tenant.users.length})
          </CardTitle>
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
                      ? `${t("lastLogin")}: ${new Date(user.lastLoginAt).toLocaleDateString(locale)}`
                      : t("neverLoggedIn")}
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
