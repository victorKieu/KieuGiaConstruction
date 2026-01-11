"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, RotateCcw, ClipboardCheck, Plus, Trash2, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Import đầy đủ các Actions
import {
    createTransferAction,
    createGoodsReturnAction,
    createInventoryCheckAction,
    createGoodsIssueAction,
    createOtherIssueAction,
    getReceivedPOsByWarehouse
} from "@/lib/action/inventory";

interface Props {
    warehouseId: string;
    projectId?: string | null;
    inventory: any[];
    otherWarehouses?: any[];
}

// 1. DIALOG XUẤT KHO SỬ DỤNG (MỚI)
export function IssueDialog({ warehouseId, projectId, inventory }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [receiver, setReceiver] = useState("");
    const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ item_name: string; unit: string; quantity: number; stock: number; notes: string }[]>([]);

    const handleAddItem = () => setItems([...items, { item_name: "", unit: "", quantity: 1, stock: 0, notes: "" }]);
    const handleRemoveItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const handleItemChange = (idx: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'item_name') {
            const selected = inventory.find(i => i.item_name === value);
            newItems[idx].item_name = value;
            newItems[idx].unit = selected?.unit || "";
            newItems[idx].stock = selected?.quantity_on_hand || 0;
        } else {
            // @ts-ignore
            newItems[idx][field] = value;
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!receiver) return toast.error("Nhập tên người nhận/tổ đội");
        if (items.length === 0) return toast.error("Chưa chọn vật tư");

        for (const item of items) {
            if (item.quantity > item.stock) return toast.error(`"${item.item_name}" không đủ tồn (Còn: ${item.stock})`);
            if (item.quantity <= 0) return toast.error("Số lượng phải > 0");
        }

        setLoading(true);
        const res = await createGoodsIssueAction({
            warehouse_id: warehouseId,
            project_id: projectId || undefined,
            receiver_name: receiver,
            issue_date: new Date(issueDate),
            notes,
            items: items.map(i => ({
                item_name: i.item_name, unit: i.unit, quantity: i.quantity, notes: i.notes
            }))
        });
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpen(false); setItems([]);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-sm">
                    <LogOut className="w-4 h-4" /> Xuất sử dụng
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>Phiếu Xuất Kho (Cho Công Trình)</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-4 py-2 px-1">
                    <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded border">
                        <div className="space-y-2"><Label>Người nhận *</Label><Input value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="VD: Tổ nề..." /></div>
                        <div className="space-y-2"><Label>Ngày xuất</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Ghi chú</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead>ĐVT</TableHead><TableHead className="text-right">Tồn kho</TableHead><TableHead className="text-right">SL Xuất</TableHead><TableHead>Ghi chú</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            <Select value={item.item_name} onValueChange={(v) => handleItemChange(idx, 'item_name', v)}>
                                                <SelectTrigger><SelectValue placeholder="Chọn vật tư..." /></SelectTrigger>
                                                <SelectContent>
                                                    {inventory.filter(i => i.quantity_on_hand > 0).map(i => (
                                                        <SelectItem key={i.id} value={i.item_name}>{i.item_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right font-medium">{item.stock}</TableCell>
                                        <TableCell><Input type="number" className="text-right font-bold" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} /></TableCell>
                                        <TableCell><Input value={item.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} placeholder="..." /></TableCell>
                                        <TableCell><Button variant="ghost" onClick={() => handleRemoveItem(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button variant="ghost" className="w-full text-blue-600" onClick={handleAddItem}><Plus className="w-4 h-4 mr-2" /> Thêm dòng</Button>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading} className="bg-orange-600">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận Xuất</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// 2. DIALOG ĐIỀU CHUYỂN
export function TransferDialog({ warehouseId, inventory, otherWarehouses = [] }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toWarehouse, setToWarehouse] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ item_name: string; unit: string; quantity: number }[]>([]);

    const handleAddItem = () => setItems([...items, { item_name: "", unit: "", quantity: 1 }]);
    const handleItemChange = (idx: number, name: string) => {
        const i = inventory.find(x => x.item_name === name);
        const newItems = [...items]; newItems[idx] = { item_name: name, unit: i?.unit || "", quantity: 1 }; setItems(newItems);
    }
    const handleQtyChange = (idx: number, q: number) => { const n = [...items]; n[idx].quantity = q; setItems(n); }

    const handleSubmit = async () => {
        setLoading(true);
        const res = await createTransferAction(warehouseId, toWarehouse, items, notes);
        setLoading(false);
        if (res.success) { toast.success(res.message); setOpen(false); setItems([]); router.refresh(); } else { toast.error(res.error); }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2" /> Điều chuyển</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Điều chuyển nội bộ</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Kho nhận</Label><Select onValueChange={setToWarehouse}><SelectTrigger><SelectValue placeholder="Chọn kho..." /></SelectTrigger><SelectContent>{otherWarehouses.filter(w => w.id !== warehouseId).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Ghi chú</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead className="text-right">SL Chuyển</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>{items.map((item, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><Select value={item.item_name} onValueChange={v => handleItemChange(idx, v)}><SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger><SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.item_name}>{i.item_name} (Tồn: {i.quantity_on_hand})</SelectItem>)}</SelectContent></Select></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={item.quantity} onChange={e => handleQtyChange(idx, Number(e.target.value))} /></TableCell>
                                    <TableCell><Button variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                        <Button variant="ghost" className="w-full" onClick={handleAddItem}><Plus className="w-4 h-4" /> Thêm</Button>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading}>Xác nhận</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// 3. DIALOG NHẬP TRẢ
export function ReturnDialog({ warehouseId, inventory }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [returner, setReturner] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ item_name: string; unit: string; quantity: number; reason: string }[]>([]);

    const handleAddItem = () => setItems([...items, { item_name: "", unit: "", quantity: 1, reason: "" }]);
    const handleSubmit = async () => {
        setLoading(true);
        const res = await createGoodsReturnAction({ warehouse_id: warehouseId, returner_name: returner, return_date: new Date(), notes, items });
        setLoading(false);
        if (res.success) { toast.success(res.message); setOpen(false); router.refresh(); } else { toast.error(res.error); }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline"><RotateCcw className="w-4 h-4 mr-2" /> Nhập trả</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Nhập trả vật tư thừa</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Người trả</Label><Input value={returner} onChange={e => setReturner(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Lý do/Ghi chú</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead className="text-right">SL Trả</TableHead><TableHead>Lý do</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>{items.map((item, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><Input list="mats" value={item.item_name} onChange={e => { const n = [...items]; n[idx].item_name = e.target.value; setItems(n) }} placeholder="Nhập tên..." /><datalist id="mats">{inventory.map(i => <option key={i.id} value={i.item_name} />)}</datalist></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={item.quantity} onChange={e => { const n = [...items]; n[idx].quantity = Number(e.target.value); setItems(n) }} /></TableCell>
                                    <TableCell><Input value={item.reason} onChange={e => { const n = [...items]; n[idx].reason = e.target.value; setItems(n) }} /></TableCell>
                                    <TableCell><Button variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                        <Button variant="ghost" className="w-full" onClick={handleAddItem}><Plus className="w-4 h-4" /> Thêm</Button>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading}>Nhập trả</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// 4. DIALOG KIỂM KÊ
export function InventoryCheckDialog({ warehouseId, inventory }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);

    const startCheck = () => { setItems(inventory.map(i => ({ item_name: i.item_name, system_qty: i.quantity_on_hand, actual_qty: i.quantity_on_hand, reason: "" }))); setOpen(true); }
    const handleSubmit = async () => {
        setLoading(true);
        const res = await createInventoryCheckAction(warehouseId, items);
        setLoading(false);
        if (res.success) { toast.success(res.message); setOpen(false); router.refresh(); }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline" onClick={startCheck}><ClipboardCheck className="w-4 h-4 mr-2" /> Kiểm kê</Button></DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader><DialogTitle>Kiểm kê kho</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead className="text-right">Tồn Máy</TableHead><TableHead className="text-right">Thực tế</TableHead><TableHead>Ghi chú lệch</TableHead></TableRow></TableHeader>
                        <TableBody>{items.map((item, idx) => {
                            const diff = item.actual_qty - item.system_qty;
                            return (
                                <TableRow key={idx} className={diff !== 0 ? "bg-yellow-50" : ""}>
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell className="text-right text-slate-500">{item.system_qty}</TableCell>
                                    <TableCell><Input type="number" className={`text-right font-bold ${diff !== 0 ? (diff < 0 ? 'text-red-600' : 'text-green-600') : ''}`} value={item.actual_qty} onChange={e => { const n = [...items]; n[idx].actual_qty = Number(e.target.value); setItems(n) }} /></TableCell>
                                    <TableCell><Input value={item.reason} onChange={e => { const n = [...items]; n[idx].reason = e.target.value; setItems(n) }} disabled={diff === 0} /></TableCell>
                                </TableRow>
                            )
                        })}</TableBody>
                    </Table>
                </div>
                <DialogFooter className="pt-4 border-t"><Button onClick={handleSubmit} disabled={loading}>Cân bằng kho</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
// --- [CẬP NHẬT] 5. DIALOG XỬ LÝ HÀNG HÓA (CÓ CHỌN PO KHI TRẢ) ---
export function OtherIssueDialog({ warehouseId, inventory }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // State quản lý PO
    const [poList, setPoList] = useState<any[]>([]);
    const [selectedPO, setSelectedPO] = useState<string>("");

    const [type, setType] = useState<'RETURN_VENDOR' | 'DISPOSAL'>('RETURN_VENDOR');
    const [partner, setPartner] = useState("");
    const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ item_name: string; unit: string; quantity: number; stock: number; notes: string }[]>([]);

    // Khi mở dialog, load danh sách PO đã nhập
    const handleOpenChange = async (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            const pos = await getReceivedPOsByWarehouse(warehouseId);
            setPoList(pos);
        }
    };

    // Khi chọn PO -> Tự điền NCC và lọc Items
    const handleSelectPO = (poId: string) => {
        setSelectedPO(poId);
        const po = poList.find(p => p.id === poId);
        if (po) {
            setPartner(po.supplier?.name || ""); // Tự điền NCC
            setItems([]); // Reset items đang chọn để tránh râu ông nọ
            setNotes(`Xuất trả hàng từ đơn: ${po.code}`);
        }
    };

    // Logic lấy danh sách vật tư khả dụng trong dropdown
    // Nếu là Trả hàng & Đã chọn PO -> Chỉ hiện vật tư trong PO đó
    const getAvailableItems = () => {
        if (type === 'RETURN_VENDOR' && selectedPO) {
            const po = poList.find(p => p.id === selectedPO);
            const poItemNames = po?.items?.map((i: any) => i.item_name) || [];
            // Lọc: Vật tư phải có trong kho AND có trong PO
            return inventory.filter(i => i.quantity_on_hand > 0 && poItemNames.includes(i.item_name));
        }
        // Trường hợp Hủy hoặc chưa chọn PO -> Hiện tất cả tồn kho
        return inventory.filter(i => i.quantity_on_hand > 0);
    };

    const handleAddItem = () => setItems([...items, { item_name: "", unit: "", quantity: 1, stock: 0, notes: "" }]);
    const handleRemoveItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const handleItemChange = (idx: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'item_name') {
            const selected = inventory.find(i => i.item_name === value);
            newItems[idx].item_name = value;
            newItems[idx].unit = selected?.unit || "";
            newItems[idx].stock = selected?.quantity_on_hand || 0;
        } else {
            // @ts-ignore
            newItems[idx][field] = value;
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!partner) return toast.error(type === 'RETURN_VENDOR' ? "Chưa xác định Nhà cung cấp" : "Nhập người đề xuất");
        if (type === 'RETURN_VENDOR' && !selectedPO) return toast.error("Vui lòng chọn Đơn hàng (PO) cần trả");
        if (items.length === 0) return toast.error("Chưa chọn vật tư");

        for (const item of items) {
            if (item.quantity > item.stock) return toast.error(`"${item.item_name}" không đủ tồn (Còn: ${item.stock})`);
            if (item.quantity <= 0) return toast.error("Số lượng phải > 0");
        }

        setLoading(true);
        const res = await createOtherIssueAction({
            warehouse_id: warehouseId, type, partner_name: partner, issue_date: new Date(issueDate), notes,
            items: items.map(i => ({ item_name: i.item_name, unit: i.unit, quantity: i.quantity, notes: i.notes }))
        });
        setLoading(false);

        if (res.success) { toast.success(res.message); setOpen(false); setItems([]); router.refresh(); }
        else { toast.error(res.error); }
    };

    // Danh sách vật tư để render option
    const availableInventory = getAvailableItems();

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 gap-2">
                    <Trash2 className="w-4 h-4" /> Xử lý hàng hóa
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-red-700 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" /> {type === 'RETURN_VENDOR' ? 'Xuất trả Nhà Cung Cấp' : 'Xuất Hủy / Thanh Lý'}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-4 py-2 px-1">
                    {/* Header Option */}
                    <div className="bg-red-50 p-4 rounded border border-red-100 space-y-4">
                        <div className="flex items-center gap-6 pb-2 border-b border-red-200">
                            <Label className="text-base font-semibold text-red-800">Loại nghiệp vụ:</Label>
                            <div className="flex items-center gap-2">
                                <input type="radio" id="opt1" name="type" checked={type === 'RETURN_VENDOR'} onChange={() => { setType('RETURN_VENDOR'); setItems([]); setPartner(""); }} className="w-4 h-4 accent-red-600 cursor-pointer" />
                                <Label htmlFor="opt1" className="cursor-pointer font-medium">Trả hàng NCC (Theo PO)</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="radio" id="opt2" name="type" checked={type === 'DISPOSAL'} onChange={() => { setType('DISPOSAL'); setSelectedPO(""); setPartner(""); setItems([]); }} className="w-4 h-4 accent-red-600 cursor-pointer" />
                                <Label htmlFor="opt2" className="cursor-pointer font-medium">Xuất Hủy / Thanh lý</Label>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Cột 1: Chọn PO hoặc Nhập người đề xuất */}
                            <div className="space-y-2">
                                <Label>{type === 'RETURN_VENDOR' ? "Chọn Đơn hàng (PO) *" : "Người đề xuất *"}</Label>
                                {type === 'RETURN_VENDOR' ? (
                                    <Select value={selectedPO} onValueChange={handleSelectPO}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Chọn PO cần trả..." /></SelectTrigger>
                                        <SelectContent>
                                            {poList.length === 0 ? <SelectItem value="none" disabled>Không có đơn đã nhập</SelectItem> :
                                                poList.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        <span className="font-bold">{p.code}</span> - {p.supplier?.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input value={partner} onChange={e => setPartner(e.target.value)} className="bg-white" placeholder="Tên nhân viên..." />
                                )}
                            </div>

                            {/* Cột 2: NCC (Readonly) hoặc Ngày */}
                            {type === 'RETURN_VENDOR' ? (
                                <div className="space-y-2">
                                    <Label>Nhà Cung Cấp (Tự động)</Label>
                                    <Input value={partner} readOnly className="bg-slate-100 font-medium text-slate-700" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Ngày thực hiện</Label>
                                    <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="bg-white" />
                                </div>
                            )}

                            {/* Cột 3: Ghi chú */}
                            <div className="space-y-2">
                                <Label>Ghi chú / Lý do</Label>
                                <Input value={notes} onChange={e => setNotes(e.target.value)} className="bg-white" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead className="w-[40%]">Vật tư {type === 'RETURN_VENDOR' && <span className="text-xs font-normal text-slate-500">(Theo PO đã chọn)</span>}</TableHead>
                                    <TableHead>ĐVT</TableHead>
                                    <TableHead className="text-right">Tồn kho</TableHead>
                                    <TableHead className="text-right">Số lượng Trả/Hủy</TableHead>
                                    <TableHead>Chi tiết</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            <Select value={item.item_name} onValueChange={(v) => handleItemChange(idx, 'item_name', v)}>
                                                <SelectTrigger className={type === 'RETURN_VENDOR' ? "border-blue-200 bg-blue-50" : ""}>
                                                    <SelectValue placeholder="Chọn vật tư..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableInventory.length === 0 ? <div className="p-2 text-xs text-slate-500">Không có vật tư phù hợp</div> :
                                                        availableInventory.map(i => (
                                                            <SelectItem key={i.id} value={i.item_name}>{i.item_name}</SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right font-medium">{item.stock}</TableCell>
                                        <TableCell>
                                            <Input type="number" className="text-right font-bold border-red-200 focus:border-red-500" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} placeholder="..." />
                                        </TableCell>
                                        <TableCell><Button variant="ghost" onClick={() => handleRemoveItem(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {type === 'RETURN_VENDOR' && !selectedPO ? (
                            <div className="text-center py-6 text-slate-400 italic">Vui lòng chọn Đơn hàng (PO) ở trên để hiển thị danh sách vật tư.</div>
                        ) : (
                            <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={handleAddItem}><Plus className="w-4 h-4 mr-2" /> Thêm dòng</Button>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {type === 'RETURN_VENDOR' ? 'Xác nhận Trả hàng' : 'Xác nhận Hủy hàng'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}