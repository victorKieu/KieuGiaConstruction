"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { deletePurchaseOrderAction } from "@/lib/action/procurement";

interface PurchaseOrder {
    id: string;
    code: string;
    order_date: string;
    total_amount: number;
    status: string;
    supplier?: { name: string };
    project?: { name: string; code?: string };
}

export function OrderList({ data }: { data: PurchaseOrder[] }) {
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatMoney = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    const getStatusBadge = (status: string) => {
        switch (status) {
            // 👇 ĐỔI TÊN HIỂN THỊ DRAFT -> CHỜ XỬ LÝ (Màu cam)
            case 'draft': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none">Chờ xử lý</Badge>;

            // 👇 ĐỔI TÊN HIỂN THỊ ORDERED -> ĐÃ ĐẶT HÀNG (Màu xanh)
            case 'ordered': return <Badge className="bg-blue-600 hover:bg-blue-700">Đã đặt hàng</Badge>;

            case 'received': return <Badge className="bg-green-600 hover:bg-green-700">Đã nhận hàng</Badge>;
            case 'completed': return <Badge className="bg-gray-600">Hoàn thành</Badge>;
            case 'cancelled': return <Badge variant="destructive">Đã hủy</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);

        const res = await deletePurchaseOrderAction(deleteId);

        setIsDeleting(false);
        setDeleteId(null);

        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error(res.error);
        }
    };

    return (
        <>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã đơn</TableHead>
                                <TableHead>Ngày đặt</TableHead>
                                <TableHead>Nhà cung cấp</TableHead>
                                <TableHead>Dự án</TableHead>
                                <TableHead className="text-right">Tổng tiền (Có VAT)</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                                <TableHead className="w-[120px] text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Chưa có đơn hàng nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((po) => (
                                    <TableRow key={po.id}>
                                        <TableCell className="font-bold">{po.code}</TableCell>
                                        <TableCell>
                                            {format(new Date(po.order_date), "dd/MM/yyyy", { locale: vi })}
                                        </TableCell>
                                        <TableCell className="font-medium">{po.supplier?.name || "---"}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={po.project?.name}>
                                            {po.project?.code && <span className="text-blue-600 mr-1">[{po.project.code}]</span>}
                                            {po.project?.name || "---"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-700">
                                            {formatMoney(po.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(po.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                {/* Nút Xem */}
                                                <Button variant="ghost" size="icon" asChild title="Xem chi tiết">
                                                    <Link href={`/procurement/orders/${po.id}`}>
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    </Link>
                                                </Button>

                                                {/* Nút Sửa & Xóa (Chỉ hiện khi chưa Nhập kho) */}
                                                {/* Draft (Chờ xử lý) và Ordered (Đã đặt hàng) đều sửa được */}
                                                {(po.status === 'draft' || po.status === 'ordered') && (
                                                    <>
                                                        <Button variant="ghost" size="icon" asChild title="Chỉnh sửa">
                                                            <Link href={`/procurement/orders/${po.id}/edit`}>
                                                                <Pencil className="h-4 w-4 text-blue-600" />
                                                            </Link>
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Xóa đơn hàng"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setDeleteId(po.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* DIALOG XÁC NHẬN XÓA */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Đơn hàng và toàn bộ chi tiết vật tư sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isDeleting ? "Đang xóa..." : "Xóa đơn hàng"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}