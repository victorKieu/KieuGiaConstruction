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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurveyTaskResult } from "@/lib/action/surveyActions"; // ✅ Import action Ghi nhận Kết quả
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Edit3 } from "lucide-react"; // ✅ Dùng icon Edit3
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { SurveyTask } from "@/types/project"; // Import type SurveyTask

interface SurveyResultModalProps {
    task: SurveyTask; // Nhận toàn bộ thông tin task
    projectId: string;
    onUpdateSuccess: () => void; // ✅ Hàm callback để refresh list
}

// Component nút Submit
function SubmitResultButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                </>
            ) : (
                "Lưu Kết quả"
            )}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function SurveyResultModal({ task, projectId, onUpdateSuccess }: SurveyResultModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateSurveyTaskResult, initialState);

    // Đóng modal và refresh list khi thành công
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            alert(state.message || "Cập nhật thành công!");
            onUpdateSuccess(); // ✅ Gọi hàm refresh ở component cha
        }
    }, [state.success, state.message, isOpen, onUpdateSuccess]);

    // Lấy kết quả cũ (nếu có) từ JSONB
    const oldResultText = (task.result_data as any)?.result_text || '';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-7 w-7">
                    <Edit3 className="h-4 w-4 text-green-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Ghi nhận Kết quả: {task.title}</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    {/* Input ẩn */}
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* Trường Ghi nhận Kết quả (Số hóa) */}
                    {/* (Đây là ví dụ đơn giản, sau này có thể làm form phức tạp hơn) */}
                    <div className="space-y-1">
                        <Label htmlFor="result_data_text">Kết quả Khảo sát</Label>
                        <Textarea
                            id="result_data_text"
                            name="result_data_text"
                            placeholder="Nhập kết quả đo đạc, thông số kỹ thuật..."
                            defaultValue={oldResultText}
                            rows={5}
                        />
                    </div>

                    {/* Trường Hướng xử lý/Ghi chú */}
                    <div className="space-y-1">
                        <Label htmlFor="notes">Hướng xử lý / Ghi chú</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Nhập kiến nghị, hướng xử lý, hoặc ghi chú..."
                            defaultValue={task.notes || ''}
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Trường Chi phí Thực tế */}
                        <div className="space-y-1">
                            <Label htmlFor="cost">Chi phí Thực tế (VND)</Label>
                            <Input
                                id="cost"
                                name="cost"
                                type="number"
                                placeholder="0"
                                defaultValue={task.cost || 0}
                            />
                        </div>

                        {/* Trường Trạng thái */}
                        <div className="space-y-1">
                            <Label htmlFor="status">Trạng thái Công việc</Label>
                            <Select name="status" defaultValue={task.status || 'pending'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Chưa thực hiện</SelectItem>
                                    <SelectItem value="completed">Đã hoàn thành</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Hiển thị lỗi */}
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
                        <SubmitResultButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}