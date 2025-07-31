// components/layout/AppHeader.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Moon, Search, Sun, User } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context"; // Vẫn giữ để sử dụng user?.email và signOut
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
// Bỏ import useCurrentEmployee vì chúng ta sẽ truyền data qua props
// import { useCurrentEmployee } from "@/lib/auth/use-current-employee";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Import UserProfile interface để sử dụng trong props
import { UserProfile } from '@/lib/supabase/getUserProfile'; // Đảm bảo đường dẫn này đúng

// Định nghĩa props cho AppHeader
interface AppHeaderProps {
    userProfile: UserProfile | null; // AppHeader sẽ nhận userProfile qua props
}

// Logo fallback khi không thể tải logo từ server
const LogoFallback = () => (
    <div className="w-8 h-8 bg-gold flex items-center justify-center rounded-md text-white font-bold text-sm">KG</div>
);

// Thay đổi export default function Header() thành AppHeader({ userProfile }: AppHeaderProps)
export default function AppHeader({ userProfile }: AppHeaderProps) {
    const { user, signOut } = useAuth(); // Lấy user từ AuthContext (cung cấp email và chức năng đăng xuất)
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Hiển thị null hoặc một skeleton loading nếu chưa mount hoặc userProfile chưa sẵn sàng
    if (!mounted) {
        return null; // Hoặc một skeleton loading placeholder
    }

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    };

    // Hàm lấy chữ cái đầu tiên từ tên
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U"; // Mặc định "U" nếu tên là null/undefined
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    // Lấy tên hiển thị ưu tiên profile_name, rồi đến email, cuối cùng là "Người dùng"
    const displayName = userProfile?.profile_name || userProfile?.email || 'Người dùng';
    const displayAvatarUrl = userProfile?.profile_avatar_url || "/placeholder.svg";

    return (
        <header className="h-16 border-b bg-background text-foreground border-border flex items-center justify-between px-4 md:px-6">
            {/* Phần tìm kiếm */}
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

            {/* Phần phải - Thông báo, chuyển theme, user menu */}
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {/* Nút tìm kiếm trên mobile */}
                {isMobile && (
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Search className="h-5 w-5" />
                        <span className="sr-only">Tìm kiếm</span>
                    </Button>
                )}

                {/* Nút thông báo */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                    <span className="sr-only">Thông báo</span>
                </Button>

                {/* Nút chuyển theme */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span className="sr-only">Chuyển theme</span>
                </Button>

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                {/* Sử dụng avatar_url và tên từ userProfile */}
                                <AvatarImage src={displayAvatarUrl} alt={displayName} />
                                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-popover text-popover-foreground border border-border" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                {/* Hiển thị tên từ userProfile */}
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                {/* Email vẫn lấy từ useAuth context vì nó chứa thông tin user Auth của Supabase */}
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push("/profile")}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Hồ sơ</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/settings")}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Cài đặt</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Đăng xuất</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}