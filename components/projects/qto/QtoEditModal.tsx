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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateQtoItem } from "@/lib/action/qtoActions"; // ✅ Import action Sửa
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { QtoItem } from "@/types/project"; // Import type

interface QtoEditModalProps {
    item: QtoItem; // Nhận công tác cần sửa
    projectId: string;
    onSuccess: () => void; // Callback để refresh
}

// Component nút Submit
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function QtoEditModal({ item, projectId, onSuccess }: QtoEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateQtoItem, initialState);

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            onSuccess(); // Gọi callback refresh
        }
    }, [state.success, isOpen, onSuccess]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit className="h-4 w-4 text-yellow-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa Công tác QTO</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    {/* Input ẩn */}
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* Các trường (đã điền sẵn defaultValue) */}
                    <div className="space-y-1">
                        <Label htmlFor="item_name">Tên công tác</Label>
                        <Input id="item_name" name="item_name" defaultValue={item.item_name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="unit">Đơn vị</Label>
                            <Input id="unit" name="unit" defaultValue={item.unit} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="quantity">Khối lượng</Label>
                            <Input id="quantity" name="quantity" type="number" defaultValue={item.quantity} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="unit_price">Đơn giá</Label>
                            <Input id="unit_price" name="unit_price" type="number" defaultValue={item.unit_price} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="item_type">Phân loại (Chi phí)</Label>
                            <Select name="item_type" defaultValue={item.item_type || 'material'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn loại chi phí" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="material">Vật liệu</SelectItem>
                                    <SelectItem value="labor">Nhân công</SelectItem>
                                    <SelectItem value="equipment">Thiết bị</SelectItem>
                                    <SelectItem value="subcontractor">Thầu phụ</SelectItem>
                                    <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea id="notes" name="notes" rows={2} defaultValue={item.notes || ''} />
                    </div>

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
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}