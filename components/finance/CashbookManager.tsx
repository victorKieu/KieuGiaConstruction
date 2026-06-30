"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, FileSignature, CheckCircle, Wallet, Ban, ArrowRightLeft, Building2, User, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { format } from "date-fns";
import { toast } from "sonner";

// Import các API thao tác Database
import {
    createPaymentRequestAction,
    processPaymentRequestAction,
    executePaymentRequestAction
} from "@/lib/action/finance";

interface Props {
    initialRequests: any[];
    projects: any[];
    accounts: any[];
}

export default function CashbookManager({ initialRequests, projects, accounts }: Props) {
    const router = useRouter();
    const [requests, setRequests] = useState(initialRequests || []);
    const [activeTab, setActiveTab] = useState("my_requests");

    // States cho Modal Lập Đề nghị
    const [openNewRequest, setOpenNewRequest] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReq, setNewReq] = useState({ type: 'payment', amount: '', description: '', partner_name: '', project_id: 'none' });

    // States cho Modal Giải ngân
    const [openExecute, setOpenExecute] = useState(false);
    const [selectedReq, setSelectedReq] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionData, setExecutionData] = useState({ debitAcc: '', creditAcc: '' });

    // Tự động cập nhật data khi props thay đổi
    useEffect(() => {
        setRequests(initialRequests || []);
    }, [initialRequests]);

    // -------------------------------------------------------------
    // HÀM 1: LẬP ĐỀ NGHỊ THU / CHI
    // -------------------------------------------------------------
    const handleCreateRequest = async () => {
        if (!newReq.amount || Number(newReq.amount) <= 0) return toast.warning("Vui lòng nhập số tiền hợp lệ!");
        if (!newReq.description) return toast.warning("Vui lòng nhập diễn giải!");

        setIsSubmitting(true);
        const payload = {
            ...newReq,
            project_id: newReq.project_id === 'none' ? null : newReq.project_id
        };

        const res = await createPaymentRequestAction(payload);
        if (res.success) {
            toast.success(res.message);
            setOpenNewRequest(false);
            setNewReq({ type: 'payment', amount: '', description: '', partner_name: '', project_id: 'none' });
            router.refresh(); // Tải lại dữ liệu trang
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsSubmitting(false);
    };

    // -------------------------------------------------------------
    // HÀM 2: PHÊ DUYỆT HOẶC TỪ CHỐI (SẾP)
    // -------------------------------------------------------------
    const handleProcessRequest = async (id: string, status: 'approved' | 'rejected') => {
        const actionName = status === 'approved' ? 'Phê duyệt' : 'Từ chối';
        if (!confirm(`Bạn có chắc chắn muốn ${actionName} đề nghị này?`)) return;

        const toastId = toast.loading(`Đang xử lý ${actionName}...`);
        const res = await processPaymentRequestAction(id, status);

        if (res.success) {
            toast.success(res.message, { id: toastId });
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error, { id: toastId });
        }
    };

    // -------------------------------------------------------------
    // HÀM 3: MỞ MODAL THỰC THI & TỰ ĐỘNG GỢI Ý BÚT TOÁN
    // -------------------------------------------------------------
    const openExecutionModal = (req: any) => {
        setSelectedReq(req);

        // Gợi ý tài khoản: 
        // - Nếu là Yêu cầu Chi (payment/advance): Có 111 (Giảm tiền), Nợ 331/141/642
        // - Nếu là Yêu cầu Thu (receipt): Nợ 111 (Tăng tiền), Có 131/511
        let suggestDebit = "";
        let suggestCredit = "";

        if (req.request_type === 'payment') {
            suggestCredit = accounts.find(a => a.code === '111')?.id || ""; // Có 111 (Tiền mặt)
            suggestDebit = accounts.find(a => a.code === '331')?.id || "";  // Nợ 331 (Phải trả)
        } else if (req.request_type === 'receipt') {
            suggestDebit = accounts.find(a => a.code === '111')?.id || "";  // Nợ 111 (Tiền mặt)
            suggestCredit = accounts.find(a => a.code === '131')?.id || ""; // Có 131 (Phải thu)
        }

        setExecutionData({ debitAcc: suggestDebit, creditAcc: suggestCredit });
        setOpenExecute(true);
    };

    // -------------------------------------------------------------
    // HÀM 4: GIẢI NGÂN VÀ GHI SỔ CÁI (THỦ QUỸ)
    // -------------------------------------------------------------
    const handleExecuteRequest = async () => {
        if (!executionData.debitAcc || !executionData.creditAcc) {
            return toast.warning("Vui lòng chọn đầy đủ Tài khoản Ghi Nợ và Ghi Có!");
        }

        setIsExecuting(true);
        const res = await executePaymentRequestAction(selectedReq.id, executionData.debitAcc, executionData.creditAcc);

        if (res.success) {
            toast.success(res.message);
            setOpenExecute(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsExecuting(false);
    };

    // -------------------------------------------------------------
    // UTILS
    // -------------------------------------------------------------
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_approval': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none">Chờ duyệt</Badge>;
            case 'approved': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Chờ giải ngân</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">Đã hoàn tất</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none">Đã từ chối</Badge>;
            default: return <Badge variant="outline">Nháp</Badge>;
        }
    };

    const getTypeLabel = (type: string) => {
        if (type === 'payment') return <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">CHI TIỀN</span>;
        if (type === 'receipt') return <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">THU TIỀN</span>;
        return <span className="text-blue-600 font-bold flex items-center gap-1">TẠM ỨNG</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Trung Tâm Phê Duyệt Thu/Chi
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Quy trình: Lập đề nghị &rarr; Kế toán trưởng duyệt &rarr; Giải ngân & Ghi sổ cái</p>
                </div>
                <Button onClick={() => setOpenNewRequest(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="w-4 h-4 mr-2" /> Lập Đề nghị Thu/Chi
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 h-auto w-full md:w-auto overflow-x-auto justify-start">
                    <TabsTrigger value="my_requests" className="py-2.5 px-4 font-semibold data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
                        <FileText className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" /> Đề nghị Thu/Chi
                    </TabsTrigger>

                    <TabsTrigger value="approvals" className="py-2.5 px-4 font-semibold data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/20 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-500">
                        <FileSignature className="w-4 h-4 mr-2 text-amber-500" /> Chờ Phê Duyệt
                    </TabsTrigger>

                    <TabsTrigger value="execution" className="py-2.5 px-4 font-semibold data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">
                        <Wallet className="w-4 h-4 mr-2 text-blue-500" /> Chờ Giải ngân (Ghi sổ)
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: DANH SÁCH ĐỀ NGHỊ */}
                <TabsContent value="my_requests" className="mt-4">
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-950/50">
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mã Phiếu</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Loại</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 min-w-[250px]">Nội dung đề nghị</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Số tiền (VNĐ)</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Đối tác / Dự án</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length === 0 ? (
                                    <TableRow className="dark:border-slate-800"><TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">Chưa có đề nghị thu chi nào.</TableCell></TableRow>
                                ) : requests.map(req => (
                                    <TableRow key={req.id} className="dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <TableCell className="font-bold text-slate-700 dark:text-slate-200">{req.request_code}</TableCell>
                                        <TableCell>{getTypeLabel(req.request_type)}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {req.description}
                                            <div className="text-xs text-slate-400 mt-1">Lập bởi: {req.requester?.name} - {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(req.amount)}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                                            <div className="flex items-center gap-1 mb-1"><User className="w-3 h-3" /> {req.partner_name || "N/A"}</div>
                                            {req.project && <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"><Building2 className="w-3 h-3" /> {req.project.name}</div>}
                                        </TableCell>
                                        <TableCell className="text-center">{getStatusBadge(req.status)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 2: CHỜ DUYỆT (SẾP / KẾ TOÁN TRƯỞNG) */}
                <TabsContent value="approvals" className="mt-4">
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden border-t-4 border-t-amber-500">
                        <Table>
                            <TableHeader className="bg-amber-50/50 dark:bg-amber-900/10">
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="font-bold text-amber-900 dark:text-amber-500">Mã Phiếu</TableHead>
                                    <TableHead className="font-bold text-amber-900 dark:text-amber-500">Loại</TableHead>
                                    <TableHead className="font-bold text-amber-900 dark:text-amber-500 min-w-[250px]">Nội dung đề nghị</TableHead>
                                    <TableHead className="text-right font-bold text-amber-900 dark:text-amber-500">Số tiền (VNĐ)</TableHead>
                                    <TableHead className="text-right font-bold text-amber-900 dark:text-amber-500">Quyết định</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.filter(r => r.status === 'pending_approval').length === 0 ? (
                                    <TableRow className="dark:border-slate-800 bg-amber-50/20 dark:bg-amber-900/5"><TableCell colSpan={5} className="text-center py-8 text-amber-600 dark:text-amber-500">Không có phiếu nào chờ duyệt.</TableCell></TableRow>
                                ) : requests.filter(r => r.status === 'pending_approval').map(req => (
                                    <TableRow key={req.id} className="dark:border-slate-800 bg-amber-50/20 dark:bg-amber-900/5">
                                        <TableCell className="font-bold text-amber-700 dark:text-amber-400">{req.request_code}</TableCell>
                                        <TableCell>{getTypeLabel(req.request_type)}</TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300">
                                            {req.description}
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lập bởi: {req.requester?.name} - {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-lg text-slate-800 dark:text-slate-100">{formatCurrency(req.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleProcessRequest(req.id, 'rejected')} className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"><Ban className="w-4 h-4 mr-1" /> Từ chối</Button>
                                                <Button size="sm" onClick={() => handleProcessRequest(req.id, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500"><CheckCircle className="w-4 h-4 mr-1" /> Phê duyệt</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 3: THỰC THI & GHI SỔ CÁI (THỦ QUỸ) */}
                <TabsContent value="execution" className="mt-4">
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden border-t-4 border-t-blue-500">
                        <Table>
                            <TableHeader className="bg-blue-50/50 dark:bg-blue-900/10">
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="font-bold text-blue-900 dark:text-blue-400">Mã Phiếu</TableHead>
                                    <TableHead className="font-bold text-blue-900 dark:text-blue-400">Loại</TableHead>
                                    <TableHead className="font-bold text-blue-900 dark:text-blue-400 min-w-[250px]">Nội dung</TableHead>
                                    <TableHead className="text-right font-bold text-blue-900 dark:text-blue-400">Số tiền (VNĐ)</TableHead>
                                    <TableHead className="text-right font-bold text-blue-900 dark:text-blue-400">Thao tác Kế toán</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.filter(r => r.status === 'approved').length === 0 ? (
                                    <TableRow className="dark:border-slate-800 bg-blue-50/20 dark:bg-blue-900/5"><TableCell colSpan={5} className="text-center py-8 text-blue-600 dark:text-blue-400">Không có phiếu nào chờ giải ngân.</TableCell></TableRow>
                                ) : requests.filter(r => r.status === 'approved').map(req => (
                                    <TableRow key={req.id} className="dark:border-slate-800 bg-blue-50/20 dark:bg-blue-900/5 hover:bg-blue-50/40 dark:hover:bg-blue-900/10">
                                        <TableCell className="font-bold text-blue-700 dark:text-blue-400">{req.request_code}</TableCell>
                                        <TableCell>{getTypeLabel(req.request_type)}</TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300">
                                            {req.description}
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt: {format(new Date(req.approved_at), 'dd/MM/yyyy HH:mm')}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-lg text-slate-800 dark:text-slate-100">{formatCurrency(req.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button onClick={() => openExecutionModal(req)} className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm">
                                                <Wallet className="w-4 h-4 mr-2" /> Giải ngân & Vào Sổ
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAL 1: LẬP ĐỀ NGHỊ MỚI */}
            <Dialog open={openNewRequest} onOpenChange={setOpenNewRequest}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 dark:text-slate-100"><FileText className="w-5 h-5 text-indigo-500" /> Lập Đề Nghị Mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Loại đề nghị</Label>
                                <Select value={newReq.type} onValueChange={(v) => setNewReq({ ...newReq, type: v })}>
                                    <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                        <SelectItem value="payment" className="text-red-600 dark:text-red-400 font-bold">CHI TIỀN</SelectItem>
                                        <SelectItem value="receipt" className="text-green-600 dark:text-green-400 font-bold">THU TIỀN</SelectItem>
                                        <SelectItem value="advance" className="text-blue-600 dark:text-blue-400 font-bold">TẠM ỨNG</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Số tiền (VNĐ) <span className="text-red-500">*</span></Label>
                                <Input type="number" placeholder="0" value={newReq.amount} onChange={e => setNewReq({ ...newReq, amount: e.target.value })} className="text-right font-bold text-lg dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Lý do / Nội dung chi tiết <span className="text-red-500">*</span></Label>
                            <Input placeholder="Nhập lý do thu chi..." value={newReq.description} onChange={e => setNewReq({ ...newReq, description: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Đối tác / Thụ hưởng (Nếu có)</Label>
                            <Input placeholder="Tên người nhận tiền..." value={newReq.partner_name} onChange={e => setNewReq({ ...newReq, partner_name: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 flex items-center gap-1"><Building2 className="w-3 h-3" /> Dự án liên quan</Label>
                            <Select value={newReq.project_id} onValueChange={(v) => setNewReq({ ...newReq, project_id: v })}>
                                <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"><SelectValue placeholder="-- Không gắn dự án --" /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="none" className="italic dark:text-slate-400">-- Chi phí chung / Không gắn dự án --</SelectItem>
                                    {projects?.map((p: any) => <SelectItem key={p.id} value={p.id} className="dark:text-slate-200">[{p.code}] {p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setOpenNewRequest(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                        <Button onClick={handleCreateRequest} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px] dark:bg-indigo-600 dark:hover:bg-indigo-500">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Gửi Trình Duyệt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: THỰC THI (GIẢI NGÂN & BÚT TOÁN) */}
            <Dialog open={openExecute} onOpenChange={setOpenExecute}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Wallet className="w-5 h-5" /> Giải ngân & Hạch toán Kế toán
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">Phiếu: <strong className="text-slate-700 dark:text-slate-200">{selectedReq?.request_code}</strong> - Số tiền: <strong className="text-red-500 dark:text-red-400 text-base">{selectedReq ? formatCurrency(selectedReq.amount) : 0}</strong></DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-md text-sm text-blue-800 dark:text-blue-300">
                            Xác nhận nguồn tiền và định khoản để Hệ thống tự động ghi vào Sổ Nhật ký chung (Sổ cái).
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">Tài khoản Ghi Nợ</Label>
                                <Select value={executionData.debitAcc} onValueChange={(v) => setExecutionData({ ...executionData, debitAcc: v })}>
                                    <SelectTrigger className="border-blue-500/30 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-medium">
                                        <SelectValue placeholder="Chọn TK Nợ..." />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-[200px]">
                                        {(accounts || []).map(a => <SelectItem key={a.id} value={a.id} className="dark:text-slate-200">{a.code} - {a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">Tài khoản Ghi Có</Label>
                                <Select value={executionData.creditAcc} onValueChange={(v) => setExecutionData({ ...executionData, creditAcc: v })}>
                                    <SelectTrigger className="border-amber-500/30 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-medium">
                                        <SelectValue placeholder="Chọn TK Có..." />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-[200px]">
                                        {(accounts || []).map(a => <SelectItem key={a.id} value={a.id} className="dark:text-slate-200">{a.code} - {a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="col-span-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-center mb-1">Mô phỏng Bút toán Nợ/Có</div>
                            <div className="text-right pr-4 font-semibold text-slate-600 dark:text-slate-400">NỢ (Debit):</div>
                            <div className="font-bold text-blue-700 dark:text-blue-400">{selectedReq ? formatCurrency(selectedReq.amount) : 0}</div>
                            <div className="text-right pr-4 font-semibold text-slate-600 dark:text-slate-400">CÓ (Credit):</div>
                            <div className="font-bold text-amber-700 dark:text-amber-500">{selectedReq ? formatCurrency(selectedReq.amount) : 0}</div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenExecute(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                        <Button onClick={handleExecuteRequest} disabled={isExecuting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px] dark:bg-blue-600 dark:hover:bg-blue-500">
                            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />} Thực thi & Ghi Sổ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}