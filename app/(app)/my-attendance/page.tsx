"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
    CalendarDays, AlertCircle, Send, History, FileEdit, Plus,
    Loader2, Trash2, Edit, Save, Camera, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";
import { formatDate } from "@/lib/utils/utils";
import { createClient } from "@/lib/supabase/client";

// Import các hàm API Backend
import {
    getMyAttendanceRecords,
    submitAttendanceRequest,
    getMyRequests,
    deleteMyRequest,
    updateMyRequest
} from "@/lib/action/attendanceActions";

import FaceIDCheckIn from "@/components/hrm/FaceIDCheckIn";

export default function AttendancePage() {
    const supabase = createClient();

    // -- DATA STATE --
    const [realRecords, setRealRecords] = useState<AttendanceRecord[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userRole, setUserRole] = useState<string>("staff");

    // -- UI STATE --
    const [cameraOpen, setCameraOpen] = useState(false);
    const [explOpen, setExplOpen] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);

    // -- FORM STATE --
    const [explForm, setExplForm] = useState({
        scope: "SHIFT",
        projectId: "office",
        date: new Date().toLocaleDateString('en-CA'),
        type: "forgot_in",
        inTime: "",
        outTime: "",
        reason: ""
    });

    const [leaveForm, setLeaveForm] = useState({
        type: "annual",
        startDate: new Date().toLocaleDateString('en-CA'),
        endDate: new Date().toLocaleDateString('en-CA'),
        reason: ""
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingRecords(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('user_profiles').select('role_id').eq('auth_id', user.id).single();
                    if (profile?.role_id) {
                        const { data: roleDict } = await supabase.from('sys_dictionaries').select('code').eq('id', profile.role_id).maybeSingle();
                        if (roleDict?.code) setUserRole(roleDict.code);
                    }
                }

                const { data: projData } = await supabase.from('projects').select('id, name').order('name');
                if (projData) setProjects(projData);

                const data = await getMyAttendanceRecords();
                setRealRecords(data);
            } catch (error) {
                console.error("Lỗi khởi tạo:", error);
            }
            setLoadingRecords(false);
        };
        fetchInitialData();
    }, []);

    const loadRecords = async () => {
        setLoadingRecords(true);
        const data = await getMyAttendanceRecords();
        setRealRecords(data);
        setLoadingRecords(false);
    };

    const handleSubmitExplanation = async () => {
        if (!explForm.date || !explForm.reason) {
            // ✅ SỬ DỤNG setTimeout ĐỂ TRÁNH LỖI STATE UPDATE TRONG LÚC RENDER
            setTimeout(() => toast.error("Vui lòng điền đủ Ngày và Lý do!"), 0);
            return;
        }

        setIsSubmitting(true);
        const res = await submitAttendanceRequest({
            request_type: 'explanation',
            sub_type: explForm.type,
            start_date: explForm.date,
            actual_in_time: explForm.inTime || null,
            actual_out_time: explForm.outTime || null,
            reason: explForm.reason,
            request_scope: explForm.scope,
            project_id: explForm.scope === 'CHECKPOINT' ? (explForm.projectId === 'office' ? null : explForm.projectId) : undefined
        });
        setIsSubmitting(false);

        if (res.success) {
            setTimeout(() => toast.success(res.message), 0);
            setExplOpen(false);
            setExplForm({ ...explForm, inTime: "", outTime: "", reason: "" });
            loadRecords();
        } else {
            setTimeout(() => toast.error(res.error), 0);
        }
    };

    const handleSubmitLeave = async () => {
        if (!leaveForm.reason || new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
            setTimeout(() => toast.error("Vui lòng kiểm tra lại thông tin đơn nghỉ!"), 0);
            return;
        }

        setIsSubmitting(true);
        const res = await submitAttendanceRequest({
            request_type: 'leave',
            sub_type: leaveForm.type,
            start_date: leaveForm.startDate,
            end_date: leaveForm.endDate,
            reason: leaveForm.reason
        });
        setIsSubmitting(false);

        if (res.success) {
            setTimeout(() => toast.success(res.message), 0);
            setLeaveOpen(false);
            setLeaveForm({ ...leaveForm, reason: "" });
            loadRecords();
        } else {
            setTimeout(() => toast.error(res.error), 0);
        }
    };

    const inputClasses = "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 h-10 transition-colors";
    const labelClasses = "text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors";

    return (
        <div className="animate-in fade-in mx-auto max-w-6xl space-y-4 transition-colors duration-500">
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 transition-colors dark:text-slate-100">Cá nhân Chấm công</h1>
                    <p className="text-sm text-slate-500 transition-colors dark:text-slate-400">Ghi nhận thời gian và lộ trình làm việc</p>
                </div>
            </div>

            <Tabs defaultValue="checkin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 transition-colors md:w-[400px] dark:bg-slate-800">
                    <TabsTrigger value="checkin" className="dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-slate-100">Bảng Chấm Công</TabsTrigger>
                    <TabsTrigger value="requests" className="dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-slate-100">Đơn từ & Phép</TabsTrigger>
                </TabsList>

                {/* TAB 1: CHẤM CÔNG & CAMERA */}
                <TabsContent value="checkin" className="mt-4 space-y-4">
                    <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm transition-colors dark:border-emerald-900/30 dark:bg-emerald-900/10">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors dark:bg-emerald-900/50 dark:text-emerald-400">
                                <Camera className="h-8 w-8" />
                            </div>
                            <h3 className="mb-1 text-lg font-bold text-slate-800 transition-colors dark:text-slate-200">Chấm công Face ID</h3>
                            <p className="mb-6 max-w-sm text-sm text-slate-500 transition-colors dark:text-slate-400">Nhấn để quét khuôn mặt và ghi nhận vị trí làm việc hiện tại của bạn.</p>
                            <Button
                                onClick={() => setCameraOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-12 rounded-full text-base font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                            >
                                <Camera className="mr-2 h-5 w-5" /> Bắt đầu Quét mặt
                            </Button>
                        </CardContent>
                    </Card>

                    <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
                        {/* ✅ FIX LỖI 1: Bổ sung aria-describedby={undefined} */}
                        <DialogContent aria-describedby={undefined} className="border-0 bg-transparent p-0 shadow-none sm:max-w-[420px] [&>button]:hidden">
                            {/* Để tránh lỗi description missing */}
                            <div className="sr-only">Camera check in</div>
                            <div className="h-[600px] w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                                {cameraOpen && (
                                    <FaceIDCheckIn
                                        userRole={userRole}
                                        onScanSuccess={() => {
                                            loadRecords();
                                            setCameraOpen(false);
                                        }}
                                        onClose={() => setCameraOpen(false)}
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Card className="border-slate-200 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50 py-3 transition-colors dark:border-slate-800 dark:bg-slate-900/50">
                            <CardTitle className="flex items-center text-base font-bold text-slate-700 transition-colors dark:text-slate-200">
                                <History className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500" /> Lịch sử làm việc
                            </CardTitle>
                            <div className="flex gap-2">
                                <Dialog open={explOpen} onOpenChange={setExplOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="h-8 border-orange-200 bg-white text-xs text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-500/30 dark:bg-slate-950 dark:text-orange-400 dark:hover:bg-orange-500/10">
                                            <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> Giải trình / Báo quên
                                        </Button>
                                    </DialogTrigger>
                                    {/* ✅ FIX LỖI 1: Bổ sung aria-describedby */}
                                    <DialogContent aria-describedby={undefined} className="border-none bg-white shadow-xl transition-colors sm:max-w-[480px] dark:bg-slate-900">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center text-orange-600 transition-colors dark:text-orange-500">
                                                <FileEdit className="mr-2 h-5 w-5" /> Tạo Đơn Giải Trình
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className={labelClasses}>Ngày giải trình <span className="text-red-500">*</span></Label>
                                                    <Input type="date" value={explForm.date} onChange={e => setExplForm({ ...explForm, date: e.target.value })} className={inputClasses} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className={labelClasses}>Lý do chính</Label>
                                                    <Select value={explForm.type} onValueChange={v => setExplForm({ ...explForm, type: v })}>
                                                        <SelectTrigger className={inputClasses}><SelectValue /></SelectTrigger>
                                                        <SelectContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                                            <SelectItem value="forgot_in">Quên chấm VÀO</SelectItem>
                                                            <SelectItem value="forgot_out">Quên chấm RA</SelectItem>
                                                            <SelectItem value="wrong_time">Sai giờ/Lỗi máy</SelectItem>
                                                            <SelectItem value="field_work">Công tác thực địa</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className={labelClasses}>Giờ VÀO mới</Label>
                                                    <Input type="time" value={explForm.inTime} onChange={e => setExplForm({ ...explForm, inTime: e.target.value })} className={inputClasses} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className={labelClasses}>Giờ RA mới</Label>
                                                    <Input type="time" value={explForm.outTime} onChange={e => setExplForm({ ...explForm, outTime: e.target.value })} className={inputClasses} />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className={labelClasses}>Trình bày chi tiết <span className="text-red-500">*</span></Label>
                                                <Textarea placeholder="Nêu rõ lý do..." value={explForm.reason} onChange={e => setExplForm({ ...explForm, reason: e.target.value })} className={`${inputClasses} min-h-[80px] pt-2`} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setExplOpen(false)} className="dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                                            <Button disabled={isSubmitting} onClick={handleSubmitExplanation} className="bg-orange-600 text-white shadow-md hover:bg-orange-700">
                                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Gửi duyệt
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Button variant="outline" className="h-8 bg-white text-xs transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" onClick={loadRecords} disabled={loadingRecords}>
                                    {loadingRecords ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : "Làm mới"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0">
                            {loadingRecords ? (
                                <div className="flex justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" /></div>
                            ) : (
                                <AttendanceTable records={realRecords} hideEmployeeInfo={true} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: ĐƠN TỪ & NGHỈ PHÉP */}
                <TabsContent value="requests" className="mt-4">
                    <Card className="border-slate-200 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50 py-3 transition-colors dark:border-slate-800 dark:bg-slate-900/50">
                            <CardTitle className="flex items-center text-base font-bold text-slate-700 transition-colors dark:text-slate-200">
                                <CalendarDays className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-500" /> Danh sách Đơn xin nghỉ
                            </CardTitle>
                            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-8 bg-emerald-600 text-xs text-white shadow-sm transition-all hover:bg-emerald-700">
                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo Đơn Nghỉ
                                    </Button>
                                </DialogTrigger>
                                {/* ✅ FIX LỖI 1: Bổ sung aria-describedby */}
                                <DialogContent aria-describedby={undefined} className="border-none bg-white shadow-xl transition-colors sm:max-w-[450px] dark:bg-slate-900">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center text-emerald-700 transition-colors dark:text-emerald-500">
                                            <CalendarDays className="mr-2 h-5 w-5" /> Tạo Đơn Xin Nghỉ
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label className={labelClasses}>Loại nghỉ phép</Label>
                                            <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                                                <SelectTrigger className={inputClasses}><SelectValue /></SelectTrigger>
                                                <SelectContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                                    <SelectItem value="annual">Phép năm (Có lương)</SelectItem>
                                                    <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                                    <SelectItem value="sick">Nghỉ ốm/Chế độ</SelectItem>
                                                    <SelectItem value="urgent">Nghỉ đột xuất/Gia đình</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className={labelClasses}>Từ ngày</Label>
                                                <Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className={inputClasses} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={labelClasses}>Đến ngày</Label>
                                                <Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className={inputClasses} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={labelClasses}>Lý do nghỉ <span className="text-red-500">*</span></Label>
                                            <Textarea placeholder="Ghi chú chi tiết..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className={`${inputClasses} min-h-[80px] pt-2`} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setLeaveOpen(false)} className="dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                                        <Button disabled={isSubmitting} onClick={handleSubmitLeave} className="bg-emerald-600 text-white shadow-md hover:bg-emerald-700">
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Gửi Đơn
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="p-0">
                            <PersonalRequestsList />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// COMPONENT HIỂN THỊ DANH SÁCH ĐƠN TỪ
function PersonalRequestsList() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReqs = async () => {
            const data = await getMyRequests();
            setRequests(data);
            setLoading(false);
        };
        fetchReqs();
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    if (requests.length === 0) return <div className="p-12 text-center text-slate-400 dark:text-slate-500">Bạn chưa có đơn từ nào.</div>;

    const getStatusStyle = (s: string) => {
        if (s === 'approved') return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
        if (s === 'rejected') return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 animate-pulse";
    };

    return (
        <div className="divide-y divide-slate-100 transition-colors dark:divide-slate-800">
            {requests.map(req => (
                <div key={req.id} className="p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="mb-2 flex items-start justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-200">
                                {req.request_type === 'leave' ? 'Đơn Nghỉ Phép' : 'Đơn Giải Trình'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(req.created_at)}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase transition-colors ${getStatusStyle(req.status)}`}>
                            {req.status === 'approved' ? 'Đã duyệt' : req.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3 text-xs text-slate-600 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        <div className="mb-2 flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800/50">
                            <span>Ngày áp dụng: <strong className="text-slate-800 dark:text-slate-100">{formatDate(req.start_date)}</strong></span>
                            {req.actual_in_time && <span>Giờ mới: <strong className="text-blue-600 dark:text-blue-400">{req.actual_in_time.substring(0, 5)} - {req.actual_out_time.substring(0, 5)}</strong></span>}
                        </div>
                        <p className="line-clamp-2 text-slate-500 italic dark:text-slate-400">"{req.reason}"</p>
                    </div>
                </div>
            ))}
        </div>
    );
}