"use client";

import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/lib/auth/auth-context'; // Sếp trỏ lại đường dẫn Auth của sếp nếu cần

export default function PushNotificationSetup() {
    const { user } = useAuth();
    const isInitialized = useRef(false); // Tránh bị gọi 2 lần trong React Strict Mode

    useEffect(() => {
        const initOneSignal = async () => {
            if (isInitialized.current) return;
            isInitialized.current = true;

            try {
                // 1. Khởi tạo OneSignal
                await OneSignal.init({
                    appId: "978f37f7-9d77-4f3a-bf57-1a9fcfb3ef8f", // VD: "a1b2c3d4-..."
                    notifyButton: {
                        enable: false // Tắt cái chuông rác màu đỏ hay trôi nổi ở góc màn hình
                    },
                    allowLocalhostAsSecureOrigin: true, // Cho phép test trên localhost
                });

                // 2. Gọi bảng hỏi xin quyền (Nó tự động check, nếu user bấm rồi nó sẽ im lặng luôn)
                await OneSignal.Slidedown.promptPush();

            } catch (error) {
                console.error("Lỗi khởi tạo OneSignal:", error);
            }
        };

        initOneSignal();
    }, []);

    // 3. Đăng nhập OneSignal bằng Auth_ID khi user đã login
    useEffect(() => {
        const linkUserToOneSignal = async () => {
            if (user?.id && OneSignal.initialized) {
                // Khai báo với OneSignal: "Cái điện thoại này là của ông có ID là user.id nhé"
                await OneSignal.login(user.id);
            } else if (!user?.id && OneSignal.initialized) {
                await OneSignal.logout();
            }
        };

        linkUserToOneSignal();
    }, [user]);

    return null; // Component này không hiển thị gì cả, chỉ chạy ngầm
}