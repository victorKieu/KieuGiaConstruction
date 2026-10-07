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
import { toast } from "sonner"; // Thêm toast để nảy thông báo góc màn hình

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

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const initRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserId(user.id);
            await fetchNotifications(user.id);

            // ✅ CHỈ BẮT SỰ KIỆN INSERT (Có thông báo mới) TRÁNH RACE CONDITION
            channel = supabase
                .channel(`realtime_notifications_${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload: any) => {
                    // Cập nhật state trực tiếp không cần fetch lại API tốn tài nguyên
                    const newNotification = payload.new;
                    setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Giữ tối đa 10 cái
                    setUnreadCount(prev => prev + 1);

                    // Hiện thông báo ở góc dưới màn hình
                    toast.info(newNotification.title, {
                        description: newNotification.message,
                    });
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('🔗 Đã kết nối Realtime Notifications thành công!');
                    }
                });
        };

        initRealtime();

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
                <Button variant="ghost" size="icon" className="relative transition-colors dark:hover:bg-slate-800">
                    <Bell className="h-5 w-5 dark:text-slate-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 animate-pulse rounded-full border border-white bg-red-600 ring-2 ring-white dark:border-slate-950 dark:ring-slate-950" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-lg dark:border-slate-800 dark:bg-slate-950" align="end">
                <div className="flex items-center justify-between border-b bg-slate-50 p-3 transition-colors dark:border-slate-800 dark:bg-slate-900/50">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thông báo của bạn</span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400" onClick={handleMarkAllAsRead} title="Đánh dấu đã đọc tất cả">
                            <CheckCheck className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400" onClick={handleDeleteAll} title="Xóa tất cả">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            <Bell className="mb-2 h-8 w-8 opacity-20" />
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
                                        {!n.is_read && <span className="mt-1.5 mr-2 h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-500"></span>}
                                        <span>{n.title}</span>
                                    </div>
                                    <div className="ml-4 line-clamp-2 leading-relaxed text-slate-600 dark:text-slate-400">
                                        {n.message}
                                    </div>
                                    <div className="mt-2 ml-4 font-medium tracking-wider text-[10px] text-slate-400 uppercase dark:text-slate-500">
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