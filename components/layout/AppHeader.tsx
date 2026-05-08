"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

// Components
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
import { NotificationBell } from "@/components/layout/notification-bell";
import PushNotificationSetup from "@/components/layout/PushNotificationSetup";

// Cần import thêm các UI components từ shadcn/ui
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
    user: {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        role?: string;
        type?: string;
        entityId?: string | null;
    } | null;
}

export default function AppHeader({ user }: AppHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Không render UI chuyển theme cho đến khi client đã mount xong (ngăn lỗi hydration)
    if (!mounted) return null;

    const displayName = user?.name || "Người dùng";
    const displayAvatarUrl = user?.avatar_url || "";

    return (
        <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-background sticky top-0 z-50 shadow-sm transition-colors duration-300">
            {/* 1. KHU VỰC TRÁI */}
            <div className="flex items-center gap-3">
                <div className="font-bold text-lg text-blue-700 dark:text-blue-400 pl-12 md:pl-0 transition-all">
                    Kieu Gia Construction
                </div>
            </div>

            {/* 2. KHU VỰC PHẢI */}
            <div className="flex items-center gap-2">

                {/* Chạy ngầm Push Notification */}
                <PushNotificationSetup userId={user?.id} />

                {/* ✅ MENU CHUYỂN ĐỔI THEME 3 CHẾ ĐỘ */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 relative">
                            {/* Icon Mặt trời sẽ xoay và ẩn đi khi ở dark mode */}
                            <Sun className="h-5 w-5 text-yellow-500 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            {/* Icon Mặt trăng sẽ xoay và hiện ra khi ở dark mode */}
                            <Moon className="absolute h-5 w-5 text-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Chuyển đổi giao diện</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => setTheme("light")}
                            className={theme === 'light' ? 'bg-accent font-medium' : ''}
                        >
                            <Sun className="mr-2 h-4 w-4 text-yellow-500" />
                            <span>Sáng (Off)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setTheme("dark")}
                            className={theme === 'dark' ? 'bg-accent font-medium' : ''}
                        >
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Tối (On)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setTheme("system")}
                            className={theme === 'system' ? 'bg-accent font-medium' : ''}
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>Hệ thống (Auto)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <NotificationBell />

                <UserDropdownMenu
                    user={{
                        name: displayName,
                        avatar_url: displayAvatarUrl,
                        email: user?.email || "",
                    }}
                    onProfile={() => router.push("/profile")}
                    onSettings={() => router.push("/settings")}
                />
            </div>
        </header>
    );
}