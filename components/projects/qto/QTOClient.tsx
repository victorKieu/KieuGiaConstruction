"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash2, ChevronDown, ChevronRight, Loader2, FilePlus2, FoldVertical, Globe, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { crawlNormFromUrl } from "@/lib/action/crawlerActions";
import { saveNorm } from "@/lib/action/normActions";

import {
    deleteQTOItem, deleteQTODetail,
    updateQTODetail, updateQTODetailText, addQTODetail,
    updateQTONormCode, addManualQTOItem, updateQTOItem
} from "@/lib/action/qtoActions";
import { analyzeQTOAndGenerateEstimation } from "@/lib/action/estimationActions";
import { getNorms } from "@/lib/action/normActions";
import AutoEstimateWizard from "./AutoEstimateWizard";

interface Props { projectId: string; items: any[]; norms: any[]; }

function toRoman(num: number): string {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num.toString();
}

function renderItemTypeBadge(type: string) {
    switch (type) {
        case 'task': return <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 transition-colors">Công tác</span>;
        case 'material': return <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 transition-colors">Vật tư</span>;
        case 'labor': return <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 transition-colors">Nhân công</span>;
        case 'equipment': return <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 transition-colors">Máy TC</span>;
        case 'subcontractor': return <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 transition-colors">Thầu phụ</span>;
        case 'other': return <span className="bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 transition-colors">Khác</span>;
        default: return null;
    }
}

function AsyncNormSelector({ taskId, projectId, defaultCode, onUpdate }: { taskId: string; projectId: string; defaultCode: string; onUpdate: (norm: any) => void; }) {
    const [query, setQuery] = useState(defaultCode || "");
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [inputUrl, setInputUrl] = useState("");

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (query.trim().length < 2) { setIsOpen(false); toast.error("Nhập ít nhất 2 ký tự!"); return; }
            setIsSearching(true); setIsOpen(false);
            const res = await getNorms(query, 1, 20);
            setResults(res.data || []); setIsOpen(true); setIsSearching(false);
        }
    };

    const handleSelect = async (norm: any) => {
        setQuery(norm.code); setIsOpen(false);
        const toastId = toast.loading("Đang áp dụng mã định mức...");

        try {
            const res1 = await updateQTONormCode(taskId, projectId, norm.code);
            const res2 = await updateQTOItem(taskId, projectId, 'item_name', norm.name);
            const res3 = await updateQTOItem(taskId, projectId, 'unit', norm.unit);

            if (res1.success && res2.success && res3.success) {
                toast.success("Đã áp mã và đồng bộ tên, đơn vị!", { id: toastId });
                onUpdate(norm);
            } else { toast.error("Có lỗi khi đồng bộ chi tiết!", { id: toastId }); }
        } catch (error) { toast.error("Lỗi hệ thống khi gắn mã!", { id: toastId }); }
    };

    const handleFetchFromUrl = async () => {
        if (!inputUrl.trim()) return toast.error("Vui lòng dán link từ DinhMucOnline!");
        const toastId = toast.loading("Đang lấy dữ liệu từ link...");
        setIsUrlModalOpen(false);

        try {
            const fetchRes = await crawlNormFromUrl(inputUrl.trim());
            if (fetchRes.success) {
                const saveRes = await saveNorm(fetchRes.data);
                if (saveRes.success) {
                    toast.success("Tải và lưu định mức thành công!", { id: toastId });
                    handleSelect(fetchRes.data);
                } else {
                    toast.error("Lưu Database lỗi: " + saveRes.error, { id: toastId });
                }
            } else {
                toast.error(fetchRes.error, { id: toastId });
            }
        } catch (error: any) {
            toast.error("Lỗi hệ thống: " + error.message, { id: toastId });
        }
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Input
                    placeholder="🔍 Gõ mã/tên + Nhấn Enter..." value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown} onFocus={() => { if (results.length > 0) setIsOpen(true) }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="h-8 border-orange-300 dark:border-orange-500/50 bg-orange-50/50 dark:bg-orange-500/10 text-xs focus-visible:ring-orange-500 dark:text-slate-200 transition-colors"
                />
                {isSearching && <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-2.5 text-orange-500" />}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-[350px] right-0 mt-1 max-h-[300px] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-colors">
                    {results.map((r) => (
                        <div key={r.id} onClick={() => handleSelect(r)} className="px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-slate-800 cursor-pointer border-b dark:border-slate-800 flex flex-col gap-1 transition-colors">
                            <span className="font-bold text-blue-700 dark:text-blue-400">{r.code}</span>
                            <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{r.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && results.length === 0 && !isSearching && (
                <div className="absolute z-50 w-[350px] right-0 mt-1 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center text-xs transition-colors">
                    <p className="text-slate-500 dark:text-slate-400 italic mb-3">
                        Database chưa có định mức "{query}"
                    </p>
                    <Button
                        size="sm"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setIsOpen(false);
                            setInputUrl("");
                            setIsUrlModalOpen(true);
                        }}
                    >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Tải dữ liệu bằng Link
                    </Button>
                </div>
            )}

            <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}>
                <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                            <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Nhập link để lấy dữ liệu
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Hệ thống chưa có mã <b className="text-indigo-600 dark:text-indigo-400 font-mono">{query}</b>. Vui lòng dán đường link chi tiết từ DinhMucOnline vào ô bên dưới:
                        </p>
                        <Input
                            placeholder="VD: https://dinhmuconline.com/dinhmuc/104481"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-200"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUrlModalOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                        <Button onClick={handleFetchFromUrl} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                            Bắt đầu tải
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function QTOClient({ projectId, items, norms }: Props) {
    const router = useRouter();
    const [calcLoading, setCalcLoading] = useState(false);

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [localItems, setLocalItems] = useState(items);

    const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
    const [manualSectionId, setManualSectionId] = useState<string>("NEW");
    const [newSectionName, setNewSectionName] = useState("");
    const [manualItemName, setManualItemName] = useState("");
    const [manualUnit, setManualUnit] = useState("m2");
    const [manualItemType, setManualItemType] = useState("task");
    const [isAddingManual, setIsAddingManual] = useState(false);

    const [manualNormCode, setManualNormCode] = useState("");
    const [manualNormQuery, setManualNormQuery] = useState("");
    const [manualNormResults, setManualNormResults] = useState<any[]>([]);
    const [isManualNormOpen, setIsManualNormOpen] = useState(false);
    const [isSearchingManualNorm, setIsSearchingManualNorm] = useState(false);

    useEffect(() => { setLocalItems(items); }, [items]);

    const fetchLatestData = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('qto_items').select('*, details:qto_item_details(*)').eq('project_id', projectId).order('created_at', { ascending: true });
        if (data) { setLocalItems(data); }
    };

    const toggleRow = (id: string) => { setExpandedRows(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] })); };
    const toggleSection = (id: string) => { setExpandedSections(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] })); };

    const handleToggleAllSections = () => {
        const sections = localItems.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));
        const isAnyCollapsed = sections.some(s => expandedSections[s.id] === false);
        if (isAnyCollapsed) { setExpandedSections({}); }
        else {
            const newState: Record<string, boolean> = {};
            sections.forEach(s => newState[s.id] = false);
            setExpandedSections(newState);
        }
    };

    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0, wid = parseFloat(w) || 0, hei = parseFloat(h) || 0, fac = parseFloat(f) || 0;
        if (len === 0 && wid === 0 && hei === 0) return fac;
        return (len !== 0 ? len : 1) * (wid !== 0 ? wid : 1) * (hei !== 0 ? hei : 1) * (fac !== 0 ? fac : 1);
    };

    const handleUpdateItemField = async (itemId: string, field: string, value: string) => {
        if (!value.trim()) return;
        setLocalItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
        const res = await updateQTOItem(itemId, projectId, field, value);
        if (!res.success) { toast.error("Lỗi khi cập nhật!"); fetchLatestData(); }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Bạn có chắc muốn xóa?")) return;
        await deleteQTOItem(itemId, projectId); fetchLatestData();
    };

    const handleDeleteDetail = async (detailId: string) => { await deleteQTODetail(detailId, projectId); fetchLatestData(); };
    const handleUpdateNum = async (detailId: string, field: string, value: string) => { await updateQTODetail(detailId, projectId, field, parseFloat(value) || 0); fetchLatestData(); };
    const handleUpdateText = async (detailId: string, value: string) => { await updateQTODetailText(detailId, projectId, value); };
    const handleAddDetail = async (itemId: string) => {
        await addQTODetail(itemId, { projectId, explanation: "Chi tiết mới", length: 0, width: 0, height: 0, quantity_factor: 1 });
        if (!expandedRows[itemId]) toggleRow(itemId); fetchLatestData();
    };

    const handleCalculate = async () => {
        setCalcLoading(true);
        const res = await analyzeQTOAndGenerateEstimation(projectId);
        setCalcLoading(false);
        if (res.success) { toast.success(res.message); router.refresh(); }
        else { toast.error(res.error); }
    };

    const handleSaveManualItem = async () => {
        if (!manualItemName.trim()) { toast.error("Vui lòng nhập tên công tác!"); return; }
        if (manualSectionId === "NEW" && !newSectionName.trim()) { toast.error("Vui lòng nhập tên Hạng mục mới!"); return; }
        if (!manualItemType) { toast.error("Vui lòng chọn Phân loại công tác!"); return; }

        setIsAddingManual(true);
        const res = await addManualQTOItem(projectId, manualSectionId, newSectionName.trim(), manualItemName.trim(), manualUnit.trim(), manualItemType, manualNormCode);

        if (res.success) {
            toast.success("Thêm công tác thủ công thành công!");
            setIsManualAddModalOpen(false);
            setManualItemName(""); setNewSectionName(""); setManualNormCode(""); setManualNormQuery("");
            fetchLatestData();
        } else { toast.error("Có lỗi xảy ra: " + res.error); }
        setIsAddingManual(false);
    };

    const sections = localItems.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));

    return (
        <div className="space-y-4 animate-in fade-in duration-500 transition-colors">
            {/* Thanh công cụ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-800 shadow-sm gap-3 transition-colors">
                <div className="flex items-center gap-2">
                    <Dialog open={isManualAddModalOpen} onOpenChange={setIsManualAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-teal-500 dark:border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 font-bold bg-teal-50/50 dark:bg-teal-900/10">
                                <FilePlus2 className="w-4 h-4 mr-2" /> Thêm tiên lượng thủ công
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-800 transition-colors">
                            <DialogHeader><DialogTitle className="text-teal-700 dark:text-teal-400 flex items-center gap-2"><FilePlus2 className="w-5 h-5" /> Bổ sung công tác thủ công</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hạng mục (Section)</Label>
                                    <Select value={manualSectionId} onValueChange={setManualSectionId}>
                                        <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"><SelectValue placeholder="Chọn hạng mục..." /></SelectTrigger>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                            <SelectGroup>
                                                <SelectItem value="NEW" className="font-bold text-teal-600 dark:text-teal-400">+ Tạo Hạng Mục Mới</SelectItem>
                                                {sections.map(sec => <SelectItem key={sec.id} value={sec.id} className="dark:text-slate-200">{sec.item_name}</SelectItem>)}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {manualSectionId === "NEW" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tên hạng mục mới</Label>
                                        <Input placeholder="Vd: Công tác thi công Trát tường..." value={newSectionName} onChange={e => setNewSectionName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" />
                                    </div>
                                )}

                                <div className="space-y-2 relative bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-900/30">
                                    <Label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                        🔍 Gọi mã định mức (Tùy chọn)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Nhập mã hoặc tên công tác + Nhấn Enter..." value={manualNormQuery} onChange={(e) => setManualNormQuery(e.target.value)}
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (manualNormQuery.trim().length < 2) return toast.error("Nhập ít nhất 2 ký tự!");
                                                    setIsSearchingManualNorm(true); setIsManualNormOpen(false);
                                                    const res = await getNorms(manualNormQuery, 1, 20);
                                                    setManualNormResults(res.data || []);
                                                    setIsManualNormOpen(true); setIsSearchingManualNorm(false);
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setIsManualNormOpen(false), 200)}
                                            className="border-blue-300 dark:border-blue-800 focus-visible:ring-blue-500 bg-white dark:bg-slate-950 dark:text-slate-200 transition-colors"
                                        />
                                        {isSearchingManualNorm && <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-2 text-blue-600 dark:text-blue-400" />}
                                    </div>
                                    {isManualNormOpen && manualNormResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 max-h-[200px] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl left-0 top-full transition-colors">
                                            {manualNormResults.map((r) => (
                                                <div key={r.id} onClick={() => {
                                                    setManualNormCode(r.code); setManualItemName(r.name); setManualUnit(r.unit || "Lần"); setManualItemType('task'); setManualNormQuery(r.code); setIsManualNormOpen(false); toast.success(`Đã chọn mã: ${r.code}`);
                                                }} className="px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b dark:border-slate-800 flex flex-col gap-1 transition-colors">
                                                    <span className="font-bold text-blue-700 dark:text-blue-400">{r.code}</span><span className="text-slate-600 dark:text-slate-400 line-clamp-2">{r.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 mt-2">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tên công tác chi tiết <span className="text-red-500">*</span></Label>
                                    <Input placeholder="Vd: Trát tường trong nhà chiều dày 1.5cm..." value={manualItemName} onChange={e => setManualItemName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đơn vị tính <span className="text-red-500">*</span></Label><Input placeholder="Vd: m2, m3, Cái, Bộ..." value={manualUnit} onChange={e => setManualUnit(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phân loại (Type)</Label>
                                        <Select value={manualItemType} onValueChange={setManualItemType}>
                                            <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"><SelectValue placeholder="Phân loại..." /></SelectTrigger>
                                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                                <SelectGroup>
                                                    <SelectItem value="task" className="dark:text-slate-200">Công tác (Task)</SelectItem>
                                                    <SelectItem value="material" className="dark:text-slate-200">Vật tư (Material)</SelectItem>
                                                    <SelectItem value="labor" className="dark:text-slate-200">Nhân công (Labor)</SelectItem>
                                                    <SelectItem value="equipment" className="dark:text-slate-200">Máy thi công (Equipment)</SelectItem>
                                                    <SelectItem value="subcontractor" className="dark:text-slate-200">Thầu phụ (Subcontractor)</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsManualAddModalOpen(false)} className="dark:border-slate-800 dark:text-slate-300">Hủy</Button>
                                <Button onClick={handleSaveManualItem} disabled={isAddingManual} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    {isAddingManual ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Lưu công tác"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <AutoEstimateWizard projectId={projectId} onSuccess={fetchLatestData} />
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-white" onClick={handleCalculate} disabled={calcLoading}>
                        {calcLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />} Phân tích Vật tư & Chuyển Dự toán
                    </Button>
                </div>
            </div>

            {/* BẢNG BÓC TÁCH */}
            <Card className="border-none shadow-none bg-transparent">
                <div className="bg-slate-50 dark:bg-slate-900 border border-b-0 border-slate-200 dark:border-slate-800 rounded-t-md p-2 flex items-center justify-between transition-colors">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-sm ml-2">Bảng Tiên lượng & Bóc tách</h4>
                    <Button variant="outline" size="sm" onClick={handleToggleAllSections} className="h-7 text-xs bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 transition-colors">
                        <FoldVertical className="w-3 h-3 mr-1" />
                        {Object.values(expandedSections).some(v => v === false) ? "Mở rộng tất cả hạng mục" : "Thu gọn tất cả hạng mục"}
                    </Button>
                </div>

                <Table className="bg-white dark:bg-slate-950 rounded-b-md border dark:border-slate-800 transition-colors">
                    <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border-b dark:border-slate-700 transition-colors">
                            <TableHead className="w-[60px] text-center font-bold dark:text-slate-200">STT</TableHead>
                            <TableHead className="font-bold dark:text-slate-200">Danh mục công việc / Công tác</TableHead>
                            <TableHead className="w-[80px] text-center font-bold dark:text-slate-200">ĐVT</TableHead>
                            <TableHead className="w-[120px] text-right font-bold dark:text-slate-200">Khối lượng</TableHead>
                            <TableHead className="w-[200px] text-center font-bold dark:text-slate-200">Mã Định Mức</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sections.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">Chưa có dữ liệu bóc tách. Sử dụng Bóc tách AI hoặc Thêm thủ công để bắt đầu.</TableCell></TableRow>
                        ) : sections.map((section, secIdx) => {
                            const tasks = localItems.filter(i => i.parent_id === section.id && i.item_type !== 'section');
                            const isSectionExpanded = expandedSections[section.id] !== false;

                            return (
                                <React.Fragment key={section.id}>
                                    <TableRow className="bg-slate-200 dark:bg-slate-800/80 border-b-2 border-slate-300 dark:border-slate-700 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 transition-colors">
                                        <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200">{toRoman(secIdx + 1)}</TableCell>
                                        <TableCell className="p-1">
                                            <div className="flex items-center gap-1 w-full">
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-600 dark:text-slate-400 hover:bg-slate-400 dark:hover:bg-slate-600 shrink-0 transition-colors" onClick={() => toggleSection(section.id)}>
                                                    {isSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </Button>
                                                <Input
                                                    key={`sec-name-${section.item_name}`}
                                                    defaultValue={section.item_name}
                                                    onBlur={(e) => handleUpdateItemField(section.id, 'item_name', e.target.value)}
                                                    className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide h-8 border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 bg-transparent shadow-none flex-1 transition-colors"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell></TableCell><TableCell></TableCell>
                                        <TableCell className="text-center"><span className="text-slate-500 dark:text-slate-400 text-xs font-mono">###{section.item_name.substring(0, 4)}</span></TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" onClick={() => handleDeleteItem(section.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                    </TableRow>

                                    {isSectionExpanded && tasks.map((task, taskIdx) => {
                                        const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
                                        const isTaskExpanded = expandedRows[task.id] !== false;

                                        return (
                                            <React.Fragment key={task.id}>
                                                <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                                                    <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400">{taskIdx + 1}</TableCell>
                                                    <TableCell className="p-1">
                                                        <div className="flex items-center gap-1 w-full pl-4">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 shrink-0 transition-colors" onClick={() => toggleRow(task.id)}>
                                                                {isTaskExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </Button>
                                                            <Input
                                                                key={`task-name-${task.item_name}`}
                                                                defaultValue={task.item_name}
                                                                onBlur={(e) => handleUpdateItemField(task.id, 'item_name', e.target.value)}
                                                                className="flex-1 font-medium text-slate-800 dark:text-slate-200 h-8 border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-950 bg-transparent shadow-none px-2 transition-colors"
                                                            />
                                                            {renderItemTypeBadge(task.item_type)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-1 text-center">
                                                        <Input
                                                            key={`task-unit-${task.unit}`}
                                                            defaultValue={task.unit}
                                                            onBlur={(e) => handleUpdateItemField(task.id, 'unit', e.target.value)}
                                                            className="h-8 w-16 mx-auto text-center border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-950 bg-transparent shadow-none text-slate-600 dark:text-slate-300 px-1 transition-colors"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400 text-base pr-4">
                                                        {totalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <AsyncNormSelector
                                                            taskId={task.id}
                                                            projectId={projectId}
                                                            defaultCode={task.norm_code}
                                                            onUpdate={(norm) => {
                                                                setLocalItems(prev => prev.map(item =>
                                                                    item.id === task.id
                                                                        ? { ...item, norm_code: norm.code, item_name: norm.name, unit: norm.unit }
                                                                        : item
                                                                ));
                                                                fetchLatestData();
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors" onClick={() => handleDeleteItem(task.id)}><Trash2 className="w-4 h-4" /></Button>
                                                    </TableCell>
                                                </TableRow>

                                                {/* CHI TIẾT BÊN TRONG CỦA CÔNG TÁC (Kích thước) */}
                                                {isTaskExpanded && (
                                                    <TableRow className="bg-white dark:bg-transparent border-b-0">
                                                        <TableCell colSpan={6} className="p-0 border-b-0">
                                                            <div className="pl-[5.5rem] pr-4 py-3 border-b dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shadow-inner transition-colors">
                                                                <table className="w-full text-sm">
                                                                    <thead className="text-xs text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                                                        <tr>
                                                                            <th className="text-left py-2">Diễn giải cấu kiện</th>
                                                                            <th className="text-center w-[80px]">Số lượng</th>
                                                                            <th className="text-center w-[80px]">Dài</th>
                                                                            <th className="text-center w-[80px]">Rộng</th>
                                                                            <th className="text-center w-[80px]">Cao</th>
                                                                            <th className="text-right w-[100px] pr-2">Khối Lượng</th>
                                                                            <th className="w-[40px]"></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {task.details?.map((detail: any) => {
                                                                            const displayVol = calculateDisplayVol(detail.length, detail.width, detail.height, detail.quantity_factor);
                                                                            return (
                                                                                <tr key={detail.id} className="border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800/50 group transition-colors">
                                                                                    <td className="py-1"><Input defaultValue={detail.explanation} onBlur={(e) => handleUpdateText(detail.id, e.target.value)} className="h-8 border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:text-slate-300 px-2 w-full text-sm transition-colors" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.quantity_factor} onBlur={(e) => handleUpdateNum(detail.id, 'quantity_factor', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:text-slate-300 transition-colors" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.length} onBlur={(e) => handleUpdateNum(detail.id, 'length', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:text-slate-300 transition-colors" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.width} onBlur={(e) => handleUpdateNum(detail.id, 'width', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:text-slate-300 transition-colors" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.height} onBlur={(e) => handleUpdateNum(detail.id, 'height', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:text-slate-300 transition-colors" /></td>
                                                                                    <td className="text-right font-semibold text-slate-700 dark:text-slate-300 pr-2">{displayVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                                    <td className="text-right">
                                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-colors" onClick={() => handleDeleteDetail(detail.id)}>
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                        <tr>
                                                                            <td colSpan={7} className="pt-2">
                                                                                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed text-blue-600 dark:text-blue-400 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:bg-transparent transition-colors" onClick={() => handleAddDetail(task.id)}>
                                                                                    <Plus className="w-3 h-3 mr-1" /> Thêm diễn giải
                                                                                </Button>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}