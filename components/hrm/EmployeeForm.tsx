"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/utils"; // Import hàm format có sẵn
import { DictionaryOption } from "@/types/employee";
import { createEmployee, updateEmployee } from "@/lib/action/employeeActions";
import AvatarUpload from "./AvatarUpload";
import { SubmitButton } from "@/components/ui/submit-button";

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
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // State 1: Avatar 
    // Ưu tiên lấy từ user_profiles (nếu đã active) hoặc cột avatar_url phẳng (nếu chưa active)
    const [avatarUrl, setAvatarUrl] = useState<string>(
        initialData?.user_profiles?.avatar_url || initialData?.avatar_url || ""
    );

    // State 2: Hiển thị lương (Format có dấu phân cách)
    const [salaryDisplay, setSalaryDisplay] = useState<string>(
        initialData?.basic_salary ? formatCurrency(initialData.basic_salary) : ""
    );

    // Xử lý khi nhập lương (Format realtime)
    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. Chỉ giữ lại số
        const rawValue = e.target.value.replace(/[^0-9]/g, "");
        if (!rawValue) {
            setSalaryDisplay("");
            return;
        }
        // 2. Format lại thành tiền tệ (VD: 10,000,000)
        setSalaryDisplay(formatCurrency(Number(rawValue)));
    };

    // Xử lý Submit Form
    async function handleSubmit(formData: FormData) {
        setMessage(null);

        // Lấy dữ liệu thô từ Form
        const rawData = Object.fromEntries(formData.entries());

        // Chuẩn bị Payload gửi lên Server Action
        const payload: any = {
            ...rawData,
            avatar_url: avatarUrl, // Gán URL ảnh từ state upload
            // Lưu ý: 'basic_salary' đã được xử lý bởi input type="hidden" bên dưới (chứa số nguyên)
            // nên ta không cần parse lại ở đây, Server Action sẽ nhận được chuỗi số "10000000"
        };

        let result;
        try {
            if (initialData?.id) {
                // Chế độ Cập nhật
                result = await updateEmployee(initialData.id, payload);
            } else {
                // Chế độ Tạo mới
                result = await createEmployee(payload);
            }

            if (result.success) {
                setMessage({ type: 'success', text: result.message || "Thành công!" });
                router.refresh(); // Refresh lại data của page

                // Nếu là tạo mới, scroll lên đầu để thấy thông báo thành công
                if (!initialData) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                setMessage({ type: 'error', text: result.error || "Có lỗi xảy ra." });
            }
        } catch (err) {
            setMessage({ type: 'error', text: "Lỗi kết nối hệ thống." });
        }
    }

    // --- GIAO DIỆN THÀNH CÔNG (KHI TẠO MỚI) ---
    if (message?.type === 'success' && !initialData) {
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
        <form action={handleSubmit} className="space-y-8 animate-in fade-in duration-500">

            {/* Thông báo lỗi/thành công (cho chế độ Edit) */}
            {message && (
                <div className={`p-4 rounded border flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    <span className="mr-2 text-xl">{message.type === 'success' ? '✓' : '⚠️'}</span>
                    {message.text}
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

                {/* --- CỘT PHẢI: FORM NHẬP LIỆU --- */}
                <div className="lg:col-span-3 space-y-8">

                    {/* 1. THÔNG TIN ĐỊNH DANH */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. Thông tin định danh</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Mã nhân viên</label>
                                <div className="relative">
                                    <input
                                        name="code"
                                        defaultValue={initialData?.code}
                                        readOnly
                                        disabled={!initialData} // Chỉ disable khi tạo mới (để hiện Auto Gen)
                                        placeholder="Tự động sinh mã"
                                        className="w-full border rounded-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    />
                                    {!initialData && (
                                        <span className="absolute right-2 top-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">
                                            AUTO GEN
                                        </span>
                                    )}
                                </div>
                                {!initialData && <p className="text-xs text-gray-400 mt-1">Mã sẽ được cấp tự động sau khi lưu.</p>}
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                <input name="name" defaultValue={initialData?.name} required placeholder="VD: Nguyễn Văn A" className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                                <input type="date" name="birth_date" defaultValue={initialData?.birth_date?.split('T')[0]} className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Giới tính</label>
                                <select name="gender_id" defaultValue={initialData?.gender_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn giới tính --</option>
                                    {options?.genders?.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">CCCD / CMND</label>
                                <input name="identity_card" defaultValue={initialData?.identity_card || ""} placeholder="Số thẻ căn cước" className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Tình trạng hôn nhân</label>
                                <select name="marital_status_id" defaultValue={initialData?.marital_status_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn tình trạng --</option>
                                    {options?.maritalStatuses?.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. CÔNG VIỆC */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">2. Công việc & Hợp đồng</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Phòng ban</label>
                                <select name="department_id" defaultValue={initialData?.department_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn phòng ban --</option>
                                    {options?.departments?.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Chức vụ</label>
                                <select name="position_id" defaultValue={initialData?.position_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn chức vụ --</option>
                                    {options?.positions?.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Loại hợp đồng</label>
                                <select name="contract_type_id" defaultValue={initialData?.contract_type_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn loại HĐ --</option>
                                    {options?.contractTypes?.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Ngày vào làm <span className="text-red-500">*</span></label>
                                <input type="date" name="hire_date" required defaultValue={initialData?.hire_date?.split('T')[0] || new Date().toISOString().split('T')[0]} className="w-full border rounded-md p-2" />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Trạng thái làm việc</label>
                                <select name="status_id" defaultValue={initialData?.status_id || ""} className="w-full border rounded-md p-2 bg-white">
                                    <option value="">-- Chọn trạng thái --</option>
                                    {options?.statuses?.map(opt => (
                                        <option key={opt.id} value={opt.id} style={{ color: opt.color || 'inherit' }}>
                                            {opt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Ô NHẬP LƯƠNG ĐÃ ĐƯỢC NÂNG CẤP */}
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Lương cơ bản (VNĐ)</label>

                                {/* Input hiển thị (Có dấu phẩy, dùng để tương tác) */}
                                <input
                                    type="text"
                                    value={salaryDisplay}
                                    onChange={handleSalaryChange}
                                    placeholder="0"
                                    className="w-full border rounded-md p-2 font-mono text-right font-medium text-gray-700"
                                />

                                {/* Input ẩn (Chứa số nguyên, dùng để gửi đi) */}
                                <input
                                    type="hidden"
                                    name="basic_salary"
                                    value={salaryDisplay.replace(/[^0-9]/g, "")}
                                />
                            </div>

                        </div>
                    </div>

                    {/* 3. LIÊN HỆ */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">3. Thông tin liên hệ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Email liên hệ</label>
                                <input type="email" name="email" defaultValue={initialData?.email || ""} placeholder="example@gmail.com" className="w-full border rounded-md p-2" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                                <input name="phone" defaultValue={initialData?.phone || ""} placeholder="09xxxxxxx" className="w-full border rounded-md p-2" />
                            </div>
                            <div className="form-group md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Địa chỉ thường trú</label>
                                <input name="address" defaultValue={initialData?.address || ""} placeholder="Số nhà, đường, phường/xã..." className="w-full border rounded-md p-2" />
                            </div>
                        </div>
                    </div>

                    {/* FOOTER ACTION */}
                    <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t shadow-lg rounded-b-lg z-10">
                        <Link
                            href="/hrm/employees"
                            className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                        >
                            Hủy bỏ
                        </Link>
                        <SubmitButton>
                            {initialData ? "Cập nhật hồ sơ" : "Lưu hồ sơ nhân viên"}
                        </SubmitButton>
                    </div>

                </div>
            </div>
        </form>
    );
}