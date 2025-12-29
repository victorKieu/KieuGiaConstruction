"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from 'next-i18next';
import i18next from '@/app/src/config/i18n';

// 👇 1. Import component UserDropdownMenu và NotificationBell
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
import { NotificationBell } from "@/components/layout/notification-bell"; // Import Chuông thông báo

import type { UserProfile } from '@/types/userProfile';

// Map đường dẫn -> tiêu đề trang
const pageTitles: Record<string, string> = {
    "/dashboard": "Tổng quan",
    "/projects": "Dự Án",
    "/crm": "CRM",
    "/finance": "Tài chính",
    "/inventory": "Quản lý kho",
    "/hrm": "HRM",
    "/suppliers": "Nhà cung cấp",
    "/reports": "Báo cáo",
    "/admin": "Admin",
    "/settings": "Cài đặt",
    "/system-status": "Trạng thái hệ thống",
    "/profile": "Thông tin cá nhân",
};

interface AppHeaderProps {
    userProfile: UserProfile | null;
}

export default function AppHeader({ userProfile }: AppHeaderProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    // Lấy tiêu đề động theo route
    const pageTitle =
        Object.entries(pageTitles).find(([path]) =>
            pathname === path || pathname.startsWith(path + "/")
        )?.[1] || "Kieu Gia Construction";

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleDarkMode = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const displayName = userProfile?.name || userProfile?.email || 'Người dùng';
    const displayAvatarUrl = userProfile?.avatar_url || "/placeholder.svg";
    const displayEmail = userProfile?.email || '';

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push('/login');
    };

    const changeLanguage = (locale: string) => {
        i18next.changeLanguage(locale);
    };

    if (!mounted) {
        return null;
    }

    return (
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white dark:bg-neutral-900 sticky top-0 z-50">
            {/* Tiêu đề động */}
            <div className="font-bold text-lg text-blue-700 dark:text-blue-200 tracking-wide">
                {pageTitle}
            </div>

            {/* Nút chức năng */}
            <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="hidden md:flex"> {/* Ẩn trên mobile cho đỡ chật */}
                    <button onClick={() => changeLanguage('vi')} className="mr-1 p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm font-medium">
                        VI
                    </button>
                    <button onClick={() => changeLanguage('en')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm font-medium">
                        EN
                    </button>
                </div>

                {/* Nút tìm kiếm */}
                <div className="flex items-center">
                    <button
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                        onClick={() => setSearchOpen((v) => !v)}
                        aria-label="Tìm kiếm"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    {searchOpen && (
                        <input
                            autoFocus
                            className="ml-2 px-2 py-1 border rounded text-sm w-32 md:w-48 bg-transparent"
                            placeholder="Tìm kiếm..."
                        />
                    )}
                </div>

                {/* Nút đổi theme */}
                <button
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                    onClick={toggleDarkMode}
                    aria-label="Chuyển theme"
                >
                    {mounted && (theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                </button>

                {/* 👇 2. NHÚNG CHUÔNG THÔNG BÁO TẠI ĐÂY */}
                <NotificationBell />

                {/* Menu user */}
                <UserDropdownMenu
                    user={{
                        name: displayName,
                        avatar_url: displayAvatarUrl,
                        email: displayEmail
                    }}
                    onProfile={() => router.push("/profile")}
                    onSettings={() => router.push("/settings")}
                />
            </div>
        </header>
    );
}