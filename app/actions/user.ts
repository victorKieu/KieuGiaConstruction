'use server'; // Đảm bảo đây là Server Action

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { type EmailCheckResult } from '@/types/EmailCheck'; // Import type mới

// Type cho kết quả kiểm tra email
// lib/types.ts (Bạn có thể tạo file này)
// export type EmailCheckResult = {
//     exists: boolean;
//     role?: 'customer' | 'supplier' | 'employee';
// };


/**
 * Kiểm tra xem email đã tồn tại trong bất kỳ bảng vai trò nào chưa.
 * @param email Email cần kiểm tra.
 * @param role Tùy chọn vai trò cụ thể để kiểm tra. Nếu không có, kiểm tra tất cả.
 * @returns {EmailCheckResult} Đối tượng chứa 'exists' (boolean) và 'role' (vai trò tìm thấy, nếu có).
 */
export async function checkEmailExists(email: string, roleToCheck?: 'customer' | 'supplier' | 'employee'): Promise<EmailCheckResult> {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    if (!email) {
        return { exists: false };
    }

    // Định nghĩa các bảng và vai trò tương ứng
    const tables = [
        { name: 'customers', role: 'customer' },
        { name: 'suppliers', role: 'supplier' },
        { name: 'employees', role: 'employee' },
    ];

    for (const table of tables) {
        // Nếu có roleToCheck, chỉ kiểm tra bảng tương ứng
        if (roleToCheck && table.role !== roleToCheck) {
            continue;
        }

        const { data, error } = await supabase
            .from(table.name)
            .select('id') // Chỉ cần select ID để kiểm tra sự tồn tại
            .eq('email', email)
            .limit(1);

        if (error) {
            console.error(`Lỗi khi kiểm tra email trong bảng ${table.name}:`, error.message);
            // Trong môi trường production, bạn có thể muốn trả về lỗi khác
            // hoặc coi như không tồn tại để tránh rò rỉ thông tin
            continue; // Tiếp tục kiểm tra các bảng khác hoặc bỏ qua
        }

        if (data && data.length > 0) {
            // Email đã tồn tại trong bảng này
            return { exists: true, role: table.role as 'customer' | 'supplier' | 'employee' };
        }
    }

    // Email không tồn tại trong bất kỳ bảng nào được kiểm tra
    return { exists: false };
}