"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { Building2, Users, Eye } from "lucide-react";
import { CreateTenantDialog } from "@/components/admin/create-tenant-dialog";
import { getTenantStats, getTenants } from "@/actions/admin";

type TenantWithCount = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: Date;
  _count: { users: number };
};

const planBadgeVariant: Record<string, "secondary" | "default" | "outline"> = {
  free: "outline",
  pro: "secondary",
  enterprise: "default",
};

export default function AdminPage() {
  const t = useTranslations("admin");
  const params = useParams();
  const locale = params.locale as string;
  const [stats, setStats] = useState({ tenantCount: 0, userCount: 0 });
  const [tenants, setTenants] = useState<TenantWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, tenantsData] = await Promise.all([
          getTenantStats(),
          getTenants(),
        ]);
        setStats(statsData);
        setTenants(tenantsData as TenantWithCount[]);
      } catch {
        // User may not be admin - data will stay empty
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <PageHeader title={t("title")} description={t("manageDesc")}>
        <CreateTenantDialog />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalTenants")}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.tenantCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalUsers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.userCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tenants")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t("loading")}
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t("noTenants")}
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm text-muted-foreground">
                      {tenant._count.users} {t("userCount")}
                    </span>
                    <Badge variant={planBadgeVariant[tenant.plan] || "outline"}>
                      {t(`plan${tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}`)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        tenant.status === "active"
                          ? "text-green-600 border-green-200"
                          : "text-red-600 border-red-200"
                      }
                    >
                      {tenant.status === "active"
                        ? t("statusActive")
                        : t("statusSuspended")}
                    </Badge>
                    <Link href={`/${locale}/admin/tenants/${tenant.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        {t("viewDetails")}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
