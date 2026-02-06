"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/finance";
import { startOfMonth, subMonths, format } from "date-fns";


// 1. Lấy danh sách danh mục
export async function getFinanceCategories() {
    const supabase = await createClient();
    const { data } = await supabase.from("finance_categories").select("*").order("name");
    return data || [];
}

// 2. TẠO GIAO DỊCH THU/CHI (Chung cho cả Nội bộ & Dự án)
export async function createTransactionAction(data: TransactionFormValues) {
    const supabase = await createClient();
    const validated = transactionSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ." };
    const payload = validated.data;

    try {
        const { error } = await supabase.from("finance_transactions").insert({
            amount: payload.amount,
            type: payload.type, // 'income' hoặc 'expense'
            category_id: payload.category_id,
            transaction_date: payload.transaction_date.toISOString(),
            description: payload.description,
            project_id: payload.project_id || null,
            // customer_id: payload.customer_id || null, // Nếu có quản lý KH
            payment_method: "cash", // Mặc định hoặc thêm field chọn
            created_at: new Date().toISOString(),
        });

        if (error) throw new Error(error.message);

        revalidatePath("/finance");
        if (payload.project_id) revalidatePath(`/projects/${payload.project_id}`);
        return { success: true, message: "Đã tạo phiếu thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 3. LẤY DANH SÁCH GIAO DỊCH (Đã hợp nhất)
export async function getTransactions() {
    const supabase = await createClient();

    // Join: transactions -> projects -> customers
    const { data, error } = await supabase
        .from("finance_transactions")
        .select(`
            *, 
            category:finance_categories (id, name, color, type), 
            
            project:projects (
                id, name, code, address,
                customer:customers (name, contact_person, address) 
            ),
            
            invoice:procurement_invoices (
                invoice_number, 
                po:purchase_orders (
                    supplier:suppliers (name, address, contact_person)
                )
            )
        `)
        .order("transaction_date", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Lỗi getTransactions:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

// 4. Lấy thống kê Thu/Chi 6 tháng
export async function getMonthlyStats() {
    const supabase = await createClient();
    const startDate = startOfMonth(subMonths(new Date(), 5)).toISOString();

    const { data } = await supabase
        .from("finance_transactions")
        .select("amount, type, transaction_date")
        .gte("transaction_date", startDate)
        .order("transaction_date", { ascending: true });

    const monthlyData: Record<string, { name: string; income: number; expense: number }> = {};
    for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), i);
        const key = format(date, "MM/yyyy");
        monthlyData[key] = { name: `T${format(date, "MM")}`, income: 0, expense: 0 };
    }

    data?.forEach((item) => {
        const key = format(new Date(item.transaction_date), "MM/yyyy");
        if (monthlyData[key]) {
            item.type === 'income' ? monthlyData[key].income += Number(item.amount) : monthlyData[key].expense += Number(item.amount);
        }
    });

    return Object.values(monthlyData).reverse();
}

// 5. Lấy danh sách dự án cho dropdown
export async function getProjectsForSelect() {
    const supabase = await createClient();
    const { data } = await supabase.from("projects").select("id, name, code, status_id").order("created_at", { ascending: false });
    return data || [];
}

// 6. Lấy thống kê tài chính dự án (CẬP NHẬT ĐỂ DÙNG BẢNG ĐÚNG)
export async function getProjectFinanceStats(projectId: string) {
    const supabase = await createClient();

    // 1. Doanh thu (Hợp đồng) - Giữ nguyên
    const { data: contracts } = await supabase
        .from('contracts')
        .select('value')
        .eq('project_id', projectId)
        .neq('status', 'cancelled');

    // 2. Thực thu (CẬP NHẬT: Lấy từ finance_transactions type='income')
    const { data: incomes } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('project_id', projectId)
        .eq('type', 'income'); // ✅ Chỉ lấy khoản THU thực tế

    // 3. Thực chi (Lấy từ finance_transactions type='expense')
    const { data: expenses } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('project_id', projectId)
        .eq('type', 'expense');

    // 4. Lấy thông tin nợ đọng (Milestones quá hạn)
    const today = new Date().toISOString();
    const { count: overdueCount } = await supabase
        .from('payment_milestones')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending') // Chưa thanh toán
        .lt('due_date', today)   // Quá hạn
        .not('due_date', 'is', null);

    // 5. Tính toán
    const totalRevenue = contracts?.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 0;

    // ✅ Tính tổng thu từ bảng giao dịch
    const actualReceived = incomes?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    // ✅ Tính tổng chi từ bảng giao dịch
    const cashCost = expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    const profit = actualReceived - cashCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const remainingDebt = totalRevenue - actualReceived;

    return {
        totalRevenue,
        actualReceived,
        totalCost: cashCost,
        profit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        remainingDebt,
        overdueCount: overdueCount || 0,
        contractValue: totalRevenue
    };
}

// 7. Thanh toán nhanh đơn PO
export async function createPaymentForPO(poId: string, amount: number, paymentMethod: string, notes: string) {
    const supabase = await createClient();
    const { data: po } = await supabase.from('purchase_orders').select('id, code, project_id').eq('id', poId).single();
    if (!po) return { success: false, error: "Không tìm thấy đơn hàng" };

    const { error } = await supabase.from('finance_transactions').insert({
        amount, type: 'expense', transaction_date: new Date().toISOString(),
        description: `Thanh toán đơn hàng ${po.code}. ${notes}`,
        project_id: po.project_id, po_id: po.id, payment_method: paymentMethod, created_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath('/finance');
    return { success: true, message: "Đã thanh toán thành công!" };
}

// 8. Lấy danh sách PO chờ hóa đơn
export async function getPOsPendingInvoice() {
    const supabase = await createClient();
    const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`id, code, created_at, total_amount, status, supplier:suppliers(name), invoices:procurement_invoices(id, total_amount)`)
        .in('status', ['received', 'partial_received'])
        .order('created_at', { ascending: false });

    if (!pos) return [];
    return pos.filter(po => {
        const invoicedTotal = po.invoices?.reduce((sum: any, inv: any) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        return invoicedTotal < (Number(po.total_amount) || 0);
    });
}

// 9. Lấy danh sách Hóa đơn công nợ
export async function getPayableInvoices() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('procurement_invoices')
        .select(`*, po:purchase_orders(code, project_id, project:projects(name)), supplier:purchase_orders(supplier:suppliers(name, bank_name, bank_account))`)
        .order('created_at', { ascending: false });
    return data || [];
}

// 10. Tạo hóa đơn đầu vào
export async function createSupplierInvoiceAction(data: {
    po_id: string; invoice_number: string; invoice_date: Date;
    invoice_type: 'VAT' | 'RETAIL'; subtotal: number; vat_percent: number;
    vat_amount: number; total_amount: number; attachment_url?: string;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from('procurement_invoices').insert({
        po_id: data.po_id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date.toISOString(),
        invoice_type: data.invoice_type,
        subtotal: data.subtotal,
        vat_percent: data.vat_percent,
        vat_amount: data.vat_amount,
        total_amount: data.total_amount,
        paid_amount: 0,
        payment_status: 'pending',
        attachment_url: data.attachment_url
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/finance/payables');
    return { success: true, message: "Đã ghi nhận hóa đơn công nợ!" };
}

// 11. Thanh toán hóa đơn
export async function createPaymentToSupplierAction(data: {
    invoice_id: string; amount: number; payment_method: string;
    payment_date: Date; notes?: string;
}) {
    const supabase = await createClient();

    try {
        const { data: invoice } = await supabase
            .from('procurement_invoices')
            .select(`id, po_id, total_amount, paid_amount, po:purchase_orders(project_id)`)
            .eq('id', data.invoice_id)
            .single();

        if (!invoice) throw new Error("Hóa đơn không tồn tại");

        const currentPaid = Number(invoice.paid_amount) || 0;
        const newPaidAmount = currentPaid + data.amount;
        if (newPaidAmount > Number(invoice.total_amount)) throw new Error("Số tiền trả vượt quá giá trị hóa đơn");

        const poData: any = invoice.po;
        const projectId = Array.isArray(poData) ? poData[0]?.project_id : poData?.project_id;

        const { error: transError } = await supabase.from('finance_transactions').insert({
            type: 'expense',
            amount: data.amount,
            description: `Thanh toán HĐ ${data.notes || ''}`,
            transaction_date: data.payment_date.toISOString(),
            payment_method: data.payment_method,
            po_id: invoice.po_id,
            project_id: projectId,
            invoice_id: invoice.id,
            created_at: new Date().toISOString()
        });

        if (transError) throw new Error("Lỗi tạo giao dịch: " + transError.message);

        let newStatus = 'partial';
        if (newPaidAmount >= Number(invoice.total_amount)) newStatus = 'paid';

        await supabase.from('procurement_invoices').update({
            paid_amount: newPaidAmount,
            payment_status: newStatus
        }).eq('id', data.invoice_id);

        revalidatePath('/finance/payables');
        return { success: true, message: "Thanh toán thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =========================================================
// PHẦN BỔ SUNG: QUẢN LÝ TIẾN ĐỘ THANH TOÁN (ĐÃ FIX: DÙNG CONTRACT_PAYMENT_MILESTONES)
// =========================================================

// 12. Lấy Danh sách Hợp đồng & Milestones
export async function getProjectContracts(projectId: string) {
    const supabase = await createClient();

    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
            id, 
            contract_number, 
            title,
            value, 
            signed_at,
            is_addendum,
            parent_id,
            payment_milestones (
                id,
                name,
                percentage,
                amount,
                due_date,
                status,
                paid_date,
                note
            )
        `)
        .eq('project_id', projectId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Lỗi lấy hợp đồng:", error);
        return [];
    }

    return contracts || [];
}

// 13. Upsert Milestone (Vào bảng payment_milestones)
export async function upsertPaymentMilestone(data: any, projectId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('payment_milestones')
        .upsert({
            id: data.id || undefined,
            contract_id: data.contract_id,
            name: data.name,
            percentage: data.percentage,
            amount: data.amount,
            due_date: data.due_date,
            status: data.status,
            paid_date: data.paid_date
        });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 14. Xóa Milestone
export async function deletePaymentMilestone(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_milestones').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 15. Đổi trạng thái thanh toán (Toggle status string)
export async function toggleMilestoneStatus(id: string, projectId: string, newStatus: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('payment_milestones')
        .update({
            status: newStatus,
            paid_date: newStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 16. Lấy tất cả các khoản phải thu (Pending Milestones) cho trang Tài chính
export async function getAllReceivables() {
    const supabase = await createClient();

    // ✅ FIX: Chỉ định rõ relationship 'projects!contracts_project_id_fkey'
    // Để Supabase biết ta muốn join qua cột 'project_id' của bảng contracts
    const { data, error } = await supabase
        .from('payment_milestones')
        .select(`
            *,
            contracts (
                id, 
                contract_number, 
                projects!contracts_project_id_fkey (
                    id, 
                    name
                )
            )
        `)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

    if (error) {
        console.error("Lỗi lấy khoản phải thu:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

// BỔ SUNG: Hàm cập nhật giao dịch (Hiệu chỉnh phiếu)
export async function updateTransactionAction(id: string, data: any) {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from('finance_transactions')
            .update({
                description: data.description,
                transaction_date: data.transaction_date,
                amount: data.amount, // Cho phép sửa số tiền nếu cần
                // Nếu DB có cột recipient_name, recipient_address thì thêm vào đây
            })
            .eq('id', id);

        if (error) throw new Error(error.message);

        revalidatePath('/finance');
        return { success: true, message: "Đã cập nhật phiếu!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}