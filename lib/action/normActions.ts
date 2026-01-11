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

    // 1. Validate dữ liệu cơ bản
    if (!data.code || !data.name) return { success: false, error: "Mã và Tên định mức là bắt buộc" };

    try {
        const normData = {
            code: data.code.trim(),
            name: data.name.trim(),
            unit: data.unit?.trim() || "",
            type: data.type || "company",
            // Quan trọng: Chuyển chuỗi rỗng thành null để tránh lỗi UUID invalid
            group_id: data.group_id && data.group_id !== "" ? data.group_id : null
        };

        let normId = data.id;

        // 2. Check trùng mã (nếu tạo mới)
        if (!normId) {
            const { data: exist } = await supabase.from("norm_definitions").select("id").eq("code", normData.code).single();
            if (exist) return { success: false, error: `Mã định mức "${normData.code}" đã tồn tại!` };
        }

        // 3. Insert / Update Header
        if (normId) {
            const { error } = await supabase.from("norm_definitions").update(normData).eq("id", normId);
            if (error) throw new Error("Lỗi cập nhật header: " + error.message);
        } else {
            const { data: newNorm, error } = await supabase.from("norm_definitions").insert(normData).select("id").single();
            if (error) throw new Error("Lỗi tạo mới: " + error.message);
            normId = newNorm.id;
        }

        // 4. Lưu Details (Hao phí)
        if (normId) {
            // Xóa cũ
            await supabase.from("norm_analysis").delete().eq("norm_id", normId);

            if (data.details && data.details.length > 0) {
                // Lọc bỏ các dòng rỗng (không có mã VT)
                const validDetails = data.details.filter((d: any) => d.material_code && d.material_code !== "");

                if (validDetails.length > 0) {
                    const detailsData = validDetails.map((item: any) => ({
                        norm_id: normId,
                        material_code: item.material_code,
                        material_name: item.material_name || "Vật tư",
                        unit: item.unit || "",
                        // Quan trọng: Ép kiểu số, nếu lỗi hoặc rỗng thì về 0
                        quantity: Number(item.quantity) || 0
                    }));

                    const { error: dtError } = await supabase.from("norm_analysis").insert(detailsData);
                    if (dtError) throw new Error("Lỗi lưu chi tiết vật tư: " + dtError.message);
                }
            }
        }

        revalidatePath("/admin/dictionaries/norms");
        return { success: true, message: "Đã lưu định mức thành công!" };

    } catch (e: any) {
        console.error("Save Norm Error:", e);
        return { success: false, error: e.message };
    }
}

// --- 4. XÓA ĐỊNH MỨC ---

export async function deleteNorm(id: string) {
    const supabase = await createClient();
    await supabase.from("norm_definitions").delete().eq("id", id);
    revalidatePath("/dictionaries/norms");
    return { success: true, message: "Đã xóa định mức" };
}