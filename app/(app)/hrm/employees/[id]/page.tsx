import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import EmployeeForm from "@/components/hrm/EmployeeForm";
import { getEmployeeById } from "@/lib/action/employeeActions";
import { getDictionaryOptions } from "@/lib/action/dictionaryActions";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
    const { id } = await params;

    const [
        employeeData,
        departments,
        positions,
        genders,
        statuses,
        contractTypes,
        maritalStatuses
    ] = await Promise.all([
        getEmployeeById(id),
        getDictionaryOptions('DEPARTMENT'),
        getDictionaryOptions('POSITION'),
        getDictionaryOptions('GENDER'),
        getDictionaryOptions('JOB_STATUS'),
        getDictionaryOptions('CONTRACT_TYPE'),
        getDictionaryOptions('MARITAL_STATUS'),
    ]);

    if (!employeeData) {
        notFound();
    }

    return (
        <div className="p-6 max-w-[1200px] mx-auto animate-in fade-in zoom-in duration-300 transition-colors">
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Chỉnh sửa hồ sơ: <span className="text-blue-600 dark:text-blue-400">{employeeData.name}</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Cập nhật thông tin chi tiết của nhân sự trong hệ thống.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">System ID</span>
                    <code className="text-xs text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 transition-colors">
                        {id}
                    </code>
                </div>
            </div>

            {/* --- BODY: FORM --- */}
            <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-1 transition-colors">
                <div className="p-6">
                    <EmployeeForm
                        key={employeeData.updated_at}
                        initialData={employeeData}
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
        </div>
    );
}

// Thêm Type Return: Promise<Metadata> cho chuẩn Next.js 15
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const employee = await getEmployeeById(id);

    return {
        title: employee ? `Sửa: ${employee.name}` : "Không tìm thấy nhân viên",
    };
}