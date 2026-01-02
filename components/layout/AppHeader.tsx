"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Sun, Moon, Menu } from "lucide-react"; // Import thêm icon Menu
import { useTheme } from "next-themes";
import { useTranslation } from 'next-i18next';
import i18next from '@/app/src/config/i18n';

// Components
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserProfile } from "@/lib/supabase/getUserProfile";

// Shadcn Sheet & Sidebar
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar"; // Import Sidebar component của bạn

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
    const [mobileOpen, setMobileOpen] = useState(false); // State quản lý việc đóng mở Sidebar Mobile

    // Lấy tiêu đề động
    const pageTitle = Object.entries(pageTitles).find(([path]) =>
        pathname === path || pathname.startsWith(path + "/")
    )?.[1] || "Kieu Gia Construction";

    useEffect(() => {
        setMounted(true);
    }, []);

    // Tự động đóng sidebar mobile khi chuyển trang
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const toggleDarkMode = () => setTheme(theme === "dark" ? "light" : "dark");

    const displayName = userProfile?.name || userProfile?.email || 'Người dùng';
    const displayAvatarUrl = userProfile?.avatar_url || "/placeholder.svg";
    const displayEmail = userProfile?.email || '';

    const changeLanguage = (locale: string) => i18next.changeLanguage(locale);

    if (!mounted) return null;

    return (
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white dark:bg-neutral-900 sticky top-0 z-50 shadow-sm">
            {/* --- KHU VỰC BÊN TRÁI --- */}
            <div className="flex items-center gap-3">
                {/* 1. Nút Menu Mobile (Chỉ hiện < md) */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-slate-500 hover:bg-slate-100">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>

                    {/* Nội dung Sidebar Mobile */}
                    <SheetContent side="left" className="p-0 w-[280px]">
                        {/* Tái sử dụng Component Sidebar đã có */}
                        <Sidebar className="border-none w-full h-full" />
                    </SheetContent>
                </Sheet>

                {/* Tiêu đề trang */}
                <div className="font-bold text-lg text-blue-700 dark:text-blue-200 tracking-wide truncate max-w-[200px] sm:max-w-none">
                    {pageTitle}
                </div>
            </div>

            {/* --- KHU VỰC BÊN PHẢI (Nút chức năng) --- */}
            <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="hidden md:flex items-center">
                    <button onClick={() => changeLanguage('vi')} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-600">VI</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => changeLanguage('en')} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-600">EN</button>
                </div>

                {/* Tìm kiếm */}
                <div className="flex items-center">
                    <button
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-slate-500"
                        onClick={() => setSearchOpen((v) => !v)}
                    >
                        <Search className="w-5 h-5" />
                    </button>
                    {searchOpen && (
                        <input
                            autoFocus
                            className="ml-2 px-3 py-1.5 text-sm border rounded-full w-32 md:w-48 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            placeholder="Tìm kiếm..."
                        />
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-slate-500"
                    onClick={toggleDarkMode}
                >
                    {mounted && (theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                </button>

                {/* Notification */}
                <NotificationBell />

                {/* User Menu */}
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