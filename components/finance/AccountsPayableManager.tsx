"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { XMLParser } from "fast-xml-parser";
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
import { FileText, Plus, Loader2, ArrowRight, Send, UploadCloud, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

import { createSupplierInvoiceAction, createPaymentRequestAction, syncXMLEntriesAction, deleteSupplierInvoiceAction } from "@/lib/action/finance";
import { formatCurrency, formatDate } from "@/lib/utils/utils";

interface Props {
    pendingPOs: any[];
    invoices: any[];
    projects?: any[];
}

export default function AccountsPayableManager({ pendingPOs, invoices, projects }: Props) {
    const router = useRouter();

    const [bulkXmlOpen, setBulkXmlOpen] = useState(false);
    const [stagedInvoices, setStagedInvoices] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedProject, setSelectedProject] = useState<string>("none");

    const handleBulkXMLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const parsedInvoices: any[] = [];
        const parser = new XMLParser({ ignoreAttributes: false });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const text = await file.text();
                const jsonObj = parser.parse(text);

                const dlHDon = jsonObj?.HDon?.DLHDon;
                if (!dlHDon) {
                    toast.error(`File ${file.name} không đúng chuẩn HĐĐT!`);
                    continue;
                }

                const ttChung = dlHDon.TTChung;
                const ndHDon = dlHDon.NDHDon;
                const nBan = ndHDon?.NBan;
                const tToan = ndHDon?.TToan;

                let issueDate = new Date();
                if (ttChung?.NLap) issueDate = new Date(ttChung.NLap);

                parsedInvoices.push({
                    fileName: file.name,
                    invoiceNumber: ttChung?.SHDon || "N/A",
                    invoiceDate: format(issueDate, "yyyy-MM-dd"),
                    sellerTaxCode: nBan?.MST || "",
                    sellerName: nBan?.Ten || "Không rõ NCC",
                    subtotal: Number(tToan?.TgTCThue || 0),
                    vatAmount: Number(tToan?.TgTThue || 0),
                    totalAmount: Number(tToan?.TgTTTBSo || 0)
                });
            } catch (error) {
                toast.error(`Lỗi đọc file ${file.name}`);
            }
        }
        setStagedInvoices(prev => [...prev, ...parsedInvoices]);
        event.target.value = '';
    };

    const handleSyncBulkToSystem = async () => {
        if (stagedInvoices.length === 0) return;
        setIsSyncing(true);

        const projectId = selectedProject !== "none" ? selectedProject : undefined;

        const payloadWithProject = stagedInvoices.map(inv => ({
            ...inv,
            project_id: projectId,
            sellerName: inv.sellerName,
            sellerTaxCode: inv.sellerTaxCode
        }));

        const res = await syncXMLEntriesAction(payloadWithProject, projectId);

        setIsSyncing(false);
        if (res.success) {
            toast.success(res.message);
            setStagedInvoices([]);
            setBulkXmlOpen(false);
            setSelectedProject("none");
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa Hóa đơn [${invoiceNumber}] không? Hệ thống sẽ tự động thu hồi cả bút toán trong Sổ Cái.`)) return;

        const toastId = toast.loading("Đang thu hồi bút toán và xóa Hóa đơn...");
        const res = await deleteSupplierInvoiceAction(id);

        if (res.success) {
            toast.success(res.message, { id: toastId });
            router.refresh();
        } else {
            toast.error(res.error, { id: toastId });
        }
    };

    return (
        <Tabs defaultValue="invoices" className="space-y-4 transition-colors">
            <TabsList className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <TabsTrigger value="invoices" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors"><FileText className="w-4 h-4" /> Hóa đơn & Công nợ</TabsTrigger>
                <TabsTrigger value="pending" className="gap-2 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 transition-colors"><Plus className="w-4 h-4" /> Chờ ghi nhận ({(pendingPOs || []).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-950 transition-colors">
                    <CardHeader className="border-b dark:border-slate-800 transition-colors bg-slate-50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                        <CardTitle className="dark:text-slate-100 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-500" /> Danh sách Hóa đơn đầu vào
                        </CardTitle>
                        <Button onClick={() => setBulkXmlOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                            <UploadCloud className="w-4 h-4 mr-2" /> Import XML (Chi phí chung)
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 transition-colors">
                        <div className="overflow-x-auto">
                            <Table className="bg-white dark:bg-slate-950 transition-colors">
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 transition-colors">
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Số HĐ / Ngày</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Nhà Cung Cấp</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Công trình / PO</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Tổng tiền</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Đã trả</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Còn nợ</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                    {(invoices || []).length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">Chưa có dữ liệu công nợ</TableCell></TableRow>
                                    ) : (invoices || []).map((inv) => {
                                        const total = Number(inv.total_amount) || 0;
                                        const paid = Number(inv.paid_amount) || 0;
                                        const debt = total - paid;

                                        // 1. TÍNH TOÁN TIỀN ĐANG NẰM CHỜ DUYỆT TẠI SỔ QUỸ
                                        const pendingRequestedAmount = (inv.payment_requests || [])
                                            .filter((pr: any) => ['pending_approval', 'approved'].includes(pr.status?.toLowerCase()))
                                            .reduce((sum: number, pr: any) => sum + Number(pr.amount || 0), 0);

                                        // Số tiền tối đa còn được phép làm đề nghị chi
                                        const availableDebt = debt - pendingRequestedAmount;

                                        const supplierName =
                                            inv.suppliers?.name ||
                                            inv.supplier?.name ||
                                            inv.po?.suppliers?.name ||
                                            inv.po?.supplier?.name ||
                                            inv.supplier_name ||
                                            "N/A";

                                        const projectName =
                                            inv.projects?.name ||
                                            inv.project?.name ||
                                            inv.po?.projects?.name ||
                                            inv.po?.project?.name ||
                                            "Chi phí chung";

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-none">
                                                <TableCell className="align-top py-4">
                                                    <div className="font-bold text-blue-700 dark:text-blue-400 transition-colors">{inv.invoice_number}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors mt-0.5">{formatDate(new Date(inv.invoice_date))}</div>
                                                    <Badge variant="outline" className="text-[10px] mt-1.5 h-5 px-1.5 dark:border-slate-700 dark:text-slate-300 transition-colors uppercase tracking-wider">{inv.invoice_type}</Badge>
                                                </TableCell>

                                                {/* 2. SỬA LỖI HIỂN THỊ TÊN: Dùng break-words để tự động xuống hàng */}
                                                <TableCell className="align-top py-4 font-semibold text-slate-800 dark:text-slate-200 transition-colors min-w-[200px] max-w-[300px] whitespace-normal break-words">
                                                    {supplierName}
                                                </TableCell>
                                                <TableCell className="align-top py-4 min-w-[150px] max-w-[250px] whitespace-normal break-words">
                                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold transition-colors">{projectName}</div>
                                                    {inv.po?.code && <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">PO: {inv.po?.code}</div>}
                                                </TableCell>

                                                <TableCell className="align-top py-4 text-right font-bold text-slate-800 dark:text-slate-100 text-base transition-colors">
                                                    {formatCurrency(total)}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right font-bold text-green-600 dark:text-green-400 transition-colors">
                                                    {formatCurrency(paid)}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right">
                                                    <div className="font-black text-red-600 dark:text-red-400 transition-colors">
                                                        {debt > 0 ? formatCurrency(debt) : "-"}
                                                    </div>
                                                    {/* HIỆN THÔNG BÁO TIỀN ĐANG KẸT TRONG SỔ QUỸ */}
                                                    {pendingRequestedAmount > 0 && (
                                                        <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium mt-1">
                                                            (Đang chờ chi: {formatCurrency(pendingRequestedAmount)})
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-center">
                                                    {inv.payment_status === 'paid' && <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-500/20 dark:text-green-400 border-none transition-colors">Đã xong</Badge>}
                                                    {inv.payment_status === 'partial' && <Badge className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-none transition-colors">1 Phần</Badge>}
                                                    {inv.payment_status === 'pending' && <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300 border-none transition-colors">Chưa trả</Badge>}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right">
                                                    <div className="flex justify-end gap-2 items-center flex-wrap">
                                                        {/* CHỈ CHO PHÉP TẠO PHIẾU NẾU availableDebt > 0 */}
                                                        {availableDebt > 0 && (
                                                            <PaymentRequestDialog invoice={inv} debtAmount={availableDebt} supplierName={supplierName} />
                                                        )}

                                                        {/* NẾU ĐÃ LÀM PHIẾU ĐỦ TIỀN NHƯNG CHƯA CHI -> KHÓA NÚT LẠI */}
                                                        {debt > 0 && availableDebt <= 0 && (
                                                            <Button size="sm" disabled className="bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-none shadow-none">
                                                                Chờ Sổ quỹ
                                                            </Button>
                                                        )}

                                                        {/* CHỈ CHO PHÉP XÓA KHI CHƯA TRẢ VÀ CHƯA TẠO ĐỀ NGHỊ NÀO */}
                                                        {paid === 0 && pendingRequestedAmount === 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                title="Xóa hóa đơn sai"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* MODAL BULK IMPORT XML ĐẦU VÀO */}
                <Dialog open={bulkXmlOpen} onOpenChange={(open) => {
                    if (!open) { setBulkXmlOpen(false); setStagedInvoices([]); setSelectedProject("none"); }
                }}>
                    <DialogContent className="max-w-4xl dark:bg-slate-900 dark:border-slate-800 transition-colors max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-emerald-500">
                                <FileText className="w-5 h-5" /> Nhập Hàng Loạt Hóa Đơn MUA VÀO (Input)
                            </DialogTitle>
                            <DialogDescription>Dành cho các chi phí chung (Điện, nước, cước viễn thông...) không qua hệ thống Đơn hàng (PO).</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Phân bổ hóa đơn này vào Công trình:
                                </span>
                                <Select value={selectedProject} onValueChange={setSelectedProject}>
                                    <SelectTrigger className="w-full md:w-[400px] bg-white dark:bg-slate-900 font-medium">
                                        <SelectValue placeholder="Chọn dự án..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Đưa vào Chi phí Quản lý chung doanh nghiệp --</SelectItem>
                                        {projects?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="border-2 border-dashed rounded-xl p-8 text-center relative transition-colors cursor-pointer border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20">
                                <Input type="file" accept=".xml" multiple onChange={handleBulkXMLUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <UploadCloud className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                                <p className="text-base font-bold text-emerald-800 dark:text-emerald-400">Click hoặc kéo thả file XML Đầu vào</p>
                            </div>

                            {stagedInvoices.length > 0 && (
                                <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-800">
                                    <Table className="text-xs md:text-sm">
                                        <TableHeader className="bg-slate-50 dark:bg-slate-950">
                                            <TableRow>
                                                <TableHead>Ngày Lập</TableHead>
                                                <TableHead>Số HĐ</TableHead>
                                                <TableHead>Nhà cung cấp</TableHead>
                                                <TableHead className="text-right">Chưa Thuế</TableHead>
                                                <TableHead className="text-right">VAT</TableHead>
                                                <TableHead className="text-right">Tổng Tiền</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stagedInvoices.map((inv, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-bold text-amber-600 dark:text-amber-500">{format(new Date(inv.invoiceDate), "dd/MM/yyyy")}</TableCell>
                                                    <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                                                    <TableCell className="truncate max-w-[150px]">{inv.sellerName}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(inv.subtotal)}</TableCell>
                                                    <TableCell className="text-right text-rose-500">{formatCurrency(inv.vatAmount)}</TableCell>
                                                    <TableCell className="text-right font-bold">{formatCurrency(inv.totalAmount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4 border-t dark:border-slate-800 mt-auto">
                            <div className="w-full flex items-center justify-between">
                                <div className="text-sm text-slate-500">Đã đọc sẵn sàng: <strong className="text-emerald-600">{stagedInvoices.length}</strong> hóa đơn</div>
                                <div className="space-x-2">
                                    <Button variant="outline" onClick={() => setBulkXmlOpen(false)}>Hủy</Button>
                                    <Button onClick={handleSyncBulkToSystem} disabled={stagedInvoices.length === 0 || isSyncing} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                                        {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                                        Lưu Hóa đơn
                                    </Button>
                                </div>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                        <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Giá trị đơn hàng (PO)</p>
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

// --- HELPER ---
const formatInputMoney = (val: number | string) => {
    if (!val) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(val));
};

// --- DIALOG 1: GHI NHẬN HÓA ĐƠN TỪ PO (TÍCH HỢP ĐỌC XML) ---
function CreateInvoiceDialog({ po }: { po: any }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [invNum, setInvNum] = useState("");
    const [type, setType] = useState<"VAT" | "RETAIL">("VAT");
    const [vatRate, setVatRate] = useState(10);
    const [xmlFileName, setXmlFileName] = useState("");
    const [xmlSupplierName, setXmlSupplierName] = useState("");

    const [totalRaw, setTotalRaw] = useState(Number(po.total_amount));
    const [totalDisplay, setTotalDisplay] = useState(formatInputMoney(po.total_amount));

    useEffect(() => {
        if (open) {
            setInvNum("");
            setType("VAT");
            setXmlFileName("");
            setXmlSupplierName("");
            setTotalRaw(Number(po.total_amount));
            setTotalDisplay(formatInputMoney(po.total_amount));
        }
    }, [open, po.total_amount]);

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        setTotalDisplay(formatInputMoney(rawValue));
        setTotalRaw(Number(rawValue));
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parser = new XMLParser({ ignoreAttributes: false });
            const text = await file.text();
            const jsonObj = parser.parse(text);

            const dlHDon = jsonObj?.HDon?.DLHDon;
            if (!dlHDon) throw new Error("File không đúng định dạng HĐĐT Tổng Cục Thuế!");

            const ttChung = dlHDon.TTChung;
            const ndHDon = dlHDon.NDHDon;
            const nBan = ndHDon?.NBan;
            const tToan = ndHDon?.TToan;

            setInvNum(ttChung?.SHDon || "");
            setXmlSupplierName(`${nBan?.Ten || 'Không rõ tên'} (MST: ${nBan?.MST || 'N/A'})`);

            const xmlTotal = Number(tToan?.TgTTTBSo || 0);
            setTotalRaw(xmlTotal);
            setTotalDisplay(formatInputMoney(xmlTotal));
            setXmlFileName(file.name);

            if (xmlTotal !== Number(po.total_amount)) {
                toast.warning(`Hóa đơn lệch tiền so với Đơn hàng (PO)!`);
            } else {
                toast.success("Dữ liệu XML khớp hoàn toàn với Đơn hàng!");
            }

        } catch (error: any) {
            toast.error(error.message || "Lỗi đọc file XML");
        }
        event.target.value = '';
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
            invoice_number: invNum || `BL-${Date.now().toString().slice(-5)}`,
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
                    <DialogTitle className="dark:text-slate-100 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Đối chiếu & Ghi nhận Hóa đơn</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Ghi nhận công nợ cho Đơn hàng <strong>{po.code}</strong></DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">

                    <div className="space-y-2">
                        <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Hình thức Hóa đơn</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 font-semibold transition-colors"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                <SelectItem value="VAT" className="dark:text-slate-200">Hóa đơn VAT (Tải file XML)</SelectItem>
                                <SelectItem value="RETAIL" className="dark:text-slate-200">Hóa đơn Bán lẻ (Nhập tay)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {type === 'VAT' && (
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center relative hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <Input type="file" accept=".xml" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <UploadCloud className="w-6 h-6 mx-auto text-indigo-500 mb-2" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Click hoặc kéo thả file XML vào đây</p>
                            <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ tự bóc tách số liệu</p>
                            {xmlFileName && (
                                <div className="mt-3 space-y-1">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-bold">
                                        <CheckCircle2 className="w-4 h-4" /> Đã đọc: {xmlFileName}
                                    </p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 inline-block px-2 py-1 rounded-md border dark:border-slate-700 text-left">
                                        <strong>Đơn vị xuất:</strong> {xmlSupplierName}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Số hóa đơn {type === 'VAT' && <span className="text-red-500">*</span>}</Label>
                            <Input required={type === 'VAT'} value={invNum} onChange={e => setInvNum(e.target.value)} placeholder={type === 'VAT' ? "VD: 0012345" : "Bỏ trống sẽ tự sinh số HĐ"} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 font-mono transition-colors" />
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50 space-y-4 transition-colors">
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Tổng thanh toán (Theo Hóa đơn)</Label>
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

                        {totalRaw !== Number(po.total_amount) && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    Giá trị hóa đơn đang lệch so với Đơn hàng PO <strong>({formatCurrency(Number(po.total_amount))})</strong>. Xác nhận lại trước khi lưu!
                                </div>
                            </div>
                        )}

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
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Xác nhận & Lưu"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- DIALOG 2: LẬP ĐỀ NGHỊ THANH TOÁN ---
function PaymentRequestDialog({ invoice, debtAmount, supplierName }: { invoice: any, debtAmount: number, supplierName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Sử dụng số tiền được truyền vào (đã trừ đi số đang chờ duyệt)
    const [amountRaw, setAmountRaw] = useState(debtAmount);
    const [amountDisplay, setAmountDisplay] = useState(formatInputMoney(debtAmount));
    const [note, setNote] = useState(`Thanh toán công nợ HĐ ${invoice.invoice_number}`);

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (Number(rawValue) > debtAmount) {
            toast.warning("Không thể lập đề nghị vượt quá số tiền nợ còn lại!");
        }
        setAmountDisplay(formatInputMoney(rawValue));
        setAmountRaw(Number(rawValue));
    };

    const handleCreateRequest = async () => {
        if (amountRaw <= 0 || amountRaw > debtAmount) return toast.error("Số tiền không hợp lệ");

        setLoading(true);
        const res = await createPaymentRequestAction({
            type: 'payment',
            amount: amountRaw,
            description: note,
            partner_name: supplierName,
            project_id: invoice.po?.project_id || invoice.project_id || null,
            invoice_id: invoice.id
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
                            <span className="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border dark:border-slate-700 truncate max-w-[200px]" title={supplierName}>{supplierName}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Số hóa đơn tham chiếu:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-300">{invoice.invoice_number}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-600 dark:text-red-400 border-t border-slate-200 dark:border-slate-800 pt-2.5 mt-1">
                            <span className="font-bold uppercase tracking-wider text-xs">Được phép đề nghị tối đa:</span>
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
                    <Button onClick={handleCreateRequest} disabled={loading || amountRaw <= 0 || amountRaw > debtAmount} className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white min-w-[150px] transition-colors shadow-md">
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Gửi Đề nghị chi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}