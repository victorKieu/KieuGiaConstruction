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

// ✅ Import các hàm API Backend thật
import { getMyAttendanceRecords, submitAttendanceRequest } from "@/lib/action/attendanceActions";

export default function AttendancePage() {
    // State chứa dữ liệu chấm công thật
    const [realRecords, setRealRecords] = useState<AttendanceRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho Form Giải trình
    const [explOpen, setExplOpen] = useState(false);
    const [explForm, setExplForm] = useState({ date: "", type: "", inTime: "", outTime: "", reason: "" });

    // State cho Form Nghỉ phép
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ type: "", startDate: "", endDate: "", reason: "" });

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
        if (!explForm.date || !explForm.type || !explForm.reason) return toast.error("Vui lòng điền đủ thông tin bắt buộc!");

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
            setExplOpen(false); // Đóng modal
            setExplForm({ date: "", type: "", inTime: "", outTime: "", reason: "" }); // Reset form
        } else {
            toast.error(res.error);
        }
    };

    // Xử lý gửi Đơn Xin nghỉ
    const handleSubmitLeave = async () => {
        if (!leaveForm.type || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
            return toast.error("Vui lòng điền đủ thông tin bắt buộc!");
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
            setLeaveOpen(false); // Đóng modal
            setLeaveForm({ type: "", startDate: "", endDate: "", reason: "" }); // Reset form
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Chấm công & Đơn từ</h1>
                    <p className="text-sm text-slate-500">Hệ thống ghi nhận thời gian làm việc và xử lý phép</p>
                </div>
            </div>

            <Tabs defaultValue="checkin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="checkin">Chấm công</TabsTrigger>
                    <TabsTrigger value="requests">Đơn từ & Phép</TabsTrigger>
                </TabsList>

                <TabsContent value="checkin" className="space-y-4 mt-4">
                    {/* GIAO DIỆN MOBILE */}
                    <div className="block md:hidden">
                        <MobileCheckIn />
                    </div>

                    {/* GIAO DIỆN DESKTOP */}
                    <div className="hidden md:block">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-3">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-700 flex items-center">
                                        <History className="w-4 h-4 mr-2 text-blue-600" /> Lịch sử chấm công của bạn
                                    </CardTitle>
                                </div>
                                <div className="flex gap-2">
                                    <Dialog open={explOpen} onOpenChange={setExplOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 h-8 text-xs">
                                                <AlertCircle className="w-3 h-3 mr-1.5" /> Báo quên / Giải trình
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="text-orange-600 flex items-center"><FileEdit className="w-5 h-5 mr-2" /> Tạo Đơn Giải Trình</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-2">
                                                <div className="space-y-2">
                                                    <Label>Ngày cần giải trình <span className="text-red-500">*</span></Label>
                                                    <Input type="date" value={explForm.date} onChange={e => setExplForm({ ...explForm, date: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Loại giải trình <span className="text-red-500">*</span></Label>
                                                    <Select onValueChange={v => setExplForm({ ...explForm, type: v })}>
                                                        <SelectTrigger><SelectValue placeholder="Chọn lý do..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="forgot_in">Quên chấm công VÀO</SelectItem>
                                                            <SelectItem value="forgot_out">Quên chấm công RA</SelectItem>
                                                            <SelectItem value="wrong_time">Chấm công sai giờ / Lỗi máy</SelectItem>
                                                            <SelectItem value="field_work">Đi công tác thực địa</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2"><Label>Giờ VÀO thực tế</Label><Input type="time" value={explForm.inTime} onChange={e => setExplForm({ ...explForm, inTime: e.target.value })} /></div>
                                                    <div className="space-y-2"><Label>Giờ RA thực tế</Label><Input type="time" value={explForm.outTime} onChange={e => setExplForm({ ...explForm, outTime: e.target.value })} /></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Lý do chi tiết <span className="text-red-500">*</span></Label>
                                                    <Textarea placeholder="Trình bày rõ lý do..." value={explForm.reason} onChange={e => setExplForm({ ...explForm, reason: e.target.value })} />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setExplOpen(false)}>Hủy</Button>
                                                <Button disabled={isSubmitting} onClick={handleSubmitExplanation} className="bg-orange-600 hover:bg-orange-700">
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi duyệt
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    {/* Nút tải lại bảng */}
                                    <Button variant="outline" className="h-8 text-xs" onClick={loadRecords} disabled={loadingRecords}>
                                        {loadingRecords ? <Loader2 className="w-3 h-3 animate-spin" /> : "Làm mới"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* ✅ HIỂN THỊ DỮ LIỆU THẬT */}
                                {loadingRecords ? (
                                    <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                                ) : (
                                    <AttendanceTable records={realRecords} />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 2: ĐƠN TỪ & NGHỈ PHÉP */}
                <TabsContent value="requests" className="mt-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-3">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-700 flex items-center">
                                    <CalendarDays className="w-4 h-4 mr-2 text-emerald-600" /> Danh sách Đơn xin nghỉ
                                </CardTitle>
                            </div>
                            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs shadow-sm">
                                        <Plus className="w-3 h-3 mr-1.5" /> Tạo Đơn Mới
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-emerald-700 flex items-center"><CalendarDays className="w-5 h-5 mr-2" /> Tạo Đơn Xin Nghỉ</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label>Loại nghỉ phép <span className="text-red-500">*</span></Label>
                                            <Select onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                                                <SelectTrigger><SelectValue placeholder="Chọn loại phép..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="annual">Nghỉ phép năm (Có lương)</SelectItem>
                                                    <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                                    <SelectItem value="sick">Nghỉ ốm / Thai sản</SelectItem>
                                                    <SelectItem value="urgent">Nghỉ đột xuất / Việc gia đình</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Từ ngày <span className="text-red-500">*</span></Label><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
                                            <div className="space-y-2"><Label>Đến ngày <span className="text-red-500">*</span></Label><Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lý do chi tiết <span className="text-red-500">*</span></Label>
                                            <Textarea placeholder="Nêu rõ lý do xin nghỉ..." className="h-24" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setLeaveOpen(false)}>Hủy</Button>
                                        <Button disabled={isSubmitting} onClick={handleSubmitLeave} className="bg-emerald-600 hover:bg-emerald-700">
                                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi Đơn
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="p-12 text-center text-slate-500">
                            <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p>Bạn chưa có đơn xin nghỉ nào (Giao diện hiển thị danh sách đơn sếp có thể mở rộng sau).</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}