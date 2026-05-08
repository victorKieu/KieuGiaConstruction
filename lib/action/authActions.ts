"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { revalidatePath } from 'next/cache'

/**
 * Hàm lấy thông tin User hiện tại từ session
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        console.warn("User not found or error fetching user:", error);
        return null;
    }

    return user;
}

export async function changePassword(formData: FormData) {
    const supabase = await createSupabaseServerClient();

    const oldPassword = formData.get("oldPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // 1. Kiểm tra khớp mật khẩu mới
    if (newPassword !== confirmPassword) {
        return { success: false, error: "Mật khẩu xác nhận không khớp." };
    }

    if (newPassword.length < 6) {
        return { success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự." };
    }

    // 2. Xác minh mật khẩu cũ (Re-authentication)
    // Lấy email của user hiện tại để xác thực
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return { success: false, error: "Không tìm thấy phiên đăng nhập." };

    const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
    });

    if (reauthError) {
        return { success: false, error: "Mật khẩu cũ không chính xác." };
    }

    // 3. Thực hiện cập nhật mật khẩu mới
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    return { success: true, message: "Đổi mật khẩu thành công!" };
}

export async function loginWithPassword(email: string, pass: string) {
    try {
        const supabase = await createSupabaseServerClient()

        // Gọi hàm signInWithPassword từ Supabase SSR
        // Việc gọi hàm này trên Server sẽ tự động thiết lập Cookie Session an toàn
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        })

        if (error) {
            // Bắt các lỗi phổ biến từ Supabase để trả về cho Client
            return {
                success: false,
                error: error.message
            }
        }

        // Refresh lại toàn bộ layout để nhận diện Auth State mới
        revalidatePath('/', 'layout')

        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message || "Lỗi hệ thống nội bộ" }
    }
}

export async function logoutUser() {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
}
