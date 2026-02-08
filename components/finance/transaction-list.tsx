"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
// ✅ Đã bổ sung đầy đủ các icon cần thiết
import { ArrowDownRight, ArrowUpRight, Eye, FileText, Building2 } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Import Dialog chi tiết
import { TransactionDetailDialog } from "@/components/finance/transaction-detail-dialog";

export function TransactionList({ data }: { data: any[] }) {
    // State quản lý dialog
    const [selectedTrans, setSelectedTrans] = useState<any>(null);
    const [openDetail, setOpenDetail] = useState(false);

    // Helper format tiền tệ
    const formatMoney = (amount: number, type: string) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);

        // Nếu là chi thì thêm dấu trừ
        return type === 'expense' ? `-${formatted}` : `+${formatted}`;
    };

    // Hàm mở chi tiết
    const handleViewDetail = (item: any) => {
        setSelectedTrans(item);
        setOpenDetail(true);
    };

    return (
        <>
            <Card className="h-full border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-medium"></CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Container bảng có hỗ trợ Dark Mode */}
                    <div className="rounded-md border bg-card text-card-foreground dark:bg-slate-950 dark:border-slate-800">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b dark:border-slate-800">
                                    <TableHead className="w-[100px] text-slate-500 dark:text-slate-400">Ngày</TableHead>
                                    <TableHead className="text-slate-500 dark:text-slate-400">Nội dung</TableHead>
                                    <TableHead className="text-slate-500 dark:text-slate-400">Hạng mục</TableHead>
                                    <TableHead className="text-right text-slate-500 dark:text-slate-400">Số tiền</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Chưa có giao dịch nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item: any) => (
                                        <TableRow
                                            key={item.id}
                                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 group border-b dark:border-slate-800"
                                        >
                                            {/* Cột 1: Ngày */}
                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                {format(new Date(item.transaction_date), "dd/MM/yyyy", { locale: vi })}
                                            </TableCell>

                                            {/* Cột 2: Diễn giải */}
                                            <TableCell onClick={() => handleViewDetail(item)}>
                                                <div className="font-medium text-sm line-clamp-1 dark:text-slate-200" title={item.description || ""}>
                                                    {item.description || "Không có ghi chú"}
                                                </div>

                                                {/* Hiển thị thông tin HĐ kèm theo */}
                                                {item.invoice_number && (
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-blue-600 dark:text-blue-400">
                                                        <FileText className="w-3 h-3" />
                                                        <span>HĐ: {item.invoice_number}</span>
                                                        {item.supplier_name && (
                                                            <span className="text-slate-500 dark:text-slate-400"> | NCC: {item.supplier_name}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Hiển thị thông tin Dự án kèm theo */}
                                                {item.project && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        <Building2 className="w-3 h-3" />
                                                        <span>{item.project.name}</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Cột 3: Hạng mục (Badge màu) */}
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    style={{
                                                        borderColor: item.category?.color || '#ccc',
                                                        color: item.category?.color || '#000',
                                                        backgroundColor: `${item.category?.color}10`
                                                    }}
                                                >
                                                    {item.category?.name || "Khác"}
                                                </Badge>
                                            </TableCell>

                                            {/* Cột 4: Số tiền (Xanh/Đỏ) */}
                                            <TableCell className={`text-right font-bold flex items-center justify-end gap-1 ${item.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                                }`}>
                                                {item.type === 'income' ? (
                                                    <ArrowUpRight className="h-4 w-4" />
                                                ) : (
                                                    <ArrowDownRight className="h-4 w-4" />
                                                )}
                                                {formatMoney(item.amount, item.type)}
                                            </TableCell>

                                            {/* Cột 5: Nút Xem chi tiết */}
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleViewDetail(item)}
                                                    title="Xem chi tiết & In"
                                                >
                                                    <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog Chi tiết */}
            {selectedTrans && (
                <TransactionDetailDialog
                    transaction={selectedTrans}
                    open={openDetail}
                    setOpen={setOpenDetail}
                />
            )}
        </>
    );
}