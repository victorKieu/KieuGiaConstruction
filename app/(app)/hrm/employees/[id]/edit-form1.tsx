"use client";

import { useActionState } from "react";
// ✅ Import thêm deleteEmployee
import { updateEmployee, deleteEmployee } from "@/lib/action/employeeActions";
import { DictionaryOption, EmployeeFormData } from "@/types/employee";
import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
// ✅ Import thêm hook cần thiết
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    initialData: any;
    options: {
        departments: DictionaryOption[];
        positions: DictionaryOption[];
        genders: DictionaryOption[];
        statuses: DictionaryOption[];
        contractTypes: DictionaryOption[];
        maritalStatuses: DictionaryOption[];
    };
}

interface ActionState {
    success: boolean;
    message?: string;
    error?: string;
}

const initialState: ActionState = {
    success: false,
    message: undefined,
    error: undefined
};

export default function EditEmployeeForm({ initialData, options }: Props) {
    const router = useRouter(); // ✅ Dùng để redirect
    const [isDeleting, setIsDeleting] = useState(false); // ✅ State loading cho nút xóa

    // Hàm wrapper update
    const actionWrapper = async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
        const rawData: EmployeeFormData = {
            code: formData.get("code") as string,
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            identity_card: formData.get("identity_card") as string,
            address: formData.get("address") as string,

            gender_id: formData.get("gender_id") as string,
            position_id: formData.get("position_id") as string,
            department_id: formData.get("department_id") as string,
            status_id: formData.get("status_id") as string,
            contract_type_id: formData.get("contract_type_id") as string,
            marital_status_id: formData.get("marital_status_id") as string,

            basic_salary: Number(formData.get("basic_salary")) || 0,
            hire_date: formData.get("hire_date") as string,
        };

        const result = await updateEmployee(initialData.id, rawData);

        return {
            success: result.success,
            message: result.message,
            error: result.error
        };
    };

    const [state, formAction] = useActionState(actionWrapper, initialState);

    // ✅ Hàm xử lý Xóa mềm
    const handleDelete = async () => {
        // Cảnh báo rõ ràng
        if (!confirm("⚠️ XÁC NHẬN NGHỈ VIỆC\n\nBạn có chắc chắn muốn chuyển trạng thái nhân viên này sang 'Đã nghỉ việc'?\n\nTài khoản đăng nhập hệ thống của họ sẽ bị vô hiệu hóa ngay lập tức.")) {
            return;
        }

        setIsDeleting(true);
        // Gọi Server Action xóa
        const result = await deleteEmployee(initialData.id);

        if (result.success) {
            alert(result.message);
            router.push("/hrm/employees"); // Quay về danh sách
            router.refresh(); // Làm mới dữ liệu
        } else {
            alert("Lỗi: " + result.error);
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        return dateString.split('T')[0];
    };

    return (
        <form action={formAction} className="space-y-8">
            {state.success && (
                <div className="bg-green-50 text-green-700 p-4 rounded border border-green-200 flex items-center">
                    ✓ {state.message || "Cập nhật thành công!"}
                </div>
            )}

            {state.error && (
                <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 flex items-center">
                    ⚠️ <span className="ml-2">{state.error}</span>
                </div>
            )}

            {/* === CÁC PHẦN FORM GIỮ NGUYÊN === */}
            {/* === PHẦN 1: THÔNG TIN CƠ BẢN === */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. Thông tin định danh</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Mã nhân viên <span className="text-red-500">*</span></label>
                        <input
                            name="code" required
                            defaultValue={initialData.code}
                            className="w-full border rounded-md p-2 bg-gray-50 text-gray-500"
                            readOnly
                        />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                        <input name="name" required defaultValue={initialData.name} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                        <input type="date" name="birth_date" defaultValue={formatDate(initialData.birth_date)} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Giới tính</label>
                        <select name="gender_id" defaultValue={initialData.gender_id || ""} className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn giới tính --</option>
                            {options.genders.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">CCCD / CMND</label>
                        <input name="identity_card" defaultValue={initialData.identity_card} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Tình trạng hôn nhân</label>
                        <select name="marital_status_id" defaultValue={initialData.marital_status_id || ""} className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn tình trạng --</option>
                            {options.maritalStatuses?.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* === PHẦN 2: CÔNG VIỆC === */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">2. Công việc & Hợp đồng</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Phòng ban</label>
                        <select name="department_id" defaultValue={initialData.department_id || ""} className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn phòng ban --</option>
                            {options.departments.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Chức vụ</label>
                        <select name="position_id" defaultValue={initialData.position_id || ""} className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn chức vụ --</option>
                            {options.positions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Loại hợp đồng</label>
                        <select name="contract_type_id" defaultValue={initialData.contract_type_id || ""} className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn loại HĐ --</option>
                            {options.contractTypes.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Ngày vào làm <span className="text-red-500">*</span></label>
                        <input type="date" name="hire_date" required defaultValue={formatDate(initialData.hire_date)} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Trạng thái làm việc</label>
                        <select name="status_id" defaultValue={initialData.status_id || ""} className="w-full border rounded-md p-2 bg-white">
                            {options.statuses.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Lương cơ bản (VNĐ)</label>
                        <input type="number" name="basic_salary" defaultValue={initialData.basic_salary} className="w-full border rounded-md p-2" />
                    </div>
                </div>
            </div>

            {/* === PHẦN 3: LIÊN HỆ === */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">3. Thông tin liên hệ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Email liên hệ</label>
                        <input type="email" name="email" defaultValue={initialData.email} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                        <input name="phone" defaultValue={initialData.phone} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Địa chỉ thường trú</label>
                        <input name="address" defaultValue={initialData.address} className="w-full border rounded-md p-2" />
                    </div>
                </div>
            </div>

            {/* ✅ FOOTER ACTION MỚI: CÓ NÚT XÓA */}
            <div className="pt-6 border-t flex justify-between items-center sticky bottom-0 bg-white p-4 -mx-6 -mb-6 shadow-inner">
                {/* Nút Xóa (Góc trái) - Chỉ hiện nếu chưa phải là trạng thái Nghỉ việc */}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                >
                    {isDeleting ? "Đang xử lý..." : "🗑️ Cho nghỉ việc"}
                </button>

                {/* Nút Hủy & Lưu (Góc phải) */}
                <div className="flex gap-3">
                    <Link
                        href="/hrm/employees"
                        className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Hủy bỏ
                    </Link>
                    <SubmitButton>
                        Lưu thay đổi
                    </SubmitButton>
                </div>
            </div>
        </form>
    );
}