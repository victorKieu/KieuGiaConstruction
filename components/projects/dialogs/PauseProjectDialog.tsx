"use client";

import { useState } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PauseCircle, AlertTriangle, Box, FileText } from "lucide-react";
import { pauseProject } from "@/lib/action/workflowActions";
import { toast } from "sonner";

interface Props {
    project: {
        id: string;
        name: string;
    };
}

export default function PauseProjectDialog({ project }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        formData.append("project_id", project.id);

        const result = await pauseProject(formData);

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
                <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                    <PauseCircle className="w-4 h-4 mr-2" />
                    Tạm dừng
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-700">
                        <PauseCircle className="w-6 h-6" />
                        Tạm dừng & Chốt khối lượng
                    </DialogTitle>
                    <DialogDescription>
                        Dự án sẽ chuyển sang trạng thái <b>Tạm dừng</b>. Các hoạt động nhập/xuất kho sẽ bị khóa.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-5 py-2">
                    {/* KHU VỰC 1: LÝ DO & THÔNG BÁO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pause_date">Ngày bắt đầu dừng</Label>
                            <Input
                                type="date"
                                id="pause_date"
                                name="pause_date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notice_code">Số Thông báo/QĐ</Label>
                            <Input id="notice_code" name="notice_code" placeholder="VD: TB-TD/01" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Lý do tạm dừng <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="reason"
                            name="reason"
                            placeholder="VD: Chờ xin điều chỉnh giấy phép, Chủ đầu tư chậm thanh toán..."
                            required
                        />
                    </div>

                    {/* KHU VỰC 2: CHỐT KHỐI LƯỢNG (QUAN TRỌNG) */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Box className="w-4 h-4" />
                            Nghiệm thu & Chốt khối lượng dở dang
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="volume_note" className="text-xs text-slate-500">
                                Tóm tắt khối lượng đã thực hiện đến thời điểm này (để quyết toán tạm):
                            </Label>
                            <Textarea
                                id="volume_note"
                                name="volume_note"
                                className="min-h-[80px] bg-white"
                                placeholder="VD: Đã xong phần móng, đổ sàn tầng 1. Vật tư tồn kho đã kiểm kê..."
                            />
                        </div>
                        <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded">
                            <AlertTriangle className="w-3 h-3 mt-0.5" />
                            <span>Hệ thống sẽ tự động tạo "Biên bản nghiệm thu điểm dừng" và khóa sổ kho.</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {loading ? "Đang xử lý..." : "Xác nhận Tạm dừng"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}