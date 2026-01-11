"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils/utils";

// Icons
import {
    Plus, Send, Clock, XCircle, Package, ShoppingCart,
    Pencil, Trash2, Check, X, CalendarIcon, MapPin
} from "lucide-react";
import { toast } from "sonner";

// Server Actions
import {
    getAvailableMaterials,
    createMaterialRequest,
    updateMaterialRequest,
    deleteMaterialRequest,
    updateRequestStatus
} from "@/lib/action/requestActions";

interface Props {
    projectId: string;
    requests: any[];
    isManager?: boolean; // Phân quyền hiển thị nút duyệt
}

export default function MaterialRequestManager({ projectId, requests, isManager = true }: Props) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- FORM STATE ---
    const [editingId, setEditingId] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
    const [requestItems, setRequestItems] = useState<any[]>([]); // Danh sách vật tư đang chọn

    // --- DATA LISTS ---
    const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

    // --- EFFECTS ---
    useEffect(() => {
        if (isOpen) {
            loadData();
        } else {
            // Reset form khi đóng
            setEditingId(null);
            setNote("");
            setRequestItems([]);
            setDeliveryDate(undefined);
        }
    }, [isOpen]);

    const loadData = async () => {
        // Lấy ngân sách (BOQ/QTO) để hiển thị gợi ý
        const mats = await getAvailableMaterials(projectId);
        setAvailableMaterials(mats);
    };

    // --- HANDLERS ---

    // 1. Thêm vật tư vào bảng
    const handleAddMaterial = (mat: any) => {
        const exists = requestItems.find(i => (i.material_name === mat.material_name) || (i.item_name === mat.material_name));
        if (exists) return toast.warning("Vật tư này đã chọn rồi");

        setRequestItems([...requestItems, {
            material_name: mat.material_name,
            unit: mat.unit,
            quantity: 0,
            note: ""
        }]);
    };

    // 2. Xóa dòng vật tư
    const handleRemoveItem = (index: number) => {
        const newItems = [...requestItems];
        newItems.splice(index, 1);
        setRequestItems(newItems);
    };

    // 3. Sửa số lượng
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...requestItems];
        newItems[index].quantity = value;
        setRequestItems(newItems);
    };

    // 4. Mở form Edit (Load dữ liệu cũ)
    const handleEdit = (req: any) => {
        if (req.status !== 'pending') return toast.error("Chỉ có thể sửa phiếu đang chờ duyệt.");

        setEditingId(req.id);
        setNote(req.notes || "");

        // Map field từ DB (deadline_date)
        setDeliveryDate(req.deadline_date ? new Date(req.deadline_date) : undefined);

        const itemsForForm = req.items.map((i: any) => ({
            material_name: i.item_name,
            unit: i.unit,
            quantity: i.quantity,
            note: i.notes
        }));
        setRequestItems(itemsForForm);
        setIsOpen(true);
    };

    // 5. Xóa phiếu
    const handleDelete = async (reqId: string, status: string) => {
        if (status !== 'pending') return toast.error("Chỉ xóa được phiếu chờ duyệt.");
        if (!confirm("Bạn có chắc chắn muốn xóa phiếu này?")) return;

        const res = await deleteMaterialRequest(reqId, projectId);
        if (res.success) {
            toast.success("Đã xóa phiếu.");
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    // 6. SUBMIT FORM
    const handleSubmit = async () => {
        if (requestItems.length === 0) return toast.error("Chưa chọn vật tư nào");
        if (!deliveryDate) return toast.error("Vui lòng chọn Ngày cần hàng");

        setLoading(true);
        let res;

        // Lưu ý: Không cần gửi warehouseId, Server sẽ tự lấy kho của Project
        if (editingId) {
            res = await updateMaterialRequest(editingId, projectId, note, requestItems, deliveryDate);
        } else {
            res = await createMaterialRequest(projectId, note, requestItems, deliveryDate);
        }

        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setIsOpen(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    // 7. DUYỆT / TỪ CHỐI
    const handleApproval = async (reqId: string, status: 'approved' | 'rejected') => {
        const actionText = status === 'approved' ? 'DUYỆT' : 'TỪ CHỐI';
        if (!confirm(`Bạn có chắc chắn muốn ${actionText} phiếu yêu cầu này?`)) return;

        const res = await updateRequestStatus(reqId, projectId, status);

        if (res.success) {
            toast.success(res.message);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    // Helper: Badge trạng thái
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'approved': 'bg-green-100 text-green-700 border-green-200',
            'rejected': 'bg-red-100 text-red-700 border-red-200',
            'ordered': 'bg-purple-100 text-purple-700 border-purple-200'
        };
        const labels: Record<string, string> = {
            'pending': 'Chờ duyệt',
            'approved': 'Đã duyệt',
            'rejected': 'Từ chối',
            'ordered': 'Đã đặt hàng'
        };
        return <Badge className={`border font-normal ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</Badge>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600" /> Quản lý Yêu cầu Vật tư
                    </h3>
                    <p className="text-sm text-slate-500">Đề xuất cấp vật tư từ kho hoặc mua mới.</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => setEditingId(null)}>
                            <Plus className="w-4 h-4 mr-2" /> Tạo Yêu cầu
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-4 border-b bg-white">
                            <DialogTitle>{editingId ? "Chỉnh sửa Phiếu Yêu Cầu" : "Tạo Phiếu Yêu Cầu Mới"}</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-1 overflow-hidden">
                            {/* CỘT TRÁI: NGÂN SÁCH (BUDGET) */}
                            <div className="w-1/3 border-r bg-slate-50 flex flex-col">
                                <div className="p-3 bg-white border-b text-sm font-semibold text-slate-700 flex justify-between items-center">
                                    <span>Nguồn Ngân sách</span>
                                    <Badge variant="outline" className="text-[10px] font-normal">BOQ / QTO</Badge>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {availableMaterials.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 text-xs">
                                            Chưa có dữ liệu ngân sách.<br />Vui lòng hoàn thành QTO trước.
                                        </div>
                                    ) : availableMaterials.map((mat, i) => (
                                        <div key={i} onClick={() => handleAddMaterial(mat)}
                                            className="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium text-sm text-slate-700 group-hover:text-blue-700">{mat.material_name}</div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Dư: <b>{Number(mat.budget_quantity).toLocaleString()}</b> {mat.unit}
                                                    </div>
                                                </div>
                                                <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CỘT PHẢI: FORM NHẬP LIỆU */}
                            <div className="w-2/3 flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                                    {/* Form Gọn gàng: Chỉ chọn Ngày cần hàng */}
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Ngày cần hàng (Deadline) <span className="text-red-500">*</span></label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-white border-slate-300", !deliveryDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                                        {deliveryDate ? format(deliveryDate, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày...</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <p className="text-[11px] text-slate-500 mt-1">Kho nhận hàng sẽ được hệ thống tự động gán theo Dự án.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Ghi chú phiếu</label>
                                        <Textarea
                                            placeholder="Ghi chú thêm về yêu cầu này (VD: Cần gấp cho hạng mục móng)..."
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            className="min-h-[60px]"
                                        />
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Danh sách vật tư</div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                                    <TableHead>Vật tư</TableHead>
                                                    <TableHead className="w-[80px]">ĐVT</TableHead>
                                                    <TableHead className="w-[120px]">SL Yêu cầu</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {requestItems.length === 0 ? (
                                                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Vui lòng chọn vật tư từ danh sách bên trái.</TableCell></TableRow>
                                                ) : requestItems.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{item.material_name || item.item_name}</TableCell>
                                                        <TableCell className="text-slate-500">{item.unit}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={e => handleItemChange(idx, e.target.value)}
                                                                className="h-8 w-24 text-right font-bold focus:ring-blue-500"
                                                                autoFocus={item.quantity === 0}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500 hover:bg-red-50">
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy bỏ</Button>
                                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
                                        {loading ? "Đang xử lý..." : <>{editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />} {editingId ? "Cập nhật" : "Gửi Yêu Cầu"}</>}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* DANH SÁCH PHIẾU */}
            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                        <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-slate-900 font-medium">Chưa có phiếu yêu cầu nào</h3>
                        <p className="text-slate-500 text-sm mt-1">Hãy tạo phiếu mới để bắt đầu quy trình mua sắm.</p>
                    </div>
                ) : requests.map(req => (
                    <Card key={req.id} className="overflow-hidden hover:shadow-md transition-shadow border-slate-200">
                        <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono font-bold text-blue-700 bg-white border border-blue-100 px-2 py-1 rounded text-xs shadow-sm">
                                    {req.code}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Tạo: {new Date(req.created_at).toLocaleDateString('vi-VN')}
                                </span>

                                {req.deadline_date && (
                                    <span className="text-xs text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                                        <CalendarIcon className="w-3 h-3" /> Deadline: {new Date(req.deadline_date).toLocaleDateString('vi-VN')}
                                    </span>
                                )}

                                {getStatusBadge(req.status)}
                            </div>

                            {/* Nút thao tác */}
                            <div className="flex items-center gap-1">
                                {req.status === 'pending' && isManager && (
                                    <>
                                        <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleApproval(req.id, 'approved')}>
                                            <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleApproval(req.id, 'rejected')}>
                                            <X className="w-3.5 h-3.5 mr-1" /> Từ chối
                                        </Button>
                                        <div className="w-px h-5 bg-slate-300 mx-2"></div>
                                    </>
                                )}

                                {req.status === 'pending' && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => handleEdit(req)} title="Chỉnh sửa">
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDelete(req.id, req.status)} title="Xóa phiếu">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Body Card */}
                        <div className="p-0">
                            {req.notes && (
                                <div className="px-4 py-2 text-sm text-slate-600 bg-white border-b border-slate-50 italic">
                                    "{req.notes}"
                                </div>
                            )}

                            <Table>
                                <TableHeader>
                                    <TableRow className="h-8 hover:bg-transparent border-b-slate-100 bg-slate-50/50">
                                        <TableHead className="h-8 text-xs font-semibold pl-4">Tên Vật tư / Thiết bị</TableHead>
                                        <TableHead className="h-8 text-xs font-semibold text-right pr-6">Số lượng</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {req.items?.map((item: any) => (
                                        <TableRow key={item.id} className="h-10 hover:bg-slate-50 border-b-slate-50">
                                            <TableCell className="text-sm font-medium text-slate-700 pl-4">
                                                {item.item_name} <span className="text-xs text-slate-400 font-normal ml-1">({item.unit})</span>
                                            </TableCell>
                                            <TableCell className="text-sm text-right font-bold pr-6 text-slate-800">
                                                {Number(item.quantity).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}