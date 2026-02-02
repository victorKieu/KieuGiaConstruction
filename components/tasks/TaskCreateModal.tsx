"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask, updateTask } from "@/lib/action/taskActions";
import { MemberData } from "@/types/project";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

// --- Type Definitions ---
interface DictionaryItem { id: string; name: string; color?: string; code?: string; }
interface TaskInput { id: string; name: string; description?: string | null; parent_id?: string | null; cost_estimate?: number; priority_id?: string; status_id?: string; assigned_to?: any; weight?: number; progress?: number; start_date?: string | null; due_date?: string | null; priority?: any; status?: any; assignee?: any; }

interface TaskCreateModalProps {
    projectId: string;
    members: MemberData[];
    tasks?: any[];
    dictionaries?: { statuses: DictionaryItem[]; priorities: DictionaryItem[]; };
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    task?: TaskInput;
    parentId?: string | null;
}

export default function TaskCreateModal({
    projectId, members = [], tasks = [], dictionaries,
    open, onOpenChange, task, parentId
}: TaskCreateModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ✅ Safe Access: Tránh lỗi undefined map
    const safeStatuses = Array.isArray(dictionaries?.statuses) ? dictionaries.statuses : [];
    const safePriorities = Array.isArray(dictionaries?.priorities) ? dictionaries.priorities : [];

    const [priorityId, setPriorityId] = useState("");
    const [statusId, setStatusId] = useState("");
    const [assigneeId, setAssigneeId] = useState("");

    const getAssigneeId = (val: any) => val ? (typeof val === 'string' ? val : val.id) : "";

    useEffect(() => {
        if (isOpen) {
            setPriorityId(task?.priority_id || task?.priority?.id || "");
            setStatusId(task?.status_id || task?.status?.id || "");
            setAssigneeId(getAssigneeId(task?.assigned_to) || task?.assignee?.id || "");
        }
    }, [isOpen, task]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        if (priorityId) formData.set("priority_id", priorityId);
        if (statusId) formData.set("status_id", statusId);
        if (assigneeId && assigneeId !== "unassigned") formData.set("assigned_to", assigneeId);
        if (parentId && !task) formData.set("parent_id", parentId);

        let result;
        if (task) result = await updateTask(task.id, projectId, formData);
        else result = await createTask(projectId, formData);

        setIsSubmitting(false);
        if (result.success) {
            toast.success(task ? "Đã cập nhật!" : "Đã tạo mới!");
            setIsOpen(false);
        } else {
            toast.error(result.error || "Lỗi hệ thống");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {!onOpenChange && (
                <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm gap-2"><Plus className="w-4 h-4" /> Thêm công việc</Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{task ? "Cập nhật" : "Tạo mới"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="space-y-1.5"><Label>Tên công việc <span className="text-red-500">*</span></Label><Input name="name" defaultValue={task?.name} required /></div>

                    {!task && (
                        <div className="space-y-1.5"><Label>Hạng mục cha</Label>
                            <Select name="parent_id" defaultValue={parentId || "root"}>
                                <SelectTrigger><SelectValue placeholder="-- Gốc --" /></SelectTrigger>
                                <SelectContent><SelectItem value="root">-- Công việc gốc --</SelectItem>{tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Người thực hiện</Label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger><SelectValue placeholder="Chọn người" /></SelectTrigger>
                                <SelectContent><SelectItem value="unassigned">— Chưa phân công —</SelectItem>{members.map((m) => m.employee ? <SelectItem key={m.employee.id} value={m.employee.id}>{m.employee.name}</SelectItem> : null)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5"><Label>Mức ưu tiên</Label>
                            <Select value={priorityId} onValueChange={setPriorityId}>
                                <SelectTrigger><SelectValue placeholder="Chọn mức độ" /></SelectTrigger>
                                <SelectContent>{safePriorities.map((p) => <SelectItem key={p.id} value={p.id}><span style={{ color: p.color }}>● {p.name}</span></SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Trạng thái</Label>
                            <Select value={statusId} onValueChange={setStatusId}>
                                <SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                                <SelectContent>{safeStatuses.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5"><Label className="text-blue-600 font-semibold">Chi phí dự kiến (VNĐ)</Label>
                            <Input type="number" name="cost_estimate" defaultValue={task?.cost_estimate || 0} min="0" placeholder="0" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Bắt đầu</Label><Input type="date" name="start_date" defaultValue={task?.start_date ? new Date(task.start_date).toISOString().split('T')[0] : ''} /></div>
                        <div className="space-y-1.5"><Label>Kết thúc</Label><Input type="date" name="due_date" defaultValue={task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''} /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Tiến độ (%)</Label><Input type="number" name="progress" defaultValue={task?.progress || 0} max="100" /></div>
                        <div className="space-y-1.5"><Label>Trọng số (%)</Label><Input type="number" name="weight" defaultValue={task?.weight || 0} max="100" /></div>
                    </div>

                    <div className="space-y-1.5"><Label>Mô tả</Label><Textarea name="description" defaultValue={task?.description || ""} className="h-20" /></div>

                    <div className="mt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (task ? "Lưu" : "Tạo")}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}