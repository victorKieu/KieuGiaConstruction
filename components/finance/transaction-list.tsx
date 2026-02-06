"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Eye } from "lucide-react"; // Import Eye

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

// ✅ Import Component Dialog mới
import { TransactionDetailDialog } from "@/components/finance/transaction-detail-dialog";

interface Transaction {
    id: string;
    amount: number;
    type: "income" | "expense";
    description: string | null;
    transaction_date: string;
    category: {
        name: string;
        color: string;
    } | null;
    // Bổ sung các field tiềm năng khác nếu có để TypeScript không báo lỗi
    invoice?: any;
    project?: any;
}

export function TransactionList({ data }: { data: any[] }) {
    // ✅ State quản lý Dialog
    const [selectedTrans, setSelectedTrans] = useState<any>(null);
    const [openDetail, setOpenDetail] = useState(false);

    // Helper format tiền tệ
    const formatMoney = (amount: number, type: string) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
        return type === 'expense' ? `-${formatted}` : `+${formatted}`;
    };

    // ✅ Hàm mở chi tiết
    const handleViewDetail = (item: any) => {
        setSelectedTrans(item);
        setOpenDetail(true);
    };

    return (
        <>
            <Card className="h-full border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-medium">Lịch sử giao dịch gần đây</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Ngày</TableHead>
                                    <TableHead>Nội dung</TableHead>
                                    <TableHead>Hạng mục</TableHead>
                                    <TableHead className="text-right">Số tiền</TableHead>
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
                                    data.map((item: Transaction) => (
                                        <TableRow key={item.id} className="group hover:bg-slate-50 transition-colors">
                                            {/* Cột 1: Ngày */}
                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                {format(new Date(item.transaction_date), "dd/MM/yyyy", { locale: vi })}
                                            </TableCell>

                                            {/* Cột 2: Diễn giải (Clickable) */}
                                            <TableCell className="cursor-pointer" onClick={() => handleViewDetail(item)}>
                                                <div className="font-medium line-clamp-1" title={item.description || ""}>
                                                    {item.description || "Không có ghi chú"}
                                                </div>
                                            </TableCell>

                                            {/* Cột 3: Hạng mục */}
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

                                            {/* Cột 4: Số tiền */}
                                            <TableCell className={`text-right font-bold flex items-center justify-end gap-1 ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                                {formatMoney(item.amount, item.type)}
                                            </TableCell>

                                            {/* ✅ Cột 5: Nút Xem/In */}
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleViewDetail(item)}
                                                    title="Xem chi tiết & In"
                                                >
                                                    <Eye className="w-4 h-4 text-slate-500" />
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

            {/* ✅ Hiển thị Dialog khi có selectedTrans */}
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