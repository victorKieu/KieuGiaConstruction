import { createClient } from "@/lib/supabase/server";
import { getFinanceCategories, getTransactions, getMonthlyStats, getProjectsForSelect } from "@/lib/action/finance";

import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionList } from "@/components/finance/transaction-list";
import { FinanceChart } from "@/components/finance/finance-chart";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
    // Gọi song song 4 hàm để lấy dữ liệu nhanh nhất
    const [categories, transactions, monthlyStats, projects] = await Promise.all([
        getFinanceCategories(),
        getTransactions(),
        getMonthlyStats(),
        getProjectsForSelect() // Lấy danh sách dự án
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tài chính & Dòng tiền</h2>
            </div>

            <div className="space-y-4">
                {/* PHẦN 1: BIỂU ĐỒ & TỔNG QUAN */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4">
                        <FinanceChart data={monthlyStats} />
                    </div>

                    <div className="col-span-3 grid gap-4 grid-rows-2">
                        <div className="border rounded-xl bg-green-50 p-6 flex flex-col justify-center">
                            <span className="text-sm font-medium text-green-600">Tổng thu tháng này</span>
                            <span className="text-3xl font-bold text-green-700">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(monthlyStats[monthlyStats.length - 1]?.income || 0)}
                            </span>
                        </div>
                        <div className="border rounded-xl bg-red-50 p-6 flex flex-col justify-center">
                            <span className="text-sm font-medium text-red-600">Tổng chi tháng này</span>
                            <span className="text-3xl font-bold text-red-700">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(monthlyStats[monthlyStats.length - 1]?.expense || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* PHẦN 2: NHẬP LIỆU & LỊCH SỬ */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-3">
                        <h3 className="mb-4 text-lg font-medium">Tạo giao dịch mới</h3>
                        {/* Truyền projects vào form */}
                        <TransactionForm categories={categories} projects={projects} />
                    </div>

                    <div className="col-span-4 pl-2">
                        <TransactionList data={transactions} />
                    </div>
                </div>
            </div>
        </div>
    );
}