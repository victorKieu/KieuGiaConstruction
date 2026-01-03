"use client";

import { useState } from "react";
import { changePassword } from "@/lib/action/authActions";
import { SubmitButton } from "@/components/ui/submit-button";

export default function PasswordForm() {
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    async function clientAction(formData: FormData) {
        setMessage(null);
        const result = await changePassword(formData);

        if (result.success) {
            setMessage({ type: 'success', text: result.message || "Thành công" });
            (document.getElementById("password-form") as HTMLFormElement).reset();
        } else {
            setMessage({ type: 'error', text: result.error || "Có lỗi xảy ra" });
        }
    }

    return (
        <form id="password-form" action={clientAction} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Đổi mật khẩu bảo mật</h3>

            {message && (
                <div className={`p-3 rounded text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {message.type === 'success' ? '✓ ' : '⚠️ '} {message.text}
                </div>
            )}

            <div className="space-y-4">
                {/* Mật khẩu cũ - Hàng riêng để nổi bật */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Mật khẩu hiện tại   </label>
                    <input
                        type="password"
                        name="oldPassword"
                        required
                        className="w-full md:w-1/2 border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nhập mật khẩu đang sử dụng"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Mật khẩu mới</label>
                        <input
                            type="password"
                            name="newPassword"
                            required
                            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Tối thiểu 6 ký tự"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nhập lại mật khẩu mới"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <SubmitButton>Cập nhật mật khẩu</SubmitButton>
            </div>
        </form>
    );
}