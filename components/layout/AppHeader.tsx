"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

// Components
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
import { NotificationBell } from "@/components/layout/notification-bell";
import PushNotificationSetup from "@/components/layout/PushNotificationSetup";
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

    if (!mounted) return null;

    const displayName = user?.name || "Người dùng";
    const displayAvatarUrl = user?.avatar_url || "";

    return (
        // ✅ FIX: bg-white -> bg-background, border-b -> border-b border-border
        <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-background sticky top-0 z-50 shadow-sm transition-colors duration-300">
            {/* 1. KHU VỰC TRÁI */}
            <div className="flex items-center gap-3">
                {/* pl-12 giữ nguyên cho mobile menu */}
                {/* ✅ FIX: text-blue-700 -> dark:text-blue-400 (sáng hơn trên nền tối) */}
                <div className="font-bold text-lg text-blue-700 dark:text-blue-400 pl-12 md:pl-0 transition-all">
                    Kieu Gia Construction
                </div>
            </div>

            {/* 2. KHU VỰC PHẢI */}
            <div className="flex items-center gap-2">

                {/* ✅ 2. CHÈN PUSH SETUP VÀO ĐÂY (Nó sẽ chạy ngầm) */}
                <PushNotificationSetup />

                <button
                    className="p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors text-foreground"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title="Đổi giao diện Sáng/Tối"
                >
                    {theme === "dark" ? (
                        <Sun className="w-5 h-5 text-yellow-500" />
                    ) : (
                        <Moon className="w-5 h-5 text-foreground" />
                    )}
                </button>

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