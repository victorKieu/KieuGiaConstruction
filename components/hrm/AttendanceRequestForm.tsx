"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
        actual_in_time: "",
        actual_out_time: "",
        reason: ""
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Tự động reset sub_type nếu đổi loại đơn
        if (field === 'request_type') {
            setFormData(prev => ({ ...prev, sub_type: value === 'leave' ? 'annual' : 'forgot_in' }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.start_date || !formData.reason || !formData.sub_type) {
            toast.error("Vui lòng điền đầy đủ Ngày, Lý do và Loại đơn.");
            return;
        }

        setIsSubmitting(true);
        const res = await submitAttendanceRequest(formData);

        if (res.success) {
            toast.success(res.message);
            // Reset form sau khi gửi thành công
            setFormData(prev => ({ ...prev, reason: "", actual_in_time: "", actual_out_time: "" }));
        } else {
            toast.error(res.error);
        }
        setIsSubmitting(false);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-xl text-slate-800">Tạo đơn từ / Giải trình</CardTitle>
                <CardDescription>Gửi yêu cầu để Quản lý hoặc HR phê duyệt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Loại đơn */}
                    <div className="space-y-2">
                        <Label>Loại yêu cầu <span className="text-red-500">*</span></Label>
                        <Select value={formData.request_type} onValueChange={(v) => handleChange('request_type', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn loại đơn" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="explanation">Giải trình chấm công</SelectItem>
                                <SelectItem value="leave">Xin nghỉ phép</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Phân loại chi tiết */}
                    <div className="space-y-2">
                        <Label>Chi tiết <span className="text-red-500">*</span></Label>
                        <Select value={formData.sub_type} onValueChange={(v) => handleChange('sub_type', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn chi tiết" />
                            </SelectTrigger>
                            <SelectContent>
                                {formData.request_type === 'explanation' ? (
                                    <>
                                        <SelectItem value="forgot_in">Quên chấm VÀO</SelectItem>
                                        <SelectItem value="forgot_out">Quên chấm RA</SelectItem>
                                        <SelectItem value="field_work">Đi công tác / Ra ngoài</SelectItem>
                                        <SelectItem value="system_error">Lỗi hệ thống</SelectItem>
                                    </>
                                ) : (
                                    <>
                                        <SelectItem value="annual">Nghỉ phép năm</SelectItem>
                                        <SelectItem value="unpaid">Nghỉ không lương</SelectItem>
                                        <SelectItem value="sick">Nghỉ ốm / Thai sản</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Ngày áp dụng */}
                <div className="space-y-2">
                    <Label>Ngày áp dụng <span className="text-red-500">*</span></Label>
                    <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleChange('start_date', e.target.value)}
                    />
                </div>

                {/* Khai báo giờ thực tế (Chỉ hiện khi giải trình quên chấm công) */}
                {formData.request_type === 'explanation' && (formData.sub_type === 'forgot_in' || formData.sub_type === 'forgot_out') && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="space-y-2">
                            <Label className="text-orange-800">Giờ VÀO thực tế</Label>
                            <Input
                                type="time"
                                value={formData.actual_in_time}
                                onChange={(e) => handleChange('actual_in_time', e.target.value)}
                                disabled={formData.sub_type === 'forgot_out'} // Khóa ô nếu chỉ quên giờ RA
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-orange-800">Giờ RA thực tế</Label>
                            <Input
                                type="time"
                                value={formData.actual_out_time}
                                onChange={(e) => handleChange('actual_out_time', e.target.value)}
                                disabled={formData.sub_type === 'forgot_in'} // Khóa ô nếu chỉ quên giờ VÀO
                            />
                        </div>
                    </div>
                )}

                {/* Lý do chi tiết */}
                <div className="space-y-2">
                    <Label>Lý do chi tiết <span className="text-red-500">*</span></Label>
                    <Textarea
                        placeholder="Vui lòng ghi rõ lý do (VD: Đi gặp khách hàng tại quận 1, quên mang điện thoại...)"
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        rows={4}
                    />
                </div>

            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4 flex justify-end">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Gửi đơn phê duyệt
                </Button>
            </CardFooter>
        </Card>
    );
}