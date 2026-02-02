"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { deleteDocument } from "@/lib/action/documentActions"; // ✅ Import action Xóa
import type { ActionResponse } from "@/lib/action/projectActions"; // ✅ Import type

interface DocumentDeleteButtonProps {
    documentId: string;
    projectId: string;
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function DocumentDeleteButton({ documentId, projectId }: DocumentDeleteButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    // [isDeletePending] sẽ được thêm nếu dùng useTransition, nhưng với useActionState thì không cần
    const [state, formAction, isPending] = useActionState(deleteDocument, initialState);


    // Xử lý khi action thành công (đóng modal)
    useState(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            alert(state.message || "Xóa thành công!");
        } else if (state.error && isOpen) {
            alert(`Lỗi khi xóa: ${state.error}`);
            setIsOpen(false); // Đóng modal khi có lỗi
        }
    });

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này sẽ xóa file vĩnh viễn khỏi máy chủ và không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
                    {/* Dùng form để gọi Server Action */}
                    <form action={formAction}>
                        <input type="hidden" name="documentId" value={documentId} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xóa...
                                </>
                            ) : (
                                "Xác nhận Xóa"
                            )}
                        </Button>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}