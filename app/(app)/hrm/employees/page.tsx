import { getEmployees, revokeSystemAccess } from "@/lib/action/employeeActions";
import { getDictionaryOptions } from "@/lib/action/dictionaryActions";
import Link from "next/link";
import { getCurrentSession } from "@/lib/supabase/session";
import GrantAccessButton from "./grant-button";

// ✅ Định nghĩa searchParams là Promise theo Next.js 15+
interface Props {
    searchParams: Promise<{
        q?: string;
    }>;
}

export default async function EmployeesPage(props: Props) {
    // ✅ Await searchParams
    const searchParams = await props.searchParams;
    const queryStr = searchParams.q || "";

    // 1. Kiểm tra session
    const session = await getCurrentSession();
    const isAdmin = session.role === 'admin';

    // 2. Fetch dữ liệu song song
    const [employeesResult, departments, statuses] = await Promise.all([
        getEmployees(queryStr),
        getDictionaryOptions('DEPARTMENT'),
        getDictionaryOptions('JOB_STATUS'),
    ]);

    const employees = employeesResult.data || [];

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý Nhân sự</h1>
                    <p className="text-sm text-gray-500">
                        Tổng số: <span className="font-semibold">{employees.length}</span> nhân viên
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {/* Form tìm kiếm */}
                    <form className="flex gap-2">
                        <input
                            name="q"
                            defaultValue={queryStr}
                            placeholder="Tìm theo tên, mã..."
                            className="border rounded px-3 py-2 text-sm focus:outline-blue-500"
                        />
                        <button type="submit" className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm">
                            🔍
                        </button>
                    </form>

                    {/* Nút Thêm mới */}
                    {(isAdmin || session.role === 'manager') && (
                        <Link
                            href="/hrm/employees/create"
                            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                        >
                            <span>+</span> Thêm nhân viên
                        </Link>
                    )}
                </div>
            </div>

            {/* --- TABLE --- */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b">
                            <tr>
                                <th className="px-6 py-4">Mã NV</th>
                                <th className="px-6 py-4">Thông tin nhân viên</th>
                                <th className="px-6 py-4">Phòng ban</th>
                                <th className="px-6 py-4">Chức vụ</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-center">Tài khoản</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {employees.length > 0 ? (
                                employees.map((emp) => {
                                    // ✅ FIX: Lấy avatar_url từ object join user_profiles
                                    const avatarUrl = (emp as any).user_profiles?.avatar_url;

                                    return (
                                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-blue-600">
                                                {emp.code}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-9 h-9">
                                                        {avatarUrl ? (
                                                            <img
                                                                src={avatarUrl}
                                                                alt={emp.name}
                                                                className="w-full h-full rounded-full object-cover border border-gray-200"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200">
                                                                {emp.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="font-semibold text-gray-900">{emp.name}</div>
                                                        <div className="text-gray-500 text-xs">{emp.email || "Chưa có email"}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {emp.department?.name || <span className="text-gray-400 italic">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {emp.position?.name || <span className="text-gray-400 italic">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {emp.status ? (
                                                    <span
                                                        className="px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                                                        style={{ backgroundColor: emp.status.color || '#9ca3af' }}
                                                    >
                                                        {emp.status.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {emp.auth_id ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">
                                                            ✓ Active
                                                        </span>
                                                        {isAdmin && (
                                                            <form action={async () => {
                                                                "use server";
                                                                await revokeSystemAccess(emp.id);
                                                            }}>
                                                                <button className="text-[10px] text-red-500 hover:underline">Khóa TK</button>
                                                            </form>
                                                        )}
                                                    </div>
                                                ) : (
                                                    isAdmin && emp.email && emp.status?.code !== 'RESIGNED' ? (
                                                        <GrantAccessButton employeeId={emp.id} email={emp.email} />
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">
                                                            {!emp.email ? "Thiếu email" : ""}
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/hrm/employees/${emp.id}`}
                                                    className="text-gray-600 hover:text-blue-600 font-medium text-sm"
                                                >
                                                    Chi tiết
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-2xl mb-2">📭</span>
                                            <p>Không tìm thấy nhân viên nào.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}