"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";
import { getNavItemByKey, getSortedSubItems } from "@/config/nav";

export function RadarSecondaryNav() {
  const pathname = usePathname();
  const radarNav = getNavItemByKey("radar");

  if (!radarNav?.subItems?.length) {
    return null;
  }

  const items = getSortedSubItems(radarNav);

  return (
    <div className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] p-3 shadow-[0_8px_24px_-20px_rgba(11,27,43,0.35)]">
      <div className="mb-3 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0EBD8] text-[#D4AF37]">
          <Radar size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A7A1C]">
            Radar Flow
          </p>
          <p className="text-xs text-slate-500">
            用户只做启动、确认、审核和跟进。
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/customer/radar" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`group rounded-xl border px-3 py-3 transition-all ${
                active
                  ? "border-[#D4AF37]/40 bg-[#D4AF37]/8 shadow-[0_10px_28px_-22px_rgba(212,175,55,0.75)]"
                  : "border-[#E8E0D0] bg-white hover:border-[#D4AF37]/30 hover:bg-[#FFF9ED]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? "bg-[#D4AF37]/15 text-[#9A7A1C]"
                      : "bg-[#F7F3E8] text-slate-500 group-hover:text-[#9A7A1C]"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${active ? "text-[#0B1B2B]" : "text-slate-700"}`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {getRadarSectionDescription(item.key)}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getRadarSectionDescription(key: string) {
  switch (key) {
    case "overview":
      return "看当前状态和下一步动作";
    case "targeting":
      return "确认系统按什么画像找客户";
    case "search":
      return "一键启动并观察自动执行";
    case "candidates":
      return "审核系统发现的目标客户";
    case "prospects":
      return "沉淀正式线索并推进外联";
    case "opportunities":
      return "单独管理采购与招投标商机";
    default:
      return "查看模块详情";
  }
}
