"use client";

import { grantSystemAccess } from "@/lib/action/employeeActions";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    employeeId: string;
    email: string;
}

export default function GrantAccessButton({ employeeId, email }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleGrant = async () => {
        // 1. Xác nhận trước khi tạo
        const confirmMsg = `Xác nhận cấp tài khoản hệ thống cho: ${email}?\n\nMật khẩu mặc định sẽ là: KieuGia@123456`;
        if (!confirm(confirmMsg)) return;

        setIsLoading(true);

        // 2. Gọi Server Action
        const res = await grantSystemAccess(employeeId, email);

        setIsLoading(false);

        // 3. Thông báo kết quả
        if (res.success) {
            alert(`✅ THÀNH CÔNG!\n\n${res.message}\n\nHãy thông báo cho nhân viên đăng nhập bằng Email và Mật khẩu này.`);
            router.refresh(); // Làm mới giao diện để hiện trạng thái Active
        } else {
            alert(`❌ LỖI: ${res.error}`);
        }
    };

    return (
        <button
            onClick={handleGrant}
            disabled={isLoading}
            className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 transition shadow-sm font-medium disabled:opacity-50 flex items-center gap-1"
        >
            {isLoading ? "⏳ Đang tạo..." : "🔑 Cấp TK"}
        </button>
    );
}