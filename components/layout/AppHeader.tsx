"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "next-themes";

// Components
import UserDropdownMenu from "@/components/layout/UserDropdownMenu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppHeaderProps {
    userProfile: {
        name: string;
        email: string;
        avatar_url: string | null;
    } | null;
}

export default function AppHeader({ userProfile }: AppHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    if (!mounted) return null;

    const displayName = userProfile?.name || userProfile?.email || 'Người dùng';
    const displayAvatarUrl = userProfile?.avatar_url || "";

    return (
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white dark:bg-neutral-900 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[280px]">
                        <Sidebar className="border-none w-full h-full" />
                    </SheetContent>
                </Sheet>
                <div className="font-bold text-lg text-blue-700 dark:text-blue-200">Kieu Gia Construction</div>
            </div>

            <div className="flex items-center gap-2">
                <button className="p-2 rounded-full hover:bg-gray-100" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <NotificationBell />
                {/* ✅ TRUYỀN DỮ LIỆU VÀO DROPDOWN */}
                <UserDropdownMenu
                    user={{
                        name: displayName,
                        avatar_url: displayAvatarUrl,
                        email: userProfile?.email || ""
                    }}
                    onProfile={() => router.push("/profile")}
                    onSettings={() => router.push("/settings")}
                />
            </div>
        </header>
    );
}