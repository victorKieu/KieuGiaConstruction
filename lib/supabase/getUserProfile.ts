// --- START OF FILE getUserProfile.ts (sửa đổi) ---

"use server"; // <-- Đảm bảo có directive này

import { createSupabaseServerClient } from "@/lib/supabase/server"; // Sử dụng hàm server-side của bạn
import { cookies } from "next/headers";
import { UserProfile } from "@/types/userProfile";

/**
 * Lấy thông tin đầy đủ của người dùng (khớp với type UserProfile).
 * @returns {Promise<UserProfile | null>}
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    const cookieStore = cookies(); // <-- Lấy cookieStore
    const token = cookieStore.get("sb-access-token")?.value || null; // <-- Đọc cookie thống nhất

    if (!token) {
        console.log("Không có token đăng nhập trong getUserProfile.");
        return null;
    }

    // Tạo client Supabase với token lấy được từ cookie
    const supabase = createSupabaseServerClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.log("Xác thực thất bại hoặc không có người dùng đăng nhập trong getUserProfile.");
        return null;
    }

    const { data: profileData, error: rpcError } = await supabase
        .rpc('get_full_user_profile');

    if (rpcError) {
        console.error("Lỗi khi gọi RPC get_full_user_profile:", rpcError.message);
        return null;
    }

    if (!profileData) {
        console.log("Hàm RPC không trả về dữ liệu cho người dùng:", user.id);
        return null;
    }

    const userProfile: UserProfile = profileData as UserProfile;

    if (!userProfile.avatar_url) {
        userProfile.avatar_url = '/images/default_avatar.png';
    }

    return userProfile;
}