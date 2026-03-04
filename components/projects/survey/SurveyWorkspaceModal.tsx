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

interface SurveyWorkspaceModalProps {
    survey: Survey;
    project: ProjectData;
    members: MemberData[];
    projectId: string;
    surveyTaskTemplates?: any[];
    surveyTypes: { code: string; name?: string; value?: string }[];
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
    const [state, formAction] = useActionState(createSurveyTask as any, { success: false });
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
        // Vẫn gọi refresh chạy ngầm để chắc kèo đồng bộ
        triggerRefresh();
    }, [triggerRefresh]);

    useEffect(() => {
        if (isOpen) {
            triggerRefresh();
            fetchDictionary();
        }
    }, [isOpen, triggerRefresh, fetchDictionary]);

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            triggerRefresh();
            toast.success("Đã thêm nhiệm vụ mới");
        }
    }, [state.success, triggerRefresh]);

    const handleSaveCompassData = async (data: { heading: number; result: string; cung: string; dirName: string }) => {
        try {
            const formData = new FormData();
            formData.append("id", survey.id);
            formData.append("notes", `[PHONG THUỶ] Hướng: ${data.dirName}, Độ: ${data.heading}°, Cung: ${data.cung} (${data.result})`);
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

    // Hiệu ứng "Pháo hoa" khi đạt 100%
    useEffect(() => {
        if (progressPercent === 100 && prevProgressRef.current < 100 && tasks.length > 0) {
            toast.success("TUYỆT VỜI! Đã hoàn thành 100% hạng mục.", {
                description: "Dữ liệu đã được đồng bộ về hệ thống trung tâm.",
                icon: <CheckCircle2 className="text-green-500 w-5 h-5" />,
            });
        }
        prevProgressRef.current = progressPercent;
    }, [progressPercent, tasks.length]);

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
                <div className="sr-only">
                    <DialogHeader><DialogTitle>{displayTitle}</DialogTitle></DialogHeader>
                </div>

                <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0 !gap-0">
                    <div className="bg-slate-900 text-white shrink-0 flex flex-col z-50">
                        <div className="flex items-center justify-between px-4 h-12 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-blue-400" />
                                    <span className="font-black uppercase tracking-tighter text-[13px]">{displayTitle}</span>
                                    <span className="text-[10px] text-slate-400 font-bold ml-1">#{project.code}</span>
                                </div>

                                {/* ✅ PROGRESS BAR ĐỔI MÀU Ở ĐÂY */}
                                <div className="hidden sm:flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
                                    <div className="w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden border border-white/5">
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
                                        <span className="text-[7px] uppercase tracking-tighter opacity-50 font-bold">Progress</span>
                                    </div>
                                </div>

                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white h-8 w-8 rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <TabsList className="bg-transparent h-10 w-full justify-start rounded-none p-0 gap-0">
                            <TabsTrigger value="tasks" className="flex-1 sm:flex-none sm:px-8 data-[state=active]:bg-white/5 data-[state=active]:text-blue-400 rounded-none h-10 text-[11px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-blue-500">
                                NHIỆM VỤ
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 relative min-h-0 bg-slate-950">
                        <TabsContent value="tasks" className="h-full w-full m-0 p-3 bg-slate-50 flex flex-col gap-3 overflow-y-auto data-[state=inactive]:hidden">
                            <form ref={formRef} action={formAction} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 sticky top-0 z-20">
                                <input type="hidden" name="surveyId" value={survey.id} />
                                <input type="hidden" name="projectId" value={projectId} />

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex-[2] min-w-[180px]">
                                        <Select name="title" required>
                                            <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500">
                                                <SelectValue placeholder="Chọn hạng mục từ danh mục..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dictionaryItems.length > 0 ? (
                                                    dictionaryItems.map((item) => (
                                                        <SelectItem key={item.id} value={item.name} className="text-sm font-semibold">
                                                            {item.name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="Other" disabled className="text-xs italic text-slate-400">
                                                        Chưa có danh mục TASK_{typeCode}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-[3] min-w-[200px]">
                                        <Input name="notes" placeholder="Mô tả cụ thể hiện trường..." className="h-9 border-none bg-slate-100/50 focus-visible:ring-0 text-sm font-medium" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 border-t pt-2">
                                    <div className="flex-1">
                                        <Select name="assigned_to" defaultValue="unassigned">
                                            <SelectTrigger className="h-9 border-none bg-slate-100/50 focus:ring-0 text-[11px] font-black uppercase">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Tự thực hiện</SelectItem>
                                                {members?.map((m) => m.employee && (
                                                    <SelectItem key={m.employee.id || m.employee_id} value={m.employee.id || m.employee_id} className="text-xs">
                                                        {m.employee.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-32">
                                        <Input name="due_date" type="date" className="h-9 border-none bg-slate-100/50 focus-visible:ring-0 text-xs font-bold" />
                                    </div>
                                    <SubmitTaskButton />
                                </div>
                            </form>

                            <div className="space-y-2 pb-10">
                                {isLoading ? (
                                    <div className="flex justify-center p-10 opacity-50"><Loader2 className="animate-spin w-6 h-6" /></div>
                                ) : tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-20 text-slate-300 border-2 border-dashed rounded-3xl bg-white/50">
                                        <ListTodo className="w-12 h-12 mb-2" />
                                        <p className="text-xs font-black uppercase tracking-widest text-center">Chưa có nhiệm vụ</p>
                                    </div>
                                ) : (
                                    tasks.map(task => {
                                        const isDone = task.status === 'completed';
                                        const t = task as any;
                                        return (
                                            <div key={task.id} className="flex justify-between items-start p-3 bg-white border rounded-xl shadow-sm group hover:border-blue-200 transition-all">

                                                {/* ✅ ĐÃ SỬA: items-start và xóa truncate để chữ được bung xõa thoải mái */}
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {isDone ? <ClipboardCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm font-bold truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                                                            {isDone && <span className="text-[8px] bg-green-500 text-white px-1 py-0.5 rounded font-black uppercase">Xong</span>}
                                                        </div>

                                                        {/* Báo cáo phong thủy và Ghi chú */}
                                                        {t.notes && (
                                                            <div className={`mt-2 ${isDone ? 'bg-slate-100/50 border border-slate-200 p-3 rounded-lg shadow-inner' : ''}`}>
                                                                <p className={`text-[11px] leading-relaxed ${isDone ? 'text-slate-700 whitespace-pre-wrap font-medium' : 'text-blue-500 font-medium truncate italic'}`}>
                                                                    {t.notes}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3 mt-2">
                                                            <p className="text-[9px] text-slate-400 font-black uppercase">
                                                                {task.assigned_to?.name || "Hệ thống"} • {task.due_date ? formatDate(task.due_date) : "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 transition-opacity shrink-0 ml-4">
                                                    <SurveyResultModal
                                                        task={task}
                                                        surveyId={survey.id}
                                                        projectId={projectId}
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
                            <TabsContent value="fengshui" className="absolute inset-0 m-0 p-0 flex flex-col bg-slate-950 data-[state=inactive]:hidden">
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