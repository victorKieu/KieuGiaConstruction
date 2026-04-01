"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
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

    // Hàm load thông báo (Chỉ lấy của user đang đăng nhập)
    const fetchNotifications = async (currentUserId: string) => {
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", currentUserId) // ✅ CHỈ LẤY THÔNG BÁO CỦA MÌNH
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchNotifications(user.id);

                // ✅ LẮNG NGHE REALTIME CHÍNH XÁC CHO USER NÀY
                channel = supabase
                    .channel(`notifications_${user.id}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}` // Chỉ re-render nếu có tin của mình
                    }, () => {
                        fetchNotifications(user.id);
                    })
                    .subscribe();
            }
        };

        init();

        return () => { if (channel) supabase.removeChannel(channel); }
    }, []);

    const handleRead = async (id: string) => {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
        if (userId) fetchNotifications(userId);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white border border-white" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 font-medium border-b bg-slate-50">Thông báo của bạn</div>
                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">Không có thông báo mới</div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.link || "#"}
                                    onClick={() => handleRead(n.id)}
                                    className={`p-4 border-b hover:bg-slate-50 transition-colors text-sm ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                                >
                                    <div className={`font-semibold mb-1 ${!n.is_read ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {!n.is_read && <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>}
                                        {n.title}
                                    </div>
                                    <div className="text-slate-600 line-clamp-2 leading-relaxed">{n.message}</div>
                                    <div className="text-[11px] text-slate-400 mt-2 font-medium">
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