"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurvey } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Edit, Link as LinkIcon, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { Survey } from "@/types/project";
import { toast } from "sonner";

interface SysDictionary {
    code: string;
    name?: string;
    value?: string;
}

interface WbsTask {
    id: string;
    wbs_code?: string;
    name: string;
}

interface SurveyEditModalProps {
    survey: Survey;
    projectId: string;
    tasks?: WbsTask[];
    surveyTypes?: SysDictionary[]; // ✅ Nhận danh sách loại khảo sát
}

// Component nút Submit
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-amber-600 text-white shadow-md transition-all hover:bg-amber-700">
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

export default function SurveyEditModal({ survey, projectId, tasks = [], surveyTypes = [] }: SurveyEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateSurvey, initialState);

    // ✅ TÁCH CHUỖI TỪ CỘT "name" TRONG DATABASE ĐỂ HIỂN THỊ ĐÚNG Ô
    // Giả sử DB đang lưu dạng: "BM-KS-03 - Lần 1 trước khi ép cọc"
    const nameParts = (survey.name || "").split(" - ");
    const defaultTemplateName = nameParts[0]?.trim() || "";
    const defaultNameDetail = nameParts.slice(1).join(" - ").trim() || "";

    const [templateName, setTemplateName] = useState(defaultTemplateName);
    const [nameDetail, setNameDetail] = useState(defaultNameDetail);

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            toast.success(state.message || "Cập nhật thành công!");
        }
    }, [state.success, state.message, isOpen]);

    // Lấy wbs_task_id nếu backend đã lưu trước đó (fallback sang "none")
    const defaultWbsTaskId = (survey as any).wbs_task_id || "none";

    // Chuỗi gộp cuối cùng sẽ gửi xuống backend
    const finalName = nameDetail ? `${templateName} - ${nameDetail}` : templateName;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10">
                    <Edit className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden border-none bg-white p-0 shadow-2xl transition-colors sm:max-w-[400px] dark:bg-slate-900">

                {/* Header màu Amber đồng bộ form Create nhưng khác màu để nhận diện Sửa */}
                <div className="bg-amber-600 p-6 text-white transition-colors dark:bg-amber-800">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Settings className="h-6 w-6 text-amber-200" /> Cập nhật Khảo sát
                    </DialogTitle>
                    <p className="mt-2 leading-relaxed text-amber-100 text-[11px] opacity-90">
                        Chỉnh sửa thông tin cơ bản và liên kết hạng mục WBS của đợt khảo sát.
                    </p>
                </div>

                <form ref={formRef} action={formAction} className="space-y-4 p-6">
                    <input type="hidden" name="surveyId" value={survey.id} />
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* ✅ TRICK: Dùng input ẩn để gửi dữ liệu gộp đúng chuẩn cho API Backend */}
                    <input type="hidden" name="name" value={finalName} />

                    {/* ✅ 1. Dropdown Mục đích khảo sát */}
                    <div className="space-y-1.5">
                        <Label className="font-bold tracking-widest text-[10px] text-slate-400 uppercase">Mục đích khảo sát</Label>
                        <Select
                            value={templateName}
                            onValueChange={setTemplateName}
                            required
                        >
                            <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 transition-colors focus:ring-amber-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                                <SelectValue placeholder="Chọn loại hình khảo sát..." />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
                                {surveyTypes && surveyTypes.length > 0 ? (
                                    surveyTypes.map((item: SysDictionary, index: number) => (
                                        <SelectItem
                                            key={item.code || `edit-type-${index}`}
                                            value={item.code || item.value || `val-${index}`}
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

                    {/* ✅ 2. Input Giai đoạn / Chi tiết */}
                    <div className="space-y-1.5">
                        <Label className="font-bold tracking-widest text-[10px] text-slate-400 uppercase">Giai đoạn / Chi tiết</Label>
                        <Input
                            value={nameDetail}
                            onChange={(e) => setNameDetail(e.target.value)}
                            placeholder="Ví dụ: Lần 1, Trước khi ép cọc..."
                            className="h-10 border-slate-200 dark:border-slate-800 focus:ring-amber-500 dark:bg-slate-950 dark:text-slate-100 transition-colors"
                        />
                    </div>

                    {/* 3. Dropdown liên kết với WBS Task */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 font-bold tracking-widest text-[10px] text-amber-600 uppercase dark:text-amber-500">
                            <LinkIcon className="h-3 w-3" /> Liên kết Công việc WBS
                        </Label>
                        <Select name="wbs_task_id" defaultValue={defaultWbsTaskId}>
                            <SelectTrigger className="h-10 border-amber-200 bg-amber-50/30 transition-colors focus:ring-amber-500 dark:border-amber-900 dark:bg-amber-950/30 dark:text-slate-100">
                                <SelectValue placeholder="-- Tùy chọn: Chọn hạng mục --" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
                                <SelectItem value="none" className="text-slate-500 italic">-- Không liên kết --</SelectItem>
                                {tasks && tasks.length > 0 && tasks.map((task: WbsTask) => (
                                    <SelectItem key={task.id} value={task.id}>
                                        <span className="mr-2 font-mono text-xs text-slate-500">{task.wbs_code || "-"}</span>
                                        <span className="inline-block max-w-[200px] truncate align-bottom font-medium">{task.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 4. Ngày thực địa */}
                    <div className="space-y-1.5">
                        <Label className="font-bold tracking-widest text-[10px] text-slate-400 uppercase">Ngày thực địa</Label>
                        <Input
                            id="survey_date"
                            name="survey_date"
                            type="date"
                            required
                            defaultValue={survey.survey_date ? new Date(survey.survey_date).toISOString().split('T')[0] : ''}
                            className="h-10 border-slate-200 transition-colors focus:ring-amber-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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