"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSurveyTask, getSurveyTasks } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { Loader2, Plus, ListTodo, CheckCircle2, LayoutGrid, X, ClipboardCheck, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils/utils";
import { MemberData, ProjectData, Survey, SurveyTask, SurveyTaskTemplate } from "@/types/project";
import SurveyResultModal from "./SurveyResultModal";
import SurveyTaskDeleteButton from "./SurveyTaskDeleteButton";
import SurveyTaskEditModal from "./SurveyTaskEditModal";
import FengShuiCompass from "./FengShuiCompass";

interface SurveyWorkspaceModalProps {
    survey: Survey;
    project: ProjectData;
    members: MemberData[];
    projectId: string;
    surveyTaskTemplates: SurveyTaskTemplate[];
    surveyTypes: { code: string; value: string }[];
}

function SubmitTaskButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" disabled={pending} className="bg-blue-600 hover:bg-blue-700 h-9 w-9 p-0 shrink-0 shadow-lg shadow-blue-200 transition-all active:scale-95">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </Button>
    );
}

export default function SurveyWorkspaceModal({
    survey, project, members, projectId, surveyTaskTemplates = [], surveyTypes = []
}: SurveyWorkspaceModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(createSurveyTask, { success: false });
    const [tasks, setTasks] = useState<SurveyTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const currentType = useMemo(() => {
        const typeCode = survey.name.split(' - ')[0];
        return surveyTypes.find(t => t.code === typeCode || t.code === survey.name);
    }, [survey.name, surveyTypes]);

    const displayTitle = currentType ? currentType.value : survey.name;
    const isFengShui = survey.name.includes("PHONG_THUY");

    const filteredTemplates = useMemo(() => {
        const typeCode = survey.name.split(' - ')[0];
        return surveyTaskTemplates.filter(t => (t as any).type === typeCode);
    }, [surveyTaskTemplates, survey.name]);

    const triggerRefresh = useCallback(async () => {
        if (!survey.id) return;
        setIsLoading(true);
        const result = await getSurveyTasks(survey.id);
        if (result.data) setTasks(result.data as SurveyTask[]);
        setIsLoading(false);
    }, [survey.id]);

    useEffect(() => { if (isOpen) triggerRefresh(); }, [isOpen, triggerRefresh]);
    useEffect(() => { if (state.success) { formRef.current?.reset(); triggerRefresh(); } }, [state.success, triggerRefresh]);

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercent = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className="cursor-pointer group flex-1 p-3 hover:bg-blue-50/40 rounded-lg transition-all border-b last:border-0 border-slate-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-bold text-slate-800 group-hover:text-blue-700 text-[15px] flex items-center gap-2">
                                {displayTitle}
                                {tasks.length > 0 && completedTasks === tasks.length && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </p>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3 font-medium">
                                <span className="text-blue-600 font-bold tracking-tight">#{project.code}</span>
                                <span>📅 {formatDate(survey.survey_date)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent className="max-w-[1400px] w-[98vw] h-[96vh] flex flex-col !p-0 !gap-0 overflow-hidden bg-white border-none shadow-2xl">
                {/* Accessibility Title */}
                <div className="sr-only">
                    <DialogHeader><DialogTitle>{displayTitle}</DialogTitle></DialogHeader>
                </div>

                <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0 !gap-0">

                    {/* HEADER ĐEN: Chứa Info + Progress + Tabs */}
                    <div className="bg-slate-900 text-white shrink-0 flex flex-col">
                        {/* Hàng 1: Info & Progress & Close */}
                        <div className="flex items-center justify-between px-4 h-12 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-blue-400" />
                                    <span className="font-black uppercase tracking-tighter text-[13px]">{displayTitle}</span>
                                    <span className="text-[10px] text-slate-400 font-bold ml-1">#{project.code}</span>
                                </div>
                                {/* Progress Bar */}
                                <div className="hidden sm:flex items-center gap-3 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-blue-400">{progressPercent}%</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white h-8 w-8 rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Hàng 2: Tab Triggers (Bắt buộc phải có để Mobile không bị mất) */}
                        <TabsList className="bg-transparent h-10 w-full justify-start rounded-none p-0 gap-0">
                            <TabsTrigger value="tasks" className="flex-1 sm:flex-none sm:px-8 data-[state=active]:bg-white/5 data-[state=active]:text-blue-400 rounded-none h-10 text-[11px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-blue-500">
                                NHIỆM VỤ
                            </TabsTrigger>
                            {isFengShui && (
                                <TabsTrigger value="fengshui" className="flex-1 sm:flex-none sm:px-8 data-[state=active]:bg-white/5 data-[state=active]:text-orange-400 rounded-none h-10 text-[11px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-orange-500">
                                    LA BÀN
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* VÙNG NỘI DUNG: Khít tuyệt đối */}
                    <div className="flex-1 relative min-h-0 bg-slate-950">

                        {/* TAB NHIỆM VỤ: Giữ nguyên 100% logic cũ của sếp */}
                        <TabsContent value="tasks" className="h-full w-full m-0 p-3 bg-slate-50 flex flex-col gap-3 overflow-y-auto data-[state=inactive]:hidden">

                            {/* FORM NHẬP (Giữ nguyên các trường: Người làm, Hạn) */}
                            <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0 sticky top-0 z-10">
                                <input type="hidden" name="surveyId" value={survey.id} />
                                <input type="hidden" name="projectId" value={projectId} />

                                <div className="flex-[3] min-w-[200px]">
                                    <Select name="title" required>
                                        <SelectTrigger className="h-9 border-none bg-slate-100/50 focus:ring-0 font-bold text-slate-700 text-sm">
                                            <SelectValue placeholder="Chọn hạng mục công việc..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredTemplates.map((t) => (
                                                <SelectItem key={t.id} value={t.title} className="text-sm font-semibold">{t.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-1 min-w-[120px]">
                                    <Select name="assigned_to" defaultValue="unassigned">
                                        <SelectTrigger className="h-9 border-none bg-slate-100/50 focus:ring-0 text-[11px] font-black uppercase">
                                            <SelectValue placeholder="Người làm" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Tự thực hiện</SelectItem>
                                            {members?.map((m) => m.employee && (
                                                <SelectItem key={m.employee.id} value={m.employee.id} className="text-xs">{m.employee.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-32">
                                    <Input name="due_date" type="date" className="h-9 border-none bg-slate-100/50 focus-visible:ring-0 text-xs font-bold" />
                                </div>

                                <SubmitTaskButton />
                            </form>

                            {/* DANH SÁCH NHIỆM VỤ (Giữ nguyên progress bar mini và các nút) */}
                            <div className="space-y-2 pb-10">
                                {isLoading ? (
                                    <div className="flex justify-center p-10 opacity-50"><Loader2 className="animate-spin w-6 h-6" /></div>
                                ) : tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-20 text-slate-300 border-2 border-dashed rounded-3xl bg-white/50">
                                        <ListTodo className="w-12 h-12 mb-2" />
                                        <p className="text-xs font-black uppercase tracking-widest">Danh sách trống</p>
                                    </div>
                                ) : (
                                    tasks.map(task => {
                                        const isDone = task.status === 'completed';
                                        return (
                                            <div key={task.id} className="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm group hover:border-blue-200 transition-all">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {isDone ? <ClipboardCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                    </div>
                                                    <div className="truncate flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm font-bold truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                                                            {isDone && <span className="text-[8px] bg-green-500 text-white px-1 py-0.5 rounded font-black uppercase">Xong</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase">
                                                                {task.assigned_to?.name || "Hệ thống"} • {task.due_date ? formatDate(task.due_date) : "N/A"}
                                                            </p>
                                                            {!isDone && <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-300 w-1/3 animate-pulse" /></div>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <SurveyResultModal task={task} projectId={projectId} onUpdateSuccess={triggerRefresh} />
                                                    <SurveyTaskEditModal task={task} members={members} surveyTaskTemplates={surveyTaskTemplates} projectId={projectId} onUpdateSuccess={triggerRefresh} />
                                                    <SurveyTaskDeleteButton taskId={task.id} projectId={projectId} onDeleteSuccess={triggerRefresh} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>

                        {/* TAB LA BÀN: Khít viền */}
                        {isFengShui && (
                            <TabsContent value="fengshui" className="absolute inset-0 m-0 p-0 flex flex-col bg-slate-950 data-[state=inactive]:hidden">
                                <FengShuiCompass projectId={projectId} />
                            </TabsContent>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}