"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

// Components
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
import { NotificationBell } from "@/components/layout/notification-bell";

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
        // Giữ z-50 cho Header (Thấp hơn z-100 của Sidebar và nút Menu)
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white dark:bg-neutral-900 sticky top-0 z-50 shadow-sm">
            {/* 1. KHU VỰC TRÁI */}
            <div className="flex items-center gap-3">
                {/* ✅ GIỮ NGUYÊN pl-12: 
                   Trên mobile (md:pl-0 sẽ không chạy), ta padding trái 12 đơn vị 
                   để chữ không bị nút Menu (đang fixed ở góc trái) đè lên.
                */}
                <div className="font-bold text-lg text-blue-700 dark:text-blue-200 pl-12 md:pl-0 transition-all">
                    Kieu Gia Construction
                </div>
            </div>

            {/* 2. KHU VỰC PHẢI */}
            <div className="flex items-center gap-2">
                <button
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
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