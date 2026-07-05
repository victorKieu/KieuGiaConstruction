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
import { ArrowUpRight, AlertCircle, CheckCircle2, Download, Loader2, UploadCloud, FileText, Send } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";

import { createPaymentRequestAction, syncXMLSalesEntriesAction } from "@/lib/action/finance";

// --- HELPER: FORMAT INPUT TIỀN TỆ ---
const formatInputMoney = (val: number | string) => {
    if (!val) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(val));
};

export default function ReceivablesManager({ milestones, projects }: { milestones: any[], projects?: any[] }) {
    return (
        <Card className="border-l-4 border-l-emerald-500 dark:border-l-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm relative">
            <CardHeader className="pb-2 border-b border-emerald-100 dark:border-emerald-900/30 flex flex-row items-center justify-between">
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

                                    // LOGIC "LƯỚI QUÉT 2 TẦNG": Lấy khách hàng từ Hợp đồng, nếu trống thì lấy từ Dự án
                                    // @ts-ignore (Bỏ qua cảnh báo type của TypeScript)
                                    const contract = Array.isArray(m.contracts) ? m.contracts[0] : m.contracts;
                                    const project = contract?.projects || {};
                                    const customerData = contract?.customer || project?.customer || {};

                                    const customerName = customerData?.name || "Chưa gắn Khách hàng";
                                    const customerTaxCode = String(customerData?.tax_code || "");
                                    const projectId = project?.id || null;

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
                                            <ReceiptRequestDialog
                                                milestone={m}
                                                customerName={customerName}
                                                customerTaxCode={customerTaxCode}
                                                projectId={projectId}
                                            />
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
function ReceiptRequestDialog({ milestone, customerName, customerTaxCode, projectId }: { milestone: any, customerName: string, customerTaxCode: string, projectId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // STATES CHO GIAO DỊCH THU TIỀN
    const [receiptType, setReceiptType] = useState<"NO_VAT" | "VAT">("NO_VAT");
    const [amountRaw, setAmountRaw] = useState(milestone.amount);
    const [amountDisplay, setAmountDisplay] = useState(formatInputMoney(milestone.amount));
    const [note, setNote] = useState(`Thu tiền đợt: ${milestone.name} - HĐ ${milestone.contracts?.contract_number}`);

    // STATES CHO XML HÓA ĐƠN
    const [xmlData, setXmlData] = useState<any>(null);
    const [xmlError, setXmlError] = useState<string>("");
    const [xmlFileName, setXmlFileName] = useState<string>("");

    // Reset data mỗi khi mở Modal
    useEffect(() => {
        if (open) {
            setReceiptType("NO_VAT");
            setAmountRaw(milestone.amount);
            setAmountDisplay(formatInputMoney(milestone.amount));
            setNote(`Thu tiền đợt: ${milestone.name} - HĐ ${milestone.contracts?.contract_number}`);
            setXmlData(null);
            setXmlError("");
            setXmlFileName("");
        }
    }, [open, milestone]);

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        setAmountDisplay(formatInputMoney(rawValue));
        setAmountRaw(Number(rawValue));
    };

    // ĐỌC VÀ ĐỐI CHIẾU XML
    const handleXMLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                parseTagValue: false // <--- Thêm dòng này: Cấm tự động xóa số 0 ở đầu
            });
            const text = await file.text();
            const jsonObj = parser.parse(text);

            const dlHDon = jsonObj?.HDon?.DLHDon;
            if (!dlHDon) throw new Error("File không đúng chuẩn HĐĐT Tổng Cục Thuế!");

            const ttChung = dlHDon.TTChung;
            const ndHDon = dlHDon.NDHDon;
            const nMua = ndHDon?.NMua; // Bóc tách thông tin Khách hàng (Người Mua) trên HĐ
            const tToan = ndHDon?.TToan;

            const partnerTaxCode = String(nMua?.MST || "");
            const safeCustomerTaxCode = String(customerTaxCode || "");

            // XÓA KHOẢNG TRẮNG, DẤU GẠCH ĐỂ ĐỐI CHIẾU MST
            const normalizedXmlTaxCode = partnerTaxCode.replace(/[^a-zA-Z0-9-]/g, "");
            const normalizedCustomerTaxCode = safeCustomerTaxCode.replace(/[^a-zA-Z0-9-]/g, "");

            // RULE CHẶT CHẼ: KIỂM TRA MST
            if (!normalizedCustomerTaxCode) {
                setXmlError(`Khách hàng trên hệ thống chưa có MST. Vui lòng cập nhật MST (${partnerTaxCode}) cho khách hàng trước khi import hóa đơn.`);
                setXmlData(null);
            } else if (normalizedXmlTaxCode !== normalizedCustomerTaxCode) {
                setXmlError(`CẢNH BÁO: MST trên hóa đơn (${partnerTaxCode}) KHÔNG KHỚP với MST của Khách hàng trên hệ thống (${customerTaxCode}).`);
                setXmlData(null);
            } else {
                // HỢP LỆ -> LƯU VÀO STATE
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
        event.target.value = ''; // Xóa value để có thể chọn lại cùng 1 file
    };

    const handleCreateReceipt = async () => {
        if (amountRaw <= 0) return toast.error("Số tiền thu không hợp lệ");
        setLoading(true);

        // NẾU CÓ XUẤT VAT -> PHẢI LƯU HÓA ĐƠN TRƯỚC
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
            type: 'receipt', // Báo có
            amount: amountRaw,
            description: note,
            partner_name: customerName,
            project_id: projectId || null
        });

        setLoading(false);
        if (res.success) {
            toast.success("Đã hoàn tất Ghi nhận Hóa đơn & Báo Có!");
            setOpen(false);
            router.refresh();
        } else {
            toast.error("Lỗi lập phiếu thu: " + res.error);
        }
    }

    // Nút Gửi bị vô hiệu hóa khi chọn xuất VAT nhưng (chưa upload file XML hoặc XML bị lỗi MST)
    const isSubmitDisabled = loading || amountRaw <= 0 || (receiptType === 'VAT' && (!xmlData || xmlError !== ""));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 shadow-sm font-semibold transition-colors">
                    <Download className="w-3 h-3 mr-1.5" /> Báo Có & Xuất HĐ
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 dark:text-slate-100"><Download className="w-5 h-5 text-emerald-500" /> Báo Có & Đối Chiếu Công Nợ</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Thực hiện thu tiền và đối chiếu Hóa đơn GTGT (nếu có) trước khi đẩy vào Sổ quỹ.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                            <span>Khách hàng:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{customerName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Mã số thuế:</span>
                            <span className="font-mono text-slate-600">{customerTaxCode || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                            <span className="font-bold uppercase tracking-wider text-xs">Phải thu Đợt {milestone.name}:</span>
                            <span className="font-black text-lg text-emerald-700 dark:text-emerald-400">{formatCurrency(milestone.amount)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Hình thức báo có <span className="text-red-500">*</span></Label>
                        <Select value={receiptType} onValueChange={(val: any) => setReceiptType(val)}>
                            <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NO_VAT">Phiếu thu nội bộ (Không yêu cầu xuất VAT)</SelectItem>
                                <SelectItem value="VAT">Xuất Hóa đơn GTGT (Cần import XML Bán ra)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* KHU VỰC IMPORT XML - XUẤT HIỆN KHI CHỌN "VAT" */}
                    {receiptType === 'VAT' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                            <div className="border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/20 rounded-xl p-6 text-center relative transition-colors cursor-pointer">
                                <Input type="file" accept=".xml" onChange={handleXMLUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-400">Click hoặc kéo thả file XML Hóa Đơn Bán Ra</p>
                                <p className="text-[11px] text-slate-500 mt-1">Hệ thống sẽ đối chiếu MST hóa đơn với Khách hàng.</p>
                            </div>

                            {/* HIỂN THỊ LỖI MST */}
                            {xmlError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-400 text-xs font-medium">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>{xmlError}</div>
                                </div>
                            )}

                            {/* HIỂN THỊ DỮ LIỆU XML THÀNH CÔNG */}
                            {xmlData && !xmlError && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg space-y-2">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                                        <CheckCircle2 className="w-4 h-4" /> Khớp MST! Thông tin hóa đơn đã sẵn sàng:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-800">
                                        <div><span className="font-semibold text-slate-400">Số HĐ:</span> <span className="font-mono">{xmlData.invoiceNumber}</span></div>
                                        <div><span className="font-semibold text-slate-400">Tổng tiền:</span> <span className="font-bold">{formatCurrency(xmlData.totalAmount)}</span></div>
                                        <div className="col-span-2 truncate"><span className="font-semibold text-slate-400">Người mua:</span> {xmlData.partnerName}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Số tiền Thực thu (VND) <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input
                                type="text"
                                value={amountDisplay}
                                onChange={handleMoneyChange}
                                className="font-black text-emerald-700 dark:text-emerald-400 text-xl pr-8 h-12 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 focus-visible:ring-emerald-500 transition-colors"
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold">đ</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Diễn giải thu tiền <span className="text-red-500">*</span></Label>
                        <Input
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>

                <DialogFooter className="pt-2 mt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy bỏ</Button>
                    <Button
                        onClick={handleCreateReceipt}
                        disabled={isSubmitDisabled}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] shadow-md"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        {receiptType === 'VAT' ? "Ghi nhận HĐ & Gửi Báo Có" : "Gửi Đề nghị Báo Có"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}