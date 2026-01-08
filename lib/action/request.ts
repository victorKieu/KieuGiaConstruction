"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";
import { getCurrentSession } from "@/lib/supabase/session";

// --- 1. LẤY DANH SÁCH YÊU CẦU ---
export async function getMaterialRequests(projectId: string) {
    const supabase = await createClient();

    // ✅ FIX: Dùng tên khóa ngoại chính xác từ supabase.ts
    const { data, error } = await supabase
        .from("material_requests")
        .select(`
            *,
            requester:employees!material_requests_requester_id_fkey ( id, name ),
            items:material_request_items!material_request_items_request_id_fkey ( id )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Lỗi lấy danh sách:", error);
        return [];
    }

    return data.map((item: any) => ({
        ...item,
        item_count: item.items?.length || 0,
        // Fallback hiển thị nếu không có người yêu cầu
        requester_name: item.requester?.name || "---"
    }));
}

// --- 2. LẤY CHI TIẾT 1 PHIẾU ---
export async function getMaterialRequestById(id: string) {
    const supabase = await createClient();

    // Sử dụng maybeSingle() để tránh lỗi crash khi không tìm thấy
    const { data, error } = await supabase
        .from("material_requests")
        .select(`
            *,
            requester:employees ( id, name, email ),
            project:projects ( id, name, code ),
            warehouse:warehouses ( id, name ),
            items:material_request_items ( * )
        `)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Lỗi query chi tiết phiếu:", error.message);
        return null;
    }

    if (!data) {
        console.warn(`Không tìm thấy phiếu yêu cầu với ID: ${id}`);
        return null;
    }

    return data;
}

// --- 3. TẠO YÊU CẦU MỚI ---
export async function createMaterialRequestAction(data: MaterialRequestFormValues) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Bạn chưa đăng nhập." };

    const supabase = await createClient();
    const validated = materialRequestSchema.safeParse(data);

    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ." };
    const payload = validated.data;

    try {
        // ✅ FIX: Đảm bảo có ID người tạo. 
        // Nếu user chưa link với nhân viên (entityId null), dùng tạm userId hoặc báo lỗi.
        const requesterId = session.entityId || session.userId;

        if (!requesterId) {
            return { success: false, error: "Không xác định được người dùng. Vui lòng đăng nhập lại." };
        }

        // Insert Header
        const { data: newReq, error: reqError } = await supabase
            .from("material_requests")
            .insert({
                code: payload.code,
                project_id: payload.project_id,
                requester_id: session.entityId || null, // Chỉ link nếu là nhân viên
                destination_warehouse_id: payload.destination_warehouse_id || null,
                deadline_date: payload.deadline_date.toISOString(),
                priority: payload.priority,
                notes: payload.notes,
                status: "pending",
                request_date: new Date().toISOString()
            })
            .select("id")
            .single();

        if (reqError) throw new Error("Lỗi tạo phiếu: " + reqError.message);

        // Insert Items
        if (payload.items && payload.items.length > 0) {
            const itemsData = payload.items.map(item => ({
                request_id: newReq.id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase
                .from("material_request_items")
                .insert(itemsData);

            if (itemsError) throw new Error("Lỗi lưu vật tư: " + itemsError.message);
        }

        revalidatePath(`/projects/${payload.project_id}`);
        return { success: true, message: "Tạo yêu cầu thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. CẬP NHẬT YÊU CẦU (EDIT) ---
export async function updateMaterialRequestAction(requestId: string, data: MaterialRequestFormValues) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Bạn chưa đăng nhập." };

    const supabase = await createClient();
    const validated = materialRequestSchema.safeParse(data);

    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ." };
    const payload = validated.data;

    try {
        // 1. Update Header
        const { error: headerError } = await supabase
            .from("material_requests")
            .update({
                destination_warehouse_id: payload.destination_warehouse_id || null,
                deadline_date: payload.deadline_date.toISOString(),
                priority: payload.priority,
                notes: payload.notes,
            })
            .eq("id", requestId);

        if (headerError) throw new Error(headerError.message);

        // 2. Update Items (Xóa cũ -> Thêm mới)
        await supabase.from("material_request_items").delete().eq("request_id", requestId);

        if (payload.items && payload.items.length > 0) {
            const itemsData = payload.items.map(item => ({
                request_id: requestId,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase
                .from("material_request_items")
                .insert(itemsData);

            if (itemsError) throw new Error("Lỗi cập nhật vật tư: " + itemsError.message);
        }

        revalidatePath(`/projects/${payload.project_id}`);
        revalidatePath(`/projects/${payload.project_id}/requests/${requestId}`);

        return { success: true, message: "Cập nhật yêu cầu thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. CẬP NHẬT TRẠNG THÁI ---
export async function updateRequestStatusAction(id: string, status: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("material_requests")
        .update({ status: status })
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Đã cập nhật trạng thái: ${status}` };
}

// --- 6. XÓA PHIẾU ---
export async function deleteMaterialRequestAction(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("material_requests")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa phiếu yêu cầu." };
}

// --- Helper: Lấy danh sách kho ---
export async function getProjectWarehouses(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("is_active", true);
    return data || [];
}