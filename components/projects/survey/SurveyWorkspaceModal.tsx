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

    const filteredTemplates = useMemo(() => {
        const typeCode = survey.name.split(' - ')[0];
        return surveyTaskTemplates.filter(t => (t as any).type === typeCode);
    }, [surveyTaskTemplates, survey.name]);

    const isFengShui = survey.name.includes("PHONG_THUY");

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

            <DialogContent className="max-w-[1400px] w-[98vw] h-[96vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl">
                <div className="sr-only">
                    <DialogHeader>
                        <DialogTitle>{displayTitle}</DialogTitle>
                    </DialogHeader>
                </div>

                <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0">

                    {/* TOP BAR: SIÊU GỌN, DARK MODE STYLE */}
                    <div className="flex items-center justify-between px-4 bg-slate-900 text-white shrink-0 h-12">
                        <div className="flex items-center gap-6 h-full">
                            <div className="flex items-center gap-2 border-r border-slate-700 pr-4 h-6">
                                <LayoutGrid className="w-4 h-4 text-blue-400" />
                                <span className="font-black uppercase tracking-tighter text-[13px]">{displayTitle}</span>
                                <span className="text-[10px] text-slate-400 font-bold ml-2">#{project.code}</span>
                            </div>

                            <TabsList className="bg-transparent h-12 p-0 gap-0">
                                <TabsTrigger value="tasks" className="data-[state=active]:bg-white/5 data-[state=active]:text-blue-400 rounded-none h-12 px-6 text-[11px] font-black uppercase transition-all border-b-2 border-transparent data-[state=active]:border-blue-500">
                                    NHIỆM VỤ
                                </TabsTrigger>
                                {isFengShui && (
                                    <TabsTrigger value="fengshui" className="data-[state=active]:bg-white/5 data-[state=active]:text-orange-400 rounded-none h-12 px-6 text-[11px] font-black uppercase transition-all border-b-2 border-transparent data-[state=active]:border-orange-500">
                                        LA BÀN
                                    </TabsTrigger>
                                )}
                            </TabsList>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-white/5 px-3 py-1 rounded-full border border-white/10 shadow-inner">
                                <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <span className="text-[11px] font-black text-blue-400">{progressPercent}%</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white h-8 w-8 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="tasks" className="flex-1 flex flex-col m-0 overflow-hidden bg-slate-50 p-3 gap-3">

                        {/* INLINE QUICK FORM */}
                        <form ref={formRef} action={formAction} className="flex items-center gap-2 bg-white p-2 px-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                            <input type="hidden" name="surveyId" value={survey.id} />
                            <input type="hidden" name="projectId" value={projectId} />

                            <div className="flex-[3]">
                                <Select name="title" required>
                                    <SelectTrigger className="h-9 border-none bg-slate-100/50 focus:ring-0 focus:ring-offset-0 font-bold text-slate-700 text-sm rounded-lg">
                                        <SelectValue placeholder="Chọn hạng mục công việc khảo sát..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredTemplates.map((t) => (
                                            <SelectItem key={t.id} value={t.title} className="text-sm font-semibold">{t.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1">
                                <Select name="assigned_to" defaultValue="unassigned">
                                    <SelectTrigger className="h-9 border-none bg-slate-100/50 focus:ring-0 focus:ring-offset-0 text-[11px] font-black uppercase">
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

                            <div className="w-36">
                                <Input name="due_date" type="date" className="h-9 border-none bg-slate-100/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs font-bold" />
                            </div>

                            <SubmitTaskButton />
                        </form>

                        {/* SCROLLABLE TASK LIST */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center p-20 gap-3">
                                    <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                                    <ListTodo className="w-16 h-16 mb-2" />
                                    <p className="text-sm font-black uppercase tracking-[0.2em]">Danh sách trống</p>
                                </div>
                            ) : (
                                tasks.map(task => {
                                    const isDone = task.status === 'completed';
                                    return (
                                        <div key={task.id} className={`flex justify-between items-center p-3 bg-white border rounded-xl transition-all group shadow-sm hover:shadow-md hover:border-blue-200 ${isDone ? 'bg-slate-50/50' : ''}`}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${isDone ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {isDone ? <ClipboardCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-[14px] font-bold truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                            {task.title}
                                                        </p>
                                                        {isDone && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Xong</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter shrink-0">
                                                            {task.assigned_to?.name || "Hệ thống"} • {task.due_date ? formatDate(task.due_date) : "Chưa có hạn"}
                                                        </p>
                                                        {/* Task Progress Bar Mini */}
                                                        {!isDone && (
                                                            <div className="w-full max-w-[100px] h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-300 w-1/3 animate-pulse" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 ml-4">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <SurveyResultModal task={task} projectId={projectId} onUpdateSuccess={triggerRefresh} />
                                                    <SurveyTaskEditModal task={task} members={members} surveyTaskTemplates={surveyTaskTemplates} projectId={projectId} onUpdateSuccess={triggerRefresh} />
                                                    <SurveyTaskDeleteButton taskId={task.id} projectId={projectId} onDeleteSuccess={triggerRefresh} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </TabsContent>

                    {isFengShui && (
                        <TabsContent
                            value="fengshui"
                            style={{ marginTop: 0 }}
                            className="flex-1 w-full h-full !m-0 !p-0 border-none outline-none focus-visible:ring-0 data-[state=active]:flex flex-col overflow-hidden"
                        >
                            <div className="flex-1 w-full h-full bg-slate-950">
                                <FengShuiCompass projectId={projectId} />
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}