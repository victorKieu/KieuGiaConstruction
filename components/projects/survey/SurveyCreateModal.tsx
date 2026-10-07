"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSurvey } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Settings2, Link as LinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";

// ✅ 1. Định nghĩa chuẩn kiểu dữ liệu từ Dictionary (khớp với DB hiện tại)
interface SysDictionary {
    code: string;
    name?: string;
    value?: string;
}

// Định nghĩa Type cơ bản cho Task WBS để tránh lỗi 'any'
interface WbsTask {
    id: string;
    wbs_code?: string;
    name: string;
}

interface SurveyCreateModalProps {
    projectId: string;
    surveyTypes: SysDictionary[];
    tasks?: WbsTask[];
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-indigo-600 text-white transition-all hover:bg-indigo-700">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang thiết lập...
                </>
            ) : (
                "Khởi tạo Workspace"
            )}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function SurveyCreateModal({ projectId, surveyTypes = [], tasks = [] }: SurveyCreateModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction] = useActionState(createSurvey, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    // Tự động đóng modal khi thành công
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            formRef.current?.reset();
        }
    }, [state.success, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-indigo-600 text-white shadow-md transition-all hover:bg-indigo-700">
                    <Plus className="mr-1 h-4 w-4" /> Thêm đợt khảo sát
                </Button>
            </DialogTrigger>

            <DialogContent className="overflow-hidden border-none bg-white p-0 shadow-2xl transition-colors sm:max-w-[400px] dark:bg-slate-900">
                {/* Header màu Indigo cực đẹp */}
                <div className="bg-indigo-700 p-6 text-white transition-colors dark:bg-indigo-900">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Settings2 className="h-6 w-6 text-indigo-200" /> Thiết lập Khảo sát
                    </DialogTitle>
                    <p className="mt-2 leading-relaxed text-indigo-100 text-[11px] opacity-80">
                        Chọn loại hình để AI tự động chuẩn bị công cụ và quy trình thực địa phù hợp.
                    </p>
                </div>

                <form ref={formRef} action={formAction} className="space-y-4 p-6">
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* Mục đích khảo sát - Lấy từ Dictionary */}
                    <div className="space-y-1.5">
                        <Label className="font-bold tracking-widest text-[10px] text-slate-400 uppercase">Mục đích khảo sát</Label>
                        <Select name="template_name" required>
                            <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 transition-colors focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                                <SelectValue placeholder="Chọn loại hình khảo sát..." />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
                                {surveyTypes && surveyTypes.length > 0 ? (
                                    // ✅ FIX LỖI IMPLICIT ANY: Định nghĩa rõ item là SysDictionary
                                    surveyTypes.map((item: SysDictionary, index: number) => (
                                        <SelectItem
                                            key={item.code || `survey-type-${index}`}
                                            value={item.code || item.value || `val-${index}`} // Ưu tiên lấy Code để lưu DB
                                        >
                                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                                {item.name || item.value || item.code || "Không có tiêu đề"}
                                            </span>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled className="text-xs text-slate-400 italic">
                                        Không có dữ liệu từ điển...
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dropdown liên kết với WBS Task */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 font-bold tracking-widest text-[10px] text-indigo-500 uppercase dark:text-indigo-400">
                            <LinkIcon className="h-3 w-3" /> Liên kết Công việc WBS
                        </Label>
                        <Select name="wbs_task_id">
                            <SelectTrigger className="h-10 border-indigo-100 bg-indigo-50/30 transition-colors focus:ring-indigo-500 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-slate-100">
                                <SelectValue placeholder="-- Tùy chọn: Chọn hạng mục --" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
                                <SelectItem value="none" className="text-slate-500 italic">-- Không liên kết --</SelectItem>
                                {/* ✅ FIX LỖI IMPLICIT ANY: Định nghĩa rõ task là WbsTask */}
                                {tasks && tasks.length > 0 && tasks.map((task: WbsTask) => (
                                    <SelectItem key={task.id} value={task.id}>
                                        <span className="mr-2 font-mono text-xs text-slate-500">{task.wbs_code || "-"}</span>
                                        <span className="inline-block max-w-[200px] truncate align-bottom font-medium">{task.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Chi tiết đợt khảo sát */}
                    <div className="space-y-1.5">
                        <Label className="font-bold tracking-widest text-[10px] text-slate-400 uppercase">Giai đoạn / Chi tiết</Label>
                        <Input
                            name="name_detail"
                            placeholder="Ví dụ: Lần 1, Trước khi ép cọc..."
                            className="h-10 border-slate-200 transition-colors focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </div>

                    {/* Ngày thực địa */}
                    <div className="space-y-1.5">
                        <Label className="font-bold tracking-widest text-[10px] text-slate-400 uppercase">Ngày thực địa</Label>
                        <Input
                            name="survey_date"
                            type="date"
                            required
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="h-10 border-slate-200 transition-colors focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </div>

                    {/* Thông báo lỗi nếu có */}
                    {state.error && (
                        <Alert variant="destructive" className="animate-in fade-in zoom-in border-none bg-red-50 py-2 text-red-700 transition-colors duration-200 dark:bg-red-500/10 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs font-medium">{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-3 pt-2">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="flex-1 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">Hủy</Button>
                        </DialogClose>
                        <div className="flex-[2]">
                            <SubmitButton />
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}