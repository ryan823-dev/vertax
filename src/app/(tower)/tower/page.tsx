"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import { getTenantStats, getTenants } from "@/actions/admin";
import { CreateTenantDialog } from "@/components/admin/create-tenant-dialog";

type TenantWithCount = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  domain: string | null;
  createdAt: Date;
  _count: { users: number };
};

const PLAN_LABELS: Record<string, string> = {
  free: "免费版",
  pro: "专业版",
  enterprise: "企业版",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-blue-50 text-blue-600",
  enterprise: "bg-amber-50 text-amber-700",
};

export default function TowerDashboard() {
  const [stats, setStats] = useState({ tenantCount: 0, userCount: 0 });
  const [tenants, setTenants] = useState<TenantWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsData, tenantData] = await Promise.all([
          getTenantStats(),
          getTenants(),
        ]);
        setStats(statsData);
        setTenants(tenantData as TenantWithCount[]);
      } catch {
        // User may not be admin.
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const activeTenants = tenants.filter((tenant) => tenant.status === "active");
  const filteredTenants = tenants.filter((tenant) => {
    if (!search) {
      return true;
    }

    const keyword = search.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(keyword) ||
      tenant.slug.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台总览</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理所有租户和系统配置
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="租户总数"
          value={loading ? "..." : String(stats.tenantCount)}
          sub="所有注册企业"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Activity}
          label="活跃租户"
          value={loading ? "..." : String(activeTenants.length)}
          sub={`${
            stats.tenantCount
              ? Math.round((activeTenants.length / stats.tenantCount) * 100)
              : 0
          }% 活跃率`}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={Users}
          label="总用户数"
          value={loading ? "..." : String(stats.userCount)}
          sub="所有平台用户"
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Users}
          label="平均用户"
          value={
            loading || stats.tenantCount === 0
              ? "..."
              : (stats.userCount / stats.tenantCount).toFixed(1)
          }
          sub="每租户平均"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">租户列表</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索租户..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm transition-all focus:border-[#D4AF37]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            加载中...
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-400">
              {search ? "没有找到匹配的租户" : "暂无租户"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">租户</th>
                  <th className="px-5 py-3 font-medium">套餐</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 text-center font-medium">用户数</th>
                  <th className="px-5 py-3 font-medium">创建时间</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900">
                          {tenant.name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {tenant.slug}
                          {tenant.domain ? (
                            <span className="ml-2 text-blue-500">
                              {tenant.domain}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          PLAN_COLORS[tenant.plan] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {PLAN_LABELS[tenant.plan] || tenant.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          tenant.status === "active"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tenant.status === "active"
                              ? "bg-green-500"
                              : "bg-red-400"
                          }`}
                        />
                        {tenant.status === "active" ? "正常" : "已暂停"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-600">
                      {tenant._count.users}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/tower/tenants/${tenant.id}`}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-[#D4AF37]"
                      >
                        详情
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}
