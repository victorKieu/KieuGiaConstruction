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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadDocument } from "@/lib/action/projectActions"; // ✅ Đảm bảo đường dẫn đúng
import { useActionState } from 'react';
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import { useFormStatus } from "react-dom";
interface DocumentUploadModalProps {
    projectId: string;
}
// Định nghĩa các loại category (khớp với COMMENT trong CSDL)
const documentCategories = [
    { value: "drawings", label: "Bản vẽ kỹ thuật" },
    { value: "contracts", label: "Hợp đồng, Phụ lục" },
    { value: "reports", label: "Báo cáo, Nghiệm thu" },
    { value: "photos", label: "Hình ảnh công trường" },
    { value: "invoices", label: "Hóa đơn, Chứng từ" },
    { value: "legal", label: "Pháp lý, Giấy phép" },
    { value: "others", label: "Khác" },
];

// Component nút Submit để hiển thị trạng thái loading
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải lên...
                </>
            ) : (
                "Tải lên"
            )}
        </Button>
    );
}
const initialState: ActionResponse = { success: false, error: undefined, message: undefined };
export default function DocumentUploadModal({ projectId }: DocumentUploadModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // Sử dụng useFormState để gọi Server Action
    
    const [state, formAction] = useActionState(uploadDocument, initialState);

    // Đóng modal và reset form khi thành công
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            formRef.current?.reset();
            alert(state.message || "Tải lên thành công!");
        }
    }, [state.success, state.message, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>+ Tải lên Tài liệu</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tải lên Tài liệu Mới</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="projectId" value={projectId} />
                    {/* Trường File */}
                    <div className="space-y-1">
                        <Label htmlFor="document_file">Chọn file</Label>
                        <Input id="document_file" name="document_file" type="file" required />
                    </div>

                    {/* Trường Tên Tài liệu */}
                    <div className="space-y-1">
                        <Label htmlFor="name">Tên tài liệu</Label>
                        <Input id="name" name="name" placeholder="Ví dụ: Hợp đồng ABC v1.0" required />
                    </div>

                    {/* Trường Mô tả */}
                    <div className="space-y-1">
                        <Label htmlFor="description">Mô tả (Tùy chọn)</Label>
                        <Textarea id="description" name="description" placeholder="Mô tả ngắn về tài liệu..." />
                    </div>

                    {/* Trường Phân loại (Category) */}
                    <div className="space-y-1">
                        <Label htmlFor="category">Phân loại</Label>
                        <Select name="category" defaultValue="others">
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

                    {/* Hiển thị lỗi từ Server Action */}
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
                        {/* Nút Submit riêng để xử lý loading */}
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}