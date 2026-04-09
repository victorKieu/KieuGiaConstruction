import React from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Cấu trúc dữ liệu chuẩn Kế toán Lương (2026)
export interface PayrollRecord {
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    baseSalary: number;         // Lương cơ bản / Lương đóng BHXH
    standardDays: number;       // Số ngày công chuẩn trong tháng (Vd: 26)
    actualDays: number;         // Số ngày đi làm thực tế
    otHours: number;            // Số giờ tăng ca
    allowances: number;         // Phụ cấp (Cơm, xăng xe...)
    grossSalary: number;        // Tổng thu nhập (Lương thời gian + OT + Phụ cấp)
    insuranceDeduction: number; // Trừ BHXH (10.5%)
    taxDeduction: number;       // Trừ Thuế TNCN
    advancePayment: number;     // Tạm ứng
    netSalary: number;          // Thực lãnh
}

interface PayrollTableProps {
    records: PayrollRecord[];
}

export function PayrollTable({ records }: PayrollTableProps) {

    // Hàm format Tiền tệ VNĐ
    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (!records || records.length === 0) {
        return <div className="p-8 text-center text-slate-500">Chưa có dữ liệu bảng lương.</div>;
    }

    return (
        <div className="w-full overflow-x-auto">
            {/* Phân định rõ 3 nhóm màu Header để HR dễ đọc: Thông tin (Xám) -> Thu Nhập (Xanh lá) -> Khấu trừ (Đỏ) */}
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-100/80 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                        <TableHead className="w-[80px] font-bold text-slate-700 dark:text-slate-200">Mã NV</TableHead>
                        <TableHead className="min-w-[150px] font-bold text-slate-700 dark:text-slate-200">Họ Tên</TableHead>
                        <TableHead className="min-w-[120px] font-bold text-slate-700 dark:text-slate-200">Phòng ban</TableHead>

                        <TableHead className="text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">Lương cơ bản</TableHead>
                        <TableHead className="text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">Ngày công</TableHead>
                        <TableHead className="text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">Phụ cấp</TableHead>
                        <TableHead className="text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">Tổng Thu Nhập</TableHead>

                        <TableHead className="text-right font-bold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10">Trừ BHXH (10.5%)</TableHead>
                        <TableHead className="text-right font-bold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10">Thuế TNCN</TableHead>
                        <TableHead className="text-right font-bold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10">Tạm ứng</TableHead>

                        <TableHead className="text-right font-black text-blue-700 dark:text-blue-400 text-base min-w-[130px]">THỰC LÃNH</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((r) => (
                        <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <TableCell className="font-mono text-xs text-slate-500">{r.employeeCode}</TableCell>
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200">{r.name}</TableCell>
                            <TableCell className="text-sm">{r.department}</TableCell>

                            <TableCell className="text-right font-medium">{formatVND(r.baseSalary)}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline" className={r.actualDays < r.standardDays ? "text-amber-600 border-amber-200 bg-amber-50" : ""}>
                                    {r.actualDays} / {r.standardDays}
                                </Badge>
                                {r.otHours > 0 && <div className="text-[10px] text-blue-600 mt-1">+ {r.otHours}h OT</div>}
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatVND(r.allowances)}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatVND(r.grossSalary)}</TableCell>

                            <TableCell className="text-right text-sm text-red-600">{formatVND(r.insuranceDeduction)}</TableCell>
                            <TableCell className="text-right text-sm text-red-600">{formatVND(r.taxDeduction)}</TableCell>
                            <TableCell className="text-right text-sm text-red-600">{r.advancePayment > 0 ? formatVND(r.advancePayment) : "-"}</TableCell>

                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 text-base bg-blue-50/30 dark:bg-blue-900/10">
                                {formatVND(r.netSalary)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}