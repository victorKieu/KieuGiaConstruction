"use client";

import React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, AlertCircle, PackageSearch, ArrowRight } from "lucide-react";

// Import Dialog nhập kho (Xem code ở phần 2 dưới đây)
import GoodsReceiptDialog from "@/components/inventory/GoodsReceiptDialog";

interface Props {
    orders: any[];
    warehouseId: string | null;
}

export default function WarehouseInboundManager({ orders, warehouseId }: Props) {

    // Case 1: Chưa xác định được kho (Lỗi cấu hình dự án)
    if (!warehouseId) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-red-200 rounded-xl bg-red-50">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-red-800 font-bold text-lg">Chưa cấu hình Kho nhận hàng</h3>
                <p className="text-red-600 text-sm mt-1">
                    Dự án này chưa được liên kết với Kho vật lý nào.<br />
                    Vui lòng liên hệ Quản trị viên để cấu hình "Project Warehouse".
                </p>
            </div>
        );
    }

    // Case 2: Không có đơn hàng nào đang về
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <PackageSearch className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-slate-700 font-semibold text-lg">Không có hàng đang về</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-md">
                    Hiện tại không có Đơn mua hàng (PO) nào ở trạng thái "Đã đặt hàng" chờ nhập kho.
                </p>
                <div className="mt-6">
                    <Button variant="outline" disabled>Kiểm tra lại sau</Button>
                </div>
            </div>
        );
    }

    // Case 3: Có dữ liệu -> Hiển thị bảng
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Thẻ thống kê nhanh */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-50 border-blue-100 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Đơn hàng chờ nhập</p>
                            <p className="text-2xl font-bold text-blue-800">{orders.length}</p>
                        </div>
                        <Truck className="w-8 h-8 text-blue-200" />
                    </CardContent>
                </Card>
            </div>

            {/* Bảng danh sách */}
            <Card className="border shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-slate-500" />
                        <h3 className="font-semibold text-slate-700">Danh sách Đơn hàng (Incoming PO)</h3>
                    </div>
                    <Badge variant="outline" className="bg-white">Tổng: {orders.length} đơn</Badge>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-white hover:bg-white">
                            <TableHead className="w-[120px]">Mã Đơn</TableHead>
                            <TableHead className="w-[200px]">Nhà Cung Cấp</TableHead>
                            <TableHead>Thông tin Vận chuyển</TableHead>
                            <TableHead className="w-[300px]">Tóm tắt Vật tư</TableHead>
                            <TableHead className="text-center w-[120px]">Trạng thái</TableHead>
                            <TableHead className="text-right w-[140px]">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((po) => (
                            <TableRow key={po.id} className="hover:bg-slate-50">
                                <TableCell>
                                    <div className="font-mono font-bold text-blue-600">{po.code}</div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                        {format(new Date(po.order_date), "dd/MM/yyyy")}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-slate-700">{po.supplier?.name}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-slate-600">
                                        {po.expected_delivery_date ? (
                                            <span>Dự kiến: {format(new Date(po.expected_delivery_date), "dd/MM/yyyy")}</span>
                                        ) : (
                                            <span className="text-slate-400 italic">Chưa có lịch hẹn</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-sm text-slate-600 line-clamp-2 leading-snug">
                                            {po.items.map((i: any) => i.item_name).join(", ")}
                                        </div>
                                        <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                            {po.items.length} mặt hàng
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 font-normal">
                                        Đang giao hàng
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {/* Nút nhập kho nằm trong Dialog này */}
                                    <GoodsReceiptDialog po={po} warehouseId={warehouseId} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}