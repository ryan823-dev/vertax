"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Building2, Eye, Users } from "lucide-react";
import { getTenantStats, getTenants } from "@/actions/admin";
import { PageHeader } from "@/components/common/page-header";
import { CreateTenantDialog } from "@/components/admin/create-tenant-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        // User may not be admin.
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div>
      <PageHeader title="平台管理" description="管理所有租户和系统设置">
        <CreateTenantDialog />
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">租户总数</CardTitle>
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
            <CardTitle className="text-sm font-medium">用户总数</CardTitle>
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
          <CardTitle>租户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              暂无租户
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
                  <div className="ml-4 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {tenant._count.users} 用户
                    </span>
                    <Badge variant={planBadgeVariant[tenant.plan] || "outline"}>
                      {tenant.plan === "free"
                        ? "免费版"
                        : tenant.plan === "pro"
                          ? "专业版"
                          : "企业版"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        tenant.status === "active"
                          ? "border-green-200 text-green-600"
                          : "border-red-200 text-red-600"
                      }
                    >
                      {tenant.status === "active" ? "正常" : "已暂停"}
                    </Badge>
                    <Link href={`/${locale}/admin/tenants/${tenant.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-1 h-4 w-4" />
                        查看详情
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
