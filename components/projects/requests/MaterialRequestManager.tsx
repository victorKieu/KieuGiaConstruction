"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Trash2, FileText, Calendar, User, ShoppingCart, Package,
    CheckSquare, Truck, Loader2, Lock, Edit, Store, FileQuestion
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
    createMaterialRequest, deleteMaterialRequest, getMaterialRequests,
    checkRequestFeasibility, getCurrentRequesterInfo, getProjectStandardizedMaterials
} from "@/lib/action/procurement";
import { approveAndProcessRequest, getProjectWarehouses } from "@/lib/action/requestActions";
import { formatDate } from "@/lib/utils/utils";
import { checkApprovalPermission } from "@/lib/auth/permissions";
import UnifiedRequestForm from "@/components/procurement/UnifiedRequestForm";

interface MaterialRequestManagerProps {
    projectId: string;
    requests: any[];
    projectStatus: string;
}

export default function MaterialRequestManager({ projectId, requests: initialRequests, projectStatus }: MaterialRequestManagerProps) {
    const router = useRouter();
    const supabase = createClient();
    const [requests, setRequests] = useState(initialRequests || []);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState({ id: "", name: "" });
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [processOpen, setProcessOpen] = useState(false);

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [approvalItems, setApprovalItems] = useState<any[]>([]);
    const [warehouseId, setWarehouseId] = useState<string>("");

    const [analyzing, setAnalyzing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [canApprove, setCanApprove] = useState(false);

    const isActive = ['in_progress', 'execution', 'construction'].includes(projectStatus?.toLowerCase());
    const isPaused = ['paused', 'suspended', 'on_hold'].includes(projectStatus?.toLowerCase());
    const [budgetMaterials, setBudgetMaterials] = useState<any[]>([]);

    useEffect(() => {
        if (projectId) loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const [reqs, userInfo, whList, budgetMats, hasPerm] = await Promise.all([
                getMaterialRequests(projectId),
                getCurrentRequesterInfo(),
                getProjectWarehouses(projectId),
                getProjectStandardizedMaterials(projectId),
                checkApprovalPermission(projectId)
            ]);

            const { data: supps } = await supabase.from('suppliers').select('id, name').order('name');
            setSuppliers(supps || []);

            setRequests(reqs || []);
            setWarehouses(whList || []);
            setBudgetMaterials(budgetMats || []);
            setCanApprove(hasPerm);

            if (userInfo) setCurrentUser({ id: userInfo.id, name: userInfo.name });
        } catch (error) {
            toast.error("Lỗi tải dữ liệu");
        } finally { setLoading(false); }
    };

    const handleCreateSubmit = async (formData: any) => {
        if (!currentUser.id) return toast.error("Lỗi: Tài khoản chưa có ID nhân sự.");
        setSubmitting(true);

        const payload = {
            ...formData, project_id: projectId, requester_id: currentUser.id,
            deadline_date: formData.deadline_date ? new Date(formData.deadline_date) : new Date(),
            request_date: new Date().toISOString()
        };

        const formattedItems = formData.items.map((item: any) => ({ ...item, quantity: Number(item.quantity) }));

        const res = await createMaterialRequest(payload, formattedItems);
        if (res.success) {
            toast.success("Tạo đề xuất thành công!");
            setOpen(false); loadData();
        } else toast.error(res.error);
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa phiếu yêu cầu này?")) return;
        const toastId = toast.loading("Đang xóa phiếu...");
        try {
            const res = await deleteMaterialRequest(id, projectId);
            if (res && res.success) {
                toast.success("Đã xóa phiếu thành công!", { id: toastId });
                loadData();
            } else toast.error(res?.error || "Lỗi không xác định", { id: toastId });
        } catch (error) { toast.error("Lỗi hệ thống", { id: toastId }); }
    };

    const handleOpenProcess = async (req: any) => {
        setSelectedRequest(req);
        setProcessOpen(true);
        setAnalyzing(true);
        setApprovalItems([]);

        const [feasibilityRes, { data: awardedBids }] = await Promise.all([
            checkRequestFeasibility(req.id, projectId),
            supabase.from('vw_awarded_bids').select('*').eq('project_id', projectId)
        ]);

        if (feasibilityRes.success) {
            const enrichedItems = (feasibilityRes.data || []).map((analyzedItem: any) => {
                const originalItem = req.items?.find((i: any) => i.id === analyzedItem.id) || {};
                const itemNameToCheck = (originalItem.material_name || originalItem.item_name || "").trim().toLowerCase();
                const itemCodeToCheck = (originalItem.material_code || "").trim().toUpperCase();

                const matchedBid = awardedBids?.find(bid =>
                    (itemCodeToCheck && bid.material_code && bid.material_code.trim().toUpperCase() === itemCodeToCheck) ||
                    (bid.material_name && bid.material_name.trim().toLowerCase() === itemNameToCheck)
                );

                return {
                    ...originalItem,
                    ...analyzedItem,
                    supplier_id: matchedBid?.awarded_supplier_id || originalItem.supplier_id || analyzedItem.supplier_id || null,
                    awarded_price: matchedBid?.awarded_price || originalItem.purchase_price || 0
                };
            });
            setApprovalItems(enrichedItems);
            setWarehouseId(feasibilityRes.warehouseId || "");
        } else {
            toast.error("Lỗi phân tích: " + feasibilityRes.error);
            setProcessOpen(false);
        }
        setAnalyzing(false);
    };

    const handleApprovalQtyChange = (index: number, newQty: number) => {
        setApprovalItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index] };
            item.approved_quantity = newQty;
            item.action_issue = Math.min(item.stock_available, newQty);
            item.action_purchase = Math.max(0, newQty - item.stock_available);
            newItems[index] = item;
            return newItems;
        });
    };

    const handleSupplierChange = (index: number, supplierId: string) => {
        setApprovalItems(prev => {
            const newItems = [...prev];
            newItems[index].supplier_id = supplierId || null;
            return newItems;
        });
    };

    const handleApprove = async () => {
        setProcessing(true);
        const res = await approveAndProcessRequest(selectedRequest.id, projectId, approvalItems, warehouseId);
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
        const map: any = {
            normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
            urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
        };
        return <Badge variant="outline" className={map[p] || map.normal}>{p === 'urgent' ? 'Khẩn cấp' : p === 'high' ? 'Cao' : 'Bình thường'}</Badge>;
    };

    const targetWarehouse = warehouses.find(w => w.project_id === projectId) || warehouses[0];
    const defaultWarehouseId = targetWarehouse ? String(targetWarehouse.id) : "";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card dark:bg-slate-900 p-4 rounded-lg border border-border dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h3 className="text-lg font-bold text-foreground dark:text-slate-100 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Đề xuất Vật tư & Tài sản
                    </h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">Quản lý các yêu cầu cấp vật tư/tài sản từ công trường</p>
                </div>

                {isActive ? (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={warehouses.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
                                {warehouses.length === 0 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Tạo Đề xuất
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
                            <DialogHeader><DialogTitle className="dark:text-slate-100">Tạo phiếu yêu cầu mua sắm mới</DialogTitle></DialogHeader>
                            <div className="py-4">
                                {open && (
                                    <UnifiedRequestForm
                                        key={`form-${open}`}
                                        initialData={{ destination_warehouse_id: defaultWarehouseId }}
                                        warehouses={warehouses}
                                        budgetMaterials={budgetMaterials}
                                        isSubmitting={submitting}
                                        onSubmit={handleCreateSubmit}
                                        onCancel={() => setOpen(false)}
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted dark:bg-slate-800 border border-border dark:border-slate-700 rounded-md text-muted-foreground dark:text-slate-400 cursor-not-allowed">
                        <Lock className="w-4 h-4" />
                        <span className="font-medium text-sm">
                            {isPaused ? "Kho đang tạm khóa" : "Kho đã đóng"}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requests.map((req) => (
                    <Card key={req.id} className={`hover:shadow-md transition-all border-l-4 dark:bg-slate-900 ${req.status === 'approved' ? 'border-l-green-500 bg-green-50/20 dark:bg-green-900/10' : 'border-l-blue-500 dark:border-slate-800'}`}>
                        <CardHeader className="pb-2 flex flex-row justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2"><FileText className="w-4 h-4" /> {req.code}</CardTitle>
                                <div className="text-xs text-muted-foreground dark:text-slate-400 mt-1 flex gap-1"><Calendar className="w-3 h-3" /> {formatDate(req.created_at || req.request_date)}</div>
                            </div>
                            <PriorityBadge p={req.priority} />
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-300"><User className="w-4 h-4" /> <span className="font-medium">{req.requester?.name || "Không rõ"}</span></div>
                            <div className="bg-muted/30 dark:bg-slate-800/50 p-2 rounded text-xs space-y-1 border dark:border-slate-700 shadow-sm">
                                <div className="font-semibold text-foreground dark:text-slate-200 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Danh sách ({req.items?.length || 0}):</div>
                                {req.items?.slice(0, 3).map((item: any) => (<div key={item.id} className="flex justify-between border-b border-dashed border-border dark:border-slate-700 pb-1 dark:text-slate-300"><span className="truncate max-w-[150px]">{item.item_name}</span><span className="font-bold">{item.quantity} {item.unit}</span></div>))}
                                {req.items?.length > 3 && <div className="text-center text-blue-500 dark:text-blue-400 italic pt-1">+ {req.items.length - 3} khác...</div>}
                            </div>

                            <div className="pt-2 flex justify-between items-center border-t border-border dark:border-slate-800 mt-3">
                                <span className={`text-xs font-bold flex items-center gap-1 ${req.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                    {req.status === 'pending' ? <><Loader2 className="w-3 h-3 animate-spin" /> Chờ xử lý</> : <><CheckSquare className="w-3 h-3" /> Đã duyệt</>}
                                </span>

                                <div className="flex gap-1">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs shadow-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => router.push(`/projects/${projectId}/requests/${req.id}`)}>Chi tiết</Button>

                                    {req.status === 'pending' && isActive && (
                                        <>
                                            <Button variant="outline" size="icon" className="h-7 w-7 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => router.push(`/projects/${projectId}/requests/${req.id}/edit`)}>
                                                <Edit className="w-3 h-3" />
                                            </Button>

                                            {canApprove && (
                                                <Button size="sm" className="h-7 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-xs shadow-sm px-2 text-white" onClick={() => handleOpenProcess(req)}>Duyệt</Button>
                                            )}

                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400" onClick={() => handleDelete(req.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={processOpen} onOpenChange={setProcessOpen}>
                <DialogContent className="max-w-[1000px] w-[95vw] dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 dark:text-slate-100"><CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Phân tích & Duyệt Đề xuất</DialogTitle></DialogHeader>
                    {analyzing ? (
                        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground dark:text-slate-400 space-y-3"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p>Đang kiểm tra tồn kho & định mức...</p></div>
                    ) : approvalItems.length > 0 ? (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-muted dark:bg-slate-800/50 p-3 rounded border border-border dark:border-slate-700 text-sm grid grid-cols-2 gap-4">
                                <div className="dark:text-slate-200"><span className="font-bold text-muted-foreground dark:text-slate-400">Mã phiếu:</span> {selectedRequest?.code}</div>
                                <div className="dark:text-slate-200"><span className="font-bold text-muted-foreground dark:text-slate-400">Người yêu cầu:</span> {selectedRequest?.requester?.name}</div>
                            </div>

                            <div className="border dark:border-slate-800 rounded-lg overflow-hidden overflow-x-auto">
                                <Table className="min-w-[800px]">
                                    <TableHeader className="bg-indigo-50 dark:bg-indigo-900/20">
                                        <TableRow className="dark:border-slate-800">
                                            <TableHead className="font-bold text-indigo-900 dark:text-indigo-300 w-[20%]">Vật tư / Tài sản</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900 dark:text-indigo-300 w-[8%]">ĐVT</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900 dark:text-indigo-300 w-[12%]">Tồn kho</TableHead>
                                            <TableHead className="text-center font-bold text-indigo-900 dark:text-indigo-300 w-[15%]">Duyệt SL</TableHead>
                                            <TableHead className="font-bold text-indigo-900 dark:text-indigo-300 w-[25%]">Chỉ định NCC</TableHead>
                                            <TableHead className="text-right font-bold text-indigo-900 dark:text-indigo-300 w-[20%]">Giải pháp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {approvalItems.map((item: any, idx: number) => (
                                            <TableRow key={idx} className="dark:border-slate-800">
                                                <TableCell className="font-medium dark:text-slate-200">
                                                    <div className="flex flex-col">
                                                        <span>{item.item_name}</span>
                                                        {item.material_code && <span className="text-[10px] text-green-600 dark:text-green-400 font-mono mt-0.5">{item.material_code}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center dark:text-slate-300">{item.unit}</TableCell>
                                                <TableCell className="text-center font-bold text-muted-foreground dark:text-slate-400">{item.stock_available}</TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number" min="0" value={item.approved_quantity}
                                                        onChange={(e) => handleApprovalQtyChange(idx, Number(e.target.value))}
                                                        className="h-8 text-center font-bold text-blue-700 dark:text-blue-400 border-blue-200 dark:border-slate-700 bg-background dark:bg-slate-950 focus:dark:border-blue-500"
                                                    />
                                                </TableCell>

                                                <TableCell className="p-1 text-center">
                                                    {item.action_purchase > 0 ? (
                                                        <select
                                                            className="w-full h-8 text-xs border border-slate-300 dark:border-slate-700 rounded px-2 bg-white dark:bg-slate-950 dark:text-slate-200 outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                                                            value={item.supplier_id || ""}
                                                            onChange={(e) => handleSupplierChange(idx, e.target.value)}
                                                        >
                                                            <option value="">-- Tạo PO trống (Mở thầu sau) --</option>
                                                            {suppliers.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">- Xuất kho -</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-1 text-[11px]">
                                                        {item.action_issue > 0 && (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                                                <Truck className="w-3 h-3 mr-1" /> Xuất kho: {item.action_issue}
                                                            </Badge>
                                                        )}
                                                        {item.action_purchase > 0 && (
                                                            <Badge variant="outline" className={`border whitespace-nowrap ${item.supplier_id ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'}`}>
                                                                {item.supplier_id ? <Store className="w-3 h-3 mr-1" /> : <FileQuestion className="w-3 h-3 mr-1" />}
                                                                {item.supplier_id ? `PO (Gán NCC): ${item.action_purchase}` : `PO (Trống NCC): ${item.action_purchase}`}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button onClick={handleApprove} disabled={processing} className="w-full bg-green-600 hover:bg-green-700 h-10 text-white dark:bg-green-600 dark:hover:bg-green-700 border-none">
                                {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang xử lý...</> : "✅ Xác nhận Duyệt & Tự động tạo PO"}
                            </Button>
                        </div>
                    ) : <div className="text-red-500 dark:text-red-400 py-4 text-center">Lỗi không tải được dữ liệu.</div>}
                </DialogContent>
            </Dialog>
        </div>
    );
}