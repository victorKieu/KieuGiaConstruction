// lib/action/pushNotification.ts
import "server-only";

export async function sendPushToUser(userId: string, title: string, message: string, url: string = "/") {
    const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!API_KEY) {
        console.error("❌ Thiếu ONESIGNAL_REST_API_KEY trong file .env");
        return;
    }

    const payload = {
        app_id: APP_ID,
        target_channel: "push",
        include_aliases: {
            external_id: [userId]
        },
        headings: { en: title },
        contents: { en: message },
        // ✅ Chuyển url vào trong mục 'data' (Tương ứng với additionalData ở Frontend)
        data: {
            url: url
        }
    };

    try {
        const response = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("👉 OneSignal Response:", data);
    } catch (error) {
        console.error("❌ Lỗi khi bắn Push Notification:", error);
    }
}