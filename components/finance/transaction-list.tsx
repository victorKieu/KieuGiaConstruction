"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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

// Định nghĩa kiểu dữ liệu nhận vào
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
}

export function TransactionList({ data }: { data: any[] }) {
    // Helper format tiền tệ
    const formatMoney = (amount: number, type: string) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);

        // Nếu là chi thì thêm dấu trừ
        return type === 'expense' ? `-${formatted}` : `+${formatted}`;
    };

    return (
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Chưa có giao dịch nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item: Transaction) => (
                                    <TableRow key={item.id}>
                                        {/* Cột 1: Ngày */}
                                        <TableCell className="font-medium text-xs text-muted-foreground">
                                            {format(new Date(item.transaction_date), "dd/MM/yyyy", { locale: vi })}
                                        </TableCell>

                                        {/* Cột 2: Diễn giải */}
                                        <TableCell>
                                            <div className="font-medium line-clamp-1" title={item.description || ""}>
                                                {item.description || "Không có ghi chú"}
                                            </div>
                                        </TableCell>

                                        {/* Cột 3: Hạng mục (Badge màu) */}
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    borderColor: item.category?.color || '#ccc',
                                                    color: item.category?.color || '#000',
                                                    backgroundColor: `${item.category?.color}10` // Thêm độ trong suốt 10%
                                                }}
                                            >
                                                {item.category?.name || "Khác"}
                                            </Badge>
                                        </TableCell>

                                        {/* Cột 4: Số tiền (Xanh/Đỏ) */}
                                        <TableCell className={`text-right font-bold flex items-center justify-end gap-1 ${item.type === 'income' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {item.type === 'income' ? (
                                                <ArrowUpRight className="h-4 w-4" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4" />
                                            )}
                                            {formatMoney(item.amount, item.type)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}