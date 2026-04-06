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
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                    <Banknote className="mr-2 h-4 w-4" />
                    Thanh toán
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <DialogHeader>
                    <DialogTitle className="dark:text-slate-100 flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-blue-500" /> Lập phiếu chi - Đơn {poCode}
                    </DialogTitle>
                    <DialogDescription className="dark:text-slate-400">
                        Tạo giao dịch tài chính và trừ công nợ cho nhà cung cấp.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">

                    {/* 1. Số tiền & Dư nợ */}
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-2 transition-colors shadow-sm">
                        <div className="text-sm flex flex-col items-center justify-center gap-1">
                            <span className="uppercase font-bold tracking-wider text-[11px] text-blue-600/70 dark:text-blue-400/70">Còn phải trả (Dư nợ)</span>
                            <span className="font-black text-2xl text-blue-700 dark:text-blue-400 tracking-tight">{formatMoney(remainingAmount)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Số tiền thanh toán (VNĐ)</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="font-bold text-lg h-12 pr-8 bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 focus-visible:ring-blue-500 transition-colors"
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold">đ</span>
                        </div>
                    </div>

                    {/* 2. Ngày & Hạng mục */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="space-y-2 flex flex-col">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Ngày chi</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors", !date && "text-muted-foreground dark:text-slate-500")}>
                                        {date ? format(date, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 dark:bg-slate-900 dark:border-slate-800" align="start">
                                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="dark:bg-slate-900 dark:text-slate-200" />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Hạng mục chi <span className="text-red-500">*</span></Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 transition-colors">
                                    <SelectValue placeholder="Chọn..." />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    {categories.map(c => <SelectItem key={c.id} value={c.id} className="dark:text-slate-200">{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 3. Hình thức & Ghi chú */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Hình thức thanh toán</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="h-10 bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 transition-colors">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="transfer" className="dark:text-slate-200 font-medium">Chuyển khoản</SelectItem>
                                    <SelectItem value="cash" className="dark:text-slate-200 font-medium">Tiền mặt</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Nội dung chi</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-10 bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 transition-colors"
                            />
                        </div>
                    </div>

                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                        Hủy bỏ
                    </Button>
                    <Button onClick={handlePayment} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md transition-colors">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Xác nhận Chi tiền
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}