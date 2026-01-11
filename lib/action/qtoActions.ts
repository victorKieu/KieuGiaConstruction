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
            details:qto_items_calculated (*)
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
    const DEFAULT_ITEM_TYPE = 'other'; // Khớp với DB Enum của bạn

    const { error } = await supabase.from("qto_items").insert({
        project_id: projectId,
        item_name: name,
        unit: unit,
        norm_code: normCode || null,
        item_type: DEFAULT_ITEM_TYPE,
        quantity: 0,
        unit_price: 0
    });

    if (error) return { success: false, error: "Lỗi DB: " + error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm đầu việc" };
}

// --- 3. THÊM CHI TIẾT ---
export async function addQTODetail(itemId: string, data: any) {
    const supabase = await createClient();

    // A. Lấy thông tin cha
    const { data: parentItem, error: parentError } = await supabase
        .from('qto_items')
        .select('item_name, unit, norm_code')
        .eq('id', itemId)
        .single();

    if (parentError || !parentItem) return { success: false, error: "Không tìm thấy đầu việc cha!" };

    // B. Tính toán thông minh
    const l = Number(data.length) || 0;
    const w = Number(data.width) || 0;
    const h = Number(data.height) || 0;
    const f = Number(data.quantity_factor) || 1;

    let calculatedQuantity = 0;
    if (l === 0 && w === 0 && h === 0) {
        calculatedQuantity = 0;
    } else {
        const finalL = l > 0 ? l : 1;
        const finalW = w > 0 ? w : 1;
        const finalH = h > 0 ? h : 1;
        calculatedQuantity = finalL * finalW * finalH * f;
    }

    // C. Insert
    const { error } = await supabase.from("qto_items_calculated").insert({
        qto_item_id: itemId,
        project_id: data.projectId,
        explanation: data.explanation,
        length: l, width: w, height: h, quantity_factor: f,

        item_name: parentItem.item_name,
        unit: parentItem.unit,
        work_item_code: parentItem.norm_code || 'NoCode',
        quantity: calculatedQuantity
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true };
}

// --- 4. CẬP NHẬT CHI TIẾT ---
export async function updateQTODetail(detailId: string, projectId: string, field: string, value: number) {
    const supabase = await createClient();

    const { data: current, error: fetchError } = await supabase
        .from('qto_items_calculated')
        .select('*')
        .eq('id', detailId)
        .single();

    if (fetchError || !current) return { success: false, error: "Lỗi tìm dữ liệu" };

    const next = { ...current, [field]: value };
    const l = Number(next.length) || 0;
    const w = Number(next.width) || 0;
    const h = Number(next.height) || 0;
    const f = Number(next.quantity_factor) || 0;

    let newQuantity = 0;
    if (l === 0 && w === 0 && h === 0) {
        newQuantity = 0;
    } else {
        const finalL = l > 0 ? l : 1;
        const finalW = w > 0 ? w : 1;
        const finalH = h > 0 ? h : 1;
        const finalF = f !== 0 ? f : 1;
        newQuantity = finalL * finalW * finalH * finalF;
    }

    const { error } = await supabase
        .from('qto_items_calculated')
        .update({ [field]: value, quantity: newQuantity })
        .eq('id', detailId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function updateQTODetailText(detailId: string, projectId: string, text: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('qto_items_calculated')
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
    const { error } = await supabase.from("qto_items_calculated").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// --- 6. LOGIC TÍNH TOÁN VẬT TƯ (PHIÊN BẢN ROBUST - MANUAL JOIN) ---
// Thay thế hoàn toàn cách join cũ để đảm bảo không bị lỗi quan hệ
export async function calculateMaterialBudget(projectId: string) {
    const supabase = await createClient();

    try {
        console.log(`🚀 Bắt đầu tính toán cho dự án: ${projectId}`);

        // A. Lấy QTO Items và Details
        // Không join phức tạp, lấy dữ liệu thô và tính toán
        const { data: qtoItems, error: qtoError } = await supabase
            .from("qto_items")
            .select(`
                id, 
                norm_code,
                details:qto_items_calculated (quantity)
            `)
            .eq("project_id", projectId)
            .not("norm_code", "is", null);

        if (qtoError) throw new Error("Lỗi lấy QTO: " + qtoError.message);
        if (!qtoItems || qtoItems.length === 0) return { success: false, error: "Chưa có dữ liệu bóc tách có mã định mức." };

        // Tổng hợp khối lượng theo mã (Dictionary: code -> total_qty)
        const workVolumeMap: Record<string, number> = {};

        qtoItems.forEach(item => {
            if (!item.norm_code) return;
            const itemTotal = item.details.reduce((sum: number, d: any) => sum + (Number(d.quantity) || 0), 0);
            if (itemTotal > 0) {
                workVolumeMap[item.norm_code] = (workVolumeMap[item.norm_code] || 0) + itemTotal;
            }
        });

        const normCodes = Object.keys(workVolumeMap);
        console.log("📊 Các mã định mức cần tính:", normCodes);
        if (normCodes.length === 0) return { success: false, error: "Tổng khối lượng bóc tách bằng 0." };

        // B. Lấy thông tin Định mức (Header)
        const { data: normDefs, error: defError } = await supabase
            .from("norm_definitions")
            .select("id, code")
            .in("code", normCodes);

        if (defError) throw new Error("Lỗi lấy định mức header: " + defError.message);
        if (!normDefs || normDefs.length === 0) return { success: false, error: "Không tìm thấy mã định mức nào trong hệ thống." };

        // Tạo Map: Code -> ID (Để query bảng chi tiết)
        const normIdMap: Record<string, string> = {}; // code -> id
        const normIds: string[] = [];

        normDefs.forEach(n => {
            normIdMap[n.code] = n.id;
            normIds.push(n.id);
        });

        // C. Lấy chi tiết Hao phí (Ingredients)
        const { data: normDetails, error: detailError } = await supabase
            .from("norm_analysis")
            .select("norm_id, material_name, unit, quantity")
            .in("norm_id", normIds);

        if (detailError) throw new Error("Lỗi lấy chi tiết hao phí: " + detailError.message);

        console.log(`found ${normDetails?.length} analysis items`);

        // D. Tính toán (Resource Explosion)
        const resourceMap: Record<string, { unit: string, quantity: number }> = {};

        // Duyệt qua từng Norm Code đang có khối lượng
        for (const code of normCodes) {
            const workQty = workVolumeMap[code];
            const normId = normIdMap[code];

            if (!normId) {
                console.warn(`⚠️ Mã ${code} có trong QTO nhưng không tìm thấy trong norm_definitions.`);
                continue;
            }

            // Tìm các thành phần hao phí của normId này
            const ingredients = normDetails?.filter(d => d.norm_id === normId) || [];

            ingredients.forEach(ing => {
                const requiredQty = workQty * Number(ing.quantity);
                if (requiredQty > 0) {
                    const matName = ing.material_name;
                    if (!resourceMap[matName]) {
                        resourceMap[matName] = { unit: ing.unit, quantity: 0 };
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
            budget_quantity: data.quantity, // Cột lưu trữ kết quả
            last_updated: new Date().toISOString()
        }));

        console.log(`💾 Đang lưu ${budgetRecords.length} dòng vật tư vào DB...`);

        if (budgetRecords.length > 0) {
            const { error: upsertError } = await supabase
                .from("project_material_budget")
                .upsert(budgetRecords, { onConflict: "project_id, material_name" });

            if (upsertError) throw new Error("Lỗi lưu kết quả: " + upsertError.message);
        } else {
            return { success: true, message: "Tính toán xong nhưng không phát sinh vật tư." };
        }

        revalidatePath(`/projects/${projectId}`);
        return {
            success: true,
            message: `Thành công! Đã cập nhật ${budgetRecords.length} loại vật tư.`
        };

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

    if (error) {
        console.error("Lỗi getMaterialBudget:", error.message);
        return [];
    }
    return data || [];
}