"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { UserProfile } from "@/types/userProfile"; // Import type

/**
 * Lấy user cơ bản (chỉ từ auth.users).
 * Dùng nội bộ khi chỉ cần ID/Email.
 */
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error("[ Server ] Lỗi Supabase trong getCurrentUser:", error.message);
        return null;
    }
    return data.user;
}


/**
 * Lấy thông tin đầy đủ của người dùng (File ĐÚNG: lib/supabase/getUserProfile.ts).
 * Hàm này gọi RPC 'get_full_user_profile' và trả về profile đầy đủ.
 * Sẽ trả về NULL nếu RPC lỗi hoặc user không có profile.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    console.log("[getUserProfile] Bắt đầu chạy (File: lib/supabase/getUserProfile.ts)..."); // <-- LOG MỚI

    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    // Bước 1: Kiểm tra Auth (vẫn cần thiết)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        // --- LOG 1: Lỗi xác thực ---
        console.log("[getUserProfile] Lỗi: Xác thực thất bại. Trả về null.");
        console.error("[getUserProfile] Chi tiết lỗi Auth:", authError?.message);
        return null;
    }

    console.log("[getUserProfile] Đã xác thực user ID:", user.id); // <-- LOG MỚI

    // Bước 2: Gọi RPC (đã fix, chạy với quyền INVOKER)
    const { data: profileData, error: rpcError } = await supabase
        .rpc('get_full_user_profile');

    // Bước 3: Xử lý kết quả
    if (rpcError) {
        // --- LOG 2: Lỗi RPC ---
        // Nếu RPC lỗi (ví dụ: permission denied)
        console.error("[getUserProfile] LỖI khi gọi RPC:", rpcError.message);
        return null; // Trả về null
    }

    if (!profileData) {
        // --- LOG 3: RPC Trả về Null ---
        // Nếu RPC chạy thành công nhưng không tìm thấy dữ liệu (chưa INSERT data)
        console.log("[getUserProfile] RPC trả về null (User chưa có profile chi tiết).");
        return null; // Trả về null
    }

    // Bước 4: RPC thành công và có dữ liệu.
    // --- LOG 4: THÀNH CÔNG ---
    console.log("[getUserProfile] THÀNH CÔNG. Đang trả về RPC profile.");
    return profileData as UserProfile;
}