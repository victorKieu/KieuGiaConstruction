"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Clock, CheckCircle, XCircle, Pencil, Trash2, Printer, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import { updateRequestStatusAction, deleteMaterialRequestAction } from "@/lib/action/request";

export default function RequestDetailClient({ req, projectId }: { req: any; projectId: string }) {
    const router = useRouter();
    const [processing, setProcessing] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
            case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
            case 'ordered': return <Badge className="bg-blue-600">Đã mua hàng</Badge>;
            case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Từ chối</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    async function handleStatus(status: 'approved' | 'rejected') {
        setProcessing(true);
        const res = await updateRequestStatusAction(req.id, status, projectId);
        setProcessing(false);
        if (res.success) toast.success(res.message);
        else toast.error(res.error);
    }

    async function handleDelete() {
        setProcessing(true);
        const res = await deleteMaterialRequestAction(req.id, projectId);
        setProcessing(false);
        setDeleteOpen(false);

        if (res.success) {
            toast.success(res.message);
            router.push(`/projects/${projectId}`);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
            {/* HEADER & ACTIONS */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {req.code} {getStatusBadge(req.status)}
                        </h2>
                        <div className="text-sm text-muted-foreground mt-1">
                            Ngày cần hàng: <span className="font-medium text-black">{format(new Date(req.deadline_date), "dd/MM/yyyy")}</span>
                            {req.priority === 'urgent' && <span className="ml-2 text-red-600 font-bold uppercase text-xs border border-red-200 bg-red-50 px-2 py-0.5 rounded">Gấp</span>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> In phiếu</Button>

                    {req.status === 'pending' && (
                        <>
                            <Button variant="outline" asChild>
                                <Link href={`/projects/${projectId}/requests/${req.id}/edit`}>
                                    <Pencil className="mr-2 h-4 w-4" /> Sửa
                                </Link>
                            </Button>
                            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                            </Button>

                            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleStatus('rejected')} disabled={processing}>
                                <X className="mr-2 h-4 w-4" /> Từ chối
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleStatus('approved')} disabled={processing}>
                                {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Duyệt
                            </Button>
                        </>
                    )}

                    {req.status === 'approved' && (
                        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                            <Link href={`/procurement/orders/new?requestId=${req.id}`}>
                                Tạo Đơn Mua Hàng
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* NỘI DUNG CHÍNH */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Danh sách vật tư đề xuất</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>STT</TableHead>
                                        <TableHead>Tên vật tư / Quy cách</TableHead>
                                        <TableHead className="text-center">ĐVT</TableHead>
                                        <TableHead className="text-center">Số lượng</TableHead>
                                        <TableHead>Ghi chú</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {req.items.map((item: any, index: number) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-center text-muted-foreground w-[50px]">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            <TableCell className="text-center">{item.unit}</TableCell>
                                            <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{item.notes}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {req.notes && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Ghi chú chung</CardTitle></CardHeader>
                            <CardContent><p className="text-sm text-muted-foreground">{req.notes}</p></CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Thông tin phiếu</CardTitle></CardHeader>
                        <CardContent className="grid gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground mb-1">Dự án</div>
                                <div className="font-medium text-blue-700">[{req.project?.code}] {req.project?.name}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-1">Người yêu cầu</div>
                                <div className="font-medium">{req.requester?.name || "Chưa cập nhật"}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-1">Ngày lập phiếu</div>
                                <div>{format(new Date(req.created_at), "dd/MM/yyyy HH:mm")}</div>
                            </div>
                            {req.destination_warehouse_id && (
                                <div>
                                    <div className="text-muted-foreground mb-1">Kho nhập hàng</div>
                                    {/* Tạm thời hiển thị ID hoặc xử lý join tên kho trong query sau */}
                                    <div className="font-medium">Kho công trường</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa phiếu yêu cầu?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Phiếu <b>{req.code}</b> sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing}>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600 hover:bg-red-700" disabled={processing}>
                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Xóa phiếu"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}