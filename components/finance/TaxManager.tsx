"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, Download, FileText, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";

// Khai báo Props nhận vào từ page.tsx
interface Props {
    inputVat: any[];
    outputVat: any[];
}

export default function TaxManager({ inputVat, outputVat }: Props) {
    const [activeTab, setActiveTab] = useState("input_vat");

    // Tính tổng Thuế đầu vào
    const totalInputSubtotal = (inputVat || []).reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0);
    const totalInputVat = (inputVat || []).reduce((sum, inv) => sum + Number(inv.vat_amount || 0), 0);

    // Tính tổng Thuế đầu ra
    const totalOutputSubtotal = (outputVat || []).reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0);
    const totalOutputVat = (outputVat || []).reduce((sum, inv) => sum + Number(inv.vat_amount || 0), 0);

    // Tính Thuế phải nộp / Khấu trừ chuyển kỳ sau
    const netVat = totalOutputVat - totalInputVat;
    const isPayable = netVat > 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* WIDGET TỔNG QUAN THUẾ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-bold uppercase text-slate-500 flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-blue-500" /> Tổng Thuế Đầu Vào (Được khấu trừ)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatCurrency(totalInputVat)}</div>
                        <div className="text-xs text-slate-500 mt-1">Doanh số mua chưa thuế: {formatCurrency(totalInputSubtotal)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-bold uppercase text-slate-500 flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4 text-emerald-500" /> Tổng Thuế Đầu Ra (Phải nộp)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalOutputVat)}</div>
                        <div className="text-xs text-slate-500 mt-1">Doanh số bán chưa thuế: {formatCurrency(totalOutputSubtotal)}</div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 shadow-sm dark:bg-slate-900 dark:border-slate-800 ${isPayable ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'}`}>
                    <CardHeader className="pb-2">
                        <CardDescription className={`font-bold uppercase ${isPayable ? 'text-amber-700 dark:text-amber-500' : 'text-green-700 dark:text-green-500'} flex items-center gap-2`}>
                            <Calculator className="w-4 h-4" /> {isPayable ? 'VAT Phải nộp kỳ này' : 'VAT Khấu trừ chuyển kỳ sau'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-black ${isPayable ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
                            {formatCurrency(Math.abs(netVat))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BẢNG KÊ CHI TIẾT */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 h-auto w-full justify-start overflow-x-auto">
                    <TabsTrigger value="input_vat" className="py-2.5 px-6 font-semibold data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">
                        Bảng kê Mua vào (01-2/GTGT)
                    </TabsTrigger>
                    <TabsTrigger value="output_vat" className="py-2.5 px-6 font-semibold data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/20 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                        Bảng kê Bán ra (01-1/GTGT)
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: ĐẦU VÀO */}
                <TabsContent value="input_vat" className="mt-4">
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" /> BẢNG KÊ HÓA ĐƠN MUA VÀO
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-slate-100 dark:bg-slate-900/50">
                                    <TableRow className="dark:border-slate-800">
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[50px] text-center">STT</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Số Hóa Đơn</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ngày lập</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên người bán / MST</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Doanh số chưa thuế</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Thuế suất</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Thuế GTGT</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(inputVat || []).length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">Chưa có hóa đơn VAT đầu vào.</TableCell></TableRow>
                                    ) : inputVat.map((inv, index) => (
                                        <TableRow key={inv.id} className="dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="text-center text-slate-500 dark:text-slate-400">{index + 1}</TableCell>
                                            <TableCell className="font-bold text-blue-700 dark:text-blue-400">{inv.invoice_number}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{format(new Date(inv.invoice_date), "dd/MM/yyyy")}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{inv.po?.supplier?.name || "N/A"}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">MST: {inv.po?.supplier?.tax_code || "---"}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(inv.subtotal)}</TableCell>
                                            <TableCell className="text-center"><Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">{inv.vat_percent}%</Badge></TableCell>
                                            <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(inv.vat_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 2: ĐẦU RA */}
                <TabsContent value="output_vat" className="mt-4">
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500" /> BẢNG KÊ HÓA ĐƠN BÁN RA
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-slate-100 dark:bg-slate-900/50">
                                    <TableRow className="dark:border-slate-800">
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[50px] text-center">STT</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Số Hóa Đơn</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ngày lập</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên khách hàng / MST</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Doanh số chưa thuế</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Thuế suất</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Thuế GTGT</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(outputVat || []).length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">Chưa có dữ liệu Hóa đơn bán ra. Sẽ tự động lấy từ phân hệ Quản trị hợp đồng Khách hàng.</TableCell></TableRow>
                                    ) : (
                                        <></>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}