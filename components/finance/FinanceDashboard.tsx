"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Landmark, ArrowUpRight, ArrowDownRight, Wallet, Activity, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { FinanceChart } from "@/components/finance/finance-chart"; // Dùng lại biểu đồ cũ của anh

interface Props {
    stats: {
        totalCash: number;
        totalAR: number;
        totalAP: number;
    };
    monthlyStats: any[]; // Data cho biểu đồ
}

export default function FinanceDashboard({ stats, monthlyStats }: Props) {
    const { totalCash, totalAR, totalAP } = stats;

    // Tính Dòng tiền thuần (Net Cash Position) = Tiền đang có + Tiền sắp thu - Tiền sắp trả
    const netCashPosition = totalCash + totalAR - totalAP;
    const isHealthy = netCashPosition > 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HÀNG 1: 4 CHỈ SỐ SINH TỒN CỦA DOANH NGHIỆP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Tiền mặt & Ngân hàng */}
                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border-t-4 border-t-blue-500 hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng Quỹ (111 + 112)</p>
                                <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatCurrency(totalCash)}</h3>
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Landmark className="w-5 h-5 text-blue-500" /></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Sẵn sàng thanh toán ngay</p>
                    </CardContent>
                </Card>

                {/* 2. Phải thu (AR) */}
                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border-t-4 border-t-emerald-500 hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Khách Hàng Nợ (AR)</p>
                                <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalAR)}</h3>
                            </div>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"><ArrowDownRight className="w-5 h-5 text-emerald-500" /></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Dòng tiền dự kiến thu về</p>
                    </CardContent>
                </Card>

                {/* 3. Phải trả (AP) */}
                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border-t-4 border-t-amber-500 hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nợ Nhà Cung Cấp (AP)</p>
                                <h3 className="text-2xl font-black text-amber-700 dark:text-amber-500">{formatCurrency(totalAP)}</h3>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg"><ArrowUpRight className="w-5 h-5 text-amber-500" /></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Nghĩa vụ phải thanh toán</p>
                    </CardContent>
                </Card>

                {/* 4. Dòng tiền thuần dự kiến */}
                <Card className={`dark:bg-slate-900 dark:border-slate-800 shadow-sm border-t-4 ${isHealthy ? 'border-t-purple-500' : 'border-t-red-500'} hover:shadow-md transition-all`}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sức khỏe Thanh khoản</p>
                                <h3 className={`text-2xl font-black ${isHealthy ? 'text-purple-700 dark:text-purple-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {formatCurrency(netCashPosition)}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg ${isHealthy ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                {isHealthy ? <ShieldCheck className="w-5 h-5 text-purple-500" /> : <Activity className="w-5 h-5 text-red-500" />}
                            </div>
                        </div>
                        <p className={`text-xs mt-2 font-medium ${isHealthy ? 'text-slate-400' : 'text-red-500'}`}>
                            {isHealthy ? 'Vốn lưu động thặng dư an toàn' : 'Cảnh báo: Nguy cơ thiếu hụt vốn!'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* HÀNG 2: BIỂU ĐỒ & TINH TẾ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    {/* Tái sử dụng biểu đồ Recharts anh đã upload */}
                    <FinanceChart data={monthlyStats} />
                </div>

                <div className="col-span-3">
                    <Card className="h-full dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col">
                        <CardHeader className="pb-2 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                            <CardTitle className="text-lg flex items-center gap-2 dark:text-slate-100">
                                <Wallet className="w-5 h-5 text-indigo-500" /> Luân chuyển Dòng tiền (Tháng này)
                            </CardTitle>
                            <CardDescription>Báo cáo Thu - Chi thực tế phát sinh trong tháng.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-center p-6 gap-6">
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-xl">
                                <p className="text-sm font-bold text-green-700 dark:text-green-500 mb-1 uppercase tracking-wide">Tổng Thu thực tế</p>
                                <p className="text-3xl font-black text-green-700 dark:text-green-400">
                                    {formatCurrency(monthlyStats[monthlyStats.length - 1]?.income || 0)}
                                </p>
                            </div>

                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                                <p className="text-sm font-bold text-red-700 dark:text-red-500 mb-1 uppercase tracking-wide">Tổng Chi thực tế</p>
                                <p className="text-3xl font-black text-red-700 dark:text-red-400">
                                    {formatCurrency(monthlyStats[monthlyStats.length - 1]?.expense || 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}