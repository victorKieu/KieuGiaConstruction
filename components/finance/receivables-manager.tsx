"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { createPaymentRequestAction } from "@/lib/action/finance";

export default function ReceivablesManager({ milestones }: { milestones: any[] }) {
    return (
        <Card className="border-l-4 border-l-emerald-500 dark:border-l-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
            <CardHeader className="pb-2 border-b border-emerald-100 dark:border-emerald-900/30">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                    <ArrowUpRight className="w-5 h-5" /> Quản lý Đợt thanh toán (Phải Thu Khách Hàng)
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0 md:p-6">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-emerald-100/50 dark:bg-emerald-900/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50">
                            <TableHead className="font-bold text-emerald-900 dark:text-emerald-300">Dự án / Hợp đồng</TableHead>
                            <TableHead className="font-bold text-emerald-900 dark:text-emerald-300">Đợt thanh toán</TableHead>
                            <TableHead className="font-bold text-emerald-900 dark:text-emerald-300">Hạn thanh toán</TableHead>
                            <TableHead className="text-right font-bold text-emerald-900 dark:text-emerald-300">Số tiền (VNĐ)</TableHead>
                            <TableHead className="text-right font-bold text-emerald-900 dark:text-emerald-300">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {milestones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
                                        <span>Tuyệt vời! Không có công nợ phải thu nào đang treo.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            milestones.map((m) => {
                                const isOverdue = m.due_date && new Date(m.due_date) < new Date();
                                const customerName = m.contracts?.projects?.customer?.name || "Khách hàng";

                                return (
                                    <TableRow key={m.id} className="dark:hover:bg-slate-800/50 dark:border-slate-800">
                                        <TableCell>
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{m.contracts?.projects?.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                                HĐ: {m.contracts?.contract_number} | KH: {customerName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">{m.name}</TableCell>
                                        <TableCell>
                                            <div className={isOverdue ? "text-red-600 dark:text-red-400 font-bold flex items-center gap-1" : "text-slate-600 dark:text-slate-400 font-medium"}>
                                                {m.due_date ? format(new Date(m.due_date), "dd/MM/yyyy") : "---"}
                                                {isOverdue && <AlertCircle className="w-3 h-3" />}
                                                {isOverdue && <Badge variant="outline" className="ml-1 text-[9px] border-red-200 bg-red-50 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">Quá hạn</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-emerald-700 dark:text-emerald-400 text-base">
                                            {formatCurrency(m.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ReceiptRequestDialog milestone={m} customerName={customerName} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// --- DIALOG: LẬP ĐỀ NGHỊ BÁO CÓ (THU TIỀN) ---
function ReceiptRequestDialog({ milestone, customerName }: { milestone: any, customerName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState(`Thu tiền đợt: ${milestone.name} - HĐ ${milestone.contracts?.contract_number}`);

    const handleCreateReceipt = async () => {
        setLoading(true);
        // GỌI API LẬP ĐỀ NGHỊ THU TIỀN ĐẨY SANG SỔ QUỸ
        const res = await createPaymentRequestAction({
            type: 'receipt', // Loại: Thu tiền
            amount: milestone.amount,
            description: note,
            partner_name: customerName,
            project_id: milestone.contracts?.projects?.id || null
        });

        setLoading(false);
        if (res.success) {
            toast.success("Đã tạo Đề nghị Ghi nhận Thu tiền!");
            setOpen(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 shadow-sm font-semibold transition-colors">
                    <Download className="w-3 h-3 mr-1.5" /> Báo Cáo Có (Thu tiền)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 dark:text-slate-100"><Download className="w-5 h-5 text-emerald-500" /> Lập Đề Nghị Báo Có</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Ghi nhận thông tin khách hàng thanh toán gửi Kế toán trưởng duyệt.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                            <span>Khách hàng:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{customerName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Đợt thanh toán:</span>
                            <span className="font-semibold">{milestone.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-emerald-200 dark:border-emerald-800/50 pt-2 mt-2">
                            <span className="font-bold uppercase tracking-wider text-xs">Số tiền cần thu:</span>
                            <span className="font-black text-lg text-emerald-700 dark:text-emerald-400">{formatCurrency(milestone.amount)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300">Diễn giải thu tiền <span className="text-red-500">*</span></Label>
                        <Input
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy bỏ</Button>
                    <Button onClick={handleCreateReceipt} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] dark:bg-emerald-600 dark:hover:bg-emerald-500">
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Gửi Đề nghị Báo Có"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}