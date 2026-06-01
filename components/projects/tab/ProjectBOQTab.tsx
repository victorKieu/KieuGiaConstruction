"use client";

import React, { useState, useEffect, Fragment, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Loader2, Trash2, Calculator, Layers, HardHat, Tractor,
    ChevronDown, ChevronRight, FoldVertical,
    ListOrdered, FileText, FileBarChart, FilePlus2, PlusCircle,
    FolderKanban, Hammer, SlidersHorizontal, Settings2, Percent,
    Send, Upload, Plus, ClipboardList, Download, Printer, CalendarClock, ArrowRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/utils";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { formatDate } from "@/lib/utils/utils";
import {
    deleteQTOItem, updateQTONormCode, updateQTOItem,
    deleteQTODetail, addManualQTOItem, addQTODetail, createQTOItem
} from "@/lib/action/qtoActions";
import {
    analyzeSingleQTOItem, createManualEstimationItem
} from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";
import { sync5DToGanttTasks } from "@/lib/action/rollupActions";
import { getNorms } from "@/lib/action/normActions";
import { calculateTaskDates, shiftWorkingDays, Holiday } from "@/lib/utils/scheduleEngine";
import ProjectEstimationTab from "./ProjectEstimationTab";
import { syncTaskVolumeAndEstimations } from "@/lib/action/estimationActions";
interface Props { projectId: string; }
function toRoman(num: number): string {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num.toString();
}
function renderItemTypeBadge(type: string) {
    switch (type) {
        case 'task': return <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-1">Công tác</span>;
        case 'material': return <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-1">Vật tư</span>;
        case 'labor': return <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-1">Nhân công</span>;
        case 'equipment': return <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-1">Máy TC</span>;
        default: return null;
    }
}
function AutoResizeTextarea({ defaultValue, onBlur, className }: { defaultValue: string, onBlur: (e: any) => void, className: string }) {
    return (
        <textarea
            defaultValue={defaultValue}
            onBlur={onBlur}
            className={className}
            rows={1}
            ref={(t) => {
                if (t) {
                    setTimeout(() => {
                        t.style.height = 'auto';
                        t.style.height = t.scrollHeight + 'px';
                    }, 0);
                }
            }}
            onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
            }}
        />
    );
}
function AsyncNormSelector({ taskId, projectId, defaultCode, onUpdate }: { taskId: string; projectId: string; defaultCode: string; onUpdate: (norm: any) => void; }) {
    const [query, setQuery] = useState(defaultCode || "");
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Lệnh toast.error này gọi ngay lập tức khi set state, dễ gây crash
            if (query.trim().length < 2) { setIsOpen(false); toast.error("Nhập ít nhất 2 ký tự!"); return; }
            //...
        }
    };

    const handleSelect = async (norm: any) => {
        setQuery(norm.code);
        setIsOpen(false);
        const toastId = toast.loading("Đang áp dụng và phân tích vật tư tự động...");
        try {
            await updateQTONormCode(taskId, projectId, norm.code);
            await updateQTOItem(taskId, 'item_name', norm.name);
            await updateQTOItem(taskId, 'unit', norm.unit);

            // 🔴 ĐIỂM SÁNG GIÁ NHẤT: Bóc tách tự động ngầm ngay lập tức
            await analyzeSingleQTOItem(taskId, projectId);

            toast.success("Áp mã và cập nhật Hao phí thành công!", { id: toastId });
            onUpdate(norm); // Hàm này gọi lại loadData() để làm tươi UI
        } catch (error) {
            toast.error("Lỗi khi áp dụng định mức!", { id: toastId });
        }
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Input
                    placeholder="🔍 Gõ mã + Enter" value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown} onFocus={() => { if (results.length > 0) setIsOpen(true) }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="h-8 border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/20 text-xs focus-visible:ring-orange-500 font-bold"
                />
                {isSearching && <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-2.5 text-orange-500" />}
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-[450px] right-0 mt-1 max-h-[350px] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
                    {results.map((r) => (
                        <div key={r.id} onMouseDown={() => handleSelect(r)} className="px-3 py-3 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer border-b dark:border-slate-800 flex flex-col gap-1">
                            <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">{r.code}</span>
                            <span className="text-slate-600 dark:text-slate-300 whitespace-normal break-words leading-snug">{r.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PredecessorDialog({ task, schedData, onUpdate }: { task: any, schedData: any[], onUpdate: (val: string) => void }) {
    const [preds, setPreds] = useState(task.predecessors || "");
    const [selTask, setSelTask] = useState("");
    const [selType, setSelType] = useState("FS");
    const [lag, setLag] = useState("0");

    const handleAdd = () => {
        if (!selTask) return toast.error("Vui lòng chọn công việc!");
        let lagStr = "";
        const lagNum = parseInt(lag);
        if (lagNum > 0) lagStr = `+${lagNum}`;
        else if (lagNum < 0) lagStr = `${lagNum}`;

        const newPred = `${selTask}${selType}${lagStr}`;
        const updated = preds ? `${preds}, ${newPred}` : newPred;
        setPreds(updated);
        onUpdate(updated);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-8 w-full font-bold text-indigo-700 bg-indigo-50/30 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400 truncate">
                    {task.predecessors || "Chọn CV"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader><DialogTitle>Thiết lập công việc đi trước</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="text-sm border-l-4 border-teal-500 pl-3 py-1 bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-slate-500">Công tác hiện tại:</span> <br />
                        <strong>{task.stt}. {task.item_name}</strong>
                    </div>
                    <div className="space-y-2">
                        <Label>Mã liên kết hiện tại:</Label>
                        <Input value={preds} onChange={(e) => { setPreds(e.target.value); onUpdate(e.target.value); }} placeholder="VD: 1FS, 2SS+1" className="uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10" />
                        <p className="text-xs text-slate-500">Bạn có thể gõ trực tiếp hoặc sử dụng công cụ bên dưới.</p>
                    </div>
                    <Card className="p-3 bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 space-y-3">
                        <Label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Thêm liên kết bằng công cụ</Label>
                        <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-6 space-y-1">
                                <Label className="text-[10px] uppercase">Chọn công tác</Label>
                                <Select value={selTask} onValueChange={setSelTask}>
                                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {schedData.filter(t => t.stt !== task.stt).map(t => (
                                            <SelectItem key={t.id} value={t.stt.toString()} className="text-xs">{t.stt}. {t.item_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3 space-y-1">
                                <Label className="text-[10px] uppercase">Kiểu liên kết</Label>
                                <Select value={selType} onValueChange={setSelType}>
                                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FS">Nối tiếp (FS)</SelectItem>
                                        <SelectItem value="SS">Song song (SS)</SelectItem>
                                        <SelectItem value="FF">Cùng K.Thúc (FF)</SelectItem>
                                        <SelectItem value="SF">B.Đầu-K.Thúc (SF)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-[10px] uppercase">Độ trễ</Label>
                                <Input type="number" value={lag} onChange={e => setLag(e.target.value)} className="h-8 text-xs bg-white dark:bg-slate-950 text-center" />
                            </div>
                            <div className="col-span-1">
                                <Button size="sm" className="h-8 w-full p-0 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAdd}><Plus className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface SectionRowGroupProps {
    section: any; secIdx: number; qtoTasks: any[]; expandedSections: Record<string, boolean>; expandedRows: Record<string, boolean>;
    projectId: string; toggleSection: (id: string) => void; toggleRow: (id: string) => void;
    handleUpdateQTOField: (id: string, field: string, value: string) => void;
    setExpandedRows: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setIsManualAddModalOpen: (open: boolean) => void; setManualSectionId: (id: string) => void;
    handleDeleteQTO: (id: string, isDetail?: boolean) => void;
    handleUpdateDetailField: (id: string, field: string, value: string) => void;
    handleAddDetail: (id: string) => void; loadData: () => void;
    updateLocalQTO: (id: string, updates: any) => void;
}

function SectionRowGroup({
    section, secIdx, qtoTasks, expandedSections, expandedRows, projectId,
    toggleSection, toggleRow, handleUpdateQTOField, setExpandedRows,
    setIsManualAddModalOpen, setManualSectionId, handleDeleteQTO,
    handleUpdateDetailField, handleAddDetail, loadData, updateLocalQTO
}: SectionRowGroupProps) {
    const secTasks = qtoTasks.filter(i => i.parent_id === section.id && i.item_type !== 'section');
    const isSectionExpanded = expandedSections[section.id] !== false;

    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0, wid = parseFloat(w) || 0, hei = parseFloat(h) || 0, fac = parseFloat(f) || 0;
        if (len === 0 && wid === 0 && hei === 0) return fac;
        return (len !== 0 ? len : 1) * (wid !== 0 ? wid : 1) * (hei !== 0 ? hei : 1) * (fac !== 0 ? fac : 1);
    };

    return (
        <Fragment>
            <TableRow className="bg-slate-200 border-b-2 border-slate-300 font-bold group dark:bg-slate-800/80 dark:border-slate-700">
                <TableCell className="text-center align-top pt-3 text-slate-800 dark:text-slate-200">{toRoman(secIdx + 1)}</TableCell>
                <TableCell className="p-1 uppercase" colSpan={4}>
                    <div className="flex items-start gap-1 w-full pt-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 mt-1" onClick={() => toggleSection(section.id)}>
                            {isSectionExpanded ? <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                        </Button>
                        <FolderKanban className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400 shrink-0 mt-1.5" />

                        <AutoResizeTextarea
                            key={`sec_name_${section.id}_${section.item_name}`}
                            defaultValue={section.item_name}
                            onBlur={(e) => handleUpdateQTOField(section.id, 'item_name', e.target.value)}
                            className="font-bold text-slate-800 uppercase tracking-wide h-auto min-h-[32px] py-1 border-transparent hover:border-slate-400 bg-transparent shadow-none flex-1 dark:text-slate-200 resize-none overflow-hidden outline-none focus:border-slate-400 focus:bg-white dark:focus:bg-slate-900 rounded-md transition-colors leading-tight whitespace-normal break-words"
                        />

                        <Button
                            variant="outline" size="sm"
                            onClick={() => {
                                const firstTask = secTasks[0]; const willExpand = firstTask ? expandedRows[firstTask.id] === false : true;
                                setExpandedRows(prev => { const newRows = { ...prev }; secTasks.forEach(t => { newRows[t.id] = willExpand; }); return newRows; });
                            }}
                            className="h-6 text-[10px] ml-2 px-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600 mt-1"
                        >
                            <FoldVertical className="w-3 h-3 mr-1" /> Thu/Mở diễn giải
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setManualSectionId(section.id); setIsManualAddModalOpen(true); }} className="h-6 text-[10px] ml-2 px-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <PlusCircle className="w-3 h-3 mr-1 text-teal-600 dark:text-teal-400" /> Công tác
                        </Button>
                    </div>
                </TableCell>
                <TableCell className="text-center align-top pt-3">
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQTO(section.id)} className="h-6 w-6 p-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </TableCell>
            </TableRow>

            {isSectionExpanded && secTasks.map((task, taskIdx) => {
                const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
                const isTaskExpanded = expandedRows[task.id] !== false;

                return (
                    <Fragment key={task.id}>
                        <TableRow className="hover:bg-slate-50 border-b border-slate-100 group dark:hover:bg-slate-900/50 dark:border-slate-800">
                            <TableCell className="text-center align-top pt-3 text-slate-500">{taskIdx + 1}</TableCell>
                            <TableCell className="p-1">
                                <div className="flex items-start gap-1 w-full pl-4 pt-1">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 shrink-0 mt-1" onClick={() => toggleRow(task.id)}>
                                        {isTaskExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </Button>
                                    <Hammer className="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400 shrink-0 mt-2" />

                                    <AutoResizeTextarea
                                        key={`name_${task.id}_${task.item_name}`}
                                        defaultValue={task.item_name}
                                        onBlur={(e) => handleUpdateQTOField(task.id, 'item_name', e.target.value)}
                                        className="flex-1 font-medium text-slate-800 h-auto min-h-[32px] py-1 border-transparent hover:border-slate-300 bg-transparent shadow-none px-2 dark:text-slate-200 resize-none overflow-hidden outline-none focus:border-slate-300 focus:bg-white dark:focus:bg-slate-900 rounded-md transition-colors leading-tight whitespace-normal break-words"
                                    />

                                    {renderItemTypeBadge(task.item_type)}
                                </div>
                            </TableCell>
                            <TableCell className="p-1 text-center align-top pt-2">
                                <Input key={`unit_${task.id}_${task.unit}`} defaultValue={task.unit} onBlur={(e) => handleUpdateQTOField(task.id, 'unit', e.target.value)} className="h-8 w-16 mx-auto text-center border-transparent hover:border-slate-300 bg-transparent shadow-none px-1" />
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-700 text-base pr-4 dark:text-blue-400 align-top pt-3">
                                {totalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="align-top pt-2">
                                <AsyncNormSelector
                                    taskId={task.id}
                                    projectId={projectId}
                                    defaultCode={task.norm_code}
                                    onUpdate={(norm) => {
                                        updateLocalQTO(task.id, { norm_code: norm.code, item_name: norm.name, unit: norm.unit });
                                        loadData();
                                    }}
                                />
                            </TableCell>
                            <TableCell className="text-center align-top pt-3">
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteQTO(task.id)} className="h-6 w-6 p-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </TableCell>
                        </TableRow>

                        {isTaskExpanded && (
                            <TableRow className="bg-white border-b-0 dark:bg-transparent">
                                <TableCell colSpan={6} className="p-0 border-b-0">
                                    <div className="pl-[5.5rem] pr-4 py-3 border-b bg-slate-50/80 shadow-inner dark:border-slate-800 dark:bg-slate-900/50">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-500 font-semibold border-b border-slate-200 dark:text-slate-400 dark:border-slate-700">
                                                <tr>
                                                    <th className="text-left py-2">Diễn giải cấu kiện (Sắp xếp thời gian thực)</th>
                                                    <th className="text-center w-[80px]">Số lượng</th>
                                                    <th className="text-center w-[80px]">Dài</th>
                                                    <th className="text-center w-[80px]">Rộng</th>
                                                    <th className="text-center w-[80px]">Cao</th>
                                                    <th className="text-right w-[100px] pr-2">Khối Lượng</th>
                                                    <th className="w-[40px]"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {task.details?.map((detail: any) => (
                                                    <tr key={detail.id} className="border-b border-dashed border-slate-200 hover:bg-white group dark:border-slate-700 dark:hover:bg-slate-800/50">
                                                        <td className="py-1"><Input defaultValue={detail.explanation} onBlur={(e) => handleUpdateDetailField(detail.id, 'explanation', e.target.value)} className="h-8 border-transparent hover:border-slate-300 bg-transparent px-2 w-full text-sm font-medium" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.quantity_factor} onBlur={(e) => handleUpdateDetailField(detail.id, 'quantity_factor', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent font-semibold" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.length} onBlur={(e) => handleUpdateDetailField(detail.id, 'length', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.width} onBlur={(e) => handleUpdateDetailField(detail.id, 'width', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.height} onBlur={(e) => handleUpdateDetailField(detail.id, 'height', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                        <td className="text-right font-bold text-slate-700 pr-2 dark:text-slate-300">{calculateDisplayVol(detail.length, detail.width, detail.height, detail.quantity_factor).toFixed(2)}</td>
                                                        <td className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteQTO(detail.id, true)}><Trash2 className="w-3 h-3" /></Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={7} className="pt-2">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-dashed text-blue-600 hover:bg-blue-50 shadow-sm font-bold dark:text-blue-400 dark:hover:bg-blue-900/20" onClick={() => handleAddDetail(task.id)}>
                                                            <PlusCircle className="w-3 h-3 mr-1" /> Thêm dòng diễn giải
                                                        </Button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </Fragment>
                );
            })}
        </Fragment>
    );
}

export default function ProjectBOQTab({ projectId }: Props) {
    const supabase = createClient();
    const router = useRouter();
    const [ganttTasks, setGanttTasks] = useState<any[]>([]);
    const [calcLoading, setCalcLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing5D, setIsSyncing5D] = useState(false);
    const [newItemLoading, setNewItemLoading] = useState(false);
    const [openManualDialog, setOpenManualDialog] = useState(false);

    const [projectInfo, setProjectInfo] = useState<any>(null);
    const [qtoTasks, setQtoTasks] = useState<any[]>([]);
    const [estItems, setEstItems] = useState<any[]>([]);

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [isAllExpanded, setIsAllExpanded] = useState(true);

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

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfExportType, setPdfExportType] = useState("ALL");

    // ✅ STATES MỚI CHO ENGINE LẬP TIẾN ĐỘ THI CÔNG
    const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [allowWeekendWork, setAllowWeekendWork] = useState(true);
    const holidays: Holiday[] = [
        { date: '2024-01-01', isYearly: true }, { date: '2024-04-30', isYearly: true }, { date: '2024-05-01', isYearly: true }, { date: '2024-09-02', isYearly: true }
    ];

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        // 1. Fetch gộp tất cả trong 1 lần để đảm bảo tính nhất quán
        const { data: projData } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        const { data: qtoData } = await supabase
            .from('qto_items')
            .select('*, details:qto_item_details(*)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        const { data: estData } = await supabase
            .from('estimation_items')
            .select('*')
            .eq('project_id', projectId);

        // 2. Gán dữ liệu
        if (projData) {
            setProjectInfo(projData);
            // ✅ Đảm bảo tên cột trùng khớp với database (start_date và allow_weekend)
            if (projData.start_date) setProjectStartDate(projData.start_date);
            if (projData.allow_weekend !== null) setAllowWeekendWork(projData.allow_weekend);
        }
        // ✅ BƯỚC THÊM: Fetch dữ liệu tiến độ Gantt từ bảng project_tasks
        const { data: pTasksData } = await supabase
            .from('project_tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true }); // Hoặc order theo wbs_code

        if (pTasksData) {
            setGanttTasks(pTasksData);
        }
        if (qtoData) {
            qtoData.forEach((item: any) => {
                if (item.details) item.details.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
            setQtoTasks(qtoData);
        }

        setEstItems(estData || []);
    };

    const updateProjectSettings = async (field: string, value: any) => {
        const toastId = toast.loading("Đang lưu cài đặt...");
        const { error } = await supabase.from('projects')
            .update({ [field]: value })
            .eq('id', projectId);

        if (error) {
            toast.error("Lỗi lưu cài đặt!", { id: toastId });
        } else {
            toast.success("Đã lưu!", { id: toastId });
            await loadData();
        }
    };

    // ✅ HÀM CẬP NHẬT STATE CỤC BỘ ĐỂ GIAO DIỆN NHẢY NGAY LẬP TỨC
    const updateLocalQTO = (id: string, updates: any) => {
        setQtoTasks(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const toggleRow = (id: string) => { setExpandedRows(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] })); };
    const toggleSection = (id: string) => { setExpandedSections(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] })); };

    const handleToggleAllSections = () => {
        const newState = !isAllExpanded; setIsAllExpanded(newState);
        const newExpandedSecs: Record<string, boolean> = {}; const newExpandedRows: Record<string, boolean> = {};
        qtoTasks.forEach(t => {
            if (t.item_type === 'section' || (!t.parent_id && !t.item_type)) newExpandedSecs[t.id] = newState;
            else if (t.item_type === 'task') newExpandedRows[t.id] = newState;
        });
        setExpandedSections(newExpandedSecs); setExpandedRows(newExpandedRows);
    };

    const handleAddSection = async () => {
        const name = prompt("Nhập tên Hạng mục mới (Ví dụ: Phần Móng, Phần Thân...):");
        if (!name || !name.trim()) return;
        const toastId = toast.loading("Đang tạo hạng mục...");
        try {
            await createQTOItem(projectId, name.trim(), "Hạng mục");
            const { data: lastItem } = await supabase.from('qto_items').select('id').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).single();
            if (lastItem) await supabase.from('qto_items').update({ item_type: 'section' }).eq('id', lastItem.id);
            toast.success("Đã tạo hạng mục mới!", { id: toastId });
            await loadData();
        } catch (err: any) { toast.error("Lỗi: " + err.message, { id: toastId }); }
    };

    const handleDeleteQTO = async (id: string, isDetail: boolean = false) => {
        if (!confirm("⚠️ Bạn có chắc chắn muốn xóa dữ liệu này?")) return;
        const toastId = toast.loading("Đang xóa...");
        try {
            if (isDetail) {
                const task = qtoTasks.find(t => t.details?.some((d: any) => d.id === id));
                await supabase.from('qto_item_details').delete().eq('id', id);

                if (task) {
                    // Tính lại khối lượng sau khi trừ đi dòng vừa xóa
                    const updatedDetails = task.details.filter((d: any) => d.id !== id);
                    const newTaskVol = updatedDetails.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0);
                    await syncTaskVolumeAndEstimations(task.id, newTaskVol);
                }
            } else {
                await supabase.from('qto_items').delete().eq('id', id);
            }
            await loadData();
            toast.success("Đã xóa thành công!", { id: toastId });
        } catch (err: any) {
            toast.error("Lỗi khi xóa: " + err.message, { id: toastId });
        }
    };

    const handleUpdateDetailField = async (detailId: string, field: string, value: string) => {
        let val: string | number | null = value;
        const numericFields = ['length', 'width', 'height', 'quantity_factor'];
        if (numericFields.includes(field)) {
            if (value === undefined || value === null || value.trim() === "") val = null;
            else val = parseFloat(value) || 0;
        }

        setQtoTasks(prev => prev.map(t => ({
            ...t,
            details: t.details ? t.details.map((d: any) => d.id === detailId ? { ...d, [field]: val } : d) : []
        })));

        const { error } = await supabase.from('qto_item_details').update({ [field]: val }).eq('id', detailId);

        if (!error) {
            // 🔥 GỌI SERVER ACTION ÉP ĐỒNG BỘ
            const task = qtoTasks.find(t => t.details?.some((d: any) => d.id === detailId));
            if (task) {
                const updatedDetails = task.details.map((d: any) => d.id === detailId ? { ...d, [field]: val } : d);
                const newTaskVol = updatedDetails.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0);

                await syncTaskVolumeAndEstimations(task.id, newTaskVol);
                loadData();
            }
        }
    };

    const handleUpdateQTOField = async (itemId: string, field: string, value: string) => {
        setQtoTasks(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));

        const res = await updateQTOItem(itemId, field, value);

        if (!res?.success) {
            toast.error("Lỗi lưu dữ liệu!");
            loadData();
        } else {
            // toast.success("Đã cập nhật!", { duration: 1000 });

            // 🔴 ĐẢM BẢO CÓ DÒNG NÀY
            loadData();
        }
    };

    const handleAddDetail = async (itemId: string) => {
        const toastId = toast.loading("Đang tạo dòng hình học...");
        try {
            await addQTODetail(itemId, { projectId, explanation: "", length: 0, width: 0, height: 0, quantity_factor: 1 });
            toast.success("Đã thêm dòng diễn giải mới!", { id: toastId });
            setExpandedRows(prev => ({ ...prev, [itemId]: true }));
            await loadData();
        } catch (err: any) { toast.error("Không thể chèn dòng!"); }
    };

    const handleSaveManualItem = async () => {
        if (!manualItemName.trim()) { toast.error("Vui lòng nhập tên công tác!"); return; }
        if (manualSectionId === "NEW" && !newSectionName.trim()) { toast.error("Vui lòng nhập tên Hạng mục mới!"); return; }

        setIsAddingManual(true);
        const res = await addManualQTOItem(projectId, manualSectionId, newSectionName.trim(), manualItemName.trim(), manualUnit.trim(), manualItemType, manualNormCode);

        if (res.success) {
            // 🔴 NẾU CÓ CHỌN MÃ ĐỊNH MỨC -> GỌI API BÓC TÁCH VẬT TƯ NGAY LẬP TỨC
            if (manualNormCode && res.data?.id) {
                toast.loading("Đang phân tích hao phí...", { id: "analyze" });
                // Hàm analyzeSingleQTOItem này anh nhớ Import từ estimationActions.ts nhé
                await analyzeSingleQTOItem(res.data.id, projectId, 0);
                toast.success("Thêm công tác và bóc tách thành công!", { id: "analyze" });
            } else {
                toast.success("Thêm công tác thủ công thành công!");
            }

            setIsManualAddModalOpen(false);
            setManualItemName(""); setNewSectionName(""); setManualNormCode(""); setManualNormQuery("");
            await loadData();
        } else {
            toast.error("Có lỗi xảy ra: " + res.error);
        }
        setIsAddingManual(false);
    };

    const handlePushToGantt = async () => {
        if (!confirm("Hệ thống sẽ đồng bộ Khối lượng, Trình tự và Chi phí sang sơ đồ Gantt. Xác nhận?")) return;
        setIsSyncing5D(true);
        const toastId = toast.loading("Đang đồng bộ...");
        try {
            // ✅ QUAN TRỌNG NHẤT LÀ ĐOẠN NÀY:
            // Lấy ngày tháng chính xác từ thuật toán CPM đắp vào Data
            const syncData = schedulingData.map(t => ({
                ...t,
                start_date: taskSchedules[t.id]?.startDate,
                end_date: taskSchedules[t.id]?.endDate
            }));

            // Gửi dữ liệu đã có NGÀY THÁNG chuẩn xác sang Backend
            const res = await sync5DToGanttTasks(
                projectId,
                { startDate: projectStartDate, allowWeekendWork: allowWeekendWork },
                syncData // <--- Đổi thành syncData
            );

            if (res.success) {
                toast.success(res.message, { id: toastId });
                await loadData(); // Load lại DB mới
                router.refresh();
            } else {
                toast.error(res.error, { id: toastId });
            }
        } catch (error: any) {
            toast.error("Lỗi: " + error.message, { id: toastId });
        }
        setIsSyncing5D(false);
    };

    const handleCreateManualItem = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setNewItemLoading(true);
        const formData = new FormData(e.currentTarget);

        // 🔴 FIX LỖI ÉP KIỂU: Phải chuyển String từ Form thành Số thực (Float)
        const qty = parseFloat(formData.get("quantity")?.toString() || "0");
        const price = parseFloat(formData.get("unit_price")?.toString() || "0");
        const name = formData.get("name")?.toString() || "Chi phí khác";
        const unit = formData.get("unit")?.toString() || "Lần";

        const data = {
            material_name: name,
            original_name: name,
            category: "VL", // Mặc định gán vào nhóm Vật Liệu (hoặc anh có thể cho chọn)
            unit: unit,
            quantity: qty,
            unit_price: price,
            total_cost: qty * price, // Tự động tính luôn thành tiền
            is_mapped: false // Đánh dấu đây là mục thêm thủ công
        };

        const res = await createManualEstimationItem(projectId, data);

        if (res.success) {
            toast.success(res.message || "Đã thêm chi phí thành công!");
            setOpenManualDialog(false);
            await loadData();
        } else {
            toast.error(res.error || "Lỗi khi lưu chi phí phụ!");
        }
        setNewItemLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsImporting(true); const formData = new FormData(); formData.append("file", file);
        try {
            const res = await importBOQFromExcel(projectId, formData);
            if (res.success) { toast.success(res.message); await loadData(); } else toast.error(res.error);
        } catch (error) { toast.error("Lỗi xử lý file Excel."); } finally { setIsImporting(false); e.target.value = ""; }
    };

    const normalItems = estItems.filter(i => !['GT', 'LN', 'VAT'].includes(i.category));
    const globalParams = estItems.filter(i => ['GT', 'LN', 'VAT'].includes(i.category));
    const gtParam = globalParams.find(i => i.category === 'GT') || { quantity: 0, id: 'temp-gt' };
    const lnParam = globalParams.find(i => i.category === 'LN') || { quantity: 0, id: 'temp-ln' };
    const vatParam = globalParams.find(i => i.category === 'VAT') || { quantity: 8, id: 'temp-vat' };

    const sections = useMemo(() => qtoTasks.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type)), [qtoTasks]);
    const tasks = useMemo(() => qtoTasks.filter(i => i.item_type === 'task'), [qtoTasks]);

    const T = normalItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const GT = T * (gtParam.quantity / 100);
    const TL = (T + GT) * (lnParam.quantity / 100);
    const Gxd = T + GT + TL;
    const VAT = Gxd * (vatParam.quantity / 100);
    const TotalProject = Gxd + VAT;

    const getSummaryByCategory = useMemo(() => (category: string) => {
        const map = new Map();
        estItems.filter(i => i.category === category).forEach(item => {
            const key = item.material_name;
            if (!map.has(key)) map.set(key, { ...item, total_quantity: 0, total_cost_sum: 0 });
            const exist = map.get(key);
            exist.total_quantity += Number(item.quantity);
            exist.total_cost_sum += Number(item.total_cost || 0);
        });
        return Array.from(map.values()).sort((a: any, b: any) => a.material_name.localeCompare(b.material_name));
    }, [estItems]);

    // ✅ ĐÃ SỬ DỤNG HÀM exportToExcel TỪ FILE exportExcel.ts CỦA ANH
    const handleExportExcel = () => {
        const allData: any[] = [];
        let stt = 1;

        ['VL', 'NC', 'M'].forEach(cat => {
            const data = getSummaryByCategory(cat);
            data.forEach(item => {
                allData.push({
                    "STT": stt++,
                    "Loại": cat === 'VL' ? 'Vật Liệu' : cat === 'NC' ? 'Nhân Công' : 'Máy Thi Công',
                    "Tên nguồn lực / Vật tư": item.material_name,
                    "Đơn vị tính": item.unit,
                    "Tổng Khối lượng": item.total_quantity,
                    "Đơn giá chào (VNĐ)": "",
                    "Thành tiền (VNĐ)": "",
                    "Ghi chú": ""
                });
            });
        });

        if (allData.length > 0) {
            exportToExcel(allData, `YeuCauBaoGia_${projectInfo?.code || 'KGC'}`, 'BaoGia');
            toast.success("Đã xuất file Excel chào giá thành công!");
        } else {
            toast.error("Không có dữ liệu để xuất!");
        }
    };

    const handleExportPDF = () => {
        let dataToExport: any[] = [];
        if (pdfExportType === "ALL" || pdfExportType === "VL") dataToExport.push({ title: "DANH MỤC VẬT LIỆU", data: getSummaryByCategory("VL") });
        if (pdfExportType === "ALL" || pdfExportType === "NC") dataToExport.push({ title: "DANH MỤC NHÂN CÔNG", data: getSummaryByCategory("NC") });
        if (pdfExportType === "ALL" || pdfExportType === "M") dataToExport.push({ title: "DANH MỤC MÁY THI CÔNG", data: getSummaryByCategory("M") });

        let html = `<html><head><title>Yêu Cầu Báo Giá - ${projectInfo?.name}</title><style>
            @page { size: A4; margin: 15mm; } body { font-family: Arial, sans-serif; padding: 0; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 30px; } .header h1 { color: #1e3a8a; margin: 0 0 10px 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 14px; } .info-box { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 20px; background: #f8fafc; }
            .info-box p { margin: 5px 0; font-size: 14px; } h3 { color: #0f172a; border-left: 4px solid #ea580c; padding-left: 10px; margin-top: 30px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; } th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; }
            th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; } .text-right { text-align: right; } .text-center { text-align: center; }
            .footer { margin-top: 50px; text-align: right; font-style: italic; font-size: 14px; } .footer-title { font-weight: bold; font-style: normal; margin-bottom: 80px; }
        </style></head><body>
            <div class="header"><h1>YÊU CẦU BÁO GIÁ CUNG CẤP</h1><p>Số: YCBG-${projectInfo?.code || '01'}/${new Date().getFullYear()}</p></div>
            <div class="info-box"><p><strong>Tên Dự án / Công trình:</strong> ${projectInfo?.name || '---'}</p><p><strong>Đơn vị yêu cầu:</strong> CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</p>
            <p><strong>Ngày gửi yêu cầu:</strong> ${new Date().toLocaleDateString('vi-VN')}</p><p><strong>Ghi chú:</strong> Kính đề nghị Quý nhà cung cấp điền Đơn giá vào ô trống và gửi lại báo giá sớm nhất.</p></div>
        `;
        dataToExport.forEach(section => {
            if (section.data.length > 0) {
                html += `<h3>${section.title}</h3><table><thead><tr><th class="text-center" width="50">STT</th><th>Tên quy cách / Chủng loại vật tư</th><th class="text-center" width="60">ĐVT</th><th class="text-right" width="100">Khối lượng</th><th class="text-right" width="120">Đơn giá chào (VNĐ)</th><th class="text-right" width="120">Thành tiền (VNĐ)</th></tr></thead><tbody>`;
                section.data.forEach((item: any, idx: number) => {
                    html += `<tr><td class="text-center">${idx + 1}</td><td>${item.material_name}</td><td class="text-center">${item.unit}</td><td class="text-right"><strong>${(item.total_quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</strong></td><td></td><td></td></tr>`;
                });
                html += `</tbody></table>`;
            }
        });
        html += `<div class="footer"><p>TP. Hồ Chí Minh, ngày ... tháng ... năm ${new Date().getFullYear()}</p><p class="footer-title">ĐẠI DIỆN ĐƠN VỊ CHÀO GIÁ</p><p>(Ký, ghi rõ họ tên và đóng dấu)</p></div></body></html>`;
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(html); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250); }
        setIsPdfModalOpen(false);
    };

    // ✅ TÍNH TOÁN NGÀY THÁNG DỰA TRÊN SCHEDULE ENGINE CỦA ANH
    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0, wid = parseFloat(w) || 0, hei = parseFloat(h) || 0, fac = parseFloat(f) || 0;
        if (len === 0 && wid === 0 && hei === 0) return fac;
        return (len !== 0 ? len : 1) * (wid !== 0 ? wid : 1) * (hei !== 0 ? hei : 1) * (fac !== 0 ? fac : 1);
    };

    const schedulingData = useMemo(() => {
        let totalManDays = 0;
        let currentStt = 1;
        const taskSttMap: Record<string, number> = {};

        tasks.forEach(t => { taskSttMap[t.id] = currentStt; currentStt++; });

        return tasks.map(task => {
            const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
            const norm = Number(task.labor_norm) || 0;
            const workers = Number(task.assigned_workers) || 1;
            const ncItems = estItems.filter(e => e.qto_item_id === task.id && e.category === 'NC');
            const manDays = ncItems.reduce((sum, e) => sum + Number(e.quantity), 0);
            totalManDays += manDays;
            const duration = Math.ceil((manDays > 0 ? manDays : (totalVol * (Number(task.labor_norm) || 0))) / workers) || 1;
            const taskHaoPhi = estItems.filter(e => e.qto_item_id === task.id);
            const taskUnitPrice = taskHaoPhi.reduce((sum, e) => sum + (e.quantity * e.unit_price), 0);
            const taskTotalCost = taskUnitPrice * totalVol;
            const weight = TotalProject > 0 ? (taskTotalCost / TotalProject) * 100 : 0;

            return { ...task, totalVol, manDays, duration, weight, taskTotalCost, stt: taskSttMap[task.id] };
        });
    }, [tasks, estItems, TotalProject]);

    // 2. Chạy Thuật toán CPM để cấp Lịch thực tế
    const { taskSchedules, projectEndDate } = useMemo(() => {
        const scheds: Record<string, { startDate: Date, endDate: Date }> = {};
        let changed = true;
        let iters = 0;
        const defaultStart = new Date(projectStartDate);

        const sttToTaskMap: Record<number, any> = {};
        schedulingData.forEach(t => { sttToTaskMap[t.stt] = t; });

        // Khởi tạo tất cả bắt đầu cùng ngày
        schedulingData.forEach(t => {
            scheds[t.id] = { startDate: defaultStart, endDate: shiftWorkingDays(defaultStart, t.duration - 1, holidays, allowWeekendWork) };
        });

        while (changed && iters < 100) {
            changed = false;
            iters++;
            for (const t of schedulingData) {
                const predsStr = t.predecessors || "";
                if (!predsStr) continue;

                // Phân tích "1FS+2", "2SS"
                const preds = predsStr.split(',').map((s: string) => s.trim());
                let maxStart = scheds[t.id].startDate;

                for (const pStr of preds) {
                    // Match pattern: Number, Type(FS|SS|FF|SF), Sign(+|-), Lag(Number)
                    const match = pStr.match(/^(\d+)([a-zA-Z]{2})?(?:([+-])(\d+))?$/i);
                    if (!match) continue;

                    const pStt = parseInt(match[1]);
                    const depType = (match[2]?.toUpperCase() || 'FS') as 'FS' | 'SS' | 'FF' | 'SF';
                    const sign = match[3] === '-' ? -1 : 1;
                    const lag = parseInt(match[4] || '0') * sign;

                    const pTask = sttToTaskMap[pStt];
                    if (!pTask) continue;

                    const predDates = scheds[pTask.id];
                    const calcRes = calculateTaskDates(predDates, t.duration, depType, lag, holidays, allowWeekendWork);

                    if (calcRes.startDate > maxStart) maxStart = calcRes.startDate;
                }

                if (maxStart.getTime() !== scheds[t.id].startDate.getTime()) {
                    scheds[t.id].startDate = maxStart;
                    scheds[t.id].endDate = shiftWorkingDays(maxStart, t.duration - 1, holidays, allowWeekendWork);
                    changed = true;
                }
            }
        }

        let pEnd = defaultStart;
        Object.values(scheds).forEach(s => { if (s.endDate > pEnd) pEnd = s.endDate; });

        return { taskSchedules: scheds, projectEndDate: pEnd };
    }, [schedulingData, projectStartDate, allowWeekendWork]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-800 shadow-sm gap-3 transition-colors">
                <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={isManualAddModalOpen} onOpenChange={setIsManualAddModalOpen}>
                        <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-800">
                            <DialogHeader><DialogTitle className="text-teal-700 dark:text-teal-400 flex items-center gap-2"><FilePlus2 className="w-5 h-5" /> Bổ sung công tác thủ công</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hạng mục (Section)</Label>
                                    <Select value={manualSectionId} onValueChange={setManualSectionId}>
                                        <SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"><SelectValue placeholder="Chọn hạng mục..." /></SelectTrigger>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                            <SelectGroup><SelectItem value="NEW" className="font-bold text-teal-600 dark:text-teal-400">+ Tạo Hạng Mục Mới</SelectItem>{sections.map((sec: any) => <SelectItem key={sec.id} value={sec.id} className="dark:text-slate-200">{sec.item_name}</SelectItem>)}</SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {manualSectionId === "NEW" && (<div className="space-y-2"><Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tên hạng mục mới</Label><Input placeholder="Vd: Công tác thi công..." value={newSectionName} onChange={e => setNewSectionName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>)}
                                <div className="space-y-2 relative bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-900/30">
                                    <Label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">🔍 Gọi mã định mức (Tùy chọn)</Label>
                                    <Input placeholder="Nhập mã hoặc tên công tác + Nhấn Enter..." value={manualNormQuery} onChange={(e) => setManualNormQuery(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') { e.preventDefault(); if (manualNormQuery.trim().length < 2) return toast.error("Nhập ít nhất 2 ký tự!"); setIsSearchingManualNorm(true); setIsManualNormOpen(false); const res = await getNorms(manualNormQuery, 1, 20); setManualNormResults(res.data || []); setIsManualNormOpen(true); setIsSearchingManualNorm(false); } }} onBlur={() => setTimeout(() => setIsManualNormOpen(false), 200)} className="border-blue-300 dark:border-blue-800 focus-visible:ring-blue-500 bg-white dark:bg-slate-950 dark:text-slate-200" />
                                    {isSearchingManualNorm && <Loader2 className="w-4 h-4 animate-spin absolute right-5 bottom-5 text-blue-600" />}
                                    {isManualNormOpen && manualNormResults.length > 0 && (<div className="absolute z-50 w-full mt-1 max-h-[200px] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl left-0 top-full">{manualNormResults.map((r) => (<div key={r.id} onClick={() => { setManualNormCode(r.code); setManualItemName(r.name); setManualUnit(r.unit || "Lần"); setManualItemType('task'); setManualNormQuery(r.code); setIsManualNormOpen(false); toast.success(`Đã chọn mã: ${r.code}`); }} className="px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b dark:border-slate-800 flex flex-col gap-1"><span className="font-bold text-blue-700 dark:text-blue-400">{r.code}</span><span className="text-slate-600 dark:text-slate-400 line-clamp-2">{r.name}</span></div>))}</div>)}
                                </div>
                                <div className="space-y-2 mt-2"><Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tên công tác chi tiết <span className="text-red-500">*</span></Label><Input placeholder="Vd: Trát tường trong nhà..." value={manualItemName} onChange={e => setManualItemName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đơn vị tính <span className="text-red-500">*</span></Label><Input placeholder="Vd: m2, m3..." value={manualUnit} onChange={e => setManualUnit(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phân loại</Label>
                                        <Select value={manualItemType} onValueChange={setManualItemType}><SelectTrigger className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"><SelectValue placeholder="Phân loại..." /></SelectTrigger><SelectContent className="dark:bg-slate-900 dark:border-slate-800"><SelectGroup><SelectItem value="task" className="dark:text-slate-200">Công tác (Task)</SelectItem><SelectItem value="material" className="dark:text-slate-200">Vật tư (Material)</SelectItem></SelectGroup></SelectContent></Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter><Button variant="outline" onClick={() => setIsManualAddModalOpen(false)}>Hủy</Button><Button onClick={handleSaveManualItem} disabled={isAddingManual} className="bg-teal-600 hover:bg-teal-700 text-white">Lưu công tác</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
                        <DialogTrigger asChild><Button variant="outline" className="h-9 border-slate-300 dark:border-slate-700 dark:text-slate-200 font-bold"><Plus className="w-4 h-4 mr-1" /> Chi phí phụ</Button></DialogTrigger>
                        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                            <DialogHeader><DialogTitle>Thêm hạng mục chi phí phụ trợ</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateManualItem} className="space-y-4 py-2">
                                <div><Label>Tên công việc / Chi phí</Label><Input name="name" required placeholder="VD: Chi phí vận chuyển máy" /></div>
                                <div className="grid grid-cols-2 gap-4"><div><Label>ĐVT</Label><Input name="unit" placeholder="Lần, Chuyến..." /></div><div><Label>Khối lượng</Label><Input name="quantity" type="number" step="0.01" required /></div></div>
                                <div><Label>Đơn giá tạm tính</Label><Input name="unit_price" type="number" /></div>
                                <DialogFooter><Button type="submit" disabled={newItemLoading}>{newItemLoading ? "Đang xử lý..." : "Lưu chi phí"}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <Button variant="outline" className="h-9 border-slate-300 dark:border-slate-700 dark:text-slate-200 font-bold">{isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Import Excel</Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="cover_sheet" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-md border w-full justify-start gap-1 flex-wrap h-auto dark:bg-slate-900 dark:border-slate-800">
                    <TabsTrigger value="cover_sheet" className="font-bold text-xs dark:data-[state=active]:bg-slate-800"><FileText className="w-3.5 h-3.5 mr-1.5" /> 1. Tổng Hợp</TabsTrigger>
                    <TabsTrigger value="qto_sheet" className="font-bold text-xs dark:data-[state=active]:bg-slate-800"><ListOrdered className="w-3.5 h-3.5 mr-1.5" /> 2. Tiên lượng </TabsTrigger>
                    <TabsTrigger value="consumption_sheet" className="font-bold text-xs dark:data-[state=active]:bg-slate-800"><ClipboardList className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> 3. Tổng hợp Hao phí</TabsTrigger>
                    <TabsTrigger value="summary_sheet" className="font-bold text-xs dark:data-[state=active]:bg-slate-800"><Percent className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> 4. TH Kinh phí</TabsTrigger>
                    <TabsTrigger value="unit_price_sheet" className="font-bold text-xs dark:data-[state=active]:bg-slate-800"><Settings2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> 5. Đơn giá chi tiết</TabsTrigger>
                    <TabsTrigger value="schedule_sheet" className="font-bold text-xs dark:data-[state=active]:bg-slate-800"><CalendarClock className="w-3.5 h-3.5 mr-1.5" /> 6. Lập Tiến độ </TabsTrigger>
                </TabsList>

                {/* TAB 1: BÌA */}
                <TabsContent value="cover_sheet" className="mt-3">
                    <Card className="border shadow-sm bg-white overflow-hidden p-10 min-h-[500px] flex flex-col items-center justify-center relative dark:border-slate-800 dark:bg-slate-950">
                        <div className="text-center z-10 space-y-6">
                            <h2 className="text-xl font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</h2>
                            <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full dark:bg-blue-500"></div>
                            <h1 className="text-4xl font-black text-slate-900 uppercase mt-8 dark:text-slate-100">HỒ SƠ DỰ TOÁN CHI PHÍ XÂY DỰNG</h1>
                            <div className="mt-16 text-left max-w-xl mx-auto space-y-4 bg-slate-50 p-8 rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
                                <div className="grid grid-cols-3 gap-4 border-b dark:border-slate-800 pb-3">
                                    <span className="font-bold text-slate-500 col-span-1 dark:text-slate-400">Công trình:</span>
                                    <span className="font-bold text-slate-900 col-span-2 dark:text-slate-100">{projectInfo?.name || "---"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b dark:border-slate-800 pb-3">
                                    <span className="font-bold text-slate-500 col-span-1 dark:text-slate-400">Mã dự án:</span>
                                    <span className="font-bold text-slate-900 col-span-2 dark:text-slate-100">{projectInfo?.code || "---"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <span className="font-bold text-slate-500 col-span-1 dark:text-slate-400">Tổng cộng sau thuế:</span>
                                    <span className="font-black text-blue-700 text-xl col-span-2 dark:text-blue-400">{formatCurrency(TotalProject)}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 2: TIÊN LƯỢNG (QTO) */}
                <TabsContent value="qto_sheet" className="mt-3">
                    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                        <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                            <h4 className="font-bold text-slate-700 uppercase text-xs ml-2 dark:text-slate-300">Bảng tính toán Tiên lượng hình học</h4>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleAddSection} className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400">
                                    <PlusCircle className="w-3 h-3 mr-1" /> Hạng mục
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleToggleAllSections} className="h-7 text-xs bg-white font-bold dark:bg-slate-800 dark:border-slate-700">
                                    <FoldVertical className="w-3 h-3 mr-1" /> {isAllExpanded ? "Thu gọn" : "Mở rộng"} tất cả
                                </Button>
                            </div>
                        </div>
                        <div className="overflow-auto custom-scrollbar max-h-[650px] relative pb-6">
                            <table className="w-full text-sm bg-white min-w-[1200px] dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 outline outline-1 outline-slate-200 dark:outline-slate-800 shadow-sm">
                                    <TableRow className="border-none">
                                        <TableHead className="w-[60px] text-center font-bold text-slate-700 dark:text-slate-300">STT</TableHead>
                                        <TableHead className="font-bold min-w-[500px] text-slate-700 dark:text-slate-300">Danh mục công tác bóc tách</TableHead>
                                        <TableHead className="w-[70px] text-center font-bold text-slate-700 dark:text-slate-300">ĐVT</TableHead>
                                        <TableHead className="w-[100px] text-right font-bold text-slate-700 dark:text-slate-300">Khối lượng</TableHead>
                                        <TableHead className="w-[200px] text-center font-bold text-slate-700 dark:text-slate-300">Mã Định Mức</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sections.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">Chưa có dữ liệu bóc tách. Sử dụng Bóc tách AI hoặc Thêm thủ công để bắt đầu.</TableCell></TableRow>
                                    ) : (
                                        sections.map((section: any, secIdx: number) => (
                                            <SectionRowGroup
                                                key={section.id} section={section} secIdx={secIdx} qtoTasks={qtoTasks}
                                                expandedSections={expandedSections} expandedRows={expandedRows} projectId={projectId}
                                                toggleSection={toggleSection} toggleRow={toggleRow} handleUpdateQTOField={handleUpdateQTOField}
                                                setExpandedRows={setExpandedRows} setIsManualAddModalOpen={setIsManualAddModalOpen}
                                                setManualSectionId={setManualSectionId} handleDeleteQTO={handleDeleteQTO}
                                                handleUpdateDetailField={handleUpdateDetailField} handleAddDetail={handleAddDetail} loadData={loadData}
                                                updateLocalQTO={updateLocalQTO}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 3: TỔNG HỢP HAO PHÍ */}
                <TabsContent value="consumption_sheet" className="mt-3">
                    <Card className="border shadow-sm overflow-hidden bg-white dark:border-slate-800 dark:bg-slate-950 mb-4 p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div>
                            <h4 className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-2">
                                <ClipboardList className="w-5 h-5" /> Bảng Tổng hợp Hao phí (Yêu cầu chào giá)
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Sử dụng bảng này để xuất file gửi cho Nhà cung cấp điền báo giá.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-8 text-xs border-green-500 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30 font-bold" onClick={handleExportExcel}>
                                <Download className="w-3.5 h-3.5 mr-1" /> Xuất Excel
                            </Button>
                            <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-8 text-xs border-rose-500 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30 font-bold">
                                        <Printer className="w-3.5 h-3.5 mr-1" /> In / Xuất PDF
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] dark:bg-slate-900 dark:border-slate-800">
                                    <DialogHeader><DialogTitle>Tuỳ chọn Xuất PDF Chào Giá</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Chọn loại hao phí cần xuất:</Label>
                                            <Select value={pdfExportType} onValueChange={setPdfExportType}>
                                                <SelectTrigger className="dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                <SelectContent className="dark:bg-slate-900">
                                                    <SelectItem value="ALL">Tất cả (Vật liệu, Nhân công, Máy)</SelectItem>
                                                    <SelectItem value="VL">Chỉ Vật liệu</SelectItem>
                                                    <SelectItem value="NC">Chỉ Nhân công</SelectItem>
                                                    <SelectItem value="M">Chỉ Máy thi công</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter><Button variant="outline" onClick={() => setIsPdfModalOpen(false)}>Huỷ</Button><Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleExportPDF}>Tạo & In PDF</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </Card>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {['VL', 'NC', 'M'].map((cat) => {
                            const catTitle = cat === 'VL' ? 'Vật Liệu' : cat === 'NC' ? 'Nhân Công' : 'Máy Thi Công';
                            const listSummary = getSummaryByCategory(cat);
                            return (
                                <Card key={cat} className="border shadow-sm overflow-hidden bg-white dark:border-slate-800 dark:bg-slate-950">
                                    <div className="bg-slate-50 border-b p-2.5 flex items-center gap-1.5 dark:bg-slate-900 dark:border-slate-800">
                                        {cat === 'VL' ? <Layers className="w-4 h-4 text-orange-500" /> : cat === 'NC' ? <HardHat className="w-4 h-4 text-green-500" /> : <Tractor className="w-4 h-4 text-purple-500" />}
                                        <h4 className="font-bold text-slate-700 text-xs uppercase dark:text-slate-300">Tổng hao phí {catTitle}</h4>
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b dark:bg-slate-900 dark:border-slate-800">
                                                <TableRow>
                                                    <TableHead className="font-bold text-[11px]">Tên nguồn lực / Vật tư</TableHead>
                                                    <TableHead className="w-[50px] text-center font-bold text-[11px]">ĐVT</TableHead>
                                                    <TableHead className="w-[100px] text-right font-bold text-indigo-600 text-[11px] dark:text-indigo-400">Tổng Khối lượng</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {listSummary.length === 0 ? (
                                                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-xs text-slate-400 italic">Chưa phát hiện hao phí thuộc nhóm này.</TableCell></TableRow>
                                                ) : listSummary.map((mat: any, idx: number) => (
                                                    <TableRow key={idx} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                                        <TableCell className="p-2 text-xs font-medium text-slate-800 dark:text-slate-200">{mat.material_name}</TableCell>
                                                        <TableCell className="text-center text-xs text-slate-500 dark:text-slate-400">{mat.unit}</TableCell>
                                                        <TableCell className="text-right text-xs font-bold text-indigo-700 dark:text-indigo-400 pr-4">{(mat.total_quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>             

                {/* TAB 4: TH KINH PHÍ */}
                <TabsContent value="summary_sheet" className="mt-3">
                    {/* Truyền các props cần thiết mà ProjectEstimationTab yêu cầu */}
                    <ProjectEstimationTab
                        projectId={projectId}
                    />
                </TabsContent>

                {/* TAB 5: ĐƠN GIÁ CHI TIẾT */}
                <TabsContent value="unit_price_sheet" className="mt-3">
                    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                        <div className="bg-blue-50 border-b border-blue-100 p-2.5 flex items-center gap-2 dark:bg-blue-900/30 dark:border-blue-900/50">
                            <FileBarChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h4 className="font-bold text-blue-800 uppercase tracking-wide text-xs dark:text-blue-300">Bảng phân tích Đơn giá chi tiết công tác</h4>
                        </div>
                        <div className="overflow-auto custom-scrollbar max-h-[650px] relative">
                            <table className="w-full text-sm bg-white min-w-[1000px] dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 outline outline-1 outline-slate-200 dark:outline-slate-800 shadow-sm">
                                    <TableRow className="border-none">
                                        <TableHead className="w-[50px] text-center font-bold text-slate-700 dark:text-slate-300">STT</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300 min-w-[500px]">Mã / Thành phần công tác</TableHead>
                                        <TableHead className="w-[80px] text-center font-bold text-slate-700 dark:text-slate-300">ĐVT</TableHead>
                                        <TableHead className="w-[120px] text-right font-bold text-indigo-600 dark:text-indigo-400">Khối lượng</TableHead>
                                        <TableHead className="w-[120px] text-right font-bold text-orange-600 dark:text-orange-400">Định mức</TableHead>
                                        <TableHead className="w-[150px] text-right font-bold text-blue-600 dark:text-blue-400">Đơn giá</TableHead>
                                        <TableHead className="w-[150px] text-right font-bold text-emerald-600 dark:text-emerald-400">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task: any, tIdx: number) => {
                                        const taskHaoPhi = estItems.filter(e => e.qto_item_id === task.id);
                                        if (taskHaoPhi.length === 0) return null;

                                        const taskVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
                                        const taskTotalCost = taskHaoPhi.reduce((sum, e) => sum + (e.quantity * e.unit_price), 0);
                                        const taskUnitPrice = taskVol > 0 ? taskTotalCost / taskVol : 0;

                                        return (
                                            <Fragment key={`up_${task.id}`}>
                                                <TableRow className="bg-slate-200 border-b font-bold dark:bg-slate-800 dark:border-slate-700">
                                                    <TableCell className="text-center align-top pt-3">{tIdx + 1}</TableCell>
                                                    <TableCell className="whitespace-normal break-words">
                                                        <span className="text-blue-700 mr-2 dark:text-blue-400 font-bold">[{task.norm_code}]</span>
                                                        <span className="text-slate-800 dark:text-slate-200">{task.item_name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-center align-top pt-3">{task.unit}</TableCell>
                                                    <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-500/10 text-base">
                                                        {taskVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right"></TableCell>
                                                    <TableCell className="text-right text-blue-700 font-black dark:text-blue-400 align-top pt-3">{formatCurrency(taskUnitPrice)}</TableCell>
                                                    <TableCell className="text-right text-emerald-700 font-black dark:text-emerald-400 align-top pt-3">{formatCurrency(taskTotalCost)}</TableCell>
                                                </TableRow>
                                                {['VL', 'NC', 'M'].map(cat => {
                                                    const items = taskHaoPhi.filter(e => e.category === cat);
                                                    if (items.length === 0) return null;
                                                    const catName = cat === 'VL' ? 'Vật liệu' : cat === 'NC' ? 'Nhân công' : 'Máy thi công';
                                                    return (
                                                        <Fragment key={`${task.id}_${cat}`}>
                                                            <TableRow className="bg-slate-50/50 border-b dark:bg-slate-900/30 dark:border-slate-800">
                                                                <TableCell></TableCell><TableCell colSpan={6} className="font-bold text-slate-700 text-xs py-1 pl-4 dark:text-slate-400">{catName}</TableCell>
                                                            </TableRow>
                                                            {items.map(hp => {
                                                                const normVal = taskVol > 0 ? hp.quantity / taskVol : 0;
                                                                return (
                                                                    <TableRow key={hp.id} className="text-xs hover:bg-slate-50 border-b dark:hover:bg-slate-900/50 dark:border-slate-800">
                                                                        <TableCell></TableCell>
                                                                        <TableCell className="pl-8 text-slate-600 dark:text-slate-400 whitespace-normal break-words">- {hp.material_name}</TableCell>
                                                                        <TableCell className="text-center dark:text-slate-400">{hp.unit}</TableCell>
                                                                        <TableCell className="text-right dark:text-slate-300 font-medium">{hp.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</TableCell>
                                                                        <TableCell className="text-right dark:text-slate-300">{normVal.toLocaleString('en-US', { maximumFractionDigits: 4 })}</TableCell>
                                                                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(hp.unit_price)}</TableCell>
                                                                        <TableCell className="text-right font-medium dark:text-slate-200">{formatCurrency(hp.quantity * hp.unit_price)}</TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </Fragment>
                                                    )
                                                })}
                                                <TableRow><TableCell colSpan={7} className="h-2 p-0 bg-slate-50 border-0 dark:bg-slate-900/30"></TableCell></TableRow>
                                            </Fragment>
                                        )
                                    })}
                                </TableBody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* ✅ TAB 6: LẬP TIẾN ĐỘ THI CÔNG & NGUỒN LỰC (CPM ALGORITHM - BIM 5D) */}
                <TabsContent value="schedule_sheet" className="mt-3">
                    <Card className="border border-teal-200 dark:border-teal-900/50 shadow-md bg-white overflow-hidden dark:bg-slate-950">
                        <div className="bg-teal-50/50 dark:bg-teal-900/10 border-b border-teal-100 dark:border-teal-900/30 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                    <h4 className="font-black text-teal-800 dark:text-teal-300 uppercase tracking-wide">Bảng phân tích Tiến độ & Nguồn lực</h4>
                                </div>
                                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-lg border border-teal-100 dark:border-teal-900/30 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Ngày khởi công:</Label>
                                        <Input
                                            type="date"
                                            value={projectStartDate}
                                            onChange={(e) => {
                                                setProjectStartDate(e.target.value);
                                                updateProjectSettings('start_date', e.target.value); // Lưu DB
                                            }}
                                            className="h-8 text-xs font-bold w-[130px]"
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={allowWeekendWork}
                                            onCheckedChange={(val) => {
                                                setAllowWeekendWork(val);
                                                updateProjectSettings('allow_weekend', val); // Lưu DB
                                            }}
                                            className="data-[state=checked]:bg-teal-600"
                                        />
                                        <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer" onClick={() => setAllowWeekendWork(!allowWeekendWork)}>Làm Chủ Nhật</Label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-teal-100 dark:border-teal-900/30">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Tổng quy mô dự án</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(TotalProject)}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-teal-100 dark:border-teal-900/30">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Tổng hao phí nhân công</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                                        {estItems.filter(e => e.category === 'NC').reduce((sum, e) => sum + e.quantity, 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} <span className="text-sm font-medium text-slate-500">Ca</span>
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-teal-100 dark:border-teal-900/30">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Ngày kết thúc dự kiến</p>
                                    <p className="text-xl font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                        {formatDate(projectEndDate)}
                                    </p>
                                </div>
                                <div className="bg-teal-600 dark:bg-teal-700 p-3 rounded-lg shadow-inner text-white flex flex-col justify-center">
                                    <Button onClick={handlePushToGantt} disabled={isSyncing5D} className="bg-white text-teal-700 hover:bg-teal-50 shadow-sm w-full font-bold">
                                        {isSyncing5D ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Chốt Thông Số (Gantt)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-auto custom-scrollbar max-h-[650px] relative">
                            <table className="w-full text-sm bg-white min-w-[1000px] table-fixed dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 outline outline-1 outline-slate-200 dark:outline-slate-800 shadow-sm">
                                    <TableRow className="bg-slate-50 border-none dark:bg-slate-900">
                                        <TableHead className="w-[50px] text-center font-bold">STT</TableHead>
                                        <TableHead className="font-bold min-w-[400px]">Danh mục Công việc</TableHead>
                                        <TableHead className="w-[90px] text-right font-bold">Tỷ trọng (%)</TableHead>
                                        <TableHead className="w-[100px] text-right font-bold">Khối lượng</TableHead>
                                        <TableHead className="w-[100px] text-center font-bold text-rose-600 dark:text-rose-400">Hao phí (Ca)</TableHead>
                                        <TableHead className="w-[90px] text-center font-bold text-blue-600 dark:text-blue-400">Thợ bố trí</TableHead>
                                        <TableHead className="w-[90px] text-center font-bold text-emerald-600 dark:text-emerald-400">Ngày làm</TableHead>
                                        <TableHead className="w-[180px] text-center font-bold text-indigo-600 dark:text-indigo-400">Công việc trước</TableHead>
                                        <TableHead className="w-[120px] text-center font-bold bg-teal-50 dark:bg-teal-900/20">Ngày Bắt Đầu</TableHead>
                                        <TableHead className="w-[120px] text-center font-bold bg-teal-50 dark:bg-teal-900/20">Ngày Kết Thúc</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        if (!taskSchedules || Object.keys(taskSchedules).length === 0) return null;

                                        // 🔴 1. TÍNH TỔNG CHI PHÍ TRỰC TIẾP CỦA DỰ ÁN (LÀM MẪU SỐ)
                                        // Loại trừ các chi phí % chung (GT, LN, VAT) để tính tỷ trọng cho chuẩn
                                        const totalDirectCost = estItems
                                            .filter(e => !['GT', 'LN', 'VAT'].includes(e.category))
                                            .reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0);

                                        // ✅ TẠO MẢNG MỚI & SORT THEO NGÀY BẮT ĐẦU RỒI MỚI RENDER
                                        const sortedTasks = [...schedulingData].sort((a, b) => {
                                            const sDatesA = taskSchedules[a.id];
                                            const sDatesB = taskSchedules[b.id];

                                            if (!sDatesA && !sDatesB) return 0;
                                            if (!sDatesA) return 1;
                                            if (!sDatesB) return -1;

                                            const timeA = new Date(sDatesA.startDate).getTime();
                                            const timeB = new Date(sDatesB.startDate).getTime();

                                            // Ưu tiên xếp theo Ngày bắt đầu tăng dần
                                            if (timeA !== timeB) return timeA - timeB;

                                            // Nếu trùng ngày bắt đầu thì xếp theo số STT cũ (hoặc WBS)
                                            return a.stt - b.stt;
                                        });

                                        return sortedTasks.map((task: any) => {
                                            const sDates = taskSchedules[task.id];
                                            if (!sDates) return null;

                                            // 🔴 2. TÍNH CHI PHÍ CỦA RIÊNG CÔNG TÁC NÀY
                                            const taskCost = estItems
                                                .filter(e => e.qto_item_id === task.id)
                                                .reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0);

                                            // 🔴 3. CHIA TỶ LỆ % TỶ TRỌNG
                                            const weight = totalDirectCost > 0 ? (taskCost / totalDirectCost) * 100 : 0;

                                            return (
                                                <TableRow key={`sched_${task.id}`} className="hover:bg-slate-50 border-b dark:hover:bg-slate-900/50 dark:border-slate-800">
                                                    <TableCell className="text-center font-bold text-slate-500 align-top pt-2">{task.stt}</TableCell>
                                                    <TableCell className="font-medium text-slate-800 dark:text-slate-200 whitespace-normal break-words">{task.item_name}</TableCell>

                                                    {/* 🔴 4. ĐÃ THAY THẾ task.weight BẰNG BIẾN weight VỪA TÍNH */}
                                                    <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400 align-top pt-2">
                                                        {weight.toFixed(2)}%
                                                    </TableCell>

                                                    <TableCell className="text-right font-semibold align-top pt-2">{task.totalVol.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">{task.unit}</span></TableCell>
                                                    <TableCell className="text-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50/20 align-top pt-2">{task.manDays.toLocaleString('en-US', { maximumFractionDigits: 1 })}</TableCell>
                                                    {/* KHỐI TÍNH TOÁN NGÀY LÀM TỰ ĐỘNG THEO THỢ BỐ TRÍ */}
                                                    {(() => {
                                                        const currentWorkers = Number(task.assigned_workers) || 1;
                                                        // Công thức: Hao phí chia cho số thợ (làm tròn lên)
                                                        const computedDuration = task.manDays > 0 ? Math.ceil(task.manDays / currentWorkers) : 1;

                                                        return (
                                                            <>
                                                                {/* CỘT NHẬP THỢ BỐ TRÍ */}
                                                                <TableCell className="p-1 align-top pt-2">
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        defaultValue={currentWorkers}
                                                                        onBlur={async (e) => {
                                                                            const newWorkers = Number(e.target.value) || 1;
                                                                            const newDuration = task.manDays > 0 ? Math.ceil(task.manDays / newWorkers) : 1;

                                                                            // 1. Cập nhật giao diện (React State) ngay lập tức cho mượt
                                                                            setQtoTasks(prev => prev.map(t =>
                                                                                t.id === task.id ? { ...t, assigned_workers: newWorkers, duration: newDuration } : t
                                                                            ));

                                                                            // 2. Cập nhật Database ĐỒNG THỜI 2 trường để đẩy sang Gantt cho chuẩn
                                                                            await supabase.from('qto_items')
                                                                                .update({ assigned_workers: newWorkers, duration: newDuration })
                                                                                .eq('id', task.id);

                                                                            // 3. Tải lại để tính lại ngày tháng của Gantt ngầm
                                                                            loadData();
                                                                        }}
                                                                        className="h-8 text-center text-blue-700 bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 shadow-none font-bold"
                                                                    />
                                                                </TableCell>

                                                                {/* CỘT HIỂN THỊ NGÀY LÀM (Tự động nhảy số) */}
                                                                <TableCell className="text-center font-black text-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/20 dark:text-emerald-400 align-top pt-3">
                                                                    {computedDuration}
                                                                </TableCell>
                                                            </>
                                                        );
                                                    })()}
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <PredecessorDialog
                                                            task={task}
                                                            schedData={schedulingData}
                                                            onUpdate={(val) => {
                                                                updateLocalQTO(task.id, { predecessors: val });
                                                                handleUpdateQTOField(task.id, 'predecessors', val);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-teal-800 bg-teal-50/50 dark:text-teal-300 dark:bg-teal-900/10 border-l dark:border-slate-800 align-top pt-3">
                                                        {formatDate(sDates.startDate)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-teal-800 bg-teal-50/50 dark:text-teal-300 dark:bg-teal-900/10 align-top pt-3">
                                                        {formatDate(sDates.endDate)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        });
                                    })()}
                                </TableBody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}