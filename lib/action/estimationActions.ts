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

        // B. Lấy giá cũ để bảo lưu (Tránh việc đồng bộ lại bị mất giá sếp đã nhập)
        const { data: currentEstimates } = await supabase
            .from('estimation_items')
            .select('category, material_name, unit_price')
            .eq('project_id', projectId);

        const priceMap = new Map<string, number>();
        currentEstimates?.forEach(e => {
            if (e.unit_price) {
                priceMap.set(`${e.category || ''}_${e.material_name}`, e.unit_price);
                priceMap.set(`_${e.material_name}`, e.unit_price);
            }
        });

        // C. Chuẩn bị dữ liệu Insert
        const insertData = budgetItems.map(item => {
            const exactKey = `${item.category || ''}_${item.material_name}`;
            const backupKey = `_${item.material_name}`;
            const oldPrice = priceMap.get(exactKey) || priceMap.get(backupKey) || 0;

            return {
                project_id: projectId,
                category: item.category,
                material_name: item.material_name,
                material_code: item.material_name,
                unit: item.unit,
                quantity: item.budget_quantity,
                unit_price: oldPrice,
            };
        });

        console.log(`💾 [Sync] Đang xóa data cũ và Insert ${insertData.length} dòng...`);

        // 🔴 BƯỚC 1: XÓA SẠCH DATA CŨ CỦA DỰ ÁN NÀY ĐỂ TRÁNH RÁC VÀ XUNG ĐỘT
        const { error: delError } = await supabase
            .from('estimation_items')
            .delete()
            .eq('project_id', projectId);

        if (delError) {
            console.error("❌ Lỗi xóa data cũ:", delError);
            throw new Error("Lỗi dọn dẹp data cũ: " + delError.message);
        }

        // 🔴 BƯỚC 2: BƠM TOÀN BỘ DATA MỚI VÀO BẰNG LỆNH INSERT (Bỏ hoàn toàn Upsert)
        const { error: insertError } = await supabase
            .from('estimation_items')
            .insert(insertData);

        if (insertError) {
            console.error("❌ Lỗi Insert:", insertError);
            throw new Error("Lỗi lưu DB: " + insertError.message);
        }

        // revalidatePath(`/projects/${projectId}`); // Mở ra nếu sếp muốn xóa cache Next.js
        return { success: true, message: `Đã đồng bộ ${insertData.length} hạng mục phân rã chi tiết!` };

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

// ✅ HÀM MỚI: Dùng để lưu tỉ lệ % của GT, LN, VAT
export async function updateEstimationQuantity(itemId: string, projectId: string, quantity: number) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.from('estimation_items').update({ quantity }).eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 🔴 CẬP NHẬT HÀM ĐỒNG BỘ: Tách GT, LN, VAT thành thông số toàn dự án
export async function analyzeQTOAndGenerateEstimation(projectId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    try {
        const { data: qtoItems } = await supabase.from('qto_items')
            .select('*, details:qto_item_details(*)')
            .eq('project_id', projectId);

        if (!qtoItems || qtoItems.length === 0) return { success: false, error: "Không có dữ liệu bóc tách" };

        // Xóa các dòng hao phí cũ, NHƯNG GIỮ LẠI các thông số GT, LN, VAT (qto_item_id = null)
        await supabase.from('estimation_items')
            .delete()
            .eq('project_id', projectId)
            .not('qto_item_id', 'is', null);

        const insertPayload: any[] = [];
        let taskCount = 0;

        for (const qto of qtoItems) {
            if (qto.item_type === 'section' || !qto.parent_id) continue;
            taskCount++;

            let taskVol = Number(qto.quantity) || 0;
            if (taskVol === 0 && qto.details && qto.details.length > 0) {
                taskVol = qto.details.reduce((sum: number, d: any) => {
                    const l = parseFloat(d.length) || 0, w = parseFloat(d.width) || 0, h = parseFloat(d.height) || 0, f = parseFloat(d.quantity_factor) || 0;
                    if (l === 0 && w === 0 && h === 0) return sum + f;
                    return sum + ((l !== 0 ? l : 1) * (w !== 0 ? w : 1) * (h !== 0 ? h : 1) * (f !== 0 ? f : 1));
                }, 0);
            }

            let hasMappedNorm = false;

            if (qto.norm_code) {
                const { data: normData } = await supabase.from('norms')
                    .select('*, norm_details ( quantity, resources ( code, name, unit, unit_price, group_code ) )')
                    .eq('code', qto.norm_code).maybeSingle();

                if (normData && normData.norm_details && normData.norm_details.length > 0) {
                    hasMappedNorm = true;
                    for (const detail of normData.norm_details) {
                        const res = detail.resources;
                        if (!res) continue;

                        insertPayload.push({
                            project_id: projectId, qto_item_id: qto.id,
                            category: res.group_code || 'VL',
                            material_code: res.code, material_name: res.name,
                            quantity: taskVol * Number(detail.quantity),
                            unit: res.unit, unit_price: res.unit_price || 0,
                            is_mapped: true,
                            dimensions: { norm: Number(detail.quantity) }
                        });
                    }
                    // KHÔNG PUSH GT, LN, VAT VÀO ĐÂY NỮA
                }
            }

            if (!hasMappedNorm) {
                insertPayload.push({
                    project_id: projectId, qto_item_id: qto.id, category: 'VL',
                    material_name: qto.item_name || 'Vật tư chưa rõ', quantity: taskVol, unit: qto.unit || 'Lần',
                    unit_price: qto.unit_price || 0, is_mapped: false, dimensions: { norm: 1 }
                });
            }
        }

        if (insertPayload.length > 0) {
            await supabase.from('estimation_items').insert(insertPayload);
        }

        // ✅ TẠO 3 BIẾN TOÀN CỤC CHO DỰ ÁN (Nếu chưa có)
        const { data: existingGlobals } = await supabase.from('estimation_items').select('category').eq('project_id', projectId).in('category', ['GT', 'LN', 'VAT']);
        const existingCategories = existingGlobals?.map(e => e.category) || [];
        const globalPayload: any[] = [];

        if (!existingCategories.includes('GT')) globalPayload.push({ project_id: projectId, qto_item_id: null, category: 'GT', material_name: 'Chi phí gián tiếp (quản lý, lán trại...)', quantity: 10, unit: '%', unit_price: 0, is_mapped: true });
        if (!existingCategories.includes('LN')) globalPayload.push({ project_id: projectId, qto_item_id: null, category: 'LN', material_name: 'Lợi nhuận định mức dự kiến', quantity: 12, unit: '%', unit_price: 0, is_mapped: true });
        if (!existingCategories.includes('VAT')) globalPayload.push({ project_id: projectId, qto_item_id: null, category: 'VAT', material_name: 'Thuế giá trị gia tăng (VAT)', quantity: 10, unit: '%', unit_price: 0, is_mapped: true });

        if (globalPayload.length > 0) {
            await supabase.from('estimation_items').insert(globalPayload);
        }

        return { success: true, message: `Đồng bộ thành công! Kéo được ${taskCount} công tác.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}