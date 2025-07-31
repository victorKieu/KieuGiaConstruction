'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ConfirmEmailPage() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const router = useRouter();
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        fetch('/api/company-settings')
            .then(res => res.json())
            .then(data => setCompany(data));
    }, []);

    return (
        <div className="max-w-md mx-auto py-10 text-center">
            {/* Logo công ty */}
            {company?.logo_url && (
                <div className="flex justify-center mb-4">
                    <img src={company.logo_url} alt="Company Logo" className="h-32" />
                </div>
            )}
            <h1 className="text-2xl font-bold mb-2">Xác nhận email</h1>
            {/* Thông tin công ty */}
            {company && (
                <div className="text-gray-6000 text-sm mb-4">
                    <div>{company.name}</div>
                    <div>Địa chỉ: {company.address}</div>
                    <div>
                        Hotline: {company.phone} &nbsp;|&nbsp; Email: {company.email}
                    </div>
                </div>
            )}

            <div className="mb-3">
                <p>
                    Đăng ký thành công!<br />
                    Vui lòng kiểm tra hộp thư email <b>{email}</b> của bạn và nhấn vào liên kết xác nhận để kích hoạt tài khoản.
                </p>
                <p className="text-gray-500 mt-1">
                    Nếu bạn không nhận được email, vui lòng kiểm tra mục Spam hoặc thử đăng ký lại.
                </p>
            </div>
            <div className="mb-6 border-t border-gray-200 pt-4">
                <p>
                    <span className="font-semibold">Email confirmation:</span><br />
                    Registration successful! <br />
                    Please check your email inbox <b>{email}</b> and click on the confirmation link to activate your account.<br />
                    If you do not receive the email, please check your Spam folder or try registering again.
                </p>
            </div>

            <button
                className="w-full py-2 mb-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => router.push('/login')}
            >
                Quay về trang đăng nhập / Back to Login
            </button>
        </div>
    );
}