import { getDictionaryOptions } from "@/lib/action/dictionaryActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/supabase/session";
import CreateEmployeeForm from "./create-form"; // Import form client

export default async function CreateEmployeePage() {
    // 1. Kiểm tra quyền (Chỉ Admin/Manager mới được vào)
    const session = await getCurrentSession();
    if (session.role !== 'admin' && session.role !== 'manager') {
        redirect("/hrm/employees"); // ⚠️ Đã sửa path có /hrm
    }

    // 2. Lấy dữ liệu Dropdown (Chạy song song cho nhanh)
    const [
        departments,
        positions,
        genders,
        statuses,
        contractTypes,
        maritalStatuses
    ] = await Promise.all([
        getDictionaryOptions('DEPARTMENT'),
        getDictionaryOptions('POSITION'),
        getDictionaryOptions('GENDER'),
        getDictionaryOptions('JOB_STATUS'),
        getDictionaryOptions('CONTRACT_TYPE'),
        getDictionaryOptions('MARITAL_STATUS')
    ]);

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/hrm/employees" className="text-sm text-gray-500 hover:underline">
                        ← Quay lại danh sách
                    </Link>
                    <h1 className="text-2xl font-bold mt-1">Thêm hồ sơ nhân sự mới</h1>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <CreateEmployeeForm
                    options={{
                        departments,
                        positions,
                        genders,
                        statuses,
                        contractTypes,
                        maritalStatuses
                    }}
                />
            </div>
        </div>
    );
}