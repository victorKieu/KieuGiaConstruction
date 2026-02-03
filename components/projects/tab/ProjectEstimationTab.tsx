"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, RefreshCw, DollarSign, FileSpreadsheet, Upload, Trash2 // ✅ Thêm icon Trash2
} from "lucide-react";
import { toast } from "sonner";
// ✅ Import thêm deleteEstimationItem
import {
    createEstimationFromBudget,
    updateEstimationPrice,
    getEstimationItems,
    deleteEstimationItem
} from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";
import { formatCurrency } from "@/lib/utils/utils";

interface Props {
    projectId: string;
}

export default function ProjectEstimationTab({ projectId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

    // Load dữ liệu
    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await getEstimationItems(projectId);
        if (res.success) {
            setItems(res.data);
        }
        setInitLoaded(true);
    };

    // --- XỬ LÝ XÓA ITEM (MỚI) ---
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa mục "${name}" không?`)) return;

        // Optimistic update: Xóa trên giao diện ngay lập tức để cảm giác nhanh
        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.id !== id));

        const res = await deleteEstimationItem(id, projectId);

        if (res.success) {
            toast.success(res.message);
            router.refresh();
        } else {
            toast.error(res.error);
            setItems(oldItems); // Rollback nếu lỗi
        }
    };

    // ... (Các hàm handleDownloadTemplate, handleFileUpload, handleSync... giữ nguyên)
    const handleDownloadTemplate = () => {
        const header = ["STT", "Mã hiệu (Bắt buộc)", "Tên công việc / Vật tư (Bắt buộc)", "ĐVT", "Dài", "Rộng", "Cao", "Hệ số", "Khối lượng", "Đơn giá", "Thành tiền", "Ghi chú"];
        const sampleData = [
            ["", "", "I. PHẦN MÓNG", "", "", "", "", "", "", "", "", "Hạng mục"],
            [1, "BT-LOT", "Bê tông lót móng đá 4x6", "m3", "", "", "", "", 10, 1200000, "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet([header, ...sampleData]);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 10 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_Du_Toan");
        XLSX.writeFile(wb, "Mau_Nhap_Du_Toan_KieuGia.xlsx");
        toast.success("Đã tải file mẫu!");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await importBOQFromExcel(projectId, formData);
            if (res.success) {
                toast.success(`Đã nhập thành công ${res.count} đầu mục!`);
                loadData();
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) { toast.error("Lỗi hệ thống."); }
        finally { setIsImporting(false); e.target.value = ""; }
    };

    const handleSync = async () => {
        setLoading(true);
        const res = await createEstimationFromBudget(projectId);
        if (res.success) {
            toast.success(res.message);
            await loadData();
            router.refresh();
        } else { toast.error(res.error); }
        setLoading(false);
    };

    const handlePriceChange = async (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setItems(prev => prev.map(item => item.id === id ? { ...item, unit_price: price, total_cost: item.quantity * price } : item));
        await updateEstimationPrice(id, projectId, price);
        router.refresh();
    };

    const totalEstimate = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    return (
        <div className="space-y-4">
            {/* HEADER & ACTIONS */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        Bảng Dự toán Chi phí
                    </h3>
                    <p className="text-sm text-slate-500">Quản lý định mức và đơn giá vật tư.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-purple-50 px-3 py-1.5 rounded border border-purple-100 text-right mr-2">
                        <span className="text-[10px] text-purple-600 font-semibold uppercase block">Tổng cộng</span>
                        <span className="text-lg font-bold text-purple-700">{formatCurrency(totalEstimate)}</span>
                    </div>

                    <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 border-green-200 text-green-700 hover:bg-green-50">
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
                    </Button>

                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                        <Button variant="outline" disabled={isImporting} className="h-9 border-slate-300">
                            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Import Excel
                        </Button>
                    </div>

                    <Button onClick={handleSync} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Đồng bộ QTO
                    </Button>
                </div>
            </div>

            {/* TABLE HIỂN THỊ */}
            <Card className="border-none shadow-none bg-white">
                <Table className="border rounded-md">
                    <TableHeader>
                        <TableRow className="bg-slate-100">
                            <TableHead className="w-[50px] text-center">STT</TableHead>
                            <TableHead>Mã & Tên Công việc / Vật tư</TableHead>
                            <TableHead className="w-[80px] text-center">ĐVT</TableHead>
                            <TableHead className="w-[100px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[140px] text-right">Đơn giá</TableHead>
                            <TableHead className="w-[140px] text-right">Thành tiền</TableHead>
                            {/* ✅ Thêm cột thao tác */}
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!initLoaded ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">Chưa có dữ liệu. Hãy Import Excel hoặc Đồng bộ từ QTO.</TableCell></TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-slate-50">
                                    <TableCell className="text-center text-slate-500 text-xs">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-700">{item.material_name}</div>
                                        <div className="text-[11px] text-slate-400 font-mono">
                                            {item.material_code} {item.section_name ? `• ${item.section_name}` : ''}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center"><Badge variant="outline" className="bg-slate-50 font-normal">{item.unit}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600">
                                        {Number(item.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right p-1">
                                        <Input
                                            type="number"
                                            className="text-right h-8 font-medium focus:ring-purple-500 border-slate-200"
                                            defaultValue={item.unit_price}
                                            onBlur={(e) => handlePriceChange(item.id, e.target.value)}
                                            placeholder="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-800">
                                        {formatCurrency(item.total_cost || 0)}
                                    </TableCell>
                                    {/* ✅ Nút Xóa */}
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(item.id, item.material_name)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}