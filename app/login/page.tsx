// Không cần "use client" vì đây là server component
import { Suspense } from "react";
import { headers } from "next/headers"; // Import headers từ next/headers
import { AuthProvider } from '@/lib/auth/auth-context';
import { LoginForm } from "@/components/auth/login-form";
import { Loader2 } from "lucide-react";
import Image from "next/image";

// Hàm nhận diện mobile từ user-agent
function isMobileUserAgent(userAgent: string | undefined) {
    if (!userAgent) return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export default async function LoginPage() {
    // Lấy user-agent từ headers phía server
    const userAgent = (await headers()).get("user-agent") || "";
    const isMobile = isMobileUserAgent(userAgent);

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Phần bên trái - Form đăng nhập */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-md">
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-32 h-32 md:w-48 md:h-48 mb-6">
                            <Image src="/images/logo.png" alt="Kieu Gia Construction Logo" fill className="object-contain" priority />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-center">Kieu Gia Construction</h1>
                        <p className="text-lg md:text-xl text-gray-600 mt-2">Đăng Nhập Hệ Thống</p>
                    </div>

                    <AuthProvider>
                        <Suspense
                            fallback={
                                <div className="flex justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            }
                        >
                            <LoginForm isMobile={isMobile} />
                        </Suspense>
                    </AuthProvider>
                </div>
            </div>

            {/* Phần bên phải - Thông tin công ty */}
            <div className="hidden md:flex md:w-1/2 bg-gray-800 text-white p-12 flex-col justify-center">
                <div className="max-w-lg">
                    <h2 className="text-4xl font-bold mb-6">Kieu Gia Construction</h2>
                    <p className="text-xl mb-12">Hệ thống quản lý toàn diện cho công ty xây dựng hàng đầu Việt Nam</p>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-semibold mb-3">Tầm nhìn:</h3>
                            <p className="text-gray-300">
                                Trở thành công ty tư vấn và xây dựng hàng đầu tại Việt Nam, nổi bật với chất lượng công trình và dịch vụ khách hàng xuất sắc.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-2xl font-semibold mb-3">Sứ mệnh:</h3>
                            <p className="text-gray-300">
                                Đem đến giải pháp xây dựng tối ưu, an toàn và bền vững cho khách hàng, góp phần phát triển hạ tầng và đô thị Việt Nam.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}