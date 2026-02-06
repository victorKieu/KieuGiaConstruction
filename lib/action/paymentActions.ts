"use server"

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách đợt thanh toán
export async function getPaymentMilestones(contractId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('payment_milestones')
        .select('*')
        .eq('contract_id', contractId)
        .order('due_date', { ascending: true });

    if (error) return { success: false, error: error.message };

    // Map data
    const mappedData = data.map(item => ({
        ...item,
        is_paid: item.status === 'paid'
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
        status: 'pending',
        created_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm đợt thanh toán" };
}

// 3. Xóa đợt thanh toán
export async function deletePaymentMilestone(id: string, projectId: string) {
    const supabase = await createClient();

    // Xóa transaction liên quan trước (nếu có)
    await supabase.from('finance_transactions').delete().eq('milestone_id', id);

    const { error } = await supabase.from('payment_milestones').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa đợt thanh toán" };
}

// 4. Đánh dấu Đã thanh toán / Chưa thanh toán (Switch Toggle nhanh)
export async function markAsPaid(id: string, isPaid: boolean, projectId: string) {
    const supabase = await createClient();

    try {
        if (isPaid) {
            // --- TRƯỜNG HỢP 1: XÁC NHẬN THANH TOÁN (TẠO GIAO DỊCH) ---

            // a. Lấy thông tin Milestone để biết số tiền
            const { data: milestone } = await supabase
                .from('payment_milestones')
                .select(`id, name, amount, contracts(contract_number)`)
                .eq('id', id)
                .single();

            if (!milestone) throw new Error("Không tìm thấy đợt thanh toán");

            // @ts-ignore
            const contractNum = milestone.contracts?.contract_number || "HĐ";

            // b. Tạo giao dịch Thu (Income)
            const { error: transError } = await supabase.from('finance_transactions').insert({
                type: 'income',
                amount: milestone.amount,
                description: `Thu tiền ${contractNum} - ${milestone.name} (Xác nhận nhanh)`,
                transaction_date: new Date().toISOString(),
                payment_method: 'transfer', // Mặc định là Chuyển khoản nếu tích nhanh
                project_id: projectId,
                milestone_id: id,
                created_at: new Date().toISOString()
            });

            if (transError) throw new Error("Lỗi tạo giao dịch: " + transError.message);

            // c. Cập nhật trạng thái Milestone
            const { error } = await supabase
                .from('payment_milestones')
                .update({ status: 'paid', paid_date: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

        } else {
            // --- TRƯỜNG HỢP 2: HỦY THANH TOÁN (XÓA GIAO DỊCH) ---

            // a. Xóa giao dịch trong Sổ quỹ
            const { error: transError } = await supabase
                .from('finance_transactions')
                .delete()
                .eq('milestone_id', id);

            if (transError) throw new Error("Lỗi xóa giao dịch: " + transError.message);

            // b. Cập nhật trạng thái Milestone về Pending
            const { error } = await supabase
                .from('payment_milestones')
                .update({ status: 'pending', paid_date: null })
                .eq('id', id);

            if (error) throw error;
        }

        revalidatePath(`/projects/${projectId}`);
        // Refresh cả trang tài chính để cập nhật biểu đồ dòng tiền
        revalidatePath(`/finance`);

        return { success: true, message: isPaid ? "Đã xác nhận & Ghi sổ quỹ" : "Đã hủy xác nhận" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 5. [MỚI] Ghi nhận thu tiền chi tiết (Dùng cho Dialog nếu cần nhập ngày, ghi chú...)
export async function receiveContractPayment(data: {
    milestone_id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    notes?: string;
    project_id: string;
}) {
    const supabase = await createClient();

    try {
        const { data: milestone } = await supabase
            .from('payment_milestones')
            .select(`id, name, contracts(contract_number)`)
            .eq('id', data.milestone_id)
            .single();

        if (!milestone) throw new Error("Không tìm thấy đợt thanh toán");
        // @ts-ignore
        const contractNum = milestone.contracts?.contract_number || "HĐ";

        // Tạo giao dịch
        const { error: transError } = await supabase.from('finance_transactions').insert({
            type: 'income',
            amount: data.amount,
            description: `Thu tiền ${contractNum} - ${data.notes || milestone.name}`,
            transaction_date: data.payment_date.toISOString(),
            payment_method: data.payment_method,
            project_id: data.project_id,
            milestone_id: data.milestone_id,
            created_at: new Date().toISOString()
        });

        if (transError) throw new Error(transError.message);

        // Update status
        await supabase.from('payment_milestones').update({
            status: 'paid',
            paid_date: data.payment_date.toISOString()
        }).eq('id', data.milestone_id);

        revalidatePath(`/projects/${data.project_id}`);
        revalidatePath(`/finance`);

        return { success: true, message: "Đã ghi nhận thu tiền thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}