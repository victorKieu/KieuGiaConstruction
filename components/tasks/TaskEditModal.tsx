"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateTask, deleteTask } from "../../lib/action/taskActions";
import { TaskData, MemberData } from "@/types/project";
import { Edit, Trash2, Loader2 } from 'lucide-react';

// ✅ Thêm interface Dictionary
interface TaskEditModalProps {
    task: TaskData;
    members: MemberData[];
    // ✅ Nhận dictionaries từ props
    dictionaries?: {
        statuses: any[];
        priorities: any[];
    };
}

export default function TaskEditModal({ task, members, dictionaries }: TaskEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        // ✅ Server Action giờ đã nhận đúng UUID từ Select bên dưới
        const result = await updateTask(task.id, task.project_id, formData);

        setIsSubmitting(false);

        if (result.success) {
            setIsOpen(false);
        } else {
            setErrorMessage(result.error || "Có lỗi xảy ra.");
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Bạn có chắc chắn muốn xóa công việc "${task.name}" không?`)) return;
        setIsSubmitting(true);
        const result = await deleteTask(task.id, task.project_id);
        setIsSubmitting(false);
        if (result.success) setIsOpen(false);
        else alert(`Lỗi: ${result.error}`);
    };

    // Fallback nếu chưa load được dictionary (tránh lỗi crash)
    const statusOptions = dictionaries?.statuses || [];
    const priorityOptions = dictionaries?.priorities || [];

    // Tìm default value (Ưu tiên ID, nếu không có thì fallback)
    // Lưu ý: task.priority_id là trường UUID trong DB. task.priority có thể là object join hoặc string tùy query cũ.
    // Với query mới getProjectTasks, ta có task.priority_id (UUID) và task.priority (Object join).
    const defaultPriority = (task as any).priority_id || (task.priority as any)?.id;
    const defaultStatus = (task as any).status_id || (task.status as any)?.id;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6">
                    <Edit className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Chỉnh sửa: {task.name}</DialogTitle></DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Chi tiết Task</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            {/* Tên & Mô tả */}
                            <div className="space-y-1">
                                <Label>Tên công việc</Label>
                                <Input name="name" required defaultValue={task.name} />
                            </div>
                            <div className="space-y-1">
                                <Label>Mô tả</Label>
                                <Textarea name="description" defaultValue={task.description || ''} className="min-h-[100px]" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Phân công */}
                                <div className="space-y-1">
                                    <Label>Phân công cho</Label>
                                    <Select name="assigned_to" defaultValue={task.assigned_to?.id || "unassigned"}>
                                        <SelectTrigger><SelectValue placeholder="Chọn thành viên" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">— Chưa phân công —</SelectItem>
                                            {members.map((m) => {
                                                if (!m.employee) return null;
                                                return <SelectItem key={m.employee.id} value={m.employee.id}>{m.employee.name}</SelectItem>
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Mức ưu tiên (FIX LỖI UUID) */}
                                <div className="space-y-1">
                                    <Label>Mức ưu tiên</Label>
                                    <Select name="priority_id" defaultValue={defaultPriority}>
                                        <SelectTrigger><SelectValue placeholder="Chọn mức ưu tiên" /></SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.length > 0 ? priorityOptions.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    <span style={{ color: p.color }}>{p.name}</span>
                                                </SelectItem>
                                            )) : (
                                                <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Trạng thái (FIX LỖI UUID) */}
                                <div className="space-y-1">
                                    <Label>Trạng thái</Label>
                                    <Select name="status_id" defaultValue={defaultStatus}>
                                        <SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.length > 0 ? statusOptions.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            )) : (
                                                <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Tiến độ */}
                                <div className="space-y-1">
                                    <Label>Tiến độ (%)</Label>
                                    <Input name="progress" type="number" min="0" max="100" defaultValue={task.progress || 0} />
                                </div>
                            </div>

                            {/* Ngày tháng */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Ngày bắt đầu</Label>
                                    <Input name="start_date" type="date" defaultValue={task.start_date ? task.start_date.substring(0, 10) : ''} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Ngày hết hạn</Label>
                                    <Input name="due_date" type="date" defaultValue={task.due_date ? task.due_date.substring(0, 10) : ''} />
                                </div>
                            </div>

                            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

                            <div className="mt-4 flex justify-between items-center border-t pt-4">
                                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="flex items-center">
                                    <Trash2 className="h-4 w-4 mr-2" /> Xóa công việc
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}