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

    const inputClass = "dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 transition-colors duration-500">
            {/* Header Form */}
            <Card className="p-6 space-y-5 h-fit shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 transition-colors">
                        {isEditMode ? "Cập nhật Đơn hàng" : "Tạo Đơn hàng mới"}
                    </h3>
                </div>

                <div className="space-y-4">
                    {/* Project Selection */}
                    {(!initialRequestId && !isEditMode) && (
                        <div>
                            <Label className="dark:text-slate-300">Dự án <span className="text-red-500">*</span></Label>
                            <Select onValueChange={setProjectId} value={projectId}>
                                <SelectTrigger className={inputClass}><SelectValue placeholder="Chọn Dự án" /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                    {projects.map(p => <SelectItem key={p.id} value={p.id} className="dark:text-slate-200">{p.code} - {p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {isEditMode && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-sm transition-colors">
                            <span className="text-slate-500 dark:text-slate-400 block text-xs uppercase font-bold tracking-wider mb-1">Dự án</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                {projects.find(p => p.id === projectId)?.name || "---"}
                            </span>
                        </div>
                    )}

                    <div>
                        <Label className="dark:text-slate-300">Nhà cung cấp <span className="text-red-500">*</span></Label>
                        <Select onValueChange={setSupplierId} value={supplierId}>
                            <SelectTrigger className={inputClass}><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="dark:text-slate-200">{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="dark:text-slate-300">Ngày giao hàng dự kiến</Label>
                        <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
                    </div>

                    <div>
                        <Label className="dark:text-slate-300">Ghi chú</Label>
                        <Textarea
                            placeholder="Ghi chú đơn hàng..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className={`min-h-[100px] ${inputClass}`}
                        />
                    </div>

                    {isEditMode && (
                        <div>
                            <Label className="dark:text-slate-300">Trạng thái</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                    <SelectItem value="draft" className="dark:text-slate-200">Chờ xử lý (Draft)</SelectItem>
                                    <SelectItem value="ordered" className="dark:text-slate-200">Đã đặt hàng (Ordered)</SelectItem>
                                    <SelectItem value="cancelled" className="dark:text-slate-200">Hủy bỏ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 transition-colors">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">Tổng tiền (tạm tính)</span>
                        <span className="font-black text-xl text-blue-600 dark:text-blue-400 transition-colors">
                            {calculateTotal().toLocaleString()} ₫
                        </span>
                    </div>
                </div>
            </Card>

            {/* Detail Items */}
            <Card className="lg:col-span-2 p-4 md:p-6 flex flex-col min-h-[600px] shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                        Chi tiết Vật tư
                    </h3>

                    {!initialRequestId && (
                        <Button size="sm" variant="outline" onClick={addManualRow} className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:bg-transparent transition-colors">
                            <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-auto -mx-2 px-2">
                    {initialRequestId ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <TableHead className="w-[40px] dark:text-slate-300">#</TableHead>
                                    <TableHead className="dark:text-slate-300">Vật tư</TableHead>
                                    <TableHead className="text-right text-xs dark:text-slate-300">Còn lại / Tổng</TableHead>
                                    <TableHead className="w-[100px] text-right dark:text-slate-300">SL Đặt</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                {initialItems.map(item => (
                                    <TableRow key={item.id} className={`${item.is_fully_ordered ? "bg-slate-50/50 dark:bg-slate-950/50 opacity-50" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"} border-none transition-colors`}>
                                        <TableCell>
                                            {!item.is_fully_ordered && (
                                                <Checkbox
                                                    checked={!!selectedItems[item.id]}
                                                    onCheckedChange={(c) => setSelectedItems(p => ({ ...p, [item.id]: !!c }))}
                                                    className="dark:border-slate-600 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-200 transition-colors">{item.item_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 transition-colors">{item.unit}</div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <span className="text-orange-600 dark:text-orange-400 font-bold transition-colors">{Number(item.remaining_quantity).toLocaleString()}</span>
                                            <span className="text-slate-300 dark:text-slate-600 mx-1.5">/</span>
                                            <span className="font-medium text-slate-600 dark:text-slate-400 transition-colors">{Number(item.quantity).toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            {!item.is_fully_ordered ? (
                                                <Input
                                                    type="number"
                                                    className="h-9 text-right font-bold border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-950 dark:text-slate-100 focus-visible:ring-blue-500 transition-colors disabled:opacity-50"
                                                    value={quantities[item.id] || 0}
                                                    disabled={!selectedItems[item.id]}
                                                    onChange={(e) => setQuantities(p => ({ ...p, [item.id]: Number(e.target.value) }))}
                                                />
                                            ) : <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 ml-auto" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <TableHead className="min-w-[200px] dark:text-slate-300 font-bold">Tên Vật tư / Hàng hóa</TableHead>
                                    <TableHead className="w-[80px] dark:text-slate-300 font-bold">ĐVT</TableHead>
                                    <TableHead className="w-[100px] text-right dark:text-slate-300 font-bold">SL</TableHead>
                                    <TableHead className="w-[140px] text-right dark:text-slate-300 font-bold">Đơn giá</TableHead>
                                    <TableHead className="w-[140px] text-right dark:text-slate-300 font-bold">Thành tiền</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                {manualItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-none transition-colors group">
                                        <TableCell className="p-1.5 align-top">
                                            <Input
                                                value={item.item_name || ""}
                                                onChange={e => updateManualItem(item.id, 'item_name', e.target.value)}
                                                placeholder="Nhập tên vật tư..."
                                                className="border-transparent bg-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 dark:focus:border-blue-500 dark:text-slate-200 transition-all h-9 font-medium"
                                            />
                                        </TableCell>
                                        <TableCell className="p-1.5 align-top">
                                            <Input
                                                value={item.unit || ""}
                                                onChange={e => updateManualItem(item.id, 'unit', e.target.value)}
                                                className="border-transparent bg-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 dark:focus:border-blue-500 dark:text-slate-300 transition-all text-center h-9"
                                            />
                                        </TableCell>
                                        <TableCell className="p-1.5 align-top">
                                            <Input
                                                type="number"
                                                className="text-right border-transparent bg-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 dark:focus:border-blue-500 transition-all font-bold text-slate-800 dark:text-slate-100 h-9"
                                                value={item.quantity || 0}
                                                onChange={e => updateManualItem(item.id, 'quantity', Number(e.target.value))}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1.5 align-top">
                                            <Input
                                                type="number"
                                                className="text-right border-transparent bg-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 dark:focus:border-blue-500 transition-all dark:text-slate-200 h-9"
                                                value={item.unit_price || 0}
                                                onChange={e => updateManualItem(item.id, 'unit_price', Number(e.target.value))}
                                                placeholder="0"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-700 dark:text-slate-200 p-2 align-middle transition-colors">
                                            {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="p-1.5 text-center align-middle">
                                            <Button variant="ghost" size="icon" onClick={() => removeManualRow(item.id)} className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-800 transition-colors">
                    <Button variant="outline" onClick={() => router.back()} disabled={loading} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Hủy bỏ</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] shadow-md transition-colors">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : <><Save className="w-4 h-4 mr-2" /> Lưu Đơn Hàng</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}