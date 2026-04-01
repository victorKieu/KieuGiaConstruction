"use client";

import { useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/lib/auth/auth-context'; // Sếp nhớ trỏ đúng file auth của sếp nhé

export default function PushNotificationSetup() {
    const { user } = useAuth();

    // Dùng useRef để tránh init 2 lần do React Strict Mode
    const isInitTriggered = useRef(false);

    // ✅ THÊM DÒNG NÀY: Dùng state để đánh dấu OneSignal đã khởi tạo xong
    const [isSdkReady, setIsSdkReady] = useState(false);

    useEffect(() => {
        const initOneSignal = async () => {
            if (isInitTriggered.current) return;
            isInitTriggered.current = true;

            try {
                // 1. Khởi tạo OneSignal
                await OneSignal.init({
                    appId: "978f37f7-9d77-4f3a-bf57-1a9fcfb3ef8f", // Đừng quên điền mã của sếp lại nhé
                    notifyButton: {
                        enable: false
                    } as any,
                    allowLocalhostAsSecureOrigin: true,
                });

                // ✅ 2. ĐÁNH DẤU SDK ĐÃ SẴN SÀNG
                setIsSdkReady(true);

                // 3. Xin quyền thông báo
                await OneSignal.Slidedown.promptPush();

            } catch (error) {
                console.error("Lỗi khởi tạo OneSignal:", error);
            }
        };

        initOneSignal();
    }, []);

    // 4. Quản lý việc Login/Logout thiết bị
    useEffect(() => {
        const linkUserToOneSignal = async () => {
            // ✅ SỬ DỤNG STATE THAY VÌ OneSignal.initialized
            if (!isSdkReady) return;

            if (user?.id) {
                // Khai báo điện thoại/máy tính này là của user.id
                await OneSignal.login(user.id);
            } else {
                await OneSignal.logout();
            }
        };

        linkUserToOneSignal();
    }, [user, isSdkReady]); // Hook sẽ chạy lại khi user đổi hoặc khi SDK load xong

    return null;
}