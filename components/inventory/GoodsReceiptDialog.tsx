"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PackageCheck, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

// Import Action từ inventory.ts
import { createGoodsReceiptAction } from "@/lib/action/inventory";

interface Props {
    po: any;
    warehouseId: string;
}

export default function GoodsReceiptDialog({ po, warehouseId }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [deliveryNote, setDeliveryNote] = useState("");
    const [notes, setNotes] = useState("");

    // State quản lý danh sách item cần nhập (Mặc định số lượng nhập = số lượng đặt)
    const [items, setItems] = useState(po.items.map((i: any) => ({
        po_item_id: i.id,
        item_name: i.item_name,
        unit: i.unit,
        quantity_ordered: Number(i.quantity),
        quantity_received: Number(i.quantity), // Default fill full
        note: ""
    })));

    // Xử lý thay đổi số lượng thực nhập
    const handleQuantityChange = (index: number, val: string) => {
        const newItems = [...items];
        // Cho phép nhập số thập phân, không cho âm
        const num = parseFloat(val);
        newItems[index].quantity_received = isNaN(num) ? 0 : Math.max(0, num);
        setItems(newItems);
    };

    // Xử lý ghi chú từng dòng (VD: Hàng vỡ, Hàng lỗi)
    const handleNoteChange = (index: number, val: string) => {
        const newItems = [...items];
        newItems[index].note = val;
        setItems(newItems);
    };

    // Submit Form
    const handleSubmit = async () => {
        if (!deliveryNote.trim()) {
            return toast.error("Vui lòng nhập Số phiếu giao hàng (Delivery Note) của NCC để đối chiếu.");
        }

        // Validate: Phải nhập ít nhất 1 món > 0
        const hasItem = items.some((i: any) => i.quantity_received > 0);
        if (!hasItem) {
            return toast.error("Vui lòng nhập số lượng thực nhận ít nhất cho 1 mặt hàng.");
        }

        setLoading(true);

        const payload = {
            po_id: po.id,
            warehouse_id: warehouseId,
            delivery_note: deliveryNote,
            notes: notes,
            items: items
        };

        const res = await createGoodsReceiptAction(payload);

        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            router.refresh(); // Refresh lại danh sách bên ngoài
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 shadow-sm transition-all">
                    <PackageCheck className="w-4 h-4 mr-2" /> Nhập Kho
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b bg-slate-50/50">
                    <DialogTitle className="text-xl text-slate-800 flex items-center gap-2">
                        <PackageCheck className="w-6 h-6 text-green-600" />
                        Phiếu Nhập Kho (Goods Receipt)
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Nhập hàng cho đơn: <span className="font-mono font-bold text-slate-700">{po.code}</span>
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Thông tin chung */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Số phiếu giao hàng (NCC) <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="VD: PX-NCC-001..."
                                value={deliveryNote}
                                onChange={(e) => setDeliveryNote(e.target.value)}
                                autoFocus
                                className="font-medium"
                            />
                            <p className="text-[11px] text-slate-400">Nhập số phiếu in trên giấy giao hàng của NCC.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Ghi chú chung</Label>
                            <Input
                                placeholder="VD: Hàng về đủ, bao bì nguyên vẹn..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Bảng chi tiết */}
                    <div className="border rounded-lg overflow-hidden bg-white">
                        <div className="bg-blue-50/50 px-4 py-2 border-b flex items-center gap-2 text-blue-700 text-sm">
                            <Info className="w-4 h-4" />
                            <span>Vui lòng kiểm đếm kỹ số lượng thực tế trước khi nhập.</span>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="w-[40%]">Tên Vật tư / Thiết bị</TableHead>
                                    <TableHead className="w-[10%] text-center">ĐVT</TableHead>
                                    <TableHead className="w-[15%] text-right text-slate-500">SL Đặt</TableHead>
                                    <TableHead className="w-[15%] text-right bg-green-50/50 font-bold text-green-700">Thực Nhập</TableHead>
                                    <TableHead className="w-[20%]">Ghi chú dòng</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: any, idx: number) => (
                                    <TableRow key={item.po_item_id} className={item.quantity_received !== item.quantity_ordered ? "bg-yellow-50/30" : ""}>
                                        <TableCell className="font-medium text-slate-700">
                                            {item.item_name}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-500">{item.unit}</TableCell>
                                        <TableCell className="text-right text-slate-500">
                                            {item.quantity_ordered.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right p-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="any"
                                                className={`text-right font-bold h-9 ${item.quantity_received > item.quantity_ordered ? "text-red-600 border-red-200 bg-red-50" :
                                                        item.quantity_received < item.quantity_ordered ? "text-orange-600 border-orange-200" : "text-green-700 border-green-200"
                                                    }`}
                                                value={item.quantity_received}
                                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                placeholder="..."
                                                className="h-9 text-xs"
                                                value={item.note}
                                                onChange={(e) => handleNoteChange(idx, e.target.value)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50 flex justify-between items-center">
                    <div className="text-xs text-slate-500 italic mr-auto">
                        * Sau khi nhập, tồn kho sẽ tăng tự động.
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 min-w-[150px]">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
                            Xác nhận Nhập
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}