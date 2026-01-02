"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Hoặc import createClient từ utils của bạn

// Thời gian mặc định: 5 phút = 5 * 60 * 1000 = 300000 ms
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export default function AutoLogoutProvider() {
    const router = useRouter();

    const handleLogout = useCallback(async () => {
        console.log("Đăng xuất tự động do không hoạt động.");

        // 1. Đăng xuất khỏi Supabase
        await supabase.auth.signOut();

        // 2. Xóa các dữ liệu local nếu cần (ví dụ user info cache)
        // localStorage.removeItem("user-storage"); 

        // 3. Chuyển hướng về trang đăng nhập
        router.push("/login");
        router.refresh(); // Làm mới để clear cache của Router
    }, [router]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // Hàm reset bộ đếm thời gian
        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        };

        // Danh sách các sự kiện được coi là "người dùng đang thao tác"
        // mousemove: di chuột, mousedown: click, keypress: gõ phím, scroll: cuộn, touchstart: chạm màn hình
        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

        // Gắn sự kiện lắng nghe
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Khởi động timer lần đầu
        resetTimer();

        // Dọn dẹp khi component unmount
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [handleLogout]);

    // Component này không hiển thị giao diện gì cả
    return null;
}