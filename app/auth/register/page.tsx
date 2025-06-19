'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail } from '@/lib/auth';
import Link from 'next/link';

// Hàm chuẩn hóa tên người dùng
function normalizeName(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [company, setCompany] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetch('/api/company-settings')
            .then(res => res.json())
            .then(data => setCompany(data));
    }, []);

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu và xác nhận mật khẩu không khớp.');
            return;
        }
        if (!name.trim()) {
            setError('Vui lòng nhập họ và tên.');
            return;
        }

        setLoading(true);

        // Luôn chuẩn hóa tên tại đây!
        const normalizedName = normalizeName(name);
        const { error } = await signUpWithEmail({ email, password, name: normalizedName });
        setLoading(false);

        if (error) {
            setError(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
            return; // Không chuyển trang nếu có lỗi!
        }

        router.push(`/auth/confirm-email?email=${encodeURIComponent(email)}`);
    };

    return (
        <div className="max-w-md mx-auto py-5">
            {company?.logo_url && (
                <div className="flex justify-center mb-4">
                    <img src={company.logo_url} alt="Company Logo" className="h-28" />
                </div>
            )}

            {company && (
                <div className="text-center text-gray-600 text-sm mb-4">
                    <div>{company.name}</div>
                    <div>{company.address}</div>
                    <div>
                        Hotline: {company.hotline} &nbsp;|&nbsp; Email: {company.email}
                    </div>
                </div>
            )}
            <h2 className="text-2xl font-bold mb-2 text-center">Đăng ký khách hàng</h2>

            {/* Nếu bạn có các phương thức OAuth thì thêm tại đây */}
            {/* ... */}

            <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-500">Hoặc đăng ký bằng email</span>
                </div>
            </div>

            <form onSubmit={handleEmailSignUp} className="space-y-4">
                <input
                    type="text"
                    placeholder="Họ và tên"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border px-3 py-2 rounded"
                    required
                    autoComplete="name"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border px-3 py-2 rounded"
                    required
                    autoComplete="email"
                />
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mật khẩu"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full border px-3 py-2 rounded pr-10"
                        required
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(x => !x)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                        {showPassword
                            ? <span role="img" aria-label="Ẩn mật khẩu">🙈</span>
                            : <span role="img" aria-label="Hiện mật khẩu">👁️</span>
                        }
                    </button>
                </div>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Xác nhận mật khẩu"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full border px-3 py-2 rounded pr-10"
                        required
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowConfirmPassword(x => !x)}
                        aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                        {showConfirmPassword
                            ? <span role="img" aria-label="Ẩn mật khẩu">🙈</span>
                            : <span role="img" aria-label="Hiện mật khẩu">👁️</span>
                        }
                    </button>
                </div>
                <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={loading}
                >
                    {loading ? 'Đang xử lý...' : 'Đăng ký'}
                </button>
                {error && (
                    <div className="text-red-600 mt-2">
                        {error}
                        {error.includes('Quên mật khẩu') && (
                            <div className="mt-2">
                                <a
                                    href="/forgot-password"
                                    className="text-blue-600 underline"
                                >
                                    Quên mật khẩu?
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </form>

            <div className="mt-4 text-center text-sm">
                Đã có tài khoản? <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
            </div>
        </div>
    );
}