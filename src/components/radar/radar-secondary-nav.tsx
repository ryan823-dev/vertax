"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Radar } from "lucide-react";
import { getNavItemByKey, getSortedSubItems } from "@/config/nav";

export function RadarSecondaryNav() {
  const pathname = usePathname();
  const radarNav = getNavItemByKey("radar");

  if (!radarNav?.subItems?.length) {
    return null;
  }

  const items = (() => {
    const baseItems = getSortedSubItems(radarNav);
    if (baseItems.some((item) => item.key === "daily")) {
      return baseItems;
    }

    return [
      ...baseItems,
      {
        key: "daily",
        label: "今日外联",
        href: "/customer/radar/daily",
        icon: CalendarCheck,
        order: 999,
      },
    ];
  })().sort((left, right) => left.order - right.order);

  return (
    <div className="rounded-[28px] border border-[#E8E0D0] bg-white/80 p-3 shadow-[0_18px_36px_-28px_rgba(11,27,43,0.45)] backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0EBD8] text-[#D4AF37] ring-1 ring-[#D4AF37]/15">
          <Radar size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A7A1C]">
            Radar Flow
          </p>
          <p className="text-xs text-slate-500">以目标画像驱动的获客工作台</p>
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
              className={`group rounded-2xl border px-3.5 py-3.5 transition-all duration-200 ${
                active
                  ? "border-[#D4AF37]/40 bg-[#FFF8E6] shadow-[0_14px_34px_-24px_rgba(212,175,55,0.85)]"
                  : "border-[#E8E0D0] bg-[#FFFCF8] hover:border-[#D4AF37]/30 hover:bg-[#FFF9ED]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
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
                  <div className="mt-0.5 text-xs leading-5 text-slate-500">
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
      return "启动并观察日常搜索生产线";
    case "candidates":
      return "审核系统发现的目标客户";
    case "prospects":
      return "沉淀正式线索并推进外联";
    case "daily":
      return "把今天可打、可发、待补全的线索放进同一工作台";
    case "opportunities":
      return "单独管理采购与招投标商机";
    default:
      return "查看模块详情";
  }
}
