"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(userId: string, data: any) {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
        return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
    }

    try {
        const { error } = await supabase
            .from("employees")
            .update({
                name: data.name, // Đã đổi từ full_name sang name cho khớp DB
                phone: data.phone,
                address: data.address,
                avatar_url: data.avatar_url,
            })
            .eq("id", userId);

        if (error) {
            console.error("Update Error:", error);
            return { success: false, error: "Lỗi cập nhật: " + error.message };
        }

        revalidatePath("/profile");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}