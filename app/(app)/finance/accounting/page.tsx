// app/(app)/finance/page.tsx

import { createClient } from "@/lib/supabase/server";
import {
    getFinanceCategories,
    getTransactions,
    getMonthlyStats,
    getProjectsForSelect,
    getAllReceivables
} from "@/lib/action/finance";

import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionList } from "@/components/finance/transaction-list";
import { FinanceChart } from "@/components/finance/finance-chart";
import ReceivablesManager from "@/components/finance/receivables-manager";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
    const [categories, transactions, monthlyStats, projects, receivables] = await Promise.all([
        getFinanceCategories(),
        getTransactions(),
        getMonthlyStats(),
        getProjectsForSelect(),
        getAllReceivables()
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tài chính & Dòng tiền</h2>
            </div>

            <div className="space-y-6">

                {/* PHẦN 1: BIỂU ĐỒ & TỔNG QUAN */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4">
                        <FinanceChart data={monthlyStats} />
                    </div>

                    <div className="col-span-3 grid gap-4 grid-rows-2">
                        {/* ✅ FIX: Thêm dark mode cho thẻ Tổng Thu */}
                        <div className="border rounded-xl p-6 flex flex-col justify-center shadow-sm 
                            bg-green-50 border-green-100 
                            dark:bg-green-950/20 dark:border-green-900">
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Tổng thu tháng này</span>
                            <span className="text-3xl font-bold text-green-700 dark:text-green-500">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(monthlyStats[monthlyStats.length - 1]?.income || 0)}
                            </span>
                        </div>

                        {/* ✅ FIX: Thêm dark mode cho thẻ Tổng Chi */}
                        <div className="border rounded-xl p-6 flex flex-col justify-center shadow-sm 
                            bg-red-50 border-red-100 
                            dark:bg-red-950/20 dark:border-red-900">
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Tổng chi tháng này</span>
                            <span className="text-3xl font-bold text-red-700 dark:text-red-500">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(monthlyStats[monthlyStats.length - 1]?.expense || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* PHẦN 2: QUẢN LÝ CÔNG NỢ PHẢI THU */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ReceivablesManager milestones={receivables} />
                </div>

                {/* PHẦN 3: NHẬP LIỆU & LỊCH SỬ GIAO DỊCH */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 pt-2">
                    <div className="col-span-3">
                        <h3 className="mb-4 text-lg font-medium flex items-center gap-2">
                            📝 Tạo giao dịch mới
                        </h3>
                        <TransactionForm categories={categories} projects={projects} />
                    </div>

                    <div className="col-span-4 pl-0 lg:pl-2">
                        <h3 className="mb-4 text-lg font-medium flex items-center gap-2">
                            🕒 Lịch sử dòng tiền
                        </h3>
                        <TransactionList data={transactions} />
                    </div>
                </div>
            </div>
        </div>
    );
}