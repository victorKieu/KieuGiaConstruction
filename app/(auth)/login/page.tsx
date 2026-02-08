// src/app/(auth)/login/page.tsx
import { Suspense } from "react";
import { headers } from "next/headers";
import { AuthProvider } from '@/lib/auth/auth-context';
import { LoginForm } from "@/components/auth/login-form";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function isMobileUserAgent(userAgent: string | undefined) {
    if (!userAgent) return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export default async function LoginPage() {
    const userAgent = (await headers()).get("user-agent") || "";
    const isMobile = isMobileUserAgent(userAgent);

    return (
        <div className="w-full min-h-screen grid lg:grid-cols-2">

            {/* CỘT TRÁI - Form đăng nhập */}
            {/* ✅ FIX: Đổi bg-white thành bg-background để tự động chuyển đen khi Dark Mode */}
            <div className="flex flex-col items-center justify-center p-8 bg-background transition-colors duration-300">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo & Header */}
                    <div className="flex flex-col items-center text-center">
                        <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4">
                            <Image
                                src="/images/logo.png"
                                alt="Kieu Gia Construction Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        {/* ✅ FIX: text-slate-900 -> text-foreground (Chữ tự động đổi màu) */}
                        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                            Kieu Gia Construction
                        </h1>
                        <p className="text-base text-muted-foreground mt-2 font-medium">
                            Đăng Nhập Hệ Thống
                        </p>
                    </div>

                    {/* Form Logic */}
                    <AuthProvider>
                        <Suspense
                            fallback={
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            }
                        >
                            <LoginForm isMobile={isMobile} />
                        </Suspense>
                    </AuthProvider>
                </div>
            </div>

            {/* CỘT PHẢI - Thông tin công ty (Giữ nguyên nền tối Branding) */}
            <div className="hidden lg:flex flex-col justify-center px-16 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl font-bold mb-6 tracking-tight leading-tight">
                        Kieu Gia Construction
                    </h2>
                    <p className="text-lg text-slate-300 mb-12 leading-relaxed">
                        Hệ thống quản lý toàn diện cho công ty xây dựng hàng đầu Việt Nam. Tối ưu hóa quy trình, nâng cao hiệu suất.
                    </p>

                    <div className="space-y-8">
                        <div className="border-l-4 border-orange-500 pl-6">
                            <h3 className="text-xl font-bold mb-2 text-white">Tầm nhìn</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Trở thành công ty tư vấn và xây dựng hàng đầu tại Việt Nam, nổi bật với chất lượng công trình và dịch vụ khách hàng xuất sắc.
                            </p>
                        </div>

                        <div className="border-l-4 border-blue-500 pl-6">
                            <h3 className="text-xl font-bold mb-2 text-white">Sứ mệnh</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Đem đến giải pháp xây dựng tối ưu, an toàn và bền vững cho khách hàng, góp phần phát triển hạ tầng và đô thị Việt Nam.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 left-16 text-slate-500 text-sm">
                    © 2025 Kieu Gia Construction. All rights reserved.
                </div>
            </div>
        </div>
    );
}