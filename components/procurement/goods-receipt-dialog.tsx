"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { PackageCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createGoodsReceipt } from "@/lib/action/warehouse";

interface Props {
    po: any;
    warehouseId: string; // ID kho lấy từ dữ liệu Project của PO
}

export default function GoodsReceiptDialog({ po, warehouseId }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deliveryNote, setDeliveryNote] = useState("");

    // State lưu số lượng thực nhập (Mặc định = số lượng đặt)
    const [items, setItems] = useState(po.items.map((i: any) => ({
        po_item_id: i.id,
        item_name: i.item_name,
        unit: i.unit,
        quantity_ordered: i.quantity,
        quantity_received: i.quantity, // Mặc định nhập đủ
        note: ""
    })));

    const handleQuantityChange = (index: number, val: string) => {
        const newItems = [...items];
        newItems[index].quantity_received = Number(val);
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!deliveryNote) return toast.error("Vui lòng nhập số phiếu giao hàng (Delivery Note) của NCC");

        setLoading(true);
        const res = await createGoodsReceipt(po.id, warehouseId, deliveryNote, items, "");
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    // Chỉ hiện nút Nhập kho khi đơn hàng là 'ordered'
    if (po.status !== 'ordered') return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                    <PackageCheck className="w-4 h-4 mr-2" /> Nhập Kho
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Phiếu Nhập Kho (Goods Receipt)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Đơn hàng:</Label>
                            <div className="font-bold">{po.code}</div>
                        </div>
                        <div>
                            <Label>Số phiếu giao hàng (NCC) <span className="text-red-500">*</span>:</Label>
                            <Input
                                placeholder="VD: DN-123456"
                                value={deliveryNote}
                                onChange={(e) => setDeliveryNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Vật tư</TableHead>
                                    <TableHead className="w-[100px]">ĐVT</TableHead>
                                    <TableHead className="w-[120px] text-right">SL Đặt</TableHead>
                                    <TableHead className="w-[120px] text-right">Thực nhập</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: any, idx: number) => (
                                    <TableRow key={item.po_item_id}>
                                        <TableCell className="font-medium">{item.item_name}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right text-slate-500">{item.quantity_ordered}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="text-right font-bold h-8"
                                                value={item.quantity_received}
                                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Xác nhận Nhập kho
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}