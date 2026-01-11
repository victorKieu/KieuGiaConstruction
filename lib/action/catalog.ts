"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- KHO (WAREHOUSE) ---

export async function createWarehouseAction(data: { name: string; address: string; description?: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("warehouses").insert({ ...data, project_id: null }); // Kho thủ công thường là kho tổng
    if (error) return { success: false, error: error.message };
    revalidatePath("/inventory");
    return { success: true, message: "Tạo kho thành công" };
}

export async function updateWarehouseStatusAction(id: string, status: 'active' | 'closed') {
    const supabase = await createClient();
    const { error } = await supabase.from("warehouses").update({ status }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/inventory");
    return { success: true, message: `Đã ${status === 'closed' ? 'đóng' : 'mở'} kho` };
}

// --- NHÓM VẬT TƯ (CHA) ---

export async function getMaterialGroups() {
    const supabase = await createClient();
    const { data } = await supabase.from("material_groups").select("*").order("code");
    return data || [];
}

export async function createMaterialGroupAction(data: { code: string; name: string; description?: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("material_groups").insert(data);
    if (error) return { success: false, error: "Mã nhóm có thể đã tồn tại" };
    revalidatePath("/inventory/catalog");
    return { success: true, message: "Tạo nhóm thành công" };
}

// --- VẬT TƯ (CON) ---

export async function getMaterials(groupId?: string) {
    const supabase = await createClient();
    let query = supabase.from("materials").select("*, group:material_groups(name)").order("code");

    if (groupId && groupId !== 'all') {
        query = query.eq("group_id", groupId);
    }

    const { data } = await query;
    return data || [];
}

export async function createMaterialAction(data: any) {
    const supabase = await createClient();
    const { error } = await supabase.from("materials").insert(data);
    if (error) return { success: false, error: "Lỗi tạo vật tư: " + error.message };
    revalidatePath("/inventory/catalog");
    return { success: true, message: "Tạo vật tư thành công" };
}

// --- 3. UPDATE (MỚI) ---
export async function updateMaterialAction(id: string, data: any) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("materials")
        .update(data)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/inventory/catalog");
    return { success: true, message: "Cập nhật thành công!" };
}

// --- 4. DELETE (MỚI) ---
export async function deleteMaterialAction(id: string) {
    const supabase = await createClient();

    // (Tùy chọn) Kiểm tra xem vật tư này đã được dùng trong dự án nào chưa trước khi xóa
    // const { count } = await supabase.from("estimation_items").select("*", { count: 'exact', head: true }).eq("material_code", code);
    // if (count > 0) return { success: false, error: "Vật tư này đang được sử dụng, không thể xóa!" };

    const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/inventory/catalog");
    return { success: true, message: "Đã xóa vật tư!" };
}