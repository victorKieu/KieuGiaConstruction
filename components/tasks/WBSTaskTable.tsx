"use client";

import { useState, useMemo, Fragment } from "react";
import { format } from "date-fns";
import {
    Plus, ChevronRight, ChevronDown, MoreHorizontal,
    Edit, Trash2, Calendar
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

interface Task {
    id: string;
    name: string;
    parent_id: string | null;
    start_date: string | null;
    due_date: string | null;
    progress: number;
    weight: number;
    cost_estimate: number;
    status?: { name: string; color: string; code: string } | any;
    priority?: { name: string; color: string; code: string } | any;
    assignee?: { id: string; name: string; avatar_url: string } | any;
    children?: Task[];
    assigned_to?: string;
    status_id?: string;
    priority_id?: string;
    description?: string;
}

interface WBSTaskTableProps {
    projectId: string;
    initialTasks?: any[];
    members: any[];
    dictionaries: any;
}

export default function WBSTaskTable({
    projectId,
    initialTasks = [],
    members = [],
    dictionaries = {}
}: WBSTaskTableProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [targetParentId, setTargetParentId] = useState<string | null>(null);

    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setTargetParentId(null);
        setDialogOpen(true);
    };

    const handleAddSubTask = (parentId: string) => {
        setEditingTask(undefined);
        setTargetParentId(parentId);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa?")) return;
        const res = await deleteTask(id, projectId);
        if (res.success) toast.success("Đã xóa!"); else toast.error(res.error);
    }

    const taskTree = useMemo(() => {
        if (!initialTasks || !Array.isArray(initialTasks)) return [];

        const map = new Map<string, Task>();
        const roots: Task[] = [];

        initialTasks.forEach(t => {
            const normalize = (f: any) => Array.isArray(f) ? f[0] : f;

            map.set(t.id, {
                ...t,
                cost_estimate: Number(t.cost_estimate) || 0,
                progress: Number(t.progress) || 0,
                status: normalize(t.status),
                priority: normalize(t.priority),
                assignee: normalize(t.assignee),
                children: []
            });

            if (!t.parent_id) setExpanded(prev => ({ ...prev, [t.id]: true }));
        });

        initialTasks.forEach(t => {
            if (t.parent_id && map.has(t.parent_id)) {
                map.get(t.parent_id)!.children!.push(map.get(t.id)!);
            } else {
                roots.push(map.get(t.id)!);
            }
        });
        return roots;
    }, [initialTasks]);

    const renderRow = (task: Task, level: number = 0): React.ReactNode => {
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = expanded[task.id];
        const paddingLeft = level * 24 + 12;

        return (
            <Fragment key={task.id}>
                {/* ✅ FIX: Hover color, Border color */}
                <TableRow className="hover:bg-muted/50 group border-b border-border">
                    <TableCell className="py-3">
                        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
                            {hasChildren ? (
                                // ✅ FIX: Button expand hover colors
                                <button onClick={() => toggleExpand(task.id)} className="mr-1 p-1 hover:bg-muted rounded text-muted-foreground">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                            ) : <div className="w-6 mr-1" />}
                            {/* ✅ FIX: Text color */}
                            <span className="font-medium truncate max-w-[300px] text-foreground" title={task.name}>{task.name}</span>
                        </div>
                    </TableCell>

                    {/* ✅ FIX: Text muted */}
                    <TableCell className="text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.start_date ? format(new Date(task.start_date), "dd/MM") : "--"}</span>
                        </div>
                    </TableCell>

                    <TableCell className="w-[180px]">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px]">
                                {/* ✅ FIX: Text muted */}
                                <span className="font-semibold text-muted-foreground">{task.progress}%</span>
                                {task.status?.name ? (
                                    <Badge variant="outline" className="h-5 px-1.5 border-0" style={{ backgroundColor: `${task.status.color}20`, color: task.status.color }}>
                                        {task.status.name}
                                    </Badge>
                                ) : <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Mới</Badge>}
                            </div>
                            {/* ✅ FIX: Progress bar background */}
                            <Progress value={task.progress || 0} className="h-1.5 w-full bg-secondary" />
                        </div>
                    </TableCell>

                    <TableCell className="text-right w-[120px]">
                        {/* ✅ FIX: Text foreground */}
                        <span className="text-sm font-mono font-medium text-foreground">
                            {task.cost_estimate > 0 ? formatCurrency(task.cost_estimate) : "-"}
                        </span>
                    </TableCell>

                    <TableCell>
                        {task.assignee ? (
                            <div className="flex items-center gap-2">
                                {task.assignee.avatar_url ? (
                                    <img src={task.assignee.avatar_url} className="w-6 h-6 rounded-full object-cover border border-border" alt="Avatar" />
                                ) : (
                                    // ✅ FIX: Avatar fallback colors
                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800 uppercase">
                                        {task.assignee.name ? task.assignee.name.charAt(0) : "?"}
                                    </div>
                                )}
                                {/* ✅ FIX: Text foreground */}
                                <span className="text-xs truncate max-w-[100px] text-foreground">{task.assignee.name}</span>
                            </div>
                        ) : <span className="text-xs text-muted-foreground italic">--</span>}
                    </TableCell>

                    <TableCell className="text-right">
                        <DropdownMenu>
                            {/* ✅ FIX: Icon color */}
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAddSubTask(task.id)}><Plus className="w-4 h-4 mr-2" /> Thêm việc con</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(task)}><Edit className="w-4 h-4 mr-2" /> Sửa</DropdownMenuItem>
                                {/* ✅ FIX: Danger text color */}
                                <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => handleDelete(task.id)}><Trash2 className="w-4 h-4 mr-2" /> Xóa</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                {hasChildren && isExpanded && task.children!.map(child => renderRow(child, level + 1))}
            </Fragment>
        );
    };

    return (
        // ✅ FIX: bg-card, border-border
        <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
            <Table>
                {/* ✅ FIX: Header background */}
                <TableHeader className="bg-muted/50">
                    <TableRow className="border-border">
                        <TableHead className="w-[300px]">Hạng mục / Công việc</TableHead>
                        <TableHead className="w-[100px]">Thời gian</TableHead>
                        <TableHead className="w-[180px]">Tiến độ</TableHead>
                        <TableHead className="text-right">Chi phí</TableHead>
                        <TableHead>Phụ trách</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {taskTree.length === 0 ? (
                        // ✅ FIX: Text muted
                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Chưa có dữ liệu.</TableCell></TableRow>
                    ) : taskTree.map(task => renderRow(task))}
                </TableBody>
            </Table>

            <TaskCreateModal
                projectId={projectId}
                members={members}
                dictionaries={dictionaries}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                task={editingTask}
                parentId={targetParentId}
                tasks={initialTasks || []}
            />
        </div>
    );
}