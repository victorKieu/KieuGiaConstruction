"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- KHO (WAREHOUSE) --- (Giữ nguyên)
export async function createWarehouseAction(data: { name: string; address: string; description?: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("warehouses").insert({ ...data, project_id: null });
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

    // Clean data trước khi insert
    const cleanData = {
        ...data,
        ref_price: data.ref_price ? Number(data.ref_price) : 0,
        group_id: data.group_id || null
    };

    const { error } = await supabase.from("materials").insert(cleanData);

    if (error) {
        console.error("Create Material Error:", error);
        return { success: false, error: "Lỗi tạo vật tư: " + error.message };
    }

    revalidatePath("/inventory/catalog");
    return { success: true, message: "Tạo vật tư thành công" };
}

export async function updateMaterialAction(id: string, data: any) {
    const supabase = await createClient();

    const cleanData = {
        ...data,
        ref_price: data.ref_price ? Number(data.ref_price) : 0
    };

    const { error } = await supabase
        .from("materials")
        .update(cleanData)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/inventory/catalog");
    return { success: true, message: "Cập nhật thành công!" };
}

export async function deleteMaterialAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("materials").delete().eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/inventory/catalog");
    return { success: true, message: "Đã xóa vật tư!" };
}

// ✅ HÀM MỚI: Cập nhật nhóm vật tư
export async function updateMaterialGroupAction(id: string, data: { code: string; name: string; description?: string }) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("material_groups")
        .update(data)
        .eq("id", id);

    if (error) return { success: false, error: "Lỗi cập nhật: " + error.message };
    revalidatePath("/inventory/catalog");
    return { success: true, message: "Cập nhật nhóm thành công" };
}