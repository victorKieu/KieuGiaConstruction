"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";

// ==============================================================================
// PHẦN 1: CÁC HÀM GET (LẤY DỮ LIỆU) - Giữ nguyên, đã chuẩn
// ==============================================================================

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

export async function getAvailableMaterials(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('project_material_budget')
        .select('material_name, unit')
        .eq('project_id', projectId)
        .order('material_name');
    return data || [];
}

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

// 5. TẠO YÊU CẦU MỚI (Action cũ dùng Zod - Dành cho luồng Project)
export async function createMaterialRequestAction(
    projectId: string,
    data: MaterialRequestFormValues
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Vui lòng đăng nhập." };

    try {
        // ✅ FIX 1: Lấy ID gốc của employee thay vì dùng auth_id
        const { data: employee } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
        if (!employee) return { success: false, error: "Không tìm thấy hồ sơ nhân sự." };

        const validated = materialRequestSchema.safeParse(data);
        if (!validated.success) return { success: false, error: "Dữ liệu lỗi: " + validated.error.message };

        const payload = validated.data;
        const code = `MR-${Date.now().toString().slice(-6)}`;

        // A. Tạo Header
        const { data: req, error: reqError } = await supabase
            .from('material_requests')
            .insert({
                project_id: projectId,
                code: code,
                requester_id: employee.id, // ✅ Đã sửa
                created_by: employee.id,   // ✅ Đã sửa
                status: 'pending',
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
                item_name: item.item_name,
                item_category: 'material', // Mặc định luồng cũ là vật tư
                unit: item.unit,
                quantity: item.quantity,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase.from('material_request_items').insert(itemsData);
            if (itemsError) {
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

// 6. CẬP NHẬT YÊU CẦU (Action cũ dùng Zod)
export async function updateMaterialRequestAction(id: string, data: any) {
    const supabase = await createClient();

    const validated = materialRequestSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu lỗi: " + validated.error.message };

    const payload = validated.data;

    try {
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

        if (payload.items && payload.items.length > 0) {
            await supabase.from('material_request_items').delete().eq('request_id', id);

            const items = payload.items.map((i: any) => ({
                request_id: id,
                item_name: i.item_name,
                item_category: i.item_category || 'material',
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
export async function deleteMaterialRequest(requestId: string, projectId?: string) {
    const supabase = await createClient();

    try {
        const { data: currentReq } = await supabase.from('material_requests').select('status').eq('id', requestId).single();
        if (currentReq?.status !== 'pending') {
            return { success: false, error: "Chỉ được xóa phiếu đang chờ xử lý." };
        }

        await supabase.from('material_request_items').delete().eq('request_id', requestId);
        const { error } = await supabase.from('material_requests').delete().eq('id', requestId);
        if (error) throw new Error(error.message);

        if (projectId) revalidatePath(`/projects/${projectId}`);
        revalidatePath('/requests'); // Revalidate luôn trang tổng

        return { success: true, message: "Đã xóa phiếu yêu cầu." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 8. DUYỆT / TỪ CHỐI (Cho Ban Giám Đốc)
export async function updateRequestStatus(requestId: string, status: 'approved' | 'rejected', projectId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // ✅ FIX 2: Lấy ID của người duyệt (BOD)
        let approverId = null;
        if (user) {
            const { data: employee } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
            if (employee) approverId = employee.id;
        }

        const { error } = await supabase
            .from('material_requests')
            .update({
                status: status,
                approved_by: approverId, // Cột này nếu có trong DB sẽ được cập nhật chuẩn
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) throw error;

        if (projectId) revalidatePath(`/projects/${projectId}`);
        revalidatePath('/requests');

        return { success: true, message: `Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} phiếu yêu cầu.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ==============================================================================
// 9. TẠO YÊU CẦU MUA SẮM TÀI SẢN & VẬT TƯ (Luồng mới Đa Kho - Dùng FormData)
// ==============================================================================
export async function createPurchaseRequest(formData: FormData, items: any[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Vui lòng đăng nhập." };

        const { data: employee } = await supabase
            .from('employees')
            .select('id, department_id')
            .eq('auth_id', user.id)
            .single();

        if (!employee) return { success: false, error: "Không tìm thấy thông tin nhân sự." };

        // ✅ FIX 3: Ghép title và reason thành "notes" để khớp với Schema Database
        const title = formData.get("title") as string;
        const reason = formData.get("reason") as string;
        const priority = formData.get("priority") as string;
        const expected_date = formData.get("expected_date") as string;
        const destination_warehouse_id = formData.get("destination_warehouse_id") as string;

        const combinedNotes = `[${title}]\nLý do: ${reason}`; // Ghép chuỗi

        if (!destination_warehouse_id) {
            return { success: false, error: "BẮT BUỘC: Vui lòng chọn Kho nhận hàng." };
        }

        if (!items || items.length === 0) {
            return { success: false, error: "Vui lòng thêm ít nhất 1 mặt hàng cần mua." };
        }

        const code = `MR-${Date.now().toString().slice(-6)}`;

        const requestData = {
            code: code,
            requester_id: employee.id,
            created_by: employee.id,
            department_id: employee.department_id,
            destination_warehouse_id,
            priority,
            deadline_date: expected_date ? new Date(expected_date).toISOString() : new Date().toISOString(), // Đổi sang deadline_date
            notes: combinedNotes, // Đẩy vào notes
            status: 'pending',
        };

        const { data: newRequest, error: reqError } = await supabase
            .from('material_requests')
            .insert(requestData)
            .select('id')
            .single();

        if (reqError) throw reqError;

        const requestItemsData = items.map(item => ({
            request_id: newRequest.id,
            item_name: item.name,
            item_category: item.category, // Cột này cần có trong DB để phân biệt Asset/Material
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'Cái',
            estimated_price: Number(item.estimatedPrice) || 0, // Cột này cần có trong DB
            notes: item.note || ''
        }));

        const { error: itemsError } = await supabase
            .from('material_request_items')
            .insert(requestItemsData);

        if (itemsError) {
            await supabase.from('material_requests').delete().eq('id', newRequest.id);
            throw itemsError;
        }

        revalidatePath('/requests');
        return { success: true, message: "Đã gửi phiếu đề xuất mua sắm thành công! Chờ Quản lý duyệt." };

    } catch (error: any) {
        console.error("[SERVER_ERROR] createPurchaseRequest:", error);
        return { success: false, error: "Lỗi hệ thống khi tạo phiếu yêu cầu." };
    }
}