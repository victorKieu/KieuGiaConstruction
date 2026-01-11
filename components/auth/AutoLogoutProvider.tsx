"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // Đảm bảo đường dẫn đúng tới supabase client của bạn
import { toast } from "sonner";

// Thời gian chờ: 5 phút = 5 * 60 * 1000 ms
const LOGOUT_TIMER = 10 * 60 * 1000;

export default function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const supabase = createClient();

    // Hàm thực hiện đăng xuất
    const handleLogout = useCallback(async () => {
        // Chỉ logout nếu user đang không ở trang login
        if (pathname !== '/login') {
            await supabase.auth.signOut();
            toast.warning("Phiên làm việc hết hạn do không thao tác.", {
                description: "Vui lòng đăng nhập lại."
            });
            router.push('/login');
            router.refresh();
        }
    }, [pathname, router, supabase]);

    // Hàm reset đồng hồ đếm ngược
    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        // Nếu đang ở trang login thì không cần đếm ngược
        if (pathname === '/login') return;

        timerRef.current = setTimeout(handleLogout, LOGOUT_TIMER);
    }, [handleLogout, pathname]);

    useEffect(() => {
        // Danh sách các sự kiện cần bắt (bao gồm cả Touch cho Mobile)
        const events = [
            "mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"
        ];

        // Gán sự kiện reset timer khi người dùng tương tác
        const handleActivity = () => resetTimer();

        // Khởi động timer lần đầu
        resetTimer();

        // Add Event Listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup khi unmount
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);

    return <>{children}</>;
}