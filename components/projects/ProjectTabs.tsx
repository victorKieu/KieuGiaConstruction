"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// --- IMPORT CÁC TAB COMPONENTS ---
import ProjectOverviewTab from "./tab/ProjectOverviewTab";
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectMilestoneTab from "./tab/ProjectMilestoneTab";
import ProjectSurveyTab from "./tab/ProjectSurveyTab";
//import ProjectQtoTab from "./tab/ProjectQtoTab";
import ProjectEstimationTab from "./tab/ProjectEstimationTab";
import ProjectRequestsTab from "./tab/ProjectRequestsTab";

// --- IMPORT TYPES ---
import {
    ProjectData,
    MilestoneData,
    MemberData,
    DocumentData,
    TaskData,
    Survey,
    SurveyTemplate,
    SurveyTaskTemplate,
    QtoItem,
    QtoTemplate
} from "@/types/project";

interface ProjectTabsProps {
    projectId: string;
    project: ProjectData;
    milestones: MilestoneData[];
    members: MemberData[];
    documents: DocumentData[];
    financeStats: any;
    tasks: TaskData[];
    surveys: Survey[];
    surveyTemplates: SurveyTemplate[];
    surveyTaskTemplates: SurveyTaskTemplate[];
    taskFeed: React.ReactNode;
    qtoItems: QtoItem[];
    qtoTemplates: QtoTemplate[];
    membersCount: number;
    documentsCount: number;
    requests: any[];

    // 👇 CẬP NHẬT: Thêm các props cho chức năng quản lý nhân sự
    allEmployees?: any[];
    roles?: any[];
    isManager?: boolean;
    currentUserId?: string;
}

const TABS = {
    OVERVIEW: "Tổng quan",
    TASKS: "Công việc & Mốc thời gian",
    SURVEY: "Khảo sát",
    MEMBERS: "Nhân sự",
    QTO: "Bóc tách Khối lượng",
    ESTIMATION: "Dự toán",
    REQUESTS: "Yêu cầu vật tư",
    DOCUMENTS: "Tài liệu",
    FINANCE: "Tài chính"
};

const tabs = Object.values(TABS);

function getDefaultTabFromURL(searchParams: URLSearchParams | null): string {
    if (!searchParams) return TABS.OVERVIEW;
    const tabParam = searchParams.get("tab");
    switch (tabParam) {
        case "survey": return TABS.SURVEY;
        case "tasks": return TABS.TASKS;
        case "qto": return TABS.QTO;
        case "estimation": return TABS.ESTIMATION;
        case "members": return TABS.MEMBERS;
        case "documents": return TABS.DOCUMENTS;
        case "finance": return TABS.FINANCE;
        case "requests": return TABS.REQUESTS;
        default: return TABS.OVERVIEW;
    }
}

function getUrlParamFromTabName(tabName: string): string {
    switch (tabName) {
        case TABS.SURVEY: return "survey";
        case TABS.TASKS: return "tasks";
        case TABS.QTO: return "qto";
        case TABS.ESTIMATION: return "estimation";
        case TABS.MEMBERS: return "members";
        case TABS.DOCUMENTS: return "documents";
        case TABS.FINANCE: return "finance";
        case TABS.REQUESTS: return "requests";
        default: return "overview";
    }
}

export default function ProjectTabs({
    projectId,
    project,
    milestones,
    members,
    documents,
    financeStats,
    tasks,
    surveys,
    surveyTemplates,
    surveyTaskTemplates,
    taskFeed,
    membersCount,
    documentsCount,
    qtoItems,
    qtoTemplates,
    requests,

    // 👇 CẬP NHẬT: Nhận props mới
    allEmployees = [],
    roles = [],
    isManager = false,
    currentUserId = "",
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
            {/* Navigations */}
            <div className="flex gap-4 border-b mb-4 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabClick(tab)}
                        className={`pb-2 border-b-2 whitespace-nowrap transition-colors px-1 ${activeTab === tab
                            ? "border-blue-600 font-semibold text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab}
                        {/* Hiển thị số lượng nhân sự/tài liệu nhanh trên tab (tùy chọn) */}
                        {tab === TABS.MEMBERS && <span className="ml-1 text-xs opacity-60">({membersCount})</span>}
                    </button>
                ))}
            </div>

            {/* Content Areas */}
            <div className="mt-4">
                {activeTab === TABS.OVERVIEW && (
                    <ProjectOverviewTab project={project} milestones={milestones} />
                )}

                {activeTab === TABS.TASKS && (
                    <ProjectMilestoneTab
                        projectId={project.id}
                        milestones={milestones}
                        tasks={tasks}
                        members={members}
                        taskFeed={taskFeed}
                    />
                )}

                {activeTab === TABS.SURVEY && (
                    <ProjectSurveyTab
                        projectId={projectId}
                        surveys={surveys}
                        members={members}
                        surveyTemplates={surveyTemplates}
                        surveyTaskTemplates={surveyTaskTemplates}
                    />
                )}

                {activeTab === TABS.MEMBERS && (
                    <ProjectMembersTab
                        projectId={projectId}
                        members={members}
                        allEmployees={allEmployees}
                        roles={roles}
                        isManager={isManager}
                        currentUserId={currentUserId}
                    />
                )}

                

                {activeTab === TABS.ESTIMATION && (
                    <ProjectEstimationTab projectId={projectId} />
                )}

                {activeTab === TABS.REQUESTS && (
                    <ProjectRequestsTab projectId={projectId} requests={requests} />
                )}

                {activeTab === TABS.DOCUMENTS && (
                    <ProjectDocumentsTab projectId={projectId} documents={documents} />
                )}

                {activeTab === TABS.FINANCE && (
                    <ProjectFinanceTab stats={financeStats} />
                )}
            </div>
        </div>
    );
}