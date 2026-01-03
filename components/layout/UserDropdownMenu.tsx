"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/action/auth";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

interface UserDropdownMenuProps {
    user: {
        name?: string;
        avatar_url?: string | null;
        email?: string;
    };
    onProfile: () => void;
    onSettings: () => void;
}

export default function UserDropdownMenu({
    user,
    onProfile,
    onSettings,
}: UserDropdownMenuProps) {

    const handleLogout = async () => {
        await logoutAction();
    };

    const userInitials = user.name?.charAt(0)?.toUpperCase() ||
        user.email?.charAt(0)?.toUpperCase() ||
        "U";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-gray-200 transition-opacity hover:opacity-80">
                        {/* ✅ SỬA LỖI Ở ĐÂY: Dùng className="object-cover" */}
                        <AvatarImage
                            src={user.avatar_url || ""}
                            alt={user.name || "User"}
                            className="object-cover"
                        />

                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none truncate">
                            {user.name || "Người dùng"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onProfile} className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Thông tin cá nhân</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onSettings} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Cài đặt</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}