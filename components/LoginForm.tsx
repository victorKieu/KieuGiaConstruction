"use client"; // Đảm bảo rằng đây là client component

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context"; // Đảm bảo đường dẫn này đúng

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const { signIn, isLoading, error } = useAuth(); // Lấy signIn, isLoading, error từ context

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null); // Xóa lỗi cũ

        try {
            await signIn(email, password);
            // Nếu signIn thành công, AuthProvider sẽ tự động chuyển hướng (trong onAuthStateChange)
        } catch (err: any) {
            // Error từ signIn đã được AuthProvider cập nhật vào state.error
            // Tuy nhiên, chúng ta vẫn có thể hiển thị lỗi form cụ thể nếu cần
            console.error("Login form submit error:", err.message);
            setFormError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        }
    };

    // Sử dụng error từ AuthProvider nếu có lỗi chung
    const displayError = formError || error;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg">
                <h3 className="text-2xl font-bold text-center">Đăng nhập</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mt-4">
                        <div>
                            <label className="block" htmlFor="email">Email</label>
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block" htmlFor="password">Password</label>
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {displayError && (
                            <p className="text-red-500 text-sm mt-2">{displayError}</p>
                        )}
                        <div className="flex items-baseline justify-between">
                            <button
                                type="submit"
                                className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900"
                                disabled={isLoading} // Disable nút khi đang loading
                            >
                                {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                            </button>
                            {/* Thêm link hoặc button quên mật khẩu nếu cần */}
                            {/* <a href="#" className="text-sm text-blue-600 hover:underline">Quên mật khẩu?</a> */}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}