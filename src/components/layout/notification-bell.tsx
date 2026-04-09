"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Loader2, Sparkles, AlertCircle, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getNotifications, markAsRead, markAllAsRead } from "@/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import Link from "next/link";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // 轮询：每 2 分钟刷新一次
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n)
    );
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date() })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'tier_a_lead': return <Sparkles className="text-[#D4AF37]" size={16} />;
      case 'publish_failed': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Bell className="text-slate-400" size={16} />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} className="text-slate-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-[#D4AF37] hover:bg-[#D4AF37]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
          <span className="text-sm font-bold text-[#0B1B2B]">通知中心</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-[#D4AF37] hover:text-[#B8973B]"
              onClick={handleMarkAllRead}
            >
              全部标记为已读
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full py-10">
              <Loader2 className="animate-spin text-slate-300" size={24} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
              <Bell size={32} className="mb-2 text-slate-200" />
              <p className="text-xs text-slate-400">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 transition-colors hover:bg-slate-50 ${!n.readAt ? 'bg-slate-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-[#0B1B2B] truncate">{n.title}</span>
                        {!n.readAt && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">
                        {n.body}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: zhCN })}
                        </span>
                        <div className="flex items-center gap-2">
                          {n.actionUrl && (
                            <Link 
                              href={n.actionUrl}
                              className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-0.5"
                              onClick={() => {
                                handleMarkAsRead(n.id);
                                setIsOpen(false);
                              }}
                            >
                              查看详情 <ExternalLink size={8} />
                            </Link>
                          )}
                          {!n.readAt && (
                            <button 
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                            >
                              标记已读
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
