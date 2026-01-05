"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/supabase/session";

export type QuotationInput = {
    id?: string;
    project_id: string;
    client_id?: string; // Có thể null từ form gửi lên
    quotation_number: string;
    issue_date: string;
    valid_until?: string;
    notes?: string;
    status: string;
    items: {
        id?: string;
        work_item_name: string;
        unit: string;
        quantity: number;
        unit_price: number;
        notes?: string;
    }[];
}

/**
 * Lấy danh sách Báo giá của một Dự án
 */
export async function getQuotations(projectId: string) {
    const supabase = await createSupabaseServerClient();

    // Query kèm thông tin người tạo (nếu cần)
    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching quotations:", error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

/**
 * Lấy chi tiết một Báo giá (kèm Items)
 */
export async function getQuotationById(id: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('quotations')
        .select(`
            *,
            items:quotation_items(*)
        `)
        .eq('id', id)
        .single();

    if (error) return { success: false, error: error.message };

    // Sắp xếp items (nếu cần)
    if (data.items) {
        data.items.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return { success: true, data };
}

/**
 * Lưu Báo Giá (Xử lý cả Tạo mới & Cập nhật)
 */
export async function saveQuotation(input: QuotationInput) {
    const supabase = await createSupabaseServerClient();
    const session = await getCurrentSession();

    if (!session.isAuthenticated) {
        return { success: false, error: "Bạn chưa đăng nhập" };
    }

    // 1. Tự động lấy Client ID từ Dự án (Logic sửa lỗi)
    let clientId = input.client_id;

    if (!clientId) {
        // Nếu form không gửi client_id, ta lấy từ project
        const { data: project } = await supabase
            .from('projects')
            .select('customer_id')
            .eq('id', input.project_id)
            .single();

        if (project && project.customer_id) {
            clientId = project.customer_id;
        } else {
            // Trường hợp dự án chưa gán khách hàng -> Báo lỗi chặn lại
            return {
                success: false,
                error: "Dự án này chưa có Khách hàng. Vui lòng cập nhật Khách hàng cho dự án trước khi tạo báo giá."
            };
        }
    }

    // 2. Tính toán tổng tiền
    const totalAmount = input.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
    }, 0);

    const quotationData = {
        project_id: input.project_id,
        client_id: clientId, // ✅ Đã có dữ liệu chắc chắn
        quotation_number: input.quotation_number,
        issue_date: input.issue_date,
        valid_until: input.valid_until,
        notes: input.notes,
        status: input.status,
        quoted_amount: totalAmount,
    };

    let quotationId = input.id;

    try {
        if (quotationId) {
            // === UPDATE ===
            const { error: updateError } = await supabase
                .from('quotations')
                .update({ ...quotationData, updated_at: new Date().toISOString() })
                .eq('id', quotationId);

            if (updateError) throw updateError;

            // Xóa items cũ để insert lại (Strategy đơn giản)
            await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);

        } else {
            // === CREATE ===
            const { data: newQuotation, error: createError } = await supabase
                .from('quotations')
                .insert(quotationData)
                .select('id')
                .single();

            if (createError) throw createError;
            quotationId = newQuotation.id;
        }

        // 3. Insert Items
        if (input.items.length > 0) {
            const itemsToInsert = input.items.map(item => ({
                quotation_id: quotationId,
                work_item_name: item.work_item_name,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                notes: item.notes,
            }));

            const { error: itemsError } = await supabase
                .from('quotation_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        revalidatePath(`/projects/${input.project_id}`);
        return { success: true, message: "Lưu báo giá thành công!", id: quotationId };

    } catch (error: any) {
        console.error("Save Quotation Error:", error);
        return { success: false, error: error.message || "Lỗi khi lưu báo giá" };
    }
}

/**
 * Xóa Báo Giá
 */
export async function deleteQuotation(id: string, projectId: string) {
    const supabase = await createSupabaseServerClient();
    const session = await getCurrentSession();

    // Check quyền (chỉ admin/manager được xóa) - Giả định logic check role
    if (session.role !== 'admin' && session.role !== 'manager') {
        return { success: false, error: "Bạn không có quyền xóa báo giá" };
    }

    const { error } = await supabase.from('quotations').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa báo giá" };
}

/**
 * Chốt Báo Giá (Duyệt) -> Tự động update Ngân sách Dự án
 * Đây là logic "Chặt chẽ" chúng ta cần
 */
export async function approveQuotation(id: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin báo giá
    const { data: quotation } = await supabase.from('quotations').select('quoted_amount').eq('id', id).single();
    if (!quotation) return { success: false, error: "Không tìm thấy báo giá" };

    // 2. Cập nhật trạng thái Báo giá -> Accepted
    const { error: quoteError } = await supabase
        .from('quotations')
        .update({ status: 'accepted' }) // Hoặc lấy ID từ sys_dictionaries nếu đã migrate
        .eq('id', id);
    if (quoteError) return { success: false, error: quoteError.message };

    // 3. Tự động cập nhật Ngân sách dự án (quoted_amount_total)
    // Logic: Cộng dồn tất cả báo giá 'accepted' của dự án này
    // (Hoặc chỉ lấy cái này làm ngân sách chính - tùy quy trình. Ở đây chọn cách cộng dồn an toàn)

    // Query lại tổng tiền các báo giá đã duyệt
    const { data: allAccepted } = await supabase
        .from('quotations')
        .select('quoted_amount')
        .eq('project_id', projectId)
        .eq('status', 'accepted'); // Lưu ý: map với code trong sys_dictionaries

    const totalApproved = allAccepted?.reduce((sum, q) => sum + (q.quoted_amount || 0), 0) || 0;

    // Update Project
    await supabase
        .from('projects')
        .update({ quoted_amount_total: totalApproved })
        .eq('id', projectId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã duyệt báo giá và cập nhật ngân sách dự án" };
}