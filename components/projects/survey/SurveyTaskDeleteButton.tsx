"use client";

import { useActionState, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSurveyTask } from "@/lib/action/surveyActions"; // ✅ Import action Xóa Task
import type { ActionResponse } from "@/lib/action/projectActions"; // Import type

interface SurveyTaskDeleteButtonProps {
    taskId: string;
    projectId: string;
    onDeleteSuccess: () => void; // ✅ Hàm callback để refresh list
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function SurveyTaskDeleteButton({ taskId, projectId, onDeleteSuccess }: SurveyTaskDeleteButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(deleteSurveyTask, initialState);

    // Xử lý khi action thành công (đóng modal và gọi callback)
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            alert(state.message || "Xóa thành công!");
            onDeleteSuccess(); // ✅ Gọi hàm refresh list ở component cha
        } else if (state.error && isOpen) {
            alert(`Lỗi khi xóa: ${state.error}`);
            setIsOpen(false);
        }
    }, [state.success, state.error, state.message, isOpen, onDeleteSuccess]);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xóa Công việc Khảo sát?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
                    <form action={formAction}>
                        <input type="hidden" name="taskId" value={taskId} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isPending}
                        >
                            {isPending ? "Đang xóa..." : "Xác nhận Xóa"}
                        </Button>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}