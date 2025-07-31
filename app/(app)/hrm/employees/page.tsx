// app/(app)/hrm/employees/page.tsx
// ĐÂY LÀ MỘT SERVER COMPONENT - KHÔNG CÓ "use client";

import * as React from "react";
//import { cookies } from "next/headers"; // Dùng để lấy cookies trên server
//import { createSupabaseServerClient } from "@/lib/supabase/server"; // Dùng Supabase server client
import { getEmployees } from "@/lib/action/hrmActions"; // Import Server Action

// Import Client Component để xử lý tương tác UI
import EmployeesClientPage from "@/components/hrm/EmployeesClientPage";

// Import các kiểu từ file hợp quy
import { Employee, GetEmployeesResult } from '@/types/hrm';

// Định nghĩa các tùy chọn chung (có thể được fetch từ DB nếu cần)
const statusOptions = ["Tất cả", "active", "inactive", "on_leave"];
const departments = ["Tất cả", "Phòng Kỹ thuật", "Phòng Kinh doanh", "Phòng Hành chính"];

export default async function EmployeesPage() {
    // Không cần useRouter ở đây vì đây là Server Component

    // Fetch dữ liệu ban đầu bằng Server Action
    // Server Actions có thể được gọi trực tiếp trong Server Components
    const initialData: GetEmployeesResult = await getEmployees({
        search: undefined,
        status: undefined,
        department: undefined,
        page: 1,
        limit: 5, // Mặc định số lượng nhân viên trên mỗi trang
    });

    return (
        <EmployeesClientPage
            initialEmployees={initialData.employees}
            initialTotalCount={initialData.totalCount}
            statusOptions={statusOptions}
            departments={departments}
        />
    );
}