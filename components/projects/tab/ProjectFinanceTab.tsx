"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface FinanceStats {
    summary: {
        income: number;
        expense: number;
        profit: number;
    };
    transactions: any[];
}

export default function ProjectFinanceTab({ stats }: { stats: FinanceStats }) {
    // --- ĐOẠN CHECK AN TOÀN QUAN TRỌNG ---
    // Nếu stats không tồn tại HOẶC stats.summary không tồn tại -> Hiển thị Loading/Empty
    if (!stats || !stats.summary) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-white rounded-lg border border-dashed">
                <p>Chưa có dữ liệu tài chính hoặc đang tải...</p>
            </div>
        );
    }
    // -------------------------------------

    const formatMoney = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    return (
        <div className="space-y-6">
            {/* 1. KHỐI THỐNG KÊ TỔNG QUAN (3 Thẻ) */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Thẻ Thu */}
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Tổng thực thu</CardTitle>
                        <Wallet className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        {/* Sử dụng optional chaining (?.) để an toàn tuyệt đối */}
                        <div className="text-2xl font-bold text-green-700">{formatMoney(stats.summary.income || 0)}</div>
                        <p className="text-xs text-green-600/80 mt-1">Đã thu từ khách hàng</p>
                    </CardContent>
                </Card>

                {/* Thẻ Chi */}
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Tổng thực chi</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{formatMoney(stats.summary.expense || 0)}</div>
                        <p className="text-xs text-red-600/80 mt-1">Vật tư, Nhân công, Thầu phụ...</p>
                    </CardContent>
                </Card>

                {/* Thẻ Lợi nhuận (Lãi/Lỗ) */}
                <Card className={(stats.summary.profit || 0) >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={(stats.summary.profit || 0) >= 0 ? "text-sm font-medium text-blue-700" : "text-sm font-medium text-orange-700"}>
                            Lợi nhuận tạm tính
                        </CardTitle>
                        {(stats.summary.profit || 0) >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 text-orange-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={(stats.summary.profit || 0) >= 0 ? "text-2xl font-bold text-blue-700" : "text-2xl font-bold text-orange-700"}>
                            {formatMoney(stats.summary.profit || 0)}
                        </div>
                        <p className={(stats.summary.profit || 0) >= 0 ? "text-xs text-blue-600/80 mt-1" : "text-xs text-orange-600/80 mt-1"}>
                            {(stats.summary.profit || 0) >= 0 ? "Dòng tiền dương" : "Đang thâm hụt vốn"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 2. DANH SÁCH CHI TIẾT */}
            <Card>
                <CardHeader>
                    <CardTitle>Chi tiết thu chi của dự án</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ngày</TableHead>
                                <TableHead>Nội dung</TableHead>
                                <TableHead>Hạng mục</TableHead>
                                <TableHead className="text-right">Số tiền</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!stats.transactions || stats.transactions.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Chưa có giao dịch nào cho dự án này.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats.transactions.map((t: any) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(t.transaction_date), "dd/MM/yyyy", { locale: vi })}
                                        </TableCell>
                                        <TableCell className="font-medium">{t.description}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    borderColor: t.category?.color || '#ccc',
                                                    color: t.category?.color || '#000',
                                                    backgroundColor: `${t.category?.color || '#ccc'}15`
                                                }}
                                            >
                                                {t.category?.name || 'Khác'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}