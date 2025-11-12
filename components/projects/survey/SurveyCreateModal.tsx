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
import { createSurvey } from "@/lib/action/surveyActions"; // ✅ Import action
import { useActionState } from 'react'; // ✅ Dùng hook mới
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions"; // ✅ Import type
import type { SurveyTemplate } from "@/types/project"; // ✅ Import type

interface SurveyCreateModalProps {
    projectId: string;
    surveyTemplates: SurveyTemplate[]; // ✅ Nhận Mẫu
}

// Component nút Submit để hiển thị trạng thái loading
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo...
                </>
            ) : (
                "Tạo Đợt Khảo sát"
            )}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function SurveyCreateModal({ projectId, surveyTemplates }: SurveyCreateModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(createSurvey, initialState);

    // Đóng modal và reset form khi thành công
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            formRef.current?.reset();
            alert(state.message || "Tạo thành công!"); // Hoặc dùng toast
        }
    }, [state.success, state.message, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo Đợt Khảo sát
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tạo Đợt Khảo sát Mới</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    {/* Input ẩn để gửi projectId */}
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* --- PHẦN FIX: SỬA LẠI FORM CHO ĐÚNG --- */}
                    <div className="space-y-1">
                        <Label htmlFor="template_name">Loại khảo sát (Chọn Mẫu)</Label>
                        <Select name="template_name" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn loại khảo sát..." />
                            </SelectTrigger>
                            <SelectContent>
                                {/* Code đúng là lặp qua 'surveyTemplates' */}
                                {surveyTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.name}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="name_detail">Tên chi tiết (Tùy chọn)</Label>
                        <Input id="name_detail" name="name_detail" placeholder="Ví dụ: Lần 1, Giai đoạn 2..." />
                    </div>
                    {/* --- KẾT THÚC FIX --- */}

                    {/* Trường Ngày Khảo sát */}
                    <div className="space-y-1">
                        <Label htmlFor="survey_date">Ngày khảo sát</Label>
                        <Input id="survey_date" name="survey_date" type="date" required />
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
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}