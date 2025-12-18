"use client";

import React, { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation"; // <-- KHÔNG CẦN NỮA
import { logoutAction } from "@/lib/action/auth"; // <-- IMPORT SERVER ACTION

interface UserDropdownMenuProps {
    user: {
        name?: string;
        avatar_url?: string;
        email?: string;
    };
    onProfile: () => void;
    onSettings: () => void;
    // onLogout: () => void; // <-- BỎ PROP NÀY (Tự xử lý bên trong)
}

// Xóa onLogout khỏi props nhận vào
const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({
    user,
    onProfile,
    onSettings,
}) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // const router = useRouter(); // <-- KHÔNG CẦN NỮA

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    // --- SỬA LOGIC LOGOUT ---
    const handleLogout = async () => {
        setOpen(false); // Đóng menu trước cho mượt
        await logoutAction(); // Gọi Server Action: Nó sẽ xóa Cookie -> Clear Cache -> Redirect
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center space-x-2 focus:outline-none"
            >
                {/* Fallback avatar nếu null */}
                <img
                    src={user?.avatar_url || "/images/default-avatar.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border"
                    onError={(e) => {
                        // Fallback khi ảnh lỗi
                        e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (user?.name || "User");
                    }}
                />
                <span className="font-semibold text-sm hidden md:block">
                    {user?.name || user?.email?.split('@')[0] || "Người dùng"}
                </span>
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b dark:border-neutral-700">
                        <div className="font-semibold text-sm truncate">{user?.name || "No name"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                    </div>
                    <div className="py-1">
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                            onClick={() => { setOpen(false); onProfile(); }}
                        >
                            Thông tin cá nhân
                        </button>
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                            onClick={() => { setOpen(false); onSettings(); }}
                        >
                            Cài đặt
                        </button>
                        <div className="border-t dark:border-neutral-700 my-1"></div>
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors font-medium"
                            onClick={handleLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDropdownMenu;