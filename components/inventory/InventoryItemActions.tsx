"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Loader2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateInventoryItemAction, deleteInventoryItemAction } from "@/lib/action/inventory";

interface Props {
    item: any; // Dữ liệu vật tư
}

export default function InventoryItemActions({ item }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // State cho Dialog Sửa
    const [openEdit, setOpenEdit] = useState(false);
    const [newName, setNewName] = useState(item.item_name);
    const [newUnit, setNewUnit] = useState(item.unit);

    // State cho Dialog Xóa
    const [openDelete, setOpenDelete] = useState(false);

    // Xử lý Cập nhật
    const handleUpdate = async () => {
        if (!newName) return toast.error("Tên vật tư không được để trống");

        setIsLoading(true);
        const res = await updateInventoryItemAction(item.id, newName, newUnit);
        setIsLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpenEdit(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    // Xử lý Xóa
    const handleDelete = async () => {
        setIsLoading(true);
        const res = await deleteInventoryItemAction(item.id);
        setIsLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpenDelete(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <>
            {/* 1. MENU DROPDOWN (NÚT 3 CHẤM) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setOpenEdit(true)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" /> Sửa thông tin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setOpenDelete(true)}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                        disabled={item.quantity_on_hand > 0} // Disable nếu còn tồn
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa danh mục
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. DIALOG SỬA */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sửa thông tin vật tư</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên vật tư / thiết bị</Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">Đơn vị tính</Label>
                            <Input
                                id="unit"
                                value={newUnit}
                                onChange={(e) => setNewUnit(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenEdit(false)}>Hủy</Button>
                        <Button onClick={handleUpdate} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3. ALERT XÓA */}
            <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vật tư <span className="font-bold text-black">"{item.item_name}"</span> sẽ bị xóa khỏi danh sách kho này.<br />
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {isLoading ? "Đang xóa..." : "Xóa vĩnh viễn"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}