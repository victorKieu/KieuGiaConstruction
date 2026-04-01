"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, AlertCircle, CalendarDays, Loader2, User, FileText, Send } from "lucide-react";
import { toast } from "sonner";

// Import API đã viết từ trước
import { getPendingRequests, processAttendanceRequest } from "@/lib/action/attendanceActions";

export default function ApprovalDashboardPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Quản lý trạng thái đang submit của từng thẻ
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Lưu ghi chú của quản lý cho từng đơn
    const [notes, setNotes] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
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
            // Cập nhật lại UI: Xóa thẻ đã duyệt khỏi danh sách chờ
            setRequests(prev => prev.filter(req => req.id !== id));

            // Xóa note
            const newNotes = { ...notes };
            delete newNotes[id];
            setNotes(newNotes);
        } else {
            toast.error(res.error);
        }
        setProcessingId(null);
    };

    // Hàm tiện ích: Dịch mã loại đơn ra tiếng Việt và chọn màu Badge
    const getRequestTypeInfo = (type: string, subType: string) => {
        if (type === 'leave') {
            const types: any = { annual: 'Nghỉ phép năm', unpaid: 'Nghỉ không lương', sick: 'Ốm/Thai sản', urgent: 'Nghỉ đột xuất' };
            return { label: `Xin nghỉ: ${types[subType] || subType}`, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CalendarDays };
        } else {
            const types: any = { forgot_in: 'Quên chấm VÀO', forgot_out: 'Quên chấm RA', wrong_time: 'Lỗi chấm công', field_work: 'Công tác thực địa' };
            return { label: `Giải trình: ${types[subType] || subType}`, color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle };
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header Trang */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Duyệt Đơn Từ & Giải Trình</h1>
                    <p className="text-sm text-slate-500">Xem xét và phê duyệt các yêu cầu từ nhân viên</p>
                </div>
                <Button variant="outline" onClick={loadData} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                    Làm mới dữ liệu
                </Button>
            </div>

            {/* Vùng hiển thị dữ liệu */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : requests.length === 0 ? (
                <div className="p-16 text-center bg-slate-50 border border-slate-200 rounded-xl border-dashed">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-medium text-slate-700">Tất cả đã hoàn thành!</h3>
                    <p className="text-slate-500 mt-2">Hiện tại không có đơn từ nào đang chờ sếp duyệt.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map((req) => {
                        const typeInfo = getRequestTypeInfo(req.request_type, req.sub_type);
                        const Icon = typeInfo.icon;
                        const empName = req.employee?.name || 'Nhân viên vô danh';
                        const empCode = req.employee?.code || '???';

                        return (
                            <Card key={req.id} className="shadow-sm border-slate-200 flex flex-col hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 border-b bg-slate-50/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className={typeInfo.color}>
                                            <Icon className="w-3 h-3 mr-1" /> {typeInfo.label}
                                        </Badge>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {new Date(req.created_at).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    <div className="font-bold text-lg text-slate-800 flex items-center">
                                        <User className="w-4 h-4 mr-2 text-slate-400" /> {empName}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">Mã NV: {empCode}</div>
                                </CardHeader>

                                <CardContent className="text-sm flex-1 pt-4 space-y-3">
                                    {/* Thông tin ngày tháng */}
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-md border border-slate-100">
                                        <span className="text-slate-500">Ngày áp dụng:</span>
                                        <span className="font-bold text-slate-700">
                                            {new Date(req.start_date).toLocaleDateString('vi-VN')}
                                            {req.end_date && req.end_date !== req.start_date && ` - ${new Date(req.end_date).toLocaleDateString('vi-VN')}`}
                                        </span>
                                    </div>

                                    {/* Khung Giờ thực tế (Chỉ cho đơn giải trình) */}
                                    {req.request_type === 'explanation' && (req.actual_in_time || req.actual_out_time) && (
                                        <div className="flex justify-between items-center bg-orange-50 p-2 rounded-md border border-orange-100">
                                            <span className="text-orange-700">Giờ khai báo:</span>
                                            <span className="font-bold text-orange-700">
                                                {req.actual_in_time ? req.actual_in_time.substring(0, 5) : '--:--'}
                                                <span className="text-orange-400 mx-1 font-normal">đến</span>
                                                {req.actual_out_time ? req.actual_out_time.substring(0, 5) : '--:--'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Lý do của nhân viên */}
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1 uppercase font-semibold">Lý do:</span>
                                        <p className="text-slate-700 italic bg-white border border-slate-100 p-2 rounded">
                                            "{req.reason}"
                                        </p>
                                    </div>

                                    {/* Ô nhập ghi chú của quản lý (Tùy chọn) */}
                                    <div className="pt-2">
                                        <Textarea
                                            placeholder="Ghi chú của Quản lý (Không bắt buộc)..."
                                            className="text-xs min-h-[60px] resize-none"
                                            value={notes[req.id] || ""}
                                            onChange={(e) => handleNoteChange(req.id, e.target.value)}
                                        />
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-0 flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-1/2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleProcess(req.id, 'rejected')}
                                        disabled={processingId !== null}
                                    >
                                        {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />} Từ chối
                                    </Button>
                                    <Button
                                        className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white"
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
        </div>
    );
}