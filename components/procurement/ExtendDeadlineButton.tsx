"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extendRfqDeadlineAction } from "@/lib/action/procurement";
import { toVNDatetimeLocal, formatVNDate } from "@/lib/utils/date";

interface Props {
    rfqId: string;
    currentDeadline: string;
}

export function ExtendDeadlineButton({ rfqId, currentDeadline }: Props) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // SỬ DỤNG HÀM UTILS ĐỂ ĐỊNH DẠNG GIỜ VIỆT NAM
    const formattedCurrent = toVNDatetimeLocal(currentDeadline);
    const [newDeadline, setNewDeadline] = useState(formattedCurrent);

    const handleExtend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeadline) return toast.warning("Vui lòng chọn ngày giờ mới!");

        if (new Date(newDeadline) <= new Date(currentDeadline)) {
            return toast.warning("Hạn chót mới phải xa hơn hạn chót cũ!");
        }

        setIsSubmitting(true);
        // Lưu ý: new Date(newDeadline).toISOString() sẽ tự động dịch ngược từ VN Time về UTC trước khi lưu xuống DB
        const res = await extendRfqDeadlineAction(rfqId, new Date(newDeadline).toISOString());

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
        } else {
            toast.error("Lỗi khi gia hạn: " + res.error);
        }
        setIsSubmitting(false);
    };

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
            >
                <CalendarClock className="w-4 h-4 mr-2" /> Gia hạn
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700">
                            <CalendarClock className="w-5 h-5" /> Gia hạn Gói thầu
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleExtend} className="space-y-4 pt-4">
                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-200">
                            {/* DÙNG HÀM ĐỂ HIỂN THỊ TEXT ĐẸP MẮT */}
                            Thời gian đóng thầu: <strong>{formatVNDate(currentDeadline)}</strong><br />
                            Lưu ý: Các link báo giá của Nhà cung cấp cũng sẽ được tự động gia hạn theo thời gian mới này.
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">Thời gian đóng thầu gia hạn <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                type="datetime-local"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy bỏ</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Xác nhận gia hạn"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}