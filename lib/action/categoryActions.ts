"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

// --- LƯU CATEGORY (Tạo mới hoặc Cập nhật) ---
export async function saveCategory(data: any) {
    // 1. Bảo mật
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { success: false, error: "Bạn không có quyền Admin!" };

    const supabase = await createClient();

    // 2. Validate
    if (!data.code || !data.name) {
        return { success: false, error: "Mã và Tên là bắt buộc." };
    }

    const payload = {
        code: data.code.trim().toUpperCase(), // Mã luôn viết hoa
        name: data.name.trim(),
        description: data.description,
        sort_order: Number(data.sort_order) || 99
    };

    try {
        // Vì 'code' là khóa chính, ta dùng Upsert
        // Lưu ý: Nếu user sửa 'code', về mặt kỹ thuật là tạo mới. 
        // Trong UI ta sẽ chặn sửa code để đơn giản hóa.
        const { error } = await supabase
            .from("sys_categories")
            .upsert(payload, { onConflict: "code" });

        if (error) throw new Error(error.message);

        revalidatePath("/admin/dictionaries/categories");
        revalidatePath("/admin/dictionaries/system"); // Revalidate cả trang từ điển

        return { success: true, message: "Lưu phân hệ thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- XÓA CATEGORY ---
export async function deleteCategory(code: string) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { success: false, error: "Bạn không có quyền Admin!" };

    const supabase = await createClient();

    // Kiểm tra xem có dữ liệu con nào đang dùng category này không?
    // Nếu có thì chặn xóa để đảm bảo toàn vẹn dữ liệu
    const { count } = await supabase
        .from("sys_dictionaries")
        .select("*", { count: 'exact', head: true })
        .eq("category", code);

    if (count && count > 0) {
        return { success: false, error: `Không thể xóa! Đang có ${count} mục dữ liệu thuộc phân hệ này.` };
    }

    const { error } = await supabase.from("sys_categories").delete().eq("code", code);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/dictionaries/categories");
    revalidatePath("/admin/dictionaries/system");
    return { success: true, message: "Đã xóa phân hệ." };
}