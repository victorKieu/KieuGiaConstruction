"use client";

import { useState } from "react";
import { XMLParser } from "fast-xml-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileType, CheckCircle2, XCircle, Loader2, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { toast } from "sonner";
import { syncXMLEntriesAction } from "@/lib/action/finance";
import { useRouter } from "next/navigation";

export default function XMLInvoiceUploader() {
    const router = useRouter();
    const [parsedInvoices, setParsedInvoices] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
   

    // Hàm xử lý khi người dùng chọn file XML
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsParsing(true);
        const parser = new XMLParser({ ignoreAttributes: false });
        const newInvoices: any[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const text = await file.text();
                const jsonObj = parser.parse(text);

                // TRUY XUẤT ĐÚNG CẤU TRÚC NGANG HÀNG CỦA TỔNG CỤC THUẾ
                const dlHDon = jsonObj?.HDon?.DLHDon;
                if (!dlHDon) throw new Error("Sai định dạng Hóa đơn TCT");

                const ttChung = dlHDon.TTChung; // Lấy thông tin chung (Số HĐ, Ngày lập)
                const ndHDon = dlHDon.NDHDon;   // Lấy nội dung hóa đơn (Người bán, Tiền)

                const nBan = ndHDon?.NBan;
                const tToan = ndHDon?.TToan;

                newInvoices.push({
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    invoiceNumber: ttChung?.SHDon,
                    invoiceDate: ttChung?.NLap,
                    sellerName: nBan?.Ten,
                    sellerTaxCode: nBan?.MST,
                    subtotal: Number(tToan?.TgTCThue || 0),
                    vatAmount: Number(tToan?.TgTThue || 0),
                    totalAmount: Number(tToan?.TgTTTBSo || 0),
                    status: 'ready'
                });
            } catch (error) {
                console.error("Lỗi đọc file:", file.name, error);
                toast.error(`File ${file.name} không đúng chuẩn HĐĐT!`);
            }
        }

        setParsedInvoices(prev => [...prev, ...newInvoices]);
        setIsParsing(false);
        // Reset input file
        event.target.value = '';
    };

    const removeInvoice = (id: string) => {
        setParsedInvoices(prev => prev.filter(inv => inv.id !== id));
    };

    // Hàm gọi API để lưu hàng loạt vào Database (Sẽ viết ở Bước 3)
    const handleSyncToDatabase = async () => {
        if (parsedInvoices.length === 0) return;
        setIsSaving(true);

        // Gọi API lưu dữ liệu thật xuống Database
        const res = await syncXMLEntriesAction(parsedInvoices);

        setIsSaving(false);
        if (res.success) {
            toast.success(res.message);
            setParsedInvoices([]); // Xóa sạch danh sách hàng chờ sau khi lưu thành công
            router.refresh();      // Kích hoạt Next.js refresh lại luồng dữ liệu mới
        } else {
            toast.error("Lỗi hệ thống: " + res.error);
        }
    };

    return (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <UploadCloud className="w-6 h-6" /> Nhập liệu Hóa đơn tự động (XML)
                </CardTitle>
                <CardDescription>
                    Tải file XML tải từ trang Tổng cục Thuế. Hệ thống sẽ tự động bóc tách và hạch toán Nợ/Có.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

                {/* Khu vực Upload */}
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isParsing ? (
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                            ) : (
                                <FileType className="w-8 h-8 text-slate-400 mb-2" />
                            )}
                            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Nhấn để chọn file</span> hoặc kéo thả vào đây
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Hỗ trợ định dạng: .XML (Chọn nhiều file cùng lúc)</p>
                        </div>
                        <Input
                            type="file"
                            accept=".xml"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isParsing || isSaving}
                        />
                    </label>
                </div>

                {/* Bảng xem trước dữ liệu bóc tách */}
                {parsedInvoices.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                Dữ liệu bóc tách ({parsedInvoices.length} Hóa đơn)
                            </h3>
                            <Button onClick={handleSyncToDatabase} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Đồng bộ vào Sổ Kế Toán
                            </Button>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                            <Table>
                                <TableHeader className="bg-slate-100 dark:bg-slate-900/50">
                                    <TableRow>
                                        <TableHead className="font-bold w-[120px]">Số Hóa Đơn</TableHead>
                                        <TableHead className="font-bold w-[100px]">Ngày lập</TableHead>
                                        <TableHead className="font-bold min-w-[200px]">Nhà cung cấp / MST</TableHead>
                                        <TableHead className="text-right font-bold">Chưa thuế</TableHead>
                                        <TableHead className="text-right font-bold">Tiền VAT</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedInvoices.map((inv) => (
                                        <TableRow key={inv.id} className="dark:border-slate-800">
                                            <TableCell className="font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</TableCell>
                                            <TableCell>{inv.invoiceDate}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1" title={inv.sellerName}>{inv.sellerName}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">MST: {inv.sellerTaxCode}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(inv.subtotal)}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.vatAmount)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeInvoice(inv.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}