"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// --- IMPORT CÁC TAB COMPONENTS ---
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectMilestoneTab from "./tab/ProjectMilestoneTab";
import ProjectSurveyTab from "./tab/ProjectSurveyTab";
import ProjectQTOTab from "./tab/ProjectQTOTab";
import ConstructionLogManager from "@/components/projects/execution/ConstructionLogManager";

import {
    ProjectData, MilestoneData, MemberData, DocumentData, TaskData,
    Survey, SurveyTemplate, SurveyTaskTemplate
} from "@/types/project";

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
    surveyTemplates: SurveyTemplate[];
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

const TABS = {
    TASKS: "Công việc & Mốc",
    SURVEY: "Khảo sát",
    QTO: "Tiên lượng (QTO)",
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
        case "survey": return TABS.SURVEY;
        case "qto": return TABS.QTO;
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
        case TABS.SURVEY: return "survey";
        case TABS.QTO: return "qto";
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
    surveys, surveyTemplates, surveyTaskTemplates, taskFeed, membersCount, documentsCount,
    logs = [],
    allEmployees = [], roles = [], isManager = false, currentUserId = "",
}: ProjectTabsProps) {

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [activeTab, setActiveTab] = useState(() => getDefaultTabFromURL(searchParams));

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
            {/* Thanh Tab Navigation - ✅ FIX: border-border */}
            <div className="flex gap-4 border-b border-border mb-4 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabClick(tab)}
                        // ✅ FIX: Colors cho dark mode (text-muted-foreground, hover:text-foreground, dark:text-blue-400)
                        className={`pb-2 border-b-2 whitespace-nowrap transition-colors px-1 text-sm font-medium ${activeTab === tab
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {tab}
                        {/* Badges số lượng - ✅ FIX: bg-muted text-muted-foreground */}
                        {tab === TABS.MEMBERS && <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">({membersCount})</span>}
                        {tab === TABS.DOCUMENTS && <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">({documentsCount})</span>}
                        {tab === TABS.LOGS && <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">({logs.length})</span>}
                    </button>
                ))}
            </div>

            {/* Nội dung Tab */}
            <div className="mt-4 min-h-[400px]">
                {activeTab === TABS.TASKS && (
                    <ProjectMilestoneTab
                        projectId={projectId}
                        tasks={tasks}
                        members={members}
                        milestones={milestones}
                        dictionaries={dictionaries}
                        currentUserId={currentUserId}
                    />
                )}

                {activeTab === TABS.SURVEY && (
                    <ProjectSurveyTab
                        projectId={projectId} surveys={surveys} members={members}
                        surveyTemplates={surveyTemplates} surveyTaskTemplates={surveyTaskTemplates}
                    />
                )}

                {activeTab === TABS.QTO && (
                    <ProjectQTOTab projectId={projectId} />
                )}

                {activeTab === TABS.MEMBERS && (
                    <ProjectMembersTab
                        projectId={projectId} members={members} allEmployees={allEmployees}
                        roles={roles} isManager={isManager} currentUserId={currentUserId}
                    />
                )}

                {activeTab === TABS.LOGS && (
                    <div className="animate-in fade-in duration-300">
                        <ConstructionLogManager projectId={projectId} logs={logs} />
                    </div>
                )}

                {activeTab === TABS.DOCUMENTS && <ProjectDocumentsTab projectId={projectId} documents={documents} />}

                {activeTab === TABS.FINANCE && <ProjectFinanceTab stats={financeStats} />}
            </div>
        </div>
    );
}