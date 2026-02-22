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
import { useToast } from "@/hooks/use-toast";
import { deleteCustomer } from "@/lib/action/crmActions";

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

        try {
            const res = await deleteCustomer(id);

            if (res.success) {
                toast({
                    title: "Thành công",
                    description: res.message,
                    // ✅ FIX: Dùng variant default hoặc class semantic thay vì hardcode màu
                    className: "bg-green-600 text-white border-none dark:bg-green-800",
                });
                setOpen(false); // Chỉ đóng khi thành công để UX tốt hơn (hoặc đóng luôn tùy ý)
            } else {
                toast({
                    title: "Lỗi",
                    description: res.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Lỗi hệ thống",
                description: "Đã xảy ra lỗi không mong muốn.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            // setOpen(false); // Nếu muốn luôn đóng dialog dù lỗi hay không thì uncomment dòng này
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {/* ✅ FIX: Sử dụng semantic colors cho nút xóa */}
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
                        // ✅ FIX: Style chuẩn cho nút Destructive trong Dark Mode
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