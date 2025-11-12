"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurveyTask } from "@/lib/action/surveyActions"; // ✅ Import action Sửa Task
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { SurveyTask, SurveyTaskTemplate, MemberData } from "@/types/project";

interface SurveyTaskEditModalProps {
    task: SurveyTask;
    members: MemberData[];
    surveyTaskTemplates: SurveyTaskTemplate[];
    projectId: string;
    onUpdateSuccess: () => void; // Callback để refresh
}

// Component nút Submit
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                </>
            ) : (
                "Lưu thay đổi"
            )}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function SurveyTaskEditModal({ task, members, surveyTaskTemplates, projectId, onUpdateSuccess }: SurveyTaskEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateSurveyTask, initialState);

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            alert(state.message || "Cập nhật thành công!");
            onUpdateSuccess(); // ✅ Gọi refresh
        }
    }, [state.success, state.message, isOpen, onUpdateSuccess]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit className="h-4 w-4 text-yellow-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa Công việc Khảo sát</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="projectId" value={projectId} />

                    <div className="space-y-1">
                        <Label htmlFor="title">Tiêu đề (Từ Mẫu)</Label>
                        <Select name="title" defaultValue={task.title} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn đầu việc..." />
                            </SelectTrigger>
                            <SelectContent>
                                {surveyTaskTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.title}>
                                        {template.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="assigned_to">Giao cho</Label>
                        <Select name="assigned_to" defaultValue={task.assigned_to?.id || "unassigned"}>
                            <SelectTrigger>
                                <SelectValue placeholder="Giao cho..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">— Chưa phân công —</SelectItem>
                                {members.map((member) => (
                                    <SelectItem key={member.employee.id} value={member.employee.id}>
                                        {member.employee.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="due_date">Hạn chót</Label>
                        <Input id="due_date" name="due_date" type="date"
                            defaultValue={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''} />
                    </div>

                    {state.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Hủy</Button>
                        </DialogClose>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}