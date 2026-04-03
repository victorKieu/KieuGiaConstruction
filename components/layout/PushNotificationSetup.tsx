"use client";

import { useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';
import { BellRing } from 'lucide-react'; // Nhớ cài lucide-react nếu chưa có

export default function PushNotificationSetup({ userId }: { userId?: string }) {
    const isInitTriggered = useRef(false);
    const [isSdkReady, setIsSdkReady] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<string>("default");

    // 1. Khởi tạo OneSignal
    useEffect(() => {
        const initOneSignal = async () => {
            if (isInitTriggered.current) return;
            isInitTriggered.current = true;

            try {
                await OneSignal.init({
                    appId: "978f37f7-9d77-4f3a-bf57-1a9fcfb3ef8f",
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: { enable: false } as any,
                });

                setIsSdkReady(true);

                // Kiểm tra xem đã cấp quyền chưa
                const currentPermission = OneSignal.Notifications.permission;
                setPermissionStatus(currentPermission ? "granted" : "default");

                // Thử gọi tự động (Có thể bị mobile chặn)
                if (!currentPermission) {
                    await OneSignal.Slidedown.promptPush();
                }

            } catch (e) {
                console.error("❌ Lỗi khởi tạo OneSignal:", e);
            }
        };
        initOneSignal();
    }, []);

    // 2. Gắn User ID
    useEffect(() => {
        if (isSdkReady && userId) {
            OneSignal.login(userId);
            console.log("✅ Đã login OneSignal với ID:", userId);
        } else if (isSdkReady && !userId) {
            OneSignal.logout();
        }
    }, [isSdkReady, userId]);

    // 3. Hàm gọi thủ công khi bấm nút
    const handleRequestPermission = async () => {
        try {
            await OneSignal.Notifications.requestPermission();
            const newPermission = OneSignal.Notifications.permission;
            setPermissionStatus(newPermission ? "granted" : "denied");
        } catch (error) {
            console.error("Lỗi khi xin quyền:", error);
        }
    };

    // ✅ NẾU ĐÃ CẤP QUYỀN RỒI -> ẨN ĐI (Trả về null như ý sếp)
    if (permissionStatus === "granted" || !isSdkReady) {
        return null;
    }

    // 🚨 NẾU CHƯA CẤP QUYỀN -> Hiển thị nút ở góc dưới màn hình để ép Mobile mở popup
    return (
        <div className="fixed bottom-4 left-4 z-50">
            <button
                onClick={handleRequestPermission}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 animate-bounce"
            >
                <BellRing className="w-4 h-4" />
                <span className="text-sm font-medium">Bật thông báo</span>
            </button>
        </div>
    );
}