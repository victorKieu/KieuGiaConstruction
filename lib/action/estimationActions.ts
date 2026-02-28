"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/supabase/session";

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

// 2. ĐỒNG BỘ DỰ TOÁN TỪ BẢNG VẬT TƯ (ĐÃ NÂNG CẤP PHÂN RÃ HẠNG MỤC)
export async function createEstimationFromBudget(projectId: string) {
    const supabase = await createClient();
    console.log(`🚀 [Sync] Bắt đầu đồng bộ dự toán cho dự án: ${projectId}`);

    try {
        // A. Lấy dữ liệu nguồn từ QTO
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
            .select('category, material_name, unit_price')
            .eq('project_id', projectId);

        // Map giá cũ theo (Hạng mục + Tên vật tư) để giữ giá chính xác
        const priceMap = new Map<string, number>();
        currentEstimates?.forEach(e => {
            if (e.unit_price) {
                priceMap.set(`${e.category || ''}_${e.material_name}`, e.unit_price);
                // Tạo thêm map dự phòng theo tên vật tư
                priceMap.set(`_${e.material_name}`, e.unit_price);
            }
        });

        // C. Chuẩn bị dữ liệu Upsert
        const upsertData = budgetItems.map(item => {
            const exactKey = `${item.category || ''}_${item.material_name}`;
            const backupKey = `_${item.material_name}`;
            const oldPrice = priceMap.get(exactKey) || priceMap.get(backupKey) || 0;

            return {
                project_id: projectId,
                category: item.category, // 🔴 MANG TÊN HẠNG MỤC TỪ QTO SANG DỰ TOÁN
                material_name: item.material_name,
                material_code: item.material_name,
                unit: item.unit,
                quantity: item.budget_quantity,
                unit_price: oldPrice,
            };
        });

        console.log(`💾 [Sync] Đang Upsert ${upsertData.length} dòng...`);

        // 🔴 ĐỔI KHÓA XUNG ĐỘT: Cho phép trùng tên Vật tư miễn là khác Hạng mục (Category)
        const { error: upsertError } = await supabase
            .from('estimation_items')
            .upsert(upsertData, { onConflict: 'project_id, category, material_name' });

        if (upsertError) {
            console.error("❌ Lỗi Upsert:", upsertError);
            throw new Error("Lỗi lưu DB: " + upsertError.message);
        }

        // revalidatePath(`/projects/${projectId}`); // (Đảm bảo sếp đã import revalidatePath ở trên cùng file)
        return { success: true, message: `Đã đồng bộ ${upsertData.length} hạng mục phân rã chi tiết!` };

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
// ✅ HÀM MỚI: TẠO DỰ TOÁN TỰ ĐỘNG TỪ MẪU
export async function createEstimationFromMacro(projectId: string, items: any[]) {
    const supabase = await createClient();

    try {
        // Chuẩn bị dữ liệu insert hàng loạt
        const insertData = items.map(item => ({
            project_id: projectId,
            material_code: item.code, // Map đúng cột trong DB
            material_name: item.name,
            unit: item.unit,
            quantity: 0, // Mặc định là 0 để người dùng nhập sau
            unit_price: 0, // Sẽ lấy từ bảng giá chuẩn sau (nếu có)
            // status: 'active' // Bỏ nếu bảng estimation_items không có cột này
        }));

        const { error } = await supabase.from('estimation_items').insert(insertData);

        if (error) throw new Error(error.message);

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Đã thêm ${items.length} công tác vào dự toán!` };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- HÀM MỚI: XÓA ĐẦU MỤC DỰ TOÁN ---
export async function deleteEstimationItem(itemId: string, projectId: string) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createClient();

    const { error } = await supabase
        .from('estimation_items')
        .delete()
        .eq('id', itemId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa đầu mục thành công." };
}

// ✅ HÀM MỚI: Thêm dòng thủ công
export async function createManualEstimationItem(projectId: string, data: any) {
    const supabase = await createClient();

    const newItem = {
        project_id: projectId,
        original_name: data.name,
        unit: data.unit,
        quantity: parseFloat(data.quantity) || 0,
        unit_price: parseFloat(data.unit_price) || 0,
        // ❌ ĐÃ XÓA: total_cost (DB tự tính)
        is_mapped: false
    };

    const { error } = await supabase.from("estimation_items").insert(newItem);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm mới thành công!" };
}

export async function analyzeQTOAndGenerateEstimation(projectId: string) {
    try {
        const supabase = await createClient();

        // 1. Lấy tất cả các hạng mục QTO đã được gán mã định mức
        const { data: qtoItems, error: qtoError } = await supabase
            .from('qto_items')
            .select('*')
            .eq('project_id', projectId)
            .not('norm_code', 'is', null);

        if (qtoError) throw qtoError;
        if (!qtoItems || qtoItems.length === 0) {
            return { success: false, error: "Chưa có hạng mục nào được gán Mã Định Mức." };
        }

        // 2. Xóa các dòng Dự toán tự động cũ
        await supabase
            .from('estimation_items')
            .delete()
            .eq('project_id', projectId)
            .not('qto_item_id', 'is', null);

        // 3. Duyệt qua từng dòng QTO để phân tích
        let insertPayload: any[] = [];

        for (const qto of qtoItems) {
            const { data: normData } = await supabase
                .from('norms')
                .select(`
                    id, code, name,
                    norm_details ( quantity, resources ( id, code, name, unit, unit_price, group_code ) )
                `)
                .eq('code', qto.norm_code)
                .single();

            // 🔴 ĐỊNH NGHĨA CATEGORY TẠI ĐÂY CHUNG CHO CẢ 2 TRƯỜNG HỢP
            const categoryName = `[${qto.norm_code}] ${qto.item_name || 'Hạng mục chung'}`;

            // Nếu KHÔNG có định mức
            if (!normData || !normData.norm_details) {
                insertPayload.push({
                    project_id: projectId,
                    qto_item_id: qto.id,
                    category: categoryName, // 🔴 BỔ SUNG CỘT NÀY
                    original_name: `[Chưa rõ định mức] ${qto.item_name}`,
                    quantity: qto.quantity,
                    unit: qto.unit,
                    section_name: 'I. HẠNG MỤC TỰ DO',
                    is_mapped: false,
                });
                continue;
            }

            // Nếu CÓ định mức
            const details: any[] = normData.norm_details;
            for (const detail of details) {
                const resource = detail.resources;
                if (!resource) continue;

                const actualQuantity = Number(qto.quantity) * Number(detail.quantity);

                let sectionName = 'VẬT TƯ';
                if (resource.group_code === 'NC') sectionName = 'NHÂN CÔNG';
                if (resource.group_code === 'M') sectionName = 'MÁY THI CÔNG';

                insertPayload.push({
                    project_id: projectId,
                    qto_item_id: qto.id,
                    category: categoryName, // 🔴 BỔ SUNG CỘT NÀY ĐỂ HIỂN THỊ ĐÚNG TÊN HẠNG MỤC
                    original_name: `(${qto.norm_code}) ${resource.name}`,
                    material_code: resource.code,
                    material_name: resource.name,
                    quantity: actualQuantity,
                    unit: resource.unit || '',
                    unit_price: resource.unit_price || 0,
                    section_name: `II. ${sectionName} (Quy đổi định mức)`,
                    is_mapped: true
                });
            }
        }

        // 4. Lưu toàn bộ kết quả
        if (insertPayload.length > 0) {
            const { error: insertError } = await supabase
                .from('estimation_items')
                .insert(insertPayload);

            if (insertError) throw insertError;
        }

        return { success: true, message: "Đã phân tích vật tư thành công." };
    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message };
    }
}