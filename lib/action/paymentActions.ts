"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách đợt thanh toán của 1 hợp đồng
export async function getPaymentMilestones(contractId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('payment_milestones')
        .select('*')
        .eq('contract_id', contractId)
        .order('due_date', { ascending: true }); // Sắp xếp theo hạn thanh toán

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// 2. Thêm đợt thanh toán mới
export async function createPaymentMilestone(data: any, projectId: string) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from('payment_milestones').insert({
        contract_id: data.contract_id,
        name: data.name,
        percentage: data.percentage,
        amount: data.amount,
        due_date: data.due_date || null,
        status: 'pending'
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm đợt thanh toán" };
}

// 3. Xóa đợt thanh toán
export async function deletePaymentMilestone(id: string, projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('payment_milestones').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa" };
}

// 4. Đánh dấu Đã thu tiền (Quan trọng: Sẽ cộng vào Doanh thu thực tế sau này)
export async function markAsPaid(id: string, isPaid: boolean, projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('payment_milestones').update({
        status: isPaid ? 'paid' : 'pending',
        paid_date: isPaid ? new Date().toISOString() : null
    }).eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật trạng thái" };
}

export async function applyKieuGiaPaymentTemplate(contractId: string, contractValue: number, projectId: string) {
    const supabase = await createSupabaseServerClient();

    const templateMilestones = [
        {
            contract_id: contractId,
            name: "Đợt 1: Tạm ứng sau khi ký HĐ",
            percentage: 40, // Giả định theo mẫu hoặc linh hoạt
            amount: contractValue * 0.4,
            status: 'pending'
        },
        {
            contract_id: contractId,
            name: "Đợt 2: Thanh toán sau khi bàn giao",
            percentage: 60,
            amount: contractValue * 0.6,
            status: 'pending'
        }
    ];

    const { error } = await supabase.from('payment_milestones').insert(templateMilestones);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}