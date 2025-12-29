"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreditCard, Loader2, Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";

import { createPaymentForPOAction, getExpenseCategories } from "@/lib/action/procurement";

interface PaymentDialogProps {
    poId: string;
    poCode: string;
    projectId: string;
    remainingAmount: number; // Số tiền còn nợ
}

export function PaymentDialog({ poId, poCode, projectId, remainingAmount }: PaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [amount, setAmount] = useState(remainingAmount);
    const [categoryId, setCategoryId] = useState("");
    const [method, setMethod] = useState("transfer");
    const [date, setDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState(`Thanh toán đơn hàng ${poCode}`);

    // Data State
    const [categories, setCategories] = useState<any[]>([]);

    // Load danh mục chi khi mở dialog
    useEffect(() => {
        if (open) {
            getExpenseCategories().then(setCategories);
            setAmount(remainingAmount); // Reset số tiền về dư nợ
        }
    }, [open, remainingAmount]);

    async function handlePayment() {
        if (!categoryId) {
            toast.error("Vui lòng chọn hạng mục chi (VD: Chi mua vật tư)");
            return;
        }
        if (amount <= 0) {
            toast.error("Số tiền thanh toán phải lớn hơn 0");
            return;
        }

        setLoading(true);
        const res = await createPaymentForPOAction(
            poId,
            projectId,
            amount,
            categoryId,
            date,
            method,
            notes
        );
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
        } else {
            toast.error(res.error);
        }
    }

    const formatMoney = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Banknote className="mr-2 h-4 w-4" />
                    Thanh toán
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Lập phiếu chi - Đơn {poCode}</DialogTitle>
                    <DialogDescription>
                        Tạo giao dịch tài chính và trừ công nợ cho nhà cung cấp.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">

                    {/* 1. Số tiền & Dư nợ */}
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-100 mb-2">
                        <div className="text-sm text-blue-600 flex justify-between">
                            <span>Còn phải trả:</span>
                            <span className="font-bold">{formatMoney(remainingAmount)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Số tiền thanh toán</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="font-bold"
                        />
                    </div>

                    {/* 2. Ngày & Hạng mục */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-col">
                            <Label>Ngày chi</Label>
                            <Popover>
                                <PopoverTrigger asChild><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !date && "text-muted-foreground")}>{date ? format(date, "dd/MM/yyyy") : <span>Chọn ngày</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Hạng mục chi <span className="text-red-500">*</span></Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 3. Hình thức & Ghi chú */}
                    <div className="space-y-2">
                        <Label>Hình thức thanh toán</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="transfer">Chuyển khoản</SelectItem>
                                <SelectItem value="cash">Tiền mặt</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Nội dung chi</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>

                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Hủy</Button>
                    <Button onClick={handlePayment} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Xác nhận Chi tiền
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}