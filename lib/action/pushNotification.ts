// lib/action/pushNotification.ts
import "server-only";

export async function sendPushToUser(userId: string, title: string, message: string, url: string = "/") {
    const APP_ID = "978f37f7-9d77-4f3a-bf57-1a9fcfb3ef8f"; // Dùng lại App ID của sếp
    // LƯU Ý: Sếp CẦN vào Dashboard OneSignal -> Settings -> Keys & IDs để lấy REST API KEY
    // Sau đó cho vào biến môi trường .env.local: ONESIGNAL_REST_API_KEY="xxx..."
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!API_KEY) {
        console.error("❌ Thiếu ONESIGNAL_REST_API_KEY trong file .env");
        return;
    }

    const payload = {
        app_id: APP_ID,
        target_channel: "push",
        // Bắn trực tiếp đến cái userId (auth_id) đã login ở Frontend
        include_aliases: {
            external_id: [userId]
        },
        headings: { en: title },
        contents: { en: message },
        url: url // Khi user bấm vào thông báo, nó sẽ mở trang web này ra
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