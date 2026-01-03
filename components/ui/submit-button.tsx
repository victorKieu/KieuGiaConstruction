"use client";

import { useFormStatus } from "react-dom";
import { ReactNode } from "react";

interface SubmitButtonProps {
    children: ReactNode;
    disabled?: boolean; // ✅ THÊM DÒNG NÀY: Cho phép nhận prop disabled từ bên ngoài
    className?: string; // (Tùy chọn) Để sau này có thể custom style nếu cần
}

export function SubmitButton({ children, disabled, className }: SubmitButtonProps) {
    // useFormStatus dùng để check trạng thái đang submit của Server Action
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            // ✅ Logic mới: Disable khi (Server đang xử lý) HOẶC (Bên ngoài yêu cầu disable - ví dụ đang upload ảnh)
            disabled={pending || disabled}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className || ""}`}
        >
            {pending && (
                // Icon loading xoay tròn (Spinner)
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}