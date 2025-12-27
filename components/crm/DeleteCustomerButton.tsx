"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast"; // Kiểm tra lại đường dẫn hook toast của bạn
// --- THAY ĐỔI ĐƯỜNG DẪN IMPORT TẠI ĐÂY ---
import { deleteCustomer } from "@/lib/action/crmActions";

// Định nghĩa Props khớp với cách gọi bên page.tsx
interface DeleteCustomerButtonProps {
    id: string;
    name: string;
}

export function DeleteCustomerButton({ id, name }: DeleteCustomerButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setLoading(true);

        // Gọi hàm từ file crmActions mới
        const res = await deleteCustomer(id);

        setLoading(false);
        setOpen(false);

        if (res.success) {
            toast({
                title: "Thành công",
                description: res.message,
                className: "bg-green-600 text-white border-none",
            });
        } else {
            toast({
                title: "Không thể xóa!",
                description: res.error,
                variant: "destructive",
            });
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bạn có chắc chắn muốn xóa khách hàng <b className="text-red-600">{name}</b> không?
                        <br />
                        Hành động này không thể hoàn tác và sẽ xóa các dữ liệu liên quan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Xóa
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}