"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
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
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { deleteCustomer } from "@/lib/action/crmActions";
import { toast } from "sonner"; // ✅ Chỉ giữ lại Sonner cho đồng bộ và đẹp

interface DeleteCustomerButtonProps {
    id: string;
    name: string;
}

export function DeleteCustomerButton({ id, name }: DeleteCustomerButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);

        try {
            const res = await deleteCustomer(id);

            if (res.success) {
                // ✅ Dùng Sonner: Tự động có màu xanh, icon check mượt mà
                toast.success(res.message || "Xóa khách hàng thành công!");
                setOpen(false);
            } else {
                // ✅ Dùng Sonner: Tự động có màu đỏ báo lỗi
                toast.error(res.error || "Lỗi khi xóa khách hàng!");
            }
        } catch (error) {
            toast.error("Lỗi hệ thống: Đã xảy ra lỗi không mong muốn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bạn có chắc chắn muốn xóa khách hàng <b className="text-destructive">{name}</b> không?
                        <br />
                        Hành động này không thể hoàn tác và sẽ xóa các dữ liệu liên quan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault(); // Chặn đóng modal tự động để chờ API
                            handleDelete();
                        }}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Xóa vĩnh viễn
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}