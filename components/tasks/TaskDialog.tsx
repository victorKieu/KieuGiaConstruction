"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask, updateTask } from "@/lib/action/taskActions";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface TaskDialogProps {
    projectId: string;
    task?: any; // Nếu có task thì là chế độ Edit
    members: any[]; // Danh sách thành viên để assign
    dictionaries: { statuses: any[], priorities: any[] };
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    parentId?: string | null;
}

export function TaskDialog({ projectId, task, members, dictionaries, open, onOpenChange, parentId }: TaskDialogProps) {
    const [isOpen, setIsOpen] = useState(open || false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho các trường Select (để bind vào hidden input)
    const [assignee, setAssignee] = useState(task?.assigned_to || "unassigned");
    const [status, setStatus] = useState(task?.status_id || task?.status?.id || "");
    const [priority, setPriority] = useState(task?.priority_id || task?.priority?.id || "");

    useEffect(() => {
        if (open !== undefined) setIsOpen(open);
    }, [open]);

    const handleOpenChange = (val: boolean) => {
        setIsOpen(val);
        onOpenChange?.(val);
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        // ✅ THÊM DỮ LIỆU TỪ STATE VÀO FORMDATA (Nếu select không tự submit)
        // Lưu ý: Các thẻ <input type="hidden"> bên dưới đã lo việc này, 
        // nhưng ta có thể set lại cho chắc chắn.
        if (assignee && assignee !== "unassigned") formData.set("assigned_to", assignee);
        if (status) formData.set("status_id", status);
        if (priority) formData.set("priority_id", priority);
        if (parentId) formData.set("parent_id", parentId);

        let res;
        if (task) {
            res = await updateTask(task.id, projectId, formData);
        } else {
            res = await createTask(projectId, formData);
        }

        setIsSubmitting(false);
        if (res.success) {
            toast.success(res.message);
            handleOpenChange(false);
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {!task && !onOpenChange && (
                <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Thêm công việc
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{task ? "Cập nhật công việc" : "Thêm công việc mới"}</DialogTitle>
                </DialogHeader>

                <form action={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Tên công việc <span className="text-red-500">*</span></Label>
                        <Input name="name" defaultValue={task?.name} required placeholder="Nhập tên đầu việc..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Người thực hiện</Label>
                            {/* ✅ INPUT ẨN ĐỂ GỬI DATA CHO SERVER ACTION */}
                            <input type="hidden" name="assigned_to" value={assignee} />

                            <Select value={assignee} onValueChange={setAssignee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn người làm" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">-- Chưa phân công --</SelectItem>
                                    {members.map((m: any) => (
                                        <SelectItem key={m.employee.id} value={m.employee.id}>
                                            <div className="flex items-center gap-2">
                                                {/* Avatar nhỏ nếu có */}
                                                <span>{m.employee.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Trạng thái</Label>
                            <input type="hidden" name="status_id" value={status} />
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dictionaries.statuses.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Ngày bắt đầu</Label>
                            <Input type="date" name="start_date" defaultValue={task?.start_date?.split('T')[0]} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Ngày kết thúc</Label>
                            <Input type="date" name="due_date" defaultValue={task?.due_date?.split('T')[0]} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label>Ưu tiên</Label>
                            <input type="hidden" name="priority_id" value={priority} />
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Mức độ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dictionaries.priorities.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Trọng số (%)</Label>
                            <Input type="number" name="weight" defaultValue={task?.weight || 0} min="0" max="100" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tiến độ (%)</Label>
                            <Input type="number" name="progress" defaultValue={task?.progress || 0} min="0" max="100" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Chi phí dự kiến (VNĐ)</Label>
                        <Input type="number" name="cost_estimate" defaultValue={task?.cost_estimate || 0} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Mô tả chi tiết</Label>
                        <Textarea name="description" defaultValue={task?.description} placeholder="Ghi chú thêm..." className="h-24" />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Hủy</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {task ? "Lưu thay đổi" : "Tạo công việc"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}