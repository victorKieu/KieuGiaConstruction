"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2 } from "lucide-react";

interface Props {
    budgetItems: any[];
}

export default function BudgetTable({ budgetItems }: Props) {
    return (
        <Card className="border-none shadow-none">
            <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 text-green-800 rounded-lg border border-green-100">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                    Số liệu dưới đây được tổng hợp tự động từ Bảng bóc tách khối lượng & Định mức.
                </span>
            </div>

            <Table className="bg-white border rounded-md">
                <TableHeader>
                    <TableRow className="bg-slate-100">
                        <TableHead className="w-[50px]">STT</TableHead>
                        <TableHead>Tên Vật tư / Tài nguyên</TableHead>
                        <TableHead className="text-center w-[100px]">ĐVT</TableHead>
                        <TableHead className="text-right w-[150px]">Khối lượng Chuẩn</TableHead>
                        <TableHead className="text-right w-[150px]">Đã duyệt</TableHead>
                        <TableHead className="text-right w-[150px]">Đã yêu cầu</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {budgetItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                <div className="flex flex-col items-center gap-2">
                                    <Package className="w-10 h-10 text-slate-300" />
                                    <span>Chưa có số liệu. Vui lòng nhấn nút "Tính toán" ở tab Bóc tách.</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        budgetItems.map((item, index) => (
                            <TableRow key={item.id} className="hover:bg-slate-50">
                                <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                                <TableCell className="font-medium text-slate-700">{item.material_name}</TableCell>
                                <TableCell className="text-center"><Badge variant="secondary">{item.unit}</Badge></TableCell>
                                <TableCell className="text-right font-bold text-blue-600">
                                    {Number(item.budget_quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right text-slate-600">
                                    {Number(item.approved_quantity || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-slate-600">
                                    {Number(item.requested_quantity || 0).toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}