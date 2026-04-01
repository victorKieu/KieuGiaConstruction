"use client";

import { useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/lib/auth/auth-context';

export default function PushNotificationSetup() {
    const { user } = useAuth();
    const isInitTriggered = useRef(false);
    const [isSdkReady, setIsSdkReady] = useState(false);

    // Thêm state để ẩn/hiện nút mồi
    const [isSubscribed, setIsSubscribed] = useState(true);

    useEffect(() => {
        const initOneSignal = async () => {
            if (isInitTriggered.current) return;
            isInitTriggered.current = true;

            try {
                await OneSignal.init({
                    appId: "978f37f7-9d77-4f3a-bf57-1a9fcfb3ef8f", // Sếp nhớ điền lại mã nhé
                    notifyButton: { enable: false } as any,
                    allowLocalhostAsSecureOrigin: true,
                });

                setIsSdkReady(true);

                // Kiểm tra xem thiết bị này đã đăng ký nhận chuông chưa
                const hasOptedIn = OneSignal.User.PushSubscription.optedIn;
                setIsSubscribed(hasOptedIn ?? false);

                // Vẫn thử gọi auto-prompt (có thể bị trình duyệt chặn)
                if (!hasOptedIn) {
                    await OneSignal.Slidedown.promptPush();
                }

            } catch (error) {
                console.error("Lỗi khởi tạo OneSignal:", error);
            }
        };

        initOneSignal();
    }, []);

    useEffect(() => {
        const linkUserToOneSignal = async () => {
            if (!isSdkReady) return;

            if (user?.id) {
                await OneSignal.login(user.id);
            } else {
                await OneSignal.logout();
            }
        };

        linkUserToOneSignal();
    }, [user, isSdkReady]);

    // Hàm gọi thủ công khi sếp bấm nút
    const handleManualPrompt = async () => {
        await OneSignal.Slidedown.promptPush({ force: true });
    };

    // Nếu đã đăng ký rồi hoặc SDK chưa load xong thì không hiện nút
    //if (isSubscribed || !isSdkReady) return null;

    // Nút "Mồi" hiện ở góc dưới bên trái màn hình
    return (
        <button
            onClick={handleManualPrompt}
            className="fixed bottom-4 left-4 z-[9999] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm hover:bg-blue-700 animate-bounce"
        >
            🔔 Bật thông báo đẩy
        </button>
    );
}