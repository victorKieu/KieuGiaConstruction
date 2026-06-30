// app/(app)/finance/page.tsx
import {
    getFinanceCategories,
    getTransactions,
    getMonthlyStats,
    getProjectsForSelect,
    getAllReceivables,
    getPOsPendingInvoice,
    getPayableInvoices
} from "@/lib/action/finance";

import { FinanceChart } from "@/components/finance/finance-chart";
import ReceivablesManager from "@/components/finance/receivables-manager";
import AccountsPayableManager from "@/components/finance/AccountsPayableManager";
import CashbookManager from "@/components/finance/CashbookManager"; // Component Sổ quỹ mới
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeDollarSign, Wallet, FileText, PieChart, Landmark, ArrowRightLeft } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
    // Kéo toàn bộ dữ liệu song song để tối ưu tốc độ
    const [categories, transactions, monthlyStats, projects, receivables, pendingPOs, apInvoices] = await Promise.all([
        getFinanceCategories(),
        getTransactions(),
        getMonthlyStats(),
        getProjectsForSelect(),
        getAllReceivables(),
        getPOsPendingInvoice(),
        getPayableInvoices()
    ]);

    const currentMonthIncome = monthlyStats[monthlyStats.length - 1]?.income || 0;
    const currentMonthExpense = monthlyStats[monthlyStats.length - 1]?.expense || 0;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Landmark className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        Tài chính - Kế toán (FICO)
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Quản trị dòng tiền, Sổ cái, Công nợ và Báo cáo Lãi/Lỗ</p>
                </div>
            </div>

            <Tabs defaultValue="cashbook" className="w-full space-y-6">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-auto flex flex-wrap gap-1 p-1 shadow-sm">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 py-2.5 px-4 flex-1 md:flex-none font-semibold">
                        <PieChart className="w-4 h-4 mr-2" /> Tổng quan
                    </TabsTrigger>
                    <TabsTrigger value="cashbook" className="data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/20 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 py-2.5 px-4 flex-1 md:flex-none font-semibold">
                        <ArrowRightLeft className="w-4 h-4 mr-2" /> Tiền mặt & Ngân hàng
                    </TabsTrigger>
                    <TabsTrigger value="receivables" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/20 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 py-2.5 px-4 flex-1 md:flex-none font-semibold">
                        <BadgeDollarSign className="w-4 h-4 mr-2" /> Phải thu (AR)
                    </TabsTrigger>
                    <TabsTrigger value="payables" className="data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/20 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 py-2.5 px-4 flex-1 md:flex-none font-semibold">
                        <Wallet className="w-4 h-4 mr-2" /> Phải trả (AP)
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-900/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400 py-2.5 px-4 flex-1 md:flex-none font-semibold">
                        <FileText className="w-4 h-4 mr-2" /> Báo cáo (P&L)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4"><FinanceChart data={monthlyStats} /></div>
                        <div className="col-span-3 grid gap-4 grid-rows-2">
                            <Card className="border-green-100 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 shadow-sm flex flex-col justify-center">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-green-600 dark:text-green-400 font-medium">Tổng thu tháng này</CardDescription>
                                    <CardTitle className="text-4xl font-bold text-green-700 dark:text-green-500">
                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(currentMonthIncome)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="border-red-100 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 shadow-sm flex flex-col justify-center">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-red-600 dark:text-red-400 font-medium">Tổng chi tháng này</CardDescription>
                                    <CardTitle className="text-4xl font-bold text-red-700 dark:text-red-500">
                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(currentMonthExpense)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* SỔ QUỸ & SỔ CÁI */}
                <TabsContent value="cashbook" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CashbookManager categories={categories} projects={projects} transactions={transactions} />
                </TabsContent>

                {/* CÔNG NỢ PHẢI THU (AR) */}
                <TabsContent value="receivables" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ReceivablesManager milestones={receivables} />
                </TabsContent>

                {/* CÔNG NỢ PHẢI TRẢ (AP) */}
                <TabsContent value="payables" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AccountsPayableManager pendingPOs={pendingPOs} invoices={apInvoices} />
                </TabsContent>

                {/* BÁO CÁO LÃI LỖ */}
                <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-dashed border-2 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Báo cáo Tài chính Dự án (P&L)</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md">
                            Mô-đun đang được xây dựng dựa trên dữ liệu Sổ cái (Ledger). Sẽ cung cấp báo cáo Lãi/Lỗ theo từng công trình.
                        </p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}