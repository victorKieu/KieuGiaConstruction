"use client";

import { useState, useMemo, Fragment } from "react";
import { format } from "date-fns";
import {
    Plus, ChevronRight, ChevronDown, MoreHorizontal,
    Edit, Trash2, Calendar, ShieldAlert, AlertTriangle, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { deleteTask } from "@/lib/action/taskActions";
import TaskCreateModal from "@/components/tasks/TaskCreateModal";
import { formatCurrency } from "@/lib/utils/utils";

// ... (Giữ nguyên các Interface Task, WBSTaskTableProps) ...
interface Task {
    id: string; name: string; parent_id: string | null; start_date: string | null; due_date: string | null;
    progress: number; weight: number; wbs_code?: string; unit?: string; planned_quantity?: number;
    planned_price?: number; planned_cost?: number | null; actual_cost?: number | null; earned_value?: number | null;
    status?: any; priority?: any; assignee?: any; children?: Task[]; assigned_to?: string; status_id?: string; priority_id?: string; description?: string;
}

export default function WBSTaskTable({ projectId, initialTasks = [], members = [], dictionaries = {} }: any) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [targetParentId, setTargetParentId] = useState<string | null>(null);

    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const handleEdit = (task: Task) => { setEditingTask(task); setTargetParentId(null); setDialogOpen(true); };
    const handleAddSubTask = (parentId: string) => { setEditingTask(undefined); setTargetParentId(parentId); setDialogOpen(true); };

    const handleDelete = async (id: string) => {
        if (!confirm("Hành động này sẽ xóa cả các công việc con bên trong (nếu có). Bạn có chắc chắn?")) return;
        const res = await deleteTask(id, projectId);
        if (res.success) toast.success("Đã xóa hạng mục!"); else toast.error(res.error);
    }

    const taskTree = useMemo(() => {
        if (!initialTasks || !Array.isArray(initialTasks)) return [];
        const map = new Map<string, Task>();
        const roots: Task[] = [];

        initialTasks.forEach(t => {
            const normalize = (f: any) => Array.isArray(f) ? f[0] : f;
            map.set(t.id, { ...t, progress: Number(t.progress) || 0, status: normalize(t.status), priority: normalize(t.priority), assignee: normalize(t.assignee), children: [] });
            if (!t.parent_id) setExpanded(prev => ({ ...prev, [t.id]: true }));
        });

        initialTasks.forEach(t => {
            if (t.parent_id && map.has(t.parent_id)) map.get(t.parent_id)!.children!.push(map.get(t.id)!);
            else roots.push(map.get(t.id)!);
        });

        const sortByWBS = (a: Task, b: Task) => (a.wbs_code || "").localeCompare(b.wbs_code || "");
        roots.sort(sortByWBS);
        map.forEach(task => task.children?.sort(sortByWBS));

        return roots;
    }, [initialTasks]);

    // 🔥 THUẬT TOÁN ĐÁNH GIÁ TIẾN ĐỘ (CẢNH BÁO TRỄ HẠN) 🔥
    const evaluateProgress = (task: Task) => {
        if (task.progress >= 100) return { label: "Hoàn thành", color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200" };
        if (!task.start_date || !task.due_date) return null;

        const today = new Date().getTime();
        const start = new Date(task.start_date).getTime();
        const end = new Date(task.due_date).getTime();

        if (today > end && task.progress < 100) {
            return { label: "Trễ hạn", color: "text-red-700 bg-red-100 dark:bg-red-900/40 border-red-300 animate-pulse font-bold" };
        }
        if (today < start) return { label: "Chưa bắt đầu", color: "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200" };

        const totalDuration = end - start;
        const elapsed = today - start;
        let plannedProgress = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
        plannedProgress = Math.max(0, Math.min(100, plannedProgress));

        if (task.progress < plannedProgress) {
            return { label: `Chậm (K.Hoạch: ${plannedProgress}%)`, color: "text-orange-700 bg-orange-100 dark:bg-orange-900/40 border-orange-300" };
        }
        return { label: "Đúng/Vượt KH", color: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 border-blue-200" };
    }

    const renderRow = (task: Task, level: number = 0): React.ReactNode => {
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = expanded[task.id];
        const paddingLeft = level * 24 + 12;
        const isMasked = task.planned_cost === null;

        // Gọi hàm đánh giá
        const kpi = evaluateProgress(task);

        return (
            <Fragment key={task.id}>
                <TableRow className={`hover:bg-muted/50 group border-b border-border ${level === 0 ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''}`}>
                    <TableCell className="py-2 text-xs font-mono font-bold text-slate-500 w-[80px]">{task.wbs_code || "-"}</TableCell>
                    <TableCell className="py-2">
                        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
                            {hasChildren ? (
                                <button onClick={() => toggleExpand(task.id)} className="mr-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 transition-colors">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                            ) : <div className="w-6 mr-1" />}
                            <span className={`truncate max-w-[250px] ${level === 0 ? 'font-bold text-blue-700 dark:text-blue-400' : 'font-medium text-foreground'}`} title={task.name}>{task.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-xs"><span className="font-semibold text-slate-700 dark:text-slate-300">{task.planned_quantity || "-"}</span> <span className="text-slate-400 ml-1">{task.unit || ""}</span></TableCell>
                    <TableCell className="text-right w-[140px]">
                        {isMasked ? (<div className="flex items-center justify-end text-slate-400" title="Bảo mật"><ShieldAlert className="w-3 h-3 mr-1" /> ***</div>) : (<span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{task.planned_cost ? formatCurrency(task.planned_cost) : "-"}</span>)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground w-[120px]">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-400" /> {task.start_date ? format(new Date(task.start_date), "dd/MM") : "--"} <span className="text-slate-300">→</span> {task.due_date ? format(new Date(task.due_date), "dd/MM") : "--"}</div>
                    </TableCell>

                    {/* ✅ CỘT TIẾN ĐỘ ĐÃ GẮN CẢNH BÁO */}
                    <TableCell className="w-[160px]">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-600 dark:text-slate-300">{task.progress}%</span>
                                {kpi && (
                                    <span className={`px-1.5 py-0.5 rounded border text-[9px] ${kpi.color}`}>
                                        {kpi.label}
                                    </span>
                                )}
                            </div>
                            <Progress value={task.progress || 0} className={`h-1.5 w-full bg-slate-200 dark:bg-slate-800 ${(kpi?.label.includes("Chậm") || kpi?.label === "Trễ hạn") ? "opacity-80" : ""}`} />
                        </div>
                    </TableCell>

                    <TableCell className="w-[100px] text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => handleAddSubTask(task.id)}><Plus className="w-4 h-4 mr-2 text-emerald-600" /> Thêm việc con</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(task)}><Edit className="w-4 h-4 mr-2 text-blue-600" /> Chỉnh sửa</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(task.id)}><Trash2 className="w-4 h-4 mr-2" /> Xóa hạng mục</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                {hasChildren && isExpanded && task.children!.map(child => renderRow(child, level + 1))}
            </Fragment>
        );
    };

    return (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                        <TableHead className="w-[80px] font-bold text-slate-600">Mã WBS</TableHead>
                        <TableHead className="font-bold text-slate-600">Hạng mục / Công việc</TableHead>
                        <TableHead className="text-right font-bold text-slate-600">KL KH</TableHead>
                        <TableHead className="text-right font-bold text-slate-600">Ngân sách (PV)</TableHead>
                        <TableHead className="font-bold text-slate-600">Thời gian</TableHead>
                        <TableHead className="font-bold text-slate-600">Tiến độ & Cảnh báo</TableHead>
                        <TableHead className="text-right font-bold text-slate-600">Tác vụ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {taskTree.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-500">Chưa có kế hoạch thi công nào.</TableCell></TableRow>
                    ) : taskTree.map(task => renderRow(task))}
                </TableBody>
            </Table>
            <TaskCreateModal projectId={projectId} members={members} dictionaries={dictionaries} open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} parentId={targetParentId} tasks={initialTasks || []} />
        </div>
    );
}