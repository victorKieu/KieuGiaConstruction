// app/(app)/hrm/employees/page.tsx
import { getEmployees } from "@/lib/action/hrmActions"; // Import Server Action
import EmployeesClientPage from "@/components/hrm/EmployeesClientPage";
import { GetEmployeesResult } from '@/types/hrm';

const statusOptions = ["Tất cả", "active", "inactive", "on_leave"];
const departments = ["Tất cả", "Phòng Kỹ thuật", "Phòng Kinh doanh", "Phòng Hành chính"];

export default async function EmployeesPage() {
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