"use client";

import { useActionState } from "react";
// ✅ FIX 1: Sửa đường dẫn thành 'action' (số ít)
import { createEmployee } from "@/lib/action/employeeActions";
import { DictionaryOption, EmployeeFormData } from "@/types/employee";
import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
import React from "react";

interface Props {
    options: {
        departments: DictionaryOption[];
        positions: DictionaryOption[];
        genders: DictionaryOption[];
        statuses: DictionaryOption[];
        contractTypes: DictionaryOption[];
        maritalStatuses: DictionaryOption[];
    };
}

// ✅ FIX 2: Định nghĩa kiểu State rõ ràng để tránh xung đột Union Type
interface ActionState {
    success: boolean;
    message?: string;
    error?: string;
}

// ✅ FIX 3: Khai báo initialState chuẩn (dùng undefined thay vì chuỗi rỗng)
const initialState: ActionState = {
    success: false,
    message: undefined,
    error: undefined
};

export default function CreateEmployeeForm({ options }: Props) {

    // Wrapper để khớp FormData với Type EmployeeFormData
    // ✅ FIX 4: Định nghĩa rõ kiểu trả về là Promise<ActionState>
    const actionWrapper = async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
        const rawData: EmployeeFormData = {
            code: formData.get("code") as string,
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            identity_card: formData.get("identity_card") as string,
            address: formData.get("address") as string,

            gender_id: formData.get("gender_id") as string, // Nếu rỗng, Server Action sẽ handle hoặc convert sau
            position_id: formData.get("position_id") as string,
            department_id: formData.get("department_id") as string,
            status_id: formData.get("status_id") as string,
            contract_type_id: formData.get("contract_type_id") as string,
            marital_status_id: formData.get("marital_status_id") as string,

            basic_salary: Number(formData.get("basic_salary")) || 0,
            hire_date: formData.get("hire_date") as string,
        };

        // Gọi Server Action
        const result = await createEmployee(rawData);

        // Đảm bảo kết quả trả về khớp với ActionState
        // (Phòng trường hợp Server Action trả về kiểu hơi khác một chút)
        return {
            success: result.success,
            message: result.message,
            error: result.error
        };
    };

    const [state, formAction] = useActionState(actionWrapper, initialState);

    if (state.success) {
        return (
            <div className="text-center py-12">
                <div className="text-green-500 text-6xl mb-4">✓</div>
                <h3 className="text-2xl font-bold text-gray-800">Tạo hồ sơ thành công!</h3>
                <p className="text-gray-600 mt-2 mb-6">Nhân viên mới đã được thêm vào hệ thống HRM.</p>
                <div className="flex justify-center gap-4">
                    <Link href="/hrm/employees" className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
                        Về danh sách
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        + Thêm người khác
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-8">
            {/* Hiển thị lỗi từ Server trả về */}
            {state.error && (
                <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 flex items-center">
                    ⚠️ <span className="ml-2">{state.error}</span>
                </div>
            )}

            {/* === PHẦN 1: THÔNG TIN CƠ BẢN === */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. Thông tin định danh</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Mã nhân viên <span className="text-red-500">*</span></label>
                        <input name="code" required placeholder="VD: NV001" className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                        <input name="name" required placeholder="Nguyễn Văn A" className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                        <input type="date" name="birth_date" className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Giới tính</label>
                        <select name="gender_id" className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn giới tính --</option>
                            {options.genders.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">CCCD / CMND</label>
                        <input name="identity_card" placeholder="Số thẻ căn cước" className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Tình trạng hôn nhân</label>
                        <select name="marital_status_id" className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn tình trạng --</option>
                            {options.maritalStatuses?.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* === PHẦN 2: CÔNG VIỆC & HỢP ĐỒNG === */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">2. Công việc & Hợp đồng</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Phòng ban</label>
                        <select name="department_id" className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn phòng ban --</option>
                            {options.departments.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Chức vụ</label>
                        <select name="position_id" className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn chức vụ --</option>
                            {options.positions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Loại hợp đồng</label>
                        <select name="contract_type_id" className="w-full border rounded-md p-2 bg-white">
                            <option value="">-- Chọn loại HĐ --</option>
                            {options.contractTypes.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Ngày vào làm <span className="text-red-500">*</span></label>
                        <input type="date" name="hire_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Trạng thái làm việc</label>
                        <select name="status_id" className="w-full border rounded-md p-2 bg-white">
                            {options.statuses.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Lương cơ bản (VNĐ)</label>
                        <input type="number" name="basic_salary" placeholder="0" className="w-full border rounded-md p-2" />
                    </div>
                </div>
            </div>

            {/* === PHẦN 3: LIÊN HỆ === */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">3. Thông tin liên hệ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Email liên hệ</label>
                        <input type="email" name="email" placeholder="example@gmail.com" className="w-full border rounded-md p-2" />
                        <p className="text-xs text-gray-400 mt-1">* Đây là email liên lạc, không phải email đăng nhập hệ thống.</p>
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                        <input name="phone" placeholder="09xxxxxxx" className="w-full border rounded-md p-2" />
                    </div>
                    <div className="form-group md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Địa chỉ thường trú</label>
                        <input name="address" placeholder="Số nhà, đường, phường/xã..." className="w-full border rounded-md p-2" />
                    </div>
                </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="pt-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white p-4 -mx-6 -mb-6 shadow-inner">
                <Link
                    href="/hrm/employees"
                    className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Hủy bỏ
                </Link>
                <SubmitButton>
                    Lưu hồ sơ nhân viên
                </SubmitButton>
            </div>
        </form>
    );
}