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
import { deleteQtoItem } from "@/lib/action/qtoActions"; // ✅ Import action Xóa
import type { ActionResponse } from "@/lib/action/projectActions";

interface QtoDeleteButtonProps {
    itemId: string;
    projectId: string;
    onSuccess: () => void; // Callback để refresh
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function QtoDeleteButton({ itemId, projectId, onSuccess }: QtoDeleteButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(deleteQtoItem, initialState);

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            onSuccess(); // Gọi refresh
        } else if (state.error && isOpen) {
            alert(`Lỗi khi xóa: ${state.error}`);
            setIsOpen(false);
        }
    }, [state.success, state.error, isOpen, onSuccess]);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xóa Công tác QTO?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
                    <form action={formAction}>
                        <input type="hidden" name="itemId" value={itemId} />
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