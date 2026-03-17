"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash2, ChevronDown, ChevronRight, Loader2, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ✅ IMPORT THÊM updateQTOItem
import {
    deleteQTOItem, deleteQTODetail, calculateMaterialBudget,
    updateQTODetail, updateQTODetailText, addQTODetail,
    updateQTONormCode, addManualQTOItem, updateQTOItem
} from "@/lib/action/qtoActions";
import { getNorms } from "@/lib/action/normActions";
import AutoEstimateWizard from "./AutoEstimateWizard";

interface Props {
    projectId: string;
    items: any[];
    norms: any[];
}

function toRoman(num: number): string {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num.toString();
}

function renderItemTypeBadge(type: string) {
    switch (type) {
        case 'task': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Công tác</span>;
        case 'material': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Vật tư</span>;
        case 'labor': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Nhân công</span>;
        case 'equipment': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Máy TC</span>;
        case 'subcontractor': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Thầu phụ</span>;
        case 'other': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">Khác</span>;
        default: return null;
    }
}

function AsyncNormSelector({ taskId, projectId, defaultCode, onUpdate }: { taskId: string; projectId: string; defaultCode: string; onUpdate: () => void; }) {
    const [query, setQuery] = useState(defaultCode || "");
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // ✅ CHỈ GỌI API KHI NGƯỜI DÙNG NHẤN ENTER
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Ngăn chặn form submit mặc định
            if (query.trim().length < 2) {
                setIsOpen(false);
                toast.error("Vui lòng nhập ít nhất 2 ký tự để tìm kiếm!");
                return;
            }

            setIsSearching(true);
            setIsOpen(false); // Ẩn dropdown cũ trong lúc tìm

            // Gọi API lấy dữ liệu
            const res = await getNorms(query, 1, 20);

            setResults(res.data || []);
            setIsOpen(true);
            setIsSearching(false);
        }
    };

    const handleSelect = async (code: string) => {
        setQuery(code);
        setIsOpen(false);
        const toastId = toast.loading("Đang lưu mã định mức...");
        const res = await updateQTONormCode(taskId, projectId, code);
        if (res.success) { toast.success("Đã gắn mã thành công!", { id: toastId }); onUpdate(); }
        else { toast.error("Lỗi khi gắn mã!", { id: toastId }); }
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Input
                    placeholder="🔍 Gõ mã/tên + Nhấn Enter..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)} // ✅ Chỉ cập nhật State chữ, không gọi API
                    onKeyDown={handleKeyDown} // ✅ Bắt sự kiện Enter tại đây
                    onFocus={() => { if (results.length > 0) setIsOpen(true) }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="h-8 border-orange-300 bg-orange-50/50 text-xs focus-visible:ring-orange-500"
                />
                {isSearching && <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-2.5 text-orange-500" />}
            </div>

            {/* Hiển thị kết quả tìm kiếm */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-[350px] right-0 mt-1 max-h-[300px] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl">
                    {results.map((r) => (
                        <div key={r.id} onClick={() => handleSelect(r.code)} className="px-3 py-2 text-xs hover:bg-orange-50 cursor-pointer border-b flex flex-col gap-1">
                            <span className="font-bold text-blue-700">{r.code}</span>
                            <span className="text-slate-600 line-clamp-2">{r.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Thông báo nếu không tìm thấy (Chỉ hiện khi đã search xong và mảng rỗng) */}
            {isOpen && results.length === 0 && !isSearching && (
                <div className="absolute z-50 w-[350px] right-0 mt-1 p-3 rounded-md border border-slate-200 bg-white shadow-xl text-center text-xs text-slate-500 italic">
                    Không tìm thấy định mức nào khớp với từ khóa "{query}"
                </div>
            )}
        </div>
    );
}

export default function QTOClient({ projectId, items, norms }: Props) {
    const router = useRouter();
    const [calcLoading, setCalcLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [localItems, setLocalItems] = useState(items);

    const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
    const [manualSectionId, setManualSectionId] = useState<string>("NEW");
    const [newSectionName, setNewSectionName] = useState("");
    const [manualItemName, setManualItemName] = useState("");
    const [manualUnit, setManualUnit] = useState("m2");
    const [manualItemType, setManualItemType] = useState("task");
    const [isAddingManual, setIsAddingManual] = useState(false);

    useEffect(() => { setLocalItems(items); }, [items]);

    const fetchLatestData = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('qto_items').select('*, details:qto_item_details(*)').eq('project_id', projectId).order('created_at', { ascending: true });
        if (data) { setLocalItems(data); }
    };

    const toggleRow = (id: string) => { setExpandedRows(prev => ({ ...prev, [id]: !prev[id] })); };

    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0, wid = parseFloat(w) || 0, hei = parseFloat(h) || 0, fac = parseFloat(f) || 0;
        if (len === 0 && wid === 0 && hei === 0) return fac;
        return (len !== 0 ? len : 1) * (wid !== 0 ? wid : 1) * (hei !== 0 ? hei : 1) * (fac !== 0 ? fac : 1);
    };

    // ✅ HÀM MỚI: Xử lý khi sửa Tên/Đơn vị trực tiếp trên bảng
    const handleUpdateItemField = async (itemId: string, field: string, value: string) => {
        if (!value.trim()) return; // Không cho phép sửa thành rỗng

        // Update local state ngay cho mượt
        setLocalItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));

        // Bắn xuống Backend
        const res = await updateQTOItem(itemId, projectId, field, value);
        if (!res.success) {
            toast.error("Lỗi khi cập nhật!");
            fetchLatestData(); // Rollback nếu lỗi
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Bạn có chắc muốn xóa? Toàn bộ chi tiết bên trong cũng sẽ bị xóa!")) return;
        await deleteQTOItem(itemId, projectId);
        fetchLatestData();
    };

    const handleDeleteDetail = async (detailId: string) => {
        await deleteQTODetail(detailId, projectId);
        fetchLatestData();
    };

    const handleUpdateNum = async (detailId: string, field: string, value: string) => {
        await updateQTODetail(detailId, projectId, field, parseFloat(value) || 0);
        fetchLatestData();
    };

    const handleUpdateText = async (detailId: string, value: string) => {
        await updateQTODetailText(detailId, projectId, value);
    };

    const handleAddDetail = async (itemId: string) => {
        await addQTODetail(itemId, { projectId, explanation: "Chi tiết mới", length: 0, width: 0, height: 0, quantity_factor: 1 });
        if (!expandedRows[itemId]) toggleRow(itemId);
        fetchLatestData();
    };

    const handleCalculate = async () => {
        setCalcLoading(true);
        const res = await calculateMaterialBudget(projectId);
        setCalcLoading(false);
        if (res.success) { toast.success(res.message); router.refresh(); }
        else { toast.error(res.error); }
    };

    const handleSaveManualItem = async () => {
        if (!manualItemName.trim()) { toast.error("Vui lòng nhập tên công tác!"); return; }
        if (manualSectionId === "NEW" && !newSectionName.trim()) { toast.error("Vui lòng nhập tên Hạng mục mới!"); return; }
        if (!manualItemType) { toast.error("Vui lòng chọn Phân loại công tác!"); return; }

        setIsAddingManual(true);
        const res = await addManualQTOItem(projectId, manualSectionId, newSectionName.trim(), manualItemName.trim(), manualUnit.trim(), manualItemType);

        if (res.success) {
            toast.success("Thêm công tác thủ công thành công!");
            setIsManualAddModalOpen(false); setManualItemName(""); setNewSectionName("");
            fetchLatestData();
        } else { toast.error("Có lỗi xảy ra: " + res.error); }
        setIsAddingManual(false);
    };

    const sections = localItems.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));

    return (
        <div className="space-y-4">
            {/* Thanh công cụ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border shadow-sm gap-3">
                <div className="flex items-center gap-2">
                    <Dialog open={isManualAddModalOpen} onOpenChange={setIsManualAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50 font-bold bg-teal-50/50">
                                <FilePlus2 className="w-4 h-4 mr-2" /> Thêm tiên lượng thủ công
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader><DialogTitle className="text-teal-700 flex items-center gap-2"><FilePlus2 className="w-5 h-5" /> Bổ sung công tác thủ công</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hạng mục (Section)</Label>
                                    <Select value={manualSectionId} onValueChange={setManualSectionId}>
                                        <SelectTrigger><SelectValue placeholder="Chọn hạng mục..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="NEW" className="font-bold text-teal-600">+ Tạo Hạng Mục Mới</SelectItem>
                                                {sections.map(sec => <SelectItem key={sec.id} value={sec.id}>{sec.item_name}</SelectItem>)}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {manualSectionId === "NEW" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên hạng mục mới</Label>
                                        <Input placeholder="Vd: Công tác thi công Trát tường..." value={newSectionName} onChange={e => setNewSectionName(e.target.value)} />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên công tác chi tiết</Label>
                                    <Input placeholder="Vd: Trát tường trong nhà chiều dày 1.5cm..." value={manualItemName} onChange={e => setManualItemName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn vị tính</Label><Input placeholder="Vd: m2, m3, Cái, Bộ..." value={manualUnit} onChange={e => setManualUnit(e.target.value)} /></div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phân loại (Type)</Label>
                                        <Select value={manualItemType} onValueChange={setManualItemType}>
                                            <SelectTrigger><SelectValue placeholder="Phân loại..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="task">Công tác (Task)</SelectItem>
                                                    <SelectItem value="material">Vật tư (Material)</SelectItem>
                                                    <SelectItem value="labor">Nhân công (Labor)</SelectItem>
                                                    <SelectItem value="equipment">Máy thi công (Equipment)</SelectItem>
                                                    <SelectItem value="subcontractor">Thầu phụ (Subcontractor)</SelectItem>
                                                    <SelectItem value="other">Khác (Other)</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsManualAddModalOpen(false)}>Hủy</Button>
                                <Button onClick={handleSaveManualItem} disabled={isAddingManual} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    {isAddingManual ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Lưu công tác"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <AutoEstimateWizard projectId={projectId} onSuccess={fetchLatestData} />
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={handleCalculate} disabled={calcLoading}>
                        {calcLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />} Phân tích Vật tư & Chuyển Dự toán
                    </Button>
                </div>
            </div>

            {/* BẢNG BÓC TÁCH */}
            <Card className="border-none shadow-none bg-transparent">
                <Table className="bg-white rounded-md border">
                    <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead className="w-[60px] text-center font-bold">STT</TableHead>
                            <TableHead className="font-bold">Danh mục công việc / Công tác</TableHead>
                            <TableHead className="w-[80px] text-center font-bold">ĐVT</TableHead>
                            <TableHead className="w-[120px] text-right font-bold">Khối lượng</TableHead>
                            <TableHead className="w-[200px] text-center font-bold">Mã Định Mức</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sections.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">Chưa có dữ liệu bóc tách. Sử dụng Bóc tách AI hoặc Thêm thủ công để bắt đầu.</TableCell></TableRow>
                        ) : sections.map((section, secIdx) => {
                            const tasks = localItems.filter(i => i.parent_id === section.id && i.item_type !== 'section');

                            return (
                                <React.Fragment key={section.id}>
                                    <TableRow className="bg-slate-100 hover:bg-slate-200">
                                        <TableCell className="text-center font-bold text-slate-800">{toRoman(secIdx + 1)}</TableCell>

                                        {/* ✅ Ô EDIT TÊN HẠNG MỤC */}
                                        <TableCell className="p-1">
                                            <Input
                                                defaultValue={section.item_name}
                                                onBlur={(e) => handleUpdateItemField(section.id, 'item_name', e.target.value)}
                                                className="font-bold text-slate-800 uppercase tracking-wide h-8 border-transparent hover:border-slate-300 focus:bg-white bg-transparent shadow-none"
                                            />
                                        </TableCell>

                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-center"><span className="text-slate-400 text-xs font-mono">###{section.item_name.substring(0, 4)}</span></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={() => handleDeleteItem(section.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                    </TableRow>

                                    {tasks.map((task, taskIdx) => {
                                        const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;

                                        return (
                                            <React.Fragment key={task.id}>
                                                <TableRow className="hover:bg-slate-50 transition-colors">
                                                    <TableCell className="text-center font-medium text-slate-600">{taskIdx + 1}</TableCell>

                                                    {/* ✅ Ô EDIT TÊN CÔNG TÁC */}
                                                    <TableCell className="p-1">
                                                        <div className="flex items-center gap-1 w-full">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100 shrink-0" onClick={() => toggleRow(task.id)}>
                                                                {expandedRows[task.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </Button>
                                                            <Input
                                                                defaultValue={task.item_name}
                                                                onBlur={(e) => handleUpdateItemField(task.id, 'item_name', e.target.value)}
                                                                className="flex-1 font-medium text-slate-800 h-8 border-transparent hover:border-slate-300 focus:bg-white bg-transparent shadow-none px-2"
                                                            />
                                                            {renderItemTypeBadge(task.item_type)}
                                                        </div>
                                                    </TableCell>

                                                    {/* ✅ Ô EDIT ĐƠN VỊ TÍNH */}
                                                    <TableCell className="p-1 text-center">
                                                        <Input
                                                            defaultValue={task.unit}
                                                            onBlur={(e) => handleUpdateItemField(task.id, 'unit', e.target.value)}
                                                            className="h-8 w-16 mx-auto text-center border-transparent hover:border-slate-300 focus:bg-white bg-transparent shadow-none text-slate-600 px-1"
                                                        />
                                                    </TableCell>

                                                    <TableCell className="text-right font-bold text-blue-700 text-base pr-4">
                                                        {totalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <AsyncNormSelector taskId={task.id} projectId={projectId} defaultCode={task.norm_code} onUpdate={fetchLatestData} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => handleDeleteItem(task.id)}><Trash2 className="w-4 h-4" /></Button>
                                                    </TableCell>
                                                </TableRow>

                                                {/* CHI TIẾT BÊN TRONG CỦA TỪNG CÔNG TÁC GIỮ NGUYÊN */}
                                                {expandedRows[task.id] && (
                                                    <TableRow className="bg-white">
                                                        <TableCell colSpan={6} className="p-0">
                                                            <div className="pl-16 pr-4 py-3 border-b bg-slate-50/50 shadow-inner">
                                                                <table className="w-full text-sm">
                                                                    <thead className="text-xs text-slate-500 font-semibold border-b border-slate-200">
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
                                                                                <tr key={detail.id} className="border-b border-dashed border-slate-200 hover:bg-white group transition-colors">
                                                                                    <td className="py-1"><Input defaultValue={detail.explanation} onBlur={(e) => handleUpdateText(detail.id, e.target.value)} className="h-8 border-transparent hover:border-slate-300 bg-transparent px-2 w-full text-sm" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.quantity_factor} onBlur={(e) => handleUpdateNum(detail.id, 'quantity_factor', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.length} onBlur={(e) => handleUpdateNum(detail.id, 'length', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.width} onBlur={(e) => handleUpdateNum(detail.id, 'width', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.height} onBlur={(e) => handleUpdateNum(detail.id, 'height', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="text-right font-semibold text-slate-700 pr-2">{displayVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                                    <td className="text-right">
                                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteDetail(detail.id)}>
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                        <tr>
                                                                            <td colSpan={7} className="pt-2">
                                                                                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed text-blue-600 hover:bg-blue-50" onClick={() => handleAddDetail(task.id)}>
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