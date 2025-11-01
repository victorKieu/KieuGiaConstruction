"use client"; // Đảm bảo rằng đây là client component

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context"; // Đảm bảo đường dẫn này đúng
import Link from "next/link"; // Sử dụng Link của Next.js

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // --- PHẦN FIX 1: Thêm state cho "Remember Me" ---
    const [rememberMe, setRememberMe] = useState(true); // Mặc định nên là true

    const [formError, setFormError] = useState<string | null>(null);
    const { signIn, isLoading, error } = useAuth(); // Lấy signIn, isLoading, error từ context

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null); // Xóa lỗi cũ

        try {
            // --- PHẦN FIX 2: Truyền `rememberMe` vào hàm signIn ---
            // Chúng ta cần đảm bảo hàm `signIn` trong `auth-context`
            // chấp nhận tham số này.
            await signIn(email, password);

            // Nếu signIn thành công, AuthProvider sẽ tự động chuyển hướng
        } catch (err: any) {
            console.error("Login form submit error:", err.message);
            setFormError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        }
    };

    // Sử dụng error từ AuthProvider nếu có lỗi chung
    const displayError = formError || error;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-8 mt-4 text-left bg-white shadow-lg rounded-lg w-full max-w-md">

                {/* --- PHẦN FIX 3: Thêm Logo Kiều Gia --- */}
                <div className="flex justify-center mb-6">
                    {/* TODO: Thay bằng đường dẫn logo thật */}
                    <img src="/logo-kieugia.png" alt="Kiều Gia Construction" className="h-14" />
                </div>
                <h3 className="text-2xl font-bold text-center text-gray-800">Đăng nhập KMS</h3>

                <form onSubmit={handleSubmit}>
                    <div className="mt-6">
                        <div>
                            <label className="block" htmlFor="email">Email</label>
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block" htmlFor="password">Mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Mật khẩu"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* --- PHẦN FIX 4: Thêm Checkbox và Quên mật khẩu --- */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center">
                                <input
                                    id="remember_me"
                                    name="remember_me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
                                    Ghi nhớ tôi
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link href="/forgot-password">
                                    <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                                        Quên mật khẩu?
                                    </span>
                                </Link>
                            </div>
                        </div>


                        {displayError && (
                            <p className="text-red-600 text-sm mt-4 bg-red-100 p-3 rounded-md border border-red-300">
                                {displayError}
                            </p>
                        )}
                        <div className="flex items-baseline justify-center">
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center px-6 py-3 mt-6 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        {/* SVG Spinner (vòng xoay) */}
                                        <svg
                                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <span>Đăng nhập</span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}