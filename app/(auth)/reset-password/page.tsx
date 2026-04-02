"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client" // Sếp trỏ lại đúng đường dẫn file client Supabase của sếp nhé

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2 } from "lucide-react"

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const router = useRouter()
    const supabase = createClient() // Khởi tạo Supabase client ở phía trình duyệt

    // Tùy chọn: Lắng nghe sự kiện để đảm bảo user đang ở trạng thái RECOVERY
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log("Đã xác nhận phiên đổi mật khẩu");
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase.auth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validate cơ bản
        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự")
            return
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp")
            return
        }

        setLoading(true)

        try {
            // Gọi trực tiếp hàm updateUser của Supabase (Vì user đã được xác thực tạm thời qua link email)
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                throw updateError
            }

            setSuccess(true)

            // Chuyển hướng về trang đăng nhập sau 3 giây
            setTimeout(() => {
                router.push("/login")
            }, 3000)

        } catch (error: any) {
            setError(error.message || "Có lỗi xảy ra khi cập nhật mật khẩu. Vui lòng thử lại link trong email.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Tạo mật khẩu mới</CardTitle>
                    <CardDescription className="text-center">
                        Vui lòng nhập mật khẩu mới cho tài khoản của bạn
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success ? (
                        <div className="text-center space-y-4">
                            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mb-2 mx-auto" />
                                <AlertDescription>
                                    Đổi mật khẩu thành công! Hệ thống sẽ tự động chuyển về trang đăng nhập...
                                </AlertDescription>
                            </Alert>
                            <Button variant="default" className="w-full" onClick={() => router.push("/login")}>
                                Đến trang đăng nhập ngay
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Mật khẩu mới</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <Button type="submit" className="w-full mt-6" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang cập nhật...
                                    </>
                                ) : (
                                    "Cập nhật mật khẩu"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}