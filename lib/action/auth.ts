"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache"; // <-- THÊM DÒNG NÀY

export async function logoutAction() {
    const supabase = await createClient();

    // 1. Gửi lệnh đăng xuất lên Supabase
    await supabase.auth.signOut();

    // 2. [QUAN TRỌNG] Xóa sạch Cache của toàn bộ ứng dụng
    // Điều này ép Next.js phải kiểm tra lại trạng thái thật sự (đã logout) của user
    revalidatePath("/", "layout");

    // 3. Chuyển hướng về trang login
    redirect("/login");
}