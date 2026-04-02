"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/utils";
import { DictionaryOption } from "@/types/employee";
import { createEmployee, updateEmployee } from "@/lib/action/employeeActions";
import AvatarUpload from "./AvatarUpload";

export interface ActionState {
    success: boolean;
    message?: string;
    error?: string;
    fields?: Record<string, any>;
}

interface EmployeeFormProps {
    initialData?: any;
    onSuccess?: () => void;
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
    const formRef = useRef<HTMLFormElement>(null);

    // 1. Dùng State truyền thống
    const [state, setState] = useState<ActionState>({
        success: false,
        message: "",
        error: "",
        fields: initialData || {}
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [avatarUrl, setAvatarUrl] = useState<string>(
        initialData?.user_profiles?.avatar_url || initialData?.avatar_url || ""
    );

    const [salaryDisplay, setSalaryDisplay] = useState<string>(
        initialData?.basic_salary ? formatCurrency(initialData.basic_salary) : ""
    );

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, "");
        if (!rawValue) {
            setSalaryDisplay("");
            return;
        }
        setSalaryDisplay(formatCurrency(Number(rawValue)));
    };

    // 3. HÀM SUBMIT CHUẨN XÁC VÀ BẤT TỬ
    const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();

        // Đảm bảo Form đã được render
        if (!formRef.current) return;

        // Ép trình duyệt tự động kiểm tra các ô 'required' (Bắt buộc nhập)
        if (!formRef.current.checkValidity()) {
            formRef.current.reportValidity();
            return;
        }

        setIsSubmitting(true);
        setState({ ...state, error: "", success: false }); // Xóa thông báo cũ

        const formData = new FormData(formRef.current);
        formData.append("avatar_url", avatarUrl); // Bơm ảnh vào

        try {
            let result;
            if (initialData?.id) {
                result = await updateEmployee(initialData.id, state, formData);
            } else {
                result = await createEmployee(state, formData);
            }

            // Cập nhật state để hiện bảng Popup thông báo
            setState({
                success: result.success,
                message: result.message,
                error: result.error,
                fields: result.fields
            });

        } catch (err: any) {
            setState({ success: false, error: err.message || "Lỗi hệ thống" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const safeOptions = (list: DictionaryOption[] | undefined) => list || [];
    const getFieldValue = (fieldName: string) => state.fields?.[fieldName] || "";

    return (
        <>
            {/* THẺ FORM CHÍNH */}
            <form
                ref={formRef}
                className="space-y-8 animate-in fade-in duration-500"
            >
                {/* Thông báo lỗi */}
                {(state?.error) && (
                    <div className="p-4 rounded border flex items-center bg-red-50 text-red-700 border-red-200">
                        <span className="mr-2 text-xl">⚠️</span>
                        {state.error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* --- CỘT TRÁI: UPLOAD ẢNH --- */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 flex flex-col items-center">
                            <label className="block text-sm font-semibold text-gray-700 mb-4">Ảnh hồ sơ</label>
                            <AvatarUpload defaultValue={avatarUrl} onUploadSuccess={(url) => setAvatarUrl(url)} />
                            <p className="text-xs text-gray-400 mt-4 text-center">Ảnh sẽ được lưu khi bạn nhấn nút Lưu.</p>
                        </div>
                    </div>

                    {/* --- CỘT PHẢI: FORM NHẬP LIỆU --- */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* 1. THÔNG TIN ĐỊNH DANH */}
                        <div className="bg-white p-6 rounded-lg border shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. Thông định danh</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Mã nhân viên</label>
                                    <input name="code" defaultValue={getFieldValue("code")} readOnly placeholder="Tự động sinh mã" className="w-full border rounded-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                    <input name="name" defaultValue={getFieldValue("name")} required className="w-full border rounded-md p-2" />
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
                                    <input name="identity_card" defaultValue={getFieldValue("identity_card")} className="w-full border rounded-md p-2" />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Ngày cấp CCCD</label>
                                    <input type="date" name="identity_date" defaultValue={getFieldValue("identity_date")?.split('T')[0]} className="w-full border rounded-md p-2" />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Nơi cấp CCCD</label>
                                    <input name="identity_place" defaultValue={getFieldValue("identity_place")} className="w-full border rounded-md p-2" />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Nơi sinh</label>
                                    <input name="place_of_birth" defaultValue={getFieldValue("place_of_birth")} className="w-full border rounded-md p-2" />
                                </div>
                                <div className="form-group md:col-span-2">
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
                                    <input type="text" value={salaryDisplay} onChange={handleSalaryChange} className="w-full border rounded-md p-2 font-mono text-right" />
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
                                <div className="form-group md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Nơi ở hiện tại</label>
                                    <input name="current_address" defaultValue={getFieldValue("current_address")} className="w-full border rounded-md p-2" />
                                </div>
                            </div>
                        </div>

                        {/* 4. THUẾ & THANH TOÁN */}
                        <div className="bg-white p-6 rounded-lg border shadow-sm mt-8">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">4. Thuế & Ngân hàng</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Mã số thuế cá nhân</label>
                                    <input name="tax_code" defaultValue={getFieldValue("tax_code")} className="w-full border rounded-md p-2" />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Tên Ngân hàng</label>
                                    <input name="bank_name" defaultValue={getFieldValue("bank_name")} className="w-full border rounded-md p-2" />
                                </div>
                                <div className="form-group md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Số tài khoản</label>
                                    <input name="bank_account" defaultValue={getFieldValue("bank_account")} className="w-full border rounded-md p-2 font-mono" />
                                </div>
                            </div>
                        </div>

                        {/* 5. FOOTER ACTION */}
                        <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t shadow-lg rounded-b-lg z-10">
                            {onSuccess ? (
                                <button type="button" onClick={onSuccess} className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                                    Hủy bỏ
                                </button>
                            ) : (
                                <Link href="/hrm/employees" className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                                    Hủy bỏ
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? "⏳ Đang xử lý..." : (initialData ? "Cập nhật hồ sơ" : "Lưu hồ sơ nhân viên")}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* POPUP THÔNG BÁO XUẤT HIỆN KHI THÀNH CÔNG */}
            {state?.success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-200 text-center">

                        {/* Icon Check Xanh */}
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {initialData ? "Cập nhật thành công!" : "Tạo mới thành công!"}
                        </h3>
                        <p className="text-gray-500 mb-8">
                            {state.message || "Dữ liệu hồ sơ nhân viên đã được lưu an toàn vào hệ thống."}
                        </p>

                        {/* Nút hành động của Popup */}
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            {onSuccess ? (
                                // Nút này dùng khi Form được mở trong dạng Modal/Dialog
                                <button
                                    type="button"
                                    onClick={onSuccess}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Đóng & Hoàn tất
                                </button>
                            ) : (
                                // Các nút này dùng khi Form được mở ở trang web độc lập
                                <>
                                    {!initialData && (
                                        <button
                                            type="button"
                                            onClick={() => window.location.reload()}
                                            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Thêm người khác
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => router.push("/hrm/employees")}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Về danh sách
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}