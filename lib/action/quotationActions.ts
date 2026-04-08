"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPE DEFINITIONS) ---
// Khớp hoàn toàn với Form và Database schema mới
export type QuotationInput = {
    id?: string;
    project_id: string;
    customer_id?: string;
    quotation_number: string;
    title: string;          // Tên công trình / Tiêu đề
    issue_date: string;
    status: string;
    notes?: string;         // Ghi chú chung của báo giá
    total_amount: number;   // Tổng tiền (Sau thuế)
    items: {
        id?: string;
        item_type: string;  // 'section' (Mục) hoặc 'item' (Công việc)
        work_item_name: string;
        details?: string;   // Diễn giải khối lượng (VD: 5x5...)
        unit?: string;
        quantity: number;
        unit_price: number;
        vat_rate: number;   // Thuế VAT từng dòng (0, 5, 8, 10...)
        notes?: string;     // Ghi chú riêng từng dòng
        order_index?: number; // ✅ FIX 1: Thêm order_index để nhận từ Frontend
    }[];
}

// --- 2. HÀM LƯU BÁO GIÁ (SAVE) ---
export async function saveQuotation(payload: QuotationInput) {
    const supabase = await createSupabaseServerClient();

    // A. Chuẩn bị dữ liệu Header
    const quotationData = {
        project_id: payload.project_id,

        // Map dữ liệu khách hàng vào cột customer_id trong DB
        customer_id: payload.customer_id,

        quotation_number: payload.quotation_number,
        title: payload.title,
        issue_date: payload.issue_date,
        status: payload.status,
        notes: payload.notes,
        total_amount: payload.total_amount,
        updated_at: new Date().toISOString()
    };

    let quotationId = payload.id;

    // B. Thực hiện Lưu Header (Upsert)
    if (quotationId) {
        // Update
        const { error } = await supabase
            .from('quotations')
            .update(quotationData)
            .eq('id', quotationId);

        if (error) return { success: false, error: "Lỗi cập nhật thông tin chung: " + error.message };
    } else {
        // Insert
        const { data, error } = await supabase
            .from('quotations')
            .insert(quotationData)
            .select('id')
            .single();

        if (error) return { success: false, error: "Lỗi tạo báo giá mới: " + error.message };
        quotationId = data.id;
    }

    // C. Xử lý Chi tiết (Items)
    if (quotationId) {
        // Xóa hết items cũ
        const { error: deleteError } = await supabase
            .from('quotation_items')
            .delete()
            .eq('quotation_id', quotationId);

        if (deleteError) return { success: false, error: "Lỗi xóa chi tiết cũ: " + deleteError.message };

        // Insert items mới
        if (payload.items && payload.items.length > 0) {
            // ✅ FIX 2: Bơm order_index vào dữ liệu lưu xuống Database
            const itemsToInsert = payload.items.map((item, index) => ({
                quotation_id: quotationId,
                item_type: item.item_type || 'item',
                work_item_name: item.work_item_name,
                details: item.details,
                unit: item.unit,
                quantity: item.quantity || 0,
                unit_price: item.unit_price || 0,
                vat_rate: item.vat_rate || 0,
                notes: item.notes,
                order_index: item.order_index ?? index // Lấy từ payload hoặc dùng vị trí trong mảng
            }));

            const { error: insertError } = await supabase
                .from('quotation_items')
                .insert(itemsToInsert);

            if (insertError) return { success: false, error: "Lỗi lưu chi tiết hạng mục: " + insertError.message };
        }
    }

    revalidatePath(`/projects/${payload.project_id}`);
    return { success: true, message: "Đã lưu báo giá thành công!" };
}

// --- 3. CÁC HÀM GET DATA ---

// Lấy danh sách báo giá của dự án
export async function getQuotations(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// Lấy chi tiết 1 báo giá (kèm items) để sửa
export async function getQuotationById(id: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy dữ liệu Báo giá và Chi tiết báo giá (Không join bảng ngoài)
    const { data: quoteData, error } = await supabase
        .from('quotations')
        .select(`
            *,
            items:quotation_items(*)
        `)
        .eq('id', id)
        .single();

    if (error) return { success: false, error: error.message };

    // Sắp xếp items theo thứ tự (order_index)
    if (quoteData.items && Array.isArray(quoteData.items)) {
        quoteData.items.sort((a: any, b: any) => {
            const idxA = a.order_index ?? 99999;
            const idxB = b.order_index ?? 99999;
            return idxA - idxB;
        });
    }

    // 2. Lấy tên Dự án & Địa chỉ thủ công
    let projectInfo = null;
    if (quoteData.project_id) {
        const { data: pData } = await supabase
            .from('projects')
            .select('name, address, description')
            .eq('id', quoteData.project_id)
            .single();
        projectInfo = pData;
    }

    // 3. Lấy tên Khách hàng thủ công
    let customerInfo = null;
    if (quoteData.customer_id) {
        const { data: cData } = await supabase
            .from('customers')
            .select('name')
            .eq('id', quoteData.customer_id)
            .single();
        customerInfo = cData;
    }

    // 4. Nhồi dữ liệu vào Object cuối cùng để trả về cho Viewer
    const finalData = {
        ...quoteData,
        // ✅ CHỈNH SỬA TẠI ĐÂY: Ưu tiên lấy description của project làm title
        title: projectInfo?.description || quoteData.title || '',
        project_name: projectInfo?.name || '',
        address: projectInfo?.address || '',
        customer_name: customerInfo?.name || ''
    };

    return { success: true, data: finalData };
}

// --- 4. CÁC HÀM TƯƠNG TÁC (DELETE, APPROVE) ---

// Xóa báo giá
export async function deleteQuotation(id: string, projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('quotations').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa thành công" };
}

// Hàm Duyệt Báo Giá
export async function approveQuotation(id: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Cập nhật trạng thái
    const { error } = await supabase
        .from('quotations')
        .update({
            status: 'accepted',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    // 2. Tính tổng ngân sách đã duyệt để update ngược vào Project
    const { data: allAccepted } = await supabase
        .from('quotations')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('status', 'accepted');

    const totalApproved = allAccepted?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

    // Update vào bảng Project
    await supabase
        .from('projects')
        .update({ quoted_amount_total: totalApproved })
        .eq('id', projectId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã duyệt báo giá thành công!" };
}

// --- 5. ALIAS CHO TƯƠNG THÍCH CODE CŨ ---
export async function createQuotation(data: QuotationInput, projectId: string) {
    return saveQuotation({ ...data, project_id: projectId });
}

export async function updateQuotation(data: QuotationInput, projectId: string) {
    return saveQuotation({ ...data, project_id: projectId });
}