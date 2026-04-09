"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Check, X, Clock, AlertCircle, CalendarDays, Loader2, User, FileText, Trash2, Edit, History
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/utils";

// Import API (Bạn cần bổ sung 3 hàm getProcessedRequests, updateAttendanceRequest, deleteAttendanceRequest ở Backend)
import {
    getPendingRequests,
    processAttendanceRequest,
    getProcessedRequests,
    updateAttendanceRequest,
    deleteAttendanceRequest
} from "@/lib/action/attendanceActions";

export default function ApprovalDashboardPage() {
    // State Tab 1: Đơn chờ duyệt
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [notes, setNotes] = useState<{ [key: string]: string }>({});

    // State Tab 2: Lịch sử đơn
    const [historyRequests, setHistoryRequests] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // State Dialog Sửa Đơn (HR)
    const [editOpen, setEditOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [editForm, setEditForm] = useState({ status: "", note: "" });
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadPendingData();
    }, []);

    // ==========================================
    // TAB 1: LOGIC CHỜ DUYỆT
    // ==========================================
    const loadPendingData = async () => {
        setIsLoading(true);
        const data = await getPendingRequests();
        setRequests(data);
        setIsLoading(false);
    };

    const handleNoteChange = (id: string, value: string) => {
        setNotes(prev => ({ ...prev, [id]: value }));
    };

    const handleProcess = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        const adminNote = notes[id] || "";
        const res = await processAttendanceRequest(id, status, adminNote);

        if (res.success) {
            toast.success(res.message);
            setRequests(prev => prev.filter(req => req.id !== id));
            const newNotes = { ...notes };
            delete newNotes[id];
            setNotes(newNotes);
            // Tự động làm mới lịch sử nếu đang load
            if (historyRequests.length > 0) loadHistoryData();
        } else {
            toast.error(res.error);
        }
        setProcessingId(null);
    };

    // ==========================================
    // TAB 2: LOGIC LỊCH SỬ & CHỈNH SỬA
    // ==========================================
    const loadHistoryData = async () => {
        setIsLoadingHistory(true);
        const data = await getProcessedRequests();
        setHistoryRequests(data);
        setIsLoadingHistory(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Hành động này sẽ xóa vĩnh viễn đơn từ. Bạn có chắc chắn?")) return;

        setIsLoadingHistory(true);
        const res = await deleteAttendanceRequest(id);
        if (res.success) {
            toast.success("Đã xóa đơn từ thành công.");
            setHistoryRequests(prev => prev.filter(req => req.id !== id));
        } else {
            toast.error(res.error || "Có lỗi xảy ra khi xóa.");
        }
        setIsLoadingHistory(false);
    };

    const openEditModal = (req: any) => {
        setEditingRecord(req);
        setEditForm({ status: req.status, note: req.approver_note || "" });
        setEditOpen(true);
    };

    const handleUpdateSubmit = async () => {
        if (!editingRecord) return;
        setIsUpdating(true);

        const res = await updateAttendanceRequest(editingRecord.id, editForm.status, editForm.note);
        setIsUpdating(false);

        if (res.success) {
            toast.success("Cập nhật đơn thành công.");
            setEditOpen(false);
            loadHistoryData(); // Tải lại danh sách lịch sử
            // Nếu đổi về pending, tải lại cả list chờ duyệt
            if (editForm.status === 'pending') loadPendingData();
        } else {
            toast.error(res.error || "Lỗi cập nhật.");
        }
    };

    // ==========================================
    // TIỆN ÍCH HIỂN THỊ
    // ==========================================
    const getRequestTypeInfo = (type: string, subType: string) => {
        if (type === 'leave') {
            const types: any = { annual: 'Nghỉ phép năm', unpaid: 'Nghỉ không lương', sick: 'Ốm/Thai sản', urgent: 'Nghỉ đột xuất' };
            return {
                label: `Xin nghỉ: ${types[subType] || subType}`,
                color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
                icon: CalendarDays
            };
        } else {
            const types: any = { forgot_in: 'Quên chấm VÀO', forgot_out: 'Quên chấm RA', wrong_time: 'Lỗi chấm công', field_work: 'Công tác thực địa' };
            return {
                label: `Giải trình: ${types[subType] || subType}`,
                color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30',
                icon: AlertCircle
            };
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'approved') return <Badge className="bg-emerald-500 hover:bg-emerald-600">Đã duyệt</Badge>;
        if (status === 'rejected') return <Badge className="bg-red-500 hover:bg-red-600">Từ chối</Badge>;
        return <Badge className="bg-amber-500 hover:bg-amber-600">Chờ duyệt</Badge>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-6 transition-colors">
            {/* Header Trang */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Quản Lý & Duyệt Đơn Từ</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Theo dõi, phê duyệt và điều chỉnh yêu cầu của nhân sự</p>
                </div>
            </div>

            <Tabs defaultValue="pending" className="w-full" onValueChange={(val) => {
                if (val === 'history') loadHistoryData();
                if (val === 'pending') loadPendingData();
            }}>
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                    <TabsTrigger value="pending" className="font-semibold"><Clock className="w-4 h-4 mr-2" /> Chờ xử lý</TabsTrigger>
                    <TabsTrigger value="history" className="font-semibold"><History className="w-4 h-4 mr-2" /> Lịch sử duyệt</TabsTrigger>
                </TabsList>

                {/* ======================================= */}
                {/* TAB 1: ĐANG CHỜ DUYỆT (GIỮ NGUYÊN UI CŨ) */}
                {/* ======================================= */}
                <TabsContent value="pending" className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" onClick={loadPendingData} disabled={isLoading} className="dark:bg-slate-900 shadow-sm h-9">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />} Làm mới
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                    ) : requests.length === 0 ? (
                        <div className="p-12 md:p-16 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl border-dashed shadow-sm">
                            <FileText className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Tất cả đã hoàn thành!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Hiện tại không có đơn từ nào đang chờ sếp duyệt.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {requests.map((req) => {
                                const typeInfo = getRequestTypeInfo(req.request_type, req.sub_type);
                                const Icon = typeInfo.icon;
                                const empName = req.employee?.name || 'Nhân viên vô danh';
                                const empCode = req.employee?.code || '???';

                                return (
                                    <Card key={req.id} className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col hover:shadow-md transition-all duration-300">
                                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/30">
                                            <div className="flex justify-between items-start mb-3">
                                                <Badge variant="outline" className={`${typeInfo.color} font-bold px-2 py-0.5 shadow-sm`}>
                                                    <Icon className="w-3.5 h-3.5 mr-1.5" /> {typeInfo.label}
                                                </Badge>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
                                                    {formatDate(req.created_at)}
                                                </span>
                                            </div>
                                            <div className="font-black text-lg text-slate-800 dark:text-slate-100 flex items-center">
                                                <User className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> {empName}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Mã NV: {empCode}</div>
                                        </CardHeader>

                                        <CardContent className="text-sm flex-1 pt-4 space-y-4">
                                            <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thời gian áp dụng</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-base">
                                                    {formatDate(req.start_date)}
                                                    {req.end_date && req.end_date !== req.start_date && (
                                                        <><span className="text-slate-400 mx-1.5 font-normal">đến</span>{formatDate(req.end_date)}</>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Logic Đối chiếu giờ giữ nguyên như cũ */}
                                            {req.request_type === 'explanation' && req.sub_type !== 'field_work' && (req.machine_in_time || req.machine_out_time || req.actual_in_time || req.actual_out_time) && (
                                                <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Đối chiếu giờ giấc</span>
                                                    {/* Ca sáng */}
                                                    {(req.machine_in_time || req.actual_in_time) && (
                                                        <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-slate-500 text-[11px] uppercase">Giờ máy ghi nhận</span>
                                                                <span className="font-mono text-sm text-red-500 line-through decoration-red-300">
                                                                    {req.machine_in_time ? new Date(req.machine_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-emerald-600 font-medium text-[11px] uppercase">Xin sửa thành</span>
                                                                <span className="font-mono text-sm font-bold text-emerald-600">
                                                                    {req.actual_in_time ? req.actual_in_time.substring(0, 5) : '--:--'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Ca chiều */}
                                                    {(req.machine_out_time || req.actual_out_time) && (
                                                        <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 mt-1">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-slate-500 text-[11px] uppercase">Giờ máy ghi nhận</span>
                                                                <span className="font-mono text-sm text-red-500 line-through decoration-red-300">
                                                                    {req.machine_out_time ? new Date(req.machine_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-emerald-600 font-medium text-[11px] uppercase">Xin sửa thành</span>
                                                                <span className="font-mono text-sm font-bold text-emerald-600">
                                                                    {req.actual_out_time ? req.actual_out_time.substring(0, 5) : '--:--'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Lý do chi tiết</span>
                                                <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg leading-relaxed shadow-inner">
                                                    "{req.reason}"
                                                </p>
                                            </div>

                                            <div className="pt-2">
                                                <Textarea
                                                    placeholder="Ghi chú của Quản lý (Không bắt buộc)..."
                                                    className="text-xs min-h-[60px] resize-none dark:bg-slate-950 dark:border-slate-700"
                                                    value={notes[req.id] || ""}
                                                    onChange={(e) => handleNoteChange(req.id, e.target.value)}
                                                />
                                            </div>
                                        </CardContent>

                                        <CardFooter className="pt-0 flex gap-3 pb-5 px-6 border-t dark:border-slate-800 pt-5 mt-auto">
                                            <Button
                                                variant="outline"
                                                className="w-1/2 border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100 font-bold shadow-sm"
                                                onClick={() => handleProcess(req.id, 'rejected')}
                                                disabled={processingId !== null}
                                            >
                                                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />} Từ chối
                                            </Button>
                                            <Button
                                                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                                                onClick={() => handleProcess(req.id, 'approved')}
                                                disabled={processingId !== null}
                                            >
                                                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />} Duyệt ngay
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ======================================= */}
                {/* TAB 2: LỊCH SỬ DUYỆT ĐƠN (CÓ THỂ SỬA XÓA) */}
                {/* ======================================= */}
                <TabsContent value="history" className="space-y-4">
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableRow>
                                        <TableHead className="w-[100px] font-bold">Mã NV</TableHead>
                                        <TableHead className="min-w-[160px] font-bold">Họ tên</TableHead>
                                        <TableHead className="min-w-[150px] font-bold">Loại đơn</TableHead>
                                        <TableHead className="min-w-[120px] font-bold">Ngày áp dụng</TableHead>
                                        <TableHead className="min-w-[120px] font-bold">Ngày duyệt</TableHead>

                                        {/* CỘT MỚI: NGƯỜI DUYỆT */}
                                        <TableHead className="min-w-[140px] font-bold">Người duyệt</TableHead>

                                        <TableHead className="font-bold text-center">Trạng thái</TableHead>
                                        <TableHead className="text-right font-bold w-[120px]">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingHistory ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                                            </TableCell>
                                        </TableRow>
                                    ) : historyRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                                                Chưa có dữ liệu lịch sử.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        historyRequests.map((req) => {
                                            const typeInfo = getRequestTypeInfo(req.request_type, req.sub_type);
                                            return (
                                                <TableRow key={req.id}>
                                                    <TableCell className="font-mono text-xs text-slate-500">{req.employee?.code}</TableCell>
                                                    <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{req.employee?.name}</TableCell>
                                                    <TableCell>
                                                        <span className="text-sm font-medium">{typeInfo.label.split(':')[1]}</span>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{formatDate(req.start_date)}</TableCell>
                                                    <TableCell className="text-sm text-slate-500">{formatDate(req.updated_at)}</TableCell>

                                                    {/* HIỂN THỊ DỮ LIỆU NGƯỜI DUYỆT */}
                                                    <TableCell>
                                                        {req.approver?.name ? (
                                                            <div className="flex items-center text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit">
                                                                <User className="w-3.5 h-3.5 mr-1" />
                                                                {req.approver.name}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-slate-400 italic">Hệ thống</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {getStatusBadge(req.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => openEditModal(req)}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200" onClick={() => handleDelete(req.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DIALOG CHỈNH SỬA ĐƠN ĐÃ DUYỆT */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[425px] dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-blue-600 dark:text-blue-400">
                            <Edit className="w-5 h-5 mr-2" /> Điều chỉnh đơn từ (HR)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Trạng thái đơn</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v }))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="approved">Chấp nhận (Đã duyệt)</SelectItem>
                                    <SelectItem value="rejected">Từ chối (Hủy đơn)</SelectItem>
                                    <SelectItem value="pending">Trả về chờ duyệt (Hoàn tác)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ghi chú của Quản lý / HR</Label>
                            <Textarea
                                placeholder="Ghi rõ lý do điều chỉnh..."
                                value={editForm.note}
                                onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                                className="h-24 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleUpdateSubmit} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}