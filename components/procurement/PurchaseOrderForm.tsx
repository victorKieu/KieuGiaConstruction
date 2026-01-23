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
import { CheckCircle2, Save, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    createSplitPOAction,
    createPurchaseOrderAction,
    updatePurchaseOrderAction
} from "@/lib/action/procurement";

interface Props {
    suppliers: any[];
    projects: any[];
    // Cho Create Mode (Split PO)
    initialRequestId?: string;
    initialItems?: any[];
    // Cho Edit Mode
    initialPoData?: any;
}

export default function PurchaseOrderForm({
    suppliers,
    projects,
    initialRequestId,
    initialItems = [],
    initialPoData
}: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const isEditMode = !!initialPoData;

    // --- FORM STATE ---
    const [code, setCode] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState("draft");

    // --- MODE 1: SPLIT PO (Tạo từ Request) ---
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [prices, setPrices] = useState<Record<string, number>>({});

    // --- MODE 2: MANUAL / EDIT PO ---
    const [manualItems, setManualItems] = useState<any[]>([
        { id: Date.now(), item_name: "", unit: "Cái", quantity: 1, unit_price: 0, vat_rate: 0 }
    ]);

    // ============================================================
    // 1. INIT DATA
    // ============================================================
    useEffect(() => {
        if (isEditMode && initialPoData) {
            // --- LOAD DATA ĐỂ SỬA ---
            setCode(initialPoData.code || "");
            setProjectId(initialPoData.project_id || "");
            setSupplierId(initialPoData.supplier_id || "");
            setDeliveryDate(initialPoData.expected_delivery_date ? initialPoData.expected_delivery_date.split('T')[0] : "");
            setNotes(initialPoData.notes || "");
            setStatus(initialPoData.status || "draft");

            // Map items cũ vào manualItems để sửa
            if (initialPoData.items && initialPoData.items.length > 0) {
                const mappedItems = initialPoData.items.map((item: any, index: number) => ({
                    id: item.id || Date.now() + index,
                    // ✅ FIX LỖI: Luôn fallback về chuỗi rỗng hoặc 0 để tránh undefined
                    item_name: item.item_name || "",
                    unit: item.unit || "",
                    quantity: Number(item.quantity) || 0,
                    unit_price: Number(item.unit_price) || 0,
                    vat_rate: Number(item.vat_rate || 0)
                }));
                setManualItems(mappedItems);
            }
        }
        else if (initialRequestId && initialItems.length > 0) {
            // --- LOAD DATA ĐỂ TẠO TỪ REQUEST (SPLIT) ---
            const qtyMap: any = {};
            const priceMap: any = {};
            const selectMap: any = {};

            initialItems.forEach(item => {
                if (!item.is_fully_ordered) {
                    qtyMap[item.id] = item.remaining_quantity || 0;
                    priceMap[item.id] = 0;
                    selectMap[item.id] = false;
                }
            });
            setQuantities(qtyMap);
            setPrices(priceMap);
            setSelectedItems(selectMap);
        }
    }, [initialPoData, initialRequestId, initialItems, isEditMode]);

    // ============================================================
    // 2. HELPER FUNCTIONS
    // ============================================================
    const addManualRow = () => {
        setManualItems([...manualItems, { id: Date.now(), item_name: "", unit: "Cái", quantity: 1, unit_price: 0, vat_rate: 0 }]);
    };

    const removeManualRow = (id: number) => {
        if (manualItems.length > 1) {
            setManualItems(manualItems.filter(i => i.id !== id));
        } else {
            toast.error("Phải có ít nhất 1 dòng");
        }
    };

    const updateManualItem = (id: number, field: string, value: any) => {
        setManualItems(manualItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const calculateTotal = () => {
        if (isEditMode || !initialRequestId) {
            return manualItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
        }
        return 0;
    };

    // ============================================================
    // 3. SUBMIT HANDLER
    // ============================================================
    const handleSubmit = async () => {
        if (!supplierId) return toast.error("Vui lòng chọn Nhà cung cấp");
        setLoading(true);
        let res;

        try {
            // --- CASE A: CHỈNH SỬA (EDIT) ---
            if (isEditMode) {
                const validItems = manualItems.filter(i => i.item_name && i.item_name.trim() !== "");
                if (validItems.length === 0) throw new Error("Vui lòng nhập tên vật tư!");

                const payload = {
                    code,
                    project_id: projectId,
                    supplier_id: supplierId,
                    order_date: initialPoData.order_date ? new Date(initialPoData.order_date) : new Date(),
                    expected_delivery_date: deliveryDate ? new Date(deliveryDate) : undefined,
                    notes,
                    items: validItems,
                    status: status
                };

                res = await updatePurchaseOrderAction(initialPoData.id, payload);
            }
            // --- CASE B: TẠO TỪ REQUEST (SPLIT) ---
            else if (initialRequestId) {
                const itemsToOrder = initialItems
                    .filter(item => selectedItems[item.id])
                    .map(item => ({
                        item_name: item.item_name,
                        unit: item.unit,
                        quantity: quantities[item.id] || 0,
                        unit_price: prices[item.id] || 0
                    }));

                if (itemsToOrder.length === 0) throw new Error("Chưa chọn vật tư nào!");

                res = await createSplitPOAction(
                    "",
                    initialRequestId,
                    supplierId,
                    "",
                    deliveryDate,
                    itemsToOrder
                );
            }
            // --- CASE C: TẠO THỦ CÔNG (MANUAL NEW) ---
            else {
                if (!projectId) throw new Error("Vui lòng chọn Dự án!");
                const validItems = manualItems.filter(i => i.item_name && i.item_name.trim() !== "");
                if (validItems.length === 0) throw new Error("Vui lòng nhập tên vật tư!");

                res = await createPurchaseOrderAction({
                    code: code || `PO-${Date.now()}`,
                    project_id: projectId,
                    supplier_id: supplierId,
                    order_date: new Date(),
                    expected_delivery_date: deliveryDate ? new Date(deliveryDate) : undefined,
                    notes,
                    items: validItems
                });
            }

            if (res?.success) {
                toast.success(res.message);
                router.push("/procurement/orders");
                router.refresh();
            } else {
                toast.error(res?.error || "Có lỗi xảy ra");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header Form */}
            <Card className="p-6 space-y-5 h-fit shadow-sm border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-bold text-lg text-slate-800">
                        {isEditMode ? "Cập nhật Đơn hàng" : "Tạo Đơn hàng mới"}
                    </h3>
                </div>

                <div className="space-y-4">
                    {/* Project Selection */}
                    {(!initialRequestId && !isEditMode) && (
                        <div>
                            <Label>Dự án <span className="text-red-500">*</span></Label>
                            <Select onValueChange={setProjectId} value={projectId}>
                                <SelectTrigger><SelectValue placeholder="Chọn Dự án" /></SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {isEditMode && (
                        <div className="p-3 bg-slate-50 rounded border text-sm">
                            <span className="text-slate-500 block text-xs uppercase font-bold">Dự án</span>
                            <span className="font-medium text-slate-800">
                                {projects.find(p => p.id === projectId)?.name || "---"}
                            </span>
                        </div>
                    )}

                    <div>
                        <Label>Nhà cung cấp <span className="text-red-500">*</span></Label>
                        <Select onValueChange={setSupplierId} value={supplierId}>
                            <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Ngày giao hàng dự kiến</Label>
                        <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                    </div>

                    <div>
                        <Label>Ghi chú</Label>
                        <Textarea
                            placeholder="Ghi chú đơn hàng..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    {isEditMode && (
                        <div>
                            <Label>Trạng thái</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Chờ xử lý (Draft)</SelectItem>
                                    <SelectItem value="ordered">Đã đặt hàng (Ordered)</SelectItem>
                                    <SelectItem value="cancelled">Hủy bỏ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t mt-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Tổng tiền (tạm tính):</span>
                        <span className="font-bold text-lg text-blue-600">
                            {calculateTotal().toLocaleString()} ₫
                        </span>
                    </div>
                </div>
            </Card>

            {/* Detail Items */}
            <Card className="lg:col-span-2 p-6 flex flex-col min-h-[600px] shadow-sm border-slate-200">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Chi tiết Vật tư
                    </h3>

                    {!initialRequestId && (
                        <Button size="sm" variant="outline" onClick={addManualRow} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-auto -mx-2 px-2">
                    {initialRequestId ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="w-[40px]">#</TableHead>
                                    <TableHead>Vật tư</TableHead>
                                    <TableHead className="text-right text-xs">Còn lại / Tổng</TableHead>
                                    <TableHead className="w-[100px] text-right">SL Đặt</TableHead>
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
                                            <div className="font-medium text-sm text-slate-900">{item.item_name}</div>
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
                                                    type="number" className="h-8 text-right font-bold border-blue-200 focus:border-blue-500"
                                                    value={quantities[item.id] || 0} // ✅ FIX LỖI undefined
                                                    disabled={!selectedItems[item.id]}
                                                    onChange={(e) => setQuantities(p => ({ ...p, [item.id]: Number(e.target.value) }))}
                                                />
                                            ) : <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="min-w-[200px]">Tên Vật tư / Hàng hóa</TableHead>
                                    <TableHead className="w-[80px]">ĐVT</TableHead>
                                    <TableHead className="w-[100px] text-right">SL</TableHead>
                                    <TableHead className="w-[140px] text-right">Đơn giá</TableHead>
                                    <TableHead className="w-[140px] text-right">Thành tiền</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {manualItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="p-2">
                                            <Input
                                                // ✅ FIX LỖI: Luôn có giá trị fallback ""
                                                value={item.item_name || ""}
                                                onChange={e => updateManualItem(item.id, 'item_name', e.target.value)}
                                                placeholder="Nhập tên vật tư..."
                                                className="border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-blue-500 transition-all"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                // ✅ FIX LỖI: Luôn có giá trị fallback ""
                                                value={item.unit || ""}
                                                onChange={e => updateManualItem(item.id, 'unit', e.target.value)}
                                                className="border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-blue-500 transition-all text-center"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                type="number"
                                                className="text-right border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800"
                                                // ✅ FIX LỖI: Luôn có giá trị fallback 0
                                                value={item.quantity || 0}
                                                onChange={e => updateManualItem(item.id, 'quantity', Number(e.target.value))}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                type="number"
                                                className="text-right border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-blue-500 transition-all"
                                                // ✅ FIX LỖI: Luôn có giá trị fallback 0
                                                value={item.unit_price || 0}
                                                onChange={e => updateManualItem(item.id, 'unit_price', Number(e.target.value))}
                                                placeholder="0"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-700 p-2 align-middle">
                                            {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="p-2 text-center align-middle">
                                            <Button variant="ghost" size="icon" onClick={() => removeManualRow(item.id)} className="h-8 w-8 text-red-300 hover:text-red-600 hover:bg-red-50">
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
                    <Button variant="outline" onClick={() => router.back()} disabled={loading}>Hủy bỏ</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[150px] shadow-md">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : <><Save className="w-4 h-4 mr-2" /> Lưu Đơn Hàng</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}