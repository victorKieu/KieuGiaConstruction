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
import { formatCurrency } from "@/lib/utils/utils"; //

import {
    createEstimationFromBudget,
    updateEstimationPrice,
    getEstimationItems,
    deleteEstimationItem,
    createManualEstimationItem
} from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";
import { MaterialSelector } from "@/components/common/MaterialSelector";

interface Props {
    projectId: string;
}

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
    const [openManualDialog, setOpenManualDialog] = useState(false);
    const [newItemLoading, setNewItemLoading] = useState(false);

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
                toast.success(res.message);
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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa mục "${name}"?`)) return;
        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.id !== id));
        const res = await deleteEstimationItem(id, projectId);
        if (res.success) {
            toast.success(res.message);
            router.refresh();
        } else {
            toast.error(res.error);
            setItems(oldItems);
        }
    };

    const handlePriceChange = async (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setItems(prev => prev.map(item => item.id === id ? { ...item, unit_price: price, total_cost: item.quantity * price } : item));
        await updateEstimationPrice(id, projectId, price);
        router.refresh();
    };

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

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            const secA = (a.section_name || "").toString().trim();
            const secB = (b.section_name || "").toString().trim();
            const secCompare = secA.localeCompare(secB, 'vi');
            if (secCompare !== 0) return secCompare;
            const nameA = (a.original_name || a.material_name || "").toString().trim();
            const nameB = (b.original_name || b.material_name || "").toString().trim();
            return nameA.localeCompare(nameB, 'vi');
        });
    }, [items]);

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* HEADER - ✅ FIX: bg-white -> bg-card */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
                <div>
                    {/* ✅ FIX: text-slate-800 -> text-foreground, text-slate-500 -> text-muted-foreground */}
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Bảng Dự toán & Chuẩn hóa
                    </h3>
                    <p className="text-sm text-muted-foreground">Chuẩn hóa dữ liệu Import và quản lý chi phí.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* ✅ FIX: bg-purple-50 -> dark:bg-purple-900/20, border-purple-100 -> dark:border-purple-900 */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded border border-purple-100 dark:border-purple-900 text-right mr-2">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase block">Tổng cộng</span>
                        <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(totalEstimate)}</span>
                    </div>

                    <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
                        <DialogTrigger asChild>
                            <Button className="h-9 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white shadow-sm">
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
                                    <p className="text-[11px] text-muted-foreground mt-1">* Có thể để trống, cập nhật sau khi map mã chuẩn.</p>
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

                    <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
                    </Button>

                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                        <Button variant="outline" disabled={isImporting} className="h-9 border-border">
                            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Import Excel
                        </Button>
                    </div>

                    <Button onClick={handleSync} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Đồng bộ QTO
                    </Button>
                </div>
            </div>

            {/* TABLE - ✅ FIX: bg-white -> bg-card */}
            <Card className="border-none shadow-none bg-card">
                <Table className="border rounded-md">
                    <TableHeader>
                        {/* ✅ FIX: bg-slate-100 -> bg-muted/50 */}
                        <TableRow className="bg-muted/50">
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
                            <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : sortedItems.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">Chưa có dữ liệu. Hãy Import Excel hoặc Thêm mới.</TableCell></TableRow>
                        ) : (
                            sortedItems.map((item, index) => (
                                // ✅ FIX: hover:bg-slate-50 -> hover:bg-muted/50, bg-green-50/20 -> dark:bg-green-900/10
                                <TableRow key={item.id} className={item.is_mapped ? "bg-green-50/20 dark:bg-green-900/10 hover:bg-green-50/40 dark:hover:bg-green-900/20" : "hover:bg-muted/50"}>
                                    <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>

                                    {/* CỘT THÔNG TIN GỐC */}
                                    <TableCell>
                                        <div className="font-medium text-foreground">{item.original_name || item.material_name}</div>
                                        {/* ✅ FIX: text-slate-400 -> text-muted-foreground */}
                                        {item.section_name && <div className="text-[10px] text-muted-foreground italic">{item.section_name}</div>}
                                    </TableCell>

                                    <TableCell className="text-right font-semibold text-muted-foreground">
                                        {Number(item.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                        <span className="text-[10px] ml-1 text-muted-foreground font-normal">{item.unit}</span>
                                    </TableCell>

                                    {/* ICON LIÊN KẾT */}
                                    <TableCell className="text-center">
                                        <LinkIcon className={`w-4 h-4 ${item.is_mapped ? "text-green-500" : "text-muted-foreground"}`} />
                                    </TableCell>

                                    {/* CỘT MAPPING */}
                                    <TableCell>
                                        {item.is_mapped ? (
                                            <div className="flex flex-col group relative cursor-pointer">
                                                <div className="flex items-center gap-1">
                                                    {/* ✅ FIX: Badge colors */}
                                                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 px-1 py-0 h-5 text-[10px]">{item.material_code}</Badge>
                                                </div>
                                                <span className="text-sm text-green-800 dark:text-green-300 line-clamp-1">{item.material_name}</span>

                                                {/* ✅ FIX: Popup bg-white -> bg-popover */}
                                                <div className="absolute right-0 top-0 hidden group-hover:block bg-popover shadow-sm rounded border border-border z-10">
                                                    <MaterialSelector
                                                        onSelect={(mat) => handleMaterialSelect(item.id, mat)}
                                                        defaultSearch={item.original_name}
                                                        trigger={
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-0 w-full justify-start pl-2">
                                                                Sửa mã
                                                            </Button>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-amber-600 dark:text-amber-400 italic mr-2">Chưa khớp</span>
                                                <MaterialSelector
                                                    onSelect={(mat) => handleMaterialSelect(item.id, mat)}
                                                    defaultSearch={item.original_name}
                                                />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* CỘT GIÁ - ✅ FIX: border-slate-200 -> border-input */}
                                    <TableCell className="text-right p-1">
                                        <Input
                                            type="number"
                                            className="text-right h-8 font-medium focus:ring-purple-500 border-input bg-background"
                                            defaultValue={item.unit_price}
                                            onBlur={(e) => handlePriceChange(item.id, e.target.value)}
                                            placeholder="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-foreground">
                                        {formatCurrency(item.total_cost || 0)}
                                    </TableCell>

                                    {/* CỘT XÓA */}
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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