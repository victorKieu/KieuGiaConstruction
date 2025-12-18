import { format, isToday, isTomorrow, isYesterday, isValid } from "date-fns"; // Thêm isValid
import { vi } from "date-fns/locale";
import { Activity } from "@/types/crm";

export function groupActivitiesByDate(activities: Activity[] | null) {
    const grouped: Record<string, Activity[]> = {};

    if (!activities || !Array.isArray(activities)) return grouped;

    activities.forEach((activity) => {
        // 1. Kiểm tra an toàn dữ liệu đầu vào
        if (!activity.scheduled_at) return;

        const date = new Date(activity.scheduled_at);

        // 2. Nếu ngày không hợp lệ -> bỏ qua, không crash app
        if (!isValid(date)) {
            console.warn(`Activity ID ${activity.id} có ngày không hợp lệ: ${activity.scheduled_at}`);
            return;
        }

        let dateKey = "";
        try {
            if (isToday(date)) dateKey = "Hôm nay";
            else if (isTomorrow(date)) dateKey = "Ngày mai";
            else if (isYesterday(date)) dateKey = "Hôm qua";
            else {
                // Format tiếng Việt
                const dateStr = format(date, "EEEE, dd/MM/yyyy", { locale: vi });
                dateKey = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
            }
        } catch (e) {
            dateKey = "Thời gian khác"; // Fallback nếu date-fns lỗi
        }

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(activity);
    });

    return grouped;
}