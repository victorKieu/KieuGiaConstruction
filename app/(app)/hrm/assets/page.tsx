import React from "react";
import EmployeeAssetManager from "@/components/hrm/EmployeeAssetManager"; // Điều chỉnh lại đường dẫn này nếu bạn lưu file ở thư mục khác

export const metadata = {
    title: "Quản lý tài sản | Hệ thống HRM",
    description: "Cấp phát và theo dõi tài sản của nhân viên",
};

export default function AssetsPage() {
    return (
        <main className="w-full">
            {/* Gọi Component Asset Manager ra đây */}
            <EmployeeAssetManager />
        </main>
    );
}