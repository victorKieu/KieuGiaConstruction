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
import { updateSurvey } from "@/lib/action/surveyActions"; // ✅ Import action Sửa
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { Survey } from "@/types/project"; // Import type Survey

interface SurveyEditModalProps {
    survey: Survey;
    projectId: string;
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

export default function SurveyEditModal({ survey, projectId }: SurveyEditModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateSurvey, initialState);

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            alert(state.message || "Cập nhật thành công!");
        }
    }, [state.success, state.message, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit className="h-4 w-4 text-yellow-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa Đợt Khảo sát</DialogTitle>
                </DialogHeader>

                <form ref={formRef} action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="surveyId" value={survey.id} />
                    <input type="hidden" name="projectId" value={projectId} />

                    <div className="space-y-1">
                        <Label htmlFor="name">Tên đợt khảo sát</Label>
                        <Input id="name" name="name" defaultValue={survey.name} required />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="survey_date">Ngày khảo sát</Label>
                        <Input id="survey_date" name="survey_date" type="date"
                            defaultValue={survey.survey_date ? new Date(survey.survey_date).toISOString().split('T')[0] : ''}
                            required />
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