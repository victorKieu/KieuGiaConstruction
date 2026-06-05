"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Eye, Pencil, Trash2, Loader2, Building2 } from "lucide-react";
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
            case 'draft': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none">Chờ xử lý</Badge>;
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
                                <TableHead className="w-[100px]">Mã đơn</TableHead>
                                <TableHead className="w-[100px]">Ngày đặt</TableHead>
                                <TableHead className="min-w-[180px]">Nhà cung cấp</TableHead>
                                <TableHead className="min-w-[250px]">Dự án</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Tổng tiền</TableHead>
                                <TableHead className="text-center w-[120px]">Trạng thái</TableHead>
                                <TableHead className="w-[100px] text-right">Thao tác</TableHead>
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
                                        <TableCell className="font-bold align-top py-4">
                                            {po.code}
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            {format(new Date(po.order_date), "dd/MM/yyyy", { locale: vi })}
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            <div className="font-medium whitespace-normal leading-snug">
                                                {po.supplier?.name || "---"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold text-slate-800 whitespace-normal leading-snug">
                                                    {po.project?.name || "---"}
                                                </span>
                                                {po.project?.code && (
                                                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                                        <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                                        <span className="font-mono">{po.project.code}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-700 align-top py-4 whitespace-nowrap">
                                            {formatMoney(po.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center align-top py-4">
                                            {getStatusBadge(po.status)}
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" asChild title="Xem chi tiết">
                                                    <Link href={`/procurement/orders/${po.id}`}>
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    </Link>
                                                </Button>

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

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">Bạn có chắc muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Đơn hàng này và <strong className="text-slate-800">Phiếu yêu cầu vật tư gốc (nếu có)</strong> sẽ bị xóa vĩnh viễn khỏi hệ thống.
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
                            {isDeleting ? "Đang xóa..." : "Xóa toàn bộ"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}