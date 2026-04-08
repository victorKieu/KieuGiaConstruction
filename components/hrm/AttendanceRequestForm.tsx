"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { submitAttendanceRequest } from "@/lib/action/attendanceActions";

export function AttendanceRequestForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        request_type: "explanation",
        sub_type: "forgot_in",
        start_date: new Date().toLocaleDateString('en-CA'),
        actual_in_time: "",      // Giờ đi trễ thực tế
        requested_in_time: "",   // Giờ xin sửa thành
        actual_out_time: "",     // Giờ về sớm thực tế
        requested_out_time: "",  // Giờ xin sửa thành
        reason: ""
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'request_type') {
            setFormData(prev => ({ ...prev, sub_type: value === 'leave' ? 'annual' : 'forgot_in' }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.reason) {
            toast.error("Vui lòng nhập lý do!");
            return;
        }
        setIsSubmitting(true);
        const res = await submitAttendanceRequest(formData);
        if (res.success) {
            toast.success("Đã gửi đơn thành công!");
            // Reset form
            setFormData(prev => ({ ...prev, reason: "", actual_in_time: "", requested_in_time: "", actual_out_time: "", requested_out_time: "" }));
        } else {
            toast.error(res.error || "Có lỗi xảy ra");
        }
        setIsSubmitting(false);
    };

    return (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b pb-4">
                <CardTitle className="text-lg">Tạo Đơn / Giải Trình</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Loại đơn</Label>
                        <Select value={formData.request_type} onValueChange={(val) => handleChange('request_type', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="explanation">Giải trình chấm công</SelectItem>
                                <SelectItem value="leave">Xin nghỉ phép</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Chi tiết</Label>
                        <Select value={formData.sub_type} onValueChange={(val) => handleChange('sub_type', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {formData.request_type === 'explanation' ? (
                                    <>
                                        <SelectItem value="forgot_in">Quên chấm / Đi trễ (Sáng)</SelectItem>
                                        <SelectItem value="forgot_out">Quên chấm / Về sớm (Chiều)</SelectItem>
                                        <SelectItem value="forgot_both">Thiếu cả 2 buổi</SelectItem>
                                        <SelectItem value="field_work">Đi công tác bên ngoài</SelectItem>
                                    </>
                                ) : (
                                    <>
                                        <SelectItem value="annual">Nghỉ phép năm (Có lương)</SelectItem>
                                        <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                        <SelectItem value="sick">Nghỉ ốm</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Ngày áp dụng</Label>
                    <Input type="date" value={formData.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
                </div>

                {/* ✅ KHU VỰC NHẬP GIỜ: ĐỐI CHIẾU RÕ RÀNG THỰC TẾ VÀ ĐỀ XUẤT */}
                {formData.request_type === 'explanation' && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-300">Khai báo chênh lệch giờ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Ca Sáng */}
                            <div className="space-y-3">
                                <div className="border-l-4 border-amber-500 pl-3">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Giờ đi trễ (Trên máy)</Label>
                                    <Input
                                        type="time" className="mt-1 bg-white"
                                        value={formData.actual_in_time}
                                        onChange={(e) => handleChange('actual_in_time', e.target.value)}
                                        disabled={formData.sub_type === 'forgot_out'}
                                    />
                                </div>
                                <div className="border-l-4 border-emerald-500 pl-3">
                                    <Label className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Giờ xin sửa thành</Label>
                                    <Input
                                        type="time" className="mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500"
                                        value={formData.requested_in_time}
                                        onChange={(e) => handleChange('requested_in_time', e.target.value)}
                                        disabled={formData.sub_type === 'forgot_out'}
                                    />
                                </div>
                            </div>

                            {/* Ca Chiều */}
                            <div className="space-y-3">
                                <div className="border-l-4 border-amber-500 pl-3">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Giờ về sớm (Trên máy)</Label>
                                    <Input
                                        type="time" className="mt-1 bg-white"
                                        value={formData.actual_out_time}
                                        onChange={(e) => handleChange('actual_out_time', e.target.value)}
                                        disabled={formData.sub_type === 'forgot_in'}
                                    />
                                </div>
                                <div className="border-l-4 border-emerald-500 pl-3">
                                    <Label className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Giờ xin sửa thành</Label>
                                    <Input
                                        type="time" className="mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500"
                                        value={formData.requested_out_time}
                                        onChange={(e) => handleChange('requested_out_time', e.target.value)}
                                        disabled={formData.sub_type === 'forgot_in'}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Lý do chi tiết <span className="text-red-500">*</span></Label>
                    <Textarea
                        placeholder="Ghi rõ lý do (VD: Máy hư, Kẹt xe 45 phút tại ngã tư...)"
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        rows={3}
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t py-4 flex justify-end">
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Gửi đơn
                </Button>
            </CardFooter>
        </Card>
    );
}