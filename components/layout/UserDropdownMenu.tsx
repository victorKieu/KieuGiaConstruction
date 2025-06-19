"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserDropdownMenuProps {
    user: {
        name?: string;
        avatar_url?: string;
        email?: string;
    };
    onProfile: () => void;
    onSettings: () => void;
    onLogout: () => void;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({
    user,
    onProfile,
    onSettings,
    onLogout,
}) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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
    const handleLogout = async () => {
        onLogout();
        router.push('/login');
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center space-x-2 focus:outline-none"
            >
                <img
                    src={user.avatar_url || "/default-avatar.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border"
                />
                <span className="font-semibold">{user.name || "Chưa đăng nhập"}</span>
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-20">
                    <div className="px-4 py-2 border-b">
                        <div className="font-semibold">{user.name || "No name"}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setOpen(false); onProfile(); }}>
                        Thông tin cá nhân
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setOpen(false); onSettings(); }}>
                        Cài đặt
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600" onClick={() => { setOpen(false); handleLogout() }}>
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserDropdownMenu;