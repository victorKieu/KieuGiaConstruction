"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { BiometricAuth } from "./biometric-auth";
import { toast } from "sonner";

export function LoginForm({ isMobile }: { isMobile: boolean }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

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
        setErrorMessage(null);

        if (!validateEmail(email)) {
            setErrorMessage("Email không đúng định dạng.");
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

            if (rememberMe) {
                localStorage.setItem("biometric_auth_email", email);
            } else {
                localStorage.removeItem("biometric_auth_email");
            }

            toast.success("Đăng nhập thành công!");

            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 500);

        } catch (error: any) {
            console.error("Login Error:", error);

            let message = "Đăng nhập không thành công. Vui lòng thử lại.";
            const rawMsg = error.message || error.toString();

            if (rawMsg.includes("Invalid login credentials")) {
                message = "Email hoặc mật khẩu không chính xác.";
            } else if (rawMsg.includes("Email not confirmed")) {
                message = "Email chưa được xác thực. Vui lòng kiểm tra hộp thư đến.";
            } else if (rawMsg.includes("Too many requests")) {
                message = "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau giây lát.";
            }

            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricSuccess = () => {
        toast.success("Xác thực sinh trắc học thành công!");
        router.push("/dashboard");
    };

    return (
        <div className="space-y-6">
            {/* Hiển thị lỗi */}
            {errorMessage && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md animate-in fade-in slide-in-from-top-1 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input Email */}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        // ✅ FIX: Đổi bg-white thành bg-background
                        className="bg-background"
                    />
                </div>

                {/* Input Password */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            autoComplete="current-password"
                            // ✅ FIX: Đổi bg-white thành bg-background
                            className="pr-10 bg-background"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300"
                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Checkbox Remember Me */}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(!!checked)}
                    />
                    <Label htmlFor="remember" className="font-normal cursor-pointer">
                        Ghi nhớ đăng nhập
                    </Label>
                </div>

                {/* Nút Submit */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Đăng nhập
                </Button>
            </form>

            {/* Biometric cho Mobile */}
            {isMobile && (
                <div className="pt-2 border-t mt-4 border-border">
                    <BiometricAuth email={email} onSuccess={handleBiometricSuccess} />
                </div>
            )}
        </div>
    );
}