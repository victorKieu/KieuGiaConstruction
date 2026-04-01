"use client";

import { useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';

// ✅ Nhận userId từ props truyền vào
export default function PushNotificationSetup({ userId }: { userId?: string }) {
    const isInitTriggered = useRef(false);
    const [isSdkReady, setIsSdkReady] = useState(false);

    // 1. Khởi tạo OneSignal (Chạy ngầm)
    useEffect(() => {
        const initOneSignal = async () => {
            if (isInitTriggered.current) return;
            isInitTriggered.current = true;
            try {
                // Sếp check lại ID này có đúng với App ID của sếp không nhé
                await OneSignal.init({
                    appId: "978f37f7-9d77-4f3a-bf57-1a9fcfb3ef8f",
                    allowLocalhostAsSecureOrigin: true,
                    // ✅ TẮT HOÀN TOÀN cái nút chuông màu đỏ mặc định
                    notifyButton: {
                        enable: false
                    } as any,
                });

                setIsSdkReady(true);

                // ✅ 2. TỰ ĐỘNG GỌI POPUP XIN QUYỀN (Nếu chưa đăng ký)
                // Nó sẽ tự động kiểm tra, nếu user bấm rồi thì nó sẽ im lặng luôn.
                await OneSignal.Slidedown.promptPush();

            } catch (e) {
                console.error("Lỗi khởi tạo OneSignal:", e);
            }
        };
        initOneSignal();
    }, []);

    // 3. Đăng nhập thiết bị với User ID
    useEffect(() => {
        if (isSdkReady && userId) {
            OneSignal.login(userId); // Khai báo: "Cái máy này là của user có ID này"
        } else if (isSdkReady && !userId) {
            OneSignal.logout(); // Đăng xuất nếu không có user
        }
    }, [isSdkReady, userId]);

    // ✅ 4. TRẢ VỀ NULL: Ẩn mình hoàn toàn, không render gì ra giao diện
    return null;
}