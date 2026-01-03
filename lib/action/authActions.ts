"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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