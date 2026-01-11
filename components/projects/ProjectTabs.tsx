"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// --- IMPORT CÁC TAB COMPONENTS ---
import ProjectMembersTab from "./tab/ProjectMembersTab";
import ProjectDocumentsTab from "./tab/ProjectDocumentsTab";
import ProjectFinanceTab from "./tab/ProjectFinanceTab";
import ProjectMilestoneTab from "./tab/ProjectMilestoneTab";
import ProjectSurveyTab from "./tab/ProjectSurveyTab";
import ProjectRequestsTab from "./tab/ProjectRequestsTab";

// ❌ Đã xóa ProjectEstimationTab vì đã chuyển sang CostManager

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
    tasks: TaskData[];
    surveys: Survey[];
    surveyTemplates: SurveyTemplate[];
    surveyTaskTemplates: SurveyTaskTemplate[];
    taskFeed: React.ReactNode;
    // ❌ Đã xóa qtoItems, qtoTemplates vì không còn dùng ở đây
    membersCount: number;
    documentsCount: number;
    requests: any[];
    allEmployees?: any[];
    roles?: any[];
    isManager?: boolean;
    currentUserId?: string;
}

const TABS = {
    TASKS: "Công việc & Mốc thời gian",
    SURVEY: "Khảo sát",
    MEMBERS: "Nhân sự",
    REQUESTS: "Yêu cầu vật tư",
    DOCUMENTS: "Tài liệu",
    FINANCE: "Tài chính" // Giữ lại để xem chi phí thực tế thi công
};

const tabs = Object.values(TABS);

function getDefaultTabFromURL(searchParams: URLSearchParams | null): string {
    if (!searchParams) return TABS.TASKS;
    const tabParam = searchParams.get("tab");
    switch (tabParam) {
        case "survey": return TABS.SURVEY;
        case "tasks": return TABS.TASKS;
        case "members": return TABS.MEMBERS;
        case "documents": return TABS.DOCUMENTS;
        case "finance": return TABS.FINANCE;
        case "requests": return TABS.REQUESTS;
        // Các case qto/estimation cũ sẽ fallback về tasks hoặc xử lý ở parent
        default: return TABS.TASKS;
    }
}

function getUrlParamFromTabName(tabName: string): string {
    switch (tabName) {
        case TABS.SURVEY: return "survey";
        case TABS.TASKS: return "tasks";
        case TABS.MEMBERS: return "members";
        case TABS.DOCUMENTS: return "documents";
        case TABS.FINANCE: return "finance";
        case TABS.REQUESTS: return "requests";
        default: return "tasks";
    }
}

export default function ProjectTabs({
    projectId, project, milestones, members, documents, financeStats, tasks,
    surveys, surveyTemplates, surveyTaskTemplates, taskFeed, membersCount, documentsCount,
    requests,
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
            {/* Thanh Tab Navigation */}
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
                        {tab === TABS.MEMBERS && <span className="ml-1 text-xs opacity-60">({membersCount})</span>}
                        {tab === TABS.DOCUMENTS && <span className="ml-1 text-xs opacity-60">({documentsCount})</span>}
                        {tab === TABS.REQUESTS && <span className="ml-1 text-xs opacity-60">({requests.length})</span>}
                    </button>
                ))}
            </div>

            {/* Nội dung Tab */}
            <div className="mt-4">
                {activeTab === TABS.TASKS && (
                    <ProjectMilestoneTab
                        projectId={project.id} milestones={milestones} tasks={tasks}
                        members={members} taskFeed={taskFeed}
                    />
                )}
                {activeTab === TABS.SURVEY && (
                    <ProjectSurveyTab
                        projectId={projectId} surveys={surveys} members={members}
                        surveyTemplates={surveyTemplates} surveyTaskTemplates={surveyTaskTemplates}
                    />
                )}
                {activeTab === TABS.MEMBERS && (
                    <ProjectMembersTab
                        projectId={projectId} members={members} allEmployees={allEmployees}
                        roles={roles} isManager={isManager} currentUserId={currentUserId}
                    />
                )}
                {activeTab === TABS.REQUESTS && <ProjectRequestsTab projectId={projectId} requests={requests} />}
                {activeTab === TABS.DOCUMENTS && <ProjectDocumentsTab projectId={projectId} documents={documents} />}
                {activeTab === TABS.FINANCE && <ProjectFinanceTab stats={financeStats} />}
            </div>
        </div>
    );
}