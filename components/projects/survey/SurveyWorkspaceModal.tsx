"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSurveyTask, getSurveyTasks, updateSurvey } from "@/lib/action/surveyActions";
import { getDictionaryItems } from "@/lib/action/dictionaryActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { Loader2, Plus, ListTodo, CheckCircle2, LayoutGrid, X, ClipboardCheck, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils/utils";
import { MemberData, ProjectData, Survey, SurveyTask } from "@/types/project";
import SurveyResultModal from "./SurveyResultModal";
import SurveyTaskDeleteButton from "./SurveyTaskDeleteButton";
import SurveyTaskEditModal from "./SurveyTaskEditModal";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";
import type { ActionResponse } from "@/lib/action/projectActions";

interface SurveyWorkspaceModalProps {
    survey: Survey;
    project: ProjectData;
    members: MemberData[];
    projectId: string;
    surveyTaskTemplates?: any[];
    surveyTypes: { code: string; name?: string; value?: string }[];
    onProgressChange?: (surveyId: string, progress: number) => void;
}

function SubmitTaskButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" disabled={pending} className="h-9 w-9 shrink-0 bg-blue-600 p-0 text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 dark:shadow-none">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </Button>
    );
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function SurveyWorkspaceModal({
    survey, project, members, projectId, surveyTaskTemplates = [], surveyTypes = [], onProgressChange
}: SurveyWorkspaceModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(createSurveyTask as any, initialState);
    const [tasks, setTasks] = useState<SurveyTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dictionaryItems, setDictionaryItems] = useState<any[]>([]);

    // 1. CHUẨN HÓA TYPE CODE
    const typeCode = useMemo(() => {
        if (!survey.name) return "";
        return survey.name.split(' - ')[0].toUpperCase().trim();
    }, [survey.name]);

    const currentType = useMemo(() => {
        return surveyTypes.find(t => t.code === typeCode || t.code === survey.name);
    }, [typeCode, surveyTypes, survey.name]);

    const displayTitle = currentType ? (currentType.name || currentType.value) : survey.name;
    const isFengShui = typeCode.includes("PHONG_THUY") || survey.name.includes("PHONG_THUY");

    // 2. FETCH NHIỆM VỤ CON
    const fetchDictionary = useCallback(async () => {
        if (!typeCode) return;
        try {
            const categoryName = `TASK_${typeCode}`;
            const data = await getDictionaryItems(categoryName);
            if (data && data.length > 0) {
                setDictionaryItems(data);
            }
        } catch (error) {
            console.error("Lỗi fetch:", error);
        }
    }, [typeCode]);

    const triggerRefresh = useCallback(async () => {
        if (!survey.id) return;
        setIsLoading(true);
        const result = await getSurveyTasks(survey.id);
        if (result.data) setTasks([...result.data] as SurveyTask[]);
        setIsLoading(false);
    }, [survey.id]);

    const handleLocalTaskUpdate = useCallback((taskId: string, newStatus: string) => {
        setTasks(prevTasks =>
            prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        );
        triggerRefresh();
    }, [triggerRefresh]);

    useEffect(() => {
        if (isOpen) {
            triggerRefresh();
            fetchDictionary();
        }
    }, [isOpen, triggerRefresh, fetchDictionary]);

    // ✅ BỔ SUNG CATCH ERROR VÀ HIỂN THỊ TOAST
    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            triggerRefresh();
            toast.success("Đã thêm nhiệm vụ mới");
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state.success, state.error, triggerRefresh]);

    const handleSaveCompassData = async (data: any) => {
        try {
            const formData = new FormData();
            formData.append("id", survey.id);
            formData.append("notes", data.reportText);

            const res = await updateSurvey(null, formData);
            if (res.success) toast.success("Đã lưu thông số La bàn!");
        } catch (error) {
            toast.error("Lỗi kết nối");
        }
    };

    // --- LOGIC PROGRESS BAR ---
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercent = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
    const prevProgressRef = useRef(progressPercent);

    useEffect(() => {
        if (onProgressChange && tasks.length > 0) {
            onProgressChange(survey.id, progressPercent);
        }
    }, [progressPercent, survey.id, onProgressChange, tasks.length]);

    useEffect(() => {
        if (progressPercent === 100 && prevProgressRef.current < 100 && tasks.length > 0) {
            toast.success("TUYỆT VỜI! Đã hoàn thành 100% hạng mục.", {
                description: "Dữ liệu đã được đồng bộ về hệ thống trung tâm.",
                icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
            });
        }
        prevProgressRef.current = progressPercent;
    }, [progressPercent, tasks.length]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className="group flex-1 cursor-pointer rounded-lg border-b border-slate-100 p-3 transition-all last:border-0 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:bg-blue-900/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="flex items-center gap-2 font-bold text-slate-800 text-[15px] transition-colors group-hover:text-blue-700 dark:text-slate-200 dark:group-hover:text-blue-400">
                                {displayTitle}
                                {tasks.length > 0 && completedTasks === tasks.length && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </p>
                            <div className="mt-0.5 flex items-center gap-3 font-medium text-[11px] text-slate-400 transition-colors dark:text-slate-500">
                                <span className="font-bold tracking-tight text-blue-600 dark:text-blue-400">#{project.code}</span>
                                <span>📅 {formatDate(survey.survey_date)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent className="flex h-[96vh] w-[98vw] max-w-[1400px] flex-col !gap-0 overflow-hidden border-none bg-white !p-0 shadow-2xl transition-colors dark:bg-slate-950">
                <div className="sr-only">
                    <DialogHeader><DialogTitle>{displayTitle}</DialogTitle></DialogHeader>
                </div>

                <Tabs defaultValue="tasks" className="flex min-h-0 flex-1 flex-col !gap-0">
                    <div className="z-50 flex shrink-0 flex-col bg-slate-900 text-white">
                        <div className="flex h-12 items-center justify-between border-b border-white/5 px-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-blue-400" />
                                    <span className="font-black tracking-tighter text-[13px] uppercase">{displayTitle}</span>
                                    <span className="ml-1 font-bold text-[10px] text-slate-400">#{project.code}</span>
                                </div>

                                <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-inner sm:flex">
                                    <div className="h-2 w-24 overflow-hidden rounded-full border border-white/5 bg-slate-700/50">
                                        <div
                                            className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)] ${progressPercent === 100
                                                ? "bg-gradient-to-r from-green-400 to-emerald-600 shadow-green-500/50"
                                                : progressPercent > 50
                                                    ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                                                    : "bg-gradient-to-r from-slate-400 to-blue-400"
                                                }`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black leading-none ${progressPercent === 100 ? "text-green-400" : "text-blue-400"}`}>
                                            {progressPercent}% {progressPercent === 100 && "✨"}
                                        </span>
                                        <span className="font-bold tracking-tighter text-[7px] uppercase opacity-50">Progress</span>
                                    </div>
                                </div>

                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white h-8 w-8 rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <TabsList className="h-10 w-full justify-start gap-0 rounded-none bg-transparent p-0">
                            <TabsTrigger value="tasks" className="h-10 flex-1 rounded-none border-b-2 border-transparent font-black text-[11px] uppercase transition-colors sm:flex-none sm:px-8 data-[state=active]:border-blue-500 data-[state=active]:bg-white/5 data-[state=active]:text-blue-400">
                                NHIỆM VỤ
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="relative min-h-0 flex-1 bg-slate-950">
                        <TabsContent value="tasks" className="m-0 flex h-full w-full flex-col gap-3 overflow-y-auto bg-slate-50 p-3 transition-colors dark:bg-slate-950 data-[state=inactive]:hidden">
                            <form ref={formRef} action={formAction} className="sticky top-0 z-20 flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
                                <input type="hidden" name="surveyId" value={survey.id} />
                                <input type="hidden" name="projectId" value={projectId} />

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="min-w-[180px] flex-[2]">
                                        {/* ✅ ĐÃ SỬA LỖI BLOCKED NGẦM: Xóa thuộc tính required ở đây */}
                                        <Select name="title">
                                            <SelectTrigger className="border-slate-200 bg-slate-50 transition-colors focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                                                <SelectValue placeholder="Chọn hạng mục từ danh mục..." />
                                            </SelectTrigger>
                                            <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                {dictionaryItems.length > 0 ? (
                                                    dictionaryItems.map((item) => (
                                                        <SelectItem key={item.id} value={item.name} className="text-sm font-semibold dark:text-slate-200">
                                                            {item.name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="Other" disabled className="text-xs text-slate-400 italic dark:text-slate-500">
                                                        Chưa có danh mục TASK_{typeCode}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="min-w-[200px] flex-[3]">
                                        <Input name="notes" placeholder="Mô tả cụ thể hiện trường..." className="h-9 border-none bg-slate-100/50 text-sm font-medium transition-colors focus-visible:ring-0 dark:bg-slate-950 dark:text-slate-200" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 border-t pt-2 transition-colors dark:border-slate-800">
                                    <div className="flex-1">
                                        <Select name="assigned_to" defaultValue="unassigned">
                                            <SelectTrigger className="h-9 border-none bg-slate-100/50 font-black text-[11px] uppercase transition-colors focus:ring-0 dark:bg-slate-950 dark:text-slate-300">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                <SelectItem value="unassigned" className="dark:text-slate-200">Tự thực hiện</SelectItem>
                                                {members?.map((m) => m.employee && (
                                                    <SelectItem key={m.employee.id || m.employee_id} value={m.employee.id || m.employee_id} className="text-xs dark:text-slate-200">
                                                        {m.employee.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-32">
                                        <Input name="due_date" type="date" className="h-9 border-none bg-slate-100/50 text-xs font-bold transition-colors focus-visible:ring-0 dark:bg-slate-950 dark:text-slate-300" />
                                    </div>
                                    <SubmitTaskButton />
                                </div>
                            </form>

                            <div className="space-y-2 pb-10">
                                {isLoading ? (
                                    <div className="flex justify-center p-10 opacity-50"><Loader2 className="h-6 w-6 animate-spin dark:text-slate-400" /></div>
                                ) : tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-white/50 p-20 text-slate-300 transition-colors dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600">
                                        <ListTodo className="mb-2 h-12 w-12" />
                                        <p className="text-center text-xs font-black tracking-widest uppercase">Chưa có nhiệm vụ</p>
                                    </div>
                                ) : (
                                    tasks.map(task => {
                                        const isDone = task.status === 'completed';
                                        const t = task as any;
                                        return (
                                            <div key={task.id} className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">
                                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                                    <div className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDone ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                        {isDone ? <ClipboardCheck className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm font-bold truncate transition-colors ${isDone ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
                                                            {isDone && <span className="rounded bg-green-500 px-1 py-0.5 font-black text-[8px] text-white uppercase">Xong</span>}
                                                        </div>

                                                        {t.notes && (
                                                            <div className={`mt-2 transition-colors ${isDone ? 'bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-inner' : ''}`}>
                                                                <p className={`text-[11px] leading-relaxed transition-colors ${isDone ? 'text-slate-700 dark:text-slate-400 whitespace-pre-wrap font-medium' : 'text-blue-500 dark:text-blue-400 font-medium truncate italic'}`}>
                                                                    {t.notes}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="mt-2 flex items-center gap-3">
                                                            <p className="font-black text-[9px] text-slate-400 uppercase transition-colors dark:text-slate-500">
                                                                {task.assigned_to?.name || "Hệ thống"} • {task.due_date ? formatDate(task.due_date) : "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="ml-4 flex shrink-0 items-center gap-1 transition-opacity">
                                                    <SurveyResultModal
                                                        task={task}
                                                        surveyId={survey.id}
                                                        projectId={projectId}
                                                        projectCode={project.code}
                                                        projectName={project.name}
                                                        onUpdateSuccess={(newStatus: string) => handleLocalTaskUpdate(task.id, newStatus)}
                                                    />
                                                    <SurveyTaskEditModal
                                                        task={task}
                                                        members={members}
                                                        surveyTaskTemplates={dictionaryItems}
                                                        projectId={projectId}
                                                        onUpdateSuccess={triggerRefresh}
                                                    />
                                                    <SurveyTaskDeleteButton taskId={task.id} projectId={projectId} onDeleteSuccess={triggerRefresh} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>

                        {isFengShui && (
                            <TabsContent value="fengshui" className="absolute inset-0 m-0 flex flex-col bg-slate-950 p-0 data-[state=inactive]:hidden">
                                <FengShuiCompass
                                    projectId={projectId}
                                    onSaveResult={handleSaveCompassData}
                                />
                            </TabsContent>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}