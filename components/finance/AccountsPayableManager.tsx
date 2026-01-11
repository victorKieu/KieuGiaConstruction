"use client";

import { useState, useEffect } from "react"; // Thêm useEffect
import { format } from "date-fns";
import { toast } from "sonner";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CreditCard, Plus, Loader2, ArrowRight } from "lucide-react";

import { createSupplierInvoiceAction, createPaymentToSupplierAction } from "@/lib/action/finance";
import { formatCurrency } from "@/lib/utils/utils";

interface Props {
    pendingPOs: any[];
    invoices: any[];
}

export default function AccountsPayableManager({ pendingPOs, invoices }: Props) {
    // ... (Giữ nguyên phần render Tabs và Table như cũ)
    // ... (Chỉ thay đổi logic bên trong các Dialog ở dưới)
    return (
        <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList>
                <TabsTrigger value="invoices" className="gap-2"><FileText className="w-4 h-4" /> Hóa đơn & Công nợ</TabsTrigger>
                <TabsTrigger value="pending" className="gap-2"><Plus className="w-4 h-4" /> Chờ ghi nhận ({pendingPOs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
                <Card>
                    <CardHeader><CardTitle>Danh sách Hóa đơn đầu vào (Phải trả NCC)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Số HĐ / Ngày</TableHead>
                                    <TableHead>Nhà Cung Cấp</TableHead>
                                    <TableHead>Theo đơn (PO)</TableHead>
                                    <TableHead className="text-right">Tổng tiền</TableHead>
                                    <TableHead className="text-right">Đã trả</TableHead>
                                    <TableHead className="text-right">Còn nợ</TableHead>
                                    <TableHead className="text-center">Trạng thái</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Chưa có dữ liệu công nợ</TableCell></TableRow>
                                ) : invoices.map((inv) => {
                                    const total = Number(inv.total_amount) || 0;
                                    const paid = Number(inv.paid_amount) || 0;
                                    const debt = total - paid;
                                    // @ts-ignore
                                    const supplierName = inv.supplier?.supplier?.name || "N/A";

                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <div className="font-bold text-blue-700">{inv.invoice_number}</div>
                                                <div className="text-xs text-slate-500">{format(new Date(inv.invoice_date), "dd/MM/yyyy")}</div>
                                                <Badge variant="outline" className="text-[10px] mt-1 h-5 px-1">{inv.invoice_type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{supplierName}</TableCell>
                                            <TableCell>
                                                <div className="text-sm font-mono">{inv.po?.code}</div>
                                                <div className="text-xs text-slate-500">{inv.po?.project?.name}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(total)}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600">
                                                {formatCurrency(paid)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {debt > 0 ? formatCurrency(debt) : "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {inv.payment_status === 'paid' && <Badge className="bg-green-600">Đã xong</Badge>}
                                                {inv.payment_status === 'partial' && <Badge className="bg-yellow-600">1 Phần</Badge>}
                                                {inv.payment_status === 'pending' && <Badge variant="secondary">Chưa trả</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                {debt > 0 && <PaymentDialog invoice={inv} debtAmount={debt} supplierName={supplierName} />}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="pending">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pendingPOs.length === 0 && <div className="col-span-full text-center py-10 text-slate-500 bg-white rounded border">Tất cả PO nhập kho đều đã có hóa đơn.</div>}
                    {pendingPOs.map((po) => (
                        <Card key={po.id} className="border-l-4 border-l-blue-500 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between">
                                    <div className="font-mono font-bold text-lg">{po.code}</div>
                                    <Badge variant="outline">{format(new Date(po.created_at), "dd/MM")}</Badge>
                                </div>
                                <div className="text-sm font-semibold text-slate-700">{po.supplier?.name}</div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-slate-500">Giá trị đơn hàng:</p>
                                        <p className="text-xl font-bold text-slate-900">{formatCurrency(Number(po.total_amount))}</p>
                                    </div>
                                    <CreateInvoiceDialog po={po} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>
        </Tabs>
    );
}

// --- HELPER: FORMAT INPUT TIỀN TỆ (1000000 -> 1.000.000) ---
const formatInputMoney = (val: number | string) => {
    if (!val) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(val));
};

// --- DIALOG 1: GHI NHẬN HÓA ĐƠN TỪ PO ---
function CreateInvoiceDialog({ po }: { po: any }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [invNum, setInvNum] = useState("");
    const [type, setType] = useState<"VAT" | "RETAIL">("VAT");
    const [vatRate, setVatRate] = useState(10); // 8% hoặc 10%

    // State tiền tệ (Raw number để tính toán, Display string để hiển thị)
    const [totalRaw, setTotalRaw] = useState(Number(po.total_amount));
    const [totalDisplay, setTotalDisplay] = useState(formatInputMoney(po.total_amount));

    // Hàm xử lý khi nhập tiền
    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Loại bỏ mọi ký tự không phải số
        const rawValue = e.target.value.replace(/\D/g, "");
        setTotalDisplay(formatInputMoney(rawValue)); // Format hiển thị có chấm
        setTotalRaw(Number(rawValue)); // Lưu số thực để tính toán
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        let sub = totalRaw;
        let vatAmt = 0;

        if (type === 'VAT') {
            sub = Math.round(totalRaw / (1 + vatRate / 100));
            vatAmt = totalRaw - sub;
        }

        const res = await createSupplierInvoiceAction({
            po_id: po.id,
            invoice_number: invNum,
            invoice_date: new Date(),
            invoice_type: type,
            subtotal: sub,
            vat_percent: type === 'VAT' ? vatRate : 0,
            vat_amount: vatAmt,
            total_amount: totalRaw, // Dùng số thực
        });

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
        } else {
            console.error("Lỗi:", res.error);
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm">Tạo HĐ <ArrowRight className="w-3 h-3 ml-1" /></Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ghi nhận Hóa đơn NCC (Từ PO)</DialogTitle>
                    <DialogDescription>Nhập thông tin hóa đơn nhận được từ NCC.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Số hóa đơn <span className="text-red-500">*</span></Label>
                            <Input required value={invNum} onChange={e => setInvNum(e.target.value)} placeholder="VD: 0012345" />
                        </div>
                        <div className="space-y-2">
                            <Label>Loại hóa đơn</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="VAT">Hóa đơn VAT (Đỏ)</SelectItem><SelectItem value="RETAIL">Hóa đơn Bán lẻ</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Tổng thanh toán (Theo HĐ)</Label>
                        {/* ✅ INPUT TIỀN ĐÃ FORMAT TRỰC TIẾP */}
                        <div className="relative">
                            <Input
                                type="text"
                                required
                                value={totalDisplay}
                                onChange={handleMoneyChange}
                                className="font-bold text-lg pr-8"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400 font-medium">đ</span>
                        </div>
                    </div>
                    {type === 'VAT' && (
                        <div className="space-y-2">
                            <Label>Thuế suất VAT (%)</Label>
                            <Input type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} />
                        </div>
                    )}
                    <DialogFooter><Button type="submit" disabled={loading}>{loading && <Loader2 className="animate-spin w-4 h-4 mr-2" />} Lưu công nợ</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- DIALOG 2: THANH TOÁN (Cũng áp dụng Input Format) ---
function PaymentDialog({ invoice, debtAmount, supplierName }: { invoice: any, debtAmount: number, supplierName: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [amountRaw, setAmountRaw] = useState(debtAmount);
    const [amountDisplay, setAmountDisplay] = useState(formatInputMoney(debtAmount));

    const [method, setMethod] = useState("transfer");
    const [note, setNote] = useState("");

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (Number(rawValue) > debtAmount) {
            toast.warning("Không thể nhập quá số tiền nợ!");
            // Vẫn cho nhập nhưng cảnh báo, hoặc chặn luôn tùy bạn
        }
        setAmountDisplay(formatInputMoney(rawValue));
        setAmountRaw(Number(rawValue));
    };

    const handlePay = async () => {
        if (amountRaw <= 0 || amountRaw > debtAmount) return toast.error("Số tiền không hợp lệ");

        setLoading(true);
        const res = await createPaymentToSupplierAction({
            invoice_id: invoice.id,
            amount: amountRaw,
            payment_method: method,
            payment_date: new Date(),
            notes: note
        });
        setLoading(false);
        if (res.success) { toast.success(res.message); setOpen(false); }
        else {
            console.error("Lỗi:", res.error);
            toast.error("Lỗi: " + res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"><CreditCard className="w-3 h-3 mr-1" /> Chi tiền</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Thanh toán cho Nhà Cung Cấp</DialogTitle>
                    <DialogDescription>Tạo phiếu chi để thanh toán công nợ.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="bg-slate-50 p-3 rounded text-sm space-y-2 border">
                        <div className="flex justify-between"><span>NCC:</span> <span className="font-semibold">{supplierName}</span></div>
                        <div className="flex justify-between"><span>Số HĐ:</span> <span>{invoice.invoice_number}</span></div>
                        <div className="flex justify-between text-red-600 border-t pt-1 border-slate-200"><span>Còn nợ:</span> <span className="font-bold">{formatCurrency(debtAmount)}</span></div>
                    </div>

                    <div className="space-y-2">
                        <Label>Số tiền chi (VND)</Label>
                        {/* ✅ INPUT TIỀN ĐÃ FORMAT */}
                        <div className="relative">
                            <Input
                                type="text"
                                value={amountDisplay}
                                onChange={handleMoneyChange}
                                className="font-bold text-green-700 text-lg pr-8"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400 font-medium">đ</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Hình thức</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="transfer">Chuyển khoản</SelectItem><SelectItem value="cash">Tiền mặt</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Nội dung chi</Label>
                        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="VD: TT dot 1..." />
                    </div>
                </div>
                <DialogFooter><Button onClick={handlePay} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">Xác nhận Chi</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}