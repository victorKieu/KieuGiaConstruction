// --- START OF FILE register.ts (sửa đổi) ---

"use server"; // <-- Đảm bảo có directive này

// Để đảm bảo tính nhất quán (transactional) cho việc đăng ký và tạo user row,
// lý tưởng nhất là bạn nên dùng một hàm RPC trên database.
// Tuy nhiên, nếu muốn giữ logic ở Server Action, chúng ta cần cẩn thận.

import { createClient } from "@supabase/supabase-js"; // Dùng createClient cho auth.signUp
import { createSupabaseAdminClient } from "@/lib/supabase/server"; // Dùng client admin cho insert vào bảng users

const supabaseClient = createClient( // Client này chỉ dùng cho auth.signUp (khóa anon là ok)
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function registerUser({ email, password, role }: { email: string, password: string, role: string }) {
    // BƯỚC 1: Đăng ký người dùng với Supabase Auth
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { role } } // Lưu role vào user_metadata của Supabase Auth
    });
    if (signUpError || !signUpData.user) {
        console.error("Lỗi khi tạo auth user:", signUpError);
        throw signUpError || new Error("Không tạo được auth user");
    }

    // BƯỚC 2: Tạo bản ghi trong bảng `users` của bạn
    // Sử dụng client admin để đảm bảo bản ghi được chèn, bỏ qua RLS.
    // Điều này an toàn vì chúng ta đã thành công tạo auth user ở bước 1.
    const supabaseAdmin = createSupabaseAdminClient(); // <-- Dùng client admin

    const { data: usersData, error: usersError } = await supabaseAdmin
        .from("users")
        .insert([{ auth_user_id: signUpData.user.id, role }])
        .select()
        .single();

    if (usersError || !usersData) {
        console.error("Lỗi khi tạo users row:", usersError);
        // RẤT QUAN TRỌNG: Nếu bước này thất bại, chúng ta có một auth user nhưng không có user row.
        // Cân nhắc xóa auth user vừa tạo để tránh dữ liệu không nhất quán.
        await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id); // <-- Thêm rollback
        throw usersError || new Error("Không tạo được users row. Auth user đã bị xóa.");
    }

    return { authUser: signUpData.user, usersRow: usersData };
}