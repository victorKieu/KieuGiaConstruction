"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInventoryItemAction, deleteInventoryItemAction } from "@/lib/action/inventory";

interface Props { item: any; }

export default function InventoryItemActions({ item }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);

    // ✅ FIX: Sửa lại state cho đúng với 2 trường backend hỗ trợ
    const [editData, setEditData] = useState({
        item_name: item.item_name || "",
        unit: item.unit || ""
    });

    const handleUpdate = async () => {
        if (!editData.item_name || !editData.unit) {
            toast.error("Vui lòng điền đầy đủ tên và đơn vị!");
            return;
        }

        setIsLoading(true);
        // ✅ FIX: Truyền đúng 3 tham số (id, newName, newUnit)
        const res = await updateInventoryItemAction(item.id, editData.item_name, editData.unit);
        setIsLoading(false);

        if (res.success) {
            toast.success(res.message || "Đã cập nhật");
            setOpenEdit(false);
            router.refresh();
        }
        else { toast.error(res.error); }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        const res = await deleteInventoryItemAction(item.id);
        setIsLoading(false);
        if (res.success) {
            toast.success(res.message || "Đã xóa vật tư");
            setOpenDelete(false);
            router.refresh();
        }
        else { toast.error(res.error); }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tác vụ</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa vật tư
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenDelete(true)} className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa vật tư
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Chỉnh sửa vật tư</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Tên vật tư <span className="text-red-500">*</span></Label>
                            <Input
                                type="text"
                                value={editData.item_name}
                                onChange={(e) => setEditData({ ...editData, item_name: e.target.value })}
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Đơn vị tính <span className="text-red-500">*</span></Label>
                            <Input
                                type="text"
                                value={editData.unit}
                                onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                                className="bg-background"
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

            <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vật tư <span className="font-bold text-foreground">"{item.item_name}"</span> sẽ bị xóa khỏi danh sách kho này.<br />
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            {isLoading ? "Đang xóa..." : "Xóa vĩnh viễn"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}