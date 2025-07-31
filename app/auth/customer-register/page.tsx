'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpUserAndHandleRedirect } from '@/lib/auth';
import { checkEmailExists } from '@/app/actions/user';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // State for the main password field
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State for the confirm password field

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (password !== confirmPassword) {
            setLoading(false);
            setError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
            return;
        }

        const normalizedName = name.trim();

        // --- BƯỚC 1: KIỂM TRA EMAIL TỒN TẠI TRƯỚC ---
        const emailCheckResult = await checkEmailExists(email, 'customer');

        if (emailCheckResult.exists) {
            setLoading(false);
            setError(`Email này đã được đăng ký tài khoản ${emailCheckResult.role ? `với vai trò ${emailCheckResult.role}` : ''}. Nếu bạn quên mật khẩu, hãy sử dụng chức năng "Quên mật khẩu" để đặt lại.`);
            return;
        }
        // --- KẾT THÚC BƯỚC 1 ---

        // --- BƯỚC 2: NẾU EMAIL CHƯA TỒN TẠI VÀ MẬT KHẨU KHỚP, TIẾP TỤC ĐĂNG KÝ SUPABASE ---
        const result = await signUpUserAndHandleRedirect({ email, password, name: normalizedName, role: 'customer' });

        setLoading(false);

        if (!result.success) {
            setError(result.message || 'Đã xảy ra lỗi không xác định.');
        } else if (result.redirectToOnboarding) {
            router.push('/customer-onboarding');
        } else if (result.message) {
            setError(result.message);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                {/* Logo và Thông tin Công ty */}
                <div className="mb-6 text-center">
                    <Image
                        src="/images/logo.png"
                        alt="KieuGia Construction Logo"
                        width={120}
                        height={120}
                        className="mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-3xl font-bold text-gray-900">KieuGia Construction</h1>
                    <p className="mt-2 text-gray-600">Quản lý xây dựng chuyên nghiệp</p>
                </div>

                <h2 className="mb-6 text-center text-2xl font-bold">Đăng ký tài khoản khách hàng</h2>
                <form onSubmit={handleEmailSignUp}>
                    {/* 1. Họ tên */}
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="name">
                            Họ tên
                        </label>
                        <input
                            type="text"
                            id="name"
                            className="w-full rounded border px-3 py-2 leading-tight text-gray-700 focus:border-blue-500 focus:outline-none"
                            placeholder="Nhập họ tên của bạn"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* 2. Email */}
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="w-full rounded border px-3 py-2 leading-tight text-gray-700 focus:border-blue-500 focus:outline-none"
                            placeholder="Nhập email của bạn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* 3. Mật khẩu */}
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="password">
                            Mật khẩu
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                className="w-full rounded border px-3 py-2 leading-tight text-gray-700 focus:border-blue-500 focus:outline-none pr-10"
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-600"
                            >
                                {showPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
                    </div>

                    {/* 4. Xác nhận mật khẩu */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="confirm-password">
                            Xác nhận mật khẩu
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'} // Use showConfirmPassword state
                                id="confirm-password"
                                className="w-full rounded border px-3 py-2 leading-tight text-gray-700 focus:border-blue-500 focus:outline-none pr-10" // Add pr-10 for button space
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)} // Toggle showConfirmPassword state
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-600"
                            >
                                {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
                    </div>

                    {error && <p className="mb-4 text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none focus:shadow-outline"
                        disabled={loading}
                    >
                        {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                    </button>
                </form>

                {/* Liên kết Quên mật khẩu */}
                <div className="mt-4 text-center">
                    <Link href="/auth/forgot-password" className="inline-block align-baseline text-sm text-blue-500 hover:text-blue-800">
                        Quên mật khẩu?
                    </Link>
                </div>
            </div>
        </div>
    );
}