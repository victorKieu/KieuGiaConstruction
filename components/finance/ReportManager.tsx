"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, TrendingUp, TrendingDown, Percent, DollarSign, Activity, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
interface Props {
    reportData: any;
    projects: any[];
    currentProject: string;
}

export default function ReportManager({ reportData, projects, currentProject }: Props) {
    const router = useRouter();

    if (!reportData) {
        return <div className="text-center py-12 text-slate-500">Lỗi không tải được dữ liệu báo cáo.</div>;
    }

    const { revenue, directCost, overheadCost, grossProfit, netProfit, grossMargin, details } = reportData;
    const isLoss = netProfit < 0;

    const handleProjectChange = (val: string) => {
        router.push(`/finance/reports${val !== 'all' ? `?project=${val}` : ''}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* THANH LỌC BÁO CÁO */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <Building2 className="w-5 h-5 text-indigo-500" /> Chọn phạm vi báo cáo:
                </div>
                <Select value={currentProject} onValueChange={handleProjectChange}>
                    <SelectTrigger className="w-full md:w-[400px] bg-white dark:bg-slate-950 dark:border-slate-800">
                        <SelectValue placeholder="Toàn bộ Công ty" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                        <SelectItem value="all" className="font-bold text-indigo-600 dark:text-indigo-400">🏢 Tổng hợp Toàn Công ty</SelectItem>
                        {projects.map(p => (
                            <SelectItem key={p.id} value={p.id} className="dark:text-slate-200">Dự án: {p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* CÁC THẺ CHỈ SỐ (KPI CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Doanh Thu (511)</p>
                                <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatCurrency(revenue)}</h3>
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><DollarSign className="w-5 h-5 text-blue-500"/></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Chi phí Trực tiếp (154)</p>
                                <h3 className="text-2xl font-black text-amber-700 dark:text-amber-500">{formatCurrency(directCost)}</h3>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg"><Activity className="w-5 h-5 text-amber-500"/></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Vật tư, nhân công thi công</p>
                    </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Biên Lợi Nhuận Gộp</p>
                                <h3 className="text-2xl font-black text-purple-700 dark:text-purple-400">{grossMargin.toFixed(1)}%</h3>
                            </div>
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg"><Percent className="w-5 h-5 text-purple-500"/></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">LN Gộp: {formatCurrency(grossProfit)}</p>
                    </CardContent>
                </Card>

                <Card className={`dark:bg-slate-900 dark:border-slate-800 shadow-sm border-l-4 ${isLoss ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Lợi Nhuận Ròng</p>
                                <h3 className={`text-2xl font-black ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {formatCurrency(netProfit)}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg ${isLoss ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                                {isLoss ? <TrendingDown className="w-5 h-5 text-red-500"/> : <TrendingUp className="w-5 h-5 text-emerald-500"/>}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Sau khi trừ Quản lý: {formatCurrency(overheadCost)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* BẢNG CHI TIẾT THEO TÀI KHOẢN */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-slate-100">
                        <FileText className="w-5 h-5 text-slate-500" /> Chi tiết Báo Cáo P&L (Theo Hệ thống Tài khoản)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-100/50 dark:bg-slate-900/50">
                            <TableRow className="dark:border-slate-800">
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[150px]">Mã TK</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên Tài Khoản</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Số Tiền (Phát sinh thuần)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {details.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">Chưa có dữ liệu hạch toán doanh thu / chi phí.</TableCell>
                                </TableRow>
                            ) : details.map((acc: any) => {
                                const isRevenue = acc.code.startsWith('511');
                                return (
                                    <TableRow key={acc.code} className="dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300">{acc.code}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">{acc.name}</TableCell>
                                        <TableCell className={`text-right font-bold ${isRevenue ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-500'}`}>
                                            {formatCurrency(acc.balance)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            
                            {/* Dòng Tổng kết */}
                            <TableRow className="bg-slate-50 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800">
                                <TableCell colSpan={2} className="text-right font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    TỔNG LỢI NHUẬN RÒNG HIỆN TẠI:
                                </TableCell>
                                <TableCell className={`text-right font-black text-lg ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {formatCurrency(netProfit)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}