"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Heplper
async function getProjectWarehouseId(projectId: string, supabase: any) {
    // Cách 1: Tìm trong bảng warehouses xem kho nào thuộc project này
    const { data, error } = await supabase
        .from('warehouses')
        .select('id')
        .eq('project_id', projectId) // Đảm bảo bảng warehouses có cột project_id
        .single();

    if (error || !data) {
        console.error("Không tìm thấy kho cho dự án này:", projectId);
        return null;
    }
    return data.id;
}

// --- 1. LẤY NGUỒN VẬT TƯ TỪ NGÂN SÁCH ---
export async function getAvailableMaterials(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('project_material_budget')
        .select('material_name, unit, budget_quantity')
        .eq('project_id', projectId)
        .order('material_name');

    if (error) {
        console.error("Lỗi getAvailableMaterials:", error.message);
        return [];
    }
    return data || [];
}

// --- 2. TẠO PHIẾU YÊU CẦU MỚI ---
export async function createMaterialRequest(
    projectId: string,
    note: string,
    items: any[],
    deliveryDate: Date | undefined
    // ❌ Bỏ tham số warehouseId ở đây
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // ✅ TỰ ĐỘNG LẤY KHO CỦA DỰ ÁN
    const warehouseId = await getProjectWarehouseId(projectId, supabase);

    if (!warehouseId) {
        return { success: false, error: "Dự án này chưa được gán Kho (Site Warehouse). Vui lòng kiểm tra lại cấu hình Dự án." };
    }

    // 1. Tạo Header
    const code = `MR-${Date.now().toString().slice(-6)}`;

    const { data: req, error: reqError } = await supabase
        .from('material_requests')
        .insert({
            project_id: projectId,
            requester_id: user?.id,
            code: code,
            status: 'pending',
            notes: note,
            deadline_date: deliveryDate ? deliveryDate.toISOString() : null,
            destination_warehouse_id: warehouseId // ✅ Tự động điền
        })
        .select()
        .single();

    if (reqError) return { success: false, error: reqError.message };

    // 2. Tạo Items (Giữ nguyên)
    if (items.length > 0) {
        const itemsData = items.map(item => ({
            request_id: req.id,
            item_name: item.material_name || item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            notes: item.note
        }));

        const { error: itemsError } = await supabase.from('material_request_items').insert(itemsData);
        if (itemsError) return { success: false, error: itemsError.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã tạo yêu cầu thành công!" };
}

// --- 3. LẤY LỊCH SỬ YÊU CẦU ---
export async function getProjectRequests(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('material_requests')
        .select(`
            *,
            items:material_request_items (*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Lỗi getProjectRequests:", error.message);
        return [];
    }
    return data || [];
}

// --- 4. CẬP NHẬT PHIẾU YÊU CẦU (Đã có updated_at) ---
export async function updateMaterialRequest(
    requestId: string,
    projectId: string,
    note: string,
    items: any[],
    deliveryDate: Date | undefined
    // ❌ Bỏ tham số warehouseId
) {
    const supabase = await createClient();

    // 1. Update Header (Không cần update kho vì kho gắn liền dự án, không đổi được)
    const { error: reqError } = await supabase
        .from('material_requests')
        .update({
            notes: note,
            deadline_date: deliveryDate ? deliveryDate.toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (reqError) return { success: false, error: reqError.message };

    // 2. Xử lý Items (Giữ nguyên)
    await supabase.from('material_request_items').delete().eq('request_id', requestId);

    if (items.length > 0) {
        const itemsData = items.map(item => ({
            request_id: requestId,
            item_name: item.material_name || item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            notes: item.note
        }));
        const { error: itemsError } = await supabase.from('material_request_items').insert(itemsData);
        if (itemsError) return { success: false, error: itemsError.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật yêu cầu!" };
}

// --- 5. XÓA PHIẾU YÊU CẦU ---
export async function deleteMaterialRequest(requestId: string, projectId: string) {
    const supabase = await createClient();

    try {
        // A. Kiểm tra trạng thái
        const { data: currentReq } = await supabase
            .from('material_requests')
            .select('status')
            .eq('id', requestId)
            .single();

        if (currentReq?.status !== 'pending') {
            return { success: false, error: "Không thể xóa phiếu đã được xử lý." };
        }

        // B. Xóa Items trước
        await supabase.from('material_request_items').delete().eq('request_id', requestId);

        // C. Xóa Header
        const { error } = await supabase.from('material_requests').delete().eq('id', requestId);

        if (error) throw new Error(error.message);

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã xóa phiếu yêu cầu." };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 6. DUYỆT / TỪ CHỐI (Dùng cho role Manager) ---
export async function updateRequestStatus(requestId: string, projectId: string, status: 'approved' | 'rejected') {
    const supabase = await createClient();

    // Check quyền (Tạm thời bỏ qua, sau này bạn có thể check role ở đây)
    // const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('material_requests')
        .update({
            status: status,
            // approver_id: user?.id, // Nếu muốn lưu người duyệt
            // approved_at: new Date().toISOString(), // Nếu muốn lưu ngày duyệt
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/procurement`);

    return { success: true, message: `Đã cập nhật trạng thái thành: ${status === 'approved' ? 'Đã duyệt' : 'Từ chối'}` };
}
