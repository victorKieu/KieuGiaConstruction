"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
    ArrowLeft, ArrowRightLeft, Search, Package, PackageMinus,
    RotateCcw, ClipboardCheck, Loader2, History, Check, ChevronsUpDown
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import {
    getInventoryByWarehouse, getWarehouseById, getAllWarehouses,
    createTransferAction, createInventoryCheckAction,
    getWarehouseHistory, getRecentIssues, createGoodsReturnFromIssueAction
} from "@/lib/action/inventory";

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [warehouse, setWarehouse] = useState<any>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    // Transfer State
    const [openTransfer, setOpenTransfer] = useState(false);
    const [allWarehouses, setAllWarehouses] = useState<any[]>([]);
    const [targetWarehouseId, setTargetWarehouseId] = useState("");
    const [transferItemName, setTransferItemName] = useState("");
    const [transferQty, setTransferQty] = useState(0);
    const [loadingAction, setLoadingAction] = useState(false);

    // Return State (MỚI)
    const [openReturn, setOpenReturn] = useState(false);
    const [recentIssues, setRecentIssues] = useState<any[]>([]); // Danh sách phiếu xuất để chọn
    const [selectedIssueId, setSelectedIssueId] = useState("");
    const [returnItems, setReturnItems] = useState<any[]>([]); // Items của phiếu xuất được chọn
    const [returnReason, setReturnReason] = useState("");

    // Check State
    const [openCheck, setOpenCheck] = useState(false);
    const [checkData, setCheckData] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        const [wh, inv, hist, allWh, issues] = await Promise.all([
            getWarehouseById(id),
            getInventoryByWarehouse(id),
            getWarehouseHistory(id),
            getAllWarehouses(),
            getRecentIssues(id) // <--- Load phiếu xuất
        ]);

        setWarehouse(wh);
        setInventory(inv);
        setHistory(hist);
        setAllWarehouses(allWh.filter((w: any) => w.id !== id));
        setRecentIssues(issues);

        setCheckData(inv.map(i => ({ ...i, actual_qty: i.quantity_on_hand, reason: "" })));
    };

    const formatMoney = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
    const filteredInventory = inventory.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()));

    // 1. ĐIỀU CHUYỂN
    const handleTransfer = async () => {
        if (!targetWarehouseId || !transferItemName || transferQty <= 0) return toast.error("Thiếu thông tin");
        setLoadingAction(true);
        const sourceItem = inventory.find(i => i.item_name === transferItemName);
        const res = await createTransferAction(id, targetWarehouseId, [{ item_name: transferItemName, unit: sourceItem.unit, quantity: transferQty }], "Điều chuyển");
        setLoadingAction(false);
        if (res.success) { toast.success(res.message); setOpenTransfer(false); loadData(); } else toast.error(res.error);
    };

    // 2. XỬ LÝ CHỌN PHIẾU XUẤT ĐỂ TRẢ (Logic Mới)
    const handleSelectIssue = (issueId: string) => {
        setSelectedIssueId(issueId);
        const issue = recentIssues.find(i => i.id === issueId);
        if (issue) {
            // Map items ra để nhập số lượng trả
            setReturnItems(issue.items.map((item: any) => ({
                item_name: item.item_name,
                unit: item.unit,
                issued_qty: item.quantity, // Số lượng đã xuất
                return_qty: 0 // Mặc định trả = 0
            })));
        }
    };

    const handleReturnSubmit = async () => {
        // Lọc ra những dòng có số lượng trả > 0
        const itemsToReturn = returnItems.filter(i => Number(i.return_qty) > 0);

        if (itemsToReturn.length === 0) return toast.error("Vui lòng nhập số lượng cần trả ít nhất 1 dòng");

        // Validate không trả quá số lượng xuất
        for (const item of itemsToReturn) {
            if (Number(item.return_qty) > Number(item.issued_qty)) {
                return toast.error(`Lỗi: ${item.item_name} chỉ xuất ${item.issued_qty}, không thể trả ${item.return_qty}`);
            }
        }

        setLoadingAction(true);
        const res = await createGoodsReturnFromIssueAction({
            warehouse_id: id,
            issue_id: selectedIssueId,
            returner_name: "Công trường trả về",
            return_date: new Date(),
            notes: returnReason || `Trả hàng từ phiếu ${recentIssues.find(i => i.id === selectedIssueId)?.code}`,
            items: itemsToReturn.map(i => ({
                item_name: i.item_name,
                unit: i.unit,
                quantity: Number(i.return_qty),
                reason: returnReason
            }))
        });
        setLoadingAction(false);

        if (res.success) { toast.success(res.message); setOpenReturn(false); loadData(); } else toast.error(res.error);
    };

    // 3. KIỂM KÊ
    const handleCheckSubmit = async () => {
        if (!confirm("Cập nhật số lượng tồn kho?")) return;
        setLoadingAction(true);
        const itemsToUpdate = checkData.map(i => ({
            item_name: i.item_name,
            system_qty: i.quantity_on_hand,
            actual_qty: Number(i.actual_qty),
            reason: i.reason
        }));
        const res = await createInventoryCheckAction(id, itemsToUpdate);
        setLoadingAction(false);
        if (res.success) { toast.success(res.message); setOpenCheck(false); loadData(); } else toast.error(res.error);
    };

    if (!warehouse) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/inventory")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{warehouse.name}</h2>
                        <p className="text-muted-foreground text-sm">{warehouse.address}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* A. XUẤT KHO */}
                    <Button className="bg-orange-600 hover:bg-orange-700" asChild>
                        <Link href={`/inventory/issues/new?warehouseId=${id}`}>
                            <PackageMinus className="mr-2 h-4 w-4" /> Xuất dùng
                        </Link>
                    </Button>

                    {/* B. ĐIỀU CHUYỂN */}
                    <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
                        <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><ArrowRightLeft className="mr-2 h-4 w-4" /> Điều chuyển</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Điều chuyển sang kho khác</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Đến kho</Label><Select onValueChange={setTargetWarehouseId}><SelectTrigger><SelectValue placeholder="Chọn kho..." /></SelectTrigger><SelectContent>{allWarehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Vật tư (Trong kho)</Label><Select onValueChange={setTransferItemName}><SelectTrigger><SelectValue placeholder="Chọn vật tư..." /></SelectTrigger><SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.item_name}>{i.item_name} (Tồn: {i.quantity_on_hand})</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Số lượng</Label><Input type="number" onChange={(e) => setTransferQty(Number(e.target.value))} /></div>
                            </div>
                            <DialogFooter><Button onClick={handleTransfer} disabled={loadingAction}>Xác nhận</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* C. NHẬP TRẢ (LOGIC MỚI) */}
                    <Dialog open={openReturn} onOpenChange={(v) => { if (!v) { setSelectedIssueId(""); setReturnItems([]); } setOpenReturn(v); }}>
                        <DialogTrigger asChild><Button className="bg-green-600 hover:bg-green-700"><RotateCcw className="mr-2 h-4 w-4" /> Nhập trả</Button></DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Nhập trả hàng dư</DialogTitle>
                                <DialogDescription>Chọn phiếu xuất cũ để trả lại vật tư thừa.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                                {/* Chọn Phiếu Xuất */}
                                <div className="space-y-2">
                                    <Label>Chọn phiếu đã xuất <span className="text-red-500">*</span></Label>
                                    <Select onValueChange={handleSelectIssue} value={selectedIssueId}>
                                        <SelectTrigger><SelectValue placeholder="-- Chọn phiếu xuất --" /></SelectTrigger>
                                        <SelectContent>
                                            {recentIssues.map(issue => (
                                                <SelectItem key={issue.id} value={issue.id}>
                                                    {issue.code} - {format(new Date(issue.issue_date), "dd/MM/yyyy")} ({issue.receiver_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Danh sách vật tư của phiếu xuất đó */}
                                {selectedIssueId && (
                                    <div className="border rounded-md p-4 bg-slate-50 space-y-3">
                                        <Label className="text-blue-700">Chi tiết phiếu xuất (Nhập số lượng thực trả)</Label>
                                        <div className="max-h-[200px] overflow-y-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead className="text-center">ĐVT</TableHead><TableHead className="text-right">Đã xuất</TableHead><TableHead className="w-[120px]">SL Trả</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {returnItems.map((item, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                                            <TableCell className="text-center">{item.unit}</TableCell>
                                                            <TableCell className="text-right">{item.issued_qty}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.issued_qty}
                                                                    className="h-8 bg-white"
                                                                    value={item.return_qty}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setReturnItems(prev => prev.map((p, index) => index === idx ? { ...p, return_qty: val } : p));
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Lý do trả</Label>
                                    <Input placeholder="VD: Dư dùng, thi công xong..." onChange={(e) => setReturnReason(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpenReturn(false)}>Hủy</Button>
                                <Button onClick={handleReturnSubmit} disabled={loadingAction || !selectedIssueId} className="bg-green-600 hover:bg-green-700">
                                    {loadingAction ? "..." : "Xác nhận Nhập kho"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* D. KIỂM KÊ */}
                    <Dialog open={openCheck} onOpenChange={(v) => { if (v) setCheckData(inventory.map(i => ({ ...i, actual_qty: i.quantity_on_hand }))); setOpenCheck(v); }}>
                        <DialogTrigger asChild><Button variant="outline" className="text-purple-700"><ClipboardCheck className="mr-2 h-4 w-4" /> Kiểm kê</Button></DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Cân bằng kho</DialogTitle></DialogHeader>
                            <Table>
                                <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead>Tồn sổ sách</TableHead><TableHead>Thực tế</TableHead><TableHead>Lý do lệch</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {checkData.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell>{item.quantity_on_hand}</TableCell>
                                            <TableCell><Input type="number" value={item.actual_qty} className={Number(item.actual_qty) !== Number(item.quantity_on_hand) ? "bg-red-50 font-bold text-red-700" : ""} onChange={(e) => setCheckData(prev => prev.map(p => p.id === item.id ? { ...p, actual_qty: e.target.value } : p))} /></TableCell>
                                            <TableCell><Input value={item.reason} onChange={(e) => setCheckData(prev => prev.map(p => p.id === item.id ? { ...p, reason: e.target.value } : p))} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <DialogFooter><Button onClick={handleCheckSubmit} disabled={loadingAction}>Lưu</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* TAB CONTENT: TỒN KHO & LỊCH SỬ */}
            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inventory" className="flex gap-2"><Package className="h-4 w-4" /> Tồn kho hiện tại</TabsTrigger>
                    <TabsTrigger value="history" className="flex gap-2"><History className="h-4 w-4" /> Lịch sử GD</TabsTrigger>
                </TabsList>

                {/* TAB 1: TỒN KHO */}
                <TabsContent value="inventory">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Danh sách vật tư</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Tìm vật tư..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader><TableRow><TableHead>Tên vật tư</TableHead><TableHead className="text-center">ĐVT</TableHead><TableHead className="text-right">Số lượng</TableHead><TableHead className="text-right">Đơn giá BQ</TableHead><TableHead className="text-right">Thành tiền</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredInventory.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Kho trống.</TableCell></TableRow> :
                                        filteredInventory.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.item_name}</TableCell>
                                                <TableCell className="text-center">{item.unit}</TableCell>
                                                <TableCell className="text-right font-bold text-blue-600">{item.quantity_on_hand}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatMoney(item.avg_price)}</TableCell>
                                                <TableCell className="text-right font-bold">{formatMoney(item.quantity_on_hand * item.avg_price)}</TableCell>
                                            </TableRow>
                                        ))
                                    }
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: LỊCH SỬ */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader><CardTitle className="text-sm font-medium">Lịch sử Nhập / Xuất / Trả gần đây</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader><TableRow><TableHead>Ngày GD</TableHead><TableHead>Loại phiếu</TableHead><TableHead>Mã phiếu</TableHead><TableHead>Đối tác / Người nhận</TableHead><TableHead>Ghi chú</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {history.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Chưa có giao dịch.</TableCell></TableRow> :
                                        history.map(h => (
                                            <TableRow key={h.id}>
                                                <TableCell>{format(new Date(h.date), "dd/MM/yyyy HH:mm")}</TableCell>
                                                <TableCell>
                                                    {h.type === 'ISSUE' && <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-100">XUẤT KHO</Badge>}
                                                    {h.type === 'RETURN' && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">NHẬP TRẢ</Badge>}
                                                </TableCell>
                                                <TableCell className="font-medium">{h.code}</TableCell>
                                                <TableCell>{h.partner}</TableCell>
                                                <TableCell className="text-muted-foreground italic text-sm">{h.notes}</TableCell>
                                            </TableRow>
                                        ))
                                    }
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}