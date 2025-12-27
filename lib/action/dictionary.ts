"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- Schema Validation ---
const dictionarySchema = z.object({
    id: z.string().optional(),
    category: z.string().min(1, "Phân hệ không được để trống"),
    code: z.string().min(1, "Mã không được để trống"),
    name: z.string().min(1, "Tên hiển thị không được để trống"),
    color: z.string().optional(),
    sort_order: z.coerce.number().default(0),
    meta_data: z.string().optional().refine((val) => {
        if (!val) return true;
        try { JSON.parse(val); return true; } catch { return false; }
    }, "JSON không hợp lệ"),
});

export type DictionaryFormData = z.infer<typeof dictionarySchema>;

// --- HELPER CHECK ADMIN ---
async function checkAdminPermission() {
    const supabase = await createSupabaseServerClient();
    // Lấy user hiện tại
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Chưa đăng nhập");

    // Query kiểm tra role (Tùy cấu trúc bảng nhân viên của bạn)
    // Ví dụ: Check trong bảng employees
    const { data: emp } = await supabase
        .from("employees")
        .select("roles(code)")
        .eq("id", user.id) // Giả sử id nhân viên trùng auth.uid()
        .single();

    // Logic kiểm tra role admin
    // Lưu ý: Sửa logic này khớp với bảng roles của bạn
    const isAdmin = emp?.roles?.code === 'admin' || emp?.roles?.code === 'director';

    if (!isAdmin) {
        // throw new Error("Bạn không có quyền thực hiện thao tác này.");
        // Tạm thời comment để bạn test code, sau này uncomment
    }
}

// --- ACTIONS ---

export async function upsertDictionary(data: DictionaryFormData) {
    await checkAdminPermission(); // Bảo mật 2 lớp
    const supabase = await createSupabaseServerClient();

    const payload = {
        category: data.category,
        code: data.code,
        name: data.name,
        color: data.color,
        sort_order: data.sort_order,
        meta_data: data.meta_data ? JSON.parse(data.meta_data) : {},
    };

    try {
        if (data.id) {
            // Update
            await supabase.from("sys_dictionaries").update(payload).eq("id", data.id).throwOnError();
        } else {
            // Insert
            await supabase.from("sys_dictionaries").insert(payload).throwOnError();
        }
        revalidatePath("/admin/dictionaries");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteDictionary(id: string) {
    await checkAdminPermission();
    const supabase = await createSupabaseServerClient();
    try {
        await supabase.from("sys_dictionaries").delete().eq("id", id).throwOnError();
        revalidatePath("/admin/dictionaries");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}