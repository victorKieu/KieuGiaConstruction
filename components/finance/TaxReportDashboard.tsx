"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Calendar, ArrowDownRight, ArrowUpRight, Scale, FileText } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils/utils";

interface Props {
    inputVat: any[];
    outputVat: any[];
}

export default function TaxReportDashboard({ inputVat, outputVat }: Props) {
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState<string>(currentYear);
    const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<string>("summary"); // Tab mới: Tổng quan cấn trừ

    const filterData = (data: any[]) => {
        return data.filter(inv => {
            if (!inv.invoice_date) return false;
            const date = new Date(inv.invoice_date);
            const year = date.getFullYear().toString();
            const month = date.getMonth() + 1;

            if (year !== selectedYear) return false;
            if (selectedPeriod === "all") return true;

            if (selectedPeriod.startsWith('q')) {
                const quarter = parseInt(selectedPeriod.replace('q', ''));
                if (quarter === 1 && month >= 1 && month <= 3) return true;
                if (quarter === 2 && month >= 4 && month <= 6) return true;
                if (quarter === 3 && month >= 7 && month <= 9) return true;
                if (quarter === 4 && month >= 10 && month <= 12) return true;
                return false;
            }

            if (selectedPeriod.startsWith('m')) {
                const selectedMonth = parseInt(selectedPeriod.replace('m', ''));
                return month === selectedMonth;
            }
            return false;
        });
    };

    const filteredInput = useMemo(() => filterData(inputVat || []), [inputVat, selectedYear, selectedPeriod]);
    const filteredOutput = useMemo(() => filterData(outputVat || []), [outputVat, selectedYear, selectedPeriod]);

    // TÍNH TOÁN CẤN TRỪ THUẾ
    const calcTotals = (data: any[]) => {
        return data.reduce((acc, curr) => {
            acc.subtotal += Number(curr.subtotal || 0);
            acc.vat += Number(curr.vat_amount || 0);
            acc.total += Number(curr.total_amount || 0);
            return acc;
        }, { subtotal: 0, vat: 0, total: 0 });
    };

    const inputTotals = useMemo(() => calcTotals(filteredInput), [filteredInput]);
    const outputTotals = useMemo(() => calcTotals(filteredOutput), [filteredOutput]);

    // Thuế GTGT Phải Nộp = Đầu Ra - Đầu Vào
    const vatPayable = outputTotals.vat - inputTotals.vat;

    return (
        <div className="space-y-6">
            {/* THANH CÔNG CỤ & BỘ LỌC */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px] font-bold bg-slate-50 dark:bg-slate-950">
                            <SelectValue placeholder="Năm" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">Năm 2026</SelectItem>
                            <SelectItem value="2025">Năm 2025</SelectItem>
                            <SelectItem value="2024">Năm 2024</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[160px] font-bold bg-slate-50 dark:bg-slate-950">
                            <SelectValue placeholder="Kỳ báo cáo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Cả năm</SelectItem>
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800">Theo Quý</div>
                            <SelectItem value="q1">Quý 1</SelectItem>
                            <SelectItem value="q2">Quý 2</SelectItem>
                            <SelectItem value="q3">Quý 3</SelectItem>
                            <SelectItem value="q4">Quý 4</SelectItem>
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800">Theo Tháng</div>
                            {[...Array(12)].map((_, i) => (
                                <SelectItem key={`m${i + 1}`} value={`m${i + 1}`}>Tháng {i + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button variant="outline" className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-500 font-semibold shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Xuất File Excel (HTKK)
                </Button>
            </div>

            {/* DASHBOARD CẤN TRỪ THUẾ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="dark:bg-slate-900 shadow-sm transition-colors border-slate-200 dark:border-slate-800">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <ArrowDownRight className="w-3 h-3" /> Thuế Đầu Vào (Được khấu trừ)
                            </p>
                            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(inputTotals.vat)}</h3>
                            <p className="text-xs text-slate-500 mt-1">Từ {filteredInput.length} hóa đơn mua hàng</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 shadow-sm transition-colors border-slate-200 dark:border-slate-800">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> Thuế Đầu Ra (Phải nộp)
                            </p>
                            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(outputTotals.vat)}</h3>
                            <p className="text-xs text-slate-500 mt-1">Từ {filteredOutput.length} hóa đơn bán ra</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`shadow-sm transition-colors border-none ${vatPayable > 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${vatPayable > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                <Scale className="w-3 h-3" /> {vatPayable > 0 ? 'Thuế GTGT Phải Nộp Ký Này' : 'Thuế Còn Được Khấu Trừ Chuyển Kỳ Sau'}
                            </p>
                            <h3 className={`text-3xl font-black ${vatPayable > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                {formatCurrency(Math.abs(vatPayable))}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TAB DANH SÁCH CHI TIẾT */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="summary" className="w-48 font-bold"><FileText className="w-4 h-4 mr-2" />Bảng Kê Hóa Đơn</TabsTrigger>
                </TabsList>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800 transition-colors">
                    <div className="overflow-x-auto">
                        <Table className="bg-white dark:bg-slate-950 transition-colors rounded-xl">
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[120px]">Loại</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ngày phát hành</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Số hóa đơn</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Đối tác (KH / NCC)</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mã số thuế</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Tiền chưa thuế</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Tiền thuế VAT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {/* HÓA ĐƠN ĐẦU RA */}
                                {filteredOutput.length > 0 && (
                                    <TableRow className="bg-slate-100/50 dark:bg-slate-800/30">
                                        <TableCell colSpan={7} className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">
                                            I. Hàng hóa, dịch vụ bán ra (Kê khai nộp thuế)
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredOutput.map((inv, index) => (
                                    <TableRow key={`out-${inv.id || index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <TableCell><Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30">ĐẦU RA</Badge></TableCell>
                                        <TableCell className="font-medium text-slate-600 dark:text-slate-400">{formatDate(new Date(inv.invoice_date))}</TableCell>
                                        <TableCell><span className="font-mono text-slate-800 dark:text-slate-200">{inv.invoice_number}</span></TableCell>
                                        <TableCell className="font-medium">{inv.customer?.name || 'N/A'}</TableCell>
                                        <TableCell className="font-mono text-sm">{inv.customer?.tax_code || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(inv.subtotal)}</TableCell>
                                        <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(inv.vat_amount)}</TableCell>
                                    </TableRow>
                                ))}

                                {/* HÓA ĐƠN ĐẦU VÀO */}
                                {filteredInput.length > 0 && (
                                    <TableRow className="bg-slate-100/50 dark:bg-slate-800/30">
                                        <TableCell colSpan={7} className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider border-t">
                                            II. Hàng hóa, dịch vụ mua vào (Được khấu trừ)
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredInput.map((inv, index) => {
                                    const entityName = inv.direct_supplier?.name || inv.po?.supplier?.name;
                                    const taxCode = inv.direct_supplier?.tax_code || inv.po?.supplier?.tax_code;
                                    return (
                                        <TableRow key={`in-${inv.id || index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <TableCell><Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30">ĐẦU VÀO</Badge></TableCell>
                                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">{formatDate(new Date(inv.invoice_date))}</TableCell>
                                            <TableCell><span className="font-mono text-slate-800 dark:text-slate-200">{inv.invoice_number}</span></TableCell>
                                            <TableCell className="font-medium">{entityName || 'N/A'}</TableCell>
                                            <TableCell className="font-mono text-sm">{taxCode || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(inv.subtotal)}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.vat_amount)}</TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* NẾU KHÔNG CÓ DATA */}
                                {filteredInput.length === 0 && filteredOutput.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">Không có hóa đơn phát sinh trong kỳ này.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </Tabs>
        </div>
    );
}