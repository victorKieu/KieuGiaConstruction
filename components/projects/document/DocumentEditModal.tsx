"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from 'react'; // Đã đổi tên hook
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
import { updateDocument } from "@/lib/action/projectActions"; // Hoặc projectActions
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions"; // Hoặc types/actions

// Định nghĩa lại categories (hoặc import từ file chung)
const documentCategories = [
    { value: "drawings", label: "Bản vẽ kỹ thuật" },
    { value: "contracts", label: "Hợp đồng, Phụ lục" },
    { value: "reports", label: "Báo cáo, Nghiệm thu" },
    { value: "photos", label: "Hình ảnh công trường" },
    { value: "invoices", label: "Hóa đơn, Chứng từ" },
    { value: "legal", label: "Pháp lý, Giấy phép" },
    { value: "others", label: "Khác" },
];

// Định nghĩa kiểu dữ liệu cho document cần sửa
interface DocumentToEdit {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    project_id: string; // ✅ Đảm bảo prop này tồn tại
}

interface DocumentEditModalProps {
    document: DocumentToEdit; // Nhận document cần sửa
}

// Component nút Submit
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                </>
            ) : (
                "Lưu thay đổi"
            )}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function DocumentEditModal({ document }: DocumentEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateDocument, initialState);

    // Đóng modal khi thành công
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            alert(state.message || "Cập nhật thành công!");
        }
    }, [state.success, state.message, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {/* Nút trigger chỉnh sửa */}
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit className="h-4 w-4 text-yellow-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa Tài liệu</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    {/* Input ẩn để gửi ID */}
                    <input type="hidden" name="documentId" value={document.id} />
                    <input type="hidden" name="projectId" value={document.project_id} />

                    {/* Trường Tên Tài liệu */}
                    <div className="space-y-1">
                        <Label htmlFor="name">Tên tài liệu</Label>
                        <Input id="name" name="name" defaultValue={document.name} required />
                    </div>

                    {/* Trường Mô tả */}
                    <div className="space-y-1">
                        <Label htmlFor="description">Mô tả (Tùy chọn)</Label>
                        {/* Kiểm tra lại document.description có giá trị null hay chuỗi rỗng */}
                        <Textarea id="description" name="description" defaultValue={document.description ?? ''} />
                    </div>

                    {/* Trường Phân loại (Category) */}
                    <div className="space-y-1">
                        <Label htmlFor="category">Phân loại</Label>
                        <Select name="category" defaultValue={document.category || 'others'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn loại tài liệu" />
                            </SelectTrigger>
                            <SelectContent>
                                {documentCategories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}