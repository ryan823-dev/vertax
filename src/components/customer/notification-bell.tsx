"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  getUnreadCount,
  getNotifications,
  markNotificationRead,
  markAllAsRead,
} from "@/actions/notifications";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  actionUrl: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; dotColor: string }> = {
  tier_a_lead: { label: "雷达", dotColor: "var(--ci-accent)" },
  geo_citation: { label: "GEO", dotColor: "#22C55E" },
  publish_failed: { label: "社媒", dotColor: "#EF4444" },
  system: { label: "系统", dotColor: "#60A5FA" },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

export function NotificationBell({ tenantId: _tenantId }: { tenantId?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    const count = await getUnreadCount();
    setUnread(count);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const items = await getNotifications(20);
    setNotifications(items);
    setLoading(false);
  }, []);

  // Poll unread count every 60s
  useEffect(() => {
    void loadCount(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch
    const interval = setInterval(() => void loadCount(), 60000);
    return () => clearInterval(interval);
  }, [loadCount]);

  // Open/close drawer
  useEffect(() => {
    if (open) void loadNotifications(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch
  }, [open, loadNotifications]);

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
  }

  async function handleMarkAll() {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:bg-white/5"
        style={{ color: "rgba(255,255,255,0.55)" }}
        aria-label={unread > 0 ? `通知 (${unread}条未读)` : '通知'}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-0.5"
            style={{ background: "#EF4444", color: "white" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden z-50"
          style={{
            background: "#0F1728",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 16px 48px -8px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: "var(--ci-accent)" }} />
              <span className="text-white text-sm font-semibold">通知</span>
              {unread > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}
                >
                  {unread} 未读
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[10px] transition-colors"
                aria-label="标记全部已读"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ci-accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >
                <CheckCheck size={11} />
                全部已读
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="py-8 text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                加载中...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>暂无通知</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: isUnread ? "rgba(79,141,246,0.03)" : "transparent",
                    }}
                    onClick={() => !n.readAt && handleMarkRead(n.id)}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isUnread ? cfg.dotColor : "rgba(255,255,255,0.15)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{
                            background: `${cfg.dotColor}18`,
                            color: cfg.dotColor,
                          }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white leading-snug truncate">{n.title}</p>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {n.body}
                      </p>
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium"
                          style={{ color: "var(--ci-accent)" }}
                        >
                          查看详情
                          <ExternalLink size={9} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
