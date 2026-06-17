// lib/utils/date.ts

/**
 * Hàm chuyển đổi chuỗi thời gian từ Supabase (UTC) 
 * sang định dạng chuẩn "YYYY-MM-DDThh:mm" theo giờ Việt Nam (GMT+7).
 * Phù hợp dùng trực tiếp cho thẻ <input type="datetime-local" />
 */

export function toVNDatetimeLocal(dateString: string | null | undefined): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 16);
}

/**
 * Hiển thị ngày giờ hệ 12h (AM/PM) chuyên nghiệp
 * Trả về định dạng: 03:30 PM 20/06/2026
 */
export function formatVNDate(dateString: string | null | undefined): string {
    if (!dateString) return "-";

    const date = new Date(dateString);

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // Chuyển 0 giờ thành 12 giờ

    const strHours = hours.toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${strHours}:${minutes} ${ampm} ${day}/${month}/${year}`;
}