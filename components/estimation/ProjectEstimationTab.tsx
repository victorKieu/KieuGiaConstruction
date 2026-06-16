"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, FileSpreadsheet, Upload, Trash2, Plus, Calculator, Layers, HardHat, Tractor, PieChart, ChevronDown, ChevronRight, FoldVertical, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/utils";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { pushEstimationToProcurementAction } from "@/lib/action/estimationActions";
import {
    updateEstimationPrice, deleteEstimationItem, createManualEstimationItem,
    updateEstimationQuantity, updateEstimationPriceByGroup, updateEstimationMaterialByGroup
} from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";
import { MaterialSelector } from "@/components/common/MaterialSelector";

interface Props { projectId: string; onUpdate?: () => void; }

// ✅ ĐỊNH NGHĨA TYPE ĐỂ FIX LỖI TS2339 TỪ SERVER ACTIONS
type ActionResponse = {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
};

export default function ProjectEstimationTab({ projectId, onUpdate }: Props) {
    const router = useRouter();
    const supabase = createClient();

    // STATES
    const [loading, setLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [qtoTasks, setQtoTasks] = useState<any[]>([]);
    const [estItems, setEstItems] = useState<any[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

    const [openManualDialog, setOpenManualDialog] = useState(false);
    const [newItemLoading, setNewItemLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<'total' | 'VL' | 'NC' | 'M' | null>(null);

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    useEffect(() => { loadData(); }, [projectId]);

    const loadData = async () => {
        if (!projectId) return;
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
            setExpandedSections({});
        } else {
            const newState: Record<string, boolean> = {};
            sections.forEach(s => newState[s.id] = false);
            newState['standalone'] = false;
            setExpandedSections(newState);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa mục này?`)) return;
        const res = (await deleteEstimationItem(id, projectId)) as ActionResponse;
        if (res.success) {
            toast.success(res.message);
            await loadData();
            if (onUpdate) onUpdate();
            router.refresh();
        } else { toast.error(res.error); }
    };

    const handlePriceChange = async (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        const res = (await updateEstimationPrice(id, projectId, price)) as ActionResponse;
        if (!res.success) toast.error("Lỗi lưu giá: " + res.error);
        else {
            await loadData();
            if (onUpdate) onUpdate();
            router.refresh();
        }
    };

    const handleBulkPriceChange = async (materialName: string, category: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        const res = (await updateEstimationPriceByGroup(projectId, materialName, category, price)) as ActionResponse;
        if (!res.success) toast.error("Lỗi áp giá: " + res.error);
        else {
            await loadData();
            if (onUpdate) onUpdate();
            router.refresh();
        }
    };

    const handleBulkMaterialSelect = async (oldMaterialName: string, category: string, mat: any) => {
        // ✅ Cố định ID cho Toast để tránh bị thông báo rác xếp hàng dài
        const toastId = `toast-bulk-${oldMaterialName}`;
        toast.loading("Đang tính toán hệ số quy đổi và đổi mã...", { id: toastId });
        const res = (await updateEstimationMaterialByGroup(projectId, oldMaterialName, category, mat)) as ActionResponse;
        if (!res.success) {
            toast.error("Lỗi đổi mã vật tư: " + res.error, { id: toastId });
        } else {
            toast.success(`Đã đổi mã và cập nhật hệ số: ${mat.name}`, { id: toastId });
            await loadData();
            if (onUpdate) onUpdate();
            router.refresh();
        }
    };

    const handleRateChange = async (id: string, category: string, newRate: string) => {
        const rate = parseFloat(newRate) || 0;
        const res = (await updateEstimationQuantity(id, projectId, rate, category)) as ActionResponse;
        if (res?.success === false) {
            toast.error("Lỗi lưu tỷ lệ: " + res.error);
        } else {
            toast.success(`Đã cập nhật tỉ lệ ${category} thành ${rate}%`);
        }
        await loadData();
        if (onUpdate) onUpdate();
        router.refresh();
    };

    const handleMaterialSelect = async (itemId: string, mat: any) => {
        const { error } = await supabase.from('estimation_items').update({
            is_mapped: true, material_code: mat.code, material_name: mat.name, unit: mat.unit, unit_price: mat.ref_price || 0
        }).eq('id', itemId);

        if (!error) {
            await loadData();
            if (onUpdate) onUpdate();
            router.refresh();
        } else { toast.error("Lỗi cập nhật: " + error.message); }
    };

    const handleCreateManual = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setNewItemLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = { name: formData.get("name"), unit: formData.get("unit"), quantity: formData.get("quantity"), unit_price: formData.get("unit_price") };
        const res = (await createManualEstimationItem(projectId, data)) as ActionResponse;
        if (res.success) {
            toast.success(res.message);
            setOpenManualDialog(false);
            await loadData();
            if (onUpdate) onUpdate();
            router.refresh();
        } else { toast.error(res.error); }
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
            const res = (await importBOQFromExcel(projectId, formData)) as ActionResponse;
            if (res.success) {
                toast.success(res.message);
                await loadData();
                if (onUpdate) onUpdate();
                router.refresh();
            } else { toast.error(res.error); }
        } catch (error) { toast.error("Lỗi hệ thống."); } finally { setIsImporting(false); e.target.value = ""; }
    };

    function toRoman(num: number): string {
        const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        return roman[num] || num.toString();
    }

    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0, wid = parseFloat(w) || 0, hei = parseFloat(h) || 0, fac = parseFloat(f) || 0;
        if (len === 0 && wid === 0 && hei === 0) return fac;
        return (len !== 0 ? len : 1) * (wid !== 0 ? wid : 1) * (hei !== 0 ? hei : 1) * (fac !== 0 ? fac : 1);
    };

    // =====================================================================
    // 🧠 BỘ NÃO XỬ LÝ ĐƠN GIÁ ĐỘNG (THEO CÔNG THỨC CHUẨN KẾ TOÁN)
    // =====================================================================
    const normalItems = estItems.filter(i => !['GT', 'LN', 'VAT'].includes(i.category));
    const globalParams = estItems.filter(i => ['GT', 'LN', 'VAT'].includes(i.category));
    const gtParam = globalParams.find(i => i.category === 'GT') || { quantity: 10, id: 'temp-gt' };
    const lnParam = globalParams.find(i => i.category === 'LN') || { quantity: 12, id: 'temp-ln' };
    const vatParam = globalParams.find(i => i.category === 'VAT') || { quantity: 10, id: 'temp-vat' };
    const standaloneItems = normalItems.filter(i => !i.qto_item_id);
    const sections = qtoTasks.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));

    // Tính toán TỔNG LƯỢNG GỐC toàn dự án và ĐƠN GIÁ ĐÃ QUY ĐỔI CHO TỪNG VẬT TƯ
    const aggregatedSummaries = useMemo(() => {
        const map = new Map();

        // Sum hao phí gốc
        normalItems.forEach(item => {
            const key = item.material_name;
            if (!map.has(key)) {
                const dim = item.dimensions || {};
                const rate = Number(dim.conversion_rate) || 1;
                const pUnit = dim.purchase_unit || item.unit;
                const pPrice = dim.purchase_price !== undefined ? Number(dim.purchase_price) : (Number(item.unit_price || 0) * rate);

                map.set(key, {
                    ...item,
                    display_unit: pUnit,
                    display_price: pPrice, // Giá 1 Bao/Cây
                    conversion_rate: rate,
                    total_quantity: 0,
                    total_cost_sum: 0,
                    effective_price: 0
                });
            }

            const exist = map.get(key);
            const rawQty = item.dimensions?.raw_quantity !== undefined ? Number(item.dimensions.raw_quantity) : Number(item.quantity);
            exist.total_quantity += rawQty;
        });

        // Áp dụng công thức tính Đơn giá sau quy đổi
        const summaries = Array.from(map.values()).map((exist: any) => {
            if (exist.conversion_rate > 1 && exist.total_quantity > 0) {
                exist.display_quantity = Math.ceil(exist.total_quantity / exist.conversion_rate);
                exist.total_cost_sum = exist.display_quantity * exist.display_price;
                exist.effective_price = exist.total_cost_sum / exist.total_quantity;
            } else {
                exist.display_quantity = exist.total_quantity;
                exist.total_cost_sum = exist.total_quantity * (exist.display_price / exist.conversion_rate);
                exist.effective_price = exist.display_price / exist.conversion_rate;
            }
            return exist;
        }).sort((a, b) => a.material_name.localeCompare(b.material_name));

        return summaries;
    }, [normalItems]);

    const getSummaryByCategory = (category: string) => {
        return aggregatedSummaries.filter(s => s.category === category);
    };

    // Tính Tài chính dự án dựa trên Đơn giá sau quy đổi (Đã cõng hao hụt)
    const T = normalItems.reduce((sum, item) => {
        const summary = aggregatedSummaries.find(s => s.material_name === item.material_name);
        const effPrice = summary?.effective_price || Number(item.unit_price || 0);
        const rawQty = item.dimensions?.raw_quantity !== undefined ? Number(item.dimensions.raw_quantity) : Number(item.quantity);
        return sum + (rawQty * effPrice);
    }, 0);

    const GT = T * (gtParam.quantity / 100);
    const TL = (T + GT) * (lnParam.quantity / 100);
    const Gxd = T + GT + TL;
    const VAT = Gxd * (vatParam.quantity / 100);
    const TotalProject = Gxd + VAT;

    const totalVL = getSummaryByCategory('VL').reduce((sum, item) => sum + item.total_cost_sum, 0);
    const totalNC = getSummaryByCategory('NC').reduce((sum, item) => sum + item.total_cost_sum, 0);
    const totalM = getSummaryByCategory('M').reduce((sum, item) => sum + item.total_cost_sum, 0);
    const totalKhac = TotalProject - totalVL - totalNC - totalM;

    // ✅ TÍNH NĂNG XUẤT EXCEL THEO ĐÚNG LAYOUT BẢNG PHÂN TÍCH ĐƠN GIÁ CŨ
    const handleExportDetailExcel = () => {
        const allData: any[] = [];
        let stt = 1;
        const tasks = qtoTasks.filter(i => i.item_type === 'task');

        tasks.forEach((task) => {
            const taskHaoPhi = estItems.filter(e => e.qto_item_id === task.id);
            if (taskHaoPhi.length === 0) return;

            const taskVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || Number(task.quantity) || 0;
            const taskTotalCost = taskHaoPhi.reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);
            const taskUnitPrice = taskVol > 0 ? taskTotalCost / taskVol : 0;

            // Dòng Công tác chính
            allData.push({
                "STT": stt++,
                "Mã / Thành phần công tác": `[${task.norm_code}] ${task.item_name}`,
                "ĐVT": task.unit,
                "Khối lượng": Number(taskVol.toFixed(3)),
                "Định mức": "",
                "Đơn giá": Number(taskUnitPrice.toFixed(0)),
                "Thành tiền": Number(taskTotalCost.toFixed(0))
            });

            // Lặp qua 3 loại hao phí
            ['VL', 'NC', 'M'].forEach(cat => {
                const items = taskHaoPhi.filter(e => e.category === cat);
                if (items.length === 0) return;

                const catName = cat === 'VL' ? 'Vật liệu' : cat === 'NC' ? 'Nhân công' : 'Máy thi công';
                allData.push({
                    "STT": "", "Mã / Thành phần công tác": catName, "ĐVT": "",
                    "Khối lượng": "", "Định mức": "", "Đơn giá": "", "Thành tiền": ""
                });

                items.forEach(hp => {
                    const rawQty = Number(hp.quantity);
                    const normVal = taskVol > 0 ? rawQty / taskVol : 0;
                    const effectivePrice = Number(hp.unit_price) || 0;
                    const realCost = rawQty * effectivePrice;

                    allData.push({
                        "STT": "",
                        "Mã / Thành phần công tác": `- ${hp.material_name}`,
                        "ĐVT": hp.unit,
                        "Khối lượng": Number(rawQty.toFixed(4)),
                        "Định mức": Number(normVal.toFixed(4)),
                        "Đơn giá": Number(effectivePrice.toFixed(0)),
                        "Thành tiền": Number(realCost.toFixed(0))
                    });
                });
            });

            // Dòng trống cách các công tác
            allData.push({
                "STT": "", "Mã / Thành phần công tác": "", "ĐVT": "",
                "Khối lượng": "", "Định mức": "", "Đơn giá": "", "Thành tiền": ""
            });
        });

        if (allData.length > 0) {
            exportToExcel(allData, `BangPhanTichDonGia_${projectId}`, 'PhanTichDonGia');
            toast.success("Đã xuất file Phân Tích Đơn Giá thành công!");
        } else {
            toast.error("Không có dữ liệu để xuất!");
        }
    };

    const handlePushToProcurement = async () => {
        if (!confirm("Hệ thống sẽ tổng hợp vật tư và gửi sang Phòng Thu Mua. Bạn có chắc chắn?")) return;

        const toastId = "push-procurement";
        toast.loading("Đang tổng hợp và đẩy dữ liệu sang Thu Mua...", { id: toastId });

        // Lọc ra các vật tư cần mua (Bỏ Nhân Công - NC và các chi phí khác)
        // Và chỉ đẩy những mã đã được chuẩn hóa (is_mapped = true)
        const itemsToProcurement = aggregatedSummaries
            .filter(item => (item.category === 'VL' || item.category === 'M') && item.is_mapped)
            .map(item => ({
                project_id: projectId,
                material_code: item.material_code,
                material_name: item.material_name,
                purchase_unit: item.display_unit,
                purchase_quantity: item.display_quantity,
                current_supplier_id: item.preferred_supplier_id_1 || null
            }));

        if (itemsToProcurement.length === 0) {
            toast.error("Không có vật tư nào được chuẩn hóa mã để gửi đi!", { id: toastId });
            return;
        }

        const res = await pushEstimationToProcurementAction(projectId, itemsToProcurement);

        if (res.success) {
            toast.success(res.message, { id: toastId });
        } else {
            toast.error("Lỗi: " + res.error, { id: toastId });
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 transition-colors">

            {/* HEADER TOOLBAR */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Thiết Lập Đơn Giá & Kinh Phí
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Thiết lập tỉ lệ % và chuẩn hóa đơn giá vật tư.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
                        <DialogTrigger asChild><Button className="h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" /> Thêm dòng</Button></DialogTrigger>
                        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                            <DialogHeader><DialogTitle className="dark:text-slate-100">Thêm mục chi phí bổ sung</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateManual} className="space-y-4 py-2">
                                <div><Label className="dark:text-slate-300">Tên công việc / Vật tư <span className="text-red-500">*</span></Label><Input name="name" required placeholder="VD: Cát xây tô" className="dark:bg-slate-950 dark:border-slate-800" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label className="dark:text-slate-300">Đơn vị tính</Label><Input name="unit" placeholder="m3, kg..." className="dark:bg-slate-950 dark:border-slate-800" /></div>
                                    <div><Label className="dark:text-slate-300">Khối lượng <span className="text-red-500">*</span></Label><Input name="quantity" type="number" step="0.01" required placeholder="0" className="dark:bg-slate-950 dark:border-slate-800" /></div>
                                </div>
                                <div><Label className="dark:text-slate-300">Đơn giá tạm tính</Label><Input name="unit_price" type="number" placeholder="0" className="dark:bg-slate-950 dark:border-slate-800" /></div>
                                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenManualDialog(false)} className="dark:border-slate-800 dark:text-slate-300">Hủy</Button><Button type="submit" disabled={newItemLoading}>{newItemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu lại"}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-500/10"><FileSpreadsheet className="w-4 h-4 mr-2" /> Template</Button>
                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <Button variant="outline" disabled={isImporting} className="h-9 border-slate-200 dark:border-slate-800 dark:text-slate-300">{isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Import Excel</Button>
                    </div>
                    <Button
                        onClick={handlePushToProcurement}
                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold ml-4"
                    >
                        <Tractor className="w-4 h-4 mr-2" /> Chốt dự toán & Gửi Thu Mua
                    </Button>
                </div>
            </div>

            {/* BẢNG TÍNH TOÁN THÔNG SỐ KINH PHÍ */}
            <Card className="border border-blue-200 dark:border-blue-900/50 shadow-md bg-white dark:bg-slate-950 overflow-hidden transition-colors">
                <div className="bg-blue-50 dark:bg-blue-500/10 border-b border-blue-100 dark:border-blue-900/30 p-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide text-sm">Bảng Tính Toán Thông Số Kinh Phí</h4>
                    {/* ✅ NÚT XUẤT EXCEL CHUYỂN TỚI CUỐI CÙNG BÊN PHẢI */}
                    <Button onClick={handleExportDetailExcel} className="h-9 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-400 dark:bg-indigo-900/20 font-bold ml-auto">
                        <Download className="w-4 h-4 mr-2" /> Xuất Excel Phân Tích Giá
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                            <TableHead className="w-[60px] text-center font-bold dark:text-slate-300">STT</TableHead>
                            <TableHead className="font-bold dark:text-slate-300">Khoản mục chi phí</TableHead>
                            <TableHead className="w-[150px] text-center font-bold dark:text-slate-300">Ký hiệu</TableHead>
                            <TableHead className="w-[120px] text-center font-bold dark:text-slate-300">Tỉ lệ (%)</TableHead>
                            <TableHead className="w-[200px] text-right font-bold dark:text-slate-300">Thành tiền (VNĐ)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="dark:border-slate-800">
                            <TableCell className="text-center font-medium dark:text-slate-400">1</TableCell>
                            <TableCell className="font-bold text-slate-700 dark:text-slate-300">Chi phí xây dựng trực tiếp (VL + NC + M)</TableCell>
                            <TableCell className="text-center font-medium dark:text-slate-400">T</TableCell>
                            <TableCell className="text-center text-slate-400">100%</TableCell>
                            <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(T)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800">
                            <TableCell className="text-center font-medium dark:text-slate-400">2</TableCell>
                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">Chi phí chung (Quản lý, lán trại...)</TableCell>
                            <TableCell className="text-center font-medium text-slate-500">GT = T x %</TableCell>
                            <TableCell className="p-1">
                                <Input type="number" className="..." defaultValue={gtParam.quantity} onBlur={(e) => handleRateChange(gtParam.id, 'GT', e.target.value)} />
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(GT)}</TableCell>
                        </TableRow>
                        <TableRow className="dark:border-slate-800">
                            <TableCell className="text-center font-medium dark:text-slate-400">3</TableCell>
                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">Thu nhập chịu thuế tính trước (Lợi nhuận)</TableCell>
                            <TableCell className="text-center font-medium text-slate-500">TL = (T+GT) x %</TableCell>
                            <TableCell className="p-1">
                                <Input type="number" className="..." defaultValue={lnParam.quantity} onBlur={(e) => handleRateChange(lnParam.id, 'LN', e.target.value)} />
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(TL)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-orange-50/30 dark:bg-orange-500/5 dark:border-slate-800">
                            <TableCell className="text-center font-medium dark:text-slate-400">4</TableCell>
                            <TableCell className="font-bold text-orange-800 dark:text-orange-400">Giá trị dự toán xây dựng TRƯỚC THUẾ</TableCell>
                            <TableCell className="text-center font-bold text-orange-800 dark:text-orange-400">G = T+GT+TL</TableCell>
                            <TableCell className="text-center text-slate-400">-</TableCell>
                            <TableCell className="text-right font-bold text-orange-700 dark:text-orange-300">{formatCurrency(Gxd)}</TableCell>
                        </TableRow>
                        <TableRow className="dark:border-slate-800">
                            <TableCell className="text-center font-medium dark:text-slate-400">5</TableCell>
                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">Thuế giá trị gia tăng (VAT)</TableCell>
                            <TableCell className="text-center font-medium text-slate-500">VAT = G x %</TableCell>
                            <TableCell className="p-1">
                                <Input type="number" className="..." defaultValue={vatParam.quantity} onBlur={(e) => handleRateChange(vatParam.id, 'VAT', e.target.value)} />
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(VAT)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-600 dark:bg-blue-700">
                            <TableCell className="text-center font-bold text-white">6</TableCell>
                            <TableCell colSpan={3} className="font-bold text-white text-base uppercase tracking-wider">Tổng Cộng Chi Phí Xây Dựng (Sau Thuế)</TableCell>
                            <TableCell className="text-right font-extrabold text-white text-lg">{formatCurrency(TotalProject)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Card>

            {/* THANH ĐIỀU HƯỚNG TỔNG HỢP */}
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors">
                <Button variant="ghost" onClick={() => setActiveModal('total')} className="font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-blue-700 transition-all"><PieChart className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Bảng Tổng Hợp Chi Phí</Button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <Button variant="ghost" onClick={() => setActiveModal('VL')} className="font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-orange-600 transition-all"><Layers className="w-4 h-4 mr-2 text-orange-500" /> Tổng hợp Vật liệu</Button>
                <Button variant="ghost" onClick={() => setActiveModal('NC')} className="font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-green-600 transition-all"><HardHat className="w-4 h-4 mr-2 text-green-500" /> Tổng hợp Nhân công</Button>
                <Button variant="ghost" onClick={() => setActiveModal('M')} className="font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-purple-600 transition-all"><Tractor className="w-4 h-4 mr-2 text-purple-500" /> Tổng hợp Máy TC</Button>
            </div>

            {/* BẢNG DỰ TOÁN CHI TIẾT (TAB 5) */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex items-center justify-between transition-colors">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-sm ml-2">Bảng Phân Tích Vật Tư & Chi Phí Trực Tiếp</h4>
                    <Button variant="outline" size="sm" onClick={handleToggleAllSections} className="h-7 text-xs bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                        <FoldVertical className="w-3 h-3 mr-1" />
                        {Object.values(expandedSections).some(v => v === false) ? "Mở rộng tất cả" : "Thu gọn tất cả"}
                    </Button>
                </div>
                <Table className="bg-white dark:bg-slate-950">
                    <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-900 border-b-2 dark:border-slate-800">
                            <TableHead className="w-[50px] text-center font-bold text-slate-800 dark:text-slate-200">STT</TableHead>
                            <TableHead className="w-[100px] font-bold text-center text-slate-800 dark:text-slate-200">Mã hiệu</TableHead>
                            <TableHead className="w-[90px] font-bold text-center text-slate-800 dark:text-slate-200">Loại</TableHead>
                            <TableHead className="min-w-[250px] font-bold text-slate-800 dark:text-slate-200">Tên công việc / Hao phí</TableHead>
                            <TableHead className="w-[60px] text-center font-bold text-slate-800 dark:text-slate-200">ĐVT</TableHead>
                            <TableHead className="w-[60px] text-center font-bold text-slate-800 dark:text-slate-200">Hệ số</TableHead>
                            <TableHead className="w-[90px] text-right font-bold text-slate-800 dark:text-slate-200">Định mức</TableHead>
                            <TableHead className="w-[110px] text-right font-bold text-blue-700 dark:text-blue-400">Tổng KL</TableHead>
                            <TableHead className="w-[120px] text-right font-bold text-slate-800 dark:text-slate-200">Đơn giá</TableHead>
                            <TableHead className="w-[140px] text-right font-bold text-slate-800 dark:text-slate-200">Thành tiền</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!initLoaded ? (
                            <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : (
                            <>
                                {sections.map((section, secIdx) => {
                                    const tasks = qtoTasks.filter(i => i.parent_id === section.id && i.item_type !== 'section');
                                    const isSectionExpanded = expandedSections[section.id] !== false;

                                    return (
                                        <React.Fragment key={section.id}>
                                            <TableRow className="bg-slate-200 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700 transition-colors">
                                                <TableCell className="text-center font-bold text-slate-800 dark:text-slate-100">{toRoman(secIdx + 1)}</TableCell>
                                                <TableCell className="p-1" colSpan={10}>
                                                    <div className="flex items-center gap-1 w-full">
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 shrink-0" onClick={() => toggleSection(section.id)}>
                                                            {isSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </Button>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide px-2">{section.item_name}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {isSectionExpanded && tasks.map((task, taskIdx) => {
                                                const children = estItems.filter(i => i.qto_item_id === task.id);
                                                const taskTotal = children.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price) || 0), 0);

                                                let taskVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || Number(task.quantity) || 0;
                                                const taskUnitPrice = taskVol > 0 ? taskTotal / taskVol : 0;
                                                const isTaskExpanded = expandedRows[task.id] !== false;

                                                return (
                                                    <React.Fragment key={task.id}>
                                                        <TableRow className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                                            <TableCell className="text-center font-bold border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">{taskIdx + 1}</TableCell>
                                                            <TableCell className="font-bold border-r border-slate-200 dark:border-slate-800 text-center text-blue-700 dark:text-blue-400">{task.norm_code}</TableCell>
                                                            <TableCell className="border-r border-slate-200 dark:border-slate-800"></TableCell>
                                                            <TableCell className="font-bold text-blue-900 dark:text-blue-300 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => toggleRow(task.id)}>
                                                                <div className="flex items-start gap-1">
                                                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 mt-0.5 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 shrink-0">
                                                                        {isTaskExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                    </Button>
                                                                    <span className="leading-tight">{task.item_name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{task.unit}</TableCell>
                                                            <TableCell className="border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50"></TableCell>
                                                            <TableCell className="border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50"></TableCell>

                                                            <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-500/10 text-base">
                                                                {taskVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>

                                                            <TableCell className="text-right font-bold text-indigo-700 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-900/20">
                                                                {formatCurrency(taskUnitPrice)}
                                                            </TableCell>

                                                            <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20 text-base">
                                                                {formatCurrency(taskTotal)}
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>

                                                        {isTaskExpanded && children.map(child => {
                                                            const savedNorm = child.dimensions?.norm || 0;
                                                            const factor = child.dimensions?.factor || 1;
                                                            return (
                                                                <TableRow key={child.id} className={`${child.is_mapped ? "hover:bg-green-50/50 dark:hover:bg-green-900/10" : "hover:bg-muted/30 dark:hover:bg-slate-800/30"} dark:border-slate-800 transition-colors`}>
                                                                    <TableCell className="border-r border-slate-200 dark:border-slate-800"></TableCell>
                                                                    <TableCell className="border-r border-slate-200 dark:border-slate-800"></TableCell>
                                                                    <TableCell className="text-center font-medium border-r border-slate-200 dark:border-slate-800">
                                                                        {child.is_mapped ? <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-none px-1 text-[10px]">{child.material_code}</Badge> : (child.category || "Khác")}
                                                                    </TableCell>
                                                                    <TableCell className="border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 pl-8">
                                                                        <div className="flex justify-between items-center group relative">
                                                                            <span className={child.is_mapped ? "text-green-800 dark:text-green-400 font-medium" : ""}>- {child.original_name || child.material_name}</span>
                                                                        </div>
                                                                    </TableCell>

                                                                    <TableCell className="text-center border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">{child.unit}</TableCell>
                                                                    <TableCell className="text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-xs bg-slate-50/50 dark:bg-slate-900/50">{factor !== 1 ? `/${factor}` : "-"}</TableCell>
                                                                    <TableCell className="text-right border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-sm bg-slate-50/50 dark:bg-slate-900/50">{savedNorm > 0 ? Number(savedNorm).toLocaleString('en-US', { maximumFractionDigits: 5 }) : "-"}</TableCell>

                                                                    <TableCell className="text-right border-r border-slate-200 dark:border-slate-800 font-bold text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-500/5">
                                                                        {Number(child.quantity).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                                                    </TableCell>
                                                                    <TableCell className="text-right border-r border-slate-200 dark:border-slate-800 p-1">
                                                                        <div className="h-7 px-2 flex items-center justify-end text-sm text-slate-600 dark:text-slate-400 bg-transparent">
                                                                            {formatCurrency(child.unit_price || 0)}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-medium dark:text-slate-300">{formatCurrency((Number(child.quantity) * Number(child.unit_price)) || 0)}</TableCell>
                                                                    <TableCell className="text-center p-1"><Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => handleDelete(child.id, child.material_name)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </>
                        )}
                    </TableBody>
                </Table>
            </Card>
            {/* MODAL TỔNG HỢP VẬT TƯ */}
            <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
                <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
                    {activeModal === 'total' && (
                        <>
                            <DialogHeader><DialogTitle className="text-center text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Bảng Tổng Hợp Chi Phí</DialogTitle></DialogHeader>
                            <Table className="border dark:border-slate-800 mt-4">
                                <TableHeader><TableRow className="bg-slate-100 dark:bg-slate-800 border-b-2 dark:border-slate-700"><TableHead className="w-[60px] text-center font-bold dark:text-slate-200">STT</TableHead><TableHead className="font-bold text-center dark:text-slate-200">Tên chi phí</TableHead><TableHead className="w-[100px] text-center font-bold dark:text-slate-200">Đơn vị</TableHead><TableHead className="w-[200px] text-right font-bold dark:text-slate-200">Giá trị</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow className="dark:border-slate-800"><TableCell className="text-center font-medium dark:text-slate-400">1</TableCell><TableCell className="dark:text-slate-300">Chi phí vật liệu</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold dark:text-slate-100">{formatCurrency(totalVL)}</TableCell></TableRow>
                                    <TableRow className="dark:border-slate-800"><TableCell className="text-center font-medium dark:text-slate-400">2</TableCell><TableCell className="dark:text-slate-300">Chi phí nhân công</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold dark:text-slate-100">{formatCurrency(totalNC)}</TableCell></TableRow>
                                    <TableRow className="dark:border-slate-800"><TableCell className="text-center font-medium dark:text-slate-400">3</TableCell><TableCell className="dark:text-slate-300">Chi phí máy thi công</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold dark:text-slate-100">{formatCurrency(totalM)}</TableCell></TableRow>
                                    <TableRow className="dark:border-slate-800"><TableCell className="text-center font-medium dark:text-slate-400">4</TableCell><TableCell className="dark:text-slate-300">Chi phí khác (GT, LN, VAT...)</TableCell><TableCell className="text-center text-slate-500">vnđ</TableCell><TableCell className="text-right font-semibold dark:text-slate-100">{formatCurrency(totalKhac)}</TableCell></TableRow>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/50"><TableCell colSpan={3} className="text-center font-extrabold text-slate-800 dark:text-slate-100 uppercase text-base tracking-widest">Tổng Cộng</TableCell><TableCell className="text-right font-extrabold text-blue-700 dark:text-blue-400 text-lg">{formatCurrency(TotalProject)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </>
                    )}

                    {['VL', 'NC', 'M'].includes(activeModal || '') && (
                        <>
                            <DialogHeader><DialogTitle className="text-center text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Bảng Tổng Hợp {activeModal === 'VL' ? 'Vật Liệu' : activeModal === 'NC' ? 'Nhân Công' : 'Máy Thi Công'}</DialogTitle></DialogHeader>
                            <Table className="border dark:border-slate-800 mt-4">
                                <TableHeader>
                                    <TableRow className="bg-slate-100 dark:bg-slate-800 border-b-2 dark:border-slate-700">
                                        <TableHead className="w-[40px] text-center font-bold dark:text-slate-200">STT</TableHead>
                                        <TableHead className="min-w-[200px] font-bold dark:text-slate-200">Tên Vật tư / Nhân công / Máy</TableHead>
                                        <TableHead className="w-[80px] text-center font-bold dark:text-slate-200">ĐVT</TableHead>
                                        <TableHead className="w-[100px] text-right font-bold dark:text-slate-200">Tổng Mua</TableHead>
                                        <TableHead className="w-[150px] text-right font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30">Giá NCC (Theo ĐVT)</TableHead>
                                        <TableHead className="w-[150px] text-right font-bold dark:text-slate-200">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {getSummaryByCategory(activeModal!).map((mat: any, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                                            <TableCell className="text-center text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                                            <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                <div className="flex justify-between items-center group relative pr-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span>{mat.material_name}</span>
                                                        {mat.is_mapped && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-none px-1 text-[10px] w-fit">{mat.material_code}</Badge>}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* ✅ FIX TÌM KIẾM MÃ: THÊM KEY ĐỘC NHẤT */}
                                                        <MaterialSelector
                                                            key={`selector_${mat.material_name}`}
                                                            onSelect={(newMat) => handleBulkMaterialSelect(mat.material_name, mat.category, newMat)}
                                                            defaultSearch={mat.original_name || mat.material_name}
                                                            trigger={<Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50">Đổi mã</Button>}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-center font-bold text-orange-600 dark:text-orange-400">{mat.display_unit}</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-700 dark:text-slate-300">
                                                {Number(mat.display_quantity).toLocaleString('en-US', { maximumFractionDigits: 3 })}
                                            </TableCell>

                                            <TableCell className="text-right p-1 bg-blue-50/30 dark:bg-blue-500/5 border-l border-r border-blue-100 dark:border-blue-900/30">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-right text-sm font-bold text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-900"
                                                    defaultValue={mat.display_price}
                                                    onBlur={(e) => {
                                                        const inputPrice = parseFloat(e.target.value) || 0;
                                                        handleBulkPriceChange(mat.material_name, mat.category, inputPrice.toString());
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(mat.total_cost_sum)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {getSummaryByCategory(activeModal!).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-600">Không có dữ liệu</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}