// lib/action/normActions.ts (Bổ sung/Update)
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

// --- 1. LẤY DANH SÁCH (Kèm thông tin Nhóm) ---
export async function getNorms() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("norm_definitions")
        .select(`
            *,
            group:sys_dictionaries!group_id (id, name, code, color), 
            details:norm_analysis (*)
        `)
        .order("code", { ascending: true });

    if (error) return [];
    return data;
}

// --- 2. LẤY DANH SÁCH CÁC NHÓM (Để đổ vào Dropdown/Sidebar) ---
export async function getNormGroups() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("sys_dictionaries")
        .select("*")
        .eq("category", "NORM_GROUP")
        .order("sort_order", { ascending: true });
    return data || [];
}

// --- 3. LƯU ĐỊNH MỨC (Update thêm group_id) ---
export async function saveNorm(data: any) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { success: false, error: "Bạn không có quyền Admin!" };

    const supabase = await createClient();

    // Validate cơ bản
    if (!data.code || !data.name) return { success: false, error: "Thiếu thông tin bắt buộc" };

    const normData = {
        code: data.code,
        name: data.name,
        unit: data.unit,
        type: data.type || "company",
        group_id: data.group_id || null // ✅ Lưu nhóm
    };

    let normId = data.id;

    // Check trùng mã (nếu tạo mới)
    if (!normId) {
        const { data: exist } = await supabase.from("norm_definitions").select("id").eq("code", normData.code).single();
        if (exist) return { success: false, error: "Mã định mức đã tồn tại!" };
    }

    if (normId) {
        await supabase.from("norm_definitions").update(normData).eq("id", normId);
    } else {
        const { data: newNorm, error } = await supabase.from("norm_definitions").insert(normData).select("id").single();
        if (error) return { success: false, error: error.message };
        normId = newNorm.id;
    }

    // Lưu Details (Giữ nguyên logic cũ)
    if (normId) {
        await supabase.from("norm_analysis").delete().eq("norm_id", normId);
        if (data.details && data.details.length > 0) {
            const detailsData = data.details.map((item: any) => ({
                norm_id: normId,
                material_code: item.material_code || "N/A",
                material_name: item.material_name,
                unit: item.unit,
                quantity: item.quantity
            }));
            const { error: dtError } = await supabase.from("norm_analysis").insert(detailsData);
            if (dtError) return { success: false, error: "Lỗi lưu chi tiết: " + dtError.message };
        }
    }

    revalidatePath("/admin/dictionaries/norms");
    return { success: true, message: "Đã lưu định mức!" };
}

// --- 4. XÓA ĐỊNH MỨC ---

export async function deleteNorm(id: string) {
    const supabase = await createClient();
    await supabase.from("norm_definitions").delete().eq("id", id);
    revalidatePath("/dictionaries/norms");
    return { success: true, message: "Đã xóa định mức" };
}