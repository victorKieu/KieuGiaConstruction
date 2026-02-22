"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. LẤY DỮ LIỆU BÓC TÁCH ---
export async function getProjectQTO(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("qto_items")
        .select(`
            *,
            details:qto_item_details (*) // ĐÃ ĐỔI TÊN BẢNG CHO KHỚP VỚI API AI
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("❌ Lỗi getProjectQTO:", error.message);
        return [];
    }
    return data || [];
}

// --- 2. THÊM ĐẦU VIỆC ---
export async function createQTOItem(projectId: string, name: string, unit: string, normCode?: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("qto_items").insert({
        project_id: projectId,
        item_name: name,
        unit: unit,
        norm_code: normCode || null,
        item_type: 'material',
        quantity: 0,
        unit_price: 0
    });

    if (error) return { success: false, error: "Lỗi DB: " + error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm đầu việc" };
}

// --- 3. THÊM CHI TIẾT DÒNG DIỄN GIẢI ---
export async function addQTODetail(itemId: string, data: any) {
    const supabase = await createClient();

    const l = Number(data.length) || 0;
    const w = Number(data.width) || 0;
    const h = Number(data.height) || 0;
    const f = Number(data.quantity_factor) || 1;

    // Insert vào đúng bảng qto_item_details
    const { error } = await supabase.from("qto_item_details").insert({
        item_id: itemId, // Chú ý: dùng item_id thay vì qto_item_id
        project_id: data.projectId,
        explanation: data.explanation || '',
        length: l,
        width: w,
        height: h,
        quantity_factor: f
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true };
}

// --- 4. CẬP NHẬT DÒNG DIỄN GIẢI (ON BLUR) ---
export async function updateQTODetail(detailId: string, projectId: string, field: string, value: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('qto_item_details')
        .update({ [field]: value })
        .eq('id', detailId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function updateQTODetailText(detailId: string, projectId: string, text: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('qto_item_details')
        .update({ explanation: text })
        .eq('id', detailId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// --- 5. DELETE ACTIONS ---
export async function deleteQTOItem(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("qto_items").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function deleteQTODetail(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("qto_item_details").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// --- 6. LOGIC TÍNH TOÁN VẬT TƯ (ĐÃ NÂNG CẤP THEO 3 BẢNG DICTIONARY CHUẨN) ---
export async function calculateMaterialBudget(projectId: string) {
    const supabase = await createClient();

    try {
        console.log(`🚀 Bắt đầu tính toán cho dự án: ${projectId}`);

        // A. Lấy QTO Items và Details (Khối lượng thiết kế)
        const { data: qtoItems, error: qtoError } = await supabase
            .from("qto_items")
            .select(`
                id, 
                norm_code,
                details:qto_item_details (length, width, height, quantity_factor)
            `)
            .eq("project_id", projectId)
            .not("norm_code", "is", null);

        if (qtoError) throw new Error("Lỗi lấy QTO: " + qtoError.message);
        if (!qtoItems || qtoItems.length === 0) return { success: false, error: "Chưa có dữ liệu bóc tách có mã định mức." };

        // Tổng hợp khối lượng theo mã định mức
        const workVolumeMap: Record<string, number> = {};

        qtoItems.forEach(item => {
            if (!item.norm_code) return;
            // Kéo logic tính toán từ Client xuống Server để đồng bộ khối lượng
            const itemTotal = item.details.reduce((sum: number, d: any) => {
                const len = Number(d.length) || 0;
                const wid = Number(d.width) || 0;
                const hei = Number(d.height) || 0;
                const fac = Number(d.quantity_factor) || 0;

                if (len === 0 && wid === 0 && hei === 0) return sum;

                const finalL = len !== 0 ? len : 1;
                const finalW = wid !== 0 ? wid : 1;
                const finalH = hei !== 0 ? hei : 1;
                const finalF = fac !== 0 ? fac : 1;

                return sum + (finalL * finalW * finalH * finalF);
            }, 0);

            if (itemTotal > 0) {
                workVolumeMap[item.norm_code] = (workVolumeMap[item.norm_code] || 0) + itemTotal;
            }
        });

        const normCodes = Object.keys(workVolumeMap);
        if (normCodes.length === 0) return { success: false, error: "Tổng khối lượng bóc tách bằng 0." };

        // B. Lấy thông tin từ bảng `norms` (Từ điển định mức chuẩn)
        const { data: normDefs, error: defError } = await supabase
            .from("norms")
            .select("id, code")
            .in("code", normCodes);

        if (defError) throw new Error("Lỗi lấy định mức: " + defError.message);
        if (!normDefs || normDefs.length === 0) return { success: false, error: "Không tìm thấy mã định mức nào trong hệ thống." };

        const normIdMap: Record<string, string> = {};
        const normIds: string[] = [];

        normDefs.forEach(n => {
            normIdMap[n.code] = n.id;
            normIds.push(n.id);
        });

        // C. Lấy chi tiết Hao phí từ bảng `norm_details` và join với `resources` để lấy tên vật tư
        const { data: normDetailsList, error: detailError } = await supabase
            .from("norm_details")
            .select(`
                norm_id, 
                quantity,
                resource:resources (name, unit)
            `)
            .in("norm_id", normIds);

        if (detailError) throw new Error("Lỗi lấy chi tiết hao phí: " + detailError.message);

        // D. Tính toán Bóc tách vật tư (Resource Explosion)
        const resourceMap: Record<string, { unit: string, quantity: number }> = {};

        for (const code of normCodes) {
            const workQty = workVolumeMap[code];
            const normId = normIdMap[code];

            if (!normId) continue;

            const ingredients = normDetailsList?.filter(d => d.norm_id === normId) || [];

            ingredients.forEach((ing: any) => {
                const requiredQty = workQty * Number(ing.quantity);
                if (requiredQty > 0 && ing.resource) {
                    const matName = ing.resource.name;
                    if (!resourceMap[matName]) {
                        resourceMap[matName] = { unit: ing.resource.unit, quantity: 0 };
                    }
                    resourceMap[matName].quantity += requiredQty;
                }
            });
        }

        // E. Lưu vào bảng project_material_budget
        const budgetRecords = Object.entries(resourceMap).map(([matName, data]) => ({
            project_id: projectId,
            material_name: matName,
            unit: data.unit,
            budget_quantity: data.quantity,
            last_updated: new Date().toISOString()
        }));

        if (budgetRecords.length > 0) {
            // Xóa ngân sách cũ để ghi đè ngân sách mới
            await supabase.from("project_material_budget").delete().eq("project_id", projectId);

            const { error: insertError } = await supabase
                .from("project_material_budget")
                .insert(budgetRecords);

            if (insertError) throw new Error("Lỗi lưu kết quả: " + insertError.message);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Thành công! Đã tính toán ${budgetRecords.length} loại vật tư.` };

    } catch (e: any) {
        console.error("🔥 Calculate Error:", e);
        return { success: false, error: e.message };
    }
}

// --- 7. LẤY DỮ LIỆU ĐỂ HIỂN THỊ ---
export async function getMaterialBudget(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('project_material_budget')
        .select('*')
        .eq('project_id', projectId)
        .order('material_name', { ascending: true });

    if (error) return [];
    return data || [];
}