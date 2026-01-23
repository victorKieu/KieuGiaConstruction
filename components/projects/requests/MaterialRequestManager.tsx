"use client";

import { useState, useEffect } from "react";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Trash2, FileText, Calendar, User, ShoppingCart, Package,
    AlertTriangle, CheckSquare, Truck, Loader2, Check, ChevronsUpDown, X
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import {
    createMaterialRequest,
    deleteMaterialRequest,
    getMaterialRequests,
    checkRequestFeasibility,
    approveAndProcessRequest,
    getProjectStandardizedMaterials,
    getCurrentRequesterInfo
} from "@/lib/action/procurement";
import { formatDate, cn } from "@/lib/utils/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// --- COMPONENT COMBOBOX (Giữ nguyên) ---
function MaterialCombobox({ value, onChange, onUnitChange, options }: any) {
    const [open, setOpen] = useState(false);
    const selectedItem = options.find((item: any) => item.name === value);
    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} type="button" className={cn("w-full justify-between font-normal text-left px-3 h-9", !value && "text-muted-foreground")}>
                    <span className="truncate">{selectedItem ? selectedItem.name : (value || "Chọn vật tư...")}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
                <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput placeholder="Tìm tên vật tư..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {options.map((item: any, index: number) => (
                                <CommandItem key={item.name + index} value={item.name} onSelect={() => { onChange(item.name); if (item.unit && onUnitChange) onUnitChange(item.unit); setOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === item.name ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between">
                                            <span className="font-medium">{item.name}</span>
                                            {item.budget > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded">Max: {item.budget}</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-400">ĐVT: {item.unit}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// --- MAIN COMPONENT ---
export default function MaterialRequestManager({ projectId }: { projectId: string }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [budgetMaterials, setBudgetMaterials] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState({ id: "", name: "" });
    const [loading, setLoading] = useState(true);

    // UI States
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [processOpen, setProcessOpen] = useState(false);

    // Process States
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    // ✅ State lưu các items đang duyệt (cho phép edit)
    const [approvalItems, setApprovalItems] = useState<any[]>([]);
    const [warehouseId, setWarehouseId] = useState<string>("");

    const [analyzing, setAnalyzing] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [formData, setFormData] = useState({
        code: `MR-${Date.now().toString().slice(-6)}`,
        request_date: new Date().toISOString().split('T')[0],
        deadline_date: "",
        requester_id: "",
        priority: "normal",
        notes: ""
    });

    const [items, setItems] = useState<any[]>([{ item_name: "", unit: "", quantity: 1, notes: "" }]);

    useEffect(() => {
        if (projectId) loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const [reqs, budgetMats, userInfo] = await Promise.all([
                getMaterialRequests(projectId),
                getProjectStandardizedMaterials(projectId),
                getCurrentRequesterInfo()
            ]);
            setRequests(reqs || []);
            setBudgetMaterials(budgetMats || []);
            if (userInfo) setCurrentUser({ id: userInfo.id, name: userInfo.name });
        } catch (error) {
            console.error(error);
            toast.error("Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    // --- CREATE HANDLERS ---
    const handleOpenCreate = () => {
        setFormData({
            code: `MR-${Date.now().toString().slice(-6)}`,
            request_date: new Date().toISOString().split('T')[0],
            deadline_date: "",
            requester_id: currentUser.id,
            priority: "normal",
            notes: ""
        });
        setItems([{ item_name: "", unit: "", quantity: 1, notes: "" }]);
        setOpen(true);
    };

    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };
    const addItem = () => setItems([...items, { item_name: "", unit: "", quantity: 1, notes: "" }]);
    const removeItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    const handleSubmit = async () => {
        if (!formData.code || !formData.request_date) return toast.error("Thiếu thông tin chung");
        if (!formData.requester_id) return toast.error("Lỗi: Tài khoản chưa có ID (Chạy SQL fix data để test).");

        const validItems = items.filter(i => i.item_name.trim() !== "");
        if (validItems.length === 0) return toast.error("Cần ít nhất 1 vật tư");

        setSubmitting(true);
        const res = await createMaterialRequest({ ...formData, project_id: projectId }, validItems);
        if (res.success) {
            toast.success("Thành công!");
            setOpen(false);
            loadData();
        } else {
            toast.error(res.error);
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa phiếu này?")) return;
        await deleteMaterialRequest(id, projectId);
        loadData();
    };

    // --- APPROVAL HANDLERS (LOGIC MỚI) ---
    const handleOpenProcess = async (req: any) => {
        setSelectedRequest(req);
        setProcessOpen(true);
        setAnalyzing(true);
        setApprovalItems([]); // Reset

        const res = await checkRequestFeasibility(req.id, projectId);

        if (res.success) {
            // ✅ Lưu dữ liệu phân tích vào state để hiển thị và chỉnh sửa
            setApprovalItems(res.data || []);
            setWarehouseId(res.warehouseId || "");
        } else {
            toast.error("Lỗi phân tích: " + res.error);
            setProcessOpen(false);
        }
        setAnalyzing(false);
    };

    // ✅ Hàm xử lý khi Quản lý sửa số lượng Duyệt
    const handleApprovalQtyChange = (index: number, newQty: number) => {
        setApprovalItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index] };

            // Cập nhật số lượng được duyệt
            item.approved_quantity = newQty;

            // Tự động tính lại: Ưu tiên lấy từ kho trước, thiếu bao nhiêu thì mua
            item.action_issue = Math.min(item.stock_available, newQty);
            item.action_purchase = Math.max(0, newQty - item.stock_available);

            newItems[index] = item;
            return newItems;
        });
    };

    const handleApprove = async () => {
        setProcessing(true);
        // ✅ Gửi danh sách đã chỉnh sửa (approvalItems) thay vì dùng dữ liệu cũ
        const res = await approveAndProcessRequest(
            selectedRequest.id,
            projectId,
            approvalItems,
            warehouseId
        );

        if (res.success) {
            toast.success(res.message);
            setProcessOpen(false);
            loadData();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setProcessing(false);
    };

    const PriorityBadge = ({ p }: { p: string }) => {
        const map: any = { normal: "bg-blue-100 text-blue-700", urgent: "bg-red-100 text-red-700" };
        return <Badge variant="outline" className={map[p] || map.normal}>{p}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /> Đề xuất Vật tư</h3>
                    <p className="text-sm text-slate-500">Quản lý các yêu cầu cấp vật tư từ công trường</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={handleOpenCreate}>
                            <Plus className="w-4 h-4 mr-2" /> Tạo Đề xuất
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Tạo phiếu yêu cầu vật tư mới</DialogTitle></DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border">
                                <div className="space-y-2"><Label>Mã phiếu <span className="text-red-500">*</span></Label><Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Ngày yêu cầu <span className="text-red-500">*</span></Label><Input type="date" value={formData.request_date} onChange={e => setFormData({ ...formData, request_date: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Cần hàng trước ngày</Label><Input type="date" value={formData.deadline_date} onChange={e => setFormData({ ...formData, deadline_date: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Người yêu cầu</Label><Input value={currentUser.name} readOnly className="bg-slate-100 font-bold text-slate-700 cursor-not-allowed" /></div>
                                <div className="space-y-2"><Label>Độ ưu tiên</Label><Select defaultValue="normal" onValueChange={(val) => setFormData({ ...formData, priority: val })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Thấp</SelectItem><SelectItem value="normal">Bình thường</SelectItem><SelectItem value="high">Cao</SelectItem><SelectItem value="urgent">Khẩn cấp</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Ghi chú chung</Label><Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
                            </div>

                            <div className="border rounded-lg overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-100">
                                        <TableRow><TableHead className="w-[40%]">Tên vật tư</TableHead><TableHead className="w-[15%]">ĐVT</TableHead><TableHead className="w-[15%]">Số lượng</TableHead><TableHead>Ghi chú</TableHead><TableHead className="w-[50px]"></TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="p-2"><MaterialCombobox value={item.item_name} onChange={(val: any) => updateItem(idx, 'item_name', val)} onUnitChange={(unit: any) => updateItem(idx, 'unit', unit)} options={budgetMaterials} /></TableCell>
                                                <TableCell className="p-2"><Input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="bg-slate-50" /></TableCell>
                                                <TableCell className="p-2"><Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="font-bold text-center" /></TableCell>
                                                <TableCell className="p-2"><Input value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} /></TableCell>
                                                <TableCell className="p-2 text-center"><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-2 border-t bg-slate-50"><Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Thêm dòng</Button></div>
                            </div>
                            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 h-10 shadow-md">
                                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang lưu...</> : "Gửi Đề xuất"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requests.map((req) => (
                    <Card key={req.id} className={`hover:shadow-md transition-all border-l-4 ${req.status === 'approved' ? 'border-l-green-500 bg-green-50/20' : 'border-l-blue-500'}`}>
                        <CardHeader className="pb-2 flex flex-row justify-between">
                            <div><CardTitle className="text-sm font-bold text-blue-700 flex items-center gap-2"><FileText className="w-4 h-4" /> {req.code}</CardTitle><div className="text-xs text-slate-500 mt-1 flex gap-1"><Calendar className="w-3 h-3" /> {formatDate(req.request_date)}</div></div>
                            <PriorityBadge p={req.priority} />
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4 text-slate-400" /> <span className="font-medium">{req.requester?.name || "Không rõ"}</span></div>
                            <div className="bg-white p-2 rounded text-xs space-y-1 border shadow-sm">
                                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Danh sách ({req.items?.length || 0}):</div>
                                {req.items?.slice(0, 3).map((item: any) => (<div key={item.id} className="flex justify-between border-b border-dashed last:border-0 pb-1 last:pb-0"><span className="truncate max-w-[150px]">{item.item_name}</span><span className="font-bold">{item.quantity} {item.unit}</span></div>))}
                                {req.items?.length > 3 && <div className="text-center text-blue-500 italic pt-1">+ {req.items.length - 3} khác...</div>}
                            </div>
                            <div className="pt-2 flex justify-between items-center border-t mt-3">
                                <span className={`text-xs font-bold flex items-center gap-1 ${req.status === 'approved' ? 'text-green-600' : 'text-orange-500'}`}>{req.status === 'pending' ? <><Loader2 className="w-3 h-3 animate-spin" /> Chờ xử lý</> : <><CheckSquare className="w-3 h-3" /> Đã duyệt</>}</span>
                                {req.status === 'pending' && (<div className="flex gap-1"><Button size="sm" className="h-7 bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm" onClick={() => handleOpenProcess(req)}>Duyệt & Điều phối</Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(req.id)}><Trash2 className="w-4 h-4" /></Button></div>)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ✅ PROCESS DIALOG (ĐÃ CẬP NHẬT GIAO DIỆN MỚI) */}
            <Dialog open={processOpen} onOpenChange={setProcessOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-indigo-600" /> Phân tích & Duyệt Đề xuất</DialogTitle></DialogHeader>
                    {analyzing ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p>Đang kiểm tra tồn kho & định mức...</p></div>
                    ) : approvalItems.length > 0 ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-slate-50 p-3 rounded border text-sm grid grid-cols-2 gap-4">
                                <div><span className="font-bold text-slate-500">Mã phiếu:</span> {selectedRequest?.code}</div>
                                <div><span className="font-bold text-slate-500">Người yêu cầu:</span> {selectedRequest?.requester?.name}</div>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-indigo-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-indigo-900 w-[25%]">Vật tư</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900 w-[10%]">ĐVT</TableHead>
                                            {/* ✅ Cột Định mức mới */}
                                            <TableHead className="text-center font-bold text-indigo-900 w-[15%]">Định mức</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900 w-[10%]">Tồn kho</TableHead>
                                            {/* ✅ Cột Duyệt số lượng (Editable) */}
                                            <TableHead className="text-center font-bold text-indigo-900 w-[15%]">Duyệt SL</TableHead>
                                            <TableHead className="text-right font-bold text-indigo-900 w-[25%]">Giải pháp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {approvalItems.map((item: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{item.item_name}</TableCell>
                                                <TableCell className="text-center">{item.unit}</TableCell>
                                                {/* Hiển thị định mức */}
                                                <TableCell className="text-center font-mono text-slate-500">
                                                    {item.budget_quantity > 0 ? item.budget_quantity : "-"}
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-slate-600">{item.stock_available}</TableCell>

                                                {/* ✅ Ô nhập liệu số lượng Duyệt */}
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.approved_quantity}
                                                        onChange={(e) => handleApprovalQtyChange(idx, Number(e.target.value))}
                                                        className="h-8 text-center font-bold text-blue-700 border-blue-200 focus:border-blue-500"
                                                    />
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-1 text-[11px]">
                                                        {item.action_issue > 0 && (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shadow-sm whitespace-nowrap">
                                                                <Truck className="w-3 h-3 mr-1" /> Xuất: {item.action_issue}
                                                            </Badge>
                                                        )}
                                                        {item.action_purchase > 0 && (
                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 shadow-sm whitespace-nowrap">
                                                                <ShoppingCart className="w-3 h-3 mr-1" /> Mua: {item.action_purchase}
                                                            </Badge>
                                                        )}
                                                        {item.action_issue === 0 && item.action_purchase === 0 && (
                                                            <span className="text-slate-400 italic">Không xử lý</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-xs text-amber-800 flex gap-2 items-start">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <span className="font-bold">Lưu ý:</span> Bạn có thể chỉnh sửa "Duyệt SL". Hệ thống sẽ tự động tính toán lại số lượng Xuất kho và Mua mới.
                                </div>
                            </div>

                            <Button onClick={handleApprove} disabled={processing} className="w-full bg-green-600 hover:bg-green-700 h-10 shadow-md">
                                {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang xử lý...</> : "✅ Xác nhận Duyệt & Thực thi"}
                            </Button>
                        </div>
                    ) : <div className="text-red-500 py-4 text-center">Lỗi không tải được dữ liệu.</div>}
                </DialogContent>
            </Dialog>
        </div>
    );
}