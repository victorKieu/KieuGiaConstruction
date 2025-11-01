// --- START OF FILE complete-profile.ts (sửa đổi) ---

"use server"; // <-- Đảm bảo có directive này

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server"; // Sử dụng hàm server-side của bạn
import { cookies } from "next/headers";

export async function completeProfile({
    auth_user_id,
    role,
    profileData,
}: {
    auth_user_id: string;
    role: string;
    profileData: any; // Cần validation chặt chẽ hơn
}) {
    // Để thực hiện các thao tác insert/update an toàn, chúng ta có 2 lựa chọn:
    // A) Dùng client với quyền của người dùng (nếu có RLS phù hợp)
    // B) Dùng client admin (Service Role Key) (nếu bạn tin tưởng logic gọi hàm này)

    // Ví dụ, chúng ta sẽ dùng client với quyền của người dùng,
    // điều này yêu cầu RLS được cấu hình để cho phép người dùng tự tạo/cập nhật profile của họ.
    const cookieStore = cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;

    if (!token) {
        throw new Error("Unauthorized: No access token found.");
    }
    const supabase = createSupabaseServerClient(token);

    // Bắt buộc phải kiểm tra auth_user_id để tránh người dùng giả mạo ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== auth_user_id) {
        throw new Error("Unauthorized: Mismatched or invalid user ID.");
    }

    const profileTable = role === "customer" ? "customers" : role === "employee" ? "employees" : "contractors";

    // Cần thêm validation cho profileData ở đây!
    // Ví dụ: validateEmployeeProfile(profileData) hoặc validateCustomerProfile(profileData)

    const { data: profile, error: profileError } = await supabase
        .from(profileTable)
        .insert([profileData])
        .select()
        .single();
    if (profileError || !profile) {
        console.error("Lỗi khi chèn profile:", profileError);
        throw profileError || new Error("Insert profile failed");
    }

    // Update profile_id in users table
    const { error: updateError } = await supabase
        .from("users")
        .update({ profile_id: profile.id })
        .eq("auth_user_id", auth_user_id);
    if (updateError) {
        console.error("Lỗi khi cập nhật profile_id trong bảng users:", updateError);
        // Cân nhắc rollback (xóa bản ghi profile vừa tạo) nếu có lỗi ở đây
        throw updateError;
    }

    return profile;
}