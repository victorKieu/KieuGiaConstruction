"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSurvey } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";

// ✅ 1. Định nghĩa chuẩn kiểu dữ liệu từ Dictionary (khớp với DB)
interface SysDictionary {
    code: string;
    value: string;
}

interface SurveyCreateModalProps {
    projectId: string;
    surveyTypes: SysDictionary[]; // Dữ liệu này truyền từ ProjectPage xuống
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 w-full transition-all">
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

export default function SurveyCreateModal({ projectId, surveyTypes = [] }: SurveyCreateModalProps) {
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
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all">
                    <Plus className="w-4 h-4 mr-1" /> Thêm đợt khảo sát
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl bg-white">
                {/* Header màu Indigo cực đẹp của sếp */}
                <div className="bg-indigo-700 p-6 text-white">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Settings2 className="w-6 h-6 text-indigo-200" /> Thiết lập Khảo sát
                    </DialogTitle>
                    <p className="text-indigo-100 text-[11px] mt-2 opacity-80 leading-relaxed">
                        Chọn loại hình để AI tự động chuẩn bị công cụ và quy trình thực địa phù hợp.
                    </p>
                </div>

                <form ref={formRef} action={formAction} className="p-6 space-y-5">
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* Mục đích khảo sát - Lấy từ Dictionary */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mục đích khảo sát</Label>
                        <Select name="template_name" required> {/* ✅ Đổi name thành template_name để khớp với Server Action */}
                            <SelectTrigger className="h-11 border-slate-200 focus:ring-indigo-500 bg-slate-50/50">
                                <SelectValue placeholder="Chọn loại hình khảo sát..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                {surveyTypes && surveyTypes.length > 0 ? (
                                    surveyTypes.map((item: any, index: number) => {
                                        // Log thử để sếp kiểm tra ở F12 xem dữ liệu thực tế là gì
                                        console.log("Item data:", item);

                                        return (
                                            <SelectItem
                                                key={item.code || `survey-type-${index}`}
                                                value={item.value || item.code || `val-${index}`}
                                            >
                                                {/* BẮT BUỘC dùng span và toString() để tránh lỗi truyền Object */}
                                                <span className="text-slate-900 font-medium">
                                                    {String(item.value || item.name || item.code || "Không có tiêu đề")}
                                                </span>
                                            </SelectItem>
                                        );
                                    })
                                ) : (
                                    <SelectItem value="none" disabled className="text-xs italic text-slate-400">
                                        Không có dữ liệu từ điển...
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Chi tiết đợt khảo sát */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Giai đoạn / Chi tiết</Label>
                        <Input
                            name="name_detail"
                            placeholder="Ví dụ: Lần 1, Trước khi ép cọc..."
                            className="h-11 border-slate-200 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Ngày thực địa */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ngày thực địa</Label>
                        <Input
                            name="survey_date"
                            type="date"
                            required
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="h-11 border-slate-200 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Thông báo lỗi nếu có */}
                    {state.error && (
                        <Alert variant="destructive" className="py-2 border-none bg-red-50 text-red-700 animate-in fade-in zoom-in duration-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs font-medium">{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-3 pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="flex-1 text-slate-500 hover:bg-slate-100 transition-colors">Hủy</Button>
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