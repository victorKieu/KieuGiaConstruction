"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/supabase/session";

export async function getEstimationItems(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('estimation_items').select('*').eq('project_id', projectId).order('material_name', { ascending: true });
    if (error) return { success: false, data: [] };
    return { success: true, data: data || [] };
}

export async function createEstimationFromBudget(projectId: string) {
    const supabase = await createClient();
    try {
        const { data: budgetItems, error: budgetError } = await supabase.from('project_material_budget').select('*').eq('project_id', projectId);
        if (budgetError) throw new Error("Lỗi đọc bảng vật tư: " + budgetError.message);
        if (!budgetItems || budgetItems.length === 0) return { success: false, error: "Bảng trống." };

        const { data: currentEstimates } = await supabase.from('estimation_items').select('category, material_name, unit_price').eq('project_id', projectId);
        const priceMap = new Map<string, number>();
        currentEstimates?.forEach(e => {
            if (e.unit_price) { priceMap.set(`${e.category || ''}_${e.material_name}`, e.unit_price); priceMap.set(`_${e.material_name}`, e.unit_price); }
        });

        const insertData = budgetItems.map(item => {
            const exactKey = `${item.category || ''}_${item.material_name}`;
            const backupKey = `_${item.material_name}`;
            return {
                project_id: projectId, category: item.category, material_name: item.material_name,
                material_code: item.material_code, unit: item.unit, quantity: item.budget_quantity,
                unit_price: priceMap.get(exactKey) || priceMap.get(backupKey) || 0,
            };
        });

        await supabase.from('estimation_items').delete().eq('project_id', projectId);
        await supabase.from('estimation_items').insert(insertData);
        return { success: true, message: `Đã đồng bộ ${insertData.length} hạng mục!` };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateEstimationPrice(itemId: string, projectId: string, price: number) {
    const supabase = await createClient();
    await supabase.from('estimation_items').update({ unit_price: price }).eq('id', itemId);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function getCostTemplates() { return { success: true, data: [] }; }

export async function createEstimationFromMacro(projectId: string, items: any[]) {
    const supabase = await createClient();
    try {
        const insertData = items.map(item => ({ project_id: projectId, material_code: item.code, material_name: item.name, unit: item.unit, quantity: 0, unit_price: 0 }));
        await supabase.from('estimation_items').insert(insertData);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Đã thêm ${items.length} công tác vào dự toán!` };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteEstimationItem(itemId: string, projectId: string) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };
    const supabase = await createClient();
    await supabase.from('estimation_items').delete().eq('id', itemId);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa đầu mục." };
}

export async function createManualEstimationItem(projectId: string, data: any) {
    try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const insertData = {
            project_id: projectId, qto_item_id: null, category: data.category || 'VL',
            material_name: data.material_name, original_name: data.original_name || data.material_name,
            quantity: data.quantity, unit: data.unit, unit_price: data.unit_price, is_mapped: data.is_mapped || false,
        };
        await supabase.from('estimation_items').insert(insertData);
        return { success: true, message: "Đã thêm chi phí phụ!" };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateEstimationQuantity(itemId: string, projectId: string, quantity: number, category: string = '') {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    if (itemId.startsWith('temp-')) {
        const cat = category || itemId.split('-')[1].toUpperCase();
        let name = 'Chi phí';
        if (cat === 'GT') name = 'Chi phí chung (Quản lý, lán trại...)';
        if (cat === 'LN') name = 'Thu nhập chịu thuế tính trước (Lợi nhuận)';
        if (cat === 'VAT') name = 'Thuế giá trị gia tăng (VAT)';
        await supabase.from('estimation_items').insert({
            project_id: projectId, qto_item_id: null, category: cat, original_name: name, material_name: name, quantity: quantity, unit: '%', unit_price: 0, is_mapped: true
        });
        return { success: true };
    }
    await supabase.from('estimation_items').update({ quantity }).eq('id', itemId);
    return { success: true };
}

export async function analyzeSingleQTOItem(qtoId: string, projectId: string, currentTaskVol: number = 0) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    try {
        const { data: qto } = await supabase.from('qto_items').select('*').eq('id', qtoId).single();
        if (!qto || !qto.norm_code) return { success: false, error: "Chưa có mã định mức" };

        let sectionName = 'Hạng mục chung';
        if (qto.parent_id) {
            const { data: parentSection } = await supabase.from('qto_items').select('item_name').eq('id', qto.parent_id).single();
            if (parentSection) sectionName = parentSection.item_name;
        }

        const { data: normData } = await supabase.from('norms').select('*, norm_details ( quantity, resource:resources ( id, code, name, unit, unit_price ) )').eq('code', qto.norm_code).maybeSingle();
        if (!normData || !normData.norm_details) return { success: true };

        const factor = Number(normData.conversion_factor) || 1;
        const taskVol = currentTaskVol / factor;
        const insertPayload: any[] = [];
        await supabase.from('estimation_items').delete().eq('qto_item_id', qtoId);

        // AUTO-MAP: Lấy các hao phí đã từng map để gán tự động
        const { data: existingMappings } = await supabase.from('estimation_items').select('original_name, material_code, material_name, unit, dimensions').eq('project_id', projectId).eq('is_mapped', true);
        const mapDict = new Map();
        existingMappings?.forEach(m => mapDict.set(m.original_name, m));

        for (const detail of normData.norm_details) {
            const res = detail.resource || detail.resources;
            if (!res) continue;
            let category = 'VL';
            const codeUpper = res.code?.toUpperCase() || ""; const nameLower = res.name?.toLowerCase() || "";
            if (codeUpper.startsWith('N') || nameLower.includes('nhân công') || nameLower.includes('thợ')) category = 'NC';
            else if (codeUpper.startsWith('M') || nameLower.includes('máy')) category = 'M';

            const rawQty = taskVol * Number(detail.quantity);
            const exist = mapDict.get(res.name); // Kiểm tra xem tên vật tư này đã map chưa

            if (exist) {
                insertPayload.push({
                    project_id: projectId, qto_item_id: qto.id, section_name: sectionName, category: category,
                    original_name: res.name,
                    material_code: exist.material_code, material_name: exist.material_name, unit: exist.unit,
                    unit_price: 0, is_mapped: true, // Giá sẽ để trống, tự tính ở bước sau
                    quantity: rawQty, dimensions: { ...exist.dimensions, norm: Number(detail.quantity), factor: factor, raw_quantity: rawQty }
                });
            } else {
                insertPayload.push({
                    project_id: projectId, qto_item_id: qto.id, section_name: sectionName, category: category, original_name: res.name,
                    material_code: res.code, material_name: res.name, unit_price: res.unit_price || 0, is_mapped: false,
                    quantity: rawQty, unit: res.unit, dimensions: { norm: Number(detail.quantity), factor: factor, raw_quantity: rawQty }
                });
            }
        }
        if (insertPayload.length > 0) await supabase.from('estimation_items').insert(insertPayload);

        // GỌI CHẠY TÍNH TOÁN LẠI ĐƠN GIÁ SAU KHI THÊM LƯỢNG MỚI
        await recalculateProjectEffectivePrices(projectId);

        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function syncTaskVolumeAndEstimations(taskId: string, newTaskVol: number) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: qto } = await supabase.from('qto_items').select('*').eq('id', taskId).single();
    if (!qto) return { success: false };
    const { data: estItems } = await supabase.from('estimation_items').select('*').eq('qto_item_id', taskId);

    if ((!estItems || estItems.length === 0) && qto.norm_code) {
        await analyzeSingleQTOItem(taskId, qto.project_id, newTaskVol);
    } else if (estItems && estItems.length > 0) {
        const oldVol = Number(qto.quantity) || 0;
        for (const item of estItems) {
            let newQty = 0;
            if (item.dimensions && item.dimensions.norm !== undefined) {
                const norm = Number(item.dimensions.norm) || 0;
                const factor = Number(item.dimensions.factor) || 1;
                newQty = (newTaskVol / factor) * norm;
            } else {
                newQty = oldVol === 0 ? 0 : (Number(item.quantity) / oldVol) * newTaskVol;
            }
            const newDimensions = { ...(item.dimensions || {}), raw_quantity: newQty };
            await supabase.from('estimation_items').update({ quantity: newQty, dimensions: newDimensions }).eq('id', item.id);
        }
    }
    await supabase.from('qto_items').update({ quantity: newTaskVol }).eq('id', taskId);

    // GỌI CHẠY TÍNH TOÁN LẠI ĐƠN GIÁ SAU KHI ĐỔI LƯỢNG
    await recalculateProjectEffectivePrices(qto.project_id);

    return { success: true };
}

// TÍNH TOÁN LẠI ĐƠN GIÁ TOÀN DỰ ÁN CHO CÁC MÃ ĐÃ MAP
export async function recalculateProjectEffectivePrices(projectId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Lấy toàn bộ hao phí của dự án (trừ hao phí tổng mức GT, LN, VAT)
    const { data: estItems } = await supabase.from('estimation_items')
        .select('*').eq('project_id', projectId)
        .not('category', 'in', '("GT", "LN", "VAT")');

    if (!estItems || estItems.length === 0) return { success: true };

    const groups = new Map();
    estItems.forEach(item => {
        const key = `${item.category}_${item.material_name}`;
        if (!groups.has(key)) {
            const rate = Number(item.dimensions?.conversion_rate) || 1;

            // ✅ FIX TẠI ĐÂY: Tìm giá mua gốc. 
            // Nếu có lưu sẵn purchase_price thì lấy. Nếu chưa lưu, tự nội suy từ unit_price hiện tại.
            let pPrice = item.dimensions?.purchase_price;
            if (pPrice === undefined || pPrice === null) {
                // Nếu rate = 1 (không quy đổi), giá mua = giá hiện tại. 
                pPrice = rate === 1 ? Number(item.unit_price || 0) : (Number(item.unit_price || 0) * rate);
            } else {
                pPrice = Number(pPrice);
            }

            groups.set(key, {
                itemIds: [],
                totalRawQty: 0,
                rate: rate,
                purchasePrice: pPrice
            });
        }

        const group = groups.get(key);
        group.itemIds.push(item.id);
        const rawQty = item.dimensions?.raw_quantity !== undefined ? Number(item.dimensions.raw_quantity) : Number(item.quantity);
        group.totalRawQty += rawQty;
    });

    for (const [key, group] of Array.from(groups.entries())) {
        const { itemIds, totalRawQty, rate, purchasePrice } = group;

        // Mặc định đơn giá = giá mua / hệ số (Dành cho hàng không có hao hụt mua chẵn)
        let effectivePrice = rate > 0 ? purchasePrice / rate : purchasePrice;

        // Nếu có quy đổi và có số lượng -> Tính đơn giá cõng hao hụt
        if (rate > 1 && totalRawQty > 0) {
            const convertedQty = Math.ceil(totalRawQty / rate);
            const totalCost = convertedQty * purchasePrice;
            effectivePrice = totalCost / totalRawQty;
        }

        // Cập nhật lại db
        if (itemIds.length > 0) {
            await supabase.from('estimation_items').update({ unit_price: effectivePrice }).in('id', itemIds);
        }
    }
    return { success: true };
}

// ✅ LOGIC CỦA ANH ÁP DỤNG KHI NGƯỜI DÙNG NHẬP GIÁ TRỰC TIẾP Ở TAB 4
export async function updateEstimationPriceByGroup(projectId: string, materialName: string, category: string, inputPurchasePrice: number) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: items } = await supabase.from('estimation_items').select('*').eq('project_id', projectId).eq('material_name', materialName).eq('category', category);
    if (!items || items.length === 0) return { success: true };

    const rate = Number(items[0].dimensions?.conversion_rate) || 1;
    let totalRawQty = 0;
    items.forEach(i => totalRawQty += (i.dimensions?.raw_quantity !== undefined ? Number(i.dimensions.raw_quantity) : Number(i.quantity)));

    let effectivePrice = inputPurchasePrice / rate;
    if (rate > 1 && totalRawQty > 0) {
        const convertedQuantity = Math.ceil(totalRawQty / rate);
        const totalCost = convertedQuantity * inputPurchasePrice;
        effectivePrice = totalCost / totalRawQty;
    }

    for (const item of items) {
        // ✅ ĐÃ THÊM: Lưu lại giá người dùng mới gõ vào hệ thống
        const newDim = { ...(item.dimensions || {}), purchase_price: inputPurchasePrice };
        await supabase.from('estimation_items').update({ unit_price: effectivePrice, dimensions: newDim }).eq('id', item.id);
    }
    return { success: true };
}

// ✅ 2. KHI NGƯỜI DÙNG ĐỔI MÃ VẬT TƯ
export async function updateEstimationMaterialByGroup(projectId: string, oldMaterialName: string, category: string, newMaterialFromClient: any) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: masterMat } = await supabase.from('materials').select('*').eq('code', newMaterialFromClient.code).single();
    if (!masterMat) return { success: false, error: "Không tìm thấy vật tư chuẩn." };

    const { data: items } = await supabase.from('estimation_items').select('*').eq('project_id', projectId).eq('material_name', oldMaterialName).eq('category', category);
    if (!items || items.length === 0) return { success: true };

    let totalRawQty = 0;
    items.forEach(i => totalRawQty += (i.dimensions?.raw_quantity !== undefined ? Number(i.dimensions.raw_quantity) : Number(i.quantity)));

    const rate = Number(masterMat.conversion_rate) || 1;
    const minUnitPrice = Number(masterMat.ref_price) || 0;
    const purchasePrice = minUnitPrice * rate;

    let effectivePrice = minUnitPrice;
    if (rate > 1 && totalRawQty > 0) {
        const convertedQuantity = Math.ceil(totalRawQty / rate);
        const totalCost = convertedQuantity * purchasePrice;
        effectivePrice = totalCost / totalRawQty;
    }

    for (const item of items) {
        // ✅ ĐÃ THÊM: Lưu purchase_price vào dimensions để backend có thể giữ giá khi xóa công tác
        const newDimensions = {
            ...(item.dimensions || {}),
            conversion_rate: rate,
            purchase_unit: masterMat.purchase_unit || masterMat.unit,
            purchase_price: purchasePrice
        };
        await supabase.from('estimation_items').update({
            is_mapped: true, material_code: masterMat.code, material_name: masterMat.name,
            unit: masterMat.unit, unit_price: effectivePrice, dimensions: newDimensions
        }).eq('id', item.id);
    }
    return { success: true };
}

export async function syncCostToWBS(projectId: string) {
    try {
        const supabase = await createClient();
        const { data: estItems } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);
        const { data: qtoItems } = await supabase.from('qto_items').select('id, item_name, parent_id').eq('project_id', projectId);
        const { data: tasks } = await supabase.from('project_tasks').select('*').eq('project_id', projectId);
        if (!estItems || !tasks) throw new Error("Thiếu dữ liệu");

        for (const task of tasks) {
            if (task.parent_id) {
                const qtoItem = qtoItems?.find(q => q.item_name === task.name);
                if (qtoItem) {
                    const relatedEst = estItems.filter(e => e.qto_item_id === qtoItem.id);
                    const totalCost = relatedEst.reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);
                    await supabase.from('project_tasks').update({ planned_cost: totalCost }).eq('id', task.id);
                }
            }
        }
        return { success: true, message: "Đã chốt giá và nạp Ngân sách vào WBS!" };
    } catch (e: any) { return { success: false, error: e.message }; }
}