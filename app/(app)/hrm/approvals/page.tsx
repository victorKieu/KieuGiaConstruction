"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, AlertCircle, CalendarDays, Loader2, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/utils";

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto p-4 md:p-6 transition-colors">
            {/* Header Trang */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Duyệt Đơn Từ & Giải Trình</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Xem xét và phê duyệt các yêu cầu từ nhân viên</p>
                </div>
                <Button variant="outline" onClick={loadData} disabled={isLoading} className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto shadow-sm">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                    Làm mới dữ liệu
                </Button>
            </div>

            {/* Vùng hiển thị dữ liệu */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
            ) : requests.length === 0 ? (
                <div className="p-12 md:p-16 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl border-dashed shadow-sm transition-colors">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4 transition-colors" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 transition-colors">Tất cả đã hoàn thành!</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">Hiện tại không có đơn từ nào đang chờ sếp duyệt.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map((req) => {
                        const typeInfo = getRequestTypeInfo(req.request_type, req.sub_type);
                        const Icon = typeInfo.icon;
                        const empName = req.employee?.name || 'Nhân viên vô danh';
                        const empCode = req.employee?.code || '???';

                        return (
                            <Card key={req.id} className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col hover:shadow-md transition-all duration-300 overflow-hidden">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/30 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant="outline" className={`${typeInfo.color} font-bold px-2 py-0.5 shadow-sm transition-colors`}>
                                            <Icon className="w-3.5 h-3.5 mr-1.5" /> {typeInfo.label}
                                        </Badge>
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
                                            {formatDate(req.created_at)}
                                        </span>
                                    </div>
                                    <div className="font-black text-lg text-slate-800 dark:text-slate-100 flex items-center transition-colors">
                                        <User className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> {empName}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono transition-colors">Mã NV: {empCode}</div>
                                </CardHeader>

                                <CardContent className="text-sm flex-1 pt-4 space-y-4">
                                    {/* Thông tin ngày tháng */}
                                    <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50 transition-colors">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thời gian áp dụng</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-base">
                                            {formatDate(req.start_date)}
                                            {req.end_date && req.end_date !== req.start_date && (
                                                <>
                                                    <span className="text-slate-400 dark:text-slate-500 mx-1.5 font-normal">đến</span>
                                                    {formatDate(req.end_date)}
                                                </>
                                            )}
                                        </span>
                                    </div>

                                    {/* ✅ KHUNG ĐỐI CHIẾU GIỜ MÁY & GIỜ XIN SỬA */}
                                    {req.request_type === 'explanation' && req.sub_type !== 'field_work' && (req.machine_in_time || req.machine_out_time || req.actual_in_time || req.actual_out_time) && (
                                        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Đối chiếu giờ giấc</span>

                                            {/* CA SÁNG (VÀO) */}
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

                                            {/* CA CHIỀU (RA) */}
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

                                    {/* Lý do của nhân viên */}
                                    <div className="space-y-1.5">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-bold tracking-wider transition-colors">Lý do chi tiết</span>
                                        <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg leading-relaxed shadow-inner transition-colors">
                                            "{req.reason}"
                                        </p>
                                    </div>

                                    {/* Ô nhập ghi chú của quản lý (Tùy chọn) */}
                                    <div className="pt-2">
                                        <Textarea
                                            placeholder="Ghi chú của Quản lý (Không bắt buộc)..."
                                            className="text-xs min-h-[60px] resize-none dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 focus-visible:ring-blue-500 transition-colors"
                                            value={notes[req.id] || ""}
                                            onChange={(e) => handleNoteChange(req.id, e.target.value)}
                                        />
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-0 flex gap-3 pb-5 px-6 border-t dark:border-slate-800 pt-5 mt-auto">
                                    <Button
                                        variant="outline"
                                        className="w-1/2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors font-bold shadow-sm"
                                        onClick={() => handleProcess(req.id, 'rejected')}
                                        disabled={processingId !== null}
                                    >
                                        {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />} Từ chối
                                    </Button>
                                    <Button
                                        className="w-1/2 bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white font-bold shadow-md transition-colors"
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