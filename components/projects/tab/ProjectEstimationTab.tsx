"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Loader2, RefreshCw, DollarSign, FileSpreadsheet, Upload, Trash2,
    Link as LinkIcon, Plus
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/utils";

// Import Actions
import {
    createEstimationFromBudget,
    updateEstimationPrice,
    getEstimationItems,
    deleteEstimationItem,
    createManualEstimationItem
} from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";

// ✅ FIX: Chỉ import Component, KHÔNG import type MasterMaterial để tránh lỗi
import { MaterialSelector } from "@/components/common/MaterialSelector";

interface Props {
    projectId: string;
}

// ✅ Định nghĩa lại kiểu dữ liệu nội bộ (Local Interface) để dùng trong file này
interface SelectedMaterialData {
    id: string;
    code: string;
    name: string;
    unit: string;
    ref_price: number;
}

export default function ProjectEstimationTab({ projectId }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

    // State cho Dialog thêm thủ công
    const [openManualDialog, setOpenManualDialog] = useState(false);
    const [newItemLoading, setNewItemLoading] = useState(false);

    // Load dữ liệu
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await getEstimationItems(projectId);
        if (res.success) {
            setItems(res.data);
        }
        setInitLoaded(true);
    };

    // 1. TẢI TEMPLATE EXCEL
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

    // 2. IMPORT EXCEL
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await importBOQFromExcel(projectId, formData);
            if (res.success) {
                toast.success(res.message);
                loadData();
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) { toast.error("Lỗi hệ thống."); }
        finally { setIsImporting(false); e.target.value = ""; }
    };

    // 3. ĐỒNG BỘ TỪ QTO
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

    // 4. XÓA ĐẦU MỤC
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa mục "${name}"?`)) return;
        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.id !== id)); // Optimistic UI
        const res = await deleteEstimationItem(id, projectId);
        if (res.success) {
            toast.success(res.message);
            router.refresh();
        } else {
            toast.error(res.error);
            setItems(oldItems);
        }
    };

    // 5. CẬP NHẬT GIÁ
    const handlePriceChange = async (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setItems(prev => prev.map(item => item.id === id ? { ...item, unit_price: price, total_cost: item.quantity * price } : item));
        await updateEstimationPrice(id, projectId, price);
        router.refresh();
    };

    // 6. XỬ LÝ KHI CHỌN VẬT TƯ TỪ POPUP
    const handleMaterialSelect = async (itemId: string, mat: any) => {
        const { error } = await supabase
            .from('estimation_items')
            .update({
                is_mapped: true,
                material_code: mat.code,
                material_name: mat.name,
                unit: mat.unit,
                unit_price: mat.ref_price || 0
            })
            .eq('id', itemId);

        if (!error) {
            setItems(prev => prev.map(item =>
                item.id === itemId
                    ? {
                        ...item,
                        is_mapped: true,
                        material_code: mat.code,
                        material_name: mat.name,
                        unit: mat.unit,
                        unit_price: mat.ref_price || 0,
                        total_cost: (item.quantity || 0) * (mat.ref_price || 0)
                    }
                    : item
            ));
            router.refresh();
        } else {
            toast.error("Lỗi cập nhật: " + error.message);
        }
    };

    // 7. THÊM THỦ CÔNG
    const handleCreateManual = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setNewItemLoading(true);
        const formData = new FormData(e.currentTarget);

        const data = {
            name: formData.get("name"),
            unit: formData.get("unit"),
            quantity: formData.get("quantity"),
            unit_price: formData.get("unit_price")
        };

        const res = await createManualEstimationItem(projectId, data);

        if (res.success) {
            toast.success(res.message);
            setOpenManualDialog(false);
            loadData();
            router.refresh();
        } else {
            toast.error(res.error);
        }
        setNewItemLoading(false);
    };

    const totalEstimate = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    // ✅ LOGIC SẮP XẾP: Ưu tiên Hạng mục (section_name) -> Tên vật tư
    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            // 1. So sánh Hạng mục
            const secA = (a.section_name || "").toString().trim();
            const secB = (b.section_name || "").toString().trim();
            // Dùng localeCompare để sort tiếng Việt chuẩn (a, á, à...)
            const secCompare = secA.localeCompare(secB, 'vi');

            if (secCompare !== 0) return secCompare;

            // 2. Nếu cùng hạng mục -> So sánh Tên
            const nameA = (a.original_name || a.material_name || "").toString().trim();
            const nameB = (b.original_name || b.material_name || "").toString().trim();
            return nameA.localeCompare(nameB, 'vi');
        });
    }, [items]);

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        Bảng Dự toán & Chuẩn hóa
                    </h3>
                    <p className="text-sm text-slate-500">Chuẩn hóa dữ liệu Import và quản lý chi phí.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-purple-50 px-3 py-1.5 rounded border border-purple-100 text-right mr-2">
                        <span className="text-[10px] text-purple-600 font-semibold uppercase block">Tổng cộng</span>
                        <span className="text-lg font-bold text-purple-700">{formatCurrency(totalEstimate)}</span>
                    </div>

                    {/* NÚT THÊM THỦ CÔNG */}
                    <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
                        <DialogTrigger asChild>
                            <Button className="h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                <Plus className="w-4 h-4 mr-2" /> Thêm dòng
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Thêm mục chi phí mới</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateManual} className="space-y-4 py-2">
                                <div>
                                    <Label>Tên công việc / Vật tư <span className="text-red-500">*</span></Label>
                                    <Input name="name" required placeholder="VD: Cát xây tô" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Đơn vị tính</Label>
                                        <Input name="unit" placeholder="m3, kg..." />
                                    </div>
                                    <div>
                                        <Label>Khối lượng <span className="text-red-500">*</span></Label>
                                        <Input name="quantity" type="number" step="0.01" required placeholder="0" />
                                    </div>
                                </div>
                                <div>
                                    <Label>Đơn giá tạm tính</Label>
                                    <Input name="unit_price" type="number" placeholder="0" />
                                    <p className="text-[11px] text-slate-500 mt-1">* Có thể để trống, cập nhật sau khi map mã chuẩn.</p>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpenManualDialog(false)}>Hủy</Button>
                                    <Button type="submit" disabled={newItemLoading}>
                                        {newItemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu lại"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

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

            {/* TABLE */}
            <Card className="border-none shadow-none bg-white">
                <Table className="border rounded-md">
                    <TableHeader>
                        <TableRow className="bg-slate-100">
                            <TableHead className="w-[50px] text-center">STT</TableHead>
                            <TableHead className="min-w-[250px]">Thông tin Gốc (Từ Excel/Nhập tay)</TableHead>
                            <TableHead className="w-[120px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[50px] text-center"></TableHead>
                            <TableHead className="min-w-[250px]">Mã Chuẩn (Master Data)</TableHead>
                            <TableHead className="w-[130px] text-right">Đơn giá</TableHead>
                            <TableHead className="w-[130px] text-right">Thành tiền</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!initLoaded ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                        ) : sortedItems.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500 italic">Chưa có dữ liệu. Hãy Import Excel hoặc Thêm mới.</TableCell></TableRow>
                        ) : (
                            // ✅ Render sortedItems thay vì items
                            sortedItems.map((item, index) => (
                                <TableRow key={item.id} className={item.is_mapped ? "bg-green-50/20 hover:bg-green-50/40" : "hover:bg-slate-50"}>
                                    <TableCell className="text-center text-slate-500 text-xs">{index + 1}</TableCell>

                                    {/* CỘT THÔNG TIN GỐC */}
                                    <TableCell>
                                        <div className="font-medium text-slate-700">{item.original_name || item.material_name}</div>
                                        {/* Hiển thị tên Hạng mục để người dùng biết đã được gom nhóm */}
                                        {item.section_name && <div className="text-[10px] text-slate-400 italic">{item.section_name}</div>}
                                    </TableCell>

                                    <TableCell className="text-right font-semibold text-slate-600">
                                        {Number(item.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                        <span className="text-[10px] ml-1 text-slate-400 font-normal">{item.unit}</span>
                                    </TableCell>

                                    {/* ICON LIÊN KẾT */}
                                    <TableCell className="text-center">
                                        <LinkIcon className={`w-4 h-4 ${item.is_mapped ? "text-green-500" : "text-slate-300"}`} />
                                    </TableCell>

                                    {/* CỘT MAPPING */}
                                    <TableCell>
                                        {item.is_mapped ? (
                                            <div className="flex flex-col group relative cursor-pointer">
                                                <div className="flex items-center gap-1">
                                                    <Badge className="bg-green-100 text-green-700 border-green-200 px-1 py-0 h-5 text-[10px]">{item.material_code}</Badge>
                                                </div>
                                                <span className="text-sm text-green-800 line-clamp-1">{item.material_name}</span>

                                                <div className="absolute right-0 top-0 hidden group-hover:block bg-white shadow-sm rounded border z-10">
                                                    <MaterialSelector
                                                        onSelect={(mat) => handleMaterialSelect(item.id, mat)}
                                                        defaultSearch={item.original_name}
                                                        trigger={
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:text-blue-800 p-0 w-full justify-start pl-2">
                                                                Sửa mã
                                                            </Button>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-amber-600 italic mr-2">Chưa khớp</span>
                                                <MaterialSelector
                                                    onSelect={(mat) => handleMaterialSelect(item.id, mat)}
                                                    defaultSearch={item.original_name}
                                                />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* CỘT GIÁ */}
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

                                    {/* CỘT XÓA */}
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost" size="icon"
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