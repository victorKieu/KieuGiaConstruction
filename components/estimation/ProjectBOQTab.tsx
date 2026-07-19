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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Loader2, Trash2, Layers, HardHat, Tractor, ChevronDown, ChevronRight, FoldVertical, ListOrdered, FileText, FileBarChart, FilePlus2, PlusCircle,
    FolderKanban, Hammer, Settings2, Percent, Send, Upload, Plus, ClipboardList, Download, Printer, CalendarClock, FileSpreadsheet, LineChart, Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/utils";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { formatDate } from "@/lib/utils/utils";
import { updateQTONormCode, updateQTOItem, addManualQTOItem, addQTODetail, createQTOItem } from "@/lib/action/qtoActions";
import { analyzeSingleQTOItem, createManualEstimationItem, syncTaskVolumeAndEstimations, recalculateProjectEffectivePrices } from "@/lib/action/estimationActions";
import { importBOQFromExcel } from "@/lib/action/import-excel";
import { sync5DToGanttTasks } from "@/lib/action/rollupActions";
import { getNorms } from "@/lib/action/normActions";
import { calculateTaskDates, shiftWorkingDays, Holiday } from "@/lib/utils/scheduleEngine";
import ProjectEstimationTab from "./ProjectEstimationTab";
import AutoEstimateWizard from "@/components/projects/qto/AutoEstimateWizard";
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Line } from 'recharts';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
interface Props { projectId: string; }

function toRoman(num: number): string {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num.toString();
}

function renderItemTypeBadge(type: string) {
    switch (type) {
        case 'task': return <span className="mt-1 shrink-0 rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-700 text-[10px] uppercase dark:bg-blue-500/20 dark:text-blue-400">Công tác</span>;
        case 'material': return <span className="mt-1 shrink-0 rounded bg-orange-100 px-2 py-0.5 font-bold text-orange-700 text-[10px] uppercase dark:bg-orange-500/20 dark:text-orange-400">Vật tư</span>;
        case 'labor': return <span className="mt-1 shrink-0 rounded bg-green-100 px-2 py-0.5 font-bold text-green-700 text-[10px] uppercase dark:bg-green-500/20 dark:text-green-400">Nhân công</span>;
        case 'equipment': return <span className="mt-1 shrink-0 rounded bg-purple-100 px-2 py-0.5 font-bold text-purple-700 text-[10px] uppercase dark:bg-purple-500/20 dark:text-purple-400">Máy TC</span>;
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

    useEffect(() => { setQuery(defaultCode || ""); }, [defaultCode]);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (query.trim().length < 2) { setIsOpen(false); toast.error("Nhập ít nhất 2 ký tự!"); return; }
            setIsSearching(true);
            const res = await getNorms(query, 1, 30);
            setResults(res.data || []);
            setIsOpen(true);
            setIsSearching(false);
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
            await analyzeSingleQTOItem(taskId, projectId, 0);

            toast.success("Áp mã và cập nhật Hao phí thành công!", { id: toastId });
            onUpdate(norm);
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
                {isSearching && <Loader2 className="absolute top-2.5 right-2 h-3 w-3 animate-spin text-orange-500" />}
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute right-0 z-50 mt-1 max-h-[350px] w-[450px] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                    {results.map((r) => (
                        <div key={r.id} onMouseDown={() => handleSelect(r)} className="px-3 py-3 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer border-b dark:border-slate-800 flex flex-col gap-1">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{r.code}</span>
                            <span className="leading-snug break-words whitespace-normal text-slate-600 dark:text-slate-300">{r.name}</span>
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
                <Button variant="outline" className="h-8 w-full truncate border-indigo-200 bg-indigo-50/30 font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400">
                    {task.predecessors || "Chọn CV"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] dark:border-slate-800 dark:bg-slate-900">
                <DialogHeader><DialogTitle>Thiết lập công việc đi trước</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="border-l-4 border-teal-500 bg-slate-50 py-1 pl-3 text-sm dark:bg-slate-800/50">
                        <span className="text-slate-500">Công tác hiện tại:</span> <br />
                        <strong>{task.stt}. {task.item_name}</strong>
                    </div>
                    <div className="space-y-2">
                        <Label>Mã liên kết hiện tại:</Label>
                        <Input value={preds} onChange={(e) => { setPreds(e.target.value); onUpdate(e.target.value); }} placeholder="VD: 1FS, 2SS+1" className="uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10" />
                        <p className="text-xs text-slate-500">Bạn có thể gõ trực tiếp hoặc sử dụng công cụ bên dưới.</p>
                    </div>
                    <Card className="space-y-3 border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                        <Label className="text-xs font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">Thêm liên kết bằng công cụ</Label>
                        <div className="grid grid-cols-12 items-end gap-2">
                            <div className="col-span-6 space-y-1">
                                <Label className="text-[10px] uppercase">Chọn công tác</Label>
                                <Select value={selTask} onValueChange={setSelTask}>
                                    <SelectTrigger className="h-8 bg-white text-xs dark:bg-slate-950"><SelectValue placeholder="Chọn..." /></SelectTrigger>
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
                                    <SelectTrigger className="h-8 bg-white text-xs dark:bg-slate-950"><SelectValue /></SelectTrigger>
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
                                <Button size="sm" className="h-8 w-full bg-blue-600 p-0 text-white hover:bg-blue-700" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
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
            <TableRow className="group border-b-2 border-slate-300 bg-slate-200 font-bold dark:border-slate-700 dark:bg-slate-800/80">
                <TableCell className="pt-3 text-center align-top text-slate-800 dark:text-slate-200">{toRoman(secIdx + 1)}</TableCell>
                <TableCell className="p-1 uppercase" colSpan={4}>
                    <div className="flex w-full items-start gap-1 pt-1">
                        <Button variant="ghost" size="sm" className="mt-1 h-6 w-6 shrink-0 p-0" onClick={() => toggleSection(section.id)}>
                            {isSectionExpanded ? <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                        </Button>
                        <FolderKanban className="mt-1.5 mr-1 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <AutoResizeTextarea
                            // ĐÃ SỬA: Bỏ _${section.item_name} ra khỏi key
                            key={`sec_name_${section.id}`}
                            defaultValue={section.item_name}
                            onBlur={(e) => {
                                // ĐÃ SỬA: Thêm điều kiện kiểm tra, chỉ lưu khi thực sự có thay đổi
                                if (e.target.value !== section.item_name) {
                                    handleUpdateQTOField(section.id, 'item_name', e.target.value);
                                }
                            }}
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
                            <FoldVertical className="mr-1 h-3 w-3" /> Thu/Mở diễn giải
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setManualSectionId(section.id); setIsManualAddModalOpen(true); }} className="h-6 text-[10px] ml-2 px-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <PlusCircle className="mr-1 h-3 w-3 text-teal-600 dark:text-teal-400" /> Công tác
                        </Button>
                    </div>
                </TableCell>
                <TableCell className="pt-3 text-center align-top">
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQTO(section.id)} className="h-6 w-6 p-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </TableCell>
            </TableRow>

            {isSectionExpanded && secTasks.map((task, taskIdx) => {
                const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
                const isTaskExpanded = expandedRows[task.id] !== false;

                return (
                    <Fragment key={task.id}>
                        <TableRow className="group border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50">
                            <TableCell className="pt-3 text-center align-top text-slate-500">{taskIdx + 1}</TableCell>
                            <TableCell className="p-1">
                                <div className="flex w-full items-start gap-1 pt-1 pl-4">
                                    <Button variant="ghost" size="sm" className="mt-1 h-6 w-6 shrink-0 p-0 text-blue-600" onClick={() => toggleRow(task.id)}>
                                        {isTaskExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                    <Hammer className="mt-2 mr-1 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                                    <AutoResizeTextarea
                                        // ĐÃ SỬA: Bỏ _${task.item_name} ra khỏi key
                                        key={`name_${task.id}`}
                                        defaultValue={task.item_name}
                                        onBlur={(e) => {
                                            // ĐÃ SỬA: Thêm điều kiện kiểm tra, chỉ lưu khi thực sự có thay đổi
                                            if (e.target.value !== task.item_name) {
                                                handleUpdateQTOField(task.id, 'item_name', e.target.value);
                                            }
                                        }}
                                        className="flex-1 font-medium text-slate-800 h-auto min-h-[32px] py-1 border-transparent hover:border-slate-300 bg-transparent shadow-none px-2 dark:text-slate-200 resize-none overflow-hidden outline-none focus:border-slate-300 focus:bg-white dark:focus:bg-slate-900 rounded-md transition-colors leading-tight whitespace-normal break-words"
                                    />
                                    {renderItemTypeBadge(task.item_type)}
                                </div>
                            </TableCell>
                            <TableCell className="p-1 pt-2 text-center align-top">
                                <Input key={`unit_${task.id}_${task.unit}`} defaultValue={task.unit} onBlur={(e) => handleUpdateQTOField(task.id, 'unit', e.target.value)} className="h-8 w-16 mx-auto text-center border-transparent hover:border-slate-300 bg-transparent shadow-none px-1" />
                            </TableCell>
                            <TableCell className="pt-3 pr-4 text-right align-top text-base font-bold text-blue-700 dark:text-blue-400">
                                {totalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="border-r border-slate-200 p-1 align-top dark:border-slate-800">
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
                            <TableCell className="pt-3 text-center align-top">
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteQTO(task.id)} className="h-6 w-6 p-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </TableCell>
                        </TableRow>

                        {isTaskExpanded && (
                            <TableRow className="border-b-0 bg-white dark:bg-transparent">
                                <TableCell colSpan={6} className="border-b-0 p-0">
                                    <div className="border-b bg-slate-50/80 py-3 pr-4 pl-[5.5rem] shadow-inner dark:border-slate-800 dark:bg-slate-900/50">
                                        <table className="w-full text-sm">
                                            <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                                <tr>
                                                    <th className="py-2 text-left">Diễn giải cấu kiện (Sắp xếp thời gian thực)</th>
                                                    <th className="w-[80px] text-center">Số lượng</th>
                                                    <th className="w-[80px] text-center">Dài</th>
                                                    <th className="w-[80px] text-center">Rộng</th>
                                                    <th className="w-[80px] text-center">Cao</th>
                                                    <th className="w-[100px] pr-2 text-right">Khối Lượng</th>
                                                    <th className="w-[40px]"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {task.details?.map((detail: any) => (
                                                    <tr key={detail.id} className="group border-b border-dashed border-slate-200 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800/50">
                                                        <td className="py-1"><Input defaultValue={detail.explanation} onBlur={(e) => handleUpdateDetailField(detail.id, 'explanation', e.target.value)} className="h-8 border-transparent hover:border-slate-300 bg-transparent px-2 w-full text-sm font-medium" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.quantity_factor} onBlur={(e) => handleUpdateDetailField(detail.id, 'quantity_factor', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent font-semibold" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.length} onBlur={(e) => handleUpdateDetailField(detail.id, 'length', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.width} onBlur={(e) => handleUpdateDetailField(detail.id, 'width', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                        <td className="px-1"><Input type="number" defaultValue={detail.height} onBlur={(e) => handleUpdateDetailField(detail.id, 'height', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                        <td className="pr-2 text-right font-bold text-slate-700 dark:text-slate-300">{calculateDisplayVol(detail.length, detail.width, detail.height, detail.quantity_factor).toFixed(2)}</td>
                                                        <td className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500" onClick={() => handleDeleteQTO(detail.id, true)}><Trash2 className="h-3 w-3" /></Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={7} className="pt-2">
                                                        <Button variant="outline" size="sm" className="h-7 border-dashed text-xs font-bold text-blue-600 shadow-sm hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" onClick={() => handleAddDetail(task.id)}>
                                                            <PlusCircle className="mr-1 h-3 w-3" /> Thêm dòng diễn giải
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

    const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [allowWeekendWork, setAllowWeekendWork] = useState(true);
    const holidays: Holiday[] = [
        { date: '2024-01-01', isYearly: true }, { date: '2024-04-30', isYearly: true }, { date: '2024-05-01', isYearly: true }, { date: '2024-09-02', isYearly: true }
    ];
    // State lưu tên Nguồn lực đang được chọn xem ở Tab 7
    const [selectedResourceName, setSelectedResourceName] = useState<string>("");

    // THÊM MỚI: State lưu chế độ xem thời gian (Tuần hoặc Tháng)
    const [timePhaseUnit, setTimePhaseUnit] = useState<"week" | "month">("week");

    // State (khu vực khai báo useState)
    const [masterMaterials, setMasterMaterials] = useState<any[]>([]);

    // Tự động fetch dữ liệu ngầm để làm cơ sở quy đổi làm tròn cho Dòng tiền
    useEffect(() => {
        const fetchMasterMaterials = async () => {
            const { data } = await supabase.from('materials').select('*');
            if (data) setMasterMaterials(data);
        };
        fetchMasterMaterials();
    }, []);

    // Lọc danh sách Nguồn lực độc nhất (Unique) từ estItems
    const uniqueResources = useMemo(() => {
        const map = new Map();
        estItems.forEach(e => {
            if (['VL', 'NC', 'M'].includes(e.category) && e.material_name) {
                if (!map.has(e.material_name)) {
                    map.set(e.material_name, e.unit || "");
                }
            }
        });
        return Array.from(map.entries())
            .map(([name, unit]) => ({ name, unit }))
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [estItems]);

    // Tự động chọn vật tư đầu tiên trong danh sách khi load xong dữ liệu
    useEffect(() => {
        if (!selectedResourceName && uniqueResources.length > 0) {
            setSelectedResourceName(uniqueResources[0].name || "Chưa có tên");
        }
    }, [uniqueResources, selectedResourceName]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: projData } = await supabase.from('projects').select('*').eq('id', projectId).single();
        const { data: qtoData } = await supabase.from('qto_items').select('*, details:qto_item_details(*)').eq('project_id', projectId).order('created_at', { ascending: true });
        const { data: estData } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);
        const { data: mData } = await supabase.from('materials').select('*');
        setMasterMaterials(mData || []);

        if (projData) {
            setProjectInfo(projData);
            if (projData.start_date) setProjectStartDate(projData.start_date);
            if (projData.allow_weekend !== null) setAllowWeekendWork(projData.allow_weekend);
        }

        const { data: pTasksData } = await supabase.from('project_tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
        if (pTasksData) setGanttTasks(pTasksData);
        if (qtoData) {
            qtoData.forEach((item: any) => { if (item.details) item.details.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); });
            setQtoTasks(qtoData);
        }
        setEstItems(estData || []);
    };

    const updateProjectSettings = async (field: string, value: any) => {
        const toastId = toast.loading("Đang lưu cài đặt...");
        const { error } = await supabase.from('projects').update({ [field]: value }).eq('id', projectId);
        if (error) toast.error("Lỗi lưu cài đặt!", { id: toastId });
        else { toast.success("Đã lưu!", { id: toastId }); await loadData(); }
    };

    const updateLocalQTO = (id: string, updates: any) => { setQtoTasks(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item)); };
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

    // ==========================================
    // CẬP NHẬT: HÀM XUẤT EXCEL TIẾN ĐỘ THI CÔNG
    // ==========================================
    const handleExportScheduleExcel = () => {
        if (!taskSchedules || Object.keys(taskSchedules).length === 0 || schedulingData.length === 0) {
            return toast.error("Không có dữ liệu tiến độ để xuất!");
        }

        const toastId = toast.loading("Đang xuất file Excel Tiến độ...");

        try {
            const aoaData: any[][] = [];

            // 1. Header dự án
            aoaData.push([`BẢNG PHÂN TÍCH TIẾN ĐỘ VÀ NGUỒN LỰC DỰ ÁN`]);
            aoaData.push([`Công trình: ${projectInfo?.name || projectId}`]);
            aoaData.push([`Ngày khởi công dự kiến: ${formatDate(projectStartDate)}`]);
            aoaData.push([""]); // Dòng trống

            // 2. Dòng Tiêu đề bảng (Header)
            aoaData.push([
                "STT",
                "Danh mục Công việc",
                "Tỷ trọng (%)",
                "Khối lượng",
                "ĐVT",
                "Hao phí (Ca)",
                "Thợ bố trí",
                "Ngày làm",
                "Công việc đi trước",
                "Ngày Bắt Đầu",
                "Ngày Kết Thúc"
            ]);

            // 3. Xử lý Dữ liệu các dòng
            const totalDirectCost = estItems.filter(e => !['GT', 'LN', 'VAT'].includes(e.category)).reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);

            const sortedTasks = [...schedulingData].sort((a, b) => {
                const sDatesA = taskSchedules[a.id]; const sDatesB = taskSchedules[b.id];
                if (!sDatesA && !sDatesB) return 0; if (!sDatesA) return 1; if (!sDatesB) return -1;
                const timeA = new Date(sDatesA.startDate).getTime(); const timeB = new Date(sDatesB.startDate).getTime();
                if (timeA !== timeB) return timeA - timeB; return a.stt - b.stt;
            });

            sortedTasks.forEach((task: any) => {
                const sDates = taskSchedules[task.id];
                if (!sDates) return;

                const taskCost = estItems.filter(e => e.qto_item_id === task.id).reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);
                const weight = totalDirectCost > 0 ? (taskCost / totalDirectCost) * 100 : 0;
                const currentWorkers = Number(task.assigned_workers) || 1;
                const computedDuration = task.manDays > 0 ? Math.ceil(task.manDays / currentWorkers) : 1;

                aoaData.push([
                    task.stt,
                    `[${task.sectionName}] - ${task.item_name}`, // Nối tên Hạng mục và Tên công tác
                    weight.toFixed(2),
                    task.totalVol,
                    task.unit,
                    task.manDays.toFixed(1),
                    currentWorkers,
                    computedDuration,
                    task.predecessors || "",
                    formatDate(sDates.startDate),
                    formatDate(sDates.endDate)
                ]);
            });

            // 4. Tạo Sheet và định dạng
            const ws = XLSX.utils.aoa_to_sheet(aoaData);

            // Chỉnh độ rộng cột cho đẹp
            ws['!cols'] = [
                { wch: 6 },   // STT
                { wch: 60 },  // Danh mục Công việc
                { wch: 12 },  // Tỷ trọng
                { wch: 15 },  // Khối lượng
                { wch: 8 },   // ĐVT
                { wch: 15 },  // Hao phí
                { wch: 12 },  // Thợ
                { wch: 12 },  // Ngày làm
                { wch: 20 },  // CV trước
                { wch: 15 },  // Bắt đầu
                { wch: 15 }   // Kết thúc
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Tien_Do_Thi_Cong");

            XLSX.writeFile(wb, `Tien_Do_Thi_Cong_${projectInfo?.code || projectId}.xlsx`);
            toast.success("Xuất file Excel Tiến độ thành công!", { id: toastId });

        } catch (error: any) {
            toast.error("Lỗi xuất Excel: " + error.message, { id: toastId });
        }
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
                    const updatedDetails = task.details.filter((d: any) => d.id !== id);
                    const newTaskVol = updatedDetails.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0);
                    // Hành động này đã tự gọi recalculateProjectEffectivePrices ở Backend
                    await syncTaskVolumeAndEstimations(task.id, newTaskVol);
                }
            } else {
                await supabase.from('qto_items').delete().eq('id', id);
                // Gọi thẳng recalculate để chia lại giá vì tổng lượng đã giảm
                await recalculateProjectEffectivePrices(projectId);
            }
            await loadData();
            toast.success("Đã xóa và cập nhật lại đơn giá!", { id: toastId });
        } catch (err: any) { toast.error("Lỗi khi xóa: " + err.message, { id: toastId }); }
    };

    const handleUpdateDetailField = async (detailId: string, field: string, value: string) => {
        let val: string | number | null = value;
        const numericFields = ['length', 'width', 'height', 'quantity_factor'];
        if (numericFields.includes(field)) {
            if (value === undefined || value === null || value.trim() === "") val = null;
            else val = parseFloat(value) || 0;
        }

        setQtoTasks(prev => prev.map(t => ({ ...t, details: t.details ? t.details.map((d: any) => d.id === detailId ? { ...d, [field]: val } : d) : [] })));
        const { error } = await supabase.from('qto_item_details').update({ [field]: val }).eq('id', detailId);

        if (!error) {
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
        // 1. Optimistic Update: Cập nhật giao diện ngay lập tức để không bị giật chữ
        setQtoTasks(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));

        // 2. Gọi API lưu ngầm xuống Database
        const res = await updateQTOItem(itemId, field, value);

        // 3. CHỈ gọi loadData() nếu lỗi để khôi phục lại dữ liệu. Thành công thì KHÔNG gọi.
        if (!res?.success) {
            toast.error("Lỗi lưu dữ liệu!");
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
            if (manualNormCode && res.data?.id) {
                toast.loading("Đang phân tích hao phí...", { id: "analyze" });
                await analyzeSingleQTOItem(res.data.id, projectId, 0);
                toast.success("Thêm công tác và bóc tách thành công!", { id: "analyze" });
            } else { toast.success("Thêm công tác thủ công thành công!"); }

            setIsManualAddModalOpen(false);
            setManualItemName(""); setNewSectionName(""); setManualNormCode(""); setManualNormQuery("");
            await loadData();
        } else { toast.error("Có lỗi xảy ra: " + res.error); }
        setIsAddingManual(false);
    };

    const handlePushToGantt = async () => {
        if (!confirm("Hệ thống sẽ đồng bộ Khối lượng, Trình tự và Chi phí sang sơ đồ Gantt. Xác nhận?")) return;
        setIsSyncing5D(true);
        const toastId = toast.loading("Đang đồng bộ...");
        try {
            const syncData = schedulingData.map(t => ({
                ...t, start_date: taskSchedules[t.id]?.startDate, end_date: taskSchedules[t.id]?.endDate
            }));
            const res = await sync5DToGanttTasks(projectId, { startDate: projectStartDate, allowWeekendWork: allowWeekendWork }, syncData);
            if (res.success) { toast.success(res.message, { id: toastId }); await loadData(); router.refresh(); } else { toast.error(res.error, { id: toastId }); }
        } catch (error: any) { toast.error("Lỗi: " + error.message, { id: toastId }); }
        setIsSyncing5D(false);
    };

    const handleCreateManualItem = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setNewItemLoading(true);
        const formData = new FormData(e.currentTarget);
        const qty = parseFloat(formData.get("quantity")?.toString() || "0");
        const price = parseFloat(formData.get("unit_price")?.toString() || "0");
        const name = formData.get("name")?.toString() || "Chi phí khác";
        const unit = formData.get("unit")?.toString() || "Lần";

        const data = {
            material_name: name, original_name: name, category: "VL", unit: unit, quantity: qty, unit_price: price, total_cost: qty * price, is_mapped: false
        };
        const res = await createManualEstimationItem(projectId, data);
        if (res.success) { toast.success(res.message || "Đã thêm chi phí thành công!"); setOpenManualDialog(false); await loadData(); } else { toast.error(res.error || "Lỗi khi lưu chi phí phụ!"); }
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

    // ✅ ĐÃ CHUẨN HOÁ LẠI CÔNG THỨC: TÍNH TIỀN TỪ SỐ LƯỢNG GỐC * ĐƠN GIÁ HIỆU DỤNG (Real-time)
    const T = normalItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price) || 0), 0);
    const GT = T * (gtParam.quantity / 100);
    const TL = (T + GT) * (lnParam.quantity / 100);
    const Gxd = T + GT + TL;
    const VAT = Gxd * (vatParam.quantity / 100);
    const TotalProject = Gxd + VAT;

    // 🧠 LOGIC GOM NHÓM TAB 4 (TRONG BẢNG CHA): QUY ĐỔI RA ĐƠN VỊ LỚN NHẤT ĐỂ MUA SẮM (MATH.CEIL)
    const getSummaryByCategory = useMemo(() => (category: string) => {
        const map = new Map();
        estItems.filter(i => i.category === category).forEach(item => {
            const key = item.material_name;
            if (!map.has(key)) {
                const dim = item.dimensions || {};
                map.set(key, {
                    ...item,
                    display_unit: dim.purchase_unit || item.unit,
                    conversion_rate: Number(dim.conversion_rate) || 1,
                    total_quantity: 0,
                    total_cost_sum: 0
                });
            }
            const exist = map.get(key);
            exist.total_quantity += Number(item.quantity);
            exist.total_cost_sum += Number(item.quantity) * Number(item.unit_price || 0);
        });

        return Array.from(map.values()).map((exist: any) => {
            // Lượng mua: Làm tròn lên
            exist.display_quantity = Math.ceil(exist.total_quantity / exist.conversion_rate);
            // Giá mua: Nội suy ngược từ Tổng tiền để luôn khớp
            exist.display_purchase_price = exist.display_quantity > 0 ? exist.total_cost_sum / exist.display_quantity : 0;
            return exist;
        }).sort((a: any, b: any) => (a.material_name || "").localeCompare(b.material_name || ""));
    }, [estItems]);

    const handleDownloadTemplate = () => {
        const header = ["STT", "Mã hiệu (Bắt buộc)", "Tên công việc / Vật tư (Bắt buộc)", "ĐVT", "Dài", "Rộng", "Cao", "Khối lượng", "Đơn giá", "Thành tiền", "Ghi chú"];
        const sampleData = [
            ["", "", "I. PHẦN MÓNG", "", "", "", "", "", "", "", "Hạng mục"],
            [1, "BT-LOT", "Bê tông lót móng đá 4x6", "m3", "", "", "", 10, 1200000, "", ""]
        ];
        const ws = XLSX.utils.aoa_to_sheet([header, ...sampleData]);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 10 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_Du_Toan");
        XLSX.writeFile(wb, "Mau_Nhap_Du_Toan_KieuGia.xlsx");
        toast.success("Đã tải file mẫu!");
    };

    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0, wid = parseFloat(w) || 0, hei = parseFloat(h) || 0, fac = parseFloat(f) || 0;
        if (len === 0 && wid === 0 && hei === 0) return fac;
        return (len !== 0 ? len : 1) * (wid !== 0 ? wid : 1) * (hei !== 0 ? hei : 1) * (fac !== 0 ? fac : 1);
    };

    const schedulingData = useMemo(() => {
        let totalManDays = 0; let currentStt = 1; const taskSttMap: Record<string, number> = {};
        tasks.forEach(t => { taskSttMap[t.id] = currentStt; currentStt++; });

        return tasks.map(task => {
            const parentSection = sections.find((s: any) => s.id === task.parent_id);
            const sectionName = parentSection ? parentSection.item_name : "Chung";

            const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
            const workers = Number(task.assigned_workers) || 1;
            const ncItems = estItems.filter(e => e.qto_item_id === task.id && e.category === 'NC');
            const manDays = ncItems.reduce((sum, e) => sum + Number(e.quantity), 0);
            totalManDays += manDays;
            const duration = Math.ceil((manDays > 0 ? manDays : (totalVol * (Number(task.labor_norm) || 0))) / workers) || 1;

            const taskHaoPhi = estItems.filter(e => e.qto_item_id === task.id);
            // ✅ FIX LẤY SỐ LƯỢNG * ĐƠN GIÁ THỰC TẾ
            const taskUnitPrice = taskHaoPhi.reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);
            const taskTotalCost = taskUnitPrice * totalVol;
            const weight = TotalProject > 0 ? (taskTotalCost / TotalProject) * 100 : 0;

            return { ...task, totalVol, manDays, duration, weight, taskTotalCost, stt: taskSttMap[task.id], sectionName };
        });
    }, [tasks, estItems, TotalProject, sections]);

    const { taskSchedules, projectEndDate } = useMemo(() => {
        const scheds: Record<string, { startDate: Date, endDate: Date }> = {};
        let changed = true; let iters = 0; const defaultStart = new Date(projectStartDate);
        const sttToTaskMap: Record<number, any> = {};
        schedulingData.forEach(t => { sttToTaskMap[t.stt] = t; });

        schedulingData.forEach(t => { scheds[t.id] = { startDate: defaultStart, endDate: shiftWorkingDays(defaultStart, t.duration - 1, holidays, allowWeekendWork) }; });

        while (changed && iters < 100) {
            changed = false; iters++;
            for (const t of schedulingData) {
                const predsStr = t.predecessors || ""; if (!predsStr) continue;
                const preds = predsStr.split(',').map((s: string) => s.trim());
                let maxStart = scheds[t.id].startDate;

                for (const pStr of preds) {
                    const match = pStr.match(/^(\d+)([a-zA-Z]{2})?(?:([+-])(\d+))?$/i);
                    if (!match) continue;
                    const pStt = parseInt(match[1]); const depType = (match[2]?.toUpperCase() || 'FS') as 'FS' | 'SS' | 'FF' | 'SF';
                    const sign = match[3] === '-' ? -1 : 1; const lag = parseInt(match[4] || '0') * sign;
                    const pTask = sttToTaskMap[pStt]; if (!pTask) continue;
                    const predDates = scheds[pTask.id]; const calcRes = calculateTaskDates(predDates, t.duration, depType, lag, holidays, allowWeekendWork);
                    if (calcRes.startDate > maxStart) maxStart = calcRes.startDate;
                }

                if (maxStart.getTime() !== scheds[t.id].startDate.getTime()) {
                    scheds[t.id].startDate = maxStart; scheds[t.id].endDate = shiftWorkingDays(maxStart, t.duration - 1, holidays, allowWeekendWork); changed = true;
                }
            }
        }
        let pEnd = defaultStart; Object.values(scheds).forEach(s => { if (s.endDate > pEnd) pEnd = s.endDate; });
        return { taskSchedules: scheds, projectEndDate: pEnd };
    }, [schedulingData, projectStartDate, allowWeekendWork]);

    // =====================================================================
    // ⚙️ ENGINE PHÂN BỔ DÒNG TIỀN THEO THỜI GIAN (TAB 6)
    // =====================================================================
    const cashFlowData = useMemo(() => {
        if (!taskSchedules || Object.keys(taskSchedules).length === 0 || schedulingData.length === 0) return null;

        let minDate = new Date(projectStartDate);
        let maxDate = new Date(projectEndDate);
        const periods: { label: string; start: Date; end: Date; totalCost: number }[] = [];
        let currentStart = new Date(minDate);
        let periodCount = 1;

        while (currentStart <= maxDate) {
            const currentEnd = new Date(currentStart);
            if (timePhaseUnit === 'week') {
                currentEnd.setDate(currentEnd.getDate() + 6);
            } else {
                currentEnd.setMonth(currentEnd.getMonth() + 1);
                currentEnd.setDate(currentEnd.getDate() - 1);
            }
            currentEnd.setHours(23, 59, 59, 999);

            periods.push({ label: timePhaseUnit === 'week' ? `Tuần ${periodCount}` : `Tháng ${periodCount}`, start: new Date(currentStart), end: new Date(currentEnd), totalCost: 0 });
            currentStart = new Date(currentEnd);
            currentStart.setDate(currentStart.getDate() + 1);
            currentStart.setHours(0, 0, 0, 0);
            periodCount++;
        }

        const normalItems = estItems.filter(i => !['GT', 'LN', 'VAT'].includes(i.category));
        const materialSummaries = new Map();

        normalItems.forEach(item => {
            const key = item.material_name;
            if (!materialSummaries.has(key)) {
                const dim = item.dimensions || {};
                const mMat = (masterMaterials || []).find(m =>
                    (item.material_code && m.code === item.material_code) ||
                    (m.name.trim().toLowerCase() === item.material_name.trim().toLowerCase())
                );
                const rate = Number(dim.conversion_rate) || Number(mMat?.conversion_rate) || 1;
                const pPrice = dim.purchase_price !== undefined && dim.purchase_price !== null ? Number(dim.purchase_price) : Number(item.unit_price || 0) * rate;
                materialSummaries.set(key, { display_price: pPrice, conversion_rate: rate, total_quantity: 0, effective_price: 0 });
            }
            const exist = materialSummaries.get(key);
            const rawQty = item.dimensions?.raw_quantity !== undefined ? Number(item.dimensions.raw_quantity) : Number(item.quantity);
            exist.total_quantity += rawQty;
        });

        materialSummaries.forEach((exist) => {
            if (exist.conversion_rate > 1 && exist.total_quantity > 0) {
                const display_quantity = Math.ceil(exist.total_quantity / exist.conversion_rate);
                const total_cost = display_quantity * exist.display_price;
                exist.effective_price = total_cost / exist.total_quantity;
            } else {
                exist.effective_price = exist.display_price;
            }
        });

        let scheduledTotalCost = 0;

        const taskAllocations = schedulingData.map(task => {
            const sDates = taskSchedules[task.id];
            if (!sDates) return null;
            const tStart = sDates.startDate.getTime();
            let tEnd = sDates.endDate.getTime();

            // 🚨 ĐÃ FIX LỖI: Xử lý công tác 1 ngày (Bắt đầu và Kết thúc trùng nhau)
            if (tEnd <= tStart) {
                tEnd = tStart + 86400000 - 1; // Mặc định kéo dài tEnd đến hết ngày (23:59:59)
            }
            const tDurationMs = tEnd - tStart;

            const taskEstItems = normalItems.filter(e => e.qto_item_id === task.id);
            const cost = taskEstItems.reduce((sum, item) => {
                const rawQty = item.dimensions?.raw_quantity !== undefined ? Number(item.dimensions.raw_quantity) : Number(item.quantity);
                const summary = materialSummaries.get(item.material_name);
                const effPrice = summary?.effective_price || Number(item.unit_price || 0);
                return sum + (rawQty * effPrice);
            }, 0);

            const allocatedPerPeriod: number[] = [];
            periods.forEach((period, idx) => {
                const pStart = period.start.getTime();
                const pEnd = period.end.getTime();
                const overlapStart = Math.max(tStart, pStart);
                const overlapEnd = Math.min(tEnd, pEnd);

                if (overlapStart <= overlapEnd) {
                    const overlapMs = overlapEnd - overlapStart;
                    const weight = overlapMs / tDurationMs;
                    const allocatedCost = cost * weight;
                    allocatedPerPeriod.push(allocatedCost);
                    periods[idx].totalCost += allocatedCost;
                } else {
                    allocatedPerPeriod.push(0);
                }
            });

            scheduledTotalCost += cost;
            return { ...task, taskTotalCost: cost, allocatedPerPeriod };
        }).filter(Boolean);

        const totalProjectDirectCost = normalItems.reduce((sum, item) => {
            const rawQty = item.dimensions?.raw_quantity !== undefined ? Number(item.dimensions.raw_quantity) : Number(item.quantity);
            const summary = materialSummaries.get(item.material_name);
            const effPrice = summary?.effective_price || Number(item.unit_price || 0);
            return sum + (rawQty * effPrice);
        }, 0);

        const unallocatedCost = totalProjectDirectCost - scheduledTotalCost;

        let cumulative = 0;
        const cumulativeCosts = periods.map(p => { cumulative += p.totalCost; return cumulative; });

        return { periods, taskAllocations, cumulativeCosts, totalProjectDirectCost, unallocatedCost };
    }, [taskSchedules, schedulingData, projectStartDate, projectEndDate, timePhaseUnit, estItems, masterMaterials]);

    // =====================================================================
    // ⚙️ ENGINE PHÂN BỔ NGUỒN LỰC (TAB 7)
    // =====================================================================
    const resourceAllocationData = useMemo(() => {
        if (!taskSchedules || Object.keys(taskSchedules).length === 0 || schedulingData.length === 0 || !selectedResourceName) return null;

        let minDate = new Date(projectStartDate);
        let maxDate = new Date(projectEndDate);
        const periods: { label: string; start: Date; end: Date; totalQty: number }[] = [];
        let currentStart = new Date(minDate);
        let periodCount = 1;

        while (currentStart <= maxDate) {
            const currentEnd = new Date(currentStart);
            if (timePhaseUnit === 'week') {
                currentEnd.setDate(currentEnd.getDate() + 6);
            } else {
                currentEnd.setMonth(currentEnd.getMonth() + 1);
                currentEnd.setDate(currentEnd.getDate() - 1);
            }
            currentEnd.setHours(23, 59, 59, 999);

            periods.push({ label: timePhaseUnit === 'week' ? `Tuần ${periodCount}` : `Tháng ${periodCount}`, start: new Date(currentStart), end: new Date(currentEnd), totalQty: 0 });
            currentStart = new Date(currentEnd);
            currentStart.setDate(currentStart.getDate() + 1);
            currentStart.setHours(0, 0, 0, 0);
            periodCount++;
        }

        const targetEstItems = estItems.filter(e => (e.material_name || "Chưa có tên") === selectedResourceName);
        if (targetEstItems.length === 0) return { periods, taskAllocations: [], unit: "" };
        const unit = targetEstItems[0].unit || "";

        const taskAllocations = targetEstItems.map(est => {
            const task = schedulingData.find(t => t.id === est.qto_item_id);
            if (!task) return null;
            const sDates = taskSchedules[task.id];
            if (!sDates) return null;

            const tStart = sDates.startDate.getTime();
            let tEnd = sDates.endDate.getTime();

            // 🚨 ĐÃ FIX LỖI: Xử lý công tác 1 ngày cho phân bổ Vật tư/Nhân công
            if (tEnd <= tStart) {
                tEnd = tStart + 86400000 - 1;
            }
            const tDurationMs = tEnd - tStart;

            const qty = Number(est.quantity) || 0;
            const allocatedPerPeriod: number[] = [];

            periods.forEach((period, idx) => {
                const pStart = period.start.getTime();
                const pEnd = period.end.getTime();
                const overlapStart = Math.max(tStart, pStart);
                const overlapEnd = Math.min(tEnd, pEnd);

                if (overlapStart <= overlapEnd) {
                    const overlapMs = overlapEnd - overlapStart;
                    const weight = overlapMs / tDurationMs;
                    const allocatedQty = qty * weight;
                    allocatedPerPeriod.push(allocatedQty);
                    periods[idx].totalQty += allocatedQty;
                } else {
                    allocatedPerPeriod.push(0);
                }
            });
            return { ...task, estQuantity: qty, allocatedPerPeriod };
        }).filter(Boolean);

        return { periods, taskAllocations, unit };
    }, [taskSchedules, schedulingData, projectStartDate, projectEndDate, selectedResourceName, estItems, timePhaseUnit]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm transition-colors sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={isManualAddModalOpen} onOpenChange={setIsManualAddModalOpen}>
                        <DialogContent className="sm:max-w-[500px] dark:border-slate-800 dark:bg-slate-900">
                            <DialogHeader><DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400"><FilePlus2 className="h-5 w-5" /> Bổ sung công tác thủ công</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">Hạng mục (Section)</Label>
                                    <Select value={manualSectionId} onValueChange={setManualSectionId}>
                                        <SelectTrigger className="dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"><SelectValue placeholder="Chọn hạng mục..." /></SelectTrigger>
                                        <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                            <SelectGroup><SelectItem value="NEW" className="font-bold text-teal-600 dark:text-teal-400">+ Tạo Hạng Mục Mới</SelectItem>{sections.map((sec: any) => <SelectItem key={sec.id} value={sec.id} className="dark:text-slate-200">{sec.item_name}</SelectItem>)}</SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {manualSectionId === "NEW" && (<div className="space-y-2"><Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">Tên hạng mục mới</Label><Input placeholder="Vd: Công tác thi công..." value={newSectionName} onChange={e => setNewSectionName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>)}

                                <div className="relative space-y-2 rounded-md border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
                                    <Label className="flex items-center gap-1 text-xs font-bold tracking-wider text-blue-700 uppercase dark:text-blue-400">🔍 Gọi mã định mức (Tùy chọn)</Label>
                                    <Input placeholder="Nhập mã hoặc tên công tác + Nhấn Enter..." value={manualNormQuery} onChange={(e) => setManualNormQuery(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') { e.preventDefault(); if (manualNormQuery.trim().length < 2) return toast.error("Nhập ít nhất 2 ký tự!"); setIsSearchingManualNorm(true); setIsManualNormOpen(false); const res = await getNorms(manualNormQuery, 1, 20); setManualNormResults(res.data || []); setIsManualNormOpen(true); setIsSearchingManualNorm(false); } }} onBlur={() => setTimeout(() => setIsManualNormOpen(false), 200)} className="border-blue-300 dark:border-blue-800 focus-visible:ring-blue-500 bg-white dark:bg-slate-950 dark:text-slate-200" />
                                    {isSearchingManualNorm && <Loader2 className="absolute right-5 bottom-5 h-4 w-4 animate-spin text-blue-600" />}
                                    {isManualNormOpen && manualNormResults.length > 0 && (<div className="absolute top-full left-0 z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">{manualNormResults.map((r) => (<div key={r.id} onClick={() => { setManualNormCode(r.code); setManualItemName(r.name); setManualUnit(r.unit || "Lần"); setManualItemType('task'); setManualNormQuery(r.code); setIsManualNormOpen(false); toast.success(`Đã chọn mã: ${r.code}`); }} className="px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b dark:border-slate-800 flex flex-col gap-1"><span className="font-bold text-blue-700 dark:text-blue-400">{r.code}</span><span className="line-clamp-2 text-slate-600 dark:text-slate-400">{r.name}</span></div>))}</div>)}
                                </div>
                                <div className="mt-2 space-y-2"><Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">Tên công tác chi tiết <span className="text-red-500">*</span></Label><Input placeholder="Vd: Trát tường trong nhà..." value={manualItemName} onChange={e => setManualItemName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">Đơn vị tính <span className="text-red-500">*</span></Label><Input placeholder="Vd: m2, m3..." value={manualUnit} onChange={e => setManualUnit(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">Phân loại</Label>
                                        <Select value={manualItemType} onValueChange={setManualItemType}><SelectTrigger className="dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"><SelectValue placeholder="Phân loại..." /></SelectTrigger><SelectContent className="dark:border-slate-800 dark:bg-slate-900"><SelectGroup><SelectItem value="task" className="dark:text-slate-200">Công tác (Task)</SelectItem><SelectItem value="material" className="dark:text-slate-200">Vật tư (Material)</SelectItem></SelectGroup></SelectContent></Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter><Button variant="outline" onClick={() => setIsManualAddModalOpen(false)}>Hủy</Button><Button onClick={handleSaveManualItem} disabled={isAddingManual} className="bg-teal-600 text-white hover:bg-teal-700">Lưu công tác</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-9 border-slate-300 bg-slate-900 font-bold text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                <Plus className="mr-1 h-4 w-4" /> Chi phí phụ
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="dark:border-slate-800 dark:bg-slate-900">
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
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                        <Button variant="outline" className="h-9 border-slate-300 bg-slate-900 font-bold text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import Excel
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <AutoEstimateWizard projectId={projectId} onSuccess={() => { loadData(); }} />
                </div>
            </div>

            <Tabs defaultValue="qto_sheet" className="w-full">
                <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1 rounded-md border bg-slate-100 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <TabsTrigger value="cover_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-800"><FileText className="mr-1.5 h-4 w-4" /> 1. Tổng Hợp</TabsTrigger>
                    <TabsTrigger value="qto_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-700 dark:data-[state=active]:bg-slate-800"><ListOrdered className="mr-1.5 h-4 w-4 text-blue-500" /> 2. Tiên lượng (QTO)</TabsTrigger>
                    <TabsTrigger value="summary_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-slate-800"><Percent className="mr-1.5 h-4 w-4 text-emerald-500" /> 3. Tài chính dự án</TabsTrigger>
                    <TabsTrigger value="consumption_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-slate-800"><ClipboardList className="mr-1.5 h-4 w-4 text-indigo-500" /> 4. Tổng hợp Hao phí</TabsTrigger>
                    <TabsTrigger value="schedule_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-teal-700 dark:data-[state=active]:bg-slate-800"><CalendarClock className="mr-1.5 h-4 w-4 text-teal-500" /> 5. Lập Tiến độ</TabsTrigger>
                    <TabsTrigger value="cost_allocation_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-rose-700 dark:data-[state=active]:bg-slate-800">
                        <LineChart className="mr-1.5 h-4 w-4 text-rose-500" /> 6. Kế hoạch dòng tiền
                    </TabsTrigger>
                    <TabsTrigger value="resource_plan_sheet" className="px-3 py-2 text-xs font-bold shadow-sm transition-all dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-amber-700 dark:data-[state=active]:bg-slate-800">
                        <Users className="mr-1.5 h-4 w-4 text-amber-500" /> 7. Kế hoạch Nguồn lực
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ai_extract" className="mt-3">
                    <Card className="border-2 border-dashed border-slate-300 p-10 text-center dark:border-slate-800">
                        <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">Không gian bóc tách AI</h3>
                        <p className="mt-2 text-slate-400">Tính năng đang được phát triển...</p>
                    </Card>
                </TabsContent>

                {/* TAB 1: TH */}
                <TabsContent value="cover_sheet" className="mt-3">
                    <Card className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden border bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="z-10 space-y-6 text-center">
                            <h2 className="text-xl font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</h2>
                            <div className="mx-auto h-1 w-24 rounded-full bg-blue-600 dark:bg-blue-500"></div>
                            <h1 className="mt-8 text-4xl font-black text-slate-900 uppercase dark:text-slate-100">HỒ SƠ DỰ TOÁN CHI PHÍ XÂY DỰNG</h1>
                            <div className="mx-auto mt-16 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                                <div className="grid grid-cols-3 gap-4 border-b pb-3 dark:border-slate-800">
                                    <span className="col-span-1 font-bold text-slate-500 dark:text-slate-400">Công trình:</span>
                                    <span className="col-span-2 font-bold text-slate-900 dark:text-slate-100">{projectInfo?.name || "---"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b pb-3 dark:border-slate-800">
                                    <span className="col-span-1 font-bold text-slate-500 dark:text-slate-400">Mã dự án:</span>
                                    <span className="col-span-2 font-bold text-slate-900 dark:text-slate-100">{projectInfo?.code || "---"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <span className="col-span-1 font-bold text-slate-500 dark:text-slate-400">Tổng cộng sau thuế:</span>
                                    <span className="col-span-2 text-xl font-black text-blue-700 dark:text-blue-400">{formatCurrency(TotalProject)}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 2: DỰ TOÁN (TIÊN LƯỢNG HÌNH HỌC) */}
                <TabsContent value="qto_sheet" className="mt-3">
                    <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                            <h4 className="ml-2 text-xs font-bold text-slate-700 uppercase dark:text-slate-300">Bảng tính toán Tiên lượng hình học</h4>
                            <div className="flex items-center gap-2">

                                {/* NÚT THÊM HẠNG MỤC THỦ CÔNG */}
                                <Button variant="outline" size="sm" onClick={handleAddSection} className="h-7 border-blue-200 bg-white text-xs font-bold text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400">
                                    <PlusCircle className="mr-1 h-3 w-3" /> Hạng mục
                                </Button>

                                {/* NÚT TẢI TEMPLATE MẪU ĐÃ ĐƯỢC BỔ SUNG */}
                                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-7 border-indigo-200 bg-white text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                                    <FileSpreadsheet className="mr-1 h-3 w-3" /> Tải Template
                                </Button>

                                {/* NÚT IMPORT EXCEL */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        disabled={isImporting}
                                        title="Nhập dữ liệu bóc tách từ Excel"
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                    />
                                    <Button variant="outline" size="sm" disabled={isImporting} className="h-7 border-emerald-200 bg-white text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30">
                                        {isImporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />} Import Excel
                                    </Button>
                                </div>

                                <div className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

                                {/* NÚT THU GỌN / MỞ RỘNG */}
                                <Button variant="outline" size="sm" onClick={handleToggleAllSections} className="h-7 bg-white text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
                                    <FoldVertical className="mr-1 h-3 w-3" /> {isAllExpanded ? "Thu gọn" : "Mở rộng"} tất cả
                                </Button>
                            </div>
                        </div>
                        <div className="custom-scrollbar relative max-h-[650px] overflow-auto pb-6">
                            <table className="w-full min-w-[1200px] bg-white text-sm dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-100 shadow-sm outline outline-1 outline-slate-200 dark:bg-slate-900 dark:outline-slate-800">
                                    <TableRow className="border-none">
                                        <TableHead className="w-[60px] text-center font-bold text-slate-700 dark:text-slate-300">STT</TableHead>
                                        <TableHead className="min-w-[500px] font-bold text-slate-700 dark:text-slate-300">Danh mục công tác bóc tách</TableHead>
                                        <TableHead className="w-[70px] text-center font-bold text-slate-700 dark:text-slate-300">ĐVT</TableHead>
                                        <TableHead className="w-[100px] text-right font-bold text-slate-700 dark:text-slate-300">Khối lượng</TableHead>
                                        <TableHead className="w-[200px] text-center font-bold text-slate-700 dark:text-slate-300">Mã Định Mức</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sections.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="py-8 text-center font-medium text-slate-500">Chưa có dữ liệu bóc tách. Sử dụng Bóc tách AI hoặc Thêm thủ công để bắt đầu.</TableCell></TableRow>
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

                {/* TAB 3: TH KINH PHÍ */}
                <TabsContent value="summary_sheet" className="mt-3">
                    <ProjectEstimationTab projectId={projectId} onUpdate={loadData} />
                </TabsContent>

                {/* TAB 4: TỔNG HỢP HAO PHÍ (ĐÃ ÁP DỤNG QUY ĐỔI LÀM TRÒN MATH.CEIL VÀ BIỂU ĐỒ) */}
                <TabsContent value="consumption_sheet" className="mt-3">
                    {(() => {
                        // ==========================================
                        // 1. CÁC HÀM XUẤT FILE (EXCEL & PDF CHUẨN FORM CHÀO GIÁ)
                        // ==========================================
                        const handleExportQuotationExcel = () => {
                            const aoaData: any[][] = [];
                            aoaData.push(["CÔNG TY TNHH XD KIỀU GIA", "", "", "", "", "Ngày ..... tháng ..... năm 202..."]);
                            aoaData.push([""]);
                            aoaData.push(["", "", "THƯ YÊU CẦU CHÀO GIÁ", "", "", ""]);

                            const subTitle = pdfExportType === 'ALL' ? "Toàn bộ" : pdfExportType === 'VL' ? "Vật liệu" : pdfExportType === 'NC' ? "Nhân công" : "Máy thi công";
                            aoaData.push(["", "", `(Hạng mục: ${subTitle})`, "", "", ""]);
                            aoaData.push([""]);

                            aoaData.push(["STT", "Tên vật tư / Nguồn lực", "ĐVT", "Khối lượng yêu cầu", "Đơn giá báo", "Thành tiền", "Ghi chú"]);

                            ['VL', 'NC', 'M'].filter(cat => pdfExportType === 'ALL' || pdfExportType === cat).forEach(cat => {
                                const list = getSummaryByCategory(cat);
                                if (list.length === 0) return;

                                const catName = cat === 'VL' ? 'I. VẬT LIỆU' : cat === 'NC' ? 'II. NHÂN CÔNG' : 'III. MÁY THI CÔNG';
                                aoaData.push([catName, "", "", "", "", "", ""]);

                                list.forEach((item: any, idx: number) => {
                                    aoaData.push([
                                        idx + 1,
                                        item.material_name,
                                        item.display_unit,
                                        Number(item.display_quantity || 0),
                                        "", "", ""
                                    ]);
                                });
                            });

                            aoaData.push([""]);
                            aoaData.push(["", "ĐẠI DIỆN BÊN YÊU CẦU", "", "", "ĐẠI DIỆN NHÀ CUNG CẤP", ""]);
                            aoaData.push(["", "(Ký, ghi rõ họ tên)", "", "", "(Ký, đóng dấu)", ""]);

                            const ws = XLSX.utils.aoa_to_sheet(aoaData);
                            ws['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Thu_Chao_Gia");
                            XLSX.writeFile(wb, `Thu_Chao_Gia_${projectId}.xlsx`);
                            toast.success("Đã xuất file Excel mẫu Chào giá!");
                        };

                        const handleExportPDF = async () => {
                            setIsPdfModalOpen(false);
                            const toastId = toast.loading("Đang tạo Thư Chào Giá PDF siêu nét...");
                            try {
                                await new Promise(resolve => setTimeout(resolve, 300));
                                const element = document.getElementById('pdf-quotation-template');
                                if (!element) throw new Error("Không tìm thấy template PDF");

                                const canvas = await html2canvas(element, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                                const imgData = canvas.toDataURL('image/jpeg', 1.0);

                                // Đã fix lỗi cảnh báo 'portrait' is deprecated -> dùng 'p'
                                const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                                const pageHeight = pdf.internal.pageSize.getHeight();

                                let heightLeft = pdfHeight;
                                let position = 0;

                                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                                heightLeft -= pageHeight;
                                while (heightLeft > 0) {
                                    position = heightLeft - pdfHeight;
                                    pdf.addPage();
                                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                                    heightLeft -= pageHeight;
                                }

                                pdf.save(`Thu_Chao_Gia_${projectId}.pdf`);
                                toast.success("Xuất PDF thành công!", { id: toastId });
                            } catch (error: any) {
                                toast.error("Lỗi xuất PDF: " + error.message, { id: toastId });
                            }
                        };

                        // ==========================================
                        // 2. TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ & BẢNG
                        // ==========================================
                        const summaryVL = getSummaryByCategory('VL');
                        const summaryNC = getSummaryByCategory('NC');
                        const summaryM = getSummaryByCategory('M');

                        const totalVL = summaryVL.reduce((sum: number, item: any) => sum + (Number(item.total_cost_sum) || 0), 0);
                        const totalNC = summaryNC.reduce((sum: number, item: any) => sum + (Number(item.total_cost_sum) || 0), 0);
                        const totalM = summaryM.reduce((sum: number, item: any) => sum + (Number(item.total_cost_sum) || 0), 0);
                        const rawTotalCost = totalVL + totalNC + totalM;

                        let costDistributionData = rawTotalCost === 0
                            ? [{ name: 'Chưa có dữ liệu', value: 1, color: '#334155' }]
                            : [
                                { name: 'Vật liệu (VL)', value: totalVL, color: '#f97316' },
                                { name: 'Nhân công (NC)', value: totalNC, color: '#22c55e' },
                                { name: 'Máy thi công (M)', value: totalM, color: '#a855f7' },
                            ].filter(item => item.value > 0);

                        let rawTotalCostVL = 0;
                        let actualPurchaseCostVL = 0;
                        summaryVL.forEach((item: any) => {
                            const rawQty = Number(item.total_quantity) || 0;
                            const roundedQty = Number(item.display_quantity) || 0;
                            const rate = Number(item.conversion_rate) || 1;
                            let purchasePrice = Number(item.display_price) || (Number(item.unit_price || 0) * rate);

                            rawTotalCostVL += (rawQty * (rate > 0 ? purchasePrice / rate : purchasePrice));
                            actualPurchaseCostVL += (roundedQty * purchasePrice);
                        });

                        rawTotalCostVL = Math.round(rawTotalCostVL);
                        actualPurchaseCostVL = Math.round(actualPurchaseCostVL);
                        const finalWasteVL = Math.max(0, actualPurchaseCostVL - rawTotalCostVL);

                        const wasteData = (rawTotalCostVL === 0 && finalWasteVL === 0)
                            ? [{ name: 'Chưa có dữ liệu', value: 1, color: '#334155' }]
                            : [
                                { name: 'Chi phí gốc (VL)', value: rawTotalCostVL, color: '#3b82f6' },
                                { name: 'Hao hụt mua chẵn', value: finalWasteVL, color: '#ef4444' },
                            ];

                        let topMaterials = summaryVL.filter((item: any) => (Number(item.total_cost_sum) || 0) > 0)
                            .sort((a: any, b: any) => (Number(b.total_cost_sum) || 0) - (Number(a.total_cost_sum) || 0))
                            .slice(0, 5).map((item: any) => ({ name: (item.material_name || "Chưa có tên").substring(0, 20), value: Number(item.total_cost_sum) || 0 }));

                        if (topMaterials.length === 0) topMaterials = [{ name: 'Chưa có dữ liệu', value: 0 }];

                        const formatTooltipCurrency = (value: number, name: string) => (name === 'Chưa có dữ liệu') ? ['0 ₫', name] : [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), name];

                        // ==========================================
                        // 3. RENDER GIAO DIỆN
                        // ==========================================
                        return (
                            <>
                                <Card className="mb-4 flex flex-col items-center justify-between gap-3 overflow-hidden border bg-white p-3 shadow-sm sm:flex-row dark:border-slate-800 dark:bg-slate-950">
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold tracking-wide text-indigo-700 uppercase dark:text-indigo-400">
                                            <ClipboardList className="h-5 w-5" /> Bảng Tổng hợp Hao phí (Yêu cầu chào giá)
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Xuất file PDF/Excel sẽ tự động tạo thư mời thầu trắng giá để gửi Nhà cung cấp.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" className="h-8 border-green-500 text-xs font-bold text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30" onClick={handleExportQuotationExcel}>
                                            <Download className="mr-1 h-3.5 w-3.5" /> Xuất Excel
                                        </Button>
                                        <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="h-8 border-rose-500 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30">
                                                    <Printer className="mr-1 h-3.5 w-3.5" /> Xuất PDF
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[400px] dark:border-slate-800 dark:bg-slate-900">
                                                <DialogHeader><DialogTitle>Tuỳ chọn Xuất PDF Chào Giá</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Chọn loại hao phí cần gửi NCC:</Label>
                                                        <Select value={pdfExportType} onValueChange={setPdfExportType}>
                                                            <SelectTrigger className="dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="dark:bg-slate-900">
                                                                <SelectItem value="ALL">Gửi tất cả (Vật liệu, Nhân công, Máy)</SelectItem>
                                                                <SelectItem value="VL">Chỉ gửi Vật liệu</SelectItem>
                                                                <SelectItem value="NC">Chỉ gửi Nhân công</SelectItem>
                                                                <SelectItem value="M">Chỉ gửi Máy thi công</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <DialogFooter><Button variant="outline" onClick={() => setIsPdfModalOpen(false)}>Huỷ</Button><Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleExportPDF}>Tạo File PDF</Button></DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </Card>

                                {/* KHU VỰC BIỂU ĐỒ (HIỂN THỊ WEB) */}
                                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <Card className="border p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                        <h5 className="mb-2 text-center text-xs font-bold text-slate-500 uppercase">Cơ cấu Chi phí</h5>
                                        <div className="h-[200px] w-full"><ResponsiveContainer><RechartsPie><Pie data={costDistributionData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">{costDistributionData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={formatTooltipCurrency} /><Legend wrapperStyle={{ fontSize: '10px' }} /></RechartsPie></ResponsiveContainer></div>
                                    </Card>
                                    <Card className="border p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                        <h5 className="mb-2 text-center text-xs font-bold text-slate-500 uppercase">Hao hụt mua chẵn (Vật liệu)</h5>
                                        <div className="h-[200px] w-full"><ResponsiveContainer><RechartsPie><Pie data={wasteData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">{wasteData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={formatTooltipCurrency} /><Legend wrapperStyle={{ fontSize: '10px' }} /></RechartsPie></ResponsiveContainer></div>
                                    </Card>
                                    <Card className="border p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                        <h5 className="mb-2 text-center text-xs font-bold text-slate-500 uppercase">Top 5 Vật tư giá trị cao</h5>
                                        <div className="h-[200px] w-full"><ResponsiveContainer><BarChart data={topMaterials} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '9px', fill: '#64748b' }} width={80} /><Tooltip formatter={formatTooltipCurrency} cursor={{ fill: 'transparent' }} /><Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} /></BarChart></ResponsiveContainer></div>
                                    </Card>
                                </div>

                                {/* KHU VỰC BẢNG VIEW (HIỂN THỊ WEB) */}
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                    {['VL', 'NC', 'M'].map((cat) => {
                                        const catTitle = cat === 'VL' ? 'Vật Liệu' : cat === 'NC' ? 'Nhân Công' : 'Máy Thi Công';
                                        const listSummary = getSummaryByCategory(cat);
                                        return (
                                            <Card key={cat} className="overflow-hidden border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                                <div className="flex items-center gap-1.5 border-b bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                                                    {cat === 'VL' ? <Layers className="h-4 w-4 text-orange-500" /> : cat === 'NC' ? <HardHat className="h-4 w-4 text-green-500" /> : <Tractor className="h-4 w-4 text-purple-500" />}
                                                    <h4 className="text-xs font-bold text-slate-700 uppercase dark:text-slate-300">Tổng hao phí {catTitle}</h4>
                                                </div>
                                                <div className="custom-scrollbar max-h-[500px] overflow-y-auto">
                                                    <Table>
                                                        <TableHeader className="sticky top-0 z-10 border-b bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                                            <TableRow>
                                                                <TableHead className="font-bold text-[11px]">Tên nguồn lực / Vật tư</TableHead>
                                                                <TableHead className="w-[80px] text-center font-bold text-[11px]">ĐVT</TableHead>
                                                                <TableHead className="w-[100px] text-right font-bold text-indigo-600 text-[11px] dark:text-indigo-400">Khối lượng Mua</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {listSummary.length === 0 ? (
                                                                <TableRow><TableCell colSpan={3} className="py-6 text-center text-xs text-slate-400 italic">Chưa phát hiện hao phí thuộc nhóm này.</TableCell></TableRow>
                                                            ) : listSummary.map((mat: any, idx: number) => (
                                                                <TableRow key={idx} className="border-b hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
                                                                    <TableCell className="p-2 text-xs font-medium text-slate-800 dark:text-slate-200">{mat.material_name}</TableCell>
                                                                    <TableCell className="text-center text-xs font-bold text-orange-600 dark:text-orange-400">{mat.display_unit}</TableCell>
                                                                    <TableCell className="pr-4 text-right text-xs font-bold text-indigo-700 dark:text-indigo-400">{(mat.display_quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* KHU VỰC ẨN: TEMPLATE MẪU A4 DÙNG ĐỂ CHỤP PDF THƯ CHÀO GIÁ */}
                                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                                    <div id="pdf-quotation-template" className="w-[800px] bg-white p-10 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
                                        <div className="mb-8 flex items-start justify-between">
                                            <div className="text-left">
                                                <h2 className="text-lg font-bold text-blue-800 uppercase">CÔNG TY TNHH XD KIỀU GIA</h2>
                                                <p className="mt-1 text-sm text-slate-600">Hồ sơ dự án: {projectId}</p>
                                            </div>
                                            <div className="text-right text-sm text-slate-600 italic">
                                                Ngày ..... tháng ..... năm 202...
                                            </div>
                                        </div>

                                        <div className="mb-8 text-center">
                                            <h1 className="mb-1 text-2xl font-bold text-slate-800 uppercase">THƯ YÊU CẦU CHÀO GIÁ</h1>
                                            <p className="text-sm text-slate-500 italic">
                                                (Hạng mục: {pdfExportType === 'ALL' ? 'Vật liệu, Nhân công, Máy thi công' : pdfExportType === 'VL' ? 'Vật tư' : pdfExportType === 'NC' ? 'Nhân công' : 'Máy thi công'})
                                            </p>
                                        </div>

                                        <table className="mb-8 w-full border-collapse border border-slate-800 text-[13px]">
                                            <thead>
                                                <tr className="bg-slate-100">
                                                    <th className="w-12 border border-slate-800 p-2 text-center">STT</th>
                                                    <th className="border border-slate-800 p-2 text-center">Tên vật tư / Nguồn lực</th>
                                                    <th className="w-20 border border-slate-800 p-2 text-center">ĐVT</th>
                                                    <th className="w-24 border border-slate-800 p-2 text-center">Số lượng</th>
                                                    <th className="w-28 border border-slate-800 p-2 text-center">Đơn giá báo</th>
                                                    <th className="w-32 border border-slate-800 p-2 text-center">Thành tiền</th>
                                                    <th className="w-20 border border-slate-800 p-2 text-center">Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {['VL', 'NC', 'M']
                                                    .filter(cat => pdfExportType === 'ALL' || pdfExportType === cat)
                                                    .map((cat) => {
                                                        const list = getSummaryByCategory(cat);
                                                        if (list.length === 0) return null;
                                                        return (
                                                            <React.Fragment key={`pdf_${cat}`}>
                                                                <tr>
                                                                    <td colSpan={7} className="border border-slate-800 bg-slate-50 p-2 font-bold text-blue-800 uppercase">
                                                                        {cat === 'VL' ? 'I. VẬT LIỆU' : cat === 'NC' ? 'II. NHÂN CÔNG' : 'III. MÁY THI CÔNG'}
                                                                    </td>
                                                                </tr>
                                                                {list.map((item: any, idx: number) => (
                                                                    <tr key={`pdf_row_${idx}`}>
                                                                        <td className="border border-slate-800 p-2 text-center">{idx + 1}</td>
                                                                        <td className="border border-slate-800 p-2 font-medium">{item.material_name}</td>
                                                                        <td className="border border-slate-800 p-2 text-center">{item.display_unit}</td>
                                                                        <td className="border border-slate-800 p-2 text-right font-bold">{(item.display_quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
                                                                        <td className="border border-slate-800 p-2 text-center text-slate-300 italic"></td>
                                                                        <td className="border border-slate-800 p-2"></td>
                                                                        <td className="border border-slate-800 p-2"></td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>

                                        <div className="mt-12 flex justify-between px-10">
                                            <div className="text-center">
                                                <p className="text-sm font-bold">ĐẠI DIỆN BÊN YÊU CẦU</p>
                                                <p className="mt-1 text-xs text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold">ĐẠI DIỆN NHÀ CUNG CẤP</p>
                                                <p className="mt-1 text-xs text-slate-500 italic">(Ký, đóng dấu)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </TabsContent>

                {/* TAB 5: LẬP TIẾN ĐỘ THI CÔNG */}
                <TabsContent value="schedule_sheet" className="mt-3">
                    <Card className="overflow-hidden border border-teal-200 bg-white shadow-md dark:border-teal-900/50 dark:bg-slate-950">
                        <div className="border-b border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900/30 dark:bg-teal-900/10">
                            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                    <h4 className="font-black tracking-wide text-teal-800 uppercase dark:text-teal-300">Bảng phân tích Tiến độ & Nguồn lực</h4>
                                </div>
                                <div className="flex items-center gap-4 rounded-lg border border-teal-100 bg-white p-2 shadow-sm dark:border-teal-900/30 dark:bg-slate-900">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">Ngày khởi công:</Label>
                                        <Input type="date" value={projectStartDate} onChange={(e) => { setProjectStartDate(e.target.value); updateProjectSettings('start_date', e.target.value); }} className="h-8 text-xs font-bold w-[130px]" />
                                    </div>
                                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="flex items-center gap-2">
                                        <Switch checked={allowWeekendWork} onCheckedChange={(val) => { setAllowWeekendWork(val); updateProjectSettings('allow_weekend', val); }} className="data-[state=checked]:bg-teal-600" />
                                        <Label className="cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400" onClick={() => setAllowWeekendWork(!allowWeekendWork)}>Làm Chủ Nhật</Label>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="rounded-lg border border-teal-100 bg-white p-3 dark:border-teal-900/30 dark:bg-slate-900"><p className="mb-1 text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Tổng quy mô dự án</p><p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(TotalProject)}</p></div>
                                <div className="rounded-lg border border-teal-100 bg-white p-3 dark:border-teal-900/30 dark:bg-slate-900"><p className="mb-1 text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Tổng hao phí nhân công</p><p className="text-xl font-black text-slate-800 dark:text-slate-100">{estItems.filter(e => e.category === 'NC').reduce((sum, e) => sum + e.quantity, 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} <span className="text-sm font-medium text-slate-500">Ca</span></p></div>
                                <div className="rounded-lg border border-teal-100 bg-white p-3 dark:border-teal-900/30 dark:bg-slate-900"><p className="mb-1 text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Ngày kết thúc dự kiến</p><p className="flex items-center gap-2 text-xl font-black text-indigo-700 dark:text-indigo-400">{formatDate(projectEndDate)}</p></div>
                                <div className="flex flex-col justify-center rounded-lg bg-teal-600 p-3 text-white shadow-inner dark:bg-teal-700">
                                    <div className="flex flex-col justify-center gap-2 rounded-lg bg-teal-600 p-3 text-white shadow-inner dark:bg-teal-700">
                                        <Button onClick={handleExportScheduleExcel} className="h-8 w-full bg-green-500 text-xs font-bold text-white shadow-sm hover:bg-green-600">
                                            <Download className="mr-2 h-3.5 w-3.5" /> Xuất Excel Tiến độ
                                        </Button>
                                        <Button onClick={handlePushToGantt} disabled={isSyncing5D} className="h-8 w-full bg-white text-xs font-bold text-teal-700 shadow-sm hover:bg-teal-50">
                                            {isSyncing5D ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />} Chốt Thông Số (Gantt)
                                        </Button>
                                </div>
                            </div>
                            </div>
                        </div>
                        <div className="custom-scrollbar relative max-h-[650px] overflow-auto">
                            <table className="w-full min-w-[1000px] table-fixed bg-white text-sm dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-50 shadow-sm outline outline-1 outline-slate-200 dark:bg-slate-900 dark:outline-slate-800">
                                    <TableRow className="border-none bg-slate-50 dark:bg-slate-900">
                                        <TableHead className="w-[50px] text-center font-bold">STT</TableHead>
                                        <TableHead className="min-w-[400px] font-bold">Danh mục Công việc</TableHead>
                                        <TableHead className="w-[90px] text-right font-bold">Tỷ trọng (%)</TableHead>
                                        <TableHead className="w-[100px] text-right font-bold">Khối lượng</TableHead>
                                        <TableHead className="w-[100px] text-center font-bold text-rose-600 dark:text-rose-400">Hao phí (Ca)</TableHead>
                                        <TableHead className="w-[90px] text-center font-bold text-blue-600 dark:text-blue-400">Thợ bố trí</TableHead>
                                        <TableHead className="w-[90px] text-center font-bold text-emerald-600 dark:text-emerald-400">Ngày làm</TableHead>
                                        <TableHead className="w-[180px] text-center font-bold text-indigo-600 dark:text-indigo-400">Công việc trước</TableHead>
                                        <TableHead className="w-[120px] bg-teal-50 text-center font-bold dark:bg-teal-900/20">Ngày Bắt Đầu</TableHead>
                                        <TableHead className="w-[120px] bg-teal-50 text-center font-bold dark:bg-teal-900/20">Ngày Kết Thúc</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        if (!taskSchedules || Object.keys(taskSchedules).length === 0) return null;
                                        const totalDirectCost = estItems.filter(e => !['GT', 'LN', 'VAT'].includes(e.category)).reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);
                                        const sortedTasks = [...schedulingData].sort((a, b) => {
                                            const sDatesA = taskSchedules[a.id]; const sDatesB = taskSchedules[b.id];
                                            if (!sDatesA && !sDatesB) return 0; if (!sDatesA) return 1; if (!sDatesB) return -1;
                                            const timeA = new Date(sDatesA.startDate).getTime(); const timeB = new Date(sDatesB.startDate).getTime();
                                            if (timeA !== timeB) return timeA - timeB; return a.stt - b.stt;
                                        });

                                        return sortedTasks.map((task: any) => {
                                            const sDates = taskSchedules[task.id]; if (!sDates) return null;
                                            const taskCost = estItems.filter(e => e.qto_item_id === task.id).reduce((sum, e) => sum + (Number(e.quantity) * Number(e.unit_price) || 0), 0);
                                            const weight = totalDirectCost > 0 ? (taskCost / totalDirectCost) * 100 : 0;

                                            return (
                                                <TableRow key={`sched_${task.id}`} className="border-b hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50">
                                                    <TableCell className="pt-2 text-center align-top font-bold text-slate-500">{task.stt}</TableCell>
                                                    <TableCell className="py-2 font-medium break-words whitespace-normal text-slate-800 dark:text-slate-200">
                                                        <div className="mb-1 inline-block rounded border border-teal-100 bg-teal-50 px-1.5 py-0.5 font-bold text-[10px] text-teal-700 uppercase dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-400">📍 {task.sectionName}</div>
                                                        <div className="leading-snug">{task.item_name}</div>
                                                    </TableCell>
                                                    <TableCell className="pt-2 text-right align-top font-bold text-blue-600 dark:text-blue-400">{weight.toFixed(2)}%</TableCell>
                                                    <TableCell className="pt-2 text-right align-top font-semibold">{task.totalVol.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">{task.unit}</span></TableCell>
                                                    <TableCell className="bg-rose-50/20 pt-2 text-center align-top font-bold text-rose-600 dark:text-rose-400">{task.manDays.toLocaleString('en-US', { maximumFractionDigits: 1 })}</TableCell>
                                                    {(() => {
                                                        const currentWorkers = Number(task.assigned_workers) || 1;
                                                        const computedDuration = task.manDays > 0 ? Math.ceil(task.manDays / currentWorkers) : 1;
                                                        return (
                                                            <>
                                                                <TableCell className="p-1 pt-2 align-top">
                                                                    <Input type="number" min="1" defaultValue={currentWorkers} onBlur={async (e) => {
                                                                        const newWorkers = Number(e.target.value) || 1;
                                                                        const newDuration = task.manDays > 0 ? Math.ceil(task.manDays / newWorkers) : 1;
                                                                        setQtoTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigned_workers: newWorkers, duration: newDuration } : t));
                                                                        await supabase.from('qto_items').update({ assigned_workers: newWorkers, duration: newDuration }).eq('id', task.id);
                                                                        loadData();
                                                                    }} className="h-8 text-center text-blue-700 bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 shadow-none font-bold" />
                                                                </TableCell>
                                                                <TableCell className="bg-emerald-50/30 pt-3 text-center align-top font-black text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{computedDuration}</TableCell>
                                                            </>
                                                        );
                                                    })()}
                                                    <TableCell className="p-1 pt-2 align-top">
                                                        <PredecessorDialog task={task} schedData={schedulingData} onUpdate={(val) => { updateLocalQTO(task.id, { predecessors: val }); handleUpdateQTOField(task.id, 'predecessors', val); }} />
                                                    </TableCell>
                                                    <TableCell className="border-l bg-teal-50/50 pt-3 text-center align-top font-bold text-teal-800 dark:border-slate-800 dark:bg-teal-900/10 dark:text-teal-300">{formatDate(sDates.startDate)}</TableCell>
                                                    <TableCell className="bg-teal-50/50 pt-3 text-center align-top font-bold text-teal-800 dark:bg-teal-900/10 dark:text-teal-300">{formatDate(sDates.endDate)}</TableCell>
                                                </TableRow>
                                            );
                                        });
                                    })()}
                                </TableBody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
                {/* TAB 6: KẾ HOẠCH PHÂN BỔ CHI PHÍ (CASH FLOW / S-CURVE) */}
                <TabsContent value="cost_allocation_sheet" className="mt-3">
                    <Card className="overflow-hidden border border-rose-200 bg-white shadow-sm dark:border-rose-900/50 dark:bg-slate-950">
                        <div className="flex flex-col justify-between gap-4 border-b border-rose-100 bg-rose-50/50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-rose-900/10">
                            <div className="flex items-center gap-2">
                                <LineChart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                <div>
                                    <h3 className="font-black tracking-wide text-rose-800 uppercase dark:text-rose-300">Đường cong S-Curve & Ma trận dòng tiền</h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ngân sách dự kiến giải ngân được nội suy từ tiến độ Gantt.</p>
                                </div>
                            </div>

                            {/* THÊM CỤM NÚT BẤM CHỌN TUẦN/THÁNG VÀO ĐÂY */}
                            <div className="flex items-center rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTimePhaseUnit("week")}
                                    className={`h-7 px-3 text-xs font-bold ${timePhaseUnit === 'week' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Theo Tuần
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTimePhaseUnit("month")}
                                    className={`h-7 px-3 text-xs font-bold ${timePhaseUnit === 'month' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Theo Tháng
                                </Button>
                            </div>
                        </div>

                        {/* KHU VỰC 1: BIỂU ĐỒ S-CURVE TỔNG QUAN */}
                        {cashFlowData && cashFlowData.periods.length > 0 && (
                            <div className="border-b-4 border-slate-100 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-950">
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            data={cashFlowData.periods.map((p, i) => ({
                                                name: p.label,
                                                chiPhiTuan: p.totalCost,
                                                luyKe: cashFlowData.cumulativeCosts[i]
                                            }))}
                                            margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />

                                            {/* Trục Y trái: Dành cho cột Chi phí từng kỳ */}
                                            <YAxis
                                                yAxisId="left"
                                                tickFormatter={(val) => `${(val / 1000000).toLocaleString('en-US')} Tr`}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            {/* Trục Y phải: Dành cho đường Line Lũy kế S-Curve */}
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tickFormatter={(val) => `${(val / 1000000).toLocaleString('en-US')} Tr`}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            <Tooltip
                                                formatter={(value: number, name: string) => [formatCurrency(value), name === 'chiPhiTuan' ? 'Nhu cầu vốn trong kỳ' : 'Lũy kế giải ngân (S-Curve)']}
                                                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                                                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />

                                            <Bar yAxisId="left" dataKey="chiPhiTuan" name="Nhu cầu vốn trong kỳ" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                            <Line yAxisId="right" type="monotone" dataKey="luyKe" name="Lũy kế giải ngân (S-Curve)" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* KHU VỰC 2: MA TRẬN DỮ LIỆU CHI TIẾT */}
                        <div className="custom-scrollbar relative max-h-[500px] overflow-auto bg-slate-50/30 dark:bg-slate-900/20">
                            <table className="w-full table-fixed bg-white text-sm dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-100 shadow-sm outline outline-1 outline-slate-200 dark:bg-slate-900 dark:outline-slate-800">
                                    <TableRow className="border-none">
                                        <TableHead className="w-[50px] text-center font-bold">STT</TableHead>
                                        <TableHead className="w-[300px] font-bold">Tên công việc</TableHead>
                                        <TableHead className="w-[130px] border-r text-right font-bold text-rose-600 dark:border-slate-800 dark:text-rose-400">Tổng Ngân Sách</TableHead>
                                        {cashFlowData?.periods.map((p, idx) => (
                                            <TableHead key={idx} className="w-[120px] border-r text-right font-bold dark:border-slate-700">
                                                {p.label} <br />
                                                <span className="font-normal text-[10px] text-slate-500">
                                                    ({p.start.getDate()}/{p.start.getMonth() + 1})
                                                </span>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="border-b-2 border-rose-200 bg-rose-50 font-black dark:border-rose-900 dark:bg-rose-900/20">
                                        <TableCell colSpan={2} className="text-right text-rose-800 uppercase dark:text-rose-300">Tổng nhu cầu vốn (Theo kỳ)</TableCell>
                                        <TableCell className="border-r border-rose-200 text-right text-rose-700 dark:border-rose-900/50 dark:text-rose-400">
                                            {formatCurrency(cashFlowData?.periods.reduce((s, p) => s + p.totalCost, 0) || 0)}
                                        </TableCell>
                                        {cashFlowData?.periods.map((p, idx) => (
                                            <TableCell key={idx} className="border-r border-rose-200 text-right text-rose-700 dark:border-rose-900/50 dark:text-rose-400">
                                                {p.totalCost > 0 ? formatCurrency(p.totalCost) : '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>

                                    {/* DÒNG CẢNH BÁO: CHỈ HIỆN KHI CÓ CHI PHÍ BỊ RỚT LẠI */}
                                    {cashFlowData && cashFlowData.unallocatedCost > 100 && (
                                        <TableRow className="bg-orange-50 font-medium dark:bg-orange-900/20">
                                            <TableCell className="text-center">⚠️</TableCell>
                                            <TableCell className="text-orange-700 italic dark:text-orange-400">
                                                Chi phí chưa phân bổ (Bị bỏ quên chưa lên lịch Gantt hoặc thêm thủ công)
                                            </TableCell>
                                            <TableCell className="border-r text-right font-bold text-orange-700 dark:border-slate-800 dark:text-orange-400">
                                                {formatCurrency(cashFlowData.unallocatedCost)}
                                            </TableCell>
                                            <TableCell colSpan={cashFlowData.periods.length} className="text-center text-xs text-orange-600/50 dark:text-orange-400/50">
                                                (Vui lòng qua Tab 5 gán ngày thi công cho các công tác đang trống)
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {cashFlowData?.taskAllocations.map((task: any) => (
                                        <TableRow key={task.id} className="hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50">
                                            {/* ... Phần render công tác như cũ ... */}
                                            <TableCell className="text-center font-bold text-slate-500">{task.stt}</TableCell>
                                            <TableCell className="truncate font-medium" title={task.item_name}>{task.item_name}</TableCell>
                                            <TableCell className="border-r text-right font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                                                {formatCurrency(task.taskTotalCost)}
                                            </TableCell>
                                            {task.allocatedPerPeriod.map((cost: number, idx: number) => (
                                                <TableCell key={idx} className={`text-right border-r dark:border-slate-800 ${cost > 0 ? 'bg-rose-50/30 dark:bg-rose-500/5 font-bold text-rose-700 dark:text-rose-400' : 'text-slate-300 dark:text-slate-700'}`}>
                                                    {cost > 0 ? formatCurrency(cost) : '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 7: KẾ HOẠCH SỬ DỤNG VẬT TƯ, NHÂN CÔNG, MÁY */}
                <TabsContent value="resource_plan_sheet" className="mt-3">
                    <Card className="overflow-hidden border border-amber-200 bg-white shadow-sm dark:border-amber-900/50 dark:bg-slate-950">
                        <div className="flex flex-col justify-between gap-4 border-b border-amber-100 bg-amber-50/50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-amber-900/10">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <h3 className="font-black tracking-wide text-amber-800 uppercase dark:text-amber-300">Biểu đồ Nguồn lực (Resource Histogram)</h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Theo dõi tiến độ cung ứng của từng loại Vật tư, Nhân công, Máy thi công.</p>
                                </div>
                            </div>

                            {/* BỘ LỌC CHỌN NGUỒN LỰC & CHỌN VIEW */}
                            <div className="flex items-center gap-4">
                                <div className="flex min-w-[300px] items-center gap-2 rounded-md border border-amber-200 bg-white p-1.5 shadow-sm dark:border-amber-800/50 dark:bg-slate-900">
                                    <Label className="ml-1 text-xs font-bold whitespace-nowrap text-amber-700 dark:text-amber-400">Chọn Nguồn Lực:</Label>
                                    <Select value={selectedResourceName} onValueChange={setSelectedResourceName}>
                                        <SelectTrigger className="h-8 border-none bg-transparent font-bold text-slate-800 shadow-none dark:text-slate-200">
                                            <SelectValue placeholder="Chọn vật tư/nhân công..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] dark:border-slate-800 dark:bg-slate-900">
                                            {uniqueResources.map((res: any, idx: number) => (
                                                <SelectItem key={idx} value={res.name || "Chưa có tên"}>
                                                    {res.name || "Chưa có tên"} <span className="text-slate-400 text-[10px]">({res.unit})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* THÊM CỤM NÚT BẤM CHỌN TUẦN/THÁNG VÀO ĐÂY */}
                                <div className="flex hidden items-center rounded-md border border-slate-200 bg-white p-1 shadow-sm sm:flex dark:border-slate-700 dark:bg-slate-900">
                                    <Button
                                        variant="ghost" size="sm" onClick={() => setTimePhaseUnit("week")}
                                        className={`h-8 px-3 text-xs font-bold ${timePhaseUnit === 'week' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Theo Tuần
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm" onClick={() => setTimePhaseUnit("month")}
                                        className={`h-8 px-3 text-xs font-bold ${timePhaseUnit === 'month' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Theo Tháng
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* KHU VỰC 1: BIỂU ĐỒ HISTOGRAM */}
                        {resourceAllocationData && resourceAllocationData.periods.length > 0 && (
                            <div className="border-b-4 border-slate-100 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-950">
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={resourceAllocationData.periods.map((p) => ({
                                                name: p.label,
                                                nhuCau: p.totalQty
                                            }))}
                                            margin={{ top: 20, right: 20, bottom: 0, left: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis
                                                tickFormatter={(val) => val.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [`${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${resourceAllocationData.unit}`, 'Nhu cầu']}
                                                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                                                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="nhuCau" name={`Nhu cầu ${selectedResourceName}`} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* KHU VỰC 2: MA TRẬN DỮ LIỆU ĐIỀU PHỐI VẬT TƯ */}
                        <div className="custom-scrollbar relative max-h-[400px] overflow-auto bg-slate-50/30 dark:bg-slate-900/20">
                            <table className="w-full table-fixed bg-white text-sm dark:bg-slate-950">
                                <TableHeader className="sticky top-0 z-30 bg-slate-100 shadow-sm outline outline-1 outline-slate-200 dark:bg-slate-900 dark:outline-slate-800">
                                    <TableRow className="border-none">
                                        <TableHead className="w-[50px] text-center font-bold">STT</TableHead>
                                        <TableHead className="w-[300px] font-bold">Tên công việc</TableHead>
                                        <TableHead className="w-[120px] border-r text-right font-bold text-amber-600 dark:border-slate-800 dark:text-amber-400">
                                            Tổng KL <br /><span className="text-[10px] text-slate-500">({resourceAllocationData?.unit})</span>
                                        </TableHead>
                                        {resourceAllocationData?.periods.map((p, idx) => (
                                            <TableHead key={idx} className="w-[100px] border-r text-right font-bold dark:border-slate-700">
                                                {p.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="border-b-2 border-amber-200 bg-amber-50 font-black dark:border-amber-900 dark:bg-amber-900/20">
                                        <TableCell colSpan={2} className="text-right text-amber-800 uppercase dark:text-amber-300">Tổng nhu cầu theo Tuần</TableCell>
                                        <TableCell className="border-r border-amber-200 text-right text-amber-700 dark:border-amber-900/50 dark:text-amber-400">
                                            {resourceAllocationData?.periods.reduce((s, p) => s + p.totalQty, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                        </TableCell>
                                        {resourceAllocationData?.periods.map((p, idx) => (
                                            <TableCell key={idx} className="border-r border-amber-200 text-right text-amber-700 dark:border-amber-900/50 dark:text-amber-400">
                                                {p.totalQty > 0 ? p.totalQty.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>

                                    {resourceAllocationData?.taskAllocations.map((task: any, index: number) => (
                                        <TableRow key={`${task.id}_${index}`} className="hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50">
                                            <TableCell className="text-center font-bold text-slate-500">{task.stt}</TableCell>
                                            <TableCell className="truncate font-medium" title={task.item_name}>{task.item_name}</TableCell>
                                            <TableCell className="border-r text-right font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                                                {task.estQuantity.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                                            </TableCell>
                                            {task.allocatedPerPeriod.map((qty: number, idx: number) => (
                                                <TableCell key={idx} className={`text-right border-r dark:border-slate-800 ${qty > 0 ? 'bg-amber-50/30 dark:bg-amber-500/5 font-bold text-amber-700 dark:text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}>
                                                    {qty > 0 ? qty.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}