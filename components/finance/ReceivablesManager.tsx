"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XMLParser } from "fast-xml-parser";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, AlertCircle, CheckCircle2, Download, Loader2, UploadCloud, FileText, Send, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";

import { createPaymentRequestAction, syncXMLSalesEntriesAction } from "@/lib/action/finance";

// --- HELPER: FORMAT INPUT TIỀN TỆ ---
const formatInputMoney = (val: number | string) => {
    if (!val) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(val));
};

export default function ReceivablesManager({ milestones, projects }: { milestones: any[], projects?: any[] }) {
    return (
        <Card className="relative border-l-4 border-l-emerald-500 bg-emerald-50/30 shadow-sm dark:border-l-emerald-600 dark:bg-emerald-950/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100 pb-2 dark:border-emerald-900/30">
                <CardTitle className="flex items-center gap-2 text-lg text-emerald-800 dark:text-emerald-400">
                    <ArrowUpRight className="h-5 w-5" /> Quản lý Đợt thanh toán (Phải Thu Khách Hàng)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 md:p-6">
                <Table>
                    <TableHeader>
                        <TableRow className="border-emerald-100 bg-emerald-100/50 hover:bg-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/20">
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
                                <TableCell colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-50" />
                                        <span>Tuyệt vời! Không có công nợ phải thu nào đang treo.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            milestones.map((m) => {
                                const isOverdue = m.due_date && new Date(m.due_date) < new Date();

                                // LOGIC "LƯỚI QUÉT 2 TẦNG"
                                // @ts-ignore
                                const contract = Array.isArray(m.contracts) ? m.contracts[0] : m.contracts;
                                const project = contract?.projects || {};
                                const customerData = contract?.customer || project?.customer || {};

                                const customerName = customerData?.name || "Chưa gắn Khách hàng";
                                const customerTaxCode = String(customerData?.tax_code || "");
                                const projectId = project?.id || null;

                                // ✅ LOGIC: TÍNH TOÁN THU 1 PHẦN (PARTIAL PAYMENT)
                                const paidAmount = Number(m.paid_amount || 0);
                                const totalAmount = Number(m.amount || 0);
                                const remainingAmount = totalAmount - paidAmount;

                                // ✅ KIỂM TRA ĐÃ HOÀN TẤT CHƯA
                                const isFullyPaid = remainingAmount <= 0 || m.status === 'completed' || m.status === 'paid';
                                const isPartialPaid = paidAmount > 0 && remainingAmount > 0;

                                return (
                                    <TableRow key={m.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50">
                                        <TableCell>
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{m.contracts?.projects?.name}</div>
                                            <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                HĐ: {m.contracts?.contract_number} | KH: {customerName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                            {m.name}
                                            {isPartialPaid && (
                                                <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-[10px] text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                                    Đang thu dở
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className={isOverdue && !isFullyPaid ? "text-red-600 dark:text-red-400 font-bold flex items-center gap-1" : "text-slate-600 dark:text-slate-400 font-medium"}>
                                                {m.due_date ? format(new Date(m.due_date), "dd/MM/yyyy") : "---"}
                                                {isOverdue && !isFullyPaid && <AlertCircle className="h-3 w-3" />}
                                                {isOverdue && !isFullyPaid && <Badge variant="outline" className="ml-1 border-red-200 bg-red-50 text-[9px] text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">Quá hạn</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-base font-black text-emerald-700 dark:text-emerald-400">
                                                {formatCurrency(remainingAmount)}
                                            </div>
                                            {/* Hiện chi tiết nếu đã thu 1 phần */}
                                            {isPartialPaid && (
                                                <div className="mt-1 font-medium text-[10px] text-slate-500">
                                                    Tổng: {formatCurrency(totalAmount)} | Đã thu: <span className="text-emerald-600">{formatCurrency(paidAmount)}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* ✅ ẨN NÚT NẾU ĐÃ THU ĐỦ */}
                                            {isFullyPaid ? (
                                                <div className="flex items-center justify-end gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Đã hoàn tất
                                                </div>
                                            ) : (
                                                <ReceiptRequestDialog
                                                    milestone={m}
                                                    customerName={customerName}
                                                    customerTaxCode={customerTaxCode}
                                                    projectId={projectId}
                                                    remainingAmount={remainingAmount} // Truyền số tiền CÒN LẠI vào Modal
                                                />
                                            )}
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

// --- DIALOG: LẬP ĐỀ NGHỊ BÁO CÓ TÍCH HỢP ĐỌC HÓA ĐƠN ---
function ReceiptRequestDialog({
    milestone, customerName, customerTaxCode, projectId, remainingAmount
}: {
    milestone: any, customerName: string, customerTaxCode: string, projectId: string, remainingAmount: number
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // STATES CHO GIAO DỊCH THU TIỀN (Sử dụng remainingAmount làm gốc)
    const [receiptType, setReceiptType] = useState<"NO_VAT" | "VAT">("NO_VAT");
    const [amountRaw, setAmountRaw] = useState(remainingAmount);
    const [amountDisplay, setAmountDisplay] = useState(formatInputMoney(remainingAmount));
    const [note, setNote] = useState(`Thu tiền đợt: ${milestone.name} - HĐ ${milestone.contracts?.contract_number}`);

    // STATES CHO XML HÓA ĐƠN
    const [xmlData, setXmlData] = useState<any>(null);
    const [xmlError, setXmlError] = useState<string>("");
    const [xmlFileName, setXmlFileName] = useState<string>("");

    // Reset data mỗi khi mở Modal
    useEffect(() => {
        if (open) {
            setReceiptType("NO_VAT");
            setAmountRaw(remainingAmount);
            setAmountDisplay(formatInputMoney(remainingAmount));
            setNote(`Thu tiền đợt: ${milestone.name} - HĐ ${milestone.contracts?.contract_number}`);
            setXmlData(null);
            setXmlError("");
            setXmlFileName("");
        }
    }, [open, milestone, remainingAmount]);

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        setAmountDisplay(formatInputMoney(rawValue));
        setAmountRaw(Number(rawValue));
    };

    const handleXMLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                parseTagValue: false
            });
            const text = await file.text();
            const jsonObj = parser.parse(text);

            const dlHDon = jsonObj?.HDon?.DLHDon;
            if (!dlHDon) throw new Error("File không đúng chuẩn HĐĐT Tổng Cục Thuế!");

            const ttChung = dlHDon.TTChung;
            const ndHDon = dlHDon.NDHDon;
            const nMua = ndHDon?.NMua;
            const tToan = ndHDon?.TToan;

            const partnerTaxCode = String(nMua?.MST || "");
            const safeCustomerTaxCode = String(customerTaxCode || "");

            const normalizedXmlTaxCode = partnerTaxCode.replace(/[^a-zA-Z0-9-]/g, "");
            const normalizedCustomerTaxCode = safeCustomerTaxCode.replace(/[^a-zA-Z0-9-]/g, "");

            if (!normalizedCustomerTaxCode) {
                setXmlError(`Khách hàng trên hệ thống chưa có MST. Vui lòng cập nhật MST (${partnerTaxCode}) cho khách hàng trước khi import hóa đơn.`);
                setXmlData(null);
            } else if (normalizedXmlTaxCode !== normalizedCustomerTaxCode) {
                setXmlError(`CẢNH BÁO: MST trên hóa đơn (${partnerTaxCode}) KHÔNG KHỚP với MST của Khách hàng trên hệ thống (${customerTaxCode}).`);
                setXmlData(null);
            } else {
                setXmlError("");
                let issueDate = new Date();
                if (ttChung?.NLap) issueDate = new Date(ttChung.NLap);

                const parsedInvoice = {
                    invoiceNumber: ttChung?.SHDon || "N/A",
                    invoiceDate: format(issueDate, "yyyy-MM-dd"),
                    partnerTaxCode: partnerTaxCode,
                    partnerName: nMua?.Ten || "Không rõ Khách hàng",
                    subtotal: Number(tToan?.TgTCThue || 0),
                    vatAmount: Number(tToan?.TgTThue || 0),
                    totalAmount: Number(tToan?.TgTTTBSo || 0)
                };

                setXmlData(parsedInvoice);
                setXmlFileName(file.name);
                toast.success("Đối chiếu MST hợp lệ! Số liệu hóa đơn đã được ghi nhận.");
            }
        } catch (error: any) {
            setXmlError(error.message || "Lỗi đọc file XML");
            setXmlData(null);
        }
        event.target.value = '';
    };

    const handleCreateReceipt = async () => {
        if (amountRaw <= 0) return toast.error("Số tiền thu không hợp lệ");

        // ✅ KIỂM TRA QUÁ HẠN MỨC: Tránh việc Kế toán gõ nhầm thừa số 0
        if (amountRaw > remainingAmount) {
            return toast.error(`Số tiền thu (${formatCurrency(amountRaw)}) không được vượt quá số còn phải thu (${formatCurrency(remainingAmount)})`);
        }

        setLoading(true);

        if (receiptType === 'VAT') {
            if (!xmlData) {
                toast.error("Vui lòng tải lên file XML Hóa đơn!");
                setLoading(false);
                return;
            }
            const resXml = await syncXMLSalesEntriesAction([xmlData], projectId);
            if (!resXml.success) {
                toast.error("Lỗi hạch toán hóa đơn: " + resXml.error);
                setLoading(false);
                return;
            }
        }

        // TẠO PHIẾU THU TIỀN VÀO SỔ QUỸ
        const res = await createPaymentRequestAction({
            type: 'receipt',
            amount: amountRaw,
            description: note,
            partner_name: customerName,
            project_id: projectId || null,
            milestone_id: milestone.id // Truyền thêm ID để Backend biết update vào đâu
        });

        if (res.success) {
            toast.success("Đã hoàn tất Ghi nhận Hóa đơn & Báo Có!");
            setOpen(false); // Đóng modal ngay lập tức
            router.refresh(); // Tải lại dữ liệu trang
        } else {
            toast.error("Lỗi lập phiếu thu: " + res.error);
        }
        setLoading(false);
    }

    const isSubmitDisabled = loading || amountRaw <= 0 || (receiptType === 'VAT' && (!xmlData || xmlError !== ""));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="border-none bg-emerald-100 font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50">
                    <Download className="mr-1.5 h-3 w-3" /> Báo Có & Xuất HĐ
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl dark:border-slate-800 dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 dark:text-slate-100"><Download className="h-5 w-5 text-emerald-500" /> Báo Có & Đối Chiếu Công Nợ</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Thực hiện thu tiền và đối chiếu Hóa đơn GTGT (nếu có) trước khi đẩy vào Sổ quỹ.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                            <span>Khách hàng:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{customerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Mã số thuế:</span>
                            <span className="font-mono text-slate-600">{customerTaxCode || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                            <span className="text-xs font-bold tracking-wider uppercase">CÒN PHẢI THU ĐỢT NÀY:</span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold tracking-wider uppercase dark:text-slate-300">Hình thức báo có <span className="text-red-500">*</span></Label>
                        <Select value={receiptType} onValueChange={(val: any) => setReceiptType(val)}>
                            <SelectTrigger className="dark:border-slate-800 dark:bg-slate-950">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NO_VAT">Phiếu thu nội bộ (Không yêu cầu xuất VAT)</SelectItem>
                                <SelectItem value="VAT">Xuất Hóa đơn GTGT (Cần import XML Bán ra)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {receiptType === 'VAT' && (
                        <div className="animate-in fade-in slide-in-from-top-2 space-y-3 duration-300">
                            <div className="relative cursor-pointer rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-6 text-center transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/20">
                                <Input type="file" accept=".xml" onChange={handleXMLUpload} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                                <UploadCloud className="mx-auto mb-2 h-8 w-8 text-indigo-500" />
                                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-400">Click hoặc kéo thả file XML Hóa Đơn Bán Ra</p>
                                <p className="mt-1 text-[11px] text-slate-500">Hệ thống sẽ đối chiếu MST hóa đơn với Khách hàng.</p>
                            </div>

                            {xmlError && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div>{xmlError}</div>
                                </div>
                            )}

                            {xmlData && !xmlError && (
                                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <p className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" /> Khớp MST! Thông tin hóa đơn đã sẵn sàng:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 rounded border bg-white p-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                        <div><span className="font-semibold text-slate-400">Số HĐ:</span> <span className="font-mono">{xmlData.invoiceNumber}</span></div>
                                        <div><span className="font-semibold text-slate-400">Tổng tiền:</span> <span className="font-bold">{formatCurrency(xmlData.totalAmount)}</span></div>
                                        <div className="col-span-2 truncate"><span className="font-semibold text-slate-400">Người mua:</span> {xmlData.partnerName}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-xs font-bold tracking-wider uppercase dark:text-slate-300">Số tiền Thực thu (VND) <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input
                                type="text"
                                value={amountDisplay}
                                onChange={handleMoneyChange}
                                className={`font-black text-xl pr-8 h-12 transition-colors ${amountRaw > remainingAmount
                                        ? "text-red-600 border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-900/20"
                                        : "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 focus-visible:ring-emerald-500"
                                    }`}
                            />
                            <span className="absolute top-3.5 right-4 font-bold text-slate-400">đ</span>
                        </div>
                        {amountRaw < remainingAmount && amountRaw > 0 && (
                            <p className="flex items-center gap-1 font-medium text-[11px] text-amber-600">
                                <Clock className="h-3 w-3" /> Đang thu 1 phần. Công nợ còn lại sau khi thu: {formatCurrency(remainingAmount - amountRaw)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold tracking-wider uppercase dark:text-slate-300">Diễn giải thu tiền <span className="text-red-500">*</span></Label>
                        <Input
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy bỏ</Button>
                    <Button
                        onClick={handleCreateReceipt}
                        disabled={isSubmitDisabled || amountRaw > remainingAmount}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] shadow-md disabled:bg-slate-400"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {receiptType === 'VAT' ? "Ghi nhận HĐ & Gửi Báo Có" : "Gửi Đề nghị Báo Có"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}