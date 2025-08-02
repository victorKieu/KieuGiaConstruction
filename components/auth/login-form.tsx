"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { BiometricAuth } from "./biometric-auth";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

export function LoginForm({ isMobile }: { isMobile: boolean }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const { signIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const savedEmail = localStorage.getItem("biometric_auth_email");
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");

        // Kiểm tra client-side trước khi gọi API
        if (!validateEmail(email)) {
            setErrorMessage("Email không hợp lệ.");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setErrorMessage("Mật khẩu phải từ 6 ký tự trở lên.");
            setIsLoading(false);
            return;
        }

        try {
            await signIn(email, password);

            // Lưu email nếu chọn rememberMe
            if (rememberMe) {
                localStorage.setItem("biometric_auth_email", email);
            } else {
                localStorage.removeItem("biometric_auth_email");
            }

            // Đợi cookie được sync rồi redirect
            setTimeout(() => {
                router.push("/dashboard");
            }, 500);
        } catch (error: any) {
            console.error("Lỗi đăng nhập:", error.message);
            setErrorMessage(error.message || "Đăng nhập không thành công.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricSuccess = () => {
        router.push("/dashboard");
    };

    return (
        <div className="space-y-6">
            {errorMessage && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                            Quên mật khẩu?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(!!checked)}
                    />
                    <Label htmlFor="remember">Ghi nhớ đăng nhập</Label>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                    Đăng nhập
                </Button>
            </form>

            {isMobile && (
                <div>
                    <BiometricAuth email={email} onSuccess={handleBiometricSuccess} />
                </div>
            )}
        </div>
    );
}