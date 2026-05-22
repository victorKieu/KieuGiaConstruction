"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LayoutList, GanttChartSquare, Clock } from "lucide-react";

// --- IMPORT CÁC TAB COMPONENTS ---
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectSurveyTab from "./tab/ProjectSurveyTab";
//import ProjectBOQTab from "./tab/ProjectBOQTab"; // ✅ ĐÃ THAY THẾ PHÂN HỆ ĐỘC LẬP THÀNH BOQ TỔNG HỢP
import ProjectGanttTab from "./tab/ProjectGanttTab";
import ConstructionLogManager from "@/components/projects/execution/ConstructionLogManager";
import WBSTaskTable from "@/components/tasks/WBSTaskTable";
import { ProjectTaskList } from "@/components/tasks/project-task-list";

import {
    ProjectData, MilestoneData, MemberData, DocumentData,
    Survey, SurveyTaskTemplate
} from "@/types/project";

interface SysDictionary {
    code: string;
    name: string;
    value: string;
}

interface ProjectTabsProps {
    projectId: string;
    project: ProjectData;
    milestones: MilestoneData[];
    members: MemberData[];
    documents: DocumentData[];
    financeStats: any;
    tasks: any[];
    dictionaries: any;
    surveys: Survey[];
    surveyTypes: SysDictionary[];
    surveyTaskTemplates: SurveyTaskTemplate[];
    taskFeed: React.ReactNode;
    membersCount: number;
    documentsCount: number;
    logs?: any[];
    allEmployees?: any[];
    roles?: any[];
    isManager?: boolean;
    currentUserId?: string;
}

// ✅ CẬP NHẬT DANH SÁCH CÁC CƠ CẤU TABS: ĐƯA BOQ VÀO TRUNG TÂM
const TABS = {
    TASKS: "Công việc & Mốc",
    GANTT: "Tiến độ (Gantt)",
    SURVEY: "Khảo sát",
    //BOQ: "Dự Toán & Khối Lượng (BOQ)",
    MEMBERS: "Nhân sự",
    LOGS: "Nhật ký thi công",
    DOCUMENTS: "Tài liệu",
    FINANCE: "Tài chính"
};

const tabs = Object.values(TABS);

function getDefaultTabFromURL(searchParams: URLSearchParams | null): string {
    if (!searchParams) return TABS.TASKS;
    const tabParam = searchParams.get("tab");
    switch (tabParam) {
        case "gantt": return TABS.GANTT;
        case "survey": return TABS.SURVEY;
        case "boq":
        //case "qto": return TABS.BOQ; // Hỗ trợ fallback nếu URL cũ đang lưu tham số qto
        case "tasks": return TABS.TASKS;
        case "members": return TABS.MEMBERS;
        case "logs": return TABS.LOGS;
        case "documents": return TABS.DOCUMENTS;
        case "finance": return TABS.FINANCE;
        default: return TABS.TASKS;
    }
}

function getUrlParamFromTabName(tabName: string): string {
    switch (tabName) {
        case TABS.GANTT: return "gantt";
        case TABS.SURVEY: return "survey";
        //case TABS.BOQ: return "boq";
        case TABS.TASKS: return "tasks";
        case TABS.MEMBERS: return "members";
        case TABS.LOGS: return "logs";
        case TABS.DOCUMENTS: return "documents";
        case TABS.FINANCE: return "finance";
        default: return "tasks";
    }
}

export default function ProjectTabs({
    projectId, project, milestones, members, documents, financeStats, tasks, dictionaries,
    surveys, surveyTypes = [], surveyTaskTemplates, taskFeed, membersCount, documentsCount,
    logs = [],
    allEmployees = [], roles = [], isManager = false, currentUserId = "",
}: ProjectTabsProps) {

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [activeTab, setActiveTab] = useState(() => getDefaultTabFromURL(searchParams));
    const [taskViewMode, setTaskViewMode] = useState<"tree" | "kanban">("tree");

    useEffect(() => {
        setActiveTab(getDefaultTabFromURL(searchParams));
    }, [searchParams]);

    const handleTabClick = (tabName: string) => {
        setActiveTab(tabName);
        const params = new URLSearchParams(searchParams?.toString());
        params.set("tab", getUrlParamFromTabName(tabName));
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="w-full">
            {/* Thanh Tab Navigation */}
            <div className="flex gap-4 border-b border-border mb-4 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabClick(tab)}
                        className={`pb-2 border-b-2 whitespace-nowrap transition-colors px-1 text-sm font-medium flex items-center gap-1.5 ${activeTab === tab
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {tab === TABS.GANTT && <Clock className="w-3.5 h-3.5" />}
                        {tab}

                        {tab === TABS.MEMBERS && <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">({membersCount})</span>}
                        {tab === TABS.DOCUMENTS && <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">({documentsCount})</span>}
                        {tab === TABS.LOGS && <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">({logs.length})</span>}
                    </button>
                ))}
            </div>

            {/* Nội dung hiển thị từng Tab */}
            <div className="mt-4 min-h-[400px]">

                {/* ================= PHẦN CÔNG VIỆC & WBS ================= */}
                {activeTab === TABS.TASKS && (
                    <div className="animate-in fade-in duration-300 space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 px-2">Kế hoạch & Nhiệm vụ thi công</h3>
                            <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-md">
                                <button
                                    onClick={() => setTaskViewMode("tree")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${taskViewMode === "tree"
                                        ? "bg-white dark:bg-slate-950 text-blue-700 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <GanttChartSquare className="w-4 h-4" /> Danh sách WBS
                                </button>
                                <button
                                    onClick={() => setTaskViewMode("kanban")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${taskViewMode === "kanban"
                                        ? "bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <LayoutList className="w-4 h-4" /> Bảng Kanban Live
                                </button>
                            </div>
                        </div>

                        {taskViewMode === "tree" ? (
                            <WBSTaskTable
                                projectId={projectId}
                                initialTasks={tasks}
                                members={members}
                                dictionaries={dictionaries}
                            />
                        ) : (
                            <ProjectTaskList
                                tasks={tasks}
                                projectId={projectId}
                                members={members}
                                currentUserId={currentUserId || ""}
                            />
                        )}
                    </div>
                )}

                {/* ================= BIỂU ĐỒ TIẾN ĐỘ GANTT ================= */}
                {activeTab === TABS.GANTT && (
                    <div className="animate-in fade-in duration-300">
                        <ProjectGanttTab tasks={tasks} />
                    </div>
                )}

                {/* ================= KHẢO SÁT ================= */}
                {activeTab === TABS.SURVEY && (
                    <ProjectSurveyTab
                        projectId={projectId}
                        project={project}
                        surveys={surveys}
                        members={members}
                        tasks={tasks}
                        surveyTypes={surveyTypes as any}
                        surveyTaskTemplates={surveyTaskTemplates}
                    />
                )}          

                {/* ================= NHÂN SỰ ================= */}
                {activeTab === TABS.MEMBERS && (
                    <ProjectMembersTab
                        projectId={projectId} members={members} allEmployees={allEmployees}
                        roles={roles} isManager={isManager} currentUserId={currentUserId}
                    />
                )}

                {/* ================= NHẬT KÝ THI CÔNG ================= */}
                {activeTab === TABS.LOGS && (
                    <div className="animate-in fade-in duration-300">
                        <ConstructionLogManager projectId={projectId} logs={logs} />
                    </div>
                )}

                {/* ================= TÀI LIỆU ================= */}
                {activeTab === TABS.DOCUMENTS && <ProjectDocumentsTab projectId={projectId} documents={documents} />}

                {/* ================= TÀI CHÍNH ================= */}
                {activeTab === TABS.FINANCE && <ProjectFinanceTab stats={financeStats} />}
            </div>
        </div>
    );
}