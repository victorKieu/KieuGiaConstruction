// components/tasks/TaskCreateModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "../../lib/action/projectActions"; // Import Server Action
import { MemberData } from "@/types/project"; // Import MemberData
interface TaskCreateModalProps {
    projectId: string;
    members: MemberData[]; // Cần danh sách thành viên để phân công
}

export default function TaskCreateModal({ projectId, members }: TaskCreateModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        // Gọi Server Action
        const result = await createTask(projectId, formData);

        setIsSubmitting(false);

        if (result.success) {
            alert(result.message);
            setIsOpen(false);
        } else {
            setErrorMessage(result.error || "Có lỗi xảy ra khi tạo công việc.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>+ Tạo Công việc Mới</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo Công việc Mới</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Trường Name */}
                    <div className="space-y-1">
                        <Label htmlFor="name">Tên công việc</Label>
                        <Input id="name" name="name" required />
                    </div>

                    {/* Trường Description */}
                    <div className="space-y-1">
                        <Label htmlFor="description">Mô tả</Label>
                        <Textarea id="description" name="description" />
                    </div>

                    {/* Trường Priority (Ưu tiên) */}
                    <div className="space-y-1">
                        <Label htmlFor="priority">Mức ưu tiên</Label>
                        <Select name="priority">
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn mức ưu tiên" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* ✅ Cập nhật các option Priority */}
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Trường Assigned To (Phân công) */}
                    <div className="space-y-1">
                        <Label htmlFor="assigned_to">Phân công cho</Label>
                        <Select name="assigned_to">
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn thành viên" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">— Chưa phân công —</SelectItem>
                                {members.map((member) => (
                                    <SelectItem key={member.employee.email} value={member.employee.id}>
                                        {member.employee.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Trường Status (Trạng thái) */}
                    <div className="space-y-1">
                        <Label htmlFor="status">Trạng thái ban đầu</Label>
                        <Select name="status" defaultValue="pending">
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* ✅ Cập nhật Status theo SQL */}
                                <SelectItem value="pending">Chưa bắt đầu</SelectItem>
                                <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                                <SelectItem value="on_hold">Tạm dừng</SelectItem>
                                <SelectItem value="cancelled">Hủy bỏ</SelectItem>
                                <SelectItem value="completed">Hoàn thành</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Trường Start Date */}
                    <div className="space-y-1">
                        <Label htmlFor="start_date">Ngày bắt đầu</Label>
                        <Input id="start_date" name="start_date" type="date" />
                    </div>

                    {/* Trường Due Date */}
                    <div className="space-y-1">
                        <Label htmlFor="due_date">Ngày hết hạn</Label>
                        <Input id="due_date" name="due_date" type="date" />
                    </div>

                    {errorMessage && (
                        <p className="text-red-500 text-sm">{errorMessage}</p>
                    )}

                    <div className="mt-4 flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Đang tạo..." : "Tạo Công việc"}
                        </Button>
                    </div>
                    {errorMessage && (
                        <p className="text-red-500 text-sm">{errorMessage}</p>
                    )}

                </form>
            </DialogContent>
        </Dialog>
    );
}