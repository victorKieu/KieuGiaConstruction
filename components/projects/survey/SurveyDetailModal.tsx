"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSurveyTask, getSurveyTasks } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils/utils";
import { MemberData } from "@/types/project";
import SurveyResultModal from "./SurveyResultModal";

// Import các type THẬT (đã fix ở bước 120)
import type { Survey, SurveyTask, SurveyTaskTemplate } from "@/types/project";
import type { ActionResponse } from "@/lib/action/projectActions"; // Import từ file đã export
import SurveyTaskDeleteButton from "./SurveyTaskDeleteButton";
import SurveyTaskEditModal from "./SurveyTaskEditModal";
interface SurveyDetailModalProps {
    survey: Survey;
    members: MemberData[];
    projectId: string;
    surveyTaskTemplates: SurveyTaskTemplate[]; // Nhận Mẫu Task
}

// Component nút Submit (Dùng chung cho Form Thêm Task)
function SubmitTaskButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
    );
}

// Định nghĩa initialState (đã fix lỗi ReferenceError)
const initialState: ActionResponse = {
    success: false,
    error: undefined,
    message: undefined
};

export default function SurveyDetailModal({ survey, members, projectId, surveyTaskTemplates }: SurveyDetailModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(createSurveyTask, initialState);
    const [tasks, setTasks] = useState<SurveyTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Hàm gọi Server Action để lấy tasks
    const triggerRefresh = useCallback(async () => {
        if (!survey.id) return;
        setIsLoading(true);
        const result = await getSurveyTasks(survey.id);
        if (result.data) {
            setTasks(result.data as SurveyTask[]);
        } else {
            console.error("Lỗi fetch tasks (Client):", result.error?.message || result.error);
        }
        setIsLoading(false);
    }, [survey.id]);

    // 1. Fetch task khi modal được mở
    useEffect(() => {
        if (isOpen) {
            triggerRefresh(); // ✅ Gọi hàm refresh
        }
    }, [isOpen, triggerRefresh]);

    // 2. Refresh (fetch lại) task khi thêm task mới thành công
    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            // alert(state.message || "Thêm thành công!"); // Tạm tắt alert
            triggerRefresh(); // ✅ Gọi hàm refresh
        }
    }, [state.success, state.message, triggerRefresh]); // ✅ Đổi dependency

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {/* Nút trigger (chính là dòng LI trong tab) */}
                <div className="cursor-pointer">
                    <p className="font-medium text-blue-600 hover:underline">
                        {survey.name}
                    </p>
                    <div className="text-xs text-gray-500 mt-0.5">
                        Ngày: {formatDate(survey.survey_date)} |
                        Người tạo: {survey.created_by?.name || 'N/A'}
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Chi tiết Đợt Khảo sát: {survey.name}</DialogTitle>
                </DialogHeader>

                {/* Danh sách công việc */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                    <h4 className="font-semibold">Công việc cần thực hiện</h4>
                    {isLoading ? (
                        <p className="text-sm text-gray-500 text-center py-4">Đang tải công việc...</p>
                    ) : tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Chưa có công việc nào được giao.</p>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium">{task.title}</p>
                                    <p className="text-xs text-gray-500">
                                        Giao cho: {task.assigned_to?.name || "Chưa gán"} |
                                        {/* Fix lỗi type 'null' */}
                                        Hạn: {task.due_date ? formatDate(task.due_date) : "N/A"}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                        {task.status}
                                    </span>

                                    {/* Nút GHI NHẬN KẾT QUẢ (MỚI) */}
                                    <SurveyResultModal
                                        task={task}
                                        projectId={projectId}
                                        onUpdateSuccess={triggerRefresh} // ✅ Gọi refresh khi lưu xong
                                    />
                                    <SurveyTaskEditModal
                                        task={task}
                                        members={members}
                                        surveyTaskTemplates={surveyTaskTemplates}
                                        projectId={projectId}
                                        onUpdateSuccess={triggerRefresh}
                                    />
                                    <SurveyTaskDeleteButton
                                        taskId={task.id}
                                        projectId={projectId}
                                        onDeleteSuccess={triggerRefresh} // ✅ Gọi refresh khi xóa xong
                                    />
                                </div>
                                
                            </div>
                        ))
                    )}
                </div>

                {/* --- PHẦN FIX: FORM THÊM CÔNG VIỆC MỚI (Đã sửa) --- */}
                <form ref={formRef} action={formAction} className="flex-shrink-0 grid grid-cols-12 gap-2 border-t pt-4">
                    <input type="hidden" name="surveyId" value={survey.id} />
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* Dùng Select Mẫu Task (surveyTaskTemplates) */}
                    <div className="col-span-5">
                        <Label htmlFor="title" className="sr-only">Tiêu đề</Label>
                        <Select name="title" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn đầu việc khảo sát..." />
                            </SelectTrigger>
                            <SelectContent>
                                {/* Lặp qua surveyTaskTemplates (đã fix ReferenceError) */}
                                {surveyTaskTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.title}>
                                        {/* Hiển thị category (đã fix lỗi Type) */}
                                        {template.title} (Loại: {template.category || 'N/A'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Giao cho (members) */}
                    <div className="col-span-3">
                        <Label htmlFor="assigned_to" className="sr-only">Giao cho</Label>
                        <Select name="assigned_to" defaultValue="unassigned">
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

                    {/* Hạn chót */}
                    <div className="col-span-3">
                        <Label htmlFor="due_date" className="sr-only">Hạn chót</Label>
                        <Input id="due_date" name="due_date" type="date" />
                    </div>

                    {/* Nút Submit */}
                    <div className="col-span-1">
                        <SubmitTaskButton />
                    </div>

                    {/* Hiển thị lỗi (nếu có) */}
                    {state.error && (
                        <div className="col-span-12">
                            <Alert variant="destructive" className="py-2 px-3 text-xs">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{state.error}</AlertDescription>
                            </Alert>
                        </div>
                    )}
                </form>
                {/* --- KẾT THÚC FIX FORM --- */}

            </DialogContent>
        </Dialog>
    );
}