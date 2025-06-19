"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Moon, Search, Sun, User } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { logout } from '@/app/actions/logout';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useCurrentEmployee } from "@/lib/auth/use-current-employee"
import { useIsMobile } from "@/hooks/use-mobile"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Logo fallback khi không thể tải logo từ server
const LogoFallback = () => (
    <div className="w-8 h-8 bg-gold flex items-center justify-center rounded-md text-white font-bold text-sm">KG</div>
)

export default function Header() {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const isMobile = useIsMobile()
    //const [logoError, setLogoError] = useState(false)
    const { employee } = useCurrentEmployee();

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error("Lỗi đăng xuất:", error)
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

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
                                <AvatarImage src={employee?.avatar_url || "/placeholder.svg"} alt={user?.name || "User"} />
                                <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-popover text-popover-foreground border border-border" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
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
    )
}