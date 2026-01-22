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
    Plus, Trash2, FileText, Calendar, User, ShoppingCart, X, Package,
    ArrowRight, AlertTriangle, CheckSquare, Truck, Loader2, Check, ChevronsUpDown
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
// ✅ Import đúng Server Actions đã sửa
import {
    createMaterialRequest,
    deleteMaterialRequest,
    getMaterialRequests,
    getProjectMembers,
    checkRequestFeasibility,
    approveAndProcessRequest,
    getProjectStandardizedMaterials
} from "@/lib/action/procurement";
import { formatDate, cn } from "@/lib/utils/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- SHADCN UI IMPORTS ---
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// --- COMPONENT COMBOBOX (Customized cho Vật tư) ---
function MaterialCombobox({
    value,
    onChange,
    onUnitChange,
    options
}: {
    value: string,
    onChange: (val: string) => void,
    onUnitChange?: (unit: string) => void,
    options: any[]
}) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal text-left px-3",
                        !value && "text-muted-foreground"
                    )}
                >
                    <span className="truncate">{value || "Chọn vật tư (Theo dự toán)..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Tìm tên vật tư..." />
                    <CommandList>
                        <CommandEmpty>
                            <p className="py-2 text-sm text-slate-500 text-center">
                                Không tìm thấy trong dự toán. <br />
                                <span className="text-xs italic">Bạn hãy nhập tên trực tiếp vào ô bên ngoài nếu là vật tư phát sinh.</span>
                            </p>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {options.map((item) => (
                                <CommandItem
                                    key={item.name}
                                    value={item.name}
                                    onSelect={(currentValue) => {
                                        // Fix lỗi lowercase của shadcn command
                                        const original = options.find(o => o.name.toLowerCase() === currentValue.toLowerCase());
                                        const finalName = original ? original.name : currentValue;

                                        onChange(finalName);
                                        if (original && original.unit && onUnitChange) {
                                            onUnitChange(original.unit);
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{item.name}</span>
                                            {/* ✅ Hiển thị Định mức để tham khảo */}
                                            {item.budget > 0 && (
                                                <span className="text-[10px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                                    Max: {item.budget}
                                                </span>
                                            )}
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

// --- MAIN MANAGER COMPONENT ---
export default function MaterialRequestManager({ projectId }: { projectId: string }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [standardMaterials, setStandardMaterials] = useState<any[]>([]); // Dữ liệu từ project_material_budget
    const [loading, setLoading] = useState(true);

    // State UI
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [processOpen, setProcessOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        code: `MR-${Date.now().toString().slice(-6)}`,
        request_date: new Date().toISOString().split('T')[0],
        deadline_date: "",
        requester_id: "",
        priority: "normal",
        notes: ""
    });

    const [items, setItems] = useState<any[]>([
        { item_name: "", unit: "", quantity: 1, notes: "" }
    ]);

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const [reqs, emps, budgetMats] = await Promise.all([
                getMaterialRequests(projectId),
                getProjectMembers(projectId),
                getProjectStandardizedMaterials(projectId) // ✅ Lấy danh mục chuẩn
            ]);
            setRequests(reqs);
            setEmployees(emps);
            setStandardMaterials(budgetMats);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    // --- FORM HANDLERS ---
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { item_name: "", unit: "", quantity: 1, notes: "" }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!formData.code || !formData.request_date || !formData.requester_id) {
            toast.error("Vui lòng điền đầy đủ thông tin chung");
            return;
        }
        const validItems = items.filter(i => i.item_name.trim() !== "");
        if (validItems.length === 0) {
            toast.error("Phải có ít nhất 1 vật tư");
            return;
        }

        setSubmitting(true);
        const res = await createMaterialRequest({ ...formData, project_id: projectId }, validItems);

        if (res.success) {
            toast.success("Đã tạo phiếu đề xuất!");
            setOpen(false);
            // Reset Form
            setFormData({
                code: `MR-${Date.now().toString().slice(-6)}`,
                request_date: new Date().toISOString().split('T')[0],
                deadline_date: "",
                requester_id: "",
                priority: "normal",
                notes: ""
            });
            setItems([{ item_name: "", unit: "", quantity: 1, notes: "" }]);
            loadData();
        } else {
            toast.error(res.error);
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa phiếu này?")) return;
        await deleteMaterialRequest(id, projectId);
        loadData();
    };

    // --- PROCESS HANDLERS (Duyệt & Tách phiếu) ---
    const handleOpenProcess = async (req: any) => {
        setSelectedRequest(req);
        setProcessOpen(true);
        setAnalyzing(true);
        setAnalysis(null);

        const res = await checkRequestFeasibility(req.id, projectId);
        if (res.success) {
            setAnalysis(res);
        } else {
            toast.error("Lỗi phân tích: " + res.error);
            setProcessOpen(false);
        }
        setAnalyzing(false);
    };

    const handleApprove = async () => {
        if (!analysis) return;
        setProcessing(true);
        const res = await approveAndProcessRequest(
            selectedRequest.id,
            projectId,
            analysis.data,
            analysis.warehouseId
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

    // --- UI HELPERS ---
    const PriorityBadge = ({ p }: { p: string }) => {
        const map: any = {
            low: { label: "Thấp", color: "bg-slate-100 text-slate-600 border-slate-200" },
            normal: { label: "Thường", color: "bg-blue-100 text-blue-700 border-blue-200" },
            high: { label: "Gấp", color: "bg-orange-100 text-orange-700 border-orange-200" },
            urgent: { label: "Khẩn cấp", color: "bg-red-100 text-red-700 border-red-200 animate-pulse" }
        };
        const conf = map[p] || map.normal;
        return <Badge variant="outline" className={`${conf.color} border`}>{conf.label}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* HEADER LIST */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        Đề xuất Vật tư
                    </h3>
                    <p className="text-sm text-slate-500">Quản lý các yêu cầu cấp vật tư từ công trường</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" /> Tạo Đề xuất
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Tạo phiếu yêu cầu vật tư mới</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-6 py-4">
                            {/* FORM HEADER */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border">
                                <div className="space-y-2">
                                    <Label>Mã phiếu</Label>
                                    <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ngày yêu cầu</Label>
                                    <Input type="date" value={formData.request_date} onChange={e => setFormData({ ...formData, request_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cần hàng trước ngày</Label>
                                    <Input type="date" value={formData.deadline_date} onChange={e => setFormData({ ...formData, deadline_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Người yêu cầu</Label>
                                    <Select onValueChange={(val) => setFormData({ ...formData, requester_id: val })}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Chọn nhân viên" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Độ ưu tiên</Label>
                                    <Select defaultValue="normal" onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Thấp</SelectItem>
                                            <SelectItem value="normal">Bình thường</SelectItem>
                                            <SelectItem value="high">Cao (Cần sớm)</SelectItem>
                                            <SelectItem value="urgent">Khẩn cấp</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ghi chú chung</Label>
                                    <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="VD: Giao tới cổng B..." />
                                </div>
                            </div>

                            {/* ITEMS TABLE */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Danh sách vật tư chi tiết
                                    </Label>
                                    <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Thêm dòng</Button>
                                </div>
                                <div className="border rounded-lg overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-100">
                                            <TableRow>
                                                <TableHead className="w-[40%]">Tên vật tư (Theo Dự toán)</TableHead>
                                                <TableHead className="w-[15%]">ĐVT</TableHead>
                                                <TableHead className="w-[15%]">Số lượng</TableHead>
                                                <TableHead>Ghi chú</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="p-2">
                                                        {/* ✅ COMBOBOX VỚI DỮ LIỆU CHUẨN TỪ BUDGET */}
                                                        <MaterialCombobox
                                                            value={item.item_name}
                                                            onChange={(val) => updateItem(idx, 'item_name', val)}
                                                            onUnitChange={(unit) => updateItem(idx, 'unit', unit)}
                                                            options={standardMaterials}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            value={item.unit}
                                                            onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                            placeholder="ĐVT"
                                                            className="border-transparent bg-slate-50 focus:border-blue-500"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                            className="border-transparent focus:border-blue-500 text-center font-bold"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            value={item.notes}
                                                            onChange={e => updateItem(idx, 'notes', e.target.value)}
                                                            className="border-transparent focus:border-blue-500"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2 text-center">
                                                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-400">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 h-10">
                                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang lưu...</> : "Gửi Đề xuất"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* REQUEST LIST GRID */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requests.map((req) => (
                    <Card key={req.id} className={`hover:shadow-md transition-all border-l-4 ${req.status === 'approved' ? 'border-l-green-500 bg-green-50/20' : 'border-l-blue-500'}`}>
                        <CardHeader className="pb-2 flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> {req.code}
                                </CardTitle>
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {formatDate(req.request_date)}
                                </div>
                            </div>
                            <PriorityBadge p={req.priority} />
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div className="flex items-center gap-2 text-slate-600">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{req.requester?.name || "Không rõ"}</span>
                            </div>

                            <div className="bg-white p-2 rounded text-xs space-y-1 border shadow-sm">
                                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                    <Package className="w-3 h-3" /> Danh sách ({req.items?.length || 0}):
                                </div>
                                {req.items?.slice(0, 3).map((item: any) => (
                                    <div key={item.id} className="flex justify-between border-b border-dashed border-slate-100 last:border-0 pb-1 last:pb-0">
                                        <span className="truncate max-w-[150px]">{item.item_name}</span>
                                        <span className="font-bold">{item.quantity} {item.unit}</span>
                                    </div>
                                ))}
                                {req.items?.length > 3 && (
                                    <div className="text-center text-blue-500 italic pt-1">
                                        + {req.items.length - 3} mặt hàng khác...
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex justify-between items-center border-t mt-3">
                                <span className={`text-xs font-bold flex items-center gap-1 ${req.status === 'approved' ? 'text-green-600' : 'text-orange-500'}`}>
                                    {req.status === 'pending' ? <><Loader2 className="w-3 h-3 animate-spin" /> Chờ xử lý</> : <><CheckSquare className="w-3 h-3" /> Đã duyệt</>}
                                </span>

                                {req.status === 'pending' && (
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            className="h-7 bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm"
                                            onClick={() => handleOpenProcess(req)}
                                        >
                                            Duyệt & Điều phối
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(req.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {requests.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50">
                        Chưa có đề xuất vật tư nào.
                    </div>
                )}
            </div>

            {/* PROCESS DIALOG (DUYỆT & ĐIỀU PHỐI) */}
            <Dialog open={processOpen} onOpenChange={setProcessOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                            Phân tích & Điều phối Vật tư
                        </DialogTitle>
                    </DialogHeader>

                    {analyzing ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p>Đang kiểm tra tồn kho & định mức...</p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-slate-50 p-3 rounded border text-sm grid grid-cols-2 gap-4">
                                <div><span className="font-bold text-slate-500">Mã phiếu:</span> {selectedRequest?.code}</div>
                                <div><span className="font-bold text-slate-500">Người yêu cầu:</span> {selectedRequest?.requester?.name}</div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-indigo-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-indigo-900">Vật tư</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900">Yêu cầu</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900">Tồn kho</TableHead>
                                            <TableHead className="text-right font-bold text-indigo-900">Giải pháp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysis.data.map((item: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{item.item_name}</TableCell>
                                                <TableCell className="text-center bg-slate-50 font-medium">{item.quantity} {item.unit}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={item.stock_available >= item.quantity ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                                        {item.stock_available}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        {item.action_issue > 0 && (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shadow-sm">
                                                                <Truck className="w-3 h-3 mr-1" /> Xuất kho: {item.action_issue}
                                                            </Badge>
                                                        )}
                                                        {item.action_purchase > 0 && (
                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 shadow-sm">
                                                                <ShoppingCart className="w-3 h-3 mr-1" /> Mua mới: {item.action_purchase}
                                                            </Badge>
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
                                    <span className="font-bold">Hành động tự động:</span>
                                    <ul className="list-disc pl-4 mt-1 space-y-1">
                                        <li>Tạo <b>Phiếu Xuất Kho</b> (Goods Issue) cho các mặt hàng có sẵn & trừ kho ngay lập tức.</li>
                                        <li>Tạo <b>Đơn Mua Hàng Nháp</b> (PO Draft) cho các mặt hàng thiếu.</li>
                                    </ul>
                                </div>
                            </div>

                            <Button onClick={handleApprove} disabled={processing} className="w-full bg-green-600 hover:bg-green-700 h-10 shadow-md">
                                {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang xử lý...</> : "✅ Xác nhận Duyệt & Thực thi"}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-red-500 py-4 text-center">Lỗi không tải được dữ liệu phân tích.</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}