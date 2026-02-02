"use client";

import { useState } from "react";
import Link from "next/link"; // Để dẫn link quay lại tab pháp lý nếu thiếu thông tin
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Hammer, AlertTriangle, FileText, CheckCircle, Info, ExternalLink
} from "lucide-react";
import { startConstructionPhase } from "@/lib/action/workflowActions";
import { toast } from "sonner";

interface Props {
    project: {
        id: string;
        is_permit_required: boolean | null; // Lấy trực tiếp từ DB
        construction_permit_code?: string | null; // Kiểm tra đã có GPXD chưa
        start_date?: string;
    };
}

export default function StartConstructionDialog({ project }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // 1. Xác định trạng thái pháp lý từ dữ liệu có sẵn
    const isPermitRequired = project.is_permit_required !== false; // Mặc định là True nếu null (an toàn)
    const hasPermitCode = !!project.construction_permit_code; // Đã nhập số GPXD chưa?

    // Validation chặn: Nếu cần phép mà chưa có số GPXD -> Không cho khởi công
    const canStart = !isPermitRequired || (isPermitRequired && hasPermitCode);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        // Gửi thông tin kèm ID và cờ is_permit_required (đã chốt từ DB)
        formData.append("project_id", project.id);
        formData.append("is_permit_required", String(isPermitRequired));

        const result = await startConstructionPhase(formData);

        setLoading(false);
        if (result.success) {
            toast.success(result.message);
            setOpen(false);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md">
                    <Hammer className="w-4 h-4 mr-2" />
                    Phát Lệnh Khởi Công
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
                        <Hammer className="w-6 h-6 text-orange-600" />
                        Phát Lệnh Khởi Công
                    </DialogTitle>
                    <DialogDescription>
                        Xác nhận thông tin để chuyển dự án sang giai đoạn <b>Đang Thi Công</b>.
                    </DialogDescription>
                </DialogHeader>

                {/* 1. HIỂN THỊ TRẠNG THÁI PHÁP LÝ HIỆN TẠI (READ-ONLY) */}
                <div className={`p-4 rounded-lg border flex items-start gap-3 ${isPermitRequired ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                    {isPermitRequired ? (
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                        <h4 className={`text-sm font-bold ${isPermitRequired ? 'text-blue-800' : 'text-green-800'}`}>
                            {isPermitRequired
                                ? "Công trình Yêu cầu Giấy phép Xây dựng"
                                : "Công trình Miễn phép / Sửa chữa nhỏ"}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                            {isPermitRequired
                                ? "Hệ thống sẽ kiểm tra ngày nộp 'Thông báo khởi công' theo quy định 07 ngày."
                                : "Hệ thống sẽ phát hành lệnh khởi công nội bộ và bỏ qua bước kiểm tra 07 ngày."}
                        </p>
                    </div>
                </div>

                {/* 2. CHECK ĐIỀU KIỆN (BLOCKING) */}
                {!canStart ? (
                    <div className="py-6 text-center space-y-4">
                        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex flex-col items-center">
                            <AlertTriangle className="w-10 h-10 text-red-600 mb-2" />
                            <h3 className="font-bold text-lg">Chưa đủ điều kiện khởi công</h3>
                            <p className="text-sm">
                                Dự án yêu cầu GPXD nhưng chưa tìm thấy <b>Số Giấy Phép</b> trong hệ thống.
                                <br />Vui lòng cập nhật thông tin tại Tab <b>Hồ sơ Pháp lý</b> trước.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
                            {/* Nút giả định chuyển tab, thực tế user phải tự bấm tab */}
                            <Button variant="secondary" disabled>
                                Vui lòng qua tab "Hồ sơ Pháp lý" cập nhật
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-6 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* CỘT TRÁI: THÔNG TIN KHỞI CÔNG */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date" className="text-blue-700 font-bold">Ngày Khởi Công Thực Tế</Label>
                                    <Input
                                        type="date"
                                        id="start_date"
                                        name="start_date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="text-[10px] text-slate-500">Mốc bắt đầu tính tiến độ thi công.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="order_code">Số Lệnh Khởi Công (Nội bộ)</Label>
                                    <Input
                                        id="order_code"
                                        name="order_code"
                                        placeholder={`LKC-${project.id.substring(0, 4).toUpperCase()}`}
                                    />
                                </div>
                            </div>

                            {/* CỘT PHẢI: LOGIC THEO LOẠI CÔNG TRÌNH */}
                            <div className={`space-y-4 p-4 rounded-md border ${isPermitRequired ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 border-b pb-2 mb-2 border-slate-200">
                                    <FileText className="w-4 h-4" />
                                    {isPermitRequired ? "Thông báo Khởi công (Bắt buộc)" : "Thông tin bổ sung"}
                                </div>

                                {isPermitRequired ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="notice_date" className="text-xs font-bold text-slate-700">
                                                Ngày nộp thông báo ra Phường <span className="text-red-500">*</span>
                                            </Label>
                                            <Input type="date" id="notice_date" name="notice_date" required />
                                            <div className="flex items-start gap-1 text-[10px] text-orange-700 font-medium">
                                                <AlertTriangle className="w-3 h-3 mt-0.5" />
                                                <span>Lưu ý: Ngày nộp phải trước Ngày khởi công ít nhất 07 ngày.</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="notice_code" className="text-xs">Số văn bản/Biên nhận</Label>
                                            <Input id="notice_code" name="notice_code" placeholder="Số biên nhận..." />
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 italic text-center gap-2 py-4">
                                        <CheckCircle className="w-8 h-8 text-slate-300" />
                                        <span>Công trình miễn phép không yêu cầu nộp thông báo khởi công ra phường.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy bỏ</Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                {loading ? "Đang xử lý..." : "Xác nhận & Phát lệnh"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}