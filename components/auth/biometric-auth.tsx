//"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import supabase from '@/lib/supabase/client';

interface BiometricAuthProps {
    onSuccess: () => void;
    email: string;
}

export function BiometricAuth({ onSuccess, email }: BiometricAuthProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleBiometricAuth = async () => {
        if (!email) {
            setError("Vui lòng nhập email trước khi sử dụng xác thực sinh trắc học");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Kiểm tra xem trình duyệt có hỗ trợ Web Authentication API không
            if (!window.PublicKeyCredential) {
                setError("Trình duyệt của bạn không hỗ trợ xác thực sinh trắc học");
                setIsLoading(false);
                return;
            }

            // Kiểm tra xem thiết bị có hỗ trợ xác thực sinh trắc học không
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                setError("Thiết bị của bạn không hỗ trợ xác thực sinh trắc học");
                setIsLoading(false);
                return;
            }

            // Tạo challenge ngẫu nhiên
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            // Tạo options cho credential
            const publicKeyCredentialRequestOptions = {
                challenge,
                timeout: 60000,
                userVerification: "required" as UserVerificationRequirement,
                rpId: window.location.hostname,
            };

            // Yêu cầu xác thực
            const credential = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions,
            });

            if (credential) {
                // Xác thực thành công, đăng nhập với Supabase
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password: "biometric-auth-" + Date.now(), // Mật khẩu giả, sẽ được thay thế bằng logic xác thực thực tế
                });

                if (error) {
                    console.error("Lỗi đăng nhập:", error);
                    setError("Xác thực sinh trắc học thất bại. Vui lòng thử lại.");
                } else {
                    onSuccess();
                }
            }
        } catch (err) {
            console.error("Lỗi xác thực sinh trắc học:", err);
            setError("Xác thực sinh trắc học thất bại. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleBiometricAuth}
                disabled={isLoading}
            >
                <Fingerprint className="h-5 w-5" />
                {isLoading ? "Đang xác thực..." : "Đăng nhập bằng sinh trắc học"}
            </Button>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
    );
}