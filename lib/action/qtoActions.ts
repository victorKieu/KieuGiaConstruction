"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. LẤY DỮ LIỆU BÓC TÁCH ---
export async function getProjectQTO(projectId: string) {
    const supabase = await createClient();

    // Lấy đầu việc (Items) kèm chi tiết diễn giải (Calculations)
    // Supabase sẽ tự động detect FK qto_item_id vừa tạo
    const { data, error } = await supabase
        .from("qto_items")
        .select(`
            *,
            details:qto_items_calculated (*)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (error) {
        // Log chi tiết lỗi để dễ debug
        console.error("Lỗi getProjectQTO:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

// --- 2. THÊM ĐẦU VIỆC (Work Item) ---
export async function createQTOItem(projectId: string, name: string, unit: string, normCode?: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("qto_items").insert({
        project_id: projectId,
        item_name: name,
        unit: unit,
        norm_code: normCode || null
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}/qto`);
    return { success: true, message: "Đã thêm đầu việc" };
}

// --- 3. THÊM DIỄN GIẢI CHI TIẾT (Dimensions) ---
export async function addQTODetail(itemId: string, data: any) {
    const supabase = await createClient();

    const length = Number(data.length) || 0;
    const width = Number(data.width) || 0;
    const height = Number(data.height) || 0;
    const factor = Number(data.quantity_factor) || 1;

    const { error } = await supabase.from("qto_items_calculated").insert({
        qto_item_id: itemId, // Cột này phải tồn tại (đã fix bằng SQL ở trên)
        explanation: data.explanation,
        length,
        width,
        height,
        quantity_factor: factor,
        project_id: data.projectId // Thêm project_id nếu bảng yêu cầu (fallback)
    });

    if (error) {
        console.error("Lỗi addQTODetail:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${data.projectId}/qto`);
    return { success: true };
}

// --- 4. TÍNH TOÁN VẬT TƯ (RESOURCE EXPLOSION) ---
export async function calculateMaterialBudget(projectId: string) {
    const supabase = await createClient();

    try {
        // A. Lấy toàn bộ QTO của dự án
        const { data: qtoItems, error: qtoError } = await supabase
            .from("qto_items")
            .select(`
                id, item_name, norm_code,
                details:qto_items_calculated (length, width, height, quantity_factor)
            `)
            .eq("project_id", projectId);

        if (qtoError) throw new Error("Lỗi lấy QTO: " + qtoError.message);
        if (!qtoItems || qtoItems.length === 0) return { success: false, error: "Chưa có dữ liệu bóc tách" };

        // B. Tổng hợp khối lượng theo Mã Định Mức
        const volumeByNorm: Record<string, number> = {};

        qtoItems.forEach(item => {
            if (!item.norm_code) return;

            // Tính tổng khối lượng
            const totalItemVolume = item.details.reduce((sum: number, det: any) => {
                const vol = (det.length || 0) * (det.width || 0) * (det.height || 0) * (det.quantity_factor || 1);
                return sum + vol;
            }, 0);

            volumeByNorm[item.norm_code] = (volumeByNorm[item.norm_code] || 0) + totalItemVolume;
        });

        // C. Lấy định mức
        const normCodes = Object.keys(volumeByNorm);
        if (normCodes.length === 0) return { success: false, error: "Chưa gán mã định mức cho công việc nào" };

        const { data: norms, error: normError } = await supabase
            .from("norm_definitions")
            .select(`
                code,
                analysis:norm_analysis (material_name, unit, quantity)
            `)
            .in("code", normCodes);

        if (normError) throw new Error("Lỗi lấy định mức: " + normError.message);

        // D. Tính toán tổng nhu cầu vật tư
        const materialBudget: Record<string, { qty: number, unit: string }> = {};

        norms?.forEach(norm => {
            const workVolume = volumeByNorm[norm.code] || 0;
            norm.analysis.forEach((mat: any) => {
                const requiredQty = workVolume * mat.quantity;
                if (!materialBudget[mat.material_name]) {
                    materialBudget[mat.material_name] = { qty: 0, unit: mat.unit };
                }
                materialBudget[mat.material_name].qty += requiredQty;
            });
        });

        // E. Lưu vào bảng Budget
        const budgetRecords = Object.entries(materialBudget).map(([matName, info]) => ({
            project_id: projectId,
            material_name: matName,
            unit: info.unit,
            budget_quantity: info.qty,
            last_updated: new Date().toISOString()
        }));

        if (budgetRecords.length > 0) {
            const { error: upsertError } = await supabase
                .from("project_material_budget")
                .upsert(budgetRecords, { onConflict: "project_id, material_name" });

            if (upsertError) throw new Error("Lỗi lưu Budget: " + upsertError.message);
        }

        revalidatePath(`/projects/${projectId}/finance`);
        return { success: true, message: `Đã cập nhật ${budgetRecords.length} loại vật tư vào ngân sách!` };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. DELETE ACTIONS ---
export async function deleteQTOItem(id: string, projectId: string) {
    const supabase = await createClient();
    await supabase.from("qto_items").delete().eq("id", id);
    revalidatePath(`/projects/${projectId}/qto`);
    return { success: true };
}

export async function deleteQTODetail(id: string, projectId: string) {
    const supabase = await createClient();
    await supabase.from("qto_items_calculated").delete().eq("id", id);
    revalidatePath(`/projects/${projectId}/qto`);
    return { success: true };
}