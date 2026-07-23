"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { BookOpen, Calculator, Filter, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export function GeneralLedger({ journalLines, projects, accounts }: { journalLines: any[], projects: any[], accounts: any[] }) {
    // Sổ cái BẮT BUỘC phải chọn 1 Tài khoản. Mặc định chọn TK đầu tiên hoặc Tiền mặt (111) nếu có.
    const defaultAccountId = accounts.find(a => a.code.startsWith("111"))?.id || accounts[0]?.id || "";

    const [selectedAccount, setSelectedAccount] = useState<string>(defaultAccountId);
    const [selectedProject, setSelectedProject] = useState<string>("all");

    // Lấy thông tin Tài khoản đang xem
    const currentAccount = accounts.find(a => a.id === selectedAccount);

    // Tính toán dữ liệu Sổ cái
    const ledgerData = useMemo(() => {
        if (!currentAccount) return { lines: [], totalDebit: 0, totalCredit: 0, endBalance: 0, isDebitAccount: true };

        // 1. Tính chất tài khoản (Dư Nợ hay Dư Có theo chuẩn VAS)
        // Loại 1, 2, 6, 8: Dư Nợ (Tài sản, Chi phí) -> Số dư = Nợ - Có
        // Loại 3, 4, 5, 7: Dư Có (Nguồn vốn, Doanh thu) -> Số dư = Có - Nợ
        const firstDigit = currentAccount.code.charAt(0);
        const isDebitAccount = ['1', '2', '6', '8'].includes(firstDigit);

        // 2. Lọc các bút toán LIÊN QUAN ĐẾN TÀI KHOẢN NÀY (và Dự án nếu có lọc)
        // Lưu ý: Trong thực tế sẽ có lọc Date Range để tính Dư đầu kỳ. Ở đây ta mặc định tính từ đầu (Dư ĐK = 0).
        let filteredLines = journalLines.filter(line =>
            line.account_id === currentAccount.id &&
            (selectedProject === "all" || line.project_id === selectedProject)
        );

        // Sắp xếp theo ngày tăng dần để tính lũy kế (Sổ cái xem từ cũ đến mới)
        filteredLines.sort((a, b) => new Date(a.journal_entries?.entry_date).getTime() - new Date(b.journal_entries?.entry_date).getTime());

        let totalDebit = 0;
        let totalCredit = 0;
        let runningBalance = 0; // Dư đầu kỳ mặc định = 0

        const processedLines = filteredLines.map(line => {
            const debit = Number(line.debit || 0);
            const credit = Number(line.credit || 0);

            totalDebit += debit;
            totalCredit += credit;

            // Tính số dư lũy kế từng dòng
            if (isDebitAccount) {
                runningBalance += (debit - credit);
            } else {
                runningBalance += (credit - debit);
            }

            // TÌM TÀI KHOẢN ĐỐI ỨNG (Đối chiếu trong cùng 1 Bút toán tổng - journal_entry_id)
            // Lấy các dòng khác cùng chung Chứng từ gốc, nhưng KHÁC ID dòng hiện tại
            const oppositeLines = journalLines.filter(l => l.journal_entry_id === line.journal_entry_id && l.id !== line.id);
            // Lấy mã TK của các dòng đối ứng
            const correspAccountCodes = oppositeLines.map(l => l.accounting_accounts?.code).filter(Boolean);
            const correspondingAccount = Array.from(new Set(correspAccountCodes)).join(", ");

            return {
                ...line,
                debit,
                credit,
                runningBalance,
                correspondingAccount: correspondingAccount || "---"
            };
        });

        return {
            lines: processedLines,
            totalDebit,
            totalCredit,
            endBalance: runningBalance,
            isDebitAccount
        };
    }, [journalLines, selectedAccount, selectedProject, currentAccount]);

    return (
        <div className="space-y-4">
            {/* THANH CÔNG CỤ (LỌC TÀI KHOẢN - DỰ ÁN) */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-col items-center gap-4 rounded-xl bg-slate-50/50 p-4 md:flex-row">
                    <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 font-bold whitespace-nowrap text-blue-700">
                        <FileText className="h-5 w-5" /> CHỌN TÀI KHOẢN:
                    </div>

                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="h-10 w-full border-slate-300 bg-white font-semibold md:w-[350px]">
                            <SelectValue placeholder="Chọn tài khoản cần xem Sổ cái" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id} className="font-mono">
                                    <span className="mr-2 font-bold text-blue-600">{acc.code}</span> - {acc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="h-10 w-full border-slate-300 bg-white md:w-[250px]">
                            <Filter className="mr-2 h-4 w-4 text-slate-500" />
                            <SelectValue placeholder="Lọc theo Dự án (Tùy chọn)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả dự án & Chi phí chung</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* BÁO CÁO SỔ CÁI */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-200 bg-white px-6 py-6 text-center">
                    <CardTitle className="text-2xl font-black tracking-tight text-slate-800 uppercase">Sổ Cái Tài Khoản</CardTitle>
                    {currentAccount && (
                        <p className="mt-2 font-medium text-slate-600">
                            Tài khoản: <span className="font-mono text-lg font-bold text-blue-700">{currentAccount.code}</span> - {currentAccount.name}
                        </p>
                    )}
                </CardHeader>
                <CardContent className="bg-white p-0">
                    <div className="overflow-x-auto">
                        <Table className="border-collapse">
                            <TableHeader>
                                <TableRow className="border-y border-slate-300 bg-slate-100 hover:bg-slate-100">
                                    <TableHead className="w-[100px] border-r border-slate-200 text-center font-bold text-slate-700">Ngày CT</TableHead>
                                    <TableHead className="w-[120px] border-r border-slate-200 text-center font-bold text-slate-700">Số CT</TableHead>
                                    <TableHead className="border-r border-slate-200 font-bold text-slate-700">Diễn giải</TableHead>
                                    <TableHead className="w-[100px] border-r border-slate-200 text-center font-bold text-slate-700" title="Tài khoản đối ứng">TK Đ.Ứng</TableHead>
                                    <TableHead className="w-[150px] border-r border-slate-200 text-right font-bold text-slate-700">Ghi NỢ</TableHead>
                                    <TableHead className="w-[150px] border-r border-slate-200 text-right font-bold text-slate-700">Ghi CÓ</TableHead>
                                    <TableHead className="w-[150px] text-right font-bold text-blue-700">Số Dư</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* DÒNG 1: SỐ DƯ ĐẦU KỲ */}
                                <TableRow className="border-b border-slate-300 bg-amber-50 font-bold hover:bg-amber-50">
                                    <TableCell colSpan={4} className="border-r border-slate-200 text-right text-amber-800">SỐ DƯ ĐẦU KỲ</TableCell>
                                    <TableCell className="border-r border-slate-200"></TableCell>
                                    <TableCell className="border-r border-slate-200"></TableCell>
                                    <TableCell className="text-right text-amber-800">0 ₫</TableCell>
                                    {/* (Thực tế sau này làm tính năng Filter theo Date, số này sẽ được tính dựa trên các giao dịch trước Date filter) */}
                                </TableRow>

                                {/* DANH SÁCH PHÁT SINH */}
                                {ledgerData.lines.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-12 text-center text-slate-500 italic">
                                            Không có phát sinh nào trong kỳ.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ledgerData.lines.map((line) => (
                                        <TableRow key={line.id} className="border-b border-slate-200 transition-colors hover:bg-slate-50">
                                            <TableCell className="border-r border-slate-200 text-center text-slate-600">
                                                {line.journal_entries?.entry_date ? format(new Date(line.journal_entries.entry_date), 'dd/MM/yyyy') : ''}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-center">
                                                <Badge variant="outline" className="bg-white font-mono text-[10px] text-slate-500">
                                                    {line.journal_entries?.entry_number}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-slate-700">
                                                {line.description}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                                                {line.correspondingAccount}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-right font-semibold text-slate-800">
                                                {line.debit > 0 ? formatVND(line.debit) : ''}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-right font-semibold text-slate-800">
                                                {line.credit > 0 ? formatVND(line.credit) : ''}
                                            </TableCell>
                                            <TableCell className="bg-blue-50/20 text-right font-bold text-blue-700">
                                                {formatVND(line.runningBalance)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}

                                {/* TỔNG CỘNG PHÁT SINH & DƯ CUỐI KỲ */}
                                <TableRow className="border-t-2 border-slate-300 bg-slate-100 font-bold hover:bg-slate-100">
                                    <TableCell colSpan={4} className="border-r border-slate-200 text-right text-slate-800 uppercase">CỘNG PHÁT SINH TRONG KỲ</TableCell>
                                    <TableCell className="border-r border-slate-200 text-right text-slate-800">{formatVND(ledgerData.totalDebit)}</TableCell>
                                    <TableCell className="border-r border-slate-200 text-right text-slate-800">{formatVND(ledgerData.totalCredit)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow className="border-b border-slate-300 bg-blue-50 text-lg font-black hover:bg-blue-50">
                                    <TableCell colSpan={6} className="border-r border-slate-200 text-right text-blue-800 uppercase">SỐ DƯ CUỐI KỲ</TableCell>
                                    <TableCell className="text-right text-blue-700">{formatVND(ledgerData.endBalance)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}