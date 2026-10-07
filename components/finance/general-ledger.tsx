"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { BookOpen, Filter, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
};

export function GeneralLedger({ journalLines, projects, accounts }: { journalLines: any[], projects: any[], accounts: any[] }) {
    // Với dạng Sổ Nhật Ký Chung, mặc định ta sẽ xem "Tất cả" tài khoản
    const [selectedAccount, setSelectedAccount] = useState<string>("all");
    const [selectedProject, setSelectedProject] = useState<string>("all");

    // Engine Lọc và Xử lý dữ liệu chuẩn form Nhật Ký Chung
    const ledgerData = useMemo(() => {
        let filteredLines = journalLines.filter(line =>
            (selectedAccount === "all" || line.account_id === selectedAccount) &&
            (selectedProject === "all" || line.project_id === selectedProject)
        );

        // Sắp xếp theo ngày tăng dần, sau đó gom các dòng cùng 1 bút toán lại với nhau
        filteredLines.sort((a, b) => {
            const dateA = new Date(a.journal_entries?.entry_date).getTime();
            const dateB = new Date(b.journal_entries?.entry_date).getTime();
            if (dateA !== dateB) return dateA - dateB;

            // Nếu trùng ngày, xếp theo số chứng từ
            const entryNumA = a.journal_entries?.entry_number || "";
            const entryNumB = b.journal_entries?.entry_number || "";
            return entryNumA.localeCompare(entryNumB);
        });

        let totalDebit = 0;
        let totalCredit = 0;

        const processedLines = filteredLines.map(line => {
            const debit = Number(line.debit || 0);
            const credit = Number(line.credit || 0);

            totalDebit += debit;
            totalCredit += credit;

            // Lấy mã TK hiện tại
            const currentAccountCode = line.accounting_accounts?.code || "";

            // Lấy số chứng từ hiện tại làm điểm neo (Ví dụ: PC-2606-0030)
            const currentEntryNumber = line.journal_entries?.entry_number;

            // TÌM TÀI KHOẢN ĐỐI ỨNG (Logic đã được Siết Chặt)
            const isDebit = debit > 0;
            const oppositeLines = journalLines.filter(l => {
                // Ràng buộc 1: BẮT BUỘC phải cùng Số hiệu chứng từ
                const isSameVoucher = l.journal_entries?.entry_number === currentEntryNumber && currentEntryNumber !== undefined;

                // Ràng buộc 2: Bỏ qua chính dòng hiện tại
                const isNotSelf = l.id !== line.id;

                // Ràng buộc 3: Ngược vế (Dòng này Nợ thì tìm các dòng Có, và ngược lại)
                const isOpposite = isDebit ? Number(l.credit) > 0 : Number(l.debit) > 0;

                return isSameVoucher && isNotSelf && isOpposite;
            });

            // Trích xuất mã TK và loại bỏ trùng lặp (Ví dụ mua 2 món hàng bằng 111 thì TK đối ứng chỉ hiện 1 lần 111)
            const correspAccountCodes = oppositeLines.map(l => l.accounting_accounts?.code).filter(Boolean);
            const correspondingAccount = Array.from(new Set(correspAccountCodes)).join(";");

            return {
                ...line,
                debit,
                credit,
                currentAccountCode,
                correspondingAccount: correspondingAccount || "---"
            };
        });

        return {
            lines: processedLines,
            totalDebit,
            totalCredit
        };
    }, [journalLines, selectedAccount, selectedProject]);

    return (
        <div className="space-y-4 transition-colors duration-300">
            {/* THANH CÔNG CỤ LỌC */}
            <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="flex flex-col items-center gap-4 rounded-xl bg-slate-50/50 p-4 md:flex-row dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 font-bold whitespace-nowrap text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        <FileText className="h-5 w-5" /> BỘ LỌC TÌM KIẾM:
                    </div>

                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="h-10 w-full border-slate-300 bg-white font-semibold md:w-[350px] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                            <SelectValue placeholder="Tất cả tài khoản" />
                        </SelectTrigger>
                        <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                            <SelectItem value="all" className="font-bold text-blue-600 dark:focus:bg-slate-800">-- Xem Tất Cả Tài Khoản --</SelectItem>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id} className="font-mono dark:focus:bg-slate-800">
                                    <span className="mr-2 font-bold text-blue-600 dark:text-blue-400">{acc.code}</span> - {acc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="h-10 w-full border-slate-300 bg-white md:w-[250px] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                            <Filter className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <SelectValue placeholder="Lọc theo Dự án" />
                        </SelectTrigger>
                        <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                            <SelectItem value="all" className="dark:focus:bg-slate-800">Tất cả dự án & Chi phí chung</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id} className="dark:focus:bg-slate-800">{p.code} - {p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* BÁO CÁO NHẬT KÝ CHUNG */}
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader className="rounded-t-xl border-b border-slate-200 bg-white px-6 py-6 text-center dark:border-slate-800 dark:bg-slate-950">
                    <CardTitle className="text-2xl font-black tracking-tight text-slate-800 uppercase dark:text-slate-100">
                        {selectedAccount === 'all' ? 'Sổ Nhật Ký Chung' : 'Sổ Chi Tiết Tài Khoản'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="rounded-b-xl bg-white p-0 dark:bg-slate-950">
                    <div className="overflow-x-auto">
                        <Table className="w-full border-collapse">
                            <TableHeader>
                                {/* HEADER TẦNG 1 */}
                                <TableRow className="bg-[#0f4a8a] hover:bg-[#0f4a8a] dark:bg-slate-800 dark:hover:bg-slate-800">
                                    <TableHead rowSpan={2} className="min-w-[100px] border border-slate-300/20 p-2 text-center align-middle font-bold text-white">Ngày tháng<br />ghi sổ</TableHead>
                                    <TableHead colSpan={2} className="border border-slate-300/20 p-2 text-center font-bold text-white">Chứng từ</TableHead>
                                    <TableHead rowSpan={2} className="min-w-[250px] border border-slate-300/20 p-2 text-center align-middle font-bold text-white">Diễn Giải</TableHead>
                                    <TableHead rowSpan={2} className="min-w-[80px] border border-slate-300/20 p-2 text-center align-middle font-bold text-white">
                                        <div className="flex flex-col items-center justify-center">
                                            <span>TK Nợ</span>
                                            <hr className="my-1 w-full border-white/30" />
                                            <span>TK Có</span>
                                        </div>
                                    </TableHead>
                                    <TableHead rowSpan={2} className="min-w-[90px] border border-slate-300/20 p-2 text-center align-middle font-bold text-white">TK Đối ứng</TableHead>
                                    <TableHead colSpan={2} className="border border-slate-300/20 p-2 text-center font-bold text-white">Số phát sinh</TableHead>
                                </TableRow>
                                {/* HEADER TẦNG 2 */}
                                <TableRow className="bg-[#0f4a8a] hover:bg-[#0f4a8a] dark:bg-slate-800 dark:hover:bg-slate-800">
                                    <TableHead className="top-[auto] h-auto min-w-[90px] border border-slate-300/20 p-2 text-center font-bold text-white">Số hiệu</TableHead>
                                    <TableHead className="top-[auto] h-auto min-w-[100px] border border-slate-300/20 p-2 text-center font-bold text-white">Ngày tháng</TableHead>
                                    <TableHead className="top-[auto] h-auto min-w-[130px] border border-slate-300/20 p-2 text-center font-bold text-white">Nợ<br /><span className="font-normal text-[10px]">(1)</span></TableHead>
                                    <TableHead className="top-[auto] h-auto min-w-[130px] border border-slate-300/20 p-2 text-center font-bold text-white">Có<br /><span className="font-normal text-[10px]">(2)</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* DÒNG GROUP ĐẦU TIÊN GIỐNG EXCEL */}
                                <TableRow className="bg-[#b3d7ff] font-bold hover:bg-[#b3d7ff] dark:bg-blue-900/30 dark:hover:bg-blue-900/30">
                                    <TableCell colSpan={8} className="border border-slate-300 py-1.5 text-center text-blue-900 dark:border-slate-700 dark:text-blue-400">
                                        Phát sinh trong kỳ
                                    </TableCell>
                                </TableRow>

                                {/* DANH SÁCH PHÁT SINH */}
                                {ledgerData.lines.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="border border-slate-300 py-12 text-center text-slate-500 italic dark:border-slate-700 dark:text-slate-400">
                                            Không có phát sinh nào trong kỳ.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ledgerData.lines.map((line, idx) => {
                                        // Kiểm tra nếu chuyển sang bút toán khác thì tạo viền đậm hơn ở dưới
                                        const nextLine = ledgerData.lines[idx + 1];
                                        const isLastLineOfEntry = !nextLine || nextLine.journal_entry_id !== line.journal_entry_id;

                                        return (
                                            <TableRow key={line.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isLastLineOfEntry ? 'border-b-2 border-b-slate-400 dark:border-b-slate-600' : 'border-b border-b-slate-200 dark:border-b-slate-800'}`}>
                                                {/* Cột A: Ngày ghi sổ */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-center font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                                    {line.journal_entries?.entry_date ? format(new Date(line.journal_entries.entry_date), 'dd/MM/yyyy') : ''}
                                                </TableCell>
                                                {/* Cột B: Số hiệu */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-center dark:border-slate-700">
                                                    <span className="font-mono text-slate-700 dark:text-slate-300">
                                                        {line.journal_entries?.entry_number}
                                                    </span>
                                                </TableCell>
                                                {/* Cột C: Ngày tháng chứng từ */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-center font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                                    {line.journal_entries?.entry_date ? format(new Date(line.journal_entries.entry_date), 'dd/MM/yyyy') : ''}
                                                </TableCell>
                                                {/* Cột D: Diễn giải */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-slate-800 dark:border-slate-700 dark:text-slate-200">
                                                    {line.description}
                                                </TableCell>
                                                {/* Cột E: TK Nợ / Có */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-center font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                                                    {line.currentAccountCode}
                                                </TableCell>
                                                {/* Cột F: TK Đối ứng */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-center font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                                                    {line.correspondingAccount}
                                                </TableCell>
                                                {/* Cột G: Số phát sinh NỢ */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-right font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                                                    {line.debit > 0 ? formatVND(line.debit) : ''}
                                                </TableCell>
                                                {/* Cột H: Số phát sinh CÓ */}
                                                <TableCell className="border-x border-slate-300 py-1.5 text-right font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                                                    {line.credit > 0 ? formatVND(line.credit) : ''}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}

                                {/* TỔNG CỘNG PHÁT SINH */}
                                <TableRow className="bg-[#b3d7ff] font-bold hover:bg-[#b3d7ff] dark:bg-blue-900/50 dark:hover:bg-blue-900/50">
                                    <TableCell colSpan={6} className="border border-slate-300 py-2 text-center text-slate-800 uppercase dark:border-slate-700 dark:text-slate-100">
                                        Tổng cộng phát sinh
                                    </TableCell>
                                    <TableCell className="border border-slate-300 py-2 text-right text-slate-900 dark:border-slate-700 dark:text-white">
                                        {formatVND(ledgerData.totalDebit)}
                                    </TableCell>
                                    <TableCell className="border border-slate-300 py-2 text-right text-slate-900 dark:border-slate-700 dark:text-white">
                                        {formatVND(ledgerData.totalCredit)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}