"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    CalendarIcon, Loader2, CheckCircle2, CreditCard, Wallet, Banknote
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { cn, formatCurrency } from "@/lib/utils/utils";
// ✅ Import hàm action vừa tạo ở bước trước
import { receiveContractPayment } from "@/lib/action/paymentActions";

interface Props {
    milestone: {
        id: string;
        name: string;
        amount: number;
        status: string;
    };
    projectId: string;
    onSuccess?: () => void; // Callback để reload danh sách cha nếu cần
}

export function PaymentConfirmationDialog({ milestone, projectId, onSuccess }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [paymentDate, setPaymentDate] = useState<Date>(new Date());
    const [method, setMethod] = useState("transfer"); // transfer | cash
    const [note, setNote] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await receiveContractPayment({
                milestone_id: milestone.id,
                project_id: projectId,
                amount: milestone.amount, // Mặc định thu đủ theo đợt
                payment_method: method,
                payment_date: paymentDate,
                notes: note
            });

            if (res.success) {
                toast.success(res.message);
                setOpen(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Lỗi hệ thống");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {/* Nút kích hoạt Dialog */}
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Xác nhận thu
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-700">
                        <Banknote className="w-5 h-5" /> Xác nhận thu tiền
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Thông tin tóm tắt */}
                    <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Đợt thanh toán:</span>
                            <span className="font-semibold text-slate-700">{milestone.name}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 mt-1">
                            <span className="text-slate-500">Số tiền thu:</span>
                            <span className="text-lg font-bold text-green-600">
                                {formatCurrency(milestone.amount)}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {/* 1. Chọn ngày thực thu */}
                        <div className="space-y-2">
                            <Label>Ngày nhận tiền</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !paymentDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {paymentDate ? format(paymentDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={paymentDate}
                                        onSelect={(d) => d && setPaymentDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* 2. Hình thức thanh toán */}
                        <div className="space-y-2">
                            <Label>Hình thức</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transfer">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-blue-500" /> Chuyển khoản
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="cash">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-orange-500" /> Tiền mặt
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Ghi chú */}
                        <div className="space-y-2">
                            <Label>Ghi chú (Tùy chọn)</Label>
                            <Textarea
                                placeholder="VD: Khách hàng chuyển khoản vào Techcombank..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="resize-none"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Xác nhận đã thu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}