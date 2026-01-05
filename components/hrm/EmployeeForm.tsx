"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/utils";
import { DictionaryOption } from "@/types/employee";
import { createEmployee, updateEmployee } from "@/lib/action/employeeActions";
import AvatarUpload from "./AvatarUpload";
import { SubmitButton } from "@/components/ui/submit-button";

export interface ActionState {
    success: boolean;
    message?: string;
    error?: string;
    fields?: Record<string, any>;
}

// ✅ FIX 1: Cập nhật Interface props
interface EmployeeFormProps {
    initialData?: any;
    // Thêm callback onSuccess để đóng Dialog bên ngoài
    onSuccess?: () => void;
    // Tạm thời để optional (?) để tránh lỗi TS nếu chưa truyền, 
    // nhưng bạn cần truyền options từ Parent Component để Dropdown có dữ liệu.
    options?: {
        departments: DictionaryOption[];
        positions: DictionaryOption[];
        genders: DictionaryOption[];
        statuses: DictionaryOption[];
        contractTypes: DictionaryOption[];
        maritalStatuses: DictionaryOption[];
    };
}

export default function EmployeeForm({ initialData, options, onSuccess }: EmployeeFormProps) {
    const router = useRouter();

    const [state, formAction] = useActionState(
        async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
            if (initialData?.id) {
                return await updateEmployee(initialData.id, prevState, formData) as ActionState;
            }
            return await createEmployee(prevState, formData) as ActionState;
        },
        {
            success: false,
            message: "",
            error: "",
            fields: initialData || {}
        } as ActionState
    );

    const [avatarUrl, setAvatarUrl] = useState<string>(
        initialData?.user_profiles?.avatar_url || initialData?.avatar_url || ""
    );

    const [salaryDisplay, setSalaryDisplay] = useState<string>(
        initialData?.basic_salary ? formatCurrency(initialData.basic_salary) : ""
    );

    // ✅ FIX 2: Tự động gọi onSuccess khi thành công
    useEffect(() => {
        if (state?.success) {
            // Nếu có hàm onSuccess (ví dụ: đóng Modal), hãy gọi nó
            if (onSuccess) {
                // Có thể thêm delay nhỏ nếu muốn người dùng kịp nhìn thấy thông báo
                onSuccess();
            } else {
                // Nếu không có onSuccess (dùng ở trang riêng), scroll lên đầu để hiện thông báo
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else if (state?.error) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [state, onSuccess]);

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, "");
        if (!rawValue) {
            setSalaryDisplay("");
            return;
        }
        setSalaryDisplay(formatCurrency(Number(rawValue)));
    };

    // --- GIAO DIỆN THÀNH CÔNG (Chỉ hiện khi KHÔNG có onSuccess - tức là không nằm trong Modal) ---
    if (state?.success && !initialData && !onSuccess) {
        return (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border animate-in fade-in zoom-in">
                <div className="text-green-500 text-6xl mb-4">✓</div>
                <h3 className="text-2xl font-bold text-gray-800">Tạo hồ sơ thành công!</h3>
                <p className="text-gray-600 mt-2 mb-6">Nhân viên mới đã được thêm vào hệ thống.</p>
                <div className="flex justify-center gap-4">
                    <Link href="/hrm/employees" className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
                        Về danh sách
                    </Link>
                    <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        + Thêm người khác
                    </button>
                </div>
            </div>
        );
    }

    // Helper render options an toàn
    const safeOptions = (list: DictionaryOption[] | undefined) => list || [];
    const getFieldValue = (fieldName: string) => state.fields?.[fieldName] || "";

    return (
        <form action={formAction} className="space-y-8 animate-in fade-in duration-500">
            {/* Thông báo lỗi */}
            {(state?.error) && (
                <div className="p-4 rounded border flex items-center bg-red-50 text-red-700 border-red-200">
                    <span className="mr-2 text-xl">⚠️</span>
                    {state.error}
                </div>
            )}
            {/* Thông báo thành công (nếu trong Modal thì có thể hiển thị trước khi đóng) */}
            {state?.success && onSuccess && (
                <div className="p-4 rounded border flex items-center bg-green-50 text-green-700 border-green-200">
                    <span className="mr-2 text-xl">✓</span>
                    {state.message || "Lưu thành công!"}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* --- CỘT TRÁI: UPLOAD ẢNH --- */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 flex flex-col items-center">
                        <label className="block text-sm font-semibold text-gray-700 mb-4">Ảnh hồ sơ</label>

                        <AvatarUpload
                            defaultValue={avatarUrl}
                            onUploadSuccess={(url) => setAvatarUrl(url)}
                        />

                        {/* Input ẩn chứa URL ảnh */}
                        <input type="hidden" name="avatar_url" value={avatarUrl} />

                        <p className="text-xs text-gray-400 mt-4 text-center">
                            Ảnh sẽ được lưu khi bạn nhấn nút Lưu.
                        </p>
                    </div>
                </div>

                {/* --- CỘT PHẢI: FORM NHẬP LIỆU --- */}
                <div className="lg:col-span-3 space-y-8">
                    {/* 1. THÔNG TIN ĐỊNH DANH */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. Thông tin định danh</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Mã nhân viên</label>
                                <input
                                    name="code"
                                    defaultValue={getFieldValue("code")}
                                    readOnly
                                    placeholder="Tự động sinh mã"
                                    className="w-full border rounded-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                <input name="name" defaultValue={getFieldValue("name")} required className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                                <input type="date" name="birth_date" defaultValue={getFieldValue("birth_date")?.split('T')[0]} className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Giới tính</label>
                                <select name="gender_id" defaultValue={getFieldValue("gender_id")} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn giới tính --</option>
                                    {safeOptions(options?.genders).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">CCCD / CMND</label>
                                <input name="identity_card" defaultValue={getFieldValue("identity_card")} placeholder="Số thẻ căn cước" className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Tình trạng hôn nhân</label>
                                <select name="marital_status_id" defaultValue={getFieldValue("marital_status_id")} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn tình trạng --</option>
                                    {safeOptions(options?.maritalStatuses).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. CÔNG VIỆC & HỢP ĐỒNG */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">2. Công việc & Hợp đồng</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Phòng ban</label>
                                <select name="department_id" defaultValue={getFieldValue("department_id")} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn phòng ban --</option>
                                    {safeOptions(options?.departments).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Chức vụ</label>
                                <select name="position_id" defaultValue={getFieldValue("position_id")} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn chức vụ --</option>
                                    {safeOptions(options?.positions).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Loại hợp đồng</label>
                                <select name="contract_type_id" defaultValue={getFieldValue("contract_type_id")} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn loại HĐ --</option>
                                    {safeOptions(options?.contractTypes).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Ngày vào làm <span className="text-red-500">*</span></label>
                                <input type="date" name="hire_date" required defaultValue={getFieldValue("hire_date")?.split('T')[0] || new Date().toISOString().split('T')[0]} className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Trạng thái làm việc</label>
                                <select name="status_id" defaultValue={getFieldValue("status_id")} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn trạng thái --</option>
                                    {safeOptions(options?.statuses).map(opt => (
                                        <option key={opt.id} value={opt.id} style={{ color: opt.color || 'inherit' }}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Lương cơ bản (VNĐ)</label>
                                <input type="text" value={salaryDisplay} onChange={handleSalaryChange} className="w-full border rounded-md p-2 font-mono text-right font-medium text-gray-700" />
                                <input type="hidden" name="basic_salary" value={salaryDisplay.replace(/[^0-9]/g, "")} />
                            </div>
                        </div>
                    </div>

                    {/* 3. THÔNG TIN LIÊN HỆ */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">3. Thông tin liên hệ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Email liên hệ</label>
                                <input type="email" name="email" defaultValue={getFieldValue("email")} className="w-full border rounded-md p-2" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                                <input name="phone" defaultValue={getFieldValue("phone")} className="w-full border rounded-md p-2" />
                            </div>
                            <div className="form-group md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Địa chỉ thường trú</label>
                                <input name="address" defaultValue={getFieldValue("address")} className="w-full border rounded-md p-2" />
                            </div>
                        </div>
                    </div>

                    {/* FOOTER ACTION */}
                    <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t shadow-lg rounded-b-lg z-10">
                        {onSuccess ? (
                            <button
                                type="button"
                                onClick={onSuccess} // Nút Hủy đóng modal
                                className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                        ) : (
                            <Link href="/hrm/employees" className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                                Hủy bỏ
                            </Link>
                        )}
                        <SubmitButton>{initialData ? "Cập nhật hồ sơ" : "Lưu hồ sơ nhân viên"}</SubmitButton>
                    </div>
                </div>
            </div>
        </form>
    );
}