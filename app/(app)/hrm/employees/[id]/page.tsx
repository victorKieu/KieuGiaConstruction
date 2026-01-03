import { getDictionaryOptions } from "@/lib/action/dictionaryActions";
import { getEmployeeById } from "@/lib/action/employeeActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/supabase/session";
import EditEmployeeForm from "./edit-form";

interface Props {
    params: Promise<{ id: string }>; // Next.js 15: params là Promise
}

export default async function EditEmployeePage(props: Props) {
    const params = await props.params;
    const employeeId = params.id;

    // 1. Kiểm tra quyền
    const session = await getCurrentSession();
    if (session.role !== 'admin' && session.role !== 'manager') {
        redirect("/hrm/employees");
    }

    // 2. Fetch dữ liệu nhân viên & Dictionary song song
    const [
        employee,
        departments,
        positions,
        genders,
        statuses,
        contractTypes,
        maritalStatuses
    ] = await Promise.all([
        getEmployeeById(employeeId),
        getDictionaryOptions('DEPARTMENT'),
        getDictionaryOptions('POSITION'),
        getDictionaryOptions('GENDER'),
        getDictionaryOptions('JOB_STATUS'),
        getDictionaryOptions('CONTRACT_TYPE'),
        getDictionaryOptions('MARITAL_STATUS')
    ]);

    if (!employee) {
        return <div className="p-6 text-red-500">Không tìm thấy hồ sơ nhân viên.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/hrm/employees" className="text-sm text-gray-500 hover:underline">
                        ← Quay lại danh sách
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                        <h1 className="text-2xl font-bold">Chỉnh sửa hồ sơ: {employee.name}</h1>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm font-mono">{employee.code}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <EditEmployeeForm
                    initialData={employee}
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