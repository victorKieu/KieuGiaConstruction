"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSplitPOAction, createPurchaseOrderAction } from "@/lib/action/procurement";

interface Props {
    suppliers: any[];
    projects: any[]; // Danh sách dự án
    initialRequestId?: string;
    initialItems?: any[];
}

export default function PurchaseOrderForm({ suppliers, projects, initialRequestId, initialItems = [] }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State Header
    const [supplierId, setSupplierId] = useState("");
    const [projectId, setProjectId] = useState(""); // Cho chế độ thủ công
    const [deliveryDate, setDeliveryDate] = useState("");
    const [notes, setNotes] = useState("");

    // --- MODE 1: SPLIT PO (Từ Request) ---
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [prices, setPrices] = useState<Record<string, number>>({});

    // --- MODE 2: MANUAL PO (Thủ công) ---
    const [manualItems, setManualItems] = useState<any[]>([
        { id: 1, item_name: "", unit: "Cái", quantity: 1, unit_price: 0 }
    ]);

    // Init data cho Mode 1
    useEffect(() => {
        if (initialItems.length > 0) {
            const qtyMap: any = {};
            const priceMap: any = {};
            const checkMap: any = {};
            initialItems.forEach(item => {
                if (!item.is_fully_ordered) {
                    qtyMap[item.id] = item.remaining_quantity;
                    priceMap[item.id] = 0;
                }
            });
            setQuantities(qtyMap);
            setPrices(priceMap);
            // Nếu có request, ta có thể tự set projectId (nhưng API getRequestItems chưa trả về project_id trực tiếp, 
            // nên ta để createSplitPOAction tự xử lý ở Server)
        }
    }, [initialItems]);

    // Các hàm cho Mode 2 (Manual)
    const addManualRow = () => {
        setManualItems([...manualItems, { id: Date.now(), item_name: "", unit: "Cái", quantity: 1, unit_price: 0 }]);
    };

    const removeManualRow = (id: number) => {
        if (manualItems.length > 1) {
            setManualItems(manualItems.filter(i => i.id !== id));
        }
    };

    const updateManualItem = (id: number, field: string, value: any) => {
        setManualItems(manualItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // --- SUBMIT ---
    const handleSubmit = async () => {
        if (!supplierId) return toast.error("Vui lòng chọn Nhà cung cấp");

        setLoading(true);
        let res;

        if (initialRequestId) {
            // CASE 1: SPLIT PO
            const itemsToOrder = initialItems
                .filter(item => selectedItems[item.id])
                .map(item => ({
                    item_name: item.item_name,
                    unit: item.unit,
                    quantity: quantities[item.id],
                    unit_price: prices[item.id] || 0
                }));

            if (itemsToOrder.length === 0) {
                setLoading(false);
                return toast.error("Chưa chọn vật tư nào!");
            }

            res = await createSplitPOAction(
                "", // Server tự tìm projectId từ requestId
                initialRequestId,
                supplierId,
                deliveryDate,
                notes,
                itemsToOrder
            );

        } else {
            // CASE 2: MANUAL PO
            if (!projectId) {
                setLoading(false);
                return toast.error("Vui lòng chọn Dự án cho đơn hàng này!");
            }

            // Validate items
            const validItems = manualItems.filter(i => i.item_name.trim() !== "");
            if (validItems.length === 0) {
                setLoading(false);
                return toast.error("Vui lòng nhập tên vật tư!");
            }

            res = await createPurchaseOrderAction(
                projectId,
                supplierId,
                deliveryDate,
                notes,
                validItems
            );
        }

        setLoading(false);

        if (res?.success) {
            toast.success(res.message);
            router.push("/procurement/orders");
            router.refresh();
        } else {
            toast.error(res?.error || "Có lỗi xảy ra");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Header */}
            <Card className="p-6 space-y-4 h-fit">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Thông tin Đơn hàng</h3>

                {/* Chỉ hiện chọn dự án nếu là tạo thủ công */}
                {!initialRequestId && (
                    <div>
                        <Label>Dự án <span className="text-red-500">*</span></Label>
                        <Select onValueChange={setProjectId}>
                            <SelectTrigger><SelectValue placeholder="Chọn Dự án" /></SelectTrigger>
                            <SelectContent>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div>
                    <Label>Nhà cung cấp <span className="text-red-500">*</span></Label>
                    <Select onValueChange={setSupplierId}>
                        <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                        <SelectContent>
                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Ngày giao hàng</Label>
                    <Input type="date" onChange={e => setDeliveryDate(e.target.value)} />
                </div>

                <div>
                    <Label>Ghi chú</Label>
                    <Textarea placeholder="Ghi chú đơn hàng..." onChange={e => setNotes(e.target.value)} />
                </div>
            </Card>

            {/* Cột phải: Danh sách Vật tư */}
            <Card className="lg:col-span-2 p-6 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 className="font-semibold text-slate-800">Chi tiết Vật tư</h3>
                    {!initialRequestId && (
                        <Button size="sm" variant="outline" onClick={addManualRow}>
                            <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-auto">
                    {initialRequestId ? (
                        /* GIAO DIỆN TỪ REQUEST (READONLY INFO) */
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[40px]">#</TableHead>
                                    <TableHead>Vật tư</TableHead>
                                    <TableHead className="text-right text-xs">Còn lại / Tổng</TableHead>
                                    <TableHead className="w-[100px] text-right">SL Đặt</TableHead>
                                    <TableHead className="w-[120px] text-right">Đơn giá</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialItems.map(item => (
                                    <TableRow key={item.id} className={item.is_fully_ordered ? "bg-slate-50 opacity-60" : ""}>
                                        <TableCell>
                                            {!item.is_fully_ordered && (
                                                <Checkbox
                                                    checked={!!selectedItems[item.id]}
                                                    onCheckedChange={(c) => setSelectedItems(p => ({ ...p, [item.id]: !!c }))}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{item.item_name}</div>
                                            <div className="text-xs text-slate-500">{item.unit}</div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <span className="text-orange-600 font-bold">{Number(item.remaining_quantity).toLocaleString()}</span>
                                            <span className="text-slate-300 mx-1">/</span>
                                            {Number(item.quantity).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {!item.is_fully_ordered ? (
                                                <Input
                                                    type="number" className="h-8 text-right font-bold"
                                                    value={quantities[item.id]}
                                                    disabled={!selectedItems[item.id]}
                                                    onChange={(e) => setQuantities(p => ({ ...p, [item.id]: Number(e.target.value) }))}
                                                />
                                            ) : <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number" className="h-8 text-right" placeholder="0"
                                                value={prices[item.id]}
                                                disabled={!selectedItems[item.id]}
                                                onChange={(e) => setPrices(p => ({ ...p, [item.id]: Number(e.target.value) }))}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        /* GIAO DIỆN NHẬP TAY (EDITABLE) */
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Tên Vật tư / Hàng hóa</TableHead>
                                    <TableHead className="w-[100px]">ĐVT</TableHead>
                                    <TableHead className="w-[100px] text-right">SL</TableHead>
                                    <TableHead className="w-[150px] text-right">Đơn giá</TableHead>
                                    <TableHead className="w-[150px] text-right">Thành tiền</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {manualItems.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Input
                                                value={item.item_name}
                                                onChange={e => updateManualItem(item.id, 'item_name', e.target.value)}
                                                placeholder="Nhập tên vật tư..."
                                                className="border-none shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={item.unit}
                                                onChange={e => updateManualItem(item.id, 'unit', e.target.value)}
                                                className="border-none shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number" className="text-right border-none shadow-none focus-visible:ring-0 px-0 font-bold"
                                                value={item.quantity}
                                                onChange={e => updateManualItem(item.id, 'quantity', Number(e.target.value))}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number" className="text-right border-none shadow-none focus-visible:ring-0 px-0"
                                                value={item.unit_price}
                                                onChange={e => updateManualItem(item.id, 'unit_price', Number(e.target.value))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-700">
                                            {(item.quantity * item.unit_price).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeManualRow(item.id)} className="text-red-400 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => router.back()}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                        {loading ? "Đang xử lý..." : <><Save className="w-4 h-4 mr-2" /> Lưu Đơn Hàng</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}