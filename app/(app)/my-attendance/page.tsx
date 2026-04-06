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
import { CalendarDays, AlertCircle, Send, History, FileEdit, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";
import { MobileCheckIn } from "@/components/hrm/MobileCheckIn";
import { formatDate } from "@/lib/utils/utils";
import { cn } from "@/lib/utils/utils";

// Import các hàm API Backend thật
import { getMyAttendanceRecords, submitAttendanceRequest, getMyRequests } from "@/lib/action/attendanceActions";

export default function AttendancePage() {
    // State chứa dữ liệu chấm công thật
    const [realRecords, setRealRecords] = useState<AttendanceRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho Form Giải trình
    const [explOpen, setExplOpen] = useState(false);
    const [explForm, setExplForm] = useState({ date: "", type: "", inTime: "", outTime: "", reason: "" });

    // State cho Form Nghỉ phép (Đã chuyển sang dùng Date chuẩn thay vì Lịch phức tạp để Mobile dễ chọn)
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        type: "",
        startDate: new Date().toLocaleDateString('en-CA'),
        endDate: new Date().toLocaleDateString('en-CA'),
        reason: ""
    });

    // Tải dữ liệu thật khi vào trang
    useEffect(() => {
        loadRecords();
    }, []);

    const loadRecords = async () => {
        setLoadingRecords(true);
        const data = await getMyAttendanceRecords();
        setRealRecords(data);
        setLoadingRecords(false);
    };

    // Xử lý gửi Đơn Giải trình
    const handleSubmitExplanation = async () => {
        if (!explForm.date || !explForm.type || !explForm.reason) {
            return toast.error("Vui lòng điền đủ Ngày, Loại giải trình và Lý do!");
        }

        if (explForm.type === 'forgot_in' && !explForm.inTime) return toast.error("Vui lòng nhập Giờ VÀO thực tế!");
        if (explForm.type === 'forgot_out' && !explForm.outTime) return toast.error("Vui lòng nhập Giờ RA thực tế!");

        setIsSubmitting(true);
        const res = await submitAttendanceRequest({
            request_type: 'explanation',
            sub_type: explForm.type,
            start_date: explForm.date,
            actual_in_time: explForm.inTime || null,
            actual_out_time: explForm.outTime || null,
            reason: explForm.reason
        });
        setIsSubmitting(false);

        if (res.success) {
            toast.success(res.message);
            setExplOpen(false);
            setExplForm({ date: "", type: "", inTime: "", outTime: "", reason: "" });
        } else {
            toast.error(res.error);
        }
    };

    // Xử lý gửi Đơn Xin nghỉ
    const handleSubmitLeave = async () => {
        if (!leaveForm.type || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
            return toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc!");
        }

        if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
            return toast.error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");
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
            setLeaveForm({ type: "", startDate: new Date().toLocaleDateString('en-CA'), endDate: new Date().toLocaleDateString('en-CA'), reason: "" });
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-6xl mx-auto transition-colors">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Quản lý Chấm công & Đơn từ</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Hệ thống ghi nhận thời gian làm việc và xử lý phép</p>
                </div>
            </div>

            <Tabs defaultValue="checkin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="checkin">Chấm công GPS</TabsTrigger>
                    <TabsTrigger value="requests">Đơn từ & Phép</TabsTrigger>
                </TabsList>

                {/* TAB 1: CHẤM CÔNG */}
                <TabsContent value="checkin" className="space-y-4 mt-4">
                    <div className="block md:hidden">
                        <MobileCheckIn />
                    </div>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex flex-row items-center justify-between py-3 transition-colors">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center transition-colors">
                                    <History className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-500" /> Lịch sử chấm công của bạn
                                </CardTitle>
                            </div>
                            <div className="flex gap-2">
                                {/* DIALOG BÁO QUÊN / GIẢI TRÌNH */}
                                <Dialog open={explOpen} onOpenChange={setExplOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 dark:bg-slate-950 h-8 text-xs transition-colors">
                                            <AlertCircle className="w-3 h-3 mr-1.5" /> Báo quên / Giải trình
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[450px] dark:bg-slate-900 dark:border-slate-800">
                                        <DialogHeader>
                                            <DialogTitle className="text-orange-600 dark:text-orange-500 flex items-center">
                                                <FileEdit className="w-5 h-5 mr-2" /> Tạo Đơn Giải Trình
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label className="dark:text-slate-300">Ngày cần giải trình <span className="text-red-500">*</span></Label>
                                                <Input type="date" value={explForm.date} onChange={e => setExplForm({ ...explForm, date: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="dark:text-slate-300">Loại giải trình <span className="text-red-500">*</span></Label>
                                                <Select value={explForm.type} onValueChange={v => setExplForm({ ...explForm, type: v, inTime: "", outTime: "" })}>
                                                    <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"><SelectValue placeholder="Chọn lý do..." /></SelectTrigger>
                                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                                        <SelectItem value="forgot_in">Quên chấm công VÀO</SelectItem>
                                                        <SelectItem value="forgot_out">Quên chấm công RA</SelectItem>
                                                        <SelectItem value="wrong_time">Chấm công sai giờ / Lỗi máy</SelectItem>
                                                        <SelectItem value="field_work">Đi công tác thực địa</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className={explForm.type === 'forgot_out' ? 'text-slate-400 dark:text-slate-600' : 'dark:text-slate-300'}>Giờ VÀO thực tế</Label>
                                                    <Input
                                                        type="time"
                                                        value={explForm.inTime}
                                                        onChange={e => setExplForm({ ...explForm, inTime: e.target.value })}
                                                        disabled={explForm.type === 'forgot_out' || explForm.type === 'field_work'}
                                                        className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className={explForm.type === 'forgot_in' ? 'text-slate-400 dark:text-slate-600' : 'dark:text-slate-300'}>Giờ RA thực tế</Label>
                                                    <Input
                                                        type="time"
                                                        value={explForm.outTime}
                                                        onChange={e => setExplForm({ ...explForm, outTime: e.target.value })}
                                                        disabled={explForm.type === 'forgot_in' || explForm.type === 'field_work'}
                                                        className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="dark:text-slate-300">Lý do chi tiết <span className="text-red-500">*</span></Label>
                                                <Textarea placeholder="Trình bày rõ lý do..." value={explForm.reason} onChange={e => setExplForm({ ...explForm, reason: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setExplOpen(false)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                                            <Button disabled={isSubmitting} onClick={handleSubmitExplanation} className="bg-orange-600 hover:bg-orange-700 text-white">
                                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi duyệt
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Button variant="outline" className="h-8 text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" onClick={loadRecords} disabled={loadingRecords}>
                                    {loadingRecords ? <Loader2 className="w-3 h-3 animate-spin" /> : "Làm mới"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {loadingRecords ? (
                                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" /></div>
                            ) : (
                                <div className="min-w-[600px]">
                                    <AttendanceTable records={realRecords} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: ĐƠN TỪ & NGHỈ PHÉP */}
                <TabsContent value="requests" className="mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex flex-row items-center justify-between py-3 transition-colors">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center transition-colors">
                                    <CalendarDays className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-500" /> Danh sách Đơn xin nghỉ
                                </CardTitle>
                            </div>

                            {/* DIALOG XIN NGHỈ PHÉP (Sử dụng 2 ô Date Input chuẩn UX Mobile) */}
                            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs shadow-sm">
                                        <Plus className="w-3 h-3 mr-1.5" /> Tạo Đơn Mới
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-800">
                                    <DialogHeader>
                                        <DialogTitle className="text-emerald-700 dark:text-emerald-500 flex items-center">
                                            <CalendarDays className="w-5 h-5 mr-2" /> Tạo Đơn Xin Nghỉ
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label className="dark:text-slate-300">Loại nghỉ phép <span className="text-red-500">*</span></Label>
                                            <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                                                <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"><SelectValue placeholder="Chọn loại phép..." /></SelectTrigger>
                                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                                    <SelectItem value="annual">Nghỉ phép năm (Có lương)</SelectItem>
                                                    <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                                    <SelectItem value="sick">Nghỉ ốm / Thai sản</SelectItem>
                                                    <SelectItem value="urgent">Nghỉ đột xuất / Việc gia đình</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Chuyển DateRange phức tạp thành 2 ô Input Date đơn giản */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="dark:text-slate-300">Từ ngày <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="date"
                                                    value={leaveForm.startDate}
                                                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                                    className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="dark:text-slate-300">Đến ngày <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="date"
                                                    value={leaveForm.endDate}
                                                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                                    className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="dark:text-slate-300">Lý do chi tiết <span className="text-red-500">*</span></Label>
                                            <Textarea placeholder="Nêu rõ lý do xin nghỉ..." className="h-24 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setLeaveOpen(false)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                                        <Button disabled={isSubmitting} onClick={handleSubmitLeave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi Đơn
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

// ====================================================================================
// Component hiển thị danh sách đơn cá nhân
// ====================================================================================
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

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500 dark:text-blue-400" /></div>;

    if (requests.length === 0) return (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p>Bạn chưa có đơn từ nào trong hệ thống.</p>
        </div>
    );

    const getStatusStyle = (status: string) => {
        if (status === 'approved') return <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">Đã duyệt</span>;
        if (status === 'rejected') return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">Từ chối</span>;
        return <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Chờ duyệt</span>;
    };

    return (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map(req => (
                <div key={req.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                {req.request_type === 'leave' ? 'Đơn Xin Nghỉ Phép' : 'Đơn Giải Trình'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                (Ngày gửi: {formatDate(req.created_at)})
                            </span>
                        </div>
                        {getStatusStyle(req.status)}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <div>
                                <span className="text-slate-400 dark:text-slate-500">Ngày áp dụng: </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {formatDate(req.start_date)}
                                    {req.end_date && req.end_date !== req.start_date && ` - ${formatDate(req.end_date)}`}
                                </span>
                            </div>
                            {req.request_type === 'explanation' && (req.actual_in_time || req.actual_out_time) && (
                                <div><span className="text-slate-400 dark:text-slate-500">Giờ khai báo: </span><span className="font-medium text-blue-600 dark:text-blue-400">{req.actual_in_time?.substring(0, 5) || '--:--'} đến {req.actual_out_time?.substring(0, 5) || '--:--'}</span></div>
                            )}
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 dark:text-slate-500">Lý do: </span> <span className="italic">"{req.reason}"</span>
                        </div>
                        {req.approver_note && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-500/20 transition-colors">
                                <strong>Quản lý phản hồi:</strong> {req.approver_note}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}