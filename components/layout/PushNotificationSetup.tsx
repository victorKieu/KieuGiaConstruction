"use client";

import { useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';
import { BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation'; // ✅ Thêm import Router của Next.js

export default function PushNotificationSetup({ userId }: { userId?: string }) {
    const isInitTriggered = useRef(false);
    const [isSdkReady, setIsSdkReady] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<string>("default");

    const router = useRouter(); // ✅ Khởi tạo Router
    const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string; // Ép kiểu string để tránh lỗi TS

    // 1. Khởi tạo OneSignal
    useEffect(() => {
        const initOneSignal = async () => {
            if (isInitTriggered.current) return;
            isInitTriggered.current = true;

            try {
                await OneSignal.init({
                    appId: APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: { enable: false } as any,
                });

                setIsSdkReady(true);

                // ✅ THÊM LOGIC BẮT SỰ KIỆN CLICK VÀO THÔNG BÁO
                OneSignal.Notifications.addEventListener('click', (event) => {
                    // Ép kiểu (typecast) để TypeScript hiểu cấu trúc của additionalData
                    const customData = event.notification.additionalData as Record<string, any> | undefined;

                    // Ưu tiên lấy url từ data (để không bị mở tab mới), nếu không có mới lấy launchURL
                    const targetUrl = customData?.url || event.notification.launchURL;

                    if (targetUrl) {
                        // Dùng Next.js Router chuyển trang nội bộ
                        router.push(targetUrl);
                    }
                });

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

        // Đảm bảo chỉ chạy trên client
        if (typeof window !== "undefined") {
            initOneSignal();
        }
    }, [APP_ID, router]);

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