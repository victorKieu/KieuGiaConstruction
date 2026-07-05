"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Plus, FileSignature, CheckCircle, Wallet, Ban, ArrowRightLeft, Building2, User, FileText, Pencil, Save, Filter, CalendarDays, X, AlertCircle, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import VoucherActions from "./VoucherActions";
import { createPaymentRequestAction, processPaymentRequestAction, executePaymentRequestAction, updatePaymentRequestAction, getExecutedAccountsAction, updateExecutedAccountingAction } from "@/lib/action/finance";

interface Props {
    initialRequests: any[];
    projects: any[];
    accounts: any[];
    companySettings?: any;
    userProfile?: any;
}

const formatInputMoney = (val: number | string) => {
    if (!val) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(val));
};

export default function CashbookManager({ initialRequests, projects, accounts, companySettings, userProfile }: Props) {
    const router = useRouter();
    const [requests, setRequests] = useState(initialRequests || []);
    const [activeTab, setActiveTab] = useState("my_requests");

    const [filterProject, setFilterProject] = useState("all");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

    const isAdmin = userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'DIRECTOR';

    const getTodayLocal = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    }

    const [openNewRequest, setOpenNewRequest] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReq, setNewReq] = useState({
        type: 'payment', amount: '', description: '', partner_name: '', project_id: 'none', created_at: getTodayLocal()
    });

    const [openEditRequest, setOpenEditRequest] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editReqData, setEditReqData] = useState({
        id: '', type: 'payment', amount: '', description: '', partner_name: '', project_id: 'none', created_at: ''
    });

    const [openExecute, setOpenExecute] = useState(false);
    const [selectedReq, setSelectedReq] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionData, setExecutionData] = useState({ debitAcc: '', creditAcc: '', amount: 0 });

    // STATES CHO CHỨC NĂNG SỬA ĐỊNH KHOẢN SỔ CÁI
    const [openEditAccounting, setOpenEditAccounting] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isSavingAccounting, setIsSavingAccounting] = useState(false);
    const [selectedReqForAcc, setSelectedReqForAcc] = useState<any>(null);
    const [accountingForm, setAccountingForm] = useState({ debitAcc: '', creditAcc: '' });

    useEffect(() => {
        setRequests(initialRequests || []);
    }, [initialRequests]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (filterProject !== "all") {
                if (filterProject === "none" && req.project_id !== null) return false;
                if (filterProject !== "none" && req.project_id !== filterProject) return false;
            }
            if (filterStartDate) {
                if (new Date(req.created_at) < new Date(filterStartDate)) return false;
            }
            if (filterEndDate) {
                if (new Date(req.created_at) > new Date(filterEndDate + 'T23:59:59')) return false;
            }
            return true;
        });
    }, [requests, filterProject, filterStartDate, filterEndDate]);

    const clearFilters = () => {
        setFilterProject("all");
        setFilterStartDate("");
        setFilterEndDate("");
    };

    const handleCreateRequest = async () => {
        if (!newReq.amount || Number(newReq.amount) <= 0) return toast.warning("Vui lòng nhập số tiền hợp lệ!");
        if (!newReq.description) return toast.warning("Vui lòng nhập diễn giải!");

        setIsSubmitting(true);
        const payload = {
            ...newReq,
            project_id: newReq.project_id === 'none' ? null : newReq.project_id,
            created_at: newReq.created_at ? new Date(newReq.created_at).toISOString() : new Date().toISOString()
        };

        const res = await createPaymentRequestAction(payload);
        if (res.success) {
            toast.success(res.message);
            setOpenNewRequest(false);
            setNewReq({ type: 'payment', amount: '', description: '', partner_name: '', project_id: 'none', created_at: getTodayLocal() });
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsSubmitting(false);
    };

    const handleEditClick = (req: any) => {
        setEditReqData({
            id: req.id,
            type: req.request_type || 'payment',
            amount: req.amount || '',
            description: req.description || '',
            partner_name: req.partner_name || '',
            project_id: req.project_id || 'none',
            created_at: req.created_at ? req.created_at.split('T')[0] : getTodayLocal()
        });
        setOpenEditRequest(true);
    };

    const handleUpdateRequest = async () => {
        if (!editReqData.amount || Number(editReqData.amount) <= 0) return toast.warning("Vui lòng nhập số tiền hợp lệ!");
        if (!editReqData.description) return toast.warning("Vui lòng nhập diễn giải!");

        setIsUpdating(true);
        const payload = {
            request_type: editReqData.type,
            amount: Number(editReqData.amount),
            description: editReqData.description,
            partner_name: editReqData.partner_name,
            project_id: editReqData.project_id === 'none' ? null : editReqData.project_id,
            created_at: editReqData.created_at ? new Date(editReqData.created_at).toISOString() : undefined
        };

        const res = await updatePaymentRequestAction(editReqData.id, payload);
        if (res.success) {
            toast.success(res.message);
            setOpenEditRequest(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsUpdating(false);
    };

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

    const openExecutionModal = (req: any) => {
        setSelectedReq(req);
        let suggestDebit = "";
        let suggestCredit = "";

        if (req.request_type === 'payment') {
            suggestCredit = accounts.find(a => a.code === '111')?.id || "";
            suggestDebit = accounts.find(a => a.code === '331')?.id || "";
        } else if (req.request_type === 'receipt') {
            suggestDebit = accounts.find(a => a.code === '111')?.id || "";
            suggestCredit = accounts.find(a => a.code === '131')?.id || "";
        }

        setExecutionData({ debitAcc: suggestDebit, creditAcc: suggestCredit, amount: Number(req.amount) });
        setOpenExecute(true);
    };

    const handleExecuteRequest = async () => {
        if (!executionData.debitAcc || !executionData.creditAcc) {
            return toast.warning("Vui lòng chọn đầy đủ Tài khoản Ghi Nợ và Ghi Có!");
        }
        if (executionData.amount <= 0) {
            return toast.warning("Số tiền giải ngân phải lớn hơn 0!");
        }

        setIsExecuting(true);
        const res = await executePaymentRequestAction(selectedReq.id, executionData.debitAcc, executionData.creditAcc, executionData.amount);

        if (res.success) {
            toast.success(res.message);
            setOpenExecute(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsExecuting(false);
    };

    // HÀM KÉO ĐỊNH KHOẢN CŨ LÊN ĐỂ SỬA
    const handleEditAccountingClick = async (req: any) => {
        setSelectedReqForAcc(req);
        setOpenEditAccounting(true);
        setIsHistoryLoading(true);

        const res = await getExecutedAccountsAction(req.id);
        if (res.success) {
            setAccountingForm({
                debitAcc: res.debitAccId || "",
                creditAcc: res.creditAccId || ""
            });
        } else {
            toast.error(res.error);
            setOpenEditAccounting(false);
        }
        setIsHistoryLoading(false);
    };

    // HÀM LƯU ĐIỀU CHỈNH ĐỊNH KHOẢN SỔ CÁI
    const handleSaveAccounting = async () => {
        if (!accountingForm.debitAcc || !accountingForm.creditAcc) {
            return toast.warning("Vui lòng nhập đầy đủ cặp tài khoản đối ứng!");
        }

        setIsSavingAccounting(true);
        const res = await updateExecutedAccountingAction(selectedReqForAcc.id, accountingForm.debitAcc, accountingForm.creditAcc);

        if (res.success) {
            toast.success(res.message);
            setOpenEditAccounting(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
        setIsSavingAccounting(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_approval': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none">Chờ duyệt</Badge>;
            case 'approved': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Chờ giải ngân</Badge>;
            case 'completed':
            case 'executed':
            case 'paid': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">Đã hoàn tất</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none">Đã từ chối</Badge>;
            default: return <Badge variant="outline">Nháp</Badge>;
        }
    };

    const getTypeLabel = (type: string) => {
        if (type === 'payment') return <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">CHI TIỀN</span>;
        if (type === 'receipt') return <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">THU TIỀN</span>;
        return <span className="text-blue-600 font-bold flex items-center gap-1">TẠM ỨNG</span>;
    };

    const isFilterActive = filterProject !== "all" || filterStartDate !== "" || filterEndDate !== "";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Sổ Quỹ & Duyệt Chi
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Quy trình: Lập đề nghị &rarr; Kế toán trưởng duyệt &rarr; Giải ngân & Ghi sổ cái</p>
                </div>
                <Button onClick={() => setOpenNewRequest(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="w-4 h-4 mr-2" /> Lập Đề nghị Thu/Chi
                </Button>
            </div>

            {/* --- THANH BỘ LỌC --- */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 w-full md:w-auto shrink-0">
                    <Filter className="w-4 h-4 text-blue-500" /> Bộ lọc:
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                    <Select value={filterProject} onValueChange={setFilterProject}>
                        <SelectTrigger className="h-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                            <SelectValue placeholder="Tất cả dự án" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                            <SelectItem value="all" className="font-bold">-- Tất cả Dự án / Chi phí --</SelectItem>
                            <SelectItem value="none" className="italic text-slate-500 dark:text-slate-400">Chi phí chung (Không gắn dự án)</SelectItem>
                            {projects?.map((p: any) => <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <div className="relative">
                        <CalendarDays className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            className="pl-8 h-9 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 dark:[color-scheme:dark]"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            title="Từ ngày"
                        />
                    </div>

                    <div className="relative flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm hidden md:inline">-</span>
                        <div className="relative flex-1">
                            <CalendarDays className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                            <Input
                                type="date"
                                className="pl-8 h-9 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 dark:[color-scheme:dark]"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                                title="Đến ngày"
                            />
                        </div>
                    </div>
                </div>

                {isFilterActive && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 h-9">
                        <X className="w-4 h-4 mr-1" /> Xóa lọc
                    </Button>
                )}
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
                                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRequests.length === 0 ? (
                                    <TableRow className="dark:border-slate-800"><TableCell colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">Không tìm thấy phiếu nào phù hợp với bộ lọc.</TableCell></TableRow>
                                ) : filteredRequests.map(req => {
                                    const isLocked = ['executed', 'approved', 'paid', 'completed'].includes(req.status?.toLowerCase());

                                    return (
                                        <TableRow key={req.id} className="dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-bold text-slate-700 dark:text-slate-200">
                                                {req.request_code}
                                                <div className="text-xs font-normal text-slate-400 mt-1">{format(new Date(req.created_at), 'dd/MM/yyyy')}</div>
                                            </TableCell>
                                            <TableCell>{getTypeLabel(req.request_type)}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-300 min-w-[200px] max-w-[300px] whitespace-normal break-words">
                                                {req.description}
                                                <div className="text-xs text-slate-400 mt-1">Lập bởi: {req.requester?.name}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(req.amount)}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm min-w-[200px] max-w-[300px] whitespace-normal break-words">
                                                <div className="flex items-center gap-1 mb-1"><User className="w-3 h-3 shrink-0" /> <span className="line-clamp-2">{req.partner_name || "N/A"}</span></div>
                                                {req.project && <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"><Building2 className="w-3 h-3 shrink-0" /> <span className="line-clamp-2">{req.project.name}</span></div>}
                                            </TableCell>
                                            <TableCell className="text-center">{getStatusBadge(req.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <VoucherActions request={req} companySettings={companySettings} />

                                                    {/* NÚT ĐIỀU CHỈNH ĐỊNH KHOẢN SỔ CÁI DÀNH CHO PHIẾU ĐÃ CHI */}
                                                    {isLocked && isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditAccountingClick(req)}
                                                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                                            title="Sửa định khoản Kế toán (Sổ cái)"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    {(isAdmin || !isLocked) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditClick(req)}
                                                            className={`h-8 w-8 ${isAdmin && isLocked ? 'text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20'}`}
                                                            title={isAdmin && isLocked ? "Quyền Admin: Sửa thông tin phiếu" : "Chỉnh sửa"}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 2: CHỜ DUYỆT */}
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
                                {filteredRequests.filter(r => r.status === 'pending_approval').length === 0 ? (
                                    <TableRow className="dark:border-slate-800 bg-amber-50/20 dark:bg-amber-900/5"><TableCell colSpan={5} className="text-center py-8 text-amber-600 dark:text-amber-500">Không có phiếu nào chờ duyệt phù hợp với bộ lọc.</TableCell></TableRow>
                                ) : filteredRequests.filter(r => r.status === 'pending_approval').map(req => (
                                    <TableRow key={req.id} className="dark:border-slate-800 bg-amber-50/20 dark:bg-amber-900/5">
                                        <TableCell className="font-bold text-amber-700 dark:text-amber-400">
                                            {req.request_code}
                                            <div className="text-xs font-normal text-amber-600/70 mt-1">{format(new Date(req.created_at), 'dd/MM/yyyy')}</div>
                                        </TableCell>
                                        <TableCell>{getTypeLabel(req.request_type)}</TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300 min-w-[200px] max-w-[300px] whitespace-normal break-words">
                                            {req.description}
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lập bởi: {req.requester?.name}</div>
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

                {/* TAB 3: THỰC THI & GHI SỔ CÁI */}
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
                                {filteredRequests.filter(r => r.status === 'approved').length === 0 ? (
                                    <TableRow className="dark:border-slate-800 bg-blue-50/20 dark:bg-blue-900/5"><TableCell colSpan={5} className="text-center py-8 text-blue-600 dark:text-blue-400">Không có phiếu nào chờ giải ngân phù hợp với bộ lọc.</TableCell></TableRow>
                                ) : filteredRequests.filter(r => r.status === 'approved').map(req => (
                                    <TableRow key={req.id} className="dark:border-slate-800 bg-blue-50/20 dark:bg-blue-900/5 hover:bg-blue-50/40 dark:hover:bg-blue-900/10">
                                        <TableCell className="font-bold text-blue-700 dark:text-blue-400">
                                            {req.request_code}
                                            <div className="text-xs font-normal text-blue-600/70 mt-1">{format(new Date(req.created_at), 'dd/MM/yyyy')}</div>
                                        </TableCell>
                                        <TableCell>{getTypeLabel(req.request_type)}</TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300 min-w-[200px] max-w-[300px] whitespace-normal break-words">
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
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 dark:text-slate-100"><FileText className="w-5 h-5 text-indigo-500" /> Lập Đề Nghị Mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Ngày lập phiếu <span className="text-red-500">*</span></Label>
                                <Input type="date" value={newReq.created_at} onChange={e => setNewReq({ ...newReq, created_at: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:[color-scheme:dark]" />
                            </div>
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

            {/* MODAL EDIT: CHỈNH SỬA PHIẾU */}
            <Dialog open={openEditRequest} onOpenChange={setOpenEditRequest}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 dark:text-slate-100">
                            <Pencil className="w-5 h-5 text-indigo-500" /> Cập nhật Thông tin Phiếu
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Ngày lập phiếu <span className="text-red-500">*</span></Label>
                                <Input type="date" value={editReqData.created_at} onChange={e => setEditReqData({ ...editReqData, created_at: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:[color-scheme:dark]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Loại đề nghị</Label>
                                <Select value={editReqData.type} onValueChange={(v) => setEditReqData({ ...editReqData, type: v })}>
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
                                <Input type="number" placeholder="0" value={editReqData.amount} onChange={e => setEditReqData({ ...editReqData, amount: e.target.value })} className="text-right font-bold text-lg dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Lý do / Nội dung chi tiết <span className="text-red-500">*</span></Label>
                            <Input placeholder="Nhập lý do thu chi..." value={editReqData.description} onChange={e => setEditReqData({ ...editReqData, description: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Đối tác / Thụ hưởng (Nếu có)</Label>
                            <Input placeholder="Tên người nhận tiền..." value={editReqData.partner_name} onChange={e => setEditReqData({ ...editReqData, partner_name: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 flex items-center gap-1"><Building2 className="w-3 h-3" /> Dự án liên quan</Label>
                            <Select value={editReqData.project_id} onValueChange={(v) => setEditReqData({ ...editReqData, project_id: v })}>
                                <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"><SelectValue placeholder="-- Không gắn dự án --" /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="none" className="italic dark:text-slate-400">-- Chi phí chung / Không gắn dự án --</SelectItem>
                                    {projects?.map((p: any) => <SelectItem key={p.id} value={p.id} className="dark:text-slate-200">[{p.code}] {p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setOpenEditRequest(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                        <Button onClick={handleUpdateRequest} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px] dark:bg-blue-600 dark:hover:bg-blue-500">
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lưu Thay Đổi
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
                        <DialogDescription className="dark:text-slate-400">Phiếu: <strong className="text-slate-700 dark:text-slate-200">{selectedReq?.request_code}</strong> - Đề nghị: <strong className="text-red-500 dark:text-red-400 text-base">{selectedReq ? formatCurrency(selectedReq.amount) : 0}</strong></DialogDescription>
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

                        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                            <Label className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">Số tiền giải ngân thực tế (VNĐ)</Label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={formatInputMoney(executionData.amount)}
                                    onChange={(e) => {
                                        const val = Number(e.target.value.replace(/\D/g, ""));
                                        setExecutionData({ ...executionData, amount: val });
                                    }}
                                    className="font-bold text-xl pr-8 text-blue-600 dark:text-blue-400 h-12 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 focus-visible:ring-blue-500"
                                />
                                <span className="absolute right-4 top-3.5 font-bold text-slate-400">đ</span>
                            </div>

                            {selectedReq && executionData.amount !== Number(selectedReq.amount) && (
                                <div className="text-xs font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Đang sửa lệch so với đề nghị gốc ({formatCurrency(selectedReq.amount)})
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="col-span-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-center mb-1">Mô phỏng Bút toán Nợ/Có</div>
                            <div className="text-right pr-4 font-semibold text-slate-600 dark:text-slate-400">NỢ (Debit):</div>
                            <div className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(executionData.amount)}</div>
                            <div className="text-right pr-4 font-semibold text-slate-600 dark:text-slate-400">CÓ (Credit):</div>
                            <div className="font-bold text-amber-700 dark:text-amber-500">{formatCurrency(executionData.amount)}</div>
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

            {/* MODAL 3: ĐIỀU CHỈNH ĐỊNH KHOẢN KẾ TOÁN SỔ CÁI (MỚI BỔ SUNG) */}
            <Dialog open={openEditAccounting} onOpenChange={setOpenEditAccounting}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <RefreshCw className="w-5 h-5 animate-spin-once" /> Điều chỉnh định khoản Sổ cái
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            Thay đổi tài khoản đối ứng cho phiếu <strong className="text-slate-800 dark:text-slate-200">{selectedReqForAcc?.request_code}</strong> để số liệu phân bổ chính xác vào báo cáo P&L.
                        </DialogDescription>
                    </DialogHeader>

                    {isHistoryLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" /> Đang tải thông tin hạch toán hiện tại...
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 border border-orange-200/50 rounded-lg text-xs text-orange-800 dark:text-orange-400">
                                <AlertCircle className="w-4 h-4 inline mr-1.5 shrink-0 align-text-bottom" />
                                <strong>Lưu ý:</strong> Đổi tài khoản Nợ sang nhóm **154** hoặc **642** nếu muốn ghi nhận chi phí vào P&L. Đổi sang nhóm **331** nếu đây là khoản trả nợ nhà cung cấp.
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-xs uppercase text-slate-500">Tài khoản Ghi Nợ mới</Label>
                                        <Select value={accountingForm.debitAcc} onValueChange={(v) => setAccountingForm({ ...accountingForm, debitAcc: v })}>
                                            <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-medium border-orange-500/30">
                                                <SelectValue placeholder="Chọn TK Nợ..." />
                                            </SelectTrigger>
                                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-[200px]">
                                                {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-xs uppercase text-slate-500">Tài khoản Ghi Có mới</Label>
                                        <Select value={accountingForm.creditAcc} onValueChange={(v) => setAccountingForm({ ...accountingForm, creditAcc: v })}>
                                            <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-medium border-orange-500/30">
                                                <SelectValue placeholder="Chọn TK Có..." />
                                            </SelectTrigger>
                                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-[200px]">
                                                {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="text-xs p-3 bg-white dark:bg-slate-900 rounded-md border text-slate-500 flex justify-between">
                                    <span>Số tiền giao dịch điều chỉnh:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReqForAcc ? formatCurrency(selectedReqForAcc.amount) : "0đ"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenEditAccounting(false)} className="dark:border-slate-700">Hủy</Button>
                        <Button onClick={handleSaveAccounting} disabled={isSavingAccounting || isHistoryLoading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[140px]">
                            {isSavingAccounting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Cập nhật Sổ cái
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}