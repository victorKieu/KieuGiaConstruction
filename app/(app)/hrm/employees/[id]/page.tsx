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
        <div className="p-6 max-w-[1200px] mx-auto animate-in fade-in zoom-in duration-300">

            {/* --- HEADER --- */}
            <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/hrm/employees"
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        title="Quay lại danh sách"
                    >
                        ←
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Chỉnh sửa hồ sơ</h1>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <span>Nhân viên:</span>
                            <span className="font-semibold text-blue-600 text-base">
                                {employeeData.name}
                            </span>
                            {employeeData.code && (
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border">
                                    {employeeData.code}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden md:block text-right">
                    <span className="text-[10px] text-gray-300 uppercase tracking-wider block mb-1">System ID</span>
                    <code className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border">
                        {id}
                    </code>
                </div>
            </div>

            {/* --- BODY: FORM --- */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-1">
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

// 2. Thêm Type Return: Promise<Metadata>
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const employee = await getEmployeeById(id);

    return {
        title: employee ? `Sửa: ${employee.name}` : "Không tìm thấy nhân viên",
    };
}