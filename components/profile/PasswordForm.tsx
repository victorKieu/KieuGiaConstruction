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

    // Class dùng chung cho Input
    const inputStyle = "w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors";

    return (
        <form id="password-form" action={clientAction} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 transition-colors">
                Đổi mật khẩu bảo mật
            </h3>

            {message && (
                <div className={`p-3 rounded text-sm border transition-colors ${message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                    : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                    }`}>
                    {message.type === 'success' ? '✓ ' : '⚠️ '} {message.text}
                </div>
            )}

            <div className="space-y-4">
                {/* Mật khẩu cũ - Hàng riêng để nổi bật */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors">Mật khẩu hiện tại</label>
                    <input
                        type="password"
                        name="oldPassword"
                        required
                        className={`md:w-1/2 ${inputStyle}`}
                        placeholder="Nhập mật khẩu đang sử dụng"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors">Mật khẩu mới</label>
                        <input
                            type="password"
                            name="newPassword"
                            required
                            className={inputStyle}
                            placeholder="Tối thiểu 6 ký tự"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors">Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            className={inputStyle}
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