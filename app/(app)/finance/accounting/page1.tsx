// app/(app)/finance/page.tsx

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeDollarSign, Wallet, FileText, PieChart, Landmark, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
    const [categories, transactions, monthlyStats, projects, receivables] = await Promise.all([
        getFinanceCategories(),
        getTransactions(),
        getMonthlyStats(),
        getProjectsForSelect(),
        getAllReceivables()
    ]);

    const currentMonthIncome = monthlyStats[monthlyStats.length - 1]?.income || 0;
    const currentMonthExpense = monthlyStats[monthlyStats.length - 1]?.expense || 0;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Landmark className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        Tài chính & Kế toán
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Quản trị dòng tiền, công nợ và sổ quỹ doanh nghiệp</p>
                </div>
            </div>

            <Tabs defaultValue="dashboard" className="w-full space-y-6">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-auto flex flex-wrap gap-1 p-1">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 py-2.5 px-4 flex-1 md:flex-none">
                        <PieChart className="w-4 h-4 mr-2" /> Tổng quan
                    </TabsTrigger>
                    <TabsTrigger value="receivables" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/20 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 py-2.5 px-4 flex-1 md:flex-none">
                        <BadgeDollarSign className="w-4 h-4 mr-2" /> Phải thu (AR)
                    </TabsTrigger>
                    <TabsTrigger value="payables" className="data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/20 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 py-2.5 px-4 flex-1 md:flex-none">
                        <Wallet className="w-4 h-4 mr-2" /> Phải trả (AP)
                    </TabsTrigger>
                    <TabsTrigger value="cashbook" className="data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/20 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 py-2.5 px-4 flex-1 md:flex-none">
                        <ArrowRightLeft className="w-4 h-4 mr-2" /> Sổ quỹ (Thu/Chi)
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-900/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400 py-2.5 px-4 flex-1 md:flex-none">
                        <FileText className="w-4 h-4 mr-2" /> Báo cáo Lãi/Lỗ
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: TỔNG QUAN (DASHBOARD) */}
                <TabsContent value="dashboard" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4">
                            <FinanceChart data={monthlyStats} />
                        </div>

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

                {/* TAB 2: CÔNG NỢ PHẢI THU (AR) */}
                <TabsContent value="receivables" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ReceivablesManager milestones={receivables} />
                </TabsContent>

                {/* TAB 3: CÔNG NỢ PHẢI TRẢ (AP) - MODULE SẮP LÀM */}
                <TabsContent value="payables" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-dashed border-2 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                        <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Quản lý Công nợ Phải Trả (AP)</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md">
                            Khu vực theo dõi công nợ nhà cung cấp vật tư, nghiệm thu đội thợ, và quản lý các hóa đơn (Invoice) đầu vào từ Đơn hàng (PO).
                        </p>
                    </Card>
                </TabsContent>

                {/* TAB 4: SỔ QUỸ (THU / CHI) */}
                <TabsContent value="cashbook" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-3">
                            <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm h-full">
                                <CardHeader className="pb-4 border-b dark:border-slate-800">
                                    <CardTitle className="text-lg flex items-center gap-2 dark:text-slate-100">📝 Tạo giao dịch mới</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <TransactionForm categories={categories} projects={projects} />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="col-span-4">
                            <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm h-full">
                                <CardHeader className="pb-4 border-b dark:border-slate-800">
                                    <CardTitle className="text-lg flex items-center gap-2 dark:text-slate-100">🕒 Lịch sử Sổ quỹ</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <TransactionList data={transactions} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 5: BÁO CÁO (REPORTS) - MODULE SẮP LÀM */}
                <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-dashed border-2 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Báo cáo Tài chính Dự án</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md">
                            Hệ thống tổng hợp báo cáo Lãi/Lỗ (P&L) theo từng công trình, phân tích chi phí trực tiếp, chi phí gián tiếp và dòng tiền thực tế.
                        </p>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}