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

// 2. Tạo giao dịch mới
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
            category:finance_categories (id, name, color, type)
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
            .select("id, name, code, status") // Bỏ project_type nếu không chắc chắn tên cột
            .order("created_at", { ascending: false });

        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
}

// ✅ 6. LẤY THỐNG KÊ TÀI CHÍNH DỰ ÁN (Sửa lại logic chuẩn)
export async function getProjectFinanceStats(projectId: string) {
    const supabase = await createClient();

    // 1. Tính Tổng Doanh Thu (Giá trị trên Hợp đồng đã ký)
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('value')
        .eq('project_id', projectId)
        .in('status', ['signed', 'liquidated']);

    // 2. Tính Tổng Thực Thu (Tiền thực tế đã thu từ các đợt thanh toán)
    // Cách fix: Select bảng payment_milestones và lọc theo cột lồng của bảng contracts
    const { data: payments, error: paymentError } = await supabase
        .from('payment_milestones')
        .select(`
            amount,
            contracts!inner(project_id) 
        `)
        .eq('status', 'paid')
        .eq('contracts.project_id', projectId); // Lọc theo project_id thông qua quan hệ join

    // 3. Tính Tổng Thực Chi (Từ các giao dịch chi phí nhập tay)
    const { data: expenses, error: expenseError } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('project_id', projectId)
        .eq('type', 'expense');

    if (contractError || paymentError || expenseError) {
        console.error("Lỗi lấy tài chính dự án:", { contractError, paymentError, expenseError });
        return { totalRevenue: 0, totalCost: 0, actualReceived: 0, profit: 0, profitMargin: 0 };
    }

    // Tính toán số liệu
    const totalRevenue = contracts?.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 0;
    const actualReceived = payments?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    const totalCost = expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
        totalRevenue,     // Doanh thu theo hợp đồng
        actualReceived,   // Tiền mặt thực tế đã thu về
        totalCost,        // Chi phí dự án
        profit,           // Lợi nhuận gộp
        profitMargin: parseFloat(profitMargin.toFixed(2))
    };
}