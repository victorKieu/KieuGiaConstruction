"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee, updateEmployee } from "@/lib/action/employeeActions";
import AvatarUpload from "./AvatarUpload";

interface EmployeeFormProps {
    initialData?: any;
    options: {
        departments: any[];
        positions: any[];
        genders: any[];
        maritalStatuses: any[];
    };
}

export default function EmployeeForm({ initialData, options }: EmployeeFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");

    async function action(formData: FormData) {
        setLoading(true);
        const rawData = Object.fromEntries(formData.entries());

        // Gắn avatar_url vào payload
        const payload = { ...rawData, avatar_url: avatarUrl };

        const res = initialData
            ? await updateEmployee(initialData.id, payload as any)
            : await createEmployee(payload as any);

        if (res.success) {
            router.push("/hrm/employees");
            router.refresh();
        } else {
            alert(res.error);
            setLoading(false);
        }
    }

    return (
        <form action={action} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Phần bên trái: Ảnh đại diện */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-4 text-center lg:text-left">
                            Ảnh chân dung
                        </label>
                        <AvatarUpload
                            defaultValue={initialData?.avatar_url}
                            onUploadSuccess={(url) => setAvatarUrl(url)}
                        />
                    </div>
                </div>

                {/* Phần bên phải: Thông tin chi tiết */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Mã nhân viên *</label>
                            <input name="code" defaultValue={initialData?.code} required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Họ và tên *</label>
                            <input name="name" defaultValue={initialData?.name} required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                        {/* ... Thêm các trường Phone, Email, Address tương tự ... */}
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2.5 rounded-lg border font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                        >
                            {loading ? "Đang lưu..." : "Lưu hồ sơ"}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}