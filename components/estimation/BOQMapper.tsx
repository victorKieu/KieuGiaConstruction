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
import {
    Loader2, RefreshCw, DollarSign, FileSpreadsheet, Upload, Trash2,
    Link as LinkIcon, Search, Check, AlertCircle
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// Import Actions
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

// --- MAIN COMPONENT ---
export default function ProjectEstimationTab({ projectId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

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
                toast.success(`Đã nhập thành công ${res.count} đầu mục!`);
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

    // 6. CẬP NHẬT SAU KHI MAPPING THÀNH CÔNG (Callback)
    const handleMappingSuccess = (itemId: string, updatedData: any) => {
        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, ...updatedData, is_mapped: true }
                : item
        ));
        router.refresh();
    };

    const totalEstimate = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    return (
        <div className="space-y-4">
            {/* HEADER - Đã fix bg-card text-foreground */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card text-card-foreground p-4 rounded-lg border border-border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Bảng Dự toán & Chuẩn hóa
                    </h3>
                    <p className="text-sm text-muted-foreground">Chuẩn hóa dữ liệu Import và quản lý chi phí.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Bảng tổng tiền fix cho dark mode */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded border border-purple-100 dark:border-purple-900/50 text-right mr-2">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase block">Tổng cộng</span>
                        <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(totalEstimate)}</span>
                    </div>

                    <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 border-green-200 dark:border-green-900 text-green-700 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
                    </Button>

                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                        <Button variant="outline" disabled={isImporting} className="h-9">
                            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Import Excel
                        </Button>
                    </div>

                    <Button onClick={handleSync} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Đồng bộ QTO
                    </Button>
                </div>
            </div>

            {/* TABLE - Đã fix màu bảng */}
            <Card className="border-none shadow-none bg-transparent">
                <Table className="border border-border rounded-md bg-card text-card-foreground">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[50px] text-center">STT</TableHead>
                            <TableHead className="min-w-[250px]">Thông tin Gốc</TableHead>
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
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">Chưa có dữ liệu. Hãy Import Excel hoặc Đồng bộ.</TableCell></TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={item.id} className={item.is_mapped ? "bg-green-50/30 dark:bg-green-900/10 hover:bg-green-50/50 dark:hover:bg-green-900/20" : "hover:bg-muted/50"}>
                                    <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>

                                    {/* CỘT THÔNG TIN GỐC */}
                                    <TableCell>
                                        <div className="font-medium text-foreground">{item.original_name || item.material_name}</div>
                                        {item.section_name && <div className="text-[10px] text-muted-foreground italic">{item.section_name}</div>}
                                    </TableCell>

                                    <TableCell className="text-right font-semibold text-foreground">
                                        {Number(item.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                        <span className="text-[10px] ml-1 text-muted-foreground font-normal">{item.unit}</span>
                                    </TableCell>

                                    {/* ICON LIÊN KẾT */}
                                    <TableCell className="text-center">
                                        <LinkIcon className={`w-4 h-4 ${item.is_mapped ? "text-green-500" : "text-muted-foreground opacity-30"}`} />
                                    </TableCell>

                                    {/* CỘT MAPPING (CHUẨN HÓA) */}
                                    <TableCell>
                                        {item.is_mapped ? (
                                            <div className="flex flex-col group relative">
                                                <div className="flex items-center gap-1">
                                                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 px-1 py-0 h-5 text-[10px]">Đã khớp</Badge>
                                                    <span className="font-bold text-green-700 dark:text-green-400 text-xs">{item.material_code}</span>
                                                </div>
                                                <span className="text-sm text-foreground line-clamp-1">{item.material_name}</span>

                                                {/* Nút sửa ẩn hiện khi hover */}
                                                <div className="absolute right-0 top-0 hidden group-hover:block bg-background shadow-sm rounded border border-border">
                                                    <ResourceSelector
                                                        projectId={projectId}
                                                        itemId={item.id}
                                                        originalName={item.original_name}
                                                        onSuccess={handleMappingSuccess}
                                                        triggerLabel="Sửa"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-amber-600 dark:text-amber-500 italic mr-2">Chưa khớp mã</span>
                                                <ResourceSelector
                                                    projectId={projectId}
                                                    itemId={item.id}
                                                    originalName={item.original_name}
                                                    onSuccess={handleMappingSuccess}
                                                />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* CỘT GIÁ */}
                                    <TableCell className="text-right p-1">
                                        <Input
                                            type="number"
                                            className="text-right h-8 font-medium focus:ring-purple-500 bg-background"
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

// --- SUB-COMPONENT: RESOURCE SELECTOR (Hộp thoại tìm mã chuẩn) ---
function ResourceSelector({ projectId, itemId, originalName, onSuccess, triggerLabel }: any) {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(originalName || "");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Tự động tìm khi mở
    useEffect(() => {
        if (open && originalName && results.length === 0) {
            handleSearch();
        }
    }, [open]);

    const handleSearch = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('norm_definitions')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(10);
        setResults(data || []);
        setLoading(false);
    };

    const handleSelect = async (norm: any) => {
        const { error } = await supabase
            .from('estimation_items')
            .update({
                is_mapped: true,
                material_code: norm.code,
                material_name: norm.name,
                unit: norm.unit,
            })
            .eq('id', itemId);

        if (!error) {
            toast.success("Đã khớp mã!");
            setOpen(false);
            onSuccess(itemId, {
                material_code: norm.code,
                material_name: norm.name,
                unit: norm.unit
            });
        } else {
            toast.error("Lỗi lưu dữ liệu");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerLabel ? (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-0 hover:bg-transparent underline decoration-dashed">
                        {triggerLabel}
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="h-7 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
                        <Search className="w-3 h-3 mr-1.5" /> Tìm mã
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Chọn mã chuẩn cho: <span className="text-red-600 dark:text-red-400">"{originalName}"</span></DialogTitle>
                </DialogHeader>
                <div className="flex gap-2 my-2">
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Nhập tên công việc để tìm..."
                        className="bg-background"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Tìm"}
                    </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border-t border-border pt-2">
                    {results.map(r => (
                        <div key={r.id} onClick={() => handleSelect(r)} className="p-3 border border-border rounded bg-card hover:bg-muted cursor-pointer flex justify-between items-center group transition-colors">
                            <div>
                                <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{r.code}</div>
                                <div className="text-sm font-medium text-foreground">{r.name}</div>
                                <div className="text-xs text-muted-foreground">ĐVT: {r.unit}</div>
                            </div>
                            <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">Chọn</Button>
                        </div>
                    ))}
                    {!loading && results.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Không tìm thấy mã phù hợp trong CSDL định mức.</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}