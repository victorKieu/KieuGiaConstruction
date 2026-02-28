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

// LƯU MÃ ĐỊNH MỨC VÀO HẠNG MỤC QTO
export async function updateQTONormCode(itemId: string, projectId: string, normCode: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('qto_items')
            .update({ norm_code: normCode })
            .eq('id', itemId)
            .eq('project_id', projectId);

        if (error) throw new Error(error.message);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi update norm code:", error);
        return { success: false, error: error.message };
    }
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
        // A. Lấy QTO Items
        const { data: qtoItems, error: qtoError } = await supabase
            .from("qto_items")
            .select(`id, item_name, norm_code, details:qto_item_details (length, width, height, quantity_factor)`)
            .eq("project_id", projectId)
            .not("norm_code", "is", null);

        if (qtoError) throw new Error("Lỗi lấy QTO: " + qtoError.message);
        if (!qtoItems || qtoItems.length === 0) {
            return { success: false, error: "Chưa có Hạng mục nào được gắn mã định mức!" };
        }

        const uniqueNormCodes = Array.from(new Set(qtoItems.map(i => i.norm_code).filter(Boolean)));

        // B. Lấy thông tin Định mức
        const { data: normDefs, error: defError } = await supabase
            .from("norms").select("id, code").in("code", uniqueNormCodes);

        if (defError) throw new Error("Lỗi lấy định mức: " + defError.message);

        const normIdMap = new Map(normDefs?.map(n => [n.code, n.id]));
        const normIds = Array.from(normIdMap.values());

        // C. Lấy chi tiết Hao phí
        const { data: normDetailsList, error: detailError } = await supabase
            .from("norm_details")
            .select(`norm_id, quantity, resource:resources (name, unit)`)
            .in("norm_id", normIds);

        if (detailError) throw new Error("Lỗi lấy chi tiết hao phí: " + detailError.message);

        // D. Phân rã vật tư (Resource Explosion)
        const groupedMap: Record<string, any> = {};

        qtoItems.forEach(item => {
            if (!item.norm_code) return;

            let itemTotal = 0;
            item.details?.forEach((d: any) => {
                const len = Number(d.length) || 0;
                const wid = Number(d.width) || 0;
                const hei = Number(d.height) || 0;
                const fac = Number(d.quantity_factor) || 0;

                if (len === 0 && wid === 0 && hei === 0) {
                    itemTotal += fac;
                } else {
                    itemTotal += ((len || 1) * (wid || 1) * (hei || 1) * (fac || 1));
                }
            });

            if (itemTotal <= 0) return;

            const normId = normIdMap.get(item.norm_code);
            const ingredients = normDetailsList?.filter(d => d.norm_id === normId) || [];

            // Gộp Hạng mục
            const categoryName = `[${item.norm_code}] ${item.item_name || 'Hạng mục chung'}`;

            ingredients.forEach((ing: any) => {
                const requiredQty = itemTotal * Number(ing.quantity);
                if (requiredQty > 0 && ing.resource) {
                    const matName = ing.resource.name;
                    const key = `${categoryName}_${matName}`;

                    if (!groupedMap[key]) {
                        groupedMap[key] = {
                            project_id: projectId,
                            category: categoryName, // Nếu DB sếp chưa có cột category, lệnh Insert sẽ báo lỗi ngay lập tức để sếp biết!
                            material_name: matName,
                            unit: ing.resource.unit,
                            budget_quantity: 0,
                            last_updated: new Date().toISOString()
                        };
                    }
                    groupedMap[key].budget_quantity += requiredQty;
                }
            });
        });

        const budgetRecords = Object.values(groupedMap);

        // 🔴 KIỂM TRA CHẶT CHẼ TRƯỚC KHI XÓA & LƯU
        if (budgetRecords.length === 0) {
            return {
                success: false,
                error: "Tính toán ra 0 vật tư. Nguyên nhân: Mã định mức sếp chọn chưa có bảng hao phí vật liệu bên trong (Rỗng)!"
            };
        }

        // Xóa cũ và Lưu mới
        await supabase.from("project_material_budget").delete().eq("project_id", projectId);

        const { error: insertError } = await supabase.from("project_material_budget").insert(budgetRecords);
        if (insertError) {
            throw new Error(`Lỗi Insert Database: ${insertError.message} (Có thể do sếp chưa tạo cột 'category' trong bảng project_material_budget)`);
        }

        return {
            success: true,
            message: `🎉 Thành công! Đã bóc tách được ${budgetRecords.length} dòng vật tư.`
        };

    } catch (e: any) {
        console.error("🔥 Calculate Error:", e.message);
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