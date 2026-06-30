"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { FileText, CreditCard, Plus, Loader2, ArrowRight, Send } from "lucide-react";

// Thay đổi API import: Dùng createPaymentRequestAction thay vì thanh toán trực tiếp
import { createSupplierInvoiceAction, createPaymentRequestAction } from "@/lib/action/finance";
import { formatCurrency } from "@/lib/utils/utils";

interface Props {
    pendingPOs: any[];
    invoices: any[];
}

export default function AccountsPayableManager({ pendingPOs, invoices }: Props) {
    return (
        <Tabs defaultValue="invoices" className="space-y-4 transition-colors">
            <TabsList className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <TabsTrigger value="invoices" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors"><FileText className="w-4 h-4" /> Hóa đơn & Công nợ</TabsTrigger>
                <TabsTrigger value="pending" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors"><Plus className="w-4 h-4" /> Chờ ghi nhận ({(pendingPOs || []).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-950 transition-colors">
                    <CardHeader className="border-b dark:border-slate-800 transition-colors bg-slate-50 dark:bg-slate-900/50">
                        <CardTitle className="dark:text-slate-100 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-500" /> Danh sách Hóa đơn đầu vào (Phải trả NCC)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 transition-colors">
                        <div className="overflow-x-auto">
                            <Table className="bg-white dark:bg-slate-950 transition-colors">
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 transition-colors">
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Số HĐ / Ngày</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Nhà Cung Cấp</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Theo đơn (PO)</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Tổng tiền</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Đã trả</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Còn nợ</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                    {(invoices || []).length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">Chưa có dữ liệu công nợ</TableCell></TableRow>
                                    ) : (invoices || []).map((inv) => {
                                        const total = Number(inv.total_amount) || 0;
                                        const paid = Number(inv.paid_amount) || 0;
                                        const debt = total - paid;
                                        // @ts-ignore
                                        const supplierName = inv.po?.supplier?.name || "N/A";

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-none">
                                                <TableCell className="align-top py-4">
                                                    <div className="font-bold text-blue-700 dark:text-blue-400 transition-colors">{inv.invoice_number}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors mt-0.5">{format(new Date(inv.invoice_date), "dd/MM/yyyy")}</div>
                                                    <Badge variant="outline" className="text-[10px] mt-1.5 h-5 px-1.5 dark:border-slate-700 dark:text-slate-300 transition-colors uppercase tracking-wider">{inv.invoice_type}</Badge>
                                                </TableCell>
                                                <TableCell className="align-top py-4 font-semibold text-slate-800 dark:text-slate-200 transition-colors">
                                                    {supplierName}
                                                </TableCell>
                                                <TableCell className="align-top py-4">
                                                    <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300 transition-colors">{inv.po?.code}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 transition-colors mt-0.5">{inv.po?.project?.name}</div>
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right font-bold text-slate-800 dark:text-slate-100 text-base transition-colors">
                                                    {formatCurrency(total)}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right font-bold text-green-600 dark:text-green-400 transition-colors">
                                                    {formatCurrency(paid)}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right font-black text-red-600 dark:text-red-400 transition-colors">
                                                    {debt > 0 ? formatCurrency(debt) : "-"}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-center">
                                                    {inv.payment_status === 'paid' && <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-500/20 dark:text-green-400 border-none transition-colors">Đã xong</Badge>}
                                                    {inv.payment_status === 'partial' && <Badge className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-none transition-colors">1 Phần</Badge>}
                                                    {inv.payment_status === 'pending' && <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300 border-none transition-colors">Chưa trả</Badge>}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right">
                                                    {debt > 0 && <PaymentRequestDialog invoice={inv} debtAmount={debt} supplierName={supplierName} />}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="pending">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(pendingPOs || []).length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors italic">
                            Tất cả đơn đặt hàng (PO) nhập kho đều đã có hóa đơn.
                        </div>
                    )}
                    {(pendingPOs || []).map((po) => (
                        <Card key={po.id} className="border-l-4 border-l-blue-500 dark:border-l-blue-600 shadow-sm hover:shadow-md dark:bg-slate-950 dark:border-y-slate-800 dark:border-r-slate-800 transition-all">
                            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-mono font-bold text-lg text-slate-800 dark:text-slate-100 transition-colors">{po.code}</div>
                                    <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">{format(new Date(po.created_at), "dd/MM")}</Badge>
                                </div>
                                <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 line-clamp-1 transition-colors">{po.supplier?.name}</div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Giá trị đơn hàng</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-slate-100 transition-colors">{formatCurrency(Number(po.total_amount))}</p>
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

// --- HELPER: FORMAT INPUT TIỀN TỆ ---
const formatInputMoney = (val: number | string) => {
    if (!val) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(val));
};

// --- DIALOG 1: GHI NHẬN HÓA ĐƠN TỪ PO ---
function CreateInvoiceDialog({ po }: { po: any }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [invNum, setInvNum] = useState("");
    const [type, setType] = useState<"VAT" | "RETAIL">("VAT");
    const [vatRate, setVatRate] = useState(10);

    const [totalRaw, setTotalRaw] = useState(Number(po.total_amount));
    const [totalDisplay, setTotalDisplay] = useState(formatInputMoney(po.total_amount));

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        setTotalDisplay(formatInputMoney(rawValue));
        setTotalRaw(Number(rawValue));
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
            total_amount: totalRaw,
        });

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                    Tạo HĐ <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <DialogHeader>
                    <DialogTitle className="dark:text-slate-100 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Ghi nhận Hóa đơn NCC</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Hệ thống sẽ tự động hạch toán tăng Công nợ (Có 331) và tăng Chi phí (Nợ 154).</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Số hóa đơn <span className="text-red-500">*</span></Label>
                            <Input required value={invNum} onChange={e => setInvNum(e.target.value)} placeholder="VD: 0012345" className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 font-mono transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Loại hóa đơn</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 font-semibold transition-colors"><SelectValue /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="VAT" className="dark:text-slate-200">Hóa đơn VAT (Đỏ)</SelectItem>
                                    <SelectItem value="RETAIL" className="dark:text-slate-200">Hóa đơn Bán lẻ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50 space-y-4 transition-colors">
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Tổng thanh toán thực tế (Theo HĐ)</Label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    required
                                    value={totalDisplay}
                                    onChange={handleMoneyChange}
                                    className="font-bold text-xl pr-8 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-blue-400 text-blue-700 transition-colors h-12"
                                />
                                <span className="absolute right-4 top-3.5 text-slate-400 font-bold">đ</span>
                            </div>
                        </div>
                        {type === 'VAT' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Thuế suất VAT (%)</Label>
                                <Input type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 transition-colors" />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="pt-2 border-t dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Hủy</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] transition-colors">
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Lưu hóa đơn & Ghi sổ"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- DIALOG 2: LẬP ĐỀ NGHỊ THANH TOÁN (THAY VÌ CHI TIỀN TRỰC TIẾP) ---
function PaymentRequestDialog({ invoice, debtAmount, supplierName }: { invoice: any, debtAmount: number, supplierName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [amountRaw, setAmountRaw] = useState(debtAmount);
    const [amountDisplay, setAmountDisplay] = useState(formatInputMoney(debtAmount));
    const [note, setNote] = useState(`Thanh toán công nợ HĐ ${invoice.invoice_number}`);

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (Number(rawValue) > debtAmount) {
            toast.warning("Không thể lập đề nghị vượt quá số tiền nợ!");
        }
        setAmountDisplay(formatInputMoney(rawValue));
        setAmountRaw(Number(rawValue));
    };

    const handleCreateRequest = async () => {
        if (amountRaw <= 0 || amountRaw > debtAmount) return toast.error("Số tiền không hợp lệ");

        setLoading(true);
        // GỌI API LẬP ĐỀ NGHỊ (Sẽ đẩy qua màn hình Sổ Quỹ)
        const res = await createPaymentRequestAction({
            type: 'payment', // Loại: Chi tiền
            amount: amountRaw,
            description: note,
            partner_name: supplierName,
            project_id: invoice.po?.project_id || null
        });

        setLoading(false);
        if (res.success) {
            toast.success("Đã gửi Đề nghị thanh toán sang Kế toán trưởng!");
            setOpen(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors shadow-sm font-semibold">
                    <Send className="w-3 h-3 mr-1.5" /> Lập Đề nghị chi
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <DialogHeader>
                    <DialogTitle className="dark:text-slate-100 flex items-center gap-2"><Send className="w-5 h-5 text-amber-500" /> Lập Đề nghị Thanh toán</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Phiếu đề nghị sẽ được chuyển sang Sổ Quỹ để Kế toán trưởng duyệt và Thủ quỹ chi tiền.</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm space-y-2.5 border border-slate-200 dark:border-slate-800 transition-colors">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Nhà cung cấp:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border dark:border-slate-700">{supplierName}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Số hóa đơn tham chiếu:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-300">{invoice.invoice_number}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-600 dark:text-red-400 border-t border-slate-200 dark:border-slate-800 pt-2.5 mt-1">
                            <span className="font-bold uppercase tracking-wider text-xs">Dư nợ hiện tại:</span>
                            <span className="font-black text-lg">{formatCurrency(debtAmount)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Số tiền đề nghị chi (VND) <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input
                                type="text"
                                value={amountDisplay}
                                onChange={handleMoneyChange}
                                className="font-black text-amber-700 dark:text-amber-400 text-xl pr-8 h-12 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-500 transition-colors"
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold">đ</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Nội dung chi</Label>
                        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="VD: TT HĐ 001..." className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors h-10" />
                    </div>
                </div>
                <DialogFooter className="pt-2 border-t dark:border-slate-800 mt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Hủy</Button>
                    <Button onClick={handleCreateRequest} disabled={loading || amountRaw <= 0} className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white min-w-[150px] transition-colors shadow-md">
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Gửi Đề nghị chi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}