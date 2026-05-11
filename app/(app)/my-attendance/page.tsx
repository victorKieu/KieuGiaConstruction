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
        scope: "SHIFT", // SHIFT | CHECKPOINT
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

    // 1. Tải dữ liệu ban đầu
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingRecords(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Lấy Role và dịch UUID sang Code
                    const { data: profile } = await supabase.from('user_profiles').select('role_id').eq('auth_id', user.id).single();
                    if (profile?.role_id) {
                        const { data: roleDict } = await supabase.from('sys_dictionaries').select('code').eq('id', profile.role_id).maybeSingle();
                        if (roleDict?.code) setUserRole(roleDict.code);
                    }
                }

                // Lấy danh sách dự án cho form giải trình
                const { data: projData } = await supabase.from('projects').select('id, name').order('name');
                if (projData) setProjects(projData);

                // Lấy lịch sử chấm công
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

    // 2. Xử lý gửi Đơn Giải trình (Nâng cấp Scope)
    const handleSubmitExplanation = async () => {
        if (!explForm.date || !explForm.reason) {
            return toast.error("Vui lòng điền đủ Ngày và Lý do!");
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
            toast.success(res.message);
            setExplOpen(false);
            setExplForm({ ...explForm, inTime: "", outTime: "", reason: "" });
        } else {
            toast.error(res.error);
        }
    };

    // 3. Xử lý gửi Đơn Nghỉ phép
    const handleSubmitLeave = async () => {
        if (!leaveForm.reason || new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
            return toast.error("Vui lòng kiểm tra lại thông tin đơn nghỉ!");
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
            toast.success(res.message);
            setLeaveOpen(false);
            setLeaveForm({ ...leaveForm, reason: "" });
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-6xl mx-auto transition-colors">
            <div className="flex justify-between items-center px-1">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Cá nhân Chấm công</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ghi nhận thời gian và lộ trình làm việc</p>
                </div>
            </div>

            <Tabs defaultValue="checkin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger value="checkin">Bảng Chấm Công</TabsTrigger>
                    <TabsTrigger value="requests">Đơn từ & Phép</TabsTrigger>
                </TabsList>

                {/* TAB 1: CHẤM CÔNG & CAMERA */}
                <TabsContent value="checkin" className="space-y-4 mt-4">

                    {/* KHU VỰC NÚT MỞ CAMERA */}
                    <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/5 shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                                <Camera className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Chấm công Face ID</h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm">Nhấn để quét khuôn mặt và ghi nhận vị trí làm việc hiện tại của bạn.</p>
                            <Button
                                onClick={() => setCameraOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-12 rounded-full text-base font-bold shadow-lg shadow-emerald-500/20"
                            >
                                <Camera className="w-5 h-5 mr-2" /> Bắt đầu Quét mặt
                            </Button>
                        </CardContent>
                    </Card>

                    {/* DIALOG CHỨA CAMERA AI */}
                    <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
                        <DialogContent className="sm:max-w-[420px] p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
                            <div className="h-[600px] w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
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

                    {/* BẢNG LỊCH SỬ CHẤM CÔNG */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center">
                                <History className="w-4 h-4 mr-2 text-blue-600" /> Lịch sử làm việc
                            </CardTitle>
                            <div className="flex gap-2">
                                <Dialog open={explOpen} onOpenChange={setExplOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="h-8 text-xs border-orange-200 text-orange-700 dark:border-orange-500/30 dark:text-orange-400">
                                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Giải trình / Báo quên
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[480px] dark:bg-slate-900">
                                        <DialogHeader>
                                            <DialogTitle className="text-orange-600 flex items-center">
                                                <FileEdit className="w-5 h-5 mr-2" /> Tạo Đơn Giải Trình
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Ngày giải trình <span className="text-red-500">*</span></Label>
                                                    <Input type="date" value={explForm.date} onChange={e => setExplForm({ ...explForm, date: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Lý do chính</Label>
                                                    <Select value={explForm.type} onValueChange={v => setExplForm({ ...explForm, type: v })}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="forgot_in">Quên chấm VÀO</SelectItem>
                                                            <SelectItem value="forgot_out">Quên chấm RA</SelectItem>
                                                            <SelectItem value="wrong_time">Sai giờ/Lỗi máy</SelectItem>
                                                            <SelectItem value="field_work">Công tác thực địa</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Phạm vi ảnh hưởng <span className="text-red-500">*</span></Label>
                                                <Select value={explForm.scope} onValueChange={v => setExplForm({ ...explForm, scope: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SHIFT">Toàn bộ Ca (Giờ đầu/cuối ngày)</SelectItem>
                                                        <SelectItem value="CHECKPOINT">Từng điểm di chuyển (Sửa 1 chặng)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {explForm.scope === 'CHECKPOINT' && (
                                                <div className="space-y-2 animate-in slide-in-from-top-1">
                                                    <Label>Địa điểm cần điều chỉnh</Label>
                                                    <Select value={explForm.projectId} onValueChange={v => setExplForm({ ...explForm, projectId: v })}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="office" className="font-bold text-blue-600">🏢 Văn phòng Công ty</SelectItem>
                                                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Giờ VÀO mới</Label>
                                                    <Input type="time" value={explForm.inTime} onChange={e => setExplForm({ ...explForm, inTime: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Giờ RA mới</Label>
                                                    <Input type="time" value={explForm.outTime} onChange={e => setExplForm({ ...explForm, outTime: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Trình bày chi tiết <span className="text-red-500">*</span></Label>
                                                <Textarea placeholder="Nêu rõ lý do..." value={explForm.reason} onChange={e => setExplForm({ ...explForm, reason: e.target.value })} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setExplOpen(false)}>Hủy</Button>
                                            <Button disabled={isSubmitting} onClick={handleSubmitExplanation} className="bg-orange-600 hover:bg-orange-700">
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi duyệt
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Button variant="outline" className="h-8 text-xs" onClick={loadRecords} disabled={loadingRecords}>
                                    {loadingRecords ? <Loader2 className="w-3 h-3 animate-spin" /> : "Làm mới"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {loadingRecords ? (
                                <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                            ) : (
                                <AttendanceTable records={realRecords} hideEmployeeInfo={true} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: ĐƠN TỪ & NGHỈ PHÉP */}
                <TabsContent value="requests" className="mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center">
                                <CalendarDays className="w-4 h-4 mr-2 text-emerald-600" /> Danh sách Đơn xin nghỉ
                            </CardTitle>
                            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Tạo Đơn Nghỉ
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[450px] dark:bg-slate-900">
                                    <DialogHeader>
                                        <DialogTitle className="text-emerald-700 flex items-center">
                                            <CalendarDays className="w-5 h-5 mr-2" /> Tạo Đơn Xin Nghỉ
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label>Loại nghỉ phép</Label>
                                            <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="annual">Phép năm (Có lương)</SelectItem>
                                                    <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                                    <SelectItem value="sick">Nghỉ ốm/Chế độ</SelectItem>
                                                    <SelectItem value="urgent">Nghỉ đột xuất/Gia đình</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Từ ngày</Label>
                                                <Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Đến ngày</Label>
                                                <Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lý do nghỉ</Label>
                                            <Textarea placeholder="Ghi chú chi tiết..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setLeaveOpen(false)}>Hủy</Button>
                                        <Button disabled={isSubmitting} onClick={handleSubmitLeave} className="bg-emerald-600">
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi Đơn
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

// COMPONENT HIỂN THỊ DANH SÁCH ĐƠN (Cần Fetch dữ liệu thật)
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

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    if (requests.length === 0) return <div className="p-12 text-center text-slate-400">Bạn chưa có đơn từ nào.</div>;

    const getStatusStyle = (s: string) => {
        if (s === 'approved') return "bg-emerald-100 text-emerald-700 border-emerald-200";
        if (s === 'rejected') return "bg-red-100 text-red-700 border-red-200";
        return "bg-amber-100 text-amber-700 border-amber-200 animate-pulse";
    };

    return (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map(req => (
                <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {req.request_type === 'leave' ? 'Đơn Nghỉ Phép' : 'Đơn Giải Trình'}
                            </span>
                            <span className="text-[11px] text-slate-500">{formatDate(req.created_at)}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusStyle(req.status)}`}>
                            {req.status === 'approved' ? 'Đã duyệt' : req.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                    </div>
                    <div className="text-xs text-slate-600 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100">
                        <div className="flex justify-between mb-1">
                            <span>Ngày áp dụng: <strong>{formatDate(req.start_date)}</strong></span>
                            {req.actual_in_time && <span>Giờ mới: <strong>{req.actual_in_time} - {req.actual_out_time}</strong></span>}
                        </div>
                        <p className="italic text-slate-500 line-clamp-1">"{req.reason}"</p>
                    </div>
                </div>
            ))}
        </div>
    );
}