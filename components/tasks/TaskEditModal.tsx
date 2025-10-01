// components/tasks/TaskEditModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Giả định bạn có component Tabs
import { updateTask, deleteTask } from "../../lib/action/projectActions";
import { TaskData, MemberData, TaskStatus } from "@/types/project";
import { Edit, Trash2 } from 'lucide-react';

interface TaskEditModalProps {
    task: TaskData;
    members: MemberData[];
}

// Hàm phụ trợ để hiển thị nhãn trạng thái (Cần được định nghĩa trong file này hoặc import)
function getStatusLabel(status: TaskStatus): string {
    switch (status) {
        case "completed": return "Hoàn thành";
        case "in_progress": return "Đang thực hiện";
        case "pending": return "Chưa bắt đầu";
        case "on_hold": return "Tạm dừng";
        case "cancelled": return "Đã hủy";
        default: return "Không xác định";
    }
}
export default function TaskEditModal({ task, members }: TaskEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        // Gọi Server Action cập nhật
        const result = await updateTask(task.id, formData);

        setIsSubmitting(false);

        if (result.success) {
            alert(result.message);
            // Giữ modal mở để người dùng xem/thêm bình luận nếu cần
            // setIsOpen(false); 
        } else {
            setErrorMessage(result.error || "Có lỗi xảy ra khi cập nhật công việc.");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa công việc "${task.name}" không?`)) {
            return;
        }

        setIsSubmitting(true);
        const result = await deleteTask(task.id);
        setIsSubmitting(false);

        if (result.success) {
            alert(result.message);
            setIsOpen(false); // Đóng modal sau khi xóa thành công
        } else {
            alert(`Lỗi khi xóa công việc: ${result.error}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {/* Nút trigger chỉnh sửa */}
                <Button size="icon" variant="ghost" className="h-6 w-6">
                    <Edit className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                </Button>
            </DialogTrigger>

            {/* ✅ SỬA LỖI: Tăng chiều rộng và thêm max-height/overflow để có thể cuộn */}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa Công việc: {task.name}</DialogTitle>
                </DialogHeader>

                {/* Tích hợp Tabs */}
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Chi tiết Task</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Chi tiết Task (Form chỉnh sửa) */}
                    <TabsContent value="details">
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            {/* Trường Name */}
                            <div className="space-y-1">
                                <Label htmlFor="name">Tên công việc</Label>
                                <Input id="name" name="name" required defaultValue={task.name} />
                            </div>

                            {/* Trường Description */}
                            <div className="space-y-1">
                                <Label htmlFor="description">Mô tả</Label>
                                <Textarea id="description" name="description" defaultValue={task.description || ''} />
                            </div>

                            {/* Trường Assigned To (Phân công) */}
                            <div className="space-y-1">
                                <Label htmlFor="assigned_to">Phân công cho</Label>
                                <Select name="assigned_to" defaultValue={task.assigned_to?.id || "unassigned"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn thành viên" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Sử dụng 'unassigned' thay vì chuỗi rỗng để tránh lỗi Radix UI */}
                                        <SelectItem value="unassigned">— Chưa phân công —</SelectItem>
                                        {members.map((member) => (
                                            <SelectItem key={member.employee.id} value={member.employee.id}>
                                                {member.employee.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Trường Status */}
                            <div className="space-y-1">
                                <Label htmlFor="status">Trạng thái</Label>
                                <Select name="status" defaultValue={task.status}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["pending", "in_progress", "on_hold", "cancelled", "completed"].map(s => (
                                            <SelectItem key={s} value={s}>{getStatusLabel(s as TaskStatus)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Trường Priority */}
                            <div className="space-y-1">
                                <Label htmlFor="priority">Mức ưu tiên</Label>
                                <Select name="priority" defaultValue={task.priority || "low"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn mức ưu tiên" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["critical", "high", "medium", "low"].map(p => (
                                            <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Trường Progress */}
                            <div className="space-y-1">
                                <Label htmlFor="progress">Tiến độ (%)</Label>
                                <Input id="progress" name="progress" type="number" min="0" max="100" defaultValue={task.progress || 0} />
                            </div>

                            {/* Trường Start Date */}
                            <div className="space-y-1">
                                <Label htmlFor="start_date">Ngày bắt đầu</Label>
                                {/* Cắt chuỗi ngày tháng để chỉ lấy định dạng YYYY-MM-DD cho input type="date" */}
                                <Input id="start_date" name="start_date" type="date" defaultValue={task.start_date ? task.start_date.substring(0, 10) : ''} />
                            </div>

                            {/* Trường Due Date */}
                            <div className="space-y-1">
                                <Label htmlFor="due_date">Ngày hết hạn</Label>
                                <Input id="due_date" name="due_date" type="date" defaultValue={task.due_date ? task.due_date.substring(0, 10) : ''} />
                            </div>

                            {errorMessage && (
                                <p className="text-red-500 text-sm">{errorMessage}</p>
                            )}

                            <div className="mt-4 flex justify-between items-center border-t pt-4">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="flex items-center"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Xóa công việc
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang cập nhật..." : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}