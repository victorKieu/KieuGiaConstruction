"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, FileInput, CheckCircle2, ShoppingCart, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getRequestItemsWithStatus, createSplitPOAction } from "@/lib/action/procurement";

interface Props {
    projectId: string;
    requests: any[];      // Danh sách Request (Approved/Processing)
    purchaseOrders: any[];// Danh sách PO đã tạo
    suppliers: any[];     // Danh sách NCC
}

export default function ProjectProcurement({ projectId, requests, purchaseOrders, suppliers }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Dialog State
    const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
    const [selectedReq, setSelectedReq] = useState<any>(null); // Lưu cả object request để hiển thị mã
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");
    const [deliveryDate, setDeliveryDate] = useState<string>("");

    // Split PO Logic State
    const [requestDetails, setRequestDetails] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

    // 1. Mở Dialog & Load chi tiết Request
    const handleOpenCreatePO = async (req: any) => {
        setSelectedReq(req);
        setLoading(true);

        // Gọi Server Action lấy chi tiết & trạng thái remaining
        const items = await getRequestItemsWithStatus(req.id);
        setRequestDetails(items);

        // Reset Form
        setSelectedSupplier("");
        setDeliveryDate("");
        setSelectedItems({});

        // Auto-fill số lượng còn lại
        const initQty: any = {};
        items.forEach((i: any) => {
            if (!i.is_fully_ordered) {
                initQty[i.id] = i.remaining_quantity;
            }
        });
        setOrderQuantities(initQty);

        setLoading(false);
        setIsPoDialogOpen(true);
    };

    // 2. Submit Tạo PO
    const handleSubmitPO = async () => {
        if (!selectedSupplier) return toast.error("Chưa chọn Nhà cung cấp");

        const itemsToOrder = requestDetails
            .filter(item => selectedItems[item.id])
            .map(item => ({
                item_name: item.item_name,
                unit: item.unit,
                quantity: orderQuantities[item.id],
                unit_price: 0
            }));

        if (itemsToOrder.length === 0) return toast.error("Chưa chọn vật tư nào!");

        setLoading(true);
        const res = await createSplitPOAction(projectId, selectedReq.id, selectedSupplier, deliveryDate, itemsToOrder);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setIsPoDialogOpen(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* --- PHẦN 1: YÊU CẦU CẦN XỬ LÝ (REQUESTS) --- */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileInput className="w-5 h-5 text-orange-600" />
                    1. Yêu cầu chờ Đặt hàng (Từ Công trường)
                </h3>
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Mã YC</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead>Người yêu cầu</TableHead>
                                <TableHead>Tiến độ</TableHead>
                                <TableHead className="text-right">Tác vụ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Hết yêu cầu cần xử lý.</TableCell></TableRow>
                            ) : requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium text-blue-700">{req.code}</TableCell>
                                    <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{req.requester?.name || '---'}</TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'processing' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                                            {req.status === 'processing' ? 'Đang đặt hàng' : 'Đã duyệt'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleOpenCreatePO(req)}>
                                            <ShoppingCart className="w-3 h-3 mr-2" /> Tạo Đơn Hàng
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* --- PHẦN 2: ĐƠN ĐẶT HÀNG (PO) --- */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    2. Đơn hàng đã tạo (Purchase Orders)
                </h3>
                <Card className="border-none shadow-sm bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Số PO</TableHead>
                                <TableHead>Nhà cung cấp</TableHead>
                                <TableHead>Ngày đặt</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Tổng tiền</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">Chưa có PO nào.</TableCell></TableRow>
                            ) : purchaseOrders.map((po) => (
                                <TableRow key={po.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/procurement/orders/${po.id}`)}>
                                    <TableCell className="font-mono font-bold text-blue-700">{po.code}</TableCell>
                                    <TableCell className="font-semibold text-slate-700">{po.supplier?.name || '---'}</TableCell>
                                    <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px]">
                                            {po.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-800">
                                        {Number(po.total_amount || 0).toLocaleString()} ₫
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* --- DIALOG TẠO PO (SPLIT) --- */}
            <Dialog open={isPoDialogOpen} onOpenChange={setIsPoDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Tạo Đơn Hàng (PO) - Từ phiếu {selectedReq?.code}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <Label>Nhà cung cấp</Label>
                                <Select onValueChange={setSelectedSupplier}>
                                    <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Ngày giao dự kiến</Label>
                                <Input type="date" onChange={e => setDeliveryDate(e.target.value)} />
                            </div>
                            <div className="p-3 bg-yellow-50 text-xs text-yellow-800 rounded border border-yellow-100">
                                Chọn các vật tư cần mua đợt này. Số lượng còn lại sẽ được lưu để mua ở đợt sau (hoặc NCC khác).
                            </div>
                        </div>

                        <div className="md:col-span-2 border rounded-md overflow-hidden bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100">
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead>Vật tư</TableHead>
                                        <TableHead className="text-right text-xs">Tiến độ (Đã/Tổng)</TableHead>
                                        <TableHead className="w-[100px] text-right">SL Mua</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8"><span className="animate-pulse">Đang tải dữ liệu...</span></TableCell></TableRow>
                                    ) : requestDetails.map(item => (
                                        <TableRow key={item.id} className={item.is_fully_ordered ? "bg-gray-50 opacity-50" : ""}>
                                            <TableCell>
                                                {!item.is_fully_ordered && (
                                                    <Checkbox
                                                        checked={!!selectedItems[item.id]}
                                                        onCheckedChange={(checked) => setSelectedItems(prev => ({ ...prev, [item.id]: !!checked }))}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.item_name}</div>
                                                <div className="text-xs text-slate-500">{item.unit}</div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                <span className="text-blue-600 font-bold">{Number(item.ordered_quantity).toLocaleString()}</span>
                                                <span className="text-slate-400 mx-1">/</span>
                                                {Number(item.quantity).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {!item.is_fully_ordered ? (
                                                    <Input
                                                        type="number" className="h-8 text-right font-bold"
                                                        value={orderQuantities[item.id]}
                                                        onChange={(e) => setOrderQuantities(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                                    />
                                                ) : <div className="flex justify-end text-green-600 text-xs font-bold"><CheckCircle2 className="w-4 h-4 mr-1" /> Xong</div>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsPoDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSubmitPO} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            Xác nhận Tạo PO
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}