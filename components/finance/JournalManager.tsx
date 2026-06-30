"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Building2, User, Link as LinkIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";

export default function JournalManager({ initialData }: { initialData: any[] }) {
    const [journals, setJournals] = useState(initialData || []);

    // Helper map loại chứng từ ra tiếng Việt
    const getRefLabel = (type: string) => {
        switch (type) {
            case 'invoice': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">Hóa đơn mua</Badge>;
            case 'payment': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">Chi tiền HĐ</Badge>;
            case 'payment_request': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Giải ngân nội bộ</Badge>;
            case 'finance_transaction_legacy': return <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Dữ liệu cũ</Badge>;
            default: return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <Card className="border-t-4 border-t-slate-700 dark:border-t-slate-500 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <CardTitle className="text-lg flex items-center gap-2 dark:text-slate-100">
                    <BookOpen className="w-5 h-5 text-slate-700 dark:text-slate-400" /> Bảng Cân Đối Phát Sinh
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[900px]">
                    <TableHeader className="bg-slate-100 dark:bg-slate-900/80">
                        <TableRow className="dark:border-slate-800">
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[120px]">Ngày ghi sổ</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[130px]">Số CT</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 min-w-[250px]">Diễn giải / Định khoản</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-[120px] text-center">Tài khoản</TableHead>
                            <TableHead className="text-right font-bold text-blue-700 dark:text-blue-400 w-[150px]">Nợ (Debit)</TableHead>
                            <TableHead className="text-right font-bold text-amber-700 dark:text-amber-500 w-[150px]">Có (Credit)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500">Chưa có phát sinh kế toán nào.</TableCell>
                            </TableRow>
                        ) : journals.map((je: any) => (
                            <React.Fragment key={je.id}>
                                {/* DÒNG HEADER CỦA BÚT TOÁN */}
                                <TableRow className="bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b-0">
                                    <TableCell className="font-medium align-top pt-4">
                                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                            <Calendar className="w-3 h-3" /> {format(new Date(je.entry_date), 'dd/MM/yyyy')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{je.entry_number}</div>
                                        <div className="mt-1">{getRefLabel(je.reference_type)}</div>
                                    </TableCell>
                                    <TableCell colSpan={4} className="align-top pt-4 pb-2">
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">{je.description}</div>
                                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            {je.project && <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-indigo-500" /> {je.project.name}</span>}
                                            {je.creator && <span className="flex items-center gap-1"><User className="w-3 h-3" /> Lập bởi: {je.creator.name}</span>}
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* CÁC DÒNG CHI TIẾT NỢ / CÓ */}
                                {je.lines?.sort((a: any, b: any) => b.debit - a.debit).map((line: any, index: number) => {
                                    const isDebit = Number(line.debit) > 0;
                                    return (
                                        <TableRow key={line.id} className="dark:border-slate-800 border-b-0 hover:bg-transparent">
                                            <TableCell colSpan={2} className="py-1"></TableCell>
                                            <TableCell className="py-1.5 pl-6">
                                                <div className={`text-sm ${isDebit ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-600 dark:text-slate-400 pl-8'}`}>
                                                    {line.account?.name || "Tài khoản không xác định"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-center">
                                                <Badge variant="outline" className={`font-mono text-xs ${isDebit ? 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'}`}>
                                                    {line.account?.code || "---"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-semibold text-blue-700 dark:text-blue-400">
                                                {isDebit ? formatCurrency(line.debit) : ""}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-semibold text-amber-700 dark:text-amber-500">
                                                {!isDebit ? formatCurrency(line.credit) : ""}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {/* Dòng kẻ phân cách giữa các Chứng từ */}
                                <TableRow className="dark:border-slate-800 h-2 border-b-2"><TableCell colSpan={6} className="p-0"></TableCell></TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// Bổ sung import React để dùng React.Fragment
import React from 'react';