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
    try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();

        const insertData = {
            project_id: projectId,
            qto_item_id: null, // Chi phí này không bám vào công tác bóc tách nào
            category: data.category || 'VL',
            material_name: data.material_name,
            original_name: data.original_name || data.material_name,
            quantity: data.quantity,
            unit: data.unit,
            unit_price: data.unit_price,
            total_cost: data.total_cost,
            is_mapped: data.is_mapped || false,
        };

        const { error } = await supabase
            .from('estimation_items')
            .insert(insertData);

        if (error) throw error;

        return { success: true, message: "Đã thêm chi phí phụ!" };
    } catch (e: any) {
        console.error("Lỗi createManualEstimationItem:", e);
        return { success: false, error: e.message };
    }
}

// ✅ HÀM MỚI: Dùng để lưu tỉ lệ % của GT, LN, VAT
export async function updateEstimationQuantity(itemId: string, projectId: string, quantity: number, category: string = '') {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // NẾU LÀ DỮ LIỆU MỚI TẠO (Mang ID giả temp-) -> THỰC HIỆN INSERT
    if (itemId.startsWith('temp-')) {
        const cat = category || itemId.split('-')[1].toUpperCase();

        let name = 'Chi phí';
        if (cat === 'GT') name = 'Chi phí chung (Quản lý, lán trại...)';
        if (cat === 'LN') name = 'Thu nhập chịu thuế tính trước (Lợi nhuận)';
        if (cat === 'VAT') name = 'Thuế giá trị gia tăng (VAT)';

        const { error } = await supabase.from('estimation_items').insert({
            project_id: projectId,
            qto_item_id: null, // Tham số hệ thống thì không bám vào công tác nào cả
            category: cat,
            original_name: name,
            material_name: name,
            quantity: quantity,
            unit: '%',
            unit_price: 0,
            is_mapped: true
        });

        if (error) return { success: false, error: error.message };
        return { success: true };
    }

    // NẾU ĐÃ CÓ ID THẬT TRONG DATABASE -> THỰC HIỆN UPDATE BÌNH THƯỜNG
    const { error } = await supabase.from('estimation_items').update({ quantity }).eq('id', itemId);
    if (error) return { success: false, error: error.message };

    return { success: true };
}

// ============================================================================
// 1. HÀM BÓC TÁCH VẬT TƯ CHO 1 CÔNG TÁC (TẠO HAO PHÍ KHI CÓ MÃ ĐỊNH MỨC)
// ============================================================================
export async function analyzeSingleQTOItem(qtoId: string, projectId: string, currentTaskVol: number = 0) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // 1. Lấy thông tin công tác (Đã có sẵn parent_id nhờ hàm addManualQTOItem của anh)
        const { data: qto } = await supabase.from('qto_items').select('*').eq('id', qtoId).single();
        if (!qto || !qto.norm_code) return { success: false, error: "Chưa có mã định mức" };

        // 🔴 ĐÂY LÀ ĐIỂM QUYẾT ĐỊNH: Dùng parent_id để truy tìm tên Hạng mục cha
        let sectionName = 'Hạng mục chung';
        if (qto.parent_id) {
            const { data: parentSection } = await supabase.from('qto_items').select('item_name').eq('id', qto.parent_id).single();
            if (parentSection) {
                sectionName = parentSection.item_name;
            }
        }

        // 2. Lấy định mức
        const { data: normData } = await supabase.from('norms')
            .select('*, norm_details ( quantity, resource:resources ( id, code, name, unit, unit_price ) )')
            .eq('code', qto.norm_code).maybeSingle();

        if (!normData || !normData.norm_details) return { success: true };

        const factor = Number(normData.conversion_factor) || 1;
        const taskVol = currentTaskVol / factor;
        const insertPayload: any[] = [];

        // Xóa hao phí cũ
        await supabase.from('estimation_items').delete().eq('qto_item_id', qtoId);

        // 3. Chuẩn bị dữ liệu Hao phí
        for (const detail of normData.norm_details) {
            const res = detail.resource || detail.resources;
            if (!res) continue;

            let category = 'VL';
            const codeUpper = res.code?.toUpperCase() || "";
            const nameLower = res.name?.toLowerCase() || "";
            if (codeUpper.startsWith('N') || nameLower.includes('nhân công') || nameLower.includes('thợ')) category = 'NC';
            else if (codeUpper.startsWith('M') || nameLower.includes('máy')) category = 'M';

            insertPayload.push({
                project_id: projectId,
                qto_item_id: qto.id,
                section_name: sectionName, // 🔴 LƯU TÊN HẠNG MỤC ĐỂ TAB 4 GOM NHÓM ĐÚNG
                category: category,
                original_name: res.name,
                material_code: res.code,
                material_name: res.name,
                unit_price: res.unit_price || 0,
                is_mapped: true,
                quantity: taskVol * Number(detail.quantity),
                unit: res.unit,
                dimensions: { norm: Number(detail.quantity), factor: factor }
            });
        }

        // 4. Lưu vào DB
        if (insertPayload.length > 0) {
            await supabase.from('estimation_items').insert(insertPayload);
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ============================================================================
// 2. HÀM ĐỒNG BỘ KHỐI LƯỢNG (NHẬP DÀI RỘNG CAO -> CẬP NHẬT HAO PHÍ)
// ============================================================================
export async function syncTaskVolumeAndEstimations(taskId: string, newTaskVol: number) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // 1. Lấy thông tin công tác hiện tại
    const { data: qto } = await supabase.from('qto_items').select('*').eq('id', taskId).single();
    if (!qto) return { success: false };

    // 2. Lấy danh sách hao phí của công tác
    const { data: estItems } = await supabase.from('estimation_items').select('*').eq('qto_item_id', taskId);

    // LOGIC THÔNG MINH: Nếu công tác chưa có Hao phí nhưng lại CÓ mã định mức -> Bóc tách ngay!
    if ((!estItems || estItems.length === 0) && qto.norm_code) {
        await analyzeSingleQTOItem(taskId, qto.project_id, newTaskVol);
    }
    // Nếu đã có Hao phí -> Tính lại tỷ lệ khối lượng
    else if (estItems && estItems.length > 0) {
        const oldVol = Number(qto.quantity) || 0;

        for (const item of estItems) {
            let newQty = 0;
            // Dùng chuẩn định mức JSON để tính toán (Chính xác tuyệt đối)
            if (item.dimensions && item.dimensions.norm !== undefined) {
                const norm = Number(item.dimensions.norm) || 0;
                const factor = Number(item.dimensions.factor) || 1;
                newQty = (newTaskVol / factor) * norm;
            } else {
                // Tính tỷ lệ cho hao phí nhập tay
                newQty = oldVol === 0 ? 0 : (Number(item.quantity) / oldVol) * newTaskVol;
            }

            await supabase.from('estimation_items').update({ quantity: newQty }).eq('id', item.id);
        }
    }

    // 3. Chốt khối lượng tổng vào QTO
    await supabase.from('qto_items').update({ quantity: newTaskVol }).eq('id', taskId);
    return { success: true };
}


// ✅ HÀM MỚI: Áp giá hàng loạt từ Bảng Tổng hợp Vật tư/Nhân công/Máy
export async function updateEstimationPriceByGroup(projectId: string, materialName: string, category: string, price: number) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Cập nhật toàn bộ các dòng có cùng tên vật tư và cùng category (VL/NC/M)
    const { error } = await supabase
        .from('estimation_items')
        .update({ unit_price: price })
        .eq('project_id', projectId)
        .eq('material_name', materialName)
        .eq('category', category);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ✅ HÀM MỚI: Đổi mã vật tư hàng loạt từ Bảng Tổng Hợp
export async function updateEstimationMaterialByGroup(projectId: string, oldMaterialName: string, category: string, newMaterial: any) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase
        .from('estimation_items')
        .update({
            is_mapped: true,
            material_code: newMaterial.code,
            material_name: newMaterial.name,
            unit: newMaterial.unit,
            unit_price: newMaterial.ref_price || 0
        })
        .eq('project_id', projectId)
        .eq('material_name', oldMaterialName)
        .eq('category', category);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// =========================================================================
// ĐẨY DỮ LIỆU TỪ DỰ TOÁN SANG KẾ HOẠCH WBS (TẠO PV VÀ THỨ TỰ)
// =========================================================================
export async function syncCostToWBS(projectId: string) {
    try {
        const supabase = await createClient();

        // Lấy dữ liệu Dự toán
        const { data: estItems } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);
        const { data: qtoItems } = await supabase.from('qto_items').select('id, item_name, parent_id').eq('project_id', projectId);
        const { data: tasks } = await supabase.from('project_tasks').select('*').eq('project_id', projectId);

        if (!estItems || !tasks) throw new Error("Thiếu dữ liệu để đồng bộ");

        // Quét từng Task để nạp tiền
        for (const task of tasks) {
            if (task.parent_id) { // Chỉ tính tiền cho Task con
                // Tìm dòng QTO tương ứng với Task này
                const qtoItem = qtoItems?.find(q => q.item_name === task.name);
                if (qtoItem) {
                    // Lấy tất cả vật tư, nhân công thuộc QTO item này
                    const relatedEst = estItems.filter(e => e.qto_item_id === qtoItem.id);

                    // Tính Tổng Chi Phí (Cost)
                    const totalCost = relatedEst.reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0);
                    // Tiền Doanh thu (Revenue) = Chi phí x Hệ số lợi nhuận (nếu có, ví dụ anh setup trong bảng dự toán)

                    await supabase.from('project_tasks').update({
                        planned_cost: totalCost,
                        // contract_revenue: revenue // Nếu anh có cột doanh thu riêng
                    }).eq('id', task.id);
                }
            }
        }

        // Sau đó chạy hàm tính tổng tiền từ Task Con cuộn ngược lên Task Cha (Rollup Cost)
        // ...

        return { success: true, message: "Đã chốt giá và nạp Ngân sách (Chi phí/Doanh thu) vào WBS!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

