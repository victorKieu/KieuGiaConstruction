// components/layout/AppHeader.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
// XÓA DÒNG NÀY: import { getUserProfile } from '@/lib/supabase/getUserProfile';
import { useTheme } from "next-themes"; // <--- Sửa lỗi ở đây
import { useTranslation } from 'next-i18next';
//import Link from 'next/link';
import i18next from '@/app/src/config/i18n';

// IMPORT UserProfile interface

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

// Định nghĩa props cho AppHeader
interface AppHeaderProps {
    userProfile: UserProfile | null; // AppHeader sẽ nhận userProfile qua props
}

// Thay đổi export default function AppHeader() thành AppHeader({ userProfile }: AppHeaderProps)
export default function AppHeader({ userProfile }: AppHeaderProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    // Bỏ state 'user' nếu bạn chỉ dùng userProfile từ props
    // const [user, setUser] = useState<{ name?: string, email?: string, avatar_url?: string } | null>(null);
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
        // XÓA DÒNG NÀY: getUserProfile().then(profile => setUser(profile));
    }, []);

    // Đổi theme - Sử dụng setTheme từ useTheme
    const toggleDarkMode = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Lấy tên hiển thị từ userProfile (đã được truyền từ Server Component)
    const displayName = userProfile?.name || userProfile?.email || 'Người dùng';
    const displayAvatarUrl = userProfile?.avatar_url || "/placeholder.svg";
    const displayEmail = userProfile?.email || '';

    // Action logout gọi API và reload lại trang
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push('/login');
    };

    const changeLanguage = (locale: string) => {
        i18next.changeLanguage(locale);
    };

    if (!mounted) {
        return null; // Hoặc một skeleton loading placeholder
    }

    return (
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white dark:bg-neutral-900">
            {/* Tiêu đề động */}
            <div className="font-bold text-lg text-blue-700 dark:text-blue-200 tracking-wide">
                {pageTitle}
            </div>

            {/* Nút chức năng */}
            <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div>
                    <button onClick={() => changeLanguage('vi')} className="mr-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">
                        <span role="img" aria-label="Vietnamese">VI</span>
                    </button>
                    <button onClick={() => changeLanguage('en')} className="mr-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">
                        <span role="img" aria-label="English">EN</span>
                    </button>
                </div>
                {/* Nút tìm kiếm */}
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
                        className="ml-2 px-2 py-1 border rounded"
                        placeholder="Tìm kiếm..."
                    />
                )}

                {/* Nút đổi theme */}
                <button
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                    onClick={toggleDarkMode}
                    aria-label="Chuyển theme"
                >
                    {mounted && (theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                </button>

                {/* Menu user */}
                <UserDropdownMenu
                    user={{
                        name: displayName, // Sử dụng tên từ userProfile
                        avatar_url: displayAvatarUrl, // Sử dụng avatar_url từ userProfile
                        email: displayEmail // Sử dụng email từ userProfile
                    }}
                    onProfile={() => router.push("/profile")}
                    onSettings={() => router.push("/settings")}
                    onLogout={handleLogout}
                />
            </div>
        </header>
    );
}