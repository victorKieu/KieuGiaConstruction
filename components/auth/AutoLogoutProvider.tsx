// components/auth/AutoLogoutProvider.tsx
"use client";

import { useEffect, useCallback, ReactNode } from "react"; // Thêm ReactNode
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

// Định nghĩa Interface cho Props
interface AutoLogoutProviderProps {
    children: ReactNode;
}

export default function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
    const router = useRouter();

    const handleLogout = useCallback(async () => {
        console.log("Đăng xuất tự động do không hoạt động.");
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }, [router]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        };

        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [handleLogout]);

    // ✅ TRẢ VỀ CHILDREN thay vì null để không làm mất giao diện ứng dụng
    return <>{children}</>;
}