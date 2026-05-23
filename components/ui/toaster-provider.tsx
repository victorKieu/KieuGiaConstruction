"use client";

import { Toaster } from "sonner";
import { useEffect, useState } from "react";

export function ToasterProvider() {
    // 1. Tạo state để theo dõi xem component đã mount xong trên trình duyệt chưa
    const [mounted, setMounted] = useState(false);

    // 2. useEffect chỉ chạy ở phía Client, SAU KHI render xong lần đầu
    useEffect(() => {
        setMounted(true);
    }, []);

    // 3. Trả về null trong quá trình Server render và Hydration
    if (!mounted) {
        return null;
    }

    // 4. Chỉ render Toaster khi đã hoàn toàn an toàn
    return <Toaster position="top-right" richColors closeButton />;
}