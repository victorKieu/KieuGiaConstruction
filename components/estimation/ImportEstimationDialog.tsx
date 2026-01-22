"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { importEstimationFromData } from "@/lib/action/import-estimation";

export default function ImportEstimationDialog({ projectId }: { projectId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");

    // Hàm kiểm tra xem sheet này có phải là sheet dự toán không
    const isEstimationSheet = (rows: any[][]) => {
        if (!rows || rows.length < 5) return false;

        // Quét 20 dòng đầu để tìm các từ khóa quan trọng
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const rowStr = JSON.stringify(rows[i]).toLowerCase();
            // Phải chứa "mã hiệu" hoặc "mã công tác" VÀ "đơn vị" hoặc "khối lượng"
            if (
                (rowStr.includes("mã hiệu") || rowStr.includes("mã số") || rowStr.includes("mã công tác")) &&
                (rowStr.includes("đơn vị") || rowStr.includes("đvt") || rowStr.includes("khối lượng"))
            ) {
                return true;
            }
        }
        return false;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setLoading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            let targetSheetData: any[][] | null = null;
            let foundSheetName = "";

            // --- LOGIC MỚI: QUÉT TẤT CẢ CÁC SHEET ---
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // Kiểm tra xem sheet này có đúng định dạng không
                if (isEstimationSheet(jsonData)) {
                    targetSheetData = jsonData;
                    foundSheetName = sheetName;
                    break; // Tìm thấy rồi thì dừng
                }
            }

            if (!targetSheetData) {
                throw new Error("Không tìm thấy sheet Dự toán phù hợp (Phải có cột 'Mã hiệu', 'Đơn vị'...). Vui lòng kiểm tra file Excel.");
            }

            toast.info(`Đang import dữ liệu từ sheet: "${foundSheetName}"...`);

            // Gửi dữ liệu sheet tìm được về Server
            const res = await importEstimationFromData(projectId, targetSheetData);

            if (res.success) {
                toast.success("Thành công", { description: res.message });
                setOpen(false);
            } else {
                toast.error("Lỗi Import", { description: res.error });
            }

        } catch (error: any) {
            console.error("Lỗi đọc file Excel:", error);
            toast.error("Lỗi xử lý file", { description: error.message });
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
                    <FileSpreadsheet className="w-4 h-4" /> Nhập từ Excel (.xlsx)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nhập dữ liệu Dự toán</DialogTitle>
                    <DialogDescription>
                        Hỗ trợ file Excel (.xlsx, .xls) xuất từ phần mềm dự toán (G8, Eta...).<br />
                        Hệ thống sẽ <strong>tự động tìm sheet</strong> chứa dữ liệu phù hợp.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 gap-4 transition-colors hover:bg-slate-100 cursor-pointer relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileUpload}
                        disabled={loading}
                    />

                    {loading ? (
                        <div className="flex flex-col items-center gap-3 text-blue-600 animate-pulse">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <span className="text-sm font-medium">Đang tìm & xử lý dữ liệu...</span>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 bg-white rounded-full shadow-sm">
                                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium text-slate-700">
                                    {fileName ? `Đang chọn: ${fileName}` : "Chọn file Excel Dự toán"}
                                </p>
                                <p className="text-xs text-slate-400">Hệ thống sẽ tự quét các sheet để tìm bảng khối lượng</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}