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
    fields?: any; // Dùng any ở đây để chấp nhận mọi trường dữ liệu từ Form
}
interface EmployeeFormProps {
    initialData?: any;
    options: {
        departments: DictionaryOption[];
        positions: DictionaryOption[];
        genders: DictionaryOption[];
        statuses: DictionaryOption[];
        contractTypes: DictionaryOption[];
        maritalStatuses: DictionaryOption[];
    };
}

export default function EmployeeForm({ initialData, options }: EmployeeFormProps) {
    const router = useRouter();

    // ✅ Fix hàm Action để tương thích useActionState (Tránh lỗi TS2769)
    const [state, formAction] = useActionState(
        async (prevState: any, formData: FormData) => {
            // Đảm bảo avatarUrl luôn được gửi kèm
            formData.set("avatar_url", avatarUrl);

            if (initialData?.id) {
                return await updateEmployee(initialData.id, prevState, formData);
            }
            return await createEmployee(prevState, formData);
        },
        {
            success: false,
            message: "",
            error: "",
            // ✅ Dữ liệu fields sẽ ưu tiên những gì người dùng vừa nhập khi Server báo lỗi
            fields: initialData || {}
        }
    );

    const [avatarUrl, setAvatarUrl] = useState<string>(
        initialData?.user_profiles?.avatar_url || initialData?.avatar_url || ""
    );

    const [salaryDisplay, setSalaryDisplay] = useState<string>(
        initialData?.basic_salary ? formatCurrency(initialData.basic_salary) : ""
    );

    useEffect(() => {
        if (state?.error) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [state]);

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, "");
        if (!rawValue) {
            setSalaryDisplay("");
            return;
        }
        setSalaryDisplay(formatCurrency(Number(rawValue)));
    };

    // --- GIAO DIỆN THÀNH CÔNG (KHI TẠO MỚI) ---
    if (state?.success && !initialData) {
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

    return (
        <form action={formAction} className="space-y-8 animate-in fade-in duration-500">
            {/* Thông báo lỗi/thành công */}
            {(state?.error || (state?.success && initialData)) && (
                <div className={`p-4 rounded border flex items-center ${state.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <span className="mr-2 text-xl">{state.success ? '✓' : '⚠️'}</span>
                    {state.error || state.message}
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
                        <p className="text-xs text-gray-400 mt-4 text-center">
                            Ảnh sẽ được lưu khi bạn nhấn nút Lưu/Cập nhật.
                        </p>
                    </div>
                </div>

                {/* --- CỘT PHẢI: FORM NHẬP LIỆU (ĐẦY ĐỦ CÁC TRƯỜNG) --- */}
                <div className="lg:col-span-3 space-y-8">
                    {/* 1. THÔNG TIN ĐỊNH DANH */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. Thông tin định danh</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Mã nhân viên</label>
                                <input
                                    name="code"
                                    defaultValue={state.fields?.code}
                                    readOnly
                                    placeholder="Tự động sinh mã"
                                    className="w-full border rounded-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                <input name="name" defaultValue={state.fields?.name} required className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                                <input type="date" name="birth_date" defaultValue={state.fields?.birth_date?.split('T')[0]} className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Giới tính</label>
                                <select name="gender_id" defaultValue={state.fields?.gender_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn giới tính --</option>
                                    {options?.genders?.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">CCCD / CMND</label>
                                <input name="identity_card" defaultValue={state.fields?.identity_card || ""} placeholder="Số thẻ căn cước" className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Tình trạng hôn nhân</label>
                                <select name="marital_status_id" defaultValue={state.fields?.marital_status_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn tình trạng --</option>
                                    {options?.maritalStatuses?.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
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
                                <select name="department_id" defaultValue={state.fields?.department_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn phòng ban --</option>
                                    {options?.departments?.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Chức vụ</label>
                                <select name="position_id" defaultValue={state.fields?.position_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn chức vụ --</option>
                                    {options?.positions?.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Loại hợp đồng</label>
                                <select name="contract_type_id" defaultValue={state.fields?.contract_type_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn loại HĐ --</option>
                                    {options?.contractTypes?.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Ngày vào làm <span className="text-red-500">*</span></label>
                                <input type="date" name="hire_date" required defaultValue={state.fields?.hire_date?.split('T')[0] || new Date().toISOString().split('T')[0]} className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Trạng thái làm việc</label>
                                <select name="status_id" defaultValue={state.fields?.status_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn trạng thái --</option>
                                    {options?.statuses?.map(opt => (
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
                                <input type="email" name="email" defaultValue={state.fields?.email || ""} className="w-full border rounded-md p-2" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                                <input name="phone" defaultValue={state.fields?.phone || ""} className="w-full border rounded-md p-2" />
                            </div>
                            <div className="form-group md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Địa chỉ thường trú</label>
                                <input name="address" defaultValue={state.fields?.address || ""} className="w-full border rounded-md p-2" />
                            </div>
                        </div>
                    </div>

                    {/* FOOTER ACTION */}
                    <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t shadow-lg rounded-b-lg z-10">
                        <Link href="/hrm/employees" className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Hủy bỏ</Link>
                        <SubmitButton>{initialData ? "Cập nhật hồ sơ" : "Lưu hồ sơ nhân viên"}</SubmitButton>
                    </div>
                </div>
            </div>
        </form>
    );
}