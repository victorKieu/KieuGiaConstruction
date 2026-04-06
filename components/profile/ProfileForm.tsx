"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/action/employeeActions";
import { DictionaryOption, EmployeeFormData } from "@/types/employee";
import { SubmitButton } from "@/components/ui/submit-button";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
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
    message: string;
    error: string;
}

const initialState: ActionState = {
    success: false,
    message: "",
    error: ""
};

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfileForm({ initialData, options }: ProfileFormProps) {
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);

    const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.avatar_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData?.avatar_url) {
            setAvatarUrl(initialData.avatar_url);
        }
    }, [initialData]);

    const [state, formAction] = useActionState(async (prevState: ActionState, formData: FormData) => {
        if (!initialData?.id) {
            toast.error("Dữ liệu không hợp lệ. Vui lòng tải lại trang.");
            return {
                success: false,
                message: "",
                error: "Dữ liệu không hợp lệ."
            };
        }

        formData.append("code", initialData.code || "");
        formData.append("name", initialData.name || "");
        if (initialData.hire_date) formData.append("hire_date", initialData.hire_date);
        if (initialData.basic_salary) formData.append("basic_salary", initialData.basic_salary.toString());
        if (initialData.department_id) formData.append("department_id", initialData.department_id);
        if (initialData.position_id) formData.append("position_id", initialData.position_id);
        if (initialData.contract_type_id) formData.append("contract_type_id", initialData.contract_type_id);
        if (initialData.status_id) formData.append("status_id", initialData.status_id);

        // Gọi API
        const result = await updateEmployee(initialData.id, prevState, formData);

        // ✅ BẮN TOAST TRỰC TIẾP Ở ĐÂY (Trước khi refresh)
        if (result.success) {
            toast.success(result.message || "Cập nhật hồ sơ thành công!");
            router.refresh(); // Tải lại data sau khi đã bắn thông báo
        } else {
            toast.error(result.error || "Cập nhật thất bại!");
        }

        return {
            success: result.success,
            message: result.message || "",
            error: result.error || ""
        };
    }, initialState);

    if (!initialData) {
        return (
            <div className="p-10 text-center bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-gray-500 dark:text-slate-400">
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

    // Class dùng chung cho Input & Select
    const inputStyle = "w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors";
    const labelStyle = "block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300 transition-colors";

    return (
        <form action={formAction} className="space-y-8">

            <input type="hidden" name="avatar_url" value={avatarUrl || ""} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-lg border border-gray-100 dark:border-slate-800 text-center transition-colors">
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <div
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                className={`w-full h-full rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-slate-800 shadow-sm overflow-hidden cursor-pointer transition-all ${isUploading ? 'opacity-50' : ''} ${avatarUrl ? 'bg-transparent' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}
                            >
                                {isUploading ? "..." : avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    initialData.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            {!isUploading && (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-2 rounded-full shadow border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    📷
                                </button>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-slate-100">{initialData.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{initialData.code}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm text-sm transition-colors">
                        <h4 className="font-semibold text-gray-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3 uppercase">Công việc</h4>
                        <div className="space-y-3">
                            <div><span className="text-gray-500 dark:text-slate-400 text-xs">Phòng ban</span><div className="font-medium dark:text-slate-200">{options.departments.find(d => d.id === initialData.department_id)?.name || "-"}</div></div>
                            <div><span className="text-gray-500 dark:text-slate-400 text-xs">Chức vụ</span><div className="font-medium dark:text-slate-200">{options.positions.find(p => p.id === initialData.position_id)?.name || "-"}</div></div>
                            <div><span className="text-gray-500 dark:text-slate-400 text-xs">Ngày vào</span><div className="font-medium dark:text-slate-200">{formatDate(initialData.hire_date)}</div></div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 transition-colors">
                        Thông tin cá nhân
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                            <label className={labelStyle}>Họ và tên</label>
                            <input className="w-full border rounded-md p-2 bg-gray-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed transition-colors" defaultValue={initialData.name} disabled />
                        </div>
                        <div className="form-group">
                            <label className={labelStyle}>Ngày sinh</label>
                            <input type="date" name="birth_date" defaultValue={formatDate(initialData.birth_date)} className={inputStyle} />
                        </div>
                        <div className="form-group">
                            <label className={labelStyle}>Giới tính</label>
                            <select name="gender_id" defaultValue={initialData.gender_id || ""} className={inputStyle}>
                                <option value="">-- Chọn --</option>
                                {options.genders.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className={labelStyle}>Hôn nhân</label>
                            <select name="marital_status_id" defaultValue={initialData.marital_status_id || ""} className={inputStyle}>
                                <option value="">-- Chọn --</option>
                                {options.maritalStatuses?.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                            </select>
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className={labelStyle}>Email</label>
                            <input type="email" name="email" defaultValue={initialData.email} className={inputStyle} />
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className={labelStyle}>Địa chỉ</label>
                            <input name="address" defaultValue={initialData.address} className={inputStyle} />
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