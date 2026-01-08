"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/finance";
import { startOfMonth, subMonths, format } from "date-fns";

// 1. Lấy danh sách danh mục
export async function getFinanceCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("finance_categories")
        .select("*")
        .order("name");
    return data || [];
}

// 2. Tạo giao dịch mới (Phiếu thu / Phiếu chi)
export async function createTransactionAction(data: TransactionFormValues) {
    const supabase = await createClient();

    const validated = transactionSchema.safeParse(data);
    if (!validated.success) {
        return { success: false, error: "Dữ liệu không hợp lệ." };
    }

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

        if (error) {
            console.error("Finance Insert Error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/finance");
        // Nếu có project_id, revalidate cả trang project đó
        if (payload.project_id) {
            revalidatePath(`/projects/${payload.project_id}`);
        }

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
        .select(`
            *,
            category:finance_categories (id, name, color, type),
            project:projects (name, code)
        `)
        .order("transaction_date", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
    return data;
}

// 4. Lấy thống kê Thu/Chi 6 tháng gần nhất (Cho biểu đồ tổng)
export async function getMonthlyStats() {
    const supabase = await createClient();
    const startDate = startOfMonth(subMonths(new Date(), 5)).toISOString();

    const { data, error } = await supabase
        .from("finance_transactions")
        .select("amount, type, transaction_date")
        .gte("transaction_date", startDate)
        .order("transaction_date", { ascending: true });

    if (error) return [];

    const monthlyData: Record<string, { name: string; income: number; expense: number }> = {};

    for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), i);
        const key = format(date, "MM/yyyy");
        monthlyData[key] = {
            name: `T${format(date, "MM")}`,
            income: 0,
            expense: 0
        };
    }

    data?.forEach((item) => {
        const key = format(new Date(item.transaction_date), "MM/yyyy");
        if (monthlyData[key]) {
            if (item.type === 'income') {
                monthlyData[key].income += Number(item.amount);
            } else {
                monthlyData[key].expense += Number(item.amount);
            }
        }
    });

    return Object.values(monthlyData).reverse();
}

// 5. Lấy danh sách dự án cho dropdown
export async function getProjectsForSelect() {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("projects")
            .select("id, name, code, status_id")
            .order("created_at", { ascending: false });

        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
}

// ✅ 6. LẤY THỐNG KÊ TÀI CHÍNH DỰ ÁN (Đã tích hợp Hợp đồng & Vật tư & Sửa lỗi Schema)
export async function getProjectFinanceStats(projectId: string) {
    const supabase = await createClient();

    // --- A. DOANH THU (Contracts) ---
    // Chỉ lấy hợp đồng chưa bị hủy
    const { data: contracts } = await supabase
        .from('contracts')
        .select('value')
        .eq('project_id', projectId)
        .neq('status', 'cancelled');

    // --- B. THỰC THU & CÔNG NỢ (Payment Milestones) ---
    // ✅ FIX: Dùng đúng tên bảng payment_milestones và cột status
    const { data: payments } = await supabase
        .from('payment_milestones')
        .select(`
            amount, 
            status, 
            due_date,
            contracts!inner(project_id) 
        `)
        .eq('contracts.project_id', projectId);

    // --- C. THỰC CHI (Expenses) ---
    // 1. Chi phí từ giao dịch tài chính (Phiếu chi tiền mặt/CK)
    const { data: expenses } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('project_id', projectId)
        .eq('type', 'expense');

    // 2. Chi phí vật tư (Inventory Issues - Xuất kho)
    let inventoryCost = 0;
    try {
        const { data: materialItems, error: invError } = await supabase
            .from('goods_issue_items')
            .select(`
                quantity, 
                unit_price,
                goods_issues!inner(project_id)
            `)
            .eq('goods_issues.project_id', projectId);

        if (!invError && materialItems) {
            inventoryCost = materialItems.reduce((sum, item) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unit_price) || 0;
                return sum + (qty * price);
            }, 0);
        }
    } catch (e) {
        console.warn("Lỗi query kho:", e);
    }

    // --- TÍNH TOÁN ---
    // Doanh thu dự kiến
    const totalRevenue = contracts?.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 0;

    // Thực thu (Chỉ tính status = 'paid')
    const actualReceived = payments?.reduce((sum, item) => {
        return item.status === 'paid' ? sum + (Number(item.amount) || 0) : sum;
    }, 0) || 0;

    // Thực chi
    const cashCost = expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    const totalCost = cashCost + inventoryCost;

    // Lợi nhuận & Tỷ suất
    const profit = actualReceived - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Công nợ
    const remainingDebt = totalRevenue - actualReceived;

    // Số đợt quá hạn
    const today = new Date();
    const overdueCount = payments?.filter(p =>
        p.status !== 'paid' && p.due_date && new Date(p.due_date) < today
    ).length || 0;

    return {
        totalRevenue,
        actualReceived,
        totalCost,
        profit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        remainingDebt,
        overdueCount
    };
}

// 7. THANH TOÁN ĐƠN MUA HÀNG (PO) - Tạo phiếu chi tự động
export async function createPaymentForPO(poId: string, amount: number, paymentMethod: string, notes: string) {
    const supabase = await createClient();

    // 1. Lấy thông tin PO
    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, code, project_id, supplier_id, total_amount')
        .eq('id', poId)
        .single();

    if (poError || !po) return { success: false, error: "Không tìm thấy đơn hàng" };

    // 2. Tạo Phiếu Chi (Transaction)
    // Lưu ý: Cần tìm category_id phù hợp cho "Thanh toán NCC"
    // Ở đây tạm thời để null hoặc bạn có thể query lấy ID mặc định
    const { error: transError } = await supabase.from('finance_transactions').insert({
        amount: amount,
        type: 'expense',
        transaction_date: new Date().toISOString(),
        description: `Thanh toán đơn hàng ${po.code}. ${notes}`,
        project_id: po.project_id,
        po_id: po.id, // Link với PO
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
    });

    if (transError) return { success: false, error: "Lỗi tạo phiếu chi: " + transError.message };

    // 3. Cập nhật trạng thái thanh toán PO (nếu cần logic phức tạp hơn thì xử lý sau)
    // Ví dụ: Nếu trả hết thì đánh dấu đã thanh toán xong
    // await supabase.from('purchase_orders').update({ payment_status: 'paid' }).eq('id', poId);

    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath('/finance');

    return { success: true, message: "Đã thanh toán thành công!" };
}