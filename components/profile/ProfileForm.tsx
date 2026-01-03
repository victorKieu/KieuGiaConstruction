"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/action/employeeActions";
import { DictionaryOption, EmployeeFormData } from "@/types/employee";
import { SubmitButton } from "@/components/ui/submit-button";
import { createBrowserClient } from "@supabase/ssr";

interface ProfileFormProps {
    initialData: any;
    options: {
        departments: DictionaryOption[];
        positions: DictionaryOption[];
        genders: DictionaryOption[];
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

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfileForm({ initialData, options }: ProfileFormProps) {
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);

    /**
     * ✅ KHẮC PHỤC LỖI TRIỆT ĐỂ:
     * Sử dụng Optional Chaining (?.) để nếu initialData là undefined thì gán null thay vì báo lỗi.
     */
    const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.avatar_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cập nhật lại state nếu initialData thay đổi (ví dụ khi server re-validate data)
    useEffect(() => {
        if (initialData?.avatar_url) {
            setAvatarUrl(initialData.avatar_url);
        }
    }, [initialData]);

    const [state, formAction] = useActionState(async (prevState: ActionState, formData: FormData) => {
        // Kiểm tra an toàn trước khi xử lý logic Server Action
        if (!initialData?.id) {
            return { success: false, error: "Dữ liệu không hợp lệ. Vui lòng tải lại trang." };
        }

        const rawData: EmployeeFormData = {
            code: initialData.code,
            name: initialData.name,
            hire_date: initialData.hire_date,
            basic_salary: initialData.basic_salary,
            department_id: initialData.department_id,
            position_id: initialData.position_id,
            contract_type_id: initialData.contract_type_id,
            status_id: initialData.status_id,

            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            address: formData.get("address") as string,
            identity_card: formData.get("identity_card") as string,
            gender_id: formData.get("gender_id") as string,
            marital_status_id: formData.get("marital_status_id") as string,
            birth_date: formData.get("birth_date") as string,
            avatar_url: formData.get("avatar_url") as string,
        };

        const result = await updateEmployee(initialData.id, rawData);
        if (result.success) {
            router.refresh();
        }
        return { success: result.success, message: result.message, error: result.error };
    }, initialState);

    // 🛑 CHẶN LỖI RENDER: Nếu không có initialData, trả về thông báo thay vì crash trang
    if (!initialData) {
        return (
            <div className="p-10 text-center bg-gray-50 border rounded-lg text-gray-500">
                Đang tải dữ liệu hồ sơ nhân viên...
            </div>
        );
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setAvatarUrl(urlData.publicUrl);
        } catch (error: any) {
            alert('Lỗi upload: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        return dateString.split('T')[0];
    };

    return (
        <form action={formAction} className="space-y-8">
            {state.success && <div className="bg-green-50 text-green-700 p-4 rounded border border-green-200">✓ {state.message}</div>}
            {state.error && <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200">⚠️ {state.error}</div>}

            <input type="hidden" name="avatar_url" value={avatarUrl || ""} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <div
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                className={`w-full h-full rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white shadow-sm overflow-hidden cursor-pointer transition-opacity ${isUploading ? 'opacity-50' : ''} ${avatarUrl ? 'bg-transparent' : 'bg-blue-100 text-blue-600'}`}
                            >
                                {isUploading ? "..." : avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    initialData.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            {!isUploading && (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow border border-gray-200 text-gray-600 hover:text-blue-600">
                                    📷
                                </button>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-800">{initialData.name}</h3>
                        <p className="text-sm text-gray-500">{initialData.code}</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm text-sm">
                        <h4 className="font-semibold text-gray-800 border-b pb-2 mb-3 uppercase">Công việc</h4>
                        <div className="space-y-3">
                            <div><span className="text-gray-500 text-xs">Phòng ban</span><div className="font-medium">{options.departments.find(d => d.id === initialData.department_id)?.name || "-"}</div></div>
                            <div><span className="text-gray-500 text-xs">Chức vụ</span><div className="font-medium">{options.positions.find(p => p.id === initialData.position_id)?.name || "-"}</div></div>
                            <div><span className="text-gray-500 text-xs">Ngày vào</span><div className="font-medium">{formatDate(initialData.hire_date)}</div></div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Thông tin cá nhân</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Họ và tên</label>
                            <input className="w-full border rounded-md p-2 bg-gray-100 cursor-not-allowed" defaultValue={initialData.name} disabled />
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                            <input type="date" name="birth_date" defaultValue={formatDate(initialData.birth_date)} className="w-full border rounded-md p-2" />
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Giới tính</label>
                            <select name="gender_id" defaultValue={initialData.gender_id || ""} className="w-full border rounded-md p-2">
                                <option value="">-- Chọn --</option>
                                {options.genders.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Hôn nhân</label>
                            <select name="marital_status_id" defaultValue={initialData.marital_status_id || ""} className="w-full border rounded-md p-2">
                                <option value="">-- Chọn --</option>
                                {options.maritalStatuses?.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                            </select>
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" name="email" defaultValue={initialData.email} className="w-full border rounded-md p-2" />
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                            <input name="address" defaultValue={initialData.address} className="w-full border rounded-md p-2" />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <SubmitButton disabled={isUploading}>Lưu hồ sơ</SubmitButton>
                    </div>
                </div>
            </div>
        </form>
    );
}