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

// 2. Tạo giao dịch mới (Phiếu thu / Phiếu chi - Cash Flow)
export async function createTransactionAction(data: TransactionFormValues) {
    const supabase = await createClient();

    const validated = transactionSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ." };

    const payload = validated.data;

    try {
        const { error } = await supabase.from("finance_transactions").insert({
            amount: payload.amount,
            type: payload.type,
            category_id: payload.category_id,
            transaction_date: payload.transaction_date.toISOString(),
            description: payload.description,
            project_id: payload.project_id || null,
            customer_id: payload.customer_id || null,
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

// 3. Lấy danh sách giao dịch
export async function getTransactions() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("finance_transactions")
        .select(`*, category:finance_categories (id, name, color, type), project:projects (name, code)`)
        .order("transaction_date", { ascending: false })
        .limit(20);

    if (error) return [];
    return data;
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

// 6. Lấy thống kê tài chính dự án
export async function getProjectFinanceStats(projectId: string) {
    const supabase = await createClient();

    // Doanh thu (Hợp đồng)
    const { data: contracts } = await supabase.from('contracts').select('value').eq('project_id', projectId).neq('status', 'cancelled');
    // Thực thu (Milestones đã trả)
    const { data: payments } = await supabase.from('payment_milestones').select(`amount, status, due_date, contracts!inner(project_id)`).eq('contracts.project_id', projectId);
    // Thực chi (Cash Flow)
    const { data: expenses } = await supabase.from('finance_transactions').select('amount').eq('project_id', projectId).eq('type', 'expense');

    // Chi phí vật tư (Xuất kho)
    let inventoryCost = 0;
    const { data: materialItems } = await supabase.from('goods_issue_items').select(`quantity, unit_price, goods_issues!inner(project_id)`).eq('goods_issues.project_id', projectId);
    if (materialItems) {
        inventoryCost = materialItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    }

    const totalRevenue = contracts?.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 0;
    const actualReceived = payments?.reduce((sum, item) => item.status === 'paid' ? sum + (Number(item.amount) || 0) : sum, 0) || 0;
    const cashCost = expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    const totalCost = cashCost + inventoryCost;
    const profit = actualReceived - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const remainingDebt = totalRevenue - actualReceived;
    const today = new Date();
    const overdueCount = payments?.filter(p => p.status !== 'paid' && p.due_date && new Date(p.due_date) < today).length || 0;

    return { totalRevenue, actualReceived, totalCost, profit, profitMargin: parseFloat(profitMargin.toFixed(2)), remainingDebt, overdueCount };
}

// 7. Thanh toán nhanh đơn PO (Tạo phiếu chi)
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

// =========================================================
// PHẦN BỔ SUNG: QUẢN LÝ CÔNG NỢ PHẢI TRẢ (ACCOUNTS PAYABLE)
// =========================================================

// 8. Lấy danh sách PO đã nhập kho nhưng CHƯA CÓ HÓA ĐƠN (hoặc chưa đủ)
export async function getPOsPendingInvoice() {
    const supabase = await createClient();
    const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`id, code, created_at, total_amount, status, supplier:suppliers(name), invoices:procurement_invoices(id, total_amount)`)
        .in('status', ['received', 'partial_received'])
        .order('created_at', { ascending: false });

    if (!pos) return [];
    // Lọc PO chưa xuất đủ hóa đơn
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

// 10. TẠO HÓA ĐƠN ĐẦU VÀO (Ghi nhận nợ)
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
        paid_amount: 0, // Mới tạo -> Chưa trả đồng nào -> Nợ 100%
        payment_status: 'pending',
        attachment_url: data.attachment_url
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/finance/payables');
    return { success: true, message: "Đã ghi nhận hóa đơn công nợ!" };
}

// 11. THANH TOÁN HÓA ĐƠN (Tạo phiếu chi & Trừ nợ)
export async function createPaymentToSupplierAction(data: {
    invoice_id: string; amount: number; payment_method: string;
    payment_date: Date; notes?: string;
}) {
    const supabase = await createClient();

    try {
        // A. Lấy thông tin hóa đơn & Dự án từ PO liên quan
        const { data: invoice } = await supabase
            .from('procurement_invoices')
            .select(`id, po_id, total_amount, paid_amount, po:purchase_orders(project_id)`)
            .eq('id', data.invoice_id)
            .single();

        if (!invoice) throw new Error("Hóa đơn không tồn tại");

        const currentPaid = Number(invoice.paid_amount) || 0;
        const newPaidAmount = currentPaid + data.amount;
        if (newPaidAmount > Number(invoice.total_amount)) throw new Error("Số tiền trả vượt quá giá trị hóa đơn");

        // ✅ FIX LỖI TS2339: Xử lý an toàn khi lấy project_id từ quan hệ PO
        const poData: any = invoice.po;
        const projectId = Array.isArray(poData) ? poData[0]?.project_id : poData?.project_id;

        // B. Tạo giao dịch chi tiền (Cash Flow)
        const { error: transError } = await supabase.from('finance_transactions').insert({
            type: 'expense',
            amount: data.amount,
            description: `Thanh toán HĐ ${data.notes || ''}`,
            transaction_date: data.payment_date.toISOString(),
            payment_method: data.payment_method,
            po_id: invoice.po_id,
            project_id: projectId, // Gán đúng dự án
            invoice_id: invoice.id,
            created_at: new Date().toISOString()
        });

        if (transError) throw new Error("Lỗi tạo giao dịch: " + transError.message);

        // C. Cập nhật trạng thái Hóa đơn
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