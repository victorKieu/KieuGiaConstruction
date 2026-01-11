"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. LẤY DANH SÁCH DỰ TOÁN
export async function getEstimationItems(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('estimation_items')
        .select('*')
        .eq('project_id', projectId)
        .order('material_name', { ascending: true });

    if (error) {
        console.error("❌ Lỗi getEstimationItems:", error.message);
        return { success: false, data: [] };
    }
    return { success: true, data: data || [] };
}

// 2. ĐỒNG BỘ DỰ TOÁN TỪ BẢNG VẬT TƯ (ĐÃ FIX LỖI GENERATED COLUMN)
export async function createEstimationFromBudget(projectId: string) {
    const supabase = await createClient();
    console.log(`🚀 [Sync] Bắt đầu đồng bộ dự toán cho dự án: ${projectId}`);

    try {
        // A. Lấy dữ liệu nguồn
        const { data: budgetItems, error: budgetError } = await supabase
            .from('project_material_budget')
            .select('*')
            .eq('project_id', projectId);

        if (budgetError) throw new Error("Lỗi đọc bảng vật tư: " + budgetError.message);

        if (!budgetItems || budgetItems.length === 0) {
            return { success: false, error: "Bảng vật tư trống. Hãy tính toán bên tab Bóc tách trước." };
        }

        // B. Lấy giá cũ để bảo lưu
        const { data: currentEstimates } = await supabase
            .from('estimation_items')
            .select('material_name, unit_price')
            .eq('project_id', projectId);

        const priceMap = new Map<string, number>();
        currentEstimates?.forEach(e => {
            if (e.unit_price) priceMap.set(e.material_name, e.unit_price);
        });

        // C. Chuẩn bị dữ liệu Upsert
        // ❌ BỎ 'total_cost' VÌ DB TỰ TÍNH
        const upsertData = budgetItems.map(item => {
            const oldPrice = priceMap.get(item.material_name) || 0;
            return {
                project_id: projectId,
                material_name: item.material_name,
                material_code: item.material_name,
                unit: item.unit,
                quantity: item.budget_quantity,
                unit_price: oldPrice,
                // total_cost: ... ⛔ KHÔNG GỬI TRƯỜNG NÀY
            };
        });

        console.log(`💾 [Sync] Đang Upsert ${upsertData.length} dòng...`);

        const { error: upsertError } = await supabase
            .from('estimation_items')
            .upsert(upsertData, { onConflict: 'project_id, material_name' });

        if (upsertError) {
            console.error("❌ Lỗi Upsert:", upsertError);
            throw new Error("Lỗi lưu DB: " + upsertError.message);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Đã đồng bộ ${upsertData.length} hạng mục!` };

    } catch (e: any) {
        console.error("🔥 Sync Error:", e);
        return { success: false, error: e.message };
    }
}

// 3. CẬP NHẬT ĐƠN GIÁ (ĐÃ FIX LỖI GENERATED COLUMN)
export async function updateEstimationPrice(itemId: string, projectId: string, price: number) {
    const supabase = await createClient();

    // Chỉ cần update đơn giá, DB sẽ tự động tính lại total_cost
    const { error } = await supabase.from('estimation_items').update({
        unit_price: price,
        // total_cost: ... ⛔ KHÔNG GỬI TRƯỜNG NÀY
    }).eq('id', itemId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 4. GET TEMPLATES
export async function getCostTemplates() {
    return { success: true, data: [] };
}