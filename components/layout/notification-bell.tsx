"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const supabase = createClient();

    const fetchNotifications = async (currentUserId: string) => {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) {
            console.error("Lỗi lấy thông báo:", error);
            return;
        }

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    // ✅ Đã fix: Quản lý Realtime Channel chặt chẽ hơn để tránh memory leak
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const initRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserId(user.id);
            await fetchNotifications(user.id);

            channel = supabase
                .channel(`realtime_notifications_${user.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, () => {
                    // Không cần truyền payload vào fetch vì ta sẽ kéo lại 10 thông báo mới nhất
                    fetchNotifications(user.id);
                })
                .subscribe();
        };

        initRealtime();

        // Cleanup function chạy khi component unmount
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRead = async (id: string) => {
        setOpen(false);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
        if (error) console.error("Lỗi đánh dấu đã đọc DB:", error);
    };

    const handleMarkAllAsRead = async () => {
        if (!userId) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("is_read", false);

        if (error) console.error("Lỗi đánh dấu tất cả đã đọc DB:", error);
    };

    const handleDeleteAll = async () => {
        if (!userId) return;
        if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ thông báo không?")) return;

        setNotifications([]);
        setUnreadCount(0);

        const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
        if (error) console.error("Lỗi xóa thông báo DB:", error);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative dark:hover:bg-slate-800 transition-colors">
                    <Bell className="h-5 w-5 dark:text-slate-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-950 border border-white dark:border-slate-950 animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 dark:bg-slate-950 dark:border-slate-800 shadow-lg" align="end">
                <div className="flex items-center justify-between p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 transition-colors">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Thông báo của bạn</span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors" onClick={handleMarkAllAsRead} title="Đánh dấu đã đọc tất cả">
                            <CheckCheck className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors" onClick={handleDeleteAll} title="Xóa tất cả">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            Không có thông báo mới
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y dark:divide-slate-800">
                            {notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.link || "#"}
                                    onClick={() => handleRead(n.id)}
                                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-sm ${!n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/20' : 'bg-transparent'}`}
                                >
                                    <div className={`font-semibold mb-1 flex items-start ${!n.is_read ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {!n.is_read && <span className="shrink-0 mt-1.5 w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full mr-2"></span>}
                                        <span>{n.title}</span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed ml-4">
                                        {n.message}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium ml-4 uppercase tracking-wider">
                                        {new Date(n.created_at).toLocaleString('vi-VN')}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}