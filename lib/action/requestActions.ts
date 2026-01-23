"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";

// ==============================================================================
// PHẦN 1: CÁC HÀM GET (LẤY DỮ LIỆU)
// ==============================================================================

// 1. Lấy danh sách Yêu cầu của Dự án (Lịch sử)
export async function getProjectRequests(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`
            *,
            requester:employees!requester_id(name),
            items:material_request_items(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

// 2. Lấy chi tiết một Yêu cầu (Cho trang Edit/Detail)
export async function getMaterialRequestById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`
            *,
            requester:employees!requester_id(id, name),
            items:material_request_items(*)
        `)
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

// 3. Lấy nguồn vật tư khả dụng (Từ ngân sách/Dự toán) - Helper cho dropdown chọn vật tư
export async function getAvailableMaterials(projectId: string) {
    const supabase = await createClient();
    // Ưu tiên lấy từ Budget, nếu không có thì lấy list trống hoặc list vật tư chuẩn
    const { data } = await supabase
        .from('project_material_budget')
        .select('material_name, unit')
        .eq('project_id', projectId)
        .order('material_name');
    return data || [];
}

// 4. Lấy danh sách Kho của Dự án (Để chọn kho nhận)
export async function getProjectWarehouses(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('project_id', projectId);
    return data || [];
}

// ==============================================================================
// PHẦN 2: CÁC HÀM ACTION (TẠO, SỬA, XÓA, DUYỆT)
// ==============================================================================

// 5. TẠO YÊU CẦU MỚI (Action chuẩn dùng Zod)
export async function createMaterialRequestAction(
    projectId: string,
    data: MaterialRequestFormValues
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // Validate lại lần nữa ở Server
        const validated = materialRequestSchema.safeParse(data);
        if (!validated.success) return { success: false, error: "Dữ liệu lỗi: " + validated.error.message };

        const payload = validated.data;

        // A. Tạo Header
        const code = `MR-${Date.now().toString().slice(-6)}`;
        const { data: req, error: reqError } = await supabase
            .from('material_requests')
            .insert({
                project_id: projectId,
                code: code,
                requester_id: user?.id, // ID người tạo (cần map với employee nếu bảng yêu cầu FK employee)
                created_by: user?.id,
                status: 'pending',

                // --- MAP FIELD CHUẨN ---
                priority: payload.priority,
                deadline_date: payload.deadline_date.toISOString(),
                destination_warehouse_id: payload.destination_warehouse_id || null,
                notes: payload.notes
            })
            .select('id')
            .single();

        if (reqError) throw new Error("Lỗi tạo phiếu: " + reqError.message);

        // B. Tạo Items
        if (payload.items && payload.items.length > 0) {
            const itemsData = payload.items.map(item => ({
                request_id: req.id,
                // --- MAP FIELD CHUẨN ---
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase.from('material_request_items').insert(itemsData);
            if (itemsError) {
                // Rollback: Xóa header nếu lỗi item
                await supabase.from('material_requests').delete().eq('id', req.id);
                throw new Error("Lỗi lưu chi tiết: " + itemsError.message);
            }
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Tạo yêu cầu thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 6. CẬP NHẬT YÊU CẦU (Action chuẩn dùng Zod)
export async function updateMaterialRequestAction(id: string, data: any) {
    const supabase = await createClient();

    const validated = materialRequestSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu lỗi: " + validated.error.message };

    const payload = validated.data;

    try {
        // A. Update Header
        const { error: headerErr } = await supabase
            .from('material_requests')
            .update({
                deadline_date: payload.deadline_date.toISOString(),
                priority: payload.priority,
                notes: payload.notes,
                destination_warehouse_id: payload.destination_warehouse_id || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (headerErr) throw new Error("Lỗi cập nhật phiếu: " + headerErr.message);

        // B. Update Items (Chiến thuật: Xóa hết cũ -> Thêm mới)
        // Lưu ý: Nếu muốn giữ lịch sử item ID, cần logic phức tạp hơn (update từng dòng), 
        // nhưng với phiếu 'pending' thì xóa đi tạo lại là an toàn và nhanh nhất.
        if (payload.items && payload.items.length > 0) {
            await supabase.from('material_request_items').delete().eq('request_id', id);

            const items = payload.items.map((i: any) => ({
                request_id: id,
                item_name: i.item_name,
                unit: i.unit,
                quantity: i.quantity,
                notes: i.notes
            }));

            const { error: itemsErr } = await supabase.from('material_request_items').insert(items);
            if (itemsErr) throw new Error("Lỗi cập nhật chi tiết: " + itemsErr.message);
        }

        revalidatePath(`/projects/${payload.project_id}/requests/${id}`);
        return { success: true, message: "Cập nhật thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 7. XÓA YÊU CẦU
export async function deleteMaterialRequest(requestId: string, projectId: string) {
    const supabase = await createClient();

    try {
        // Check trạng thái
        const { data: currentReq } = await supabase.from('material_requests').select('status').eq('id', requestId).single();
        if (currentReq?.status !== 'pending') {
            return { success: false, error: "Chỉ được xóa phiếu đang chờ xử lý." };
        }

        // Xóa Items trước (Cascade delete thường tự xử lý, nhưng xóa tay cho chắc chắn)
        await supabase.from('material_request_items').delete().eq('request_id', requestId);

        // Xóa Header
        const { error } = await supabase.from('material_requests').delete().eq('id', requestId);
        if (error) throw new Error(error.message);

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã xóa phiếu yêu cầu." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 8. DUYỆT / TỪ CHỐI (Cho Quản lý)
export async function updateRequestStatus(requestId: string, projectId: string, status: 'approved' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('material_requests')
        .update({
            status: status,
            // approved_by: user?.id, // Uncomment nếu DB có cột này
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} phiếu yêu cầu.` };
}