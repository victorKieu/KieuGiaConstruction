"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // Dùng Client Supabase để bắt realtime (nếu cần) hoặc fetch đơn giản

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    const supabase = createClient();

    // Hàm load thông báo
    const fetchNotifications = async () => {
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // (Nâng cao) Có thể thêm realtime subscription ở đây
        const channel = supabase
            .channel('notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
                fetchNotifications(); // Reload khi có tin mới
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); }
    }, []);

    const handleRead = async (id: string, link: string) => {
        // Đánh dấu đã đọc
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
        fetchNotifications();
        setOpen(false); // Đóng popup
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 font-medium border-b">Thông báo</div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Không có thông báo mới</div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.link || "#"}
                                    onClick={() => handleRead(n.id, n.link)}
                                    className={`p-4 border-b hover:bg-muted transition-colors text-sm ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="font-semibold mb-1">{n.title}</div>
                                    <div className="text-muted-foreground">{n.message}</div>
                                    <div className="text-xs text-muted-foreground mt-2 text-right">
                                        {new Date(n.created_at).toLocaleDateString('vi-VN')}
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