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
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // 1. DỌN DẸP BẢNG DỰ TOÁN CŨ CỦA DỰ ÁN NÀY
        const { error: delErr } = await supabase
            .from('estimation_items')
            .delete()
            .eq('project_id', projectId);

        if (delErr) throw new Error("Lỗi xóa dự toán cũ: " + delErr.message);

        // 2. KÉO DỮ LIỆU QTO
        const { data: qtoItems } = await supabase
            .from('qto_items')
            .select('*, details:qto_item_details(*)')
            .eq('project_id', projectId);

        if (!qtoItems) throw new Error("Không có dữ liệu bóc tách");

        const getVolume = (details: any[]) => {
            if (!details || details.length === 0) return 0;
            return details.reduce((sum: number, d: any) => {
                const l = parseFloat(d.length) || 0, w = parseFloat(d.width) || 0, h = parseFloat(d.height) || 0, f = parseFloat(d.quantity_factor) || 0;
                if (l === 0 && w === 0 && h === 0) return sum + f;
                return sum + ((l !== 0 ? l : 1) * (w !== 0 ? w : 1) * (h !== 0 ? h : 1) * (f !== 0 ? f : 1));
            }, 0);
        };

        const estimationArray: any[] = [];

        // 3. XỬ LÝ PHÂN TÍCH TỪNG CÔNG TÁC (KHÔNG GỘP CHUNG NỮA)
        for (const item of qtoItems) {
            if (item.item_type === 'section' || (!item.parent_id && !item.item_type)) continue;

            const itemVolume = getVolume(item.details);
            if (itemVolume === 0) continue;

            if (item.item_type === 'task' && item.norm_code) {
                // Kéo định mức của công tác này
                const { data: normDetails } = await supabase
                    .from('norm_details')
                    .select('*')
                    .eq('norm_code', item.norm_code);

                if (normDetails && normDetails.length > 0) {
                    // a. Add Vật liệu, Nhân công, Máy
                    for (const nd of normDetails) {
                        estimationArray.push({
                            project_id: projectId,
                            qto_item_id: item.id, // Gắn chặt với ID công tác
                            material_code: nd.resource_code || null,
                            material_name: nd.material_name,
                            unit: nd.unit,
                            quantity: itemVolume * parseFloat(nd.quantity_per_unit), // Khối lượng = KL Công tác x Định mức
                            unit_price: nd.price || 0,
                            category: nd.category, // 'material', 'labor', 'equipment'
                            section_name: item.item_name // Dùng cột này để lưu tên công tác tạm
                        });
                    }

                    // b. Add các dòng Chi phí Đuôi (GT, LN, VAT) theo chuẩn Dự toán
                    // (Lưu ý: Quantity để là 1, unit_price sẽ được tính bằng % của tổng trực tiếp ở Frontend/SQL)
                    estimationArray.push(
                        { project_id: projectId, qto_item_id: item.id, material_name: "Chi phí gián tiếp (quản lý, lán trại...)", unit: "%", quantity: 1, unit_price: 0, category: "GT" },
                        { project_id: projectId, qto_item_id: item.id, material_name: "Lợi nhuận dự kiến", unit: "%", quantity: 1, unit_price: 0, category: "LN" },
                        { project_id: projectId, qto_item_id: item.id, material_name: "Thuế giá trị gia tăng (VAT)", unit: "%", quantity: 1, unit_price: 0, category: "VAT" }
                    );
                }
            } else if (['material', 'labor', 'equipment'].includes(item.item_type)) {
                // Các công tác nhập tay
                estimationArray.push({
                    project_id: projectId, qto_item_id: item.id, material_name: item.item_name, unit: item.unit,
                    quantity: itemVolume, unit_price: item.unit_price || 0, category: item.item_type, section_name: item.item_name
                });
            }
        }

        // 4. LƯU VÀO DATABASE BẢNG CHI TIẾT
        if (estimationArray.length > 0) {
            const { error: insertErr } = await supabase.from('estimation_items').insert(estimationArray);
            if (insertErr) throw new Error("Lỗi khi lưu Bảng phân tích: " + insertErr.message);
        }

        return { success: true, message: `Đã phân tích chi tiết ${estimationArray.length} dòng hao phí!` };

    } catch (err: any) {
        return { success: false, error: err.message };
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

// --- 8. ADD LẤY DỮ LIỆU THỦ CÔNG ---
export async function addManualQTOItem(
    projectId: string,
    sectionId: string,
    newSectionName: string,
    itemName: string,
    unit: string,
    itemType: string,
    normCode: string = "" // ✅ Thêm tham số này
) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    let finalSectionId = sectionId;

    // Nếu tạo hạng mục mới
    if (sectionId === "NEW") {
        const { data: newSec, error: secErr } = await supabase.from('qto_items').insert({
            project_id: projectId, item_name: newSectionName, unit: '', item_type: 'section'
        }).select().single();
        if (secErr) return { success: false, error: secErr.message };
        finalSectionId = newSec.id;
    }

    // ✅ Lưu thêm cột norm_code
    const { error } = await supabase.from('qto_items').insert({
        project_id: projectId,
        parent_id: finalSectionId,
        item_name: itemName,
        unit: unit,
        item_type: itemType,
        norm_code: normCode || null // ✅ Lưu mã định mức vào đây
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ✅ HÀM MỚI: Sửa trực tiếp thông tin QTO Item (Tên, Đơn vị tính...)
export async function updateQTOItem(itemId: string, projectId: string, field: string, value: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase
        .from('qto_items')
        .update({ [field]: value })
        .eq('id', itemId);

    if (error) return { success: false, error: error.message };

    return { success: true };
}