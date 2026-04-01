"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Moon, Search, Sun, User, Clock, MapPinned, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import type { UserProfile } from '@/types/userProfile';

interface AppHeaderProps {
    userProfile: UserProfile | null;
}

const LogoFallback = () => (
    <div className="w-8 h-8 bg-gold flex items-center justify-center rounded-md text-white font-bold text-sm">KG</div>
);

export default function AppHeader({ userProfile }: AppHeaderProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    const displayName = userProfile?.name || userProfile?.email || 'Người dùng';
    const displayAvatarUrl = userProfile?.avatar_url || "/placeholder.svg";

    return (
        <header className="h-16 border-b bg-background text-foreground border-border flex items-center justify-between px-4 md:px-6">
            <div className="hidden md:flex items-center w-full max-w-md">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm kiếm..."
                        className="w-full bg-muted text-foreground placeholder:text-muted-foreground pl-8 focus-visible:ring-gold"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {isMobile && (
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Search className="h-5 w-5" />
                        <span className="sr-only">Tìm kiếm</span>
                    </Button>
                )}

                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                    <span className="sr-only">Thông báo</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span className="sr-only">Chuyển theme</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-slate-200 shadow-sm hover:ring-2 hover:ring-indigo-100 transition-all">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={displayAvatarUrl} alt={displayName} />
                                <AvatarFallback className="bg-indigo-600 text-white font-bold">{getInitials(displayName)}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 bg-popover text-popover-foreground border border-border" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal py-3">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none">{displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        {/* ✅ NHÓM MENU TỰ PHỤC VỤ (CÁ NHÂN) */}
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push("/my-attendance")} className="py-2 cursor-pointer font-medium text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50">
                                <MapPinned className="mr-2 h-4 w-4" />
                                <span>Chấm công GPS</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/my-attendance?tab=requests")} className="py-2 cursor-pointer">
                                <CalendarDays className="mr-2 h-4 w-4 text-emerald-600" />
                                <span>Xin Nghỉ phép & Giải trình</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/my-attendance")} className="py-2 cursor-pointer">
                                <Clock className="mr-2 h-4 w-4 text-slate-500" />
                                <span>Bảng công của tôi</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Hồ sơ cá nhân</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                                <Sun className="mr-2 h-4 w-4" />
                                <span>Cài đặt hệ thống</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Đăng xuất</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}