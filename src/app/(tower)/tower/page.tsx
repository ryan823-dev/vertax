"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Activity,
  Search,
  ChevronRight,
} from "lucide-react";
import { CreateTenantDialog } from "@/components/admin/create-tenant-dialog";
import { getTenantStats, getTenants } from "@/actions/admin";

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
  free: "bg-gray-100 text-gray-600",
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
        const [s, t] = await Promise.all([getTenantStats(), getTenants()]);
        setStats(s);
        setTenants(t as TenantWithCount[]);
      } catch {
        // not admin
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeTenants = tenants.filter((t) => t.status === "active");
  const filtered = tenants.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台概览</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有租户和系统配置</p>
        </div>
        <CreateTenantDialog />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="租户总数"
          value={loading ? "—" : String(stats.tenantCount)}
          sub="所有注册企业"
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          icon={Activity}
          label="活跃租户"
          value={loading ? "—" : String(activeTenants.length)}
          sub={`${stats.tenantCount ? Math.round((activeTenants.length / stats.tenantCount) * 100) : 0}% 活跃率`}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          icon={Users}
          label="总用户数"
          value={loading ? "—" : String(stats.userCount)}
          sub="所有平台用户"
          color="text-purple-600 bg-purple-50"
        />
        <StatCard
          icon={Users}
          label="平均用户"
          value={
            loading || stats.tenantCount === 0
              ? "—"
              : (stats.userCount / stats.tenantCount).toFixed(1)
          }
          sub="每租户平均"
          color="text-amber-600 bg-amber-50"
        />
      </div>

      {/* Tenant Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">租户列表</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索租户..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37]/50 transition-all w-56"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {search ? "没有找到匹配的租户" : "暂无租户"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">租户</th>
                  <th className="px-5 py-3 font-medium">套餐</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium text-center">用户数</th>
                  <th className="px-5 py-3 font-medium">创建时间</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tenant.slug}
                          {tenant.domain && (
                            <span className="ml-2 text-blue-500">
                              {tenant.domain}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          PLAN_COLORS[tenant.plan] || "bg-gray-100 text-gray-600"
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
                          className={`w-1.5 h-1.5 rounded-full ${
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
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {new Date(tenant.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/tower/tenants/${tenant.id}`}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#D4AF37] transition-colors"
                      >
                        详情
                        <ChevronRight className="w-3.5 h-3.5" />
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
