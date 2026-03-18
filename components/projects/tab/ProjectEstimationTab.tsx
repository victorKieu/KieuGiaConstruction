"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Loader2, RefreshCw, DollarSign, FileSpreadsheet, Upload, Trash2, Plus, Calculator,
    Layers, HardHat, Tractor, PieChart, ChevronDown, ChevronRight, FoldVertical
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/utils";

import {
    updateEstimationPrice, deleteEstimationItem, createManualEstimationItem,
    analyzeQTOAndGenerateEstimation, updateEstimationQuantity, updateEstimationPriceByGroup
} from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";
import { MaterialSelector } from "@/components/common/MaterialSelector";

interface Props { projectId: string; }

export default function ProjectEstimationTab({ projectId, qtoItems, norms }: any) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const [qtoTasks, setQtoTasks] = useState<any[]>([]);
    const [estItems, setEstItems] = useState<any[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

    const [openManualDialog, setOpenManualDialog] = useState(false);
    const [newItemLoading, setNewItemLoading] = useState(false);

    // Quản lý Modal Tổng hợp
    const [activeModal, setActiveModal] = useState<'total' | 'VL' | 'NC' | 'M' | null>(null);

    // Quản lý Đóng/Mở Group
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: qtoData } = await supabase.from('qto_items').select('*, details:qto_item_details(*)').eq('project_id', projectId).order('created_at', { ascending: true });
        const { data: estData } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);
        setQtoTasks(qtoData || []);
        setEstItems(estData || []);
        setInitLoaded(true);
    };

    const toggleRow = (id: string) => { setExpandedRows(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] })); };
    const toggleSection = (id: string) => { setExpandedSections(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] })); };

    const handleToggleAllSections = () => {
        const sections = qtoTasks.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));
        const isAnyCollapsed = sections.some(s => expandedSections[s.id] === false);

        if (isAnyCollapsed) {
            setExpandedSections({}); // Mở tất cả
        } else {
            const newState: Record<string, boolean> = {};
            sections.forEach(s => newState[s.id] = false);
            newState['standalone'] = false;
            setExpandedSections(newState); // Đóng tất cả
        }
    };

    const handleSync = async () => {
        setLoading(true);
        const res = await analyzeQTOAndGenerateEstimation(projectId);
        if (res.success) { toast.success(res.message); await loadData(); router.refresh(); }
        else { toast.error(res.error); }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa mục này?`)) return;
        const res = await deleteEstimationItem(id, projectId);
        if (res.success) { toast.success(res.message); await loadData(); router.refresh(); }
        else { toast.error(res.error); }
    };

    const handlePriceChange = async (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setEstItems(prev => prev.map(item => item.id === id ? { ...item, unit_price: price, total_cost: item.quantity * price } : item));
        await updateEstimationPrice(id, projectId, price);
        router.refresh();
    };

    const handleBulkPriceChange = async (materialName: string, category: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setEstItems(prev => prev.map(item => (item.material_name === materialName && item.category === category) ? { ...item, unit_price: price, total_cost: item.quantity * price } : item));
        const res = await updateEstimationPriceByGroup(projectId, materialName, category, price);
        if (!res.success) toast.error("Lỗi áp giá: " + res.error);
        router.refresh();
    };

    const handleRateChange = async (id: string, newRate: string) => {
        const rate = parseFloat(newRate) || 0;
        setEstItems(prev => prev.map(item => item.id === id ? { ...item, quantity: rate } : item));
        await updateEstimationQuantity(id, projectId, rate);
        router.refresh();
    };

    const handleMaterialSelect = async (itemId: string, mat: any) => {
        const { error } = await supabase.from('estimation_items').update({ is_mapped: true, material_code: mat.code, material_name: mat.name, unit: mat.unit, unit_price: mat.ref_price || 0 }).eq('id', itemId);
        if (!error) {
            setEstItems(prev => prev.map(item => item.id === itemId ? { ...item, is_mapped: true, material_code: mat.code, material_name: mat.name, unit: mat.unit, unit_price: mat.ref_price || 0, total_cost: (item.quantity || 0) * (mat.ref_price || 0) } : item));
            router.refresh();
        } else { toast.error("Lỗi cập nhật: " + error.message); }
    };

    const handleCreateManual = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setNewItemLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = { name: formData.get("name"), unit: formData.get("unit"), quantity: formData.get("quantity"), unit_price: formData.get("unit_price") };
        const res = await createManualEstimationItem(projectId, data);
        if (res.success) { toast.success(res.message); setOpenManualDialog(false); loadData(); router.refresh(); }
        else { toast.error(res.error); }
        setNewItemLoading(false);
    };

    const handleDownloadTemplate = () => {
        const header = ["STT", "Mã hiệu (Bắt buộc)", "Tên công việc / Vật tư (Bắt buộc)", "ĐVT", "Dài", "Rộng", "Cao", "Khối lượng", "Đơn giá", "Thành tiền", "Ghi chú"];
        const sampleData = [["", "", "I. PHẦN MÓNG", "", "", "", "", "", "", "", "Hạng mục"], [1, "BT-LOT", "Bê tông lót móng đá 4x6", "m3", "", "", "", 10, 1200000, "", ""]];
        const ws = XLSX.utils.aoa_to_sheet([header, ...sampleData]);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 10 }];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template_Du_Toan"); XLSX.writeFile(wb, "Mau_Nhap_Du_Toan_KieuGia.xlsx"); toast.success("Đã tải file mẫu!");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsImporting(true); const formData = new FormData(); formData.append("file", file);
        try {
            const res = await importBOQFromExcel(projectId, formData);
            if (res.success) { toast.success(res.message); loadData(); router.refresh(); } else { toast.error(res.error); }
        } catch (error) { toast.error("Lỗi hệ thống."); } finally { setIsImporting(false); e.target.value = ""; }
    };

    // PHÂN TÁCH DỮ LIỆU
    const normalItems = estItems.filter(i => !['GT', 'LN', 'VAT'].includes(i.category));
    const globalParams = estItems.filter(i => ['GT', 'LN', 'VAT'].includes(i.category));
    const gtParam = globalParams.find(i => i.category === 'GT') || { quantity: 10, id: 'temp-gt' };
    const lnParam = globalParams.find(i => i.category === 'LN') || { quantity: 12, id: 'temp-ln' };
    const vatParam = globalParams.find(i => i.category === 'VAT') || { quantity: 10, id: 'temp-vat' };
    const standaloneItems = normalItems.filter(i => !i.qto_item_id);
    const sections = qtoTasks.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));

    // TÍNH TOÁN KINH PHÍ TỔNG
    const T = normalItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const GT = T * (gtParam.quantity / 100);
    const TL = (T + GT) * (lnParam.quantity / 100);
    const Gxd = T + GT + TL;
    const VAT = Gxd * (vatParam.quantity / 100);
    const TotalProject = Gxd + VAT;

    const totalVL = normalItems.filter(i => i.category === 'VL').reduce((sum, i) => sum + (i.total_cost || 0), 0);
    const totalNC = normalItems.filter(i => i.category === 'NC').reduce((sum, i) => sum + (i.total_cost || 0), 0);
    const totalM = normalItems.filter(i => i.category === 'M').reduce((sum, i) => sum + (i.total_cost || 0), 0);
    const totalKhac = TotalProject - totalVL - totalNC - totalM;

    const getSummaryByCategory = (category: string) => {
        const map = new Map();
        normalItems.filter(i => i.category === category).forEach(item => {
            const key = item.material_name;
            if (!map.has(key)) map.set(key, { ...item, total_quantity: 0, total_cost_sum: 0 });
            const exist = map.get(key); exist.total_quantity += Number(item.quantity); exist.total_cost_sum += Number(item.total_cost || 0);
        });
        return Array.from(map.values()).sort((a, b) => a.material_name.localeCompare(b.material_name));
    };

    function toRoman(num: number): string {
        const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        return roman[num] || num.toString();
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        Dự Toán & Tổng Hợp Kinh Phí
                    </h3>
                    <p className="text-sm text-muted-foreground">Thiết lập tỉ lệ % và chuẩn hóa đơn giá vật tư.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
                        <DialogTrigger asChild><Button className="h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" /> Thêm dòng</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Thêm mục chi phí bổ sung</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateManual} className="space-y-4 py-2">
                                <div><Label>Tên công việc / Vật tư <span className="text-red-500">*</span></Label><Input name="name" required placeholder="VD: Cát xây tô" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>Đơn vị tính</Label><Input name="unit" placeholder="m3, kg..." /></div>
                                    <div><Label>Khối lượng <span className="text-red-500">*</span></Label><Input name="quantity" type="number" step="0.01" required placeholder="0" /></div>
                                </div>
                                <div><Label>Đơn giá tạm tính</Label><Input name="unit_price" type="number" placeholder="0" /></div>
                                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenManualDialog(false)}>Hủy</Button><Button type="submit" disabled={newItemLoading}>{newItemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu lại"}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 border-green-200 text-green-700 hover:bg-green-50"><FileSpreadsheet className="w-4 h-4 mr-2" /> Template</Button>
                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <Button variant="outline" disabled={isImporting} className="h-9 border-border">{isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Import Excel</Button>
                    </div>
                    <Button onClick={handleSync} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} Đồng bộ QTO</Button>
                </div>
            </div>

            {/* ✅ BẢNG TÍNH TOÁN THÔNG SỐ KINH PHÍ (ĐÃ TRẢ LẠI THEO YÊU CẦU) */}
            <Card className="border border-blue-200 shadow-md bg-white overflow-hidden">
                <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-800 uppercase tracking-wide text-sm">Bảng Tính Toán Thông Số Kinh Phí</h4>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-[60px] text-center font-bold">STT</TableHead>
                            <TableHead className="font-bold">Khoản mục chi phí</TableHead>
                            <TableHead className="w-[150px] text-center font-bold">Ký hiệu</TableHead>
                            <TableHead className="w-[120px] text-center font-bold">Tỉ lệ (%)</TableHead>
                            <TableHead className="w-[200px] text-right font-bold">Thành tiền (VNĐ)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="text-center font-medium">1</TableCell><TableCell className="font-bold text-slate-700">Chi phí trực tiếp (VL + NC + M)</TableCell><TableCell className="text-center font-medium">T</TableCell><TableCell className="text-center text-slate-400">100%</TableCell><TableCell className="text-right font-bold text-slate-800">{formatCurrency(T)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-50/50">
                            <TableCell className="text-center font-medium">2</TableCell><TableCell className="font-medium text-slate-600">Chi phí gián tiếp (Quản lý, lán trại...)</TableCell><TableCell className="text-center font-medium text-slate-500">GT = T x %</TableCell>
                            <TableCell className="p-1"><Input type="number" className="h-8 text-center text-blue-700 font-bold border-blue-200 bg-white" defaultValue={gtParam.quantity} onBlur={(e) => handleRateChange(gtParam.id, e.target.value)} /></TableCell>
                            <TableCell className="text-right font-medium text-slate-700">{formatCurrency(GT)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-center font-medium">3</TableCell><TableCell className="font-medium text-slate-600">Thu nhập chịu thuế tính trước (Lợi nhuận)</TableCell><TableCell className="text-center font-medium text-slate-500">TL = (T+GT) x %</TableCell>
                            <TableCell className="p-1"><Input type="number" className="h-8 text-center text-blue-700 font-bold border-blue-200 bg-white" defaultValue={lnParam.quantity} onBlur={(e) => handleRateChange(lnParam.id, e.target.value)} /></TableCell>
                            <TableCell className="text-right font-medium text-slate-700">{formatCurrency(TL)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-orange-50/30">
                            <TableCell className="text-center font-medium">4</TableCell><TableCell className="font-bold text-orange-800">Chi phí xây dựng trước thuế</TableCell><TableCell className="text-center font-bold text-orange-800">G = T+GT+TL</TableCell><TableCell className="text-center text-slate-400">-</TableCell><TableCell className="text-right font-bold text-orange-700">{formatCurrency(Gxd)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-center font-medium">5</TableCell><TableCell className="font-medium text-slate-600">Thuế giá trị gia tăng (VAT)</TableCell><TableCell className="text-center font-medium text-slate-500">VAT = G x %</TableCell>
                            <TableCell className="p-1"><Input type="number" className="h-8 text-center text-blue-700 font-bold border-blue-200 bg-white" defaultValue={vatParam.quantity} onBlur={(e) => handleRateChange(vatParam.id, e.target.value)} /></TableCell>
                            <TableCell className="text-right font-medium text-slate-700">{formatCurrency(VAT)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-600">
                            <TableCell className="text-center font-bold text-white">6</TableCell><TableCell colSpan={3} className="font-bold text-white text-base uppercase tracking-wider">Tổng Cộng Chi Phí Xây Dựng (Sau Thuế)</TableCell><TableCell className="text-right font-extrabold text-white text-lg">{formatCurrency(TotalProject)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Card>

            {/* THANH ĐIỀU HƯỚNG TỔNG HỢP */}
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 rounded-md border border-slate-200">
                <Button variant="ghost" onClick={() => setActiveModal('total')} className="font-bold text-slate-700 hover:bg-white hover:text-blue-700 hover:shadow-sm transition-all"><PieChart className="w-4 h-4 mr-2 text-blue-600" /> Bảng Tổng Hợp Chi Phí</Button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <Button variant="ghost" onClick={() => setActiveModal('VL')} className="font-bold text-slate-700 hover:bg-white hover:text-orange-600 hover:shadow-sm transition-all"><Layers className="w-4 h-4 mr-2 text-orange-500" /> Tổng hợp Vật liệu</Button>
                <Button variant="ghost" onClick={() => setActiveModal('NC')} className="font-bold text-slate-700 hover:bg-white hover:text-green-600 hover:shadow-sm transition-all"><HardHat className="w-4 h-4 mr-2 text-green-500" /> Tổng hợp Nhân công</Button>
                <Button variant="ghost" onClick={() => setActiveModal('M')} className="font-bold text-slate-700 hover:bg-white hover:text-purple-600 hover:shadow-sm transition-all"><Tractor className="w-4 h-4 mr-2 text-purple-500" /> Tổng hợp Máy TC</Button>
            </div>

            {/* BẢNG DỰ TOÁN CHI TIẾT */}
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center justify-between">
                    <h4 className="font-bold text-slate-700 uppercase tracking-wide text-sm ml-2">Bảng Phân Tích Vật Tư & Chi Phí Trực Tiếp</h4>
                    <Button variant="outline" size="sm" onClick={handleToggleAllSections} className="h-7 text-xs bg-white hover:bg-slate-100 text-slate-600 border-slate-300">
                        <FoldVertical className="w-3 h-3 mr-1" />
                        {Object.values(expandedSections).some(v => v === false) ? "Mở rộng tất cả hạng mục" : "Thu gọn tất cả hạng mục"}
                    </Button>
                </div>
                <Table className="bg-white">
                    <TableHeader>
                        <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                            <TableHead className="w-[50px] text-center font-bold text-slate-800">STT</TableHead>
                            <TableHead className="w-[100px] font-bold text-center text-slate-800">Mã hiệu</TableHead>
                            <TableHead className="w-[90px] font-bold text-center text-slate-800">Loại</TableHead>
                            <TableHead className="min-w-[350px] font-bold text-slate-800">Tên công việc / Hao phí</TableHead>
                            <TableHead className="w-[120px] text-right font-bold text-slate-800">Định mức</TableHead>
                            <TableHead className="w-[140px] text-right font-bold text-slate-800">Đơn giá</TableHead>
                            <TableHead className="w-[150px] text-right font-bold text-slate-800">Thành tiền</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!initLoaded ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : (
                            <>
                                {/* CÔNG TÁC QTO */}
                                {sections.map((section, secIdx) => {
                                    const tasks = qtoTasks.filter(i => i.parent_id === section.id && i.item_type !== 'section');
                                    const isSectionExpanded = expandedSections[section.id] !== false;

                                    return (
                                        <React.Fragment key={section.id}>
                                            <TableRow className="bg-slate-200 border-b-2 border-slate-300">
                                                <TableCell className="text-center font-bold text-slate-800">{toRoman(secIdx + 1)}</TableCell>
                                                <TableCell className="p-1" colSpan={7}>
                                                    <div className="flex items-center gap-1 w-full">
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-700 hover:bg-slate-300 shrink-0" onClick={() => toggleSection(section.id)}>
                                                            {isSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </Button>
                                                        <span className="font-bold text-slate-800 uppercase tracking-wide px-2">{section.item_name}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {isSectionExpanded && tasks.map((task, taskIdx) => {
                                                const children = estItems.filter(i => i.qto_item_id === task.id);
                                                const taskTotal = children.reduce((sum, item) => sum + (item.total_cost || 0), 0);

                                                let taskVol = Number(task.quantity) || 0;
                                                if (taskVol === 0 && task.details && task.details.length > 0) {
                                                    taskVol = task.details.reduce((sum: number, d: any) => {
                                                        const l = parseFloat(d.length) || 0, w = parseFloat(d.width) || 0, h = parseFloat(d.height) || 0, f = parseFloat(d.quantity_factor) || 0;
                                                        if (l === 0 && w === 0 && h === 0) return sum + f;
                                                        return sum + ((l !== 0 ? l : 1) * (w !== 0 ? w : 1) * (h !== 0 ? h : 1) * (f !== 0 ? f : 1));
                                                    }, 0);
                                                }

                                                const isTaskExpanded = expandedRows[task.id] !== false;

                                                return (
                                                    <React.Fragment key={task.id}>
                                                        <TableRow className="bg-slate-100/50 border-b border-slate-200">
                                                            <TableCell className="text-center font-bold border-r border-slate-200 text-slate-600">{taskIdx + 1}</TableCell>
                                                            <TableCell className="font-bold border-r border-slate-200 text-center text-blue-700">{task.norm_code}</TableCell>
                                                            <TableCell className="border-r border-slate-200"></TableCell>
                                                            <TableCell className="font-bold text-blue-900 border-r border-slate-200 cursor-pointer hover:bg-blue-50/50" onClick={() => toggleRow(task.id)}>
                                                                <div className="flex items-start gap-1">
                                                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 mt-0.5 text-blue-700 hover:bg-blue-200 shrink-0">
                                                                        {isTaskExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                    </Button>
                                                                    <span className="leading-tight">{task.item_name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-slate-700 border-r border-slate-200">KL: {taskVol.toLocaleString('en-US', { maximumFractionDigits: 2 })}</TableCell>
                                                            <TableCell className="border-r border-slate-200"></TableCell>
                                                            <TableCell className="text-right font-bold text-blue-700">{formatCurrency(taskTotal)}</TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>

                                                        {isTaskExpanded && children.map(child => {
                                                            const savedNorm = child.dimensions?.norm;
                                                            const dinhmuc = savedNorm !== undefined ? savedNorm : (taskVol > 0 ? (child.quantity / taskVol) : child.quantity);

                                                            return (
                                                                <TableRow key={child.id} className={child.is_mapped ? "hover:bg-green-50/50" : "hover:bg-muted/30"}>
                                                                    <TableCell className="border-r border-slate-200"></TableCell>
                                                                    <TableCell className="border-r border-slate-200"></TableCell>
                                                                    <TableCell className="text-center font-medium border-r border-slate-200">
                                                                        {child.is_mapped ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-1 text-[10px]">{child.material_code}</Badge> : (child.category || "Khác")}
                                                                    </TableCell>
                                                                    <TableCell className="border-r border-slate-200 text-slate-700 pl-8">
                                                                        <div className="flex justify-between items-center group relative">
                                                                            <span className={child.is_mapped ? "text-green-800 font-medium" : ""}>- {child.original_name || child.material_name}</span>
                                                                            {child.is_mapped ? (
                                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bg-white">
                                                                                    <MaterialSelector onSelect={(mat) => handleMaterialSelect(child.id, mat)} defaultSearch={child.original_name} trigger={<Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">Sửa mã</Button>} />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center">
                                                                                    <span className="text-xs text-amber-600 italic mr-2">Chưa khớp</span>
                                                                                    <MaterialSelector onSelect={(mat) => handleMaterialSelect(child.id, mat)} defaultSearch={child.original_name} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right border-r border-slate-200 text-slate-600 font-mono text-sm">{Number(dinhmuc).toLocaleString('en-US', { maximumFractionDigits: 5 })} <span className="text-[10px] text-slate-400 ml-1">{child.unit}</span></TableCell>
                                                                    <TableCell className="text-right border-r border-slate-200 p-1"><Input type="number" className="h-7 text-right text-sm bg-transparent border-transparent hover:border-slate-300 focus:bg-white focus:ring-1" defaultValue={child.unit_price} onBlur={(e) => handlePriceChange(child.id, e.target.value)} /></TableCell>
                                                                    <TableCell className="text-right font-medium">{formatCurrency(child.total_cost || 0)}</TableCell>
                                                                    <TableCell className="text-center p-1"><Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(child.id, child.material_name)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}

                                {/* HẠNG MỤC IMPORT / THÊM TAY */}
                                {standaloneItems.length > 0 && (
                                    <React.Fragment key="standalone">
                                        <TableRow className="bg-orange-50 border-b-2 border-slate-200">
                                            <TableCell className="text-center font-bold border-r border-slate-200 text-orange-700">*</TableCell>
                                            <TableCell className="p-1" colSpan={6}>
                                                <div className="flex items-center gap-1 w-full">
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-orange-700 hover:bg-orange-200 shrink-0" onClick={() => toggleSection('standalone')}>
                                                        {expandedSections['standalone'] !== false ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </Button>
                                                    <span className="font-bold text-orange-700 uppercase tracking-wide px-2">CHI PHÍ BỔ SUNG / IMPORT EXCEL</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-orange-700">{formatCurrency(standaloneItems.reduce((s, i) => s + (i.total_cost || 0), 0))}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>

                                        {expandedSections['standalone'] !== false && standaloneItems.map(child => (
                                            <TableRow key={child.id} className={child.is_mapped ? "hover:bg-green-50/50" : "hover:bg-muted/30"}>
                                                <TableCell className="border-r border-slate-200"></TableCell>
                                                <TableCell className="border-r border-slate-200"></TableCell>
                                                <TableCell className="text-center font-medium border-r border-slate-200">{child.is_mapped ? <Badge className="bg-green-100 text-green-700 border-none px-1 text-[10px]">{child.material_code}</Badge> : (child.category || "Khác")}</TableCell>
                                                <TableCell className="border-r border-slate-200 text-slate-700 pl-8">
                                                    <div className="flex justify-between items-center group relative">
                                                        <span className={child.is_mapped ? "text-green-800 font-medium" : ""}>- {child.original_name || child.material_name}</span>
                                                        {child.is_mapped ? (
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bg-white">
                                                                <MaterialSelector onSelect={(mat) => handleMaterialSelect(child.id, mat)} defaultSearch={child.original_name} trigger={<Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">Sửa mã</Button>} />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center">
                                                                <span className="text-xs text-amber-600 italic mr-2">Chưa khớp</span>
                                                                <MaterialSelector onSelect={(mat) => handleMaterialSelect(child.id, mat)} defaultSearch={child.original_name} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right border-r border-slate-200 text-slate-600 font-mono text-sm">{Number(child.quantity).toLocaleString('en-US', { maximumFractionDigits: 4 })} <span className="text-[10px] text-slate-400 ml-1">{child.unit}</span></TableCell>
                                                <TableCell className="text-right border-r border-slate-200 p-1"><Input type="number" className="h-7 text-right text-sm bg-transparent border-transparent hover:border-slate-300 focus:bg-white focus:ring-1" defaultValue={child.unit_price} onBlur={(e) => handlePriceChange(child.id, e.target.value)} /></TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(child.total_cost || 0)}</TableCell>
                                                <TableCell className="text-center p-1"><Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(child.id, child.material_name)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* MODAL TỔNG HỢP */}
            <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    {activeModal === 'total' && (
                        <>
                            <DialogHeader><DialogTitle className="text-center text-xl font-bold text-slate-800 uppercase tracking-widest">Bảng Tổng Hợp Chi Phí</DialogTitle></DialogHeader>
                            <Table className="border mt-4">
                                <TableHeader><TableRow className="bg-slate-100 border-b-2 border-slate-300"><TableHead className="w-[60px] text-center font-bold text-slate-800">STT</TableHead><TableHead className="font-bold text-center text-slate-800">Tên chi phí</TableHead><TableHead className="w-[100px] text-center font-bold text-slate-800">Đơn vị</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-800">Giá trị</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="text-center font-medium">1</TableCell><TableCell>Chi phí vật liệu</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold">{formatCurrency(totalVL)}</TableCell></TableRow>
                                    <TableRow><TableCell className="text-center font-medium">2</TableCell><TableCell>Chi phí nhân công</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold">{formatCurrency(totalNC)}</TableCell></TableRow>
                                    <TableRow><TableCell className="text-center font-medium">3</TableCell><TableCell>Chi phí máy thi công</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold">{formatCurrency(totalM)}</TableCell></TableRow>
                                    <TableRow><TableCell className="text-center font-medium">4</TableCell><TableCell>Chi phí khác (GT, LN, VAT...)</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold">{formatCurrency(totalKhac)}</TableCell></TableRow>
                                    <TableRow className="bg-slate-50"><TableCell colSpan={3} className="text-center font-extrabold text-slate-800 uppercase text-base tracking-widest">Tổng Cộng</TableCell><TableCell className="text-right font-extrabold text-blue-700 text-lg">{formatCurrency(TotalProject)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </>
                    )}
                    {['VL', 'NC', 'M'].includes(activeModal || '') && (
                        <>
                            <DialogHeader><DialogTitle className="text-center text-xl font-bold text-slate-800 uppercase tracking-widest">Bảng Tổng Hợp {activeModal === 'VL' ? 'Vật Liệu' : activeModal === 'NC' ? 'Nhân Công' : 'Máy Thi Công'}</DialogTitle></DialogHeader>
                            <Table className="border mt-4">
                                <TableHeader>
                                    <TableRow className="bg-slate-100 border-b-2 border-slate-300">
                                        <TableHead className="w-[50px] text-center font-bold text-slate-800">STT</TableHead><TableHead className="min-w-[250px] font-bold text-slate-800">Tên Vật tư / Nhân công / Máy</TableHead><TableHead className="w-[80px] text-center font-bold text-slate-800">ĐVT</TableHead><TableHead className="w-[120px] text-right font-bold text-slate-800">Tổng KL</TableHead><TableHead className="w-[150px] text-right font-bold text-slate-800 bg-blue-50 text-blue-800">Áp Đơn Giá</TableHead><TableHead className="w-[150px] text-right font-bold text-slate-800">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {getSummaryByCategory(activeModal!).map((mat: any, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell className="text-center text-slate-500">{idx + 1}</TableCell><TableCell className="font-medium text-slate-800">{mat.material_name}</TableCell><TableCell className="text-center text-slate-500">{mat.unit}</TableCell><TableCell className="text-right font-semibold text-slate-700">{Number(mat.total_quantity).toLocaleString('en-US', { maximumFractionDigits: 3 })}</TableCell>
                                            <TableCell className="text-right p-1 bg-blue-50/30 border-l border-r border-blue-100"><Input type="number" className="h-8 text-right text-sm font-bold text-blue-700 bg-white border-blue-200 focus:ring-blue-500" defaultValue={mat.unit_price} onBlur={(e) => handleBulkPriceChange(mat.material_name, mat.category, e.target.value)} /></TableCell>
                                            <TableCell className="text-right font-bold text-slate-800">{formatCurrency(mat.total_cost_sum)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {getSummaryByCategory(activeModal!).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">Không có dữ liệu</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}