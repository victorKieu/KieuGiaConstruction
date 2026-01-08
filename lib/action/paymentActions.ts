"use server"

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách đợt thanh toán
export async function getPaymentMilestones(contractId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('payment_milestones') // ✅ Tên bảng đúng
        .select('*')
        .eq('contract_id', contractId)
        .order('due_date', { ascending: true });

    if (error) return { success: false, error: error.message };

    // Map data để khớp với UI (nếu UI cần field is_paid)
    const mappedData = data.map(item => ({
        ...item,
        is_paid: item.status === 'paid' // ✅ Convert status -> boolean
    }));

    return { success: true, data: mappedData };
}

// 2. Tạo đợt thanh toán mới
export async function createPaymentMilestone(data: any, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_milestones').insert({
        contract_id: data.contract_id,
        name: data.name,
        percentage: data.percentage,
        amount: data.amount,
        due_date: data.due_date || null,
        status: 'pending', // ✅ Mặc định là pending
        created_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm đợt thanh toán" };
}

// 3. Xóa đợt thanh toán
export async function deletePaymentMilestone(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_milestones').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa đợt thanh toán" };
}

// 4. Đánh dấu Đã thanh toán / Chưa thanh toán
export async function markAsPaid(id: string, isPaid: boolean, projectId: string) {
    const supabase = await createClient();

    const updateData = {
        status: isPaid ? 'paid' : 'pending', // ✅ Update cột status
        paid_date: isPaid ? new Date().toISOString() : null // Cập nhật ngày trả
    };

    const { error } = await supabase
        .from('payment_milestones')
        .update(updateData)
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: isPaid ? "Đã xác nhận thu tiền" : "Đã hủy xác nhận" };
}