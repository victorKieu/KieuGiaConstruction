"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/finance";
import { startOfMonth, subMonths, format } from "date-fns"; // Đảm bảo đã import

// 1. Lấy danh sách danh mục (để đổ vào dropdown)
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

    // Validate lại ở server
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
            project_id: payload.project_id || null, // Nếu rỗng thì gửi null
            customer_id: payload.customer_id || null,
            created_at: new Date().toISOString(),
        });

        if (error) {
            console.error("Finance Insert Error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/finance"); // Làm mới trang tài chính
        return { success: true, message: "Đã tạo phiếu thành công!" };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 3. Lấy danh sách giao dịch (Mới nhất lên đầu)
export async function getTransactions() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("finance_transactions")
        .select(`
      *,
      category:finance_categories (
        id,
        name,
        color,
        type
      )
    `)
        .order("transaction_date", { ascending: false }) // Mới nhất lên đầu
        .limit(20); // Lấy 20 giao dịch gần nhất

    if (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }

    return data;
}

// 4. Lấy thống kê Thu/Chi 6 tháng gần nhất
export async function getMonthlyStats() {
    const supabase = await createClient();

    // Lấy mốc thời gian: 6 tháng trước từ ngày mùng 1
    const startDate = startOfMonth(subMonths(new Date(), 5)).toISOString();

    const { data, error } = await supabase
        .from("finance_transactions")
        .select("amount, type, transaction_date")
        .gte("transaction_date", startDate) // Lấy dữ liệu từ 6 tháng trước đến nay
        .order("transaction_date", { ascending: true });

    if (error) {
        console.error("Error fetching stats:", error);
        return [];
    }

    // Xử lý dữ liệu: Gom nhóm theo tháng
    // Tạo khung dữ liệu 6 tháng (để tháng nào không có giao dịch vẫn hiện cột 0)
    const monthlyData: Record<string, { name: string; income: number; expense: number }> = {};

    for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), i);
        const key = format(date, "MM/yyyy"); // Key dạng "12/2025"
        monthlyData[key] = {
            name: `T${format(date, "MM")}`, // Tên hiển thị: T12
            income: 0,
            expense: 0
        };
    }

    // Cộng dồn tiền vào từng tháng
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

    // Chuyển object thành array và đảo ngược để tháng cũ nhất bên trái
    return Object.values(monthlyData).reverse();
}

// 5. Lấy danh sách dự án (NÂNG CẤP: Lấy thêm code và type)
export async function getProjectsForSelect() {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("projects")
            .select("id, name, code, project_type, status")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Lỗi lấy dự án:", error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        return [];
    }
}

// 6. Lấy thống kê tài chính cho MỘT dự án cụ thể
export async function getProjectFinanceStats(projectId: string) {
    const supabase = await createClient();

    // A. Lấy danh sách giao dịch của dự án này
    const { data: transactions, error } = await supabase
        .from("finance_transactions")
        .select(`
      *,
      category:finance_categories (name, color)
    `)
        .eq("project_id", projectId)
        .order("transaction_date", { ascending: false });

    if (error) {
        console.error("Lỗi lấy tài chính dự án:", error);
        return { summary: { income: 0, expense: 0, profit: 0 }, transactions: [] };
    }

    // B. Tính tổng Thu / Chi
    let totalIncome = 0;
    let totalExpense = 0;

    transactions?.forEach((t) => {
        if (t.type === "income") totalIncome += Number(t.amount);
        else totalExpense += Number(t.amount);
    });

    return {
        summary: {
            income: totalIncome,
            expense: totalExpense,
            profit: totalIncome - totalExpense, // Lợi nhuận tạm tính
        },
        transactions: transactions || [],
    };
}