"use client";

import { useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/utils";

// Định nghĩa kiểu dữ liệu (Khớp với DB)
interface EstimateItem {
    id: string;
    material_code: string;
    material_name: string;
    unit: string;
    quantity: number;
    unit_price: number;
}

interface Props {
    projectId: string;
    initialEstimates: EstimateItem[]; // Dữ liệu từ Server
    // Các props khác nếu cần...
    [key: string]: any;
}

export default function CostManager({ projectId, initialEstimates }: Props) {
    const [items, setItems] = useState<EstimateItem[]>(initialEstimates);
    const [loading, setLoading] = useState(false);

    // Tính tổng chi phí dự kiến
    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    return (
        <Card className="border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 pb-2">
                <div>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                        <Coins className="w-5 h-5 text-yellow-600" />
                        Bảng Chi tiết Dự toán
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Kết quả bóc tách khối lượng và đơn giá dự kiến
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Tổng cộng</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalCost)}</p>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead className="w-[50px] text-center">STT</TableHead>
                            <TableHead className="w-[100px]">Mã hiệu</TableHead>
                            <TableHead>Tên công tác / Vật tư</TableHead>
                            <TableHead className="w-[80px] text-center">ĐVT</TableHead>
                            <TableHead className="w-[120px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[150px] text-right">Đơn giá (TB)</TableHead>
                            <TableHead className="w-[150px] text-right">Thành tiền</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                    Chưa có dữ liệu. <br />
                                    Hãy bấm nút <strong>"Lập Dự toán (Wizard)"</strong> ở trên để tạo tự động.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={item.id || index} className="hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                                    <TableCell className="font-mono text-xs font-semibold text-slate-600">
                                        {item.material_code}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-800">{item.material_name}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50">
                                            {item.unit}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-blue-700">
                                        {item.quantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell className="text-right text-slate-600">
                                        {formatCurrency(item.unit_price)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-900">
                                        {formatCurrency(item.quantity * item.unit_price)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}