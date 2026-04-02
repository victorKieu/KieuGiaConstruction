"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

// 1. Lấy toàn bộ dữ liệu để vẽ sơ đồ
export async function getDynamicOrgChart() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: depts } = await supabase.from("sys_dictionaries").select("*").eq("category", "DEPARTMENT").order("sort_order");
        const { data: managers } = await supabase.from("department_managers").select("*");
        const { data: emps } = await supabase.from("employees").select("id, name, code");

        // Gộp dữ liệu lại cho dễ xử lý trên UI
        const nodes = (depts || []).map(dept => {
            const manager = (managers || []).find(m => m.department_id === dept.id);
            return {
                id: dept.id,
                name: dept.name,
                parent_id: dept.meta_data?.parent_id || null, // Lấy parent_id từ JSONB
                manager_id: manager?.manager_id || null
            };
        });

        return { success: true, nodes, employees: emps || [] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 2. Thêm mới hoặc Cập nhật Bộ phận
export async function upsertOrgNode(payload: { id?: string, name: string, parent_id: string | null, manager_id: string | null }) {
    const supabase = await createSupabaseServerClient();
    try {
        let deptId = payload.id;

        if (!deptId) {
            // TẠO MỚI
            deptId = uuidv4();
            await supabase.from("sys_dictionaries").insert({
                id: deptId,
                category: "DEPARTMENT",
                code: `DEPT_${Date.now()}`, // Tự sinh mã
                name: payload.name,
                meta_data: { parent_id: payload.parent_id }
            });
        } else {
            // CẬP NHẬT
            const { data: existing } = await supabase.from("sys_dictionaries").select("meta_data").eq("id", deptId).single();
            const newMeta = { ...(existing?.meta_data || {}), parent_id: payload.parent_id };
            await supabase.from("sys_dictionaries").update({
                name: payload.name,
                meta_data: newMeta
            }).eq("id", deptId);
        }

        // XỬ LÝ QUẢN LÝ (Trưởng bộ phận)
        if (payload.manager_id) {
            await supabase.from("department_managers").upsert({ department_id: deptId, manager_id: payload.manager_id }, { onConflict: "department_id" });
        } else {
            await supabase.from("department_managers").delete().eq("department_id", deptId);
        }

        revalidatePath("/hrm/settings");
        return { success: true, message: "Lưu thông tin bộ phận thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 3. Xóa bộ phận
export async function deleteOrgNode(id: string) {
    const supabase = await createSupabaseServerClient();
    try {
        // Kiểm tra xem có phòng ban con nào đang bám vào không
        const { data: children } = await supabase.from("sys_dictionaries").select("id").eq("category", "DEPARTMENT").contains("meta_data", { parent_id: id });
        if (children && children.length > 0) {
            return { success: false, error: "Không thể xóa vì bộ phận này đang chứa các phòng ban con!" };
        }

        await supabase.from("department_managers").delete().eq("department_id", id);
        await supabase.from("sys_dictionaries").delete().eq("id", id);

        revalidatePath("/hrm/settings");
        return { success: true, message: "Đã xóa bộ phận!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}