"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";
import { format } from "date-fns"; // Import thêm format ngày tháng nếu chưa có

// 1. LẤY DANH SÁCH YÊU CẦU CỦA DỰ ÁN
export async function getMaterialRequests(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("material_requests")
        .select(`
        *,
        requester:employees (name),
        items:material_request_items (count)
    `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    return data || [];
}

// 2. LẤY CHI TIẾT 1 PHIẾU
export async function getMaterialRequestById(id: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("material_requests")
        .select(`
        *,
        requester:employees (*),
        project:projects (name, code),
        items:material_request_items (*)
    `)
        .eq("id", id)
        .single();

    return data;
}

// 3. TẠO PHIẾU YÊU CẦU MỚI
export async function createMaterialRequestAction(data: MaterialRequestFormValues) {
    const supabase = await createClient();

    // Validate
    const validated = materialRequestSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ" };

    const { items, ...reqData } = validated.data;

    // Lấy user hiện tại làm người đề xuất
    const { data: { user } } = await supabase.auth.getUser();
    // (Lưu ý: Bạn cần có logic map User Auth -> Employee ID. Ở đây tôi tạm bỏ qua requester_id nếu chưa có, hoặc bạn có thể gắn cứng 1 ID để test)

    // A. Tạo Header
    const { data: req, error: reqError } = await supabase.from("material_requests").insert({
        code: reqData.code,
        project_id: reqData.project_id,
        destination_warehouse_id: reqData.destination_warehouse_id,
        deadline_date: reqData.deadline_date.toISOString(),
        priority: reqData.priority,
        notes: reqData.notes,
        status: 'pending',
        // requester_id: ... (Xử lý sau)
        created_at: new Date().toISOString()
    }).select("id").single();

    if (reqError || !req) return { success: false, error: "Lỗi tạo phiếu: " + reqError?.message };

    // B. Tạo Items
    const itemsToInsert = items.map(item => ({
        request_id: req.id,
        item_name: item.item_name,
        unit: item.unit,
        quantity: item.quantity,
        notes: item.notes
    }));

    const { error: itemsError } = await supabase.from("material_request_items").insert(itemsToInsert);

    if (itemsError) {
        // Rollback
        await supabase.from("material_requests").delete().eq("id", req.id);
        return { success: false, error: "Lỗi lưu chi tiết: " + itemsError.message };
    }

    revalidatePath(`/projects/${reqData.project_id}/requests`);
    return { success: true, message: "Đã gửi yêu cầu thành công!" };
}

// 3.1 TỰ ĐỘNG LẤY MÃ KHO

export async function getProjectWarehouses(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("project_id", projectId); // Chỉ lấy kho của dự án này
    return data || [];
}

// 4. CẬP NHẬT PHIẾU YÊU CẦU (EDIT)
export async function updateMaterialRequestAction(id: string, data: MaterialRequestFormValues) {
    const supabase = await createClient();

    // Kiểm tra trạng thái hiện tại
    const { data: currentReq } = await supabase.from("material_requests").select("status").eq("id", id).single();

    if (!currentReq) return { success: false, error: "Phiếu không tồn tại" };
    if (currentReq.status !== 'pending') {
        return { success: false, error: "Chỉ được chỉnh sửa phiếu khi đang ở trạng thái Chờ duyệt!" };
    }

    const validated = materialRequestSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ" };

    const { items, ...reqData } = validated.data;

    // A. Update Header
    const { error: reqError } = await supabase.from("material_requests").update({
        code: reqData.code,
        // project_id: reqData.project_id, // Thường không cho đổi dự án
        destination_warehouse_id: reqData.destination_warehouse_id,
        deadline_date: reqData.deadline_date.toISOString(),
        priority: reqData.priority,
        notes: reqData.notes,
    }).eq("id", id);

    if (reqError) return { success: false, error: "Lỗi cập nhật: " + reqError.message };

    // B. Update Items (Xóa cũ -> Thêm mới)
    const { error: deleteError } = await supabase.from("material_request_items").delete().eq("request_id", id);
    if (deleteError) return { success: false, error: "Lỗi xóa chi tiết cũ" };

    const itemsToInsert = items.map(item => ({
        request_id: id,
        item_name: item.item_name,
        unit: item.unit,
        quantity: item.quantity,
        notes: item.notes
    }));

    const { error: insertError } = await supabase.from("material_request_items").insert(itemsToInsert);
    if (insertError) return { success: false, error: "Lỗi lưu chi tiết mới" };

    revalidatePath(`/projects/${reqData.project_id}/requests/${id}`);
    revalidatePath(`/projects/${reqData.project_id}`);
    return { success: true, message: "Cập nhật phiếu yêu cầu thành công!" };
}

// 5. XÓA PHIẾU YÊU CẦU
export async function deleteMaterialRequestAction(id: string, projectId: string) {
    const supabase = await createClient();

    // Kiểm tra trạng thái
    const { data: currentReq } = await supabase.from("material_requests").select("status").eq("id", id).single();

    if (!currentReq) return { success: false, error: "Phiếu không tồn tại" };
    if (currentReq.status !== 'pending' && currentReq.status !== 'rejected') {
        return { success: false, error: "Không thể xóa phiếu đã được Duyệt hoặc Đã mua hàng!" };
    }

    // Xóa (Cascade sẽ tự xóa items, nhưng ta xóa thủ công cho chắc chắn logic nếu cần)
    const { error } = await supabase.from("material_requests").delete().eq("id", id);

    if (error) return { success: false, error: "Lỗi xóa phiếu: " + error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa phiếu yêu cầu" };
}

// 6. DUYỆT / TỪ CHỐI (Cập nhật lại cho đầy đủ)
export async function updateRequestStatusAction(id: string, status: 'approved' | 'rejected', projectId: string) {
    const supabase = await createClient();

    // 1. Cập nhật trạng thái phiếu yêu cầu
    const { data: req, error: updateError } = await supabase
        .from("material_requests")
        .update({ status })
        .eq("id", id)
        .select(`*, project:projects(name, code), items:material_request_items(*)`) // Lấy luôn dữ liệu để copy
        .single();

    if (updateError || !req) return { success: false, error: "Lỗi cập nhật trạng thái: " + updateError?.message };

    // 2. NẾU LÀ "DUYỆT" -> TỰ ĐỘNG TẠO PO NHÁP & THÔNG BÁO
    if (status === 'approved') {

        // A. Tạo PO Header (Chưa có Supplier, Giá = 0)
        const poCode = `PO-AUTO-${format(new Date(), "MMdd")}-${req.code.split('-').pop()}`; // Mã PO sinh từ mã Request

        const { data: po, error: poError } = await supabase.from("purchase_orders").insert({
            code: poCode,
            project_id: req.project_id,
            request_id: req.id, // Link ngược lại Request
            order_date: new Date().toISOString(),
            notes: `Được tạo tự động từ yêu cầu ${req.code}. ${req.notes || ''}`,
            status: 'draft', // Quan trọng: Trạng thái NHÁP
            total_amount: 0, // Chưa có giá
            created_at: new Date().toISOString()
        }).select("id").single();

        if (!poError && po) {
            // B. Copy Items từ Request -> PO Items
            const poItems = req.items.map((item: any) => ({
                po_id: po.id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: 0, // Phòng mua sẽ điền giá sau
                vat_rate: 0
            }));

            await supabase.from("purchase_order_items").insert(poItems);

            // C. Tạo Thông báo cho Phòng Mua
            await supabase.from("notifications").insert({
                title: "Yêu cầu vật tư mới",
                message: `Dự án [${req.project.code}] vừa được duyệt yêu cầu vật tư. Vui lòng xử lý đơn ${poCode}.`,
                link: `/procurement/orders/${po.id}/edit`, // Bấm vào là nhảy tới trang Sửa PO luôn
                is_read: false
            });
        }
    }

    revalidatePath(`/projects/${projectId}/requests/${id}`);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Đã ${status === 'approved' ? 'DUYỆT & TẠO ĐƠN MUA' : 'TỪ CHỐI'} phiếu yêu cầu` };
}
